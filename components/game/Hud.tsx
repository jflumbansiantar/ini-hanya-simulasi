import { controller, SPEEDS } from "@/lib/game/controller";
import { missionIndex } from "@/lib/game/missions";
import { fareAt } from "@/lib/game/world";
import { formatClock, minutes, rupiah } from "./format";

export default function Hud() {
  const c = controller;
  const m = c.mission!;
  const s = c.session!;
  const left = m.deadline - s.now;
  const playing = c.phase === "playing";
  const inside = s.state.kind === "stop" ? s.state.inside : s.state.kind === "ride";
  return (
    <div className="hud">
      <div className="hudTop">
        <span className="hudMission">
          Misi {missionIndex(m.id) + 1} · {m.title}
        </span>
        <button className="iconBtn" onClick={() => c.backToMenu()} title="Keluar ke menu">
          ✕
        </button>
      </div>
      <div className="hudRow">
        <div className="hudClock">
          <div className="big">{formatClock(s.now)}</div>
          <div className="lbl">{c.phase === "planning" ? "jam berhenti saat menyusun" : "jam simulasi"}</div>
        </div>
        <div className={`hudStat${left < 10 ? " danger" : left < 20 ? " warn" : ""}`}>
          <div className="val">{formatClock(m.deadline)}</div>
          <div className="lbl">batas · sisa {minutes(left)}</div>
        </div>
        <div className="hudStat">
          <div className="val">{rupiah(s.balance)}</div>
          <div className="lbl">{inside ? "di dalam halte" : `tap berikutnya ${rupiah(fareAt(s.now))}`}</div>
        </div>
      </div>
      <div className="hudRoute">
        <span className="from">● {m.from}</span>
        <span className="arrow">→</span>
        <span className="to">⚑ {m.to}</span>
      </div>
      {playing && (
        <div className="hudControls">
          <button className="ctlBtn" onClick={() => c.togglePause()} title="Jeda (spasi)">
            {c.paused ? "▶" : "❚❚"}
          </button>
          {SPEEDS.map((v, i) => (
            <button
              key={v}
              className={`ctlBtn${!c.paused && c.speedIdx === i ? " active" : ""}`}
              onClick={() => c.setSpeed(i)}
              title={`${v} menit simulasi per detik`}
            >
              ×{v}
            </button>
          ))}
          <button className="ctlBtn wide" onClick={() => c.skipAhead()} title="Lompat ke kejadian berikutnya">
            ⏭ Lompat
          </button>
          <button
            className={`ctlBtn${c.follow ? " active" : ""}`}
            onClick={() => c.setFollow(!c.follow)}
            title="Kamera mengikuti kamu"
          >
            📍
          </button>
        </div>
      )}
    </div>
  );
}
