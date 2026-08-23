import type { Corridor, Stop } from "./corridors";

export const AVG_SPEED_KMH = 22; // asumsi kecepatan rata-rata BRT termasuk waktu henti di halte

export interface CorridorMeta {
  totalKm: number;
  durationMin: number;
  segKm: number[];
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

export function haversineKm(a: Stop, b: Stop): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function computeCorridorMeta(stops: Stop[]): CorridorMeta {
  const segKm: number[] = [];
  let totalKm = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const d = haversineKm(stops[i], stops[i + 1]);
    segKm.push(d);
    totalKm += d;
  }
  const durationMin = (totalKm / AVG_SPEED_KMH) * 60;
  return { totalKm, durationMin, segKm };
}

function positionAlongRoute(
  stops: Stop[],
  meta: CorridorMeta,
  fraction: number
): { lat: number; lng: number; fromStop: string; toStop: string } {
  const targetDist = Math.max(0, Math.min(1, fraction)) * meta.totalKm;
  let acc = 0;
  for (let i = 0; i < meta.segKm.length; i++) {
    const segLen = meta.segKm[i];
    if (acc + segLen >= targetDist || i === meta.segKm.length - 1) {
      const segFrac = segLen > 0 ? (targetDist - acc) / segLen : 0;
      const a = stops[i];
      const b = stops[i + 1];
      return {
        lat: a.lat + (b.lat - a.lat) * segFrac,
        lng: a.lng + (b.lng - a.lng) * segFrac,
        fromStop: a.n,
        toStop: b.n,
      };
    }
    acc += segLen;
  }
  const last = stops[stops.length - 1];
  return { lat: last.lat, lng: last.lng, fromStop: last.n, toStop: last.n };
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
    const stops = direction === "forward" ? corridor.stops : [...corridor.stops].reverse();
    for (let slot = 0; slot <= lastSlot; slot++) {
      const depart = activeStart + slot * headway;
      if (depart > activeEnd) continue;
      const elapsed = simMinutes - depart;
      if (elapsed >= 0 && elapsed < durationMin) {
        const fraction = elapsed / durationMin;
        const pos = positionAlongRoute(stops, meta, fraction);
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
