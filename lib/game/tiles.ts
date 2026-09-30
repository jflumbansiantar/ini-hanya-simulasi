/**
 * Sumber ubin peta. Default: OpenStreetMap standar (gratis, tanpa API key,
 * mendukung CORS) yang digelapkan dengan tint supaya cocok dengan tema gelap
 * game. Bisa diganti lewat environment variable saat build:
 *
 *   NEXT_PUBLIC_TILE_URL=https://.../{z}/{x}/{y}.png   ({s} = subdomain a–d)
 *   NEXT_PUBLIC_TILE_TINT=#ffffff                      (tint; #ffffff = tanpa tint)
 *   NEXT_PUBLIC_TILE_ATTRIBUTION="© ..."
 *
 * Contoh CARTO gelap (sekarang butuh API key):
 *   NEXT_PUBLIC_TILE_URL=https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?api_key=KEY
 *   NEXT_PUBLIC_TILE_TINT=#ffffff
 */
const DEFAULT_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const customUrl = process.env.NEXT_PUBLIC_TILE_URL;
const template = customUrl || DEFAULT_URL;

/** Tint (hex) yang dikalikan ke ubin; ubin OSM terang digelapkan secara default. */
export const TILE_TINT = process.env.NEXT_PUBLIC_TILE_TINT || (customUrl ? "#ffffff" : "#5c6372");

export const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || "© OpenStreetMap contributors";

export function tileUrl(z: number, x: number, y: number): string {
  return template
    .replace("{s}", "abcd"[(x + y) % 4])
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}
