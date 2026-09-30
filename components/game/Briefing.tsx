import { controller } from "@/lib/game/controller";
import { MISSIONS, type Mission } from "@/lib/game/missions";
import { CORRIDOR_BY_ID, FARE_EARLY, FARE_NORMAL } from "@/lib/game/world";
import { formatClock, minutes, rupiah } from "./format";

export function ConditionList({ mission }: { mission: Mission }) {
  const cond = mission.conditions;
  const items: { icon: string; text: string }[] = [];
  for (const s of cond.closedStops ?? []) items.push({ icon: "⛔", text: `Halte ${s} ditutup — bus lewat tanpa berhenti.` });
  for (const [id, f] of Object.entries(cond.slowCorridors ?? {})) {
    items.push({ icon: "🚦", text: `${CORRIDOR_BY_ID.get(id)!.name} macet: kecepatan ${Math.round(f * 100)}%.` });
  }
  for (const [id, p] of Object.entries(cond.crowdedCorridors ?? {})) {
    items.push({ icon: "👥", text: `${CORRIDOR_BY_ID.get(id)!.name} padat: ~${Math.round(p * 100)}% bus tiba dalam keadaan penuh.` });
  }
  if (!items.length) return null;
  return (
    <ul className="conditions">
      {items.map((it) => (
        <li key={it.text}>
          <span>{it.icon}</span> {it.text}
        </li>
      ))}
    </ul>
  );
}

export default function Briefing() {
  const c = controller;
  const m = c.mission!;
  const idx = MISSIONS.indexOf(m);
  return (
    <div className="overlay">
      <div className="card briefCard">
        <div className="eyebrow">
          Misi {idx + 1} · <span className={`modeTag ${m.mode}`}>{m.mode === "plan" ? "Mode rencana" : "Mode real-time"}</span>
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
        <ConditionList mission={m} />
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
