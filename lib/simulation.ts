import type { Corridor, Stop } from "./corridors";
import { CORRIDOR_PATHS, type RoadPoint } from "./corridorPaths";

export const AVG_SPEED_KMH = 22; // asumsi kecepatan rata-rata BRT termasuk waktu henti di halte

interface DirectionMeta {
  points: RoadPoint[]; // dense, road-following (lihat lib/corridorPaths.ts)
  cumKm: number[]; // jarak kumulatif sejak titik pertama, index-align dengan `points`
  legAt: number[]; // per titik: index leg halte-ke-halte (0..stops.length-2) yang menaunginya
}

export interface CorridorMeta {
  totalKm: number;
  durationMin: number;
  forward: DirectionMeta;
  backward: DirectionMeta;
}

export type Direction = "forward" | "backward";

export interface Trip {
  id: string;
  corridorId: string;
  direction: Direction;
  lat: number;
  lng: number;
  fromStop: string;
  toStop: string;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function buildDirectionMeta(points: RoadPoint[], breaks: number[]): DirectionMeta {
  const cumKm = [0];
  for (let i = 1; i < points.length; i++) {
    cumKm.push(cumKm[i - 1] + haversineKm(points[i - 1], points[i]));
  }
  const legAt: number[] = new Array(points.length);
  let leg = 0;
  for (let i = 0; i < points.length; i++) {
    while (leg < breaks.length - 2 && i >= breaks[leg + 1]) leg++;
    legAt[i] = leg;
  }
  return { points, cumKm, legAt };
}

/**
 * Meta per koridor dihitung dari geometri jalan asli (lib/corridorPaths.ts,
 * hasil OSRM sekali jalan saat data-generation — lihat PRD §3) kalau
 * tersedia; fallback ke garis lurus antar-stop kalau tidak (seharusnya tidak
 * pernah terjadi untuk 37 koridor yang ada, hanya jaring pengaman).
 */
export function computeCorridorMeta(corridor: Corridor): CorridorMeta {
  const roadPath = CORRIDOR_PATHS[corridor.id];
  let forward: DirectionMeta;
  let backward: DirectionMeta;
  if (roadPath) {
    forward = buildDirectionMeta(roadPath.forward.points, roadPath.forward.breaks);
    backward = buildDirectionMeta(roadPath.backward.points, roadPath.backward.breaks);
  } else {
    const fwdPoints: RoadPoint[] = corridor.stops.map((s) => ({ lat: s.lat, lng: s.lng }));
    const bwdPoints = [...fwdPoints].reverse();
    const fwdBreaks = fwdPoints.map((_, i) => i);
    const bwdBreaks = [...fwdBreaks].reverse();
    forward = buildDirectionMeta(fwdPoints, fwdBreaks);
    backward = buildDirectionMeta(bwdPoints, bwdBreaks);
  }
  const totalKm = forward.cumKm[forward.cumKm.length - 1];
  const durationMin = (totalKm / AVG_SPEED_KMH) * 60;
  return { totalKm, durationMin, forward, backward };
}

function positionAlongDirection(
  dirMeta: DirectionMeta,
  orderedStops: Stop[],
  fraction: number
): { lat: number; lng: number; fromStop: string; toStop: string } {
  const { points, cumKm, legAt } = dirMeta;
  const targetDist = Math.max(0, Math.min(1, fraction)) * cumKm[cumKm.length - 1];
  let i = 0;
  while (i < cumKm.length - 2 && cumKm[i + 1] < targetDist) i++;
  const segLen = cumKm[i + 1] - cumKm[i];
  const segFrac = segLen > 0 ? (targetDist - cumKm[i]) / segLen : 0;
  const a = points[i];
  const b = points[i + 1];
  const leg = legAt[i];
  return {
    lat: a.lat + (b.lat - a.lat) * segFrac,
    lng: a.lng + (b.lng - a.lng) * segFrac,
    fromStop: orderedStops[leg].n,
    toStop: orderedStops[Math.min(leg + 1, orderedStops.length - 1)].n,
  };
}

/**
 * Diturunkan murni dari (corridor, simMinutes, meta) — tidak ada state bus
 * yang di-mutate antar-frame. Panggil ulang tiap tick jam simulasi.
 */
export function getActiveTrips(
  corridor: Corridor,
  meta: CorridorMeta,
  simMinutes: number
): Trip[] {
  const trips: Trip[] = [];
  const { durationMin } = meta;
  const { activeStart, activeEnd, headway } = corridor;
  const windowLen = activeEnd - activeStart;
  if (windowLen <= 0 || durationMin <= 0) return trips;

  const lastSlot = Math.floor(windowLen / headway);
  const directions: Direction[] = ["forward", "backward"];

  for (const direction of directions) {
    const dirMeta = direction === "forward" ? meta.forward : meta.backward;
    const orderedStops = direction === "forward" ? corridor.stops : [...corridor.stops].reverse();
    for (let slot = 0; slot <= lastSlot; slot++) {
      const depart = activeStart + slot * headway;
      if (depart > activeEnd) continue;
      const elapsed = simMinutes - depart;
      if (elapsed >= 0 && elapsed < durationMin) {
        const fraction = elapsed / durationMin;
        const pos = positionAlongDirection(dirMeta, orderedStops, fraction);
        trips.push({
          id: `${corridor.id}-${direction}-${slot}`,
          corridorId: corridor.id,
          direction,
          ...pos,
        });
      }
    }
  }
  return trips;
}

export function formatClock(simMinutes: number): string {
  const m = ((Math.floor(simMinutes) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function directionLabel(corridor: Corridor, direction: Direction): string {
  const first = corridor.stops[0].n;
  const last = corridor.stops[corridor.stops.length - 1].n;
  return direction === "forward" ? `${first} → ${last}` : `${last} → ${first}`;
}
