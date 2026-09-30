// Validasi misi: setiap misi harus bisa diselesaikan (solver menemukan rute
// sebelum batas waktu) dan menjalankan rute solver lewat mesin permainan
// harus menghasilkan waktu tiba yang sama. Jalankan: npx tsx scripts/check-missions.ts
import { MISSIONS } from "../lib/game/missions";
import { solve } from "../lib/game/solver";
import { simulatePlan } from "../lib/game/session";
import { World, LINES, lineLabel } from "../lib/game/world";
import { formatClock } from "../lib/simulation";

let failed = false;
for (const m of MISSIONS) {
  const world = new World(m.conditions);
  const sol = solve(m, world);
  if (!sol) {
    console.log(`✗ ${m.id} ${m.title}: TIDAK ADA RUTE`);
    failed = true;
    continue;
  }
  const s = simulatePlan(m, sol.legs);
  const ok = s.state.kind === "done" && Math.abs(s.state.arrivedAt - sol.arrival) < 1e-6;
  if (!ok) console.log("    solver", sol.arrival);
  if (!ok) failed = true;
  const slack = m.deadline - sol.arrival;
  console.log(
    `${ok ? "✓" : "✗"} ${m.id} ${m.title}: tiba ${formatClock(sol.arrival)} (${Math.round(sol.arrival - m.start)} mnt, sisa ${Math.round(slack)} mnt sebelum batas), Rp${sol.spent}`
  );
  for (const leg of sol.legs) {
    console.log("    " + (leg.type === "ride" ? `${lineLabel(LINES.get(leg.lineKey)!)} → turun ${leg.alight}` : `jalan kaki → ${leg.to}`));
  }
  if (!ok) console.log("    engine:", JSON.stringify(s.state));
}
if (process.argv.includes("--walks")) {
  const w = new World({ corridors: [...LINES.values()].map((l) => l.corridor.id).filter((v, i, a) => a.indexOf(v) === i) });
  for (const [a, links] of w.walkLinks) console.log(a, "->", links.map((l) => `${l.to} ${Math.round(l.km * 1000)}m`).join(", "));
}
process.exit(failed ? 1 : 0);
