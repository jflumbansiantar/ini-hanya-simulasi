// Validasi misi: setiap misi harus bisa diselesaikan (solver menemukan rute
// sebelum batas waktu) dan menjalankan rute solver lewat mesin permainan
// harus menghasilkan waktu tiba yang sama. Misi dengan resep rintangan juga
// diacak dengan banyak seed, dan setiap versi acak dicek dengan cara yang sama.
// Jalankan: npm run check:missions   (tambahkan --verbose untuk rute per misi)
import { MISSIONS, type Mission } from "../lib/game/missions";
import { randomizeMission } from "../lib/game/obstacles";
import { simulatePlan } from "../lib/game/session";
import { solve } from "../lib/game/solver";
import { LINES, lineLabel } from "../lib/game/world";
import { formatClock } from "../lib/simulation";

const SEEDS = 30;
const verbose = process.argv.includes("--verbose");

/** null = OK, selain itu alasan gagal. */
function check(m: Mission): { error: string | null; arrival?: number } {
  const sol = solve(m);
  if (!sol) return { error: "tidak ada rute sebelum batas waktu" };
  const s = simulatePlan(m, sol.legs);
  if (s.state.kind !== "done" || Math.abs(s.state.arrivedAt - sol.arrival) > 1e-6) {
    return { error: `mesin (${JSON.stringify(s.state)}) ≠ solver (${sol.arrival})` };
  }
  return { error: null, arrival: sol.arrival };
}

let failed = 0;
let rolls = 0;
let fallbacks = 0;
for (const m of MISSIONS) {
  const fixed = check(m);
  if (fixed.error) {
    console.log(`✗ ${m.id} ${m.title} (versi tetap): ${fixed.error}`);
    failed++;
    continue;
  }
  let note = "";
  if (m.recipe) {
    // kelonggaran waktu (batas − durasi tercepat) sebagai ukuran tingkat kesulitan
    const ratios: number[] = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { mission, randomized } = randomizeMission(m, seed * 7919);
      rolls++;
      if (!randomized) {
        fallbacks++;
        continue;
      }
      const r = check(mission);
      if (r.error) {
        console.log(`✗ ${m.id} ${m.title} (seed ${seed}): ${r.error}`);
        failed++;
        continue;
      }
      ratios.push((mission.deadline - mission.start) / (r.arrival! - mission.start));
    }
    const min = Math.min(...ratios).toFixed(2);
    const max = Math.max(...ratios).toFixed(2);
    note = ` · ${ratios.length}/${SEEDS} variasi acak, batas waktu ${min}–${max}× rute tercepat`;
  }
  console.log(`✓ ${m.id} ${m.title}: tiba ${formatClock(fixed.arrival!)} (batas ${formatClock(m.deadline)})${note}`);
  if (verbose) {
    for (const leg of solve(m)!.legs) {
      console.log("    " + (leg.type === "ride" ? `${lineLabel(LINES.get(leg.lineKey)!)} → turun ${leg.alight}` : `jalan kaki → ${leg.to}`));
    }
  }
}
console.log(
  `\n${MISSIONS.length - failed}/${MISSIONS.length} misi OK · ${rolls - fallbacks}/${rolls} pengacakan berhasil` +
    ` (${fallbacks} kembali ke versi tetap)`
);
process.exit(failed ? 1 : 0);
