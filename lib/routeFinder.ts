import { CORRIDORS } from "./corridors";
import { CORRIDOR_PATHS, type RoadPoint } from "./corridorPaths";
import { AVG_SPEED_KMH, haversineKm, type Direction } from "./simulation";

/**
 * Pencari rute halte-ke-halte, terpisah dari jam simulasi (§2.3 PRD: fitur
 * baru, bukan bagian dari alur bus yang sudah ada). Graf dibangun sekali saat
 * modul dimuat: node = nama halte (halte dengan nama sama di koridor berbeda
 * dianggap satu titik transfer, sama seperti asumsi "1 nama = 1 lokasi fisik"
 * yang sudah dipakai di ControlPanel/MapView), edge = satu leg antar-halte
 * berurutan pada satu koridor/subkoridor (kedua arah, karena bus jalan
 * bolak-balik). Pathfinding: minimasi jumlah transfer dulu, waktu tempuh
 * sebagai tie-breaker (bukan Dijkstra murni atas waktu) -- lihat catatan di
 * SEARCH_TRANSFER_WEIGHT di bawah untuk alasannya.
 */

// Bobot transfer yang dipakai HANYA untuk urutan pencarian (bukan ditampilkan
// ke user). Dibuat sangat besar supaya efeknya leksikografis: minimasi
// jumlah transfer dulu, waktu tempuh cuma tie-breaker di antara rute dengan
// jumlah transfer yang sama. Awalnya dicoba penalti "realistis" (~15 menit),
// tapi ternyata untuk pasangan sesederhana Blok M -> Kota itu tetap
// merekomendasikan sambungan 2 subkoridor (1W lalu 1A) alih-alih Koridor 1
// trunk langsung, karena geometri tiap leg diambil independen per
// koridor/subkoridor (lihat PRD §3) -- rute "langsung" trunk lewat 5 halte
// perantara jadi tampak >15 menit lebih lambat di data dibanding potongan
// subkoridor yang melompati halte-halte itu dalam satu request OSRM. Itu
// artefak cara data di-generate, bukan rute yang masuk akal buat
// direkomendasikan ke user dibanding koridor trunk yang jelas-jelas
// menghubungkan langsung. Minimasi-transfer-dulu menghindari kelas masalah
// ini sama sekali: kalau satu koridor sudah menghubungkan langsung, itu
// yang selalu dipilih.
const SEARCH_TRANSFER_WEIGHT = 1000;
// Estimasi tampilan (bukan bobot pencarian) untuk waktu jalan kaki + tunggu
// per transfer, dijumlahkan ke totalMin yang ditampilkan ke user.
const DISPLAY_TRANSFER_MIN = 5;

interface Edge {
  from: string;
  to: string;
  corridorId: string;
  direction: Direction;
  path: RoadPoint[]; // titik geometri jalan asli dari `from` ke `to`, inklusif kedua ujung
  km: number;
  timeMin: number;
}

export interface RouteStep {
  corridorId: string;
  corridorName: string;
  corridorRoute: string;
  corridorColor: string;
  direction: Direction;
  boardStop: string;
  alightStop: string;
  stopNames: string[]; // urutan halte yang dilewati, termasuk naik & turun
  distanceKm: number;
  durationMin: number;
  path: RoadPoint[];
}

export interface RouteResult {
  steps: RouteStep[];
  transfers: number;
  totalKm: number;
  travelMin: number; // waktu tempuh di dalam bus saja
  transferOverheadMin: number; // estimasi tampilan, lihat DISPLAY_TRANSFER_MIN
  totalMin: number; // travelMin + transferOverheadMin, estimasi total termasuk pindah koridor
}

const corridorById = new Map(CORRIDORS.map((c) => [c.id, c]));

const graph = new Map<string, Edge[]>();
function addEdge(edge: Edge) {
  const list = graph.get(edge.from);
  if (list) list.push(edge);
  else graph.set(edge.from, [edge]);
}

function pathKm(points: RoadPoint[]): number {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
  return km;
}

function slicePoints(
  points: RoadPoint[] | undefined,
  breaks: number[] | undefined,
  lowIdx: number,
  highIdx: number,
  fallbackFrom: RoadPoint,
  fallbackTo: RoadPoint
): RoadPoint[] {
  if (!points || !breaks) return [fallbackFrom, fallbackTo];
  return points.slice(breaks[lowIdx], breaks[highIdx] + 1);
}

