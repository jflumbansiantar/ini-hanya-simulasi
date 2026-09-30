import { CORRIDORS, type Corridor, type Stop } from "../corridors";
import { CORRIDOR_META } from "../corridorMeta";
import { AVG_SPEED_KMH, haversineKm, positionAlongDirection, type DirectionMeta, type Direction } from "../simulation";

/**
 * Model jadwal bus untuk game. Setiap koridor punya dua "line" (satu per
 * arah). Bus berangkat dari halte pertama setiap `headway` menit selama jam
 * operasi dan bergerak dengan kecepatan konstan, jadi waktu tiba di tiap
 * halte bisa dihitung analitis tanpa state per bus — sama seperti simulator
 * lama, hanya sekarang dibuat per halte supaya pemain bisa naik/turun.
 */

export interface Line {
  key: string; // `${corridorId}:${direction}`
  corridor: Corridor;
  direction: Direction;
  stops: Stop[]; // urut sesuai arah
  stopIndex: Map<string, number>;
  offsets: number[]; // menit sejak berangkat dari halte pertama, per halte, kecepatan normal
  duration: number; // menit ujung ke ujung, kecepatan normal
  dirMeta: DirectionMeta;
  lastSlot: number;
}

export const LINES = new Map<string, Line>();
export const LINES_BY_CORRIDOR = new Map<string, Line[]>();

for (const c of CORRIDORS) {
  const meta = CORRIDOR_META[c.id];
  const pair: Line[] = [];
  for (const direction of ["forward", "backward"] as Direction[]) {
    const dirMeta = direction === "forward" ? meta.forward : meta.backward;
    const stops = direction === "forward" ? c.stops : [...c.stops].reverse();
    const offsets = dirMeta.breaks.map((b) => (dirMeta.cumKm[b] / AVG_SPEED_KMH) * 60);
    const line: Line = {
      key: `${c.id}:${direction}`,
      corridor: c,
      direction,
      stops,
      stopIndex: new Map(stops.map((s, i) => [s.n, i])),
      offsets,
      duration: meta.durationMin,
      dirMeta,
      lastSlot: Math.floor((c.activeEnd - c.activeStart) / c.headway),
    };
    LINES.set(line.key, line);
    pair.push(line);
  }
  LINES_BY_CORRIDOR.set(c.id, pair);
}

export const CORRIDOR_BY_ID = new Map(CORRIDORS.map((c) => [c.id, c]));

/** Koordinat satu nama halte (kemunculan pertama; nama sama = satu halte transfer). */
export const STOP_COORDS = new Map<string, { lat: number; lng: number }>();
for (const c of CORRIDORS) {
  for (const s of c.stops) if (!STOP_COORDS.has(s.n)) STOP_COORDS.set(s.n, { lat: s.lat, lng: s.lng });
}

export function lineLabel(line: Line): string {
  return `${line.corridor.name} arah ${line.stops[line.stops.length - 1].n}`;
}

// ---- jalan kaki antar-halte yang berdekatan ----
export const WALK_MAX_KM = 0.9;
const WALK_KMH = 4.5;
const WALK_DETOUR = 1.3; // jalan kaki jarang lurus

export function walkMinutes(km: number): number {
  return ((km * WALK_DETOUR) / WALK_KMH) * 60;
}

// ---- tarif mirip Transjakarta ----
export const FARE_NORMAL = 3500;
export const FARE_EARLY = 2000; // tap masuk 05.00–06.59

export function fareAt(t: number): number {
  const m = ((t % 1440) + 1440) % 1440;
  return m >= 300 && m < 420 ? FARE_EARLY : FARE_NORMAL;
}

// ---- kondisi misi (event) ----
export interface Conditions {
  corridors: string[]; // koridor yang tersedia di misi ini
  closedStops?: string[]; // bus tidak berhenti di sini
  slowCorridors?: Record<string, number>; // faktor kecepatan (0.6 = 60% kecepatan normal)
  crowdedCorridors?: Record<string, number>; // peluang bus sudah penuh saat tiba di halte (0..1)
}

export interface Arrival {
  line: Line;
  slot: number;
  time: number;
  full: boolean;
}

