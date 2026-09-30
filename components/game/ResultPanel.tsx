import { useState } from "react";
import { controller } from "@/lib/game/controller";
import { MISSIONS, missionIndex } from "@/lib/game/missions";
import { formatClock, minutes, rupiah } from "./format";
import { Stars } from "./MissionMenu";
import { PlanSteps } from "./PlanPanel";

export default function ResultPanel() {
  const c = controller;
  const m = c.mission!;
  const s = c.session!;
  const r = c.result!;
  const best = c.solution;
  const [showBest, setShowBest] = useState(false);
  const hasNext = missionIndex(m.id) + 1 < MISSIONS.length;

  return (
    <div className="overlay soft">
      <div className="card resultCard">
        {r.success ? (
          <>
            <div className="eyebrow good">Sampai tujuan!</div>
            <h2>{m.title}</h2>
            <div className="bigStars">
              <Stars n={r.stars} />
            </div>
            <div className="briefGrid">
              <div>
                <span className="lbl">Tiba</span>
                <b>
                  {formatClock(r.arrivedAt!)} <span className="dim">(batas {formatClock(m.deadline)})</span>
                </b>
              </div>
              <div>
                <span className="lbl">Waktu tempuh</span>
                <b>{minutes(r.arrivedAt! - m.start)}</b>
              </div>
              {best && (
                <div>
                  <span className="lbl">Rute tercepat</span>
                  <b>{minutes(best.arrival - m.start)}</b>
                </div>
              )}
              <div>
                <span className="lbl">Ongkos</span>
                <b>
                  {rupiah(s.spent)} <span className="dim">({s.taps}× tap)</span>
                </b>
              </div>
            </div>
            {r.stars < 3 && <p className="dim small">3 bintang: tiba paling lambat ~10% (min. 3 menit) setelah rute tercepat.</p>}
          </>
        ) : (
          <>
            <div className="eyebrow bad">Misi gagal</div>
            <h2>{m.title}</h2>
            <p className="story">{r.reason}</p>
          </>
        )}

        {best && (
          <div className="bestRoute">
            {showBest || r.stars === 3 ? (
              <>
                <h4>Rute tercepat · tiba {formatClock(best.arrival)}</h4>
                <PlanSteps plan={best.legs} origin={m.from} session={null} />
              </>
            ) : (
              <button className="linkBtn" onClick={() => setShowBest(true)}>
                Lihat rute tercepat (spoiler)
              </button>
            )}
          </div>
        )}

        <div className="btnRow">
          <button className="btn ghost" onClick={() => c.backToMenu()}>
            Menu
          </button>
          <button
            className="btn ghost"
            onClick={() => c.rerollMission()}
            title={m.recipe ? "Main lagi dengan rintangan acak baru" : undefined}
          >
            {m.recipe ? "🎲 Ulangi" : "Ulangi"}
          </button>
          {r.success && hasNext && (
            <button className="btn primary" onClick={() => c.nextMission()}>
              Misi berikutnya →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
