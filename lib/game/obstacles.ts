import { haversineKm } from "../simulation";
import type { Mission } from "./missions";
import { simulatePlan, type PlanLeg } from "./session";
import { solve, type Solution } from "./solver";
import { DEMO_ZONES, LINES, STOP_COORDS, World, stopsInZone, type Conditions, type DemoZoneId, type Line } from "./world";

/**
 * Pemasangan rintangan acak. Dipakai generator misi (scripts/generate-missions.ts)
 * DAN oleh game setiap kali misi dimulai, supaya rintangan berbeda setiap
 * dimainkan tapi tingkat kesulitannya tetap: jumlah & jenis rintangan wajib,
 * rentang kekuatan, dan faktor batas waktu mengikuti "resep" misi.
 */

export type Obstacle =
  | "redlight"
  | "private"
  | "queue"
  | "crowded"
  | "closed"
  | "accident"
  | "jam"
  | "saldo"
  | "medical"
  | "procession"
  | "demo";

/**
 * Kejadian mendadak: baru diketahui pemain saat terjadi, jadi hanya dipakai di
 * misi real-time (di mode rencana pemain tidak bisa bereaksi).
 */
export const SURPRISE_OBSTACLES: readonly Obstacle[] = ["medical", "procession"];

export interface Recipe {
  chapter: number; // 0-based; menentukan rentang kekuatan rintangan
  slack: number; // batas waktu = durasi rute tercepat × slack
  fixed: Obstacle[]; // rintangan wajib (tema bab)
  extra?: { pool: Obstacle[]; count: number }; // rintangan tambahan, jenisnya diacak
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomTools(rng: Rng) {
  const between = (a: number, b: number) => a + (b - a) * rng();
  const intBetween = (a: number, b: number) => Math.floor(between(a, b + 1));
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
  const pickSome = <T>(xs: readonly T[], n: number): T[] => {
    const copy = [...xs];
    const out: T[] = [];
    while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
    return out;
  };
  return { between, intBetween, pick, pickSome };
}

export const round5 = (n: number) => Math.ceil(n / 5) * 5;

// ---------- utilitas rute ----------
export interface Ride {
  line: Line;
  boardIdx: number;
  alightIdx: number;
}

export function ridesOf(from: string, legs: PlanLeg[]): { rides: Ride[]; transferStops: string[] } {
  const rides: Ride[] = [];
  const transferStops: string[] = [];
  let at = from;
  legs.forEach((leg, i) => {
    if (leg.type === "ride") {
      const line = LINES.get(leg.lineKey)!;
      rides.push({ line, boardIdx: line.stopIndex.get(at)!, alightIdx: line.stopIndex.get(leg.alight)! });
      at = leg.alight;
    } else {
      at = leg.to;
    }
    if (i < legs.length - 1) transferStops.push(at);
  });
  return { rides, transferStops };
}

export const routeSignature = (s: Solution) =>
  s.legs.map((l) => (l.type === "ride" ? `${l.lineKey}>${l.alight}` : `w>${l.to}`)).join("|");

/** Bahan misi yang sedang dirakit. `balance` -1 = saldo mepet, diisi setelah rute final diketahui. */
export interface Draft {
  conditions: Conditions;
  start: number;
  balance: number;
  from: string;
  to: string;
}

export function draftMission(d: Draft, deadline: number, balance = d.balance): Mission {
  return { id: "", title: "", story: "", mode: "live", from: d.from, to: d.to, start: d.start, balance, conditions: d.conditions, deadline };
}

/** Pasang satu rintangan di rute `base` (rute tercepat tanpa rintangan). */
export function placeObstacle(kind: Obstacle, d: Draft, base: Solution, ch: number, rng: Rng): boolean {
  const { between, intBetween, pick } = randomTools(rng);
  const { rides, transferStops } = ridesOf(d.from, base.legs);
  if (!rides.length) return false;
  const c = d.conditions;
  const hz = (c.hazards ??= []);
  const windowedOn = new Set(hz.filter((h) => h.start !== undefined).map((h) => h.corridor));
  const segment = (r: Ride, span: number): [string, string] | null => {
    const len = r.alightIdx - r.boardIdx;
    if (span < 1 || len < span) return null;
    const a = r.boardIdx + intBetween(0, len - span);
    return [r.line.stops[a].n, r.line.stops[a + span].n];
  };

  switch (kind) {
    case "redlight": {
      const r = pick(rides);
      const seg = segment(r, Math.min(2, r.alightIdx - r.boardIdx));
      if (!seg) return false;
      hz.push({ kind: "redlight", corridor: r.line.corridor.id, from: seg[0], to: seg[1], delay: +between(1.5, 2.5 + ch * 0.2).toFixed(1) });
      return true;
    }
    case "private": {
      const r = pick(rides);
      const seg = segment(r, Math.min(intBetween(2, 3), r.alightIdx - r.boardIdx));
      if (!seg) return false;
      hz.push({ kind: "private", corridor: r.line.corridor.id, from: seg[0], to: seg[1], speed: +between(0.4, 0.65).toFixed(2) });
      return true;
    }
    case "queue": {
      const r = pick(rides);
      const stop = r.line.stops[r.boardIdx].n;
      (c.queues ??= {})[stop] = 10 * intBetween(6 + ch, 14 + ch * 2);
      return true;
    }
    case "crowded": {
      const r = pick(rides);
      (c.crowdedCorridors ??= {})[r.line.corridor.id] = +between(0.3, 0.55).toFixed(2);
      return true;
    }
    case "closed": {
      const options = transferStops.filter((s) => s !== d.from && s !== d.to && !c.closedStops?.includes(s));
      if (!options.length) return false;
      (c.closedStops ??= []).push(pick(options));
      return true;
    }
    case "saldo": {
      d.balance = -1;
      return true;
    }
    case "accident": {
      const candidates = rides.filter((r) => r.alightIdx - r.boardIdx >= 2 && !windowedOn.has(r.line.corridor.id));
      if (!candidates.length) return false;
      const r = pick(candidates);
      const seg = segment(r, Math.min(r.alightIdx - r.boardIdx, intBetween(2, 3)));
      if (!seg) return false;
      // jendela kecelakaan dibuat bertepatan dengan saat kamu kira-kira lewat
      const trips = simulatePlan(draftMission(d, d.start + 600, 100000), base.legs).trips;
      const trip = trips[base.legs.findIndex((l) => l.type === "ride" && l.lineKey === r.line.key)];
      if (!trip) return false;
      const start = Math.round(Math.max(d.start, trip.startT - between(5, 20)));
      const end = start + 5 * intBetween(7, 13 + ch);
      hz.push({ kind: "accident", corridor: r.line.corridor.id, from: seg[0], to: seg[1], speed: 0.3, start, end });
      return true;
    }
    case "medical": {
      // penumpang pingsan di bus yang kamu naiki (menurut rute tercepat), di tengah perjalanan
      if (c.medical?.length) return false;
      const candidates = rides.filter((r) => r.alightIdx - r.boardIdx >= 2);
      if (!candidates.length) return false;
      const r = pick(candidates);
      const bus = boardedBus(d, base, r);
      if (bus === null) return false;
      const at = r.boardIdx + intBetween(1, r.alightIdx - r.boardIdx - 1);
      (c.medical ??= []).push({ lineKey: r.line.key, slot: bus, at: r.line.stops[at].n, dwell: 30 });
      return true;
    }
    case "procession": {
      // rombongan jenazah masuk jalur TJ tepat sebelum busmu melewati ruas itu
      const candidates = rides.filter((r) => !windowedOn.has(r.line.corridor.id));
      if (!candidates.length) return false;
      const r = pick(candidates);
      const len = r.alightIdx - r.boardIdx;
      const span = Math.min(intBetween(1, 2), len);
      const a = r.boardIdx + intBetween(0, len - span);
      const bus = boardedBus(d, base, r);
      if (bus === null) return false;
      const entry = new World(d.conditions).departureTime(r.line, bus, a);
      const start = Math.floor(entry - between(0.5, 3));
      hz.push({
        kind: "procession",
        corridor: r.line.corridor.id,
        from: r.line.stops[a].n,
        to: r.line.stops[a + span].n,
        speed: 0.05,
        start,
        end: start + 15,
        surprise: true,
      });
      return true;
    }
    case "demo": {
      // tawuran/demo di zona yang dilalui rute (asal, tujuan, atau halte transfer)
      if (c.demos?.length) return false;
      const keyStops = new Set([d.from, d.to, ...transferStops]);
      const zones = (Object.keys(DEMO_ZONES) as DemoZoneId[]).filter((z) => stopsInZone(z).some((st) => keyStops.has(st)));
      if (!zones.length) return false;
      (c.demos ??= []).push({ zone: pick(zones), start: d.start - 5 * intBetween(2, 8), end: d.start + 5 * intBetween(18, 36) });
      return true;
    }
    case "jam": {
      const acc = hz.find((h) => h.kind === "accident");
      if (!acc) return false;
      const center = STOP_COORDS.get(acc.from)!;
      const options: { id: string; from: string; to: string }[] = [];
      for (const id of new Set([...c.corridors, ...rides.map((r) => r.line.corridor.id)])) {
        if (id === acc.corridor || hz.some((h) => h.corridor === id && h.start !== undefined)) continue;
        const line = LINES.get(`${id}:forward`)!;
        line.stops.forEach((s, i) => {
          if (haversineKm(center, s) > 2.5) return;
          const a = Math.max(0, i - 1);
          const b = Math.min(line.stops.length - 1, i + 1);
          if (b - a >= 1) options.push({ id, from: line.stops[a].n, to: line.stops[b].n });
        });
      }
      if (!options.length) return false;
      const o = pick(options);
      hz.push({ kind: "jam", corridor: o.id, from: o.from, to: o.to, speed: +between(0.35, 0.55).toFixed(2), start: acc.start, end: acc.end! + 15 });
      return true;
    }
  }
}

/** Nomor bus (slot) yang dinaiki pada `ride` menurut rute `base`, atau null. */
function boardedBus(d: Draft, base: Solution, r: Ride): number | null {
  const i = base.legs.findIndex((l) => l.type === "ride" && l.lineKey === r.line.key);
  const trip = simulatePlan(draftMission(d, d.start + 600, 100000), base.legs).trips[i];
  if (!trip) return null;
  return new World(d.conditions).nextArrival(r.line, r.boardIdx, trip.startT - 1e-6)?.slot ?? null;
}

/** Urutan pemasangan: kecelakaan harus ada sebelum macet imbasnya. */
function orderKinds(kinds: Obstacle[]): Obstacle[] {
  const rank = (k: Obstacle) => (k === "accident" ? 0 : k === "jam" ? 1 : 2);
  return [...kinds].sort((a, b) => rank(a) - rank(b));
}

export function recipeKinds(recipe: Recipe, rng: Rng, allowSurprise = true): Obstacle[] {
  const pool = recipe.extra?.pool.filter((k) => allowSurprise || !SURPRISE_OBSTACLES.includes(k)) ?? [];
  const extra = recipe.extra ? randomTools(rng).pickSome(pool, recipe.extra.count) : [];
  return orderKinds([...recipe.fixed, ...extra]);
}

/**
 * Satu percobaan memasang rintangan sesuai `kinds` pada misi. Mengembalikan
 * misi dengan rintangan, batas waktu, dan saldo baru — atau null kalau
 * hasilnya tidak layak (tidak bisa diselesaikan, rintangan tidak berpengaruh,
 * atau terlalu lama).
 */
export function rollObstacles(
  m: Pick<Mission, "from" | "to" | "start" | "balance"> & { conditions: Conditions },
  kinds: Obstacle[],
  ch: number,
  slack: number,
  rng: Rng,
  base?: Solution | null
): Mission | null {
  const plain: Draft = { from: m.from, to: m.to, start: m.start, balance: m.balance, conditions: { corridors: m.conditions.corridors } };
  base ??= solve(draftMission(plain, m.start + 500, 100000));
  if (!base) return null;

  const d: Draft = { ...plain, conditions: { corridors: m.conditions.corridors } };
  for (const k of kinds) if (!placeObstacle(k, d, base, ch, rng)) return null;
  if (d.conditions.hazards && !d.conditions.hazards.length) delete d.conditions.hazards;

  const best = solve(draftMission(d, d.start + 600, d.balance < 0 ? 100000 : d.balance));
  if (!best) return null;
  const baseDur = base.arrival - d.start;
  const bestDur = best.arrival - d.start;
  if (bestDur > baseDur * 2.5 + 10) return null;
  // rintangan harus terasa: memperlambat atau memaksa rute berbeda
  const physical = kinds.some((k) => k !== "saldo");
  if (physical && best.arrival - base.arrival < 2 && routeSignature(best) === routeSignature(base)) return null;

  const balance = d.balance < 0 ? best.spent : d.balance;
  const result = draftMission(d, d.start + round5(bestDur * slack), balance);
  return solve(result) ? result : null;
}

/**
 * Versi acak dari misi yang punya resep. Mencoba beberapa kali; kalau tidak
 * ketemu yang layak, misi tetap (hasil generator) yang dipakai.
 */
export function randomizeMission(m: Mission, seed: number, attempts = 30): { mission: Mission; randomized: boolean } {
  const recipe = m.recipe;
  if (!recipe) return { mission: m, randomized: false };
  const rng = mulberry32(seed);
  const base = solve(draftMission({ from: m.from, to: m.to, start: m.start, balance: m.balance, conditions: { corridors: m.conditions.corridors } }, m.start + 500, 100000));
  for (let i = 0; i < attempts; i++) {
    const kinds = recipeKinds(recipe, rng, m.mode === "live");
    const rolled = rollObstacles(m, kinds, recipe.chapter, recipe.slack, rng, base);
    if (rolled) {
      return {
        mission: { ...m, conditions: rolled.conditions, deadline: rolled.deadline, balance: rolled.balance },
        randomized: true,
      };
    }
  }
  return { mission: m, randomized: false };
}