// hash deterministik supaya "bus penuh" sama setiap kali misi diulang
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export class World {
  readonly lines: Line[];
  readonly closed: Set<string>;
  readonly stopLines = new Map<string, { line: Line; idx: number }[]>();
  readonly walkLinks = new Map<string, { to: string; km: number; minutes: number }[]>();
  private readonly speed = new Map<string, number>();
  private readonly crowded = new Map<string, number>();

  constructor(readonly conditions: Conditions) {
    this.lines = conditions.corridors.flatMap((id) => LINES_BY_CORRIDOR.get(id) ?? []);
    this.closed = new Set(conditions.closedStops ?? []);
    for (const [id, f] of Object.entries(conditions.slowCorridors ?? {})) this.speed.set(id, f);
    for (const [id, p] of Object.entries(conditions.crowdedCorridors ?? {})) this.crowded.set(id, p);

    for (const line of this.lines) {
      line.stops.forEach((s, idx) => {
        const list = this.stopLines.get(s.n) ?? [];
        list.push({ line, idx });
        this.stopLines.set(s.n, list);
      });
    }
    const names = [...this.stopLines.keys()].filter((n) => !this.closed.has(n));
    for (const a of names) {
      for (const b of names) {
        if (a === b) continue;
        const km = haversineKm(STOP_COORDS.get(a)!, STOP_COORDS.get(b)!);
        if (km <= WALK_MAX_KM) {
          const list = this.walkLinks.get(a) ?? [];
          list.push({ to: b, km, minutes: walkMinutes(km) });
          this.walkLinks.set(a, list);
        }
      }
    }
  }

  get stopNames(): string[] {
    return [...this.stopLines.keys()];
  }

  isClosed(stop: string): boolean {
    return this.closed.has(stop);
  }

  speedFactor(corridorId: string): number {
    return this.speed.get(corridorId) ?? 1;
  }

  crowdChance(corridorId: string): number {
    return this.crowded.get(corridorId) ?? 0;
  }

  departTime(line: Line, slot: number): number {
    return line.corridor.activeStart + slot * line.corridor.headway;
  }

  offset(line: Line, idx: number): number {
    return line.offsets[idx] / this.speedFactor(line.corridor.id);
  }

  arrivalTime(line: Line, slot: number, idx: number): number {
    return this.departTime(line, slot) + this.offset(line, idx);
  }

  isFull(line: Line, slot: number, idx: number): boolean {
    const p = this.crowdChance(line.corridor.id);
    return p > 0 && hash01(`${line.key}#${slot}#${idx}`) < p;
  }

  /** Bus berikutnya (penuh atau tidak) yang tiba di halte `idx` pada/ setelah `t`. */
  nextArrival(line: Line, idx: number, t: number): Arrival | null {
    const off = this.offset(line, idx);
    const hw = line.corridor.headway;
    let slot = Math.ceil((t - 1e-9 - line.corridor.activeStart - off) / hw);
    if (slot < 0) slot = 0;
    if (slot > line.lastSlot) return null;
    return { line, slot, time: this.arrivalTime(line, slot, idx), full: this.isFull(line, slot, idx) };
  }

  /** Bus berikutnya yang BISA dinaiki (tidak penuh). */
  nextBoardable(line: Line, idx: number, t: number): Arrival | null {
    let a = this.nextArrival(line, idx, t);
    while (a && a.full) {
      a = a.slot + 1 <= line.lastSlot
        ? { line, slot: a.slot + 1, time: this.arrivalTime(line, a.slot + 1, idx), full: this.isFull(line, a.slot + 1, idx) }
        : null;
    }
    return a;
  }

  /** Halte terakhir yang sudah dilewati bus (index), -1 kalau belum berangkat. */
  passedIndex(line: Line, slot: number, t: number): number {
    let k = -1;
    for (let i = 0; i < line.stops.length; i++) {
      if (this.arrivalTime(line, slot, i) <= t + 1e-9) k = i;
      else break;
    }
    return k;
  }

  busPosition(line: Line, slot: number, t: number): { lat: number; lng: number; heading: number } | null {
    const elapsed = t - this.departTime(line, slot);
    const dur = line.duration / this.speedFactor(line.corridor.id);
    if (elapsed < 0 || elapsed > dur) return null;
    return positionAlongDirection(line.dirMeta, line.stops, elapsed / dur);
  }

  /** Semua bus yang sedang berjalan pada waktu `t` (untuk digambar di peta). */
  activeBuses(t: number): { line: Line; slot: number; lat: number; lng: number; heading: number }[] {
    const out: { line: Line; slot: number; lat: number; lng: number; heading: number }[] = [];
    for (const line of this.lines) {
      const dur = line.duration / this.speedFactor(line.corridor.id);
      const hw = line.corridor.headway;
      const first = Math.max(0, Math.ceil((t - dur - line.corridor.activeStart) / hw));
      const last = Math.min(line.lastSlot, Math.floor((t - line.corridor.activeStart) / hw));
      for (let slot = first; slot <= last; slot++) {
        const p = this.busPosition(line, slot, t);
        if (p) out.push({ line, slot, ...p });
      }
    }
    return out;
  }
}
