import { World, fareAt } from "./world";
import type { Mission } from "./missions";
import type { PlanLeg } from "./session";

/**
 * Kunci jawaban: waktu tiba paling awal dari asal ke tujuan, dengan aturan
 * yang persis sama seperti mesin permainan (jadwal & waktu tunggu, bus
 * penuh, halte ditutup, macet, tarif & saldo). Label-setting Dijkstra atas
 * state (halte, sudah-di-dalam-halte-berbayar) dengan label Pareto
 * (waktu, uang terpakai), supaya rute yang lebih cepat tapi melebihi saldo
 * tidak dianggap solusi.
 */

interface Label {
  stop: string;
  inside: boolean;
  t: number;
  spent: number;
  prev: Label | null;
  leg: PlanLeg | null;
}

export interface Solution {
  arrival: number;
  spent: number;
  legs: PlanLeg[];
}

class MinHeap {
  private a: Label[] = [];
  get size() {
    return this.a.length;
  }
  push(x: Label) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].t <= a[i].t) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): Label {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].t < a[m].t) m = l;
        if (r < a.length && a[r].t < a[m].t) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

export function solve(mission: Mission, world: World = new World(mission.conditions)): Solution | null {
  const settled = new Map<string, { t: number; spent: number }[]>();
  const heap = new MinHeap();
  heap.push({ stop: mission.from, inside: false, t: mission.start, spent: 0, prev: null, leg: null });

  const dominated = (l: Label) => {
    const list = settled.get(`${l.stop}|${l.inside}`);
    return !!list?.some((o) => o.t <= l.t + 1e-9 && o.spent <= l.spent);
  };

  while (heap.size) {
    const cur = heap.pop();
    if (cur.t > mission.deadline + 1e-9) break;
    if (dominated(cur)) continue;
    const key = `${cur.stop}|${cur.inside}`;
    settled.set(key, [...(settled.get(key) ?? []), { t: cur.t, spent: cur.spent }]);

    if (cur.stop === mission.to) {
      const legs: PlanLeg[] = [];
      for (let l: Label | null = cur; l && l.leg; l = l.prev) legs.push(l.leg);
      return { arrival: cur.t, spent: cur.spent, legs: legs.reverse() };
    }

    if (!world.isClosed(cur.stop)) {
      for (const { line, idx } of world.stopLines.get(cur.stop) ?? []) {
        if (idx === line.stops.length - 1) continue;
        // tetap di bus yang sama selalu lebih baik daripada turun lalu naik lagi
        if (cur.leg?.type === "ride" && cur.leg.lineKey === line.key) continue;
        const a = world.nextBoardable(line, idx, cur.t);
        if (!a) continue;
        const fare = cur.inside ? 0 : fareAt(a.time);
        const spent = cur.spent + fare;
        if (spent > mission.balance) continue;
        for (let j = idx + 1; j < line.stops.length; j++) {
          const stop = line.stops[j].n;
          if (world.isClosed(stop)) continue;
          const next: Label = {
            stop,
            inside: true,
            t: world.arrivalTime(line, a.slot, j),
            spent,
            prev: cur,
            leg: { type: "ride", lineKey: line.key, alight: stop },
          };
          if (!dominated(next)) heap.push(next);
        }
      }
    }
    for (const w of world.walkLinks.get(cur.stop) ?? []) {
      const next: Label = {
        stop: w.to,
        inside: false,
        t: cur.t + w.minutes,
        spent: cur.spent,
        prev: cur,
        leg: { type: "walk", to: w.to },
      };
      if (!dominated(next)) heap.push(next);
    }
  }
  return null;
}

/** Bintang 1–3 berdasarkan selisih durasi dengan rute terbaik. */
export function starsFor(mission: Mission, arrival: number, best: number): number {
  const d = arrival - mission.start;
  const dBest = best - mission.start;
  if (d <= dBest + Math.max(3, dBest * 0.1)) return 3;
  if (d <= dBest + Math.max(10, dBest * 0.35)) return 2;
  return 1;
}
