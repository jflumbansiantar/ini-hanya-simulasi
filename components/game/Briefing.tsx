import { controller } from "@/lib/game/controller";
import { MISSIONS_PER_CHAPTER, missionIndex, type Mission } from "@/lib/game/missions";
import {
  CORRIDOR_BY_ID,
  DEMO_ZONES,
  FARE_EARLY,
  FARE_NORMAL,
  busCapacity,
  stopsInZone,
  type Hazard,
  type HazardKind,
  type World,
} from "@/lib/game/world";
import { formatClock, minutes, rupiah } from "./format";

export const HAZARD_ICON: Record<HazardKind, string> = {
  private: "🚗",
  redlight: "🚦",
  accident: "💥",
  jam: "🚧",
  procession: "⚰️",
};

function hazardText(h: Hazard): string {
  const name = CORRIDOR_BY_ID.get(h.corridor)!.name;
  const where = `${name} ${h.from}–${h.to}`;
  const when = h.start !== undefined && h.end !== undefined ? ` pukul ${formatClock(h.start)}–${formatClock(h.end)}` : "";
  const pct = `${Math.round((h.speed ?? 1) * 100)}%`;
  switch (h.kind) {
    case "private":
      return `Kendaraan pribadi masuk busway ${where}${when}: bus hanya melaju ${pct}.`;
    case "redlight":
      return `Lampu merah di ${where}: +${h.delay} mnt di setiap ruas.`;
    case "accident":
      return `Kecelakaan di ${where}${when}: busway ditutup, bus lewat lajur umum (${pct}) dan halte di antaranya tidak dilayani.`;
    case "jam":
      return `Macet imbas kecelakaan di ${where}${when}: bus hanya melaju ${pct}.`;
    case "procession":
      return `Rombongan jenazah masuk jalur TJ ${where}${when}: bus tertahan sampai rombongan keluar.`;
  }
}

type Item = { icon: string; text: string; active?: boolean; over?: boolean };

const windowState = (now: number | undefined, start: number, end: number) => ({
  active: now !== undefined && now >= start && now < end,
  over: now !== undefined && now >= end,
});

/**
 * Daftar rintangan misi. Kejadian mendadak (penumpang pingsan, rombongan
 * jenazah) disembunyikan sampai terjadi — sebelumnya hanya ada peringatan umum.
 */
export function ConditionList({ mission, now, world }: { mission: Mission; now?: number; world?: World | null }) {
  const cond = mission.conditions;
  const items: Item[] = [];
  let hiddenSurprise = false;
  for (const h of cond.hazards ?? []) {
    const windowed = h.start !== undefined && h.end !== undefined;
    if (h.surprise && (now === undefined || !windowed || now < h.start!)) {
      hiddenSurprise = true;
      continue;
    }
    items.push({ icon: HAZARD_ICON[h.kind], text: hazardText(h), ...(windowed ? windowState(now, h.start!, h.end!) : {}) });
  }
  for (const e of world?.surpriseEvents() ?? []) {
    if (e.kind !== "medical") continue;
    if (now === undefined || now < e.start) {
      hiddenSurprise = true;
      continue;
    }
    items.push({ icon: "🚑", text: e.text, ...windowState(now, e.start, e.end) });
  }
  if (!world && cond.medical?.length) hiddenSurprise = true;
  for (const d of cond.demos ?? []) {
    const zone = DEMO_ZONES[d.zone];
    const stops = stopsInZone(d.zone).filter((n) => world?.stopLines.has(n) ?? true);
    items.push({
      icon: "📢",
      text: `Tawuran/demo di sekitar ${zone.name} pukul ${formatClock(d.start)}–${formatClock(d.end)}: halte ${stops.join(", ")} ditutup.`,
      ...windowState(now, d.start, d.end),
    });
  }
  for (const s of cond.closedStops ?? []) items.push({ icon: "⛔", text: `Halte ${s} ditutup — bus lewat tanpa berhenti.` });
  for (const [stop, n] of Object.entries(cond.queues ?? {})) {
    items.push({ icon: "👥", text: `Antrean panjang di halte ${stop}: ${n} orang di depanmu.` });
  }
  for (const [id, f] of Object.entries(cond.slowCorridors ?? {})) {
    items.push({ icon: "🚦", text: `${CORRIDOR_BY_ID.get(id)!.name} macet: kecepatan ${Math.round(f * 100)}%.` });
  }
  for (const [id, p] of Object.entries(cond.crowdedCorridors ?? {})) {
    const c = CORRIDOR_BY_ID.get(id)!;
    items.push({
      icon: "🧍",
      text: `${c.name} padat (kapasitas ${busCapacity(c)} orang/bus): ~${Math.round(p * 100)}% bus tiba sudah penuh.`,
    });
  }
  if (hiddenSurprise) {
    items.push({ icon: "⚠️", text: "Waspada: kejadian mendadak bisa terjadi selama perjalanan." });
  }
  if (!items.length) return null;
  return (
    <ul className="conditions">
      {items.map((it) => (
        <li key={it.text} className={it.active ? "active" : it.over ? "over" : ""}>
          <span>{it.icon}</span> {it.text}
          {it.active && <b className="liveTag">SEKARANG</b>}
          {it.over && <span className="dim"> (sudah selesai)</span>}
        </li>
      ))}
    </ul>
  );
}

