import { controller } from "@/lib/game/controller";
import type { PlanLeg, Session } from "@/lib/game/session";
import { LINES, lineLabel } from "@/lib/game/world";
import { ConditionList } from "./Briefing";
import { formatClock, minutes, rupiah } from "./format";

function legLabel(leg: PlanLeg, from: string) {
  if (leg.type === "walk") return { color: "#cfd3dc", title: "🚶 Jalan kaki", route: `${from} → ${leg.to}` };
  const line = LINES.get(leg.lineKey)!;
  return { color: line.corridor.color, title: lineLabel(line), route: `${from} → ${leg.alight}` };
}

/** Daftar langkah rencana; `session` (pratinjau / sesi berjalan) memberi jam tiap langkah. */
export function PlanSteps({ plan, origin, session, current }: { plan: PlanLeg[]; origin: string; session: Session | null; current?: number }) {
  const starts = plan.map((_, i) => {
    const prev = plan[i - 1];
    return !prev ? origin : prev.type === "ride" ? prev.alight : prev.to;
  });
  return (
    <ol className="steps">
      {plan.map((leg, i) => {
        const l = legLabel(leg, starts[i]);
        const trip = session?.trips[i];
        const state = current === undefined ? "" : i < current ? " done" : i === current ? " now" : "";
        return (
          <li key={i} className={`step${state}`}>
            <span className="swatch" style={{ background: l.color }} />
            <div>
              <div className="stepTitle">{l.title}</div>
              <div className="stepRoute">{l.route}</div>
              {trip && (
                <div className="stepTime">
                  {formatClock(trip.startT)} – {formatClock(trip.endT)}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function PlanPanel() {
  const c = controller;
  const m = c.mission!;
  const w = c.world!;
  const end = c.draftEnd();
  const done = c.draftReachesGoal();
  const preview = c.preview;
  const lines = (w.stopLines.get(end) ?? []).filter(({ line, idx }) => idx < line.stops.length - 1);
  const selected = c.draftLine ? LINES.get(c.draftLine)! : null;
  const selIdx = selected?.stopIndex.get(end) ?? -1;

  return (
    <aside className="panel">
      <h3>Susun rencana</h3>
      <ConditionList mission={m} />
      {c.draft.length > 0 ? (
        <PlanSteps plan={c.draft} origin={m.from} session={preview} />
      ) : (
        <p className="dim small">Belum ada langkah. Mulai dari halte {m.from}.</p>
      )}

      {!done && (
        <div className="builder">
          <div className="builderHead">
            Dari <b>{end}</b>:
          </div>
          {w.isClosed(end) ? (
            <p className="bad small">Halte ini ditutup — hanya bisa jalan kaki ke halte lain.</p>
          ) : !selected ? (
            <>
              <div className="dim small">Naik bus:</div>
              <div className="optionList">
                {lines.map(({ line }) => (
                  <button key={line.key} className="option" onClick={() => c.selectDraftLine(line.key)}>
                    <span className="swatch" style={{ background: line.corridor.color }} />
                    {lineLabel(line)}
                  </button>
                ))}
                {!lines.length && <span className="dim small">Tidak ada bus dari halte ini.</span>}
              </div>
            </>
          ) : (
            <>
              <div className="selLine">
                <span className="swatch" style={{ background: selected.corridor.color }} />
                {lineLabel(selected)}
                <button className="linkBtn" onClick={() => c.selectDraftLine(null)}>
                  ganti
                </button>
              </div>
              <div className="dim small">Turun di (atau klik halte di peta):</div>
              <div className="optionList">
                {selected.stops.slice(selIdx + 1).map((s) => (
                  <button
                    key={s.n}
                    className={`option${s.n === m.to ? " goal" : ""}`}
                    disabled={w.isClosed(s.n)}
                    onClick={() => c.addDraftLeg({ type: "ride", lineKey: selected.key, alight: s.n })}
                  >
                    {s.n}
                    {w.isClosed(s.n) && " ⛔"}
                    {s.n === m.to && " ⚑"}
                  </button>
                ))}
              </div>
            </>
          )}
          {!selected && (w.walkLinks.get(end)?.length ?? 0) > 0 && (
            <>
              <div className="dim small">Atau jalan kaki (keluar halte, nanti tap lagi):</div>
              <div className="optionList">
                {w.walkLinks.get(end)!.map((l) => (
                  <button key={l.to} className="option" onClick={() => c.addDraftLeg({ type: "walk", to: l.to })}>
                    🚶 {l.to} · {Math.round(l.km * 1000)} m · ~{minutes(l.minutes)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {preview && done && (
        <div className={`previewBox${preview.state.kind === "done" ? " ok" : " fail"}`}>
          {preview.state.kind === "done" ? (
            <>
              Perkiraan tiba <b>{formatClock(preview.state.arrivedAt)}</b> · {minutes(preview.state.arrivedAt - m.start)} ·{" "}
              {rupiah(preview.spent)}
            </>
          ) : (
            preview.state.kind === "failed" && preview.state.reason
          )}
        </div>
      )}

      <div className="btnRow">
        <button className="btn ghost" disabled={!c.draft.length} onClick={() => c.undoDraft()}>
          ↶ Batal
        </button>
        <button className="btn ghost" disabled={!c.draft.length} onClick={() => c.clearDraft()}>
          Reset
        </button>
        <button className="btn primary" disabled={!done} onClick={() => c.runPlan()}>
          ▶ Jalankan
        </button>
      </div>
    </aside>
  );
}
