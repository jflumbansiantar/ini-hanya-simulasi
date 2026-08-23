import { CORRIDORS } from "./corridors";
import { computeCorridorMeta, type CorridorMeta } from "./simulation";

// Dihitung sekali saat modul dimuat — totalKm/durationMin per koridor
// diturunkan dari koordinat stops, bukan di-hardcode.
export const CORRIDOR_META: Record<string, CorridorMeta> = Object.fromEntries(
  CORRIDORS.map((c) => [c.id, computeCorridorMeta(c)])
);
