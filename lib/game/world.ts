import { CORRIDORS, type Corridor, type Stop } from "../corridors";
import { CORRIDOR_META } from "../corridorMeta";
import { AVG_SPEED_KMH, haversineKm, positionAlongDirection, type DirectionMeta, type Direction } from "../simulation";

/**
 * Model jadwal bus untuk game. Setiap koridor punya dua "line" (satu per
 * arah). Bus berangkat dari halte pertama setiap `headway` menit selama jam
 * operasi. Waktu tiba di tiap halte dihitung ruas demi ruas (halte ke halte)
 * sehingga rintangan — lampu merah, kendaraan pribadi masuk busway,
 * kecelakaan, macet — bisa berlaku hanya di ruas & jam tertentu. Semuanya
 * deterministik: misi yang sama selalu berjalan sama, dan solver
 * (lib/game/solver.ts) memakai fungsi yang persis sama dengan mesin game.
 */

export interface Line {
  key: string; // `${corridorId}:${direction}`
  corridor: Corridor;
  direction: Direction;
  stops: Stop[]; // urut sesuai arah
  stopIndex: Map<string, number>;
  legBase: number[]; // menit per ruas halte k → k+1 pada kecepatan normal
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
    const km = dirMeta.breaks.map((b) => dirMeta.cumKm[b]);
    const legBase = km.slice(1).map((v, k) => ((v - km[k]) / AVG_SPEED_KMH) * 60);
    const line: Line = {
      key: `${c.id}:${direction}`,
      corridor: c,
      direction,
      stops,
      stopIndex: new Map(stops.map((s, i) => [s.n, i])),
      legBase,
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

// ---- kapasitas bus ----
/** Koridor trunk memakai bus gandeng, subkoridor bus tunggal. */
export function busCapacity(corridor: Corridor): number {
  return corridor.parentId ? 70 : 150;
}

// ---- kondisi misi (rintangan) ----
export type HazardKind = "private" | "redlight" | "accident" | "jam";

/**
 * Rintangan pada rentang halte `from`..`to` sebuah koridor (urutan halte
 * arah maju, berlaku untuk kedua arah).
 * - private: kendaraan pribadi masuk busway → kecepatan turun
 * - redlight: lampu merah → tambahan menit di setiap ruas
 * - accident: kecelakaan, busway ditutup; bus lewat lajur umum (lambat) dan
 *   halte di dalam rentang tidak dilayani selama `start`..`end`
 * - jam: macet (biasanya imbas kecelakaan) selama `start`..`end`
 */
export interface Hazard {
  kind: HazardKind;
  corridor: string;
  from: string;
  to: string;
  speed?: number; // faktor kecepatan (0.5 = setengah kecepatan normal)
  delay?: number; // menit tambahan per ruas
  start?: number; // jendela waktu (menit sejak 00:00); tanpa jendela = sepanjang misi
  end?: number;
}

export interface Conditions {
  corridors: string[]; // koridor yang tersedia di misi ini
  closedStops?: string[]; // bus tidak berhenti di sini sepanjang misi
  slowCorridors?: Record<string, number>; // faktor kecepatan seluruh koridor
  crowdedCorridors?: Record<string, number>; // peluang bus tiba sudah penuh (0..1)
  queues?: Record<string, number>; // jumlah orang yang mengantre di depanmu di halte ini
  hazards?: Hazard[];
}

export interface Arrival {
  line: Line;
  slot: number;
  time: number;
}

// hash deterministik supaya keramaian bus sama setiap kali misi diulang
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

/** Waktu tempuh satu ruas setelah semua rintangan diterapkan. */
interface LegRule {
  base: number; // menit, sudah termasuk rintangan sepanjang misi
  windowed: { start: number; end: number; speed: number; delay: number } | null;
}

/** Index halte (pada `line`) di rentang `from`..`to` sebuah rintangan, atau null. */
export function hazardRange(line: Line, h: Hazard): [number, number] | null {
  const a = line.stopIndex.get(h.from);
  const b = line.stopIndex.get(h.to);
  if (a === undefined || b === undefined || a === b) return null;
  return [Math.min(a, b), Math.max(a, b)];
}

export class World {
  readonly lines: Line[];
  readonly closed: Set<string>;
  readonly hazards: Hazard[];
  readonly queues: Map<string, number>;
  readonly stopLines = new Map<string, { line: Line; idx: number }[]>();
  readonly walkLinks = new Map<string, { to: string; km: number; minutes: number }[]>();
  /** Penutupan halte sementara karena kecelakaan. */
  readonly tempClosures: { stop: string; start: number; end: number }[] = [];
  private readonly legRules = new Map<string, LegRule[]>();
  private readonly crowded = new Map<string, number>();
  private readonly scheduleCache = new Map<string, number[]>();

  constructor(readonly conditions: Conditions) {
    this.lines = conditions.corridors.flatMap((id) => LINES_BY_CORRIDOR.get(id) ?? []);
    this.closed = new Set(conditions.closedStops ?? []);
    this.hazards = conditions.hazards ?? [];
    this.queues = new Map(Object.entries(conditions.queues ?? {}));
    for (const [id, p] of Object.entries(conditions.crowdedCorridors ?? {})) this.crowded.set(id, p);

    for (const line of this.lines) {
      const corridorSpeed = conditions.slowCorridors?.[line.corridor.id] ?? 1;
      const rules: LegRule[] = line.legBase.map((b) => ({ base: b / corridorSpeed, windowed: null }));
      for (const h of this.hazards) {
        if (h.corridor !== line.corridor.id) continue;
        const range = hazardRange(line, h);
        if (!range) continue;
        for (let k = range[0]; k < range[1]; k++) {
          const r = rules[k];
          if (h.start !== undefined && h.end !== undefined) {
            // maksimal satu rintangan berjendela per ruas (dijaga generator misi)
            r.windowed = { start: h.start, end: h.end, speed: h.speed ?? 1, delay: h.delay ?? 0 };
          } else {
            r.base = r.base / (h.speed ?? 1) + (h.delay ?? 0);
          }
        }
        if (h.kind === "accident" && h.start !== undefined && h.end !== undefined && line.direction === "forward") {
          for (let k = range[0] + 1; k < range[1]; k++) {
            this.tempClosures.push({ stop: line.stops[k].n, start: h.start, end: h.end });
          }
        }
      }
      this.legRules.set(line.key, rules);
    }

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

  /** Ditutup sepanjang misi (bus tidak pernah berhenti, tidak bisa jalan kaki ke sini). */
  isClosed(stop: string): boolean {
    return this.closed.has(stop);
  }

  /** Tidak dilayani pada waktu `t` (tutup permanen atau sementara karena kecelakaan). */
  isClosedAt(stop: string, t: number): boolean {
    if (this.closed.has(stop)) return true;
    return this.tempClosures.some((c) => c.stop === stop && t >= c.start && t < c.end);
  }

  crowdChance(corridorId: string): number {
    return this.crowded.get(corridorId) ?? 0;
  }

  queueAt(stop: string): number {
    return this.queues.get(stop) ?? 0;
  }

  departTime(line: Line, slot: number): number {
    return line.corridor.activeStart + slot * line.corridor.headway;
  }

  /**
   * Waktu keluar ruas `k` untuk bus yang masuk pada `t`. Monoton naik
   * terhadap `t` (bus tidak pernah saling menyalip), jadi bus yang berangkat
   * lebih awal selalu tiba lebih awal — penting untuk solver.
   */
  private legExit(rule: LegRule, t: number): number {
    const w = rule.windowed;
    const normal = t + rule.base;
    if (!w || t < w.start || t >= w.end) return normal;
    // selama gangguan bus merayap; kalau gangguan selesai di tengah jalan, lanjut normal
    return Math.max(normal, Math.min(t + rule.base / w.speed + w.delay, w.end + rule.base));
  }

  /** Waktu tiba bus `slot` di setiap halte `line` (di-cache). */
  schedule(line: Line, slot: number): number[] {
    const key = `${line.key}#${slot}`;
    let arr = this.scheduleCache.get(key);
    if (!arr) {
      const rules = this.legRules.get(line.key)!;
      arr = [this.departTime(line, slot)];
      for (let k = 0; k < rules.length; k++) arr.push(this.legExit(rules[k], arr[k]));
      this.scheduleCache.set(key, arr);
    }
    return arr;
  }

  arrivalTime(line: Line, slot: number, idx: number): number {
    return this.schedule(line, slot)[idx];
  }

  /**
   * Sisa ruang bus `slot` saat tiba di halte `idx` (orang). Deterministik
   * dari hash; koridor "padat" punya peluang bus sudah penuh sama sekali.
   */
  freeSpace(line: Line, slot: number, idx: number): number {
    const cap = busCapacity(line.corridor);
    const key = `${line.key}#${slot}#${idx}`;
    const p = this.crowdChance(line.corridor.id);
    if (p > 0) {
      if (hash01(key) < p) return 0;
      return Math.floor(cap * (0.05 + 0.25 * hash01(key + "f")));
    }
    return Math.floor(cap * (0.12 + 0.45 * hash01(key + "f")));
  }

  /** Bus pertama (slot terkecil) yang tiba di halte `idx` pada/setelah `t`. */
  nextArrival(line: Line, idx: number, t: number): Arrival | null {
    let lo = 0;
    let hi = line.lastSlot + 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.arrivalTime(line, mid, idx) >= t - 1e-9) hi = mid;
      else lo = mid + 1;
    }
    if (lo > line.lastSlot) return null;
    return { line, slot: lo, time: this.arrivalTime(line, lo, idx) };
  }

  arrivalAfter(a: Arrival, idx: number): Arrival | null {
    const slot = a.slot + 1;
    if (slot > a.line.lastSlot) return null;
    return { line: a.line, slot, time: this.arrivalTime(a.line, slot, idx) };
  }

  /**
   * Bus yang benar-benar bisa dinaiki dari halte `idx` mulai `t` kalau ada
   * `queue` orang mengantre di depan: bus yang lewat tanpa berhenti dilewati,
   * dan setiap bus mengangkut orang di depanmu sebanyak sisa ruangnya dulu.
   * Mesin game menjalankan langkah yang sama satu per satu (lihat Session).
   */
  firstBoarding(line: Line, idx: number, t: number, queue: number): Arrival | null {
    const stop = line.stops[idx].n;
    let q = queue;
    for (let a = this.nextArrival(line, idx, t); a; a = this.arrivalAfter(a, idx)) {
      if (this.isClosedAt(stop, a.time)) continue;
      const free = this.freeSpace(line, a.slot, idx);
      if (q < free) return a;
      q -= free;
    }
    return null;
  }

  /** Halte terakhir yang sudah dilewati bus (index), -1 kalau belum berangkat. */
  passedIndex(line: Line, slot: number, t: number): number {
    const arr = this.schedule(line, slot);
    let k = -1;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] <= t + 1e-9) k = i;
      else break;
    }
    return k;
  }

  busPosition(line: Line, slot: number, t: number): { lat: number; lng: number; heading: number } | null {
    const arr = this.schedule(line, slot);
    if (t < arr[0] || t > arr[arr.length - 1]) return null;
    let k = 0;
    while (k < arr.length - 2 && arr[k + 1] <= t) k++;
    const span = arr[k + 1] - arr[k];
    const f = span > 0 ? (t - arr[k]) / span : 0;
    const { cumKm, breaks } = line.dirMeta;
    const km = cumKm[breaks[k]] + f * (cumKm[breaks[k + 1]] - cumKm[breaks[k]]);
    return positionAlongDirection(line.dirMeta, line.stops, km / cumKm[cumKm.length - 1]);
  }

  /** Semua bus yang sedang berjalan pada waktu `t` (untuk digambar di peta). */
  activeBuses(t: number): { line: Line; slot: number; lat: number; lng: number; heading: number }[] {
    const out: { line: Line; slot: number; lat: number; lng: number; heading: number }[] = [];
    for (const line of this.lines) {
      const last = line.stops.length - 1;
      const first = this.nextArrival(line, last, t)?.slot ?? line.lastSlot + 1;
      const lastDeparted = Math.min(line.lastSlot, Math.floor((t - line.corridor.activeStart) / line.corridor.headway));
      for (let slot = first; slot <= lastDeparted; slot++) {
        const p = this.busPosition(line, slot, t);
        if (p) out.push({ line, slot, ...p });
      }
    }
    return out;
  }

  /** Rintangan yang sedang berlaku pada waktu `t`. */
  activeHazards(t: number): Hazard[] {
    return this.hazards.filter((h) => h.start === undefined || h.end === undefined || (t >= h.start && t < h.end));
  }
}
