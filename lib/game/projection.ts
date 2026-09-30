// Proyeksi Web Mercator ke koordinat dunia Phaser. Dunia diukur dalam piksel
// pada zoom peta WORLD_ZOOM, digeser supaya pojok kiri-atas area Jabodetabek
// = (0, 0) — angka tetap kecil sehingga presisi float32 WebGL cukup.
export const TILE_SIZE = 256;
export const WORLD_ZOOM = 14;
export const MIN_TILE_ZOOM = 10;
export const MAX_TILE_ZOOM = 17;

export const BOUNDS = { north: -5.95, south: -6.55, west: 106.45, east: 107.15 };

function rawPixel(lat: number, lng: number, zoom = WORLD_ZOOM) {
  const scale = TILE_SIZE * 2 ** zoom;
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  };
}

export const ORIGIN = rawPixel(BOUNDS.north, BOUNDS.west);
const SE = rawPixel(BOUNDS.south, BOUNDS.east);
export const WORLD_WIDTH = SE.x - ORIGIN.x;
export const WORLD_HEIGHT = SE.y - ORIGIN.y;

export function project(p: { lat: number; lng: number }): { x: number; y: number } {
  const r = rawPixel(p.lat, p.lng);
  return { x: r.x - ORIGIN.x, y: r.y - ORIGIN.y };
}
