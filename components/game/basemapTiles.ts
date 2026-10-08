import { ORIGIN, TILE_SIZE, WORLD_ZOOM } from "@/lib/game/projection";

/**
 * Merender peta dasar vektor (public/basemap.json) menjadi ubin gambar
 * 256×256 di browser — mekanismenya seperti peta online, tapi ubinnya dibuat
 * dari data lokal, bukan diunduh. Setiap ubin cukup digambar sekali per
 * tingkat zoom lalu disimpan sebagai tekstur, jadi tiap frame hanya
 * menggambar beberapa gambar (ringan) dan peta tetap tajam di setiap zoom.
 */

export interface Basemap {
  districts: { name: string; city: string; rings: number[][]; label: number[] }[];
  water: { name: string; rings: number[][] }[];
  cities: { name: string; label: number[] }[];
  roads: number[][];
}

// warna peta dasar (tema gelap)
export const SEA = "#0d1824";
const LAND = ["#1e232c", "#20252f", "#1c2129", "#222731", "#1f242d"];
const BOUNDARY = "#323947";
const ROAD = "#3b4250";

interface Shape {
  path: Path2D;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function shape(flat: number[], closed: boolean): Shape {
  const path = new Path2D();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < flat.length; i += 2) {
    const x = flat[i];
    const y = flat[i + 1];
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (closed) path.closePath();
  return { path, minX, minY, maxX, maxY };
}

export class BasemapRenderer {
  private land: (Shape & { fill: string })[] = [];
  private water: Shape[] = [];
  private roads: Shape[] = [];
  private readonly scale: number;

  constructor(data: Basemap, pixelRatio: number) {
    this.scale = Math.min(2, Math.max(1, pixelRatio));
    const cities = [...new Set(data.districts.map((d) => d.city))];
    for (const d of data.districts) {
      const fill = LAND[cities.indexOf(d.city) % LAND.length];
      for (const ring of d.rings) this.land.push({ ...shape(ring, true), fill });
    }
    for (const w of data.water) for (const ring of w.rings) this.water.push(shape(ring, true));
    for (const r of data.roads) this.roads.push(shape(r, false));
  }

  /** Ukuran satu ubin zoom `z` dalam koordinat dunia. */
  static tileWorldSize(z: number): number {
    return TILE_SIZE * 2 ** (WORLD_ZOOM - z);
  }

  /** Gambar ubin (z, x, y) — indeks ubin Web Mercator standar. */
  renderTile(z: number, x: number, y: number): HTMLCanvasElement {
    const px = Math.round(TILE_SIZE * this.scale);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = px;
    const ctx = canvas.getContext("2d")!;
    const size = BasemapRenderer.tileWorldSize(z);
    const left = x * size - ORIGIN.x;
    const top = y * size - ORIGIN.y;
    const s = px / size; // piksel kanvas per satuan dunia
    const pad = 4 / s;
    const visible = (sh: Shape) =>
      sh.maxX >= left - pad && sh.minX <= left + size + pad && sh.maxY >= top - pad && sh.minY <= top + size + pad;

    ctx.fillStyle = SEA;
    ctx.fillRect(0, 0, px, px);
    ctx.setTransform(s, 0, 0, s, -left * s, -top * s);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const land = this.land.filter(visible);
    for (const l of land) {
      ctx.fillStyle = l.fill;
      ctx.fill(l.path);
    }
    ctx.fillStyle = SEA;
    for (const w of this.water) if (visible(w)) ctx.fill(w.path);

    // batas kecamatan: 1 piksel layar
    ctx.strokeStyle = BOUNDARY;
    ctx.lineWidth = this.scale / s;
    for (const l of land) ctx.stroke(l.path);

    // jalan menebal di zoom dekat, seperti peta pada umumnya
    ctx.strokeStyle = ROAD;
    ctx.lineWidth = (Math.min(5, Math.max(1, 1 + (z - 11) * 0.8)) * this.scale) / s;
    for (const r of this.roads) if (visible(r)) ctx.stroke(r.path);
    return canvas;
  }
}
