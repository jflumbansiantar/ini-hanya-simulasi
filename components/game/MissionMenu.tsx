import { controller } from "@/lib/game/controller";
import { MISSIONS } from "@/lib/game/missions";
import { formatClock } from "./format";

export function Stars({ n, max = 3 }: { n: number; max?: number }) {
  return (
    <span className="stars" aria-label={`${n} dari ${max} bintang`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? "on" : "off"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function MissionMenu() {
  const c = controller;
  const total = MISSIONS.reduce((s, m) => s + (c.progress[m.id] ?? 0), 0);
  return (
    <div className="overlay">
      <div className="card menuCard">
        <div className="menuHead">
          <div>
            <h1>Penumpang TJ</h1>
            <p className="dim">Sampai tujuan tepat waktu dengan bus Transjakarta, di atas peta Jakarta asli.</p>
          </div>
          <div className="menuTotal">
            <b>{total}</b>
            <span>/ {MISSIONS.length * 3} ★</span>
          </div>
        </div>
        <ol className="missionList">
          {MISSIONS.map((m, i) => {
            const unlocked = c.isUnlocked(i);
            const stars = c.progress[m.id] ?? 0;
            return (
              <li key={m.id}>
                <button className="missionItem" disabled={!unlocked} onClick={() => c.openMission(i)}>
                  <span className="missionNum">{unlocked ? i + 1 : "🔒"}</span>
                  <span className="missionInfo">
                    <span className="missionTitle">{m.title}</span>
                    <span className="missionMeta">
                      <span className={`modeTag ${m.mode}`}>{m.mode === "plan" ? "Rencana" : "Real-time"}</span>
                      {m.from} → {m.to} · {formatClock(m.start)}
                    </span>
                  </span>
                  <Stars n={stars} />
                </button>
              </li>
            );
          })}
        </ol>
        <p className="fine">
          Game simulasi: jadwal, headway, dan koordinat halte adalah perkiraan, bukan data resmi Transjakarta.
          Selesaikan misi untuk membuka misi berikutnya.
        </p>
      </div>
    </div>
  );
}