for (const c of CORRIDORS) {
  const roadPath = CORRIDOR_PATHS[c.id];
  const n = c.stops.length;
  for (let i = 0; i < n - 1; i++) {
    const a = c.stops[i];
    const b = c.stops[i + 1];

    const fwdPts = slicePoints(roadPath?.forward.points, roadPath?.forward.breaks, i, i + 1, a, b);
    const fwdKm = pathKm(fwdPts);
    addEdge({
      from: a.n,
      to: b.n,
      corridorId: c.id,
      direction: "forward",
      path: fwdPts,
      km: fwdKm,
      timeMin: (fwdKm / AVG_SPEED_KMH) * 60,
    });

    // Arah balik: pada array backward.points (= forward.points dibalik),
    // halte b selalu muncul tepat sebelum halte a — lihat scripts/fetch-road-geometry.js
    // (backwardBreaks[k] = n - forwardBreaks[k], n = last index).
    const posA = n - 1 - i;
    const posB = n - 2 - i;
    const bwdPts = slicePoints(roadPath?.backward.points, roadPath?.backward.breaks, posB, posA, b, a);
    const bwdKm = pathKm(bwdPts);
    addEdge({
      from: b.n,
      to: a.n,
      corridorId: c.id,
      direction: "backward",
      path: bwdPts,
      km: bwdKm,
      timeMin: (bwdKm / AVG_SPEED_KMH) * 60,
    });
  }
}

const stopCorridors = new Map<string, Set<string>>();
for (const c of CORRIDORS) {
  for (const s of c.stops) {
    if (!stopCorridors.has(s.n)) stopCorridors.set(s.n, new Set());
    stopCorridors.get(s.n)!.add(c.id);
  }
}

export interface StopOption {
  name: string;
  corridorCount: number;
}

export const ALL_STOPS: StopOption[] = [...stopCorridors.entries()]
  .map(([name, ids]) => ({ name, corridorCount: ids.size }))
  .sort((x, y) => x.name.localeCompare(y.name));

const STOP_NAME_SET = new Set(stopCorridors.keys());
export function isKnownStop(name: string): boolean {
  return STOP_NAME_SET.has(name);
}

function stateKey(node: string, corridorId: string | null): string {
  return `${node}::${corridorId ?? ""}`;
}

/**
 * Dijkstra atas state (halte, koridor-terakhir-yang-dinaiki) supaya penalti
 * transfer bisa dihitung dengan benar (pindah koridor di halte yang sama
 * tetap ada biayanya, bukan gratis). Graf kecil (~250 leg x 2 arah), jadi
 * ekstraksi minimum linear per iterasi cukup cepat tanpa perlu heap.
 */
export function findRoute(fromStop: string, toStop: string): RouteResult | null {
  if (!isKnownStop(fromStop) || !isKnownStop(toStop)) return null;
  if (fromStop === toStop) {
    return { steps: [], transfers: 0, totalKm: 0, travelMin: 0, transferOverheadMin: 0, totalMin: 0 };
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, { key: string; edge: Edge } | null>();
  const visited = new Set<string>();

  const startKey = stateKey(fromStop, null);
  dist.set(startKey, 0);
  prev.set(startKey, null);

  let reachedKey: string | null = null;

  while (true) {
    let curKey: string | null = null;
    let curDist = Infinity;
    for (const [k, d] of dist) {
      if (!visited.has(k) && d < curDist) {
        curDist = d;
        curKey = k;
      }
    }
    if (curKey === null) break;
    visited.add(curKey);

    const node = curKey.slice(0, curKey.indexOf("::"));
    if (node === toStop) {
      reachedKey = curKey;
      break;
    }
    const lastCorridor = curKey.slice(curKey.indexOf("::") + 2) || null;

    for (const edge of graph.get(node) ?? []) {
      const penalty = lastCorridor !== null && lastCorridor !== edge.corridorId ? SEARCH_TRANSFER_WEIGHT : 0;
      const nd = curDist + edge.timeMin + penalty;
      const nk = stateKey(edge.to, edge.corridorId);
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd);
        prev.set(nk, { key: curKey, edge });
      }
    }
  }

  if (!reachedKey) return null;

  const edgesUsed: Edge[] = [];
  let k: string | null = reachedKey;
  while (k) {
    const p: { key: string; edge: Edge } | null = prev.get(k) ?? null;
    if (!p) break;
    edgesUsed.push(p.edge);
    k = p.key;
  }
  edgesUsed.reverse();

  const steps: RouteStep[] = [];
  for (const edge of edgesUsed) {
    const last = steps[steps.length - 1];
    if (last && last.corridorId === edge.corridorId && last.direction === edge.direction) {
      last.alightStop = edge.to;
      last.stopNames.push(edge.to);
      last.distanceKm += edge.km;
      last.durationMin += edge.timeMin;
      last.path.push(...edge.path.slice(1));
    } else {
      const corridor = corridorById.get(edge.corridorId)!;
      steps.push({
        corridorId: edge.corridorId,
        corridorName: corridor.name,
        corridorRoute: corridor.route,
        corridorColor: corridor.color,
        direction: edge.direction,
        boardStop: edge.from,
        alightStop: edge.to,
        stopNames: [edge.from, edge.to],
        distanceKm: edge.km,
        durationMin: edge.timeMin,
        path: [...edge.path],
      });
    }
  }

  const totalKm = steps.reduce((s, st) => s + st.distanceKm, 0);
  const travelMin = steps.reduce((s, st) => s + st.durationMin, 0);
  const transfers = steps.length - 1;
  const transferOverheadMin = transfers * DISPLAY_TRANSFER_MIN;
  return { steps, transfers, totalKm, travelMin, transferOverheadMin, totalMin: travelMin + transferOverheadMin };
}
