import type { Corridor, Stop } from "./corridors";
import { CORRIDOR_PATHS, type RoadPoint } from "./corridorPaths";

export const AVG_SPEED_KMH = 22; // asumsi kecepatan rata-rata BRT termasuk waktu henti di halte

export interface DirectionMeta {
  points: RoadPoint[]; // dense, road-following (lihat lib/corridorPaths.ts)
  cumKm: number[]; // jarak kumulatif sejak titik pertama, index-align dengan `points`
  legAt: number[]; // per titik: index leg halte-ke-halte (0..stops.length-2) yang menaunginya
  breaks: number[]; // index titik tempat tiap halte berada, urut sesuai arah
}

export interface CorridorMeta {
  totalKm: number;
  durationMin: number;
  forward: DirectionMeta;
  backward: DirectionMeta;
}

export type Direction = "forward" | "backward";

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
  return { points, cumKm, legAt, breaks };
}

/**
 * Meta per koridor dihitung dari geometri jalan asli (lib/corridorPaths.ts,
 * hasil OSRM sekali jalan saat data-generation) kalau tersedia; fallback ke
 * garis lurus antar-stop kalau tidak (jaring pengaman untuk koridor baru
 * yang geometrinya belum di-generate).
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
    forward = buildDirectionMeta(fwdPoints, fwdBreaks);
    backward = buildDirectionMeta(bwdPoints, fwdBreaks);
  }
  const totalKm = forward.cumKm[forward.cumKm.length - 1];
  const durationMin = (totalKm / AVG_SPEED_KMH) * 60;
  return { totalKm, durationMin, forward, backward };
}

/** Posisi di sepanjang geometri satu arah, `fraction` 0..1 dari total jarak. */
export function positionAlongDirection(
  dirMeta: DirectionMeta,
  orderedStops: Stop[],
  fraction: number
): { lat: number; lng: number; heading: number; fromStop: string; toStop: string } {
  const { points, cumKm, legAt } = dirMeta;
  const targetDist = Math.max(0, Math.min(1, fraction)) * cumKm[cumKm.length - 1];
  let lo = 0;
  let hi = cumKm.length - 2;
  // binary search: segmen terakhir dengan cumKm[i] <= targetDist
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cumKm[mid] <= targetDist) lo = mid;
    else hi = mid - 1;
  }
  const i = Math.max(0, lo);
  const segLen = cumKm[i + 1] - cumKm[i];
  const segFrac = segLen > 0 ? (targetDist - cumKm[i]) / segLen : 0;
  const a = points[i];
  const b = points[i + 1] ?? a;
  const leg = legAt[i];
  return {
    lat: a.lat + (b.lat - a.lat) * segFrac,
    lng: a.lng + (b.lng - a.lng) * segFrac,
    heading: Math.atan2(-(b.lat - a.lat), (b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180)),
    fromStop: orderedStops[leg].n,
    toStop: orderedStops[Math.min(leg + 1, orderedStops.length - 1)].n,
  };
}

export function formatClock(simMinutes: number): string {
  const m = ((Math.floor(simMinutes) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