export default function Briefing() {
  const c = controller;
  const m = c.mission!;
  const idx = missionIndex(m.id);
  return (
    <div className="overlay">
      <div className="card briefCard">
        <div className="eyebrow">
          Bab {Math.floor(idx / MISSIONS_PER_CHAPTER) + 1} · Misi {idx + 1} ·{" "}<span className={`modeTag ${m.mode}`}>{m.mode === "plan" ? "Mode rencana" : "Mode real-time"}</span>
        </div>
        <h2>{m.title}</h2>
        <p className="story">{m.story}</p>
        <div className="briefGrid">
          <div>
            <span className="lbl">Dari</span>
            <b className="from">{m.from}</b>
          </div>
          <div>
            <span className="lbl">Ke</span>
            <b className="to">{m.to}</b>
          </div>
          <div>
            <span className="lbl">Berangkat</span>
            <b>{formatClock(m.start)}</b>
          </div>
          <div>
            <span className="lbl">Tiba sebelum</span>
            <b>
              {formatClock(m.deadline)} <span className="dim">({minutes(m.deadline - m.start)})</span>
            </b>
          </div>
          <div>
            <span className="lbl">Saldo kartu</span>
            <b>{rupiah(m.balance)}</b>
          </div>
          <div>
            <span className="lbl">Koridor tersedia</span>
            <b>{m.conditions.corridors.map((id) => CORRIDOR_BY_ID.get(id)!.name.replace("Koridor ", "K")).join(", ")}</b>
          </div>
        </div>
        <ConditionList mission={m} world={c.world} />
        {m.recipe && (
          <div className="rerollRow">
            <span className="dim small">
              🎲 {c.randomized ? "Rintangan diacak" : "Rintangan versi tetap"} — berubah setiap kali misi dimainkan, tingkat
              kesulitan sama.
            </span>
            <button className="linkBtn" onClick={() => c.rerollMission()}>
              acak ulang
            </button>
          </div>
        )}
        <div className="howto">
          {m.mode === "plan" ? (
            <>
              <b>Cara main:</b> jam berhenti selama kamu menyusun rencana. Pilih bus dan halte turun untuk setiap langkah
              (bisa juga klik halte di peta). Setelah rencana sampai tujuan, tekan <i>Jalankan</i>.
            </>
          ) : (
            <>
              <b>Cara main:</b> jam berjalan terus. Di halte, pilih bus yang mau ditunggu. Di dalam bus, pilih halte turun
              (klik daftar atau halte di peta). Transfer di halte yang sama gratis, keluar halte berarti tap lagi.
            </>
          )}{" "}
          Tarif {rupiah(FARE_NORMAL)} per tap ({rupiah(FARE_EARLY)} pukul 05.00–07.00). Bintang dihitung dari selisih waktumu
          dengan rute tercepat.
        </div>
        {m.tips && <p className="tips">💡 {m.tips}</p>}
        <div className="btnRow">
          <button className="btn ghost" onClick={() => c.backToMenu()}>
            Kembali
          </button>
          <button className="btn primary" onClick={() => c.startMission()}>
            Mulai misi
          </button>
        </div>
      </div>
    </div>
  );
}
