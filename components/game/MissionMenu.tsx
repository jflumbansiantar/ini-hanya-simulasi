import { controller } from "@/lib/game/controller";
import { CHAPTERS, MISSIONS, MISSIONS_PER_CHAPTER } from "@/lib/game/missions";
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
  const ch = c.menuChapter;
  const first = ch * MISSIONS_PER_CHAPTER;
  const missions = MISSIONS.slice(first, first + MISSIONS_PER_CHAPTER);
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

        <div className="chapterTabs" role="tablist">
          {CHAPTERS.map((chapter, i) => {
            const unlocked = c.isUnlocked(i * MISSIONS_PER_CHAPTER);
            const stars = MISSIONS.slice(i * MISSIONS_PER_CHAPTER, (i + 1) * MISSIONS_PER_CHAPTER).reduce(
              (s, m) => s + (c.progress[m.id] ?? 0),
              0
            );
            return (
              <button
                key={chapter.title}
                role="tab"
                aria-selected={i === ch}
                className={`chapterTab${i === ch ? " active" : ""}`}
                disabled={!unlocked}
                onClick={() => c.setMenuChapter(i)}
                title={chapter.title}
              >
                <span className="chapterNum">{unlocked ? i + 1 : "🔒"}</span>
                <span className="chapterStars">{stars}★</span>
              </button>
            );
          })}
        </div>
        <div className="chapterHead">
          <b>
            Bab {ch + 1}: {CHAPTERS[ch].title}
          </b>
          <span className="dim small">{CHAPTERS[ch].blurb}</span>
        </div>

        <ol className="missionList">
          {missions.map((m, k) => {
            const i = first + k;
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
