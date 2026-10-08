// Membuat peta dasar statis (public/basemap.json) supaya game tidak perlu
// memuat ubin peta dari server luar. Dijalankan sekali / kalau data berubah:
//
//   npm run build:basemap -- "<folder berisi Batas Kecamatan.shp/.dbf>"
//
// Sumber data:
// - Batas kecamatan Kemendagri 2020 (SHP, WGS84), dari
//   https://github.com/Alf-Anas/batas-administrasi-indonesia (2020/Batas Kecamatan SHP.zip).
//   Dipakai untuk daratan (laut = di luar daratan), danau/waduk, batas & nama
//   kecamatan dan kota.
// - Geometri jalan 106 koridor TJ yang sudah ada di lib/corridorPaths.ts
//   (hasil OSRM, © OpenStreetMap contributors) sebagai jaringan jalan.
//
// Semua koordinat diproyeksikan ke koordinat dunia game (lib/game/projection.ts)
// lalu disederhanakan (Douglas–Peucker) dan dibulatkan supaya file kecil.
import fs from "fs";
import path from "path";
import { CORRIDOR_PATHS } from "../lib/corridorPaths";
import { BOUNDS, project } from "../lib/game/projection";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const shapefile = require("shapefile");

type Pt = [number, number];

const SIMPLIFY_PX = 2.5; // toleransi penyederhanaan, piksel dunia (≈ 24 m)
const ROAD_SIMPLIFY_PX = 1.5;
const MARGIN_DEG = 0.08; // ambil juga wilayah sedikit di luar area kamera
// Ruas koridor yang gagal dirutekan OSRM tersimpan sebagai garis lurus antar-halte.
// Itu wajar untuk rute bus, tapi aneh sebagai "jalan" di peta, jadi dibuang.
const MAX_ROAD_SEGMENT_PX = 60; // ≈ 570 m tanpa satu pun titik antara

function simplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let best = -1;
    let bestD = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Ring tertutup (awal = akhir) dipecah dua dulu; kalau tidak, semua jarak ke "garis" awal–akhir = 0. */
function simplifyRing(pts: Pt[], tol: number): Pt[] {
  const mid = Math.floor(pts.length / 2);
  return [...simplify(pts.slice(0, mid + 1), tol), ...simplify(pts.slice(mid), tol).slice(1)];
}

const flat = (pts: Pt[]) => pts.flatMap(([x, y]) => [Math.round(x), Math.round(y)]);

function ringArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return a / 2;
}

function ringCentroid(pts: Pt[]): Pt {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    cx += (pts[j][0] + pts[i][0]) * f;
    cy += (pts[j][1] + pts[i][1]) * f;
    a += f;
  }
  return a ? [cx / (3 * a), cy / (3 * a)] : pts[0];
}

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bKab\.?\s/i, "Kab. ")
    .replace(/[.\s]+$/, "");

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Pakai: npm run build:basemap -- "<folder Batas Kecamatan>"');
  const shp = path.join(dir, "Batas Kecamatan.shp");
  const dbf = path.join(dir, "Batas Kecamatan.dbf");
  const box = { n: BOUNDS.north + MARGIN_DEG, s: BOUNDS.south - MARGIN_DEG, w: BOUNDS.west - MARGIN_DEG, e: BOUNDS.east + MARGIN_DEG };
  const inBox = ([lng, lat]: number[]) => lng >= box.w && lng <= box.e && lat >= box.s && lat <= box.n;

  const districts: { name: string; city: string; rings: number[][]; label: number[] }[] = [];
  const water: { name: string; rings: number[][] }[] = [];
  const cityAcc = new Map<string, { x: number; y: number; a: number }>();

  const src = await shapefile.open(shp, dbf, { encoding: "utf-8" });
  for (;;) {
    const r = await src.read();
    if (r.done) break;
    const g = r.value.geometry;
    if (!g) continue;
    const polys: number[][][][] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    if (!polys.some((p) => p[0].some(inBox))) continue;
    const p = r.value.properties;

    const rings: Pt[][] = [];
    for (const poly of polys) {
      // hanya ring luar; lubang (pulau di danau dsb.) diabaikan
      const ring = simplifyRing(poly[0].map(([lng, lat]) => {
        const w = project({ lat, lng });
        return [w.x, w.y] as Pt;
      }), SIMPLIFY_PX);
      if (ring.length >= 4 && Math.abs(ringArea(ring)) > 40) rings.push(ring);
    }
    if (!rings.length) continue;

    if (!p.Kecamatan) {
      water.push({ name: titleCase(String(p.Objek ?? "")), rings: rings.map(flat) });
      continue;
    }
    const biggest = rings.reduce((a, b) => (Math.abs(ringArea(b)) > Math.abs(ringArea(a)) ? b : a));
    const label = ringCentroid(biggest);
    const city = titleCase(String(p.Kab_Kota ?? ""));
    districts.push({ name: titleCase(String(p.Kecamatan)), city, rings: rings.map(flat), label: label.map(Math.round) });
    const area = rings.reduce((s, rr) => s + Math.abs(ringArea(rr)), 0);
    const acc = cityAcc.get(city) ?? { x: 0, y: 0, a: 0 };
    acc.x += label[0] * area;
    acc.y += label[1] * area;
    acc.a += area;
    cityAcc.set(city, acc);
  }

  const cities = [...cityAcc].map(([name, a]) => ({ name, label: [Math.round(a.x / a.a), Math.round(a.y / a.a)] }));

  // jaringan jalan: gabungan geometri semua koridor, tanpa ruas yang tumpang tindih
  const seen = new Set<string>();
  const cell = (x: number, y: number) => `${Math.round(x / 3)},${Math.round(y / 3)}`;
  const roads: number[][] = [];
  for (const cp of Object.values(CORRIDOR_PATHS)) {
    const pts = cp.forward.points.map((pt) => {
      const w = project(pt);
      return [w.x, w.y] as Pt;
    });
    let run: Pt[] = [];
    const flush = () => {
      if (run.length >= 2) roads.push(flat(simplify(run, ROAD_SIMPLIFY_PX)));
      run = [];
    };
    for (let i = 1; i < pts.length; i++) {
      const key = [cell(...pts[i - 1]), cell(...pts[i])].sort().join("|");
      const long = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) > MAX_ROAD_SEGMENT_PX;
      if (seen.has(key) || long) {
        flush();
        continue;
      }
      seen.add(key);
      if (!run.length) run.push(pts[i - 1]);
      run.push(pts[i]);
    }
    flush();
  }

  const out = {
    v: 1,
    attribution: "Batas kecamatan: Kemendagri 2020 · Jalan: © OpenStreetMap contributors",
    districts,
    water,
    cities,
    roads,
  };
  const file = path.join(__dirname, "..", "public", "basemap.json");
  fs.writeFileSync(file, JSON.stringify(out));
  const pts = (xs: number[][]) => xs.reduce((s, r) => s + r.length / 2, 0);
  console.log(
    `Menulis ${file}: ${districts.length} kecamatan (${pts(districts.flatMap((d) => d.rings))} titik), ` +
      `${water.length} danau/waduk, ${cities.length} kota, ${roads.length} ruas jalan (${pts(roads)} titik), ` +
      `${(fs.statSync(file).size / 1024).toFixed(0)} KB`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
