import { controller } from "@/lib/game/controller";
import type { Session } from "@/lib/game/session";
import { LINES, lineLabel, type Line } from "@/lib/game/world";
import { ConditionList } from "./Briefing";
import { formatClock, minutes } from "./format";
import { PlanSteps } from "./PlanPanel";

function EventLog({ session }: { session: Session }) {
  const items = session.log.slice(-6).reverse();
  return (
    <ul className="log">
      {items.map((e, i) => (
        <li key={session.log.length - i} className={e.tone}>
          <span className="t">{formatClock(e.t)}</span> {e.text}
        </li>
      ))}
    </ul>
  );
}

/** Daftar halte di depan pada `line`, klik untuk jadikan halte turun. */
function AlightPicker({ line, afterIdx, slot, target }: { line: Line; afterIdx: number; slot: number | null; target: number | null }) {
  const c = controller;
  const w = c.world!;
  const m = c.mission!;
  return (
    <div className="optionList stops">
      {line.stops.slice(afterIdx + 1).map((s, k) => {
        const idx = afterIdx + 1 + k;
        const closed = w.isClosed(s.n);
        return (
          <button
            key={s.n}
            className={`option${idx === target ? " selected" : ""}${s.n === m.to ? " goal" : ""}`}
            disabled={closed}
            onClick={() => c.act((ss) => ss.setAlight(s.n))}
          >
            <span>
              {s.n}
              {closed && " ⛔"}
              {s.n === m.to && " ⚑"}
            </span>
            {slot !== null && <span className="eta">{formatClock(w.arrivalTime(line, slot, idx))}</span>}
          </button>
        );
      })}
    </div>
  );
}

function LiveControls({ session }: { session: Session }) {
  const c = controller;
  const w = c.world!;
  const st = session.state;

  if (st.kind === "walk") {
    return (
      <div className="status">
        🚶 Berjalan ke <b>{st.to}</b>, tiba {formatClock(st.endT)}.
      </div>
    );
  }

  if (st.kind === "ride") {
    const line = LINES.get(st.lineKey)!;
    const passed = w.passedIndex(line, st.slot, session.now);
    const next = line.stops[passed + 1];
    return (
      <>
        <div className="status">
          <span className="swatch" style={{ background: line.corridor.color }} /> Di dalam <b>{lineLabel(line)}</b>
          <div className="dim small">
            Turun di <b>{line.stops[st.alightIdx].n}</b> ({formatClock(w.arrivalTime(line, st.slot, st.alightIdx))})
            {next && <> · halte berikutnya {next.n}</>}
          </div>
        </div>
        <div className="dim small">Ganti halte turun:</div>
        <AlightPicker line={line} afterIdx={passed} slot={st.slot} target={st.alightIdx} />
      </>
    );
  }

  if (st.kind !== "stop") return null;

  if (st.waitFor) {
    const line = LINES.get(st.waitFor.lineKey)!;
    const idx = line.stopIndex.get(st.stop)!;
    const a = w.nextArrival(line, idx, session.now);
    const target = st.waitFor.alight !== null ? line.stopIndex.get(st.waitFor.alight)! : null;
    return (
      <>
        <div className="status">
          <span className="swatch" style={{ background: line.corridor.color }} /> Menunggu <b>{lineLabel(line)}</b> di {st.stop}
          <div className="dim small">
            {a ? <>Bus berikutnya tiba {formatClock(a.time)} (~{minutes(a.time - session.now)})</> : "Tidak ada bus lagi."}
          </div>
          <button className="linkBtn" onClick={() => c.act((s) => {
              s.cancelWait();
              return null;
            })}>
            batal menunggu
          </button>
        </div>
        <div className="dim small">{target === null ? "Pilih halte turun (bisa nanti di dalam bus):" : "Halte turun:"}</div>
        <AlightPicker line={line} afterIdx={idx} slot={null} target={target} />
      </>
    );
  }

  const options = (w.stopLines.get(st.stop) ?? []).filter(({ line, idx }) => idx < line.stops.length - 1);
  const closed = w.isClosed(st.stop);
  return (
    <>
      <div className="status">
        📍 Di halte <b>{st.stop}</b>{" "}
        <span className="dim small">({st.inside ? "di dalam halte, transfer gratis" : "belum tap masuk"})</span>
      </div>
      {closed ? (
        <p className="bad small">Halte ini ditutup, bus tidak berhenti. Jalan kaki ke halte lain.</p>
      ) : (
        <>
          <div className="dim small">Tunggu bus:</div>
          <div className="optionList">
            {options.map(({ line, idx }) => {
              const a = w.nextArrival(line, idx, session.now);
              const crowded = w.crowdChance(line.corridor.id) > 0;
              return (
                <button key={line.key} className="option" onClick={() => c.act((s) => s.waitFor(line.key, null))}>
                  <span>
                    <span className="swatch" style={{ background: line.corridor.color }} />
                    {lineLabel(line)}
                    {crowded && " 👥"}
                  </span>
                  <span className="eta">{a ? `${Math.max(0, Math.round(a.time - session.now))} mnt` : "habis"}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {(w.walkLinks.get(st.stop)?.length ?? 0) > 0 && (
        <>
          <div className="dim small">Jalan kaki (keluar halte, nanti tap lagi):</div>
          <div className="optionList">
            {w.walkLinks.get(st.stop)!.map((l) => (
              <button key={l.to} className="option" onClick={() => c.act((s) => s.walkTo(l.to))}>
                <span>🚶 {l.to}</span>
                <span className="eta">
                  {Math.round(l.km * 1000)} m · {minutes(l.minutes)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function LivePanel() {
  const c = controller;
  const s = c.session!;
  const m = c.mission!;
  return (
    <aside className="panel">
      <ConditionList mission={m} />
      {m.mode === "plan" && s.plan ? (
        <>
          <h3>Rencana berjalan</h3>
          <PlanSteps plan={s.plan} origin={m.from} session={s} current={s.planIndex - 1} />
        </>
      ) : (
        <LiveControls session={s} />
      )}
      <h4>Catatan perjalanan</h4>
      <EventLog session={s} />
    </aside>
  );
}
