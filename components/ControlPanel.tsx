import { CORRIDORS } from "@/lib/corridors";
import { CORRIDOR_META } from "@/lib/corridorMeta";
import { SPEED_OPTIONS } from "@/lib/useSimulationClock";
import { formatClock } from "@/lib/simulation";

interface ControlPanelProps {
  simMinutes: number;
  speedIndex: number;
  onSpeedChange: (index: number) => void;
  busCount: number;
  corridorsOperating: number;
  visibility: Record<string, boolean>;
  onToggleCorridor: (id: string, visible: boolean) => void;
  onSetAll: (visible: boolean) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const CLUTTER_THRESHOLD = 70;

const TRUNK_CORRIDORS = CORRIDORS.filter((c) => !c.parentId);
const SUB_CORRIDORS_BY_PARENT = new Map<string, typeof CORRIDORS>();
for (const c of CORRIDORS) {
  if (!c.parentId) continue;
  const list = SUB_CORRIDORS_BY_PARENT.get(c.parentId) ?? [];
  list.push(c);
  SUB_CORRIDORS_BY_PARENT.set(c.parentId, list);
}

export default function ControlPanel({
  simMinutes,
  speedIndex,
  onSpeedChange,
  busCount,
  corridorsOperating,
  visibility,
  onToggleCorridor,
  onSetAll,
  collapsed,
  onToggleCollapsed,
}: ControlPanelProps) {
  return (
    <div className={`panel${collapsed ? " collapsed" : ""}`}>
      <div className="panelHandle" onClick={onToggleCollapsed}>
        <div className="bar" />
      </div>
      <div className="panelHeader">
        <h1>Transjakarta Line Simulator</h1>
        <div className="route">Simulasi {TRUNK_CORRIDORS.length} koridor trunk BRT · jam terkompresi</div>
        <div className="clockRow">
          <div className="clock">{formatClock(simMinutes)}</div>
          <div className="clocklabel">jam simulasi</div>
        </div>
        <div className="speedRow">
          {SPEED_OPTIONS.map((v, i) => (
            <button
              key={v}
              className={`speedBtn${i === speedIndex ? " active" : ""}`}
              onClick={() => onSpeedChange(i)}
            >
              {v}x
            </button>
          ))}
        </div>
        <div className="statsRow">
          <div className="statBox">
            <div className="num">{busCount}</div>
            <div className="lbl">Bus aktif</div>
          </div>
          <div className="statBox">
            <div className="num">{corridorsOperating}</div>
            <div className="lbl">Koridor jalan</div>
          </div>
        </div>
        {busCount > CLUTTER_THRESHOLD && (
          <div className="clutterHint">
            Banyak bus aktif — zoom in atau kurangi koridor untuk tampilan yang lebih jelas.
          </div>
        )}
      </div>
      <div className="corridorToolbar">
        <span>{TRUNK_CORRIDORS.length} Koridor</span>
        <div className="toolbarBtns">
          <button className="miniBtn" onClick={() => onSetAll(true)}>
            Semua
          </button>
          <button className="miniBtn" onClick={() => onSetAll(false)}>
            Nihil
          </button>
        </div>
      </div>
      <div className="corridorList">
        {TRUNK_CORRIDORS.map((c) => {
          const meta = CORRIDOR_META[c.id];
          const subCorridors = SUB_CORRIDORS_BY_PARENT.get(c.id) ?? [];
          return (
            <div key={c.id}>
              <label className="corridorRow">
                <input
                  type="checkbox"
                  checked={visibility[c.id] ?? false}
                  onChange={(e) => onToggleCorridor(c.id, e.target.checked)}
                />
                <div className="swatch" style={{ background: c.color }} />
                <div className="corridorInfo">
                  <div className="name">
                    {c.name} · {c.route}
                  </div>
                  <div className="meta">
                    {meta.totalKm.toFixed(1)} km · ~{Math.round(meta.durationMin)} menit · headway{" "}
                    {c.headway} mnt
                  </div>
                </div>
              </label>
              {subCorridors.map((sc) => {
                const scMeta = CORRIDOR_META[sc.id];
                return (
                  <label className="corridorRow sub" key={sc.id}>
                    <input
                      type="checkbox"
                      checked={visibility[sc.id] ?? false}
                      onChange={(e) => onToggleCorridor(sc.id, e.target.checked)}
                    />
                    <div className="swatch" style={{ background: sc.color }} />
                    <div className="corridorInfo">
                      <div className="name">
                        {sc.name} · {sc.route}
                      </div>
                      <div className="meta">
                        {scMeta.totalKm.toFixed(1)} km · ~{Math.round(scMeta.durationMin)} menit ·
                        headway {sc.headway} mnt
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="panelFooter">
        Posisi bus dihitung dari jadwal simulasi (headway &amp; kecepatan rata-rata asumsi),{" "}
        <b>bukan</b> data GPS langsung. Koordinat halte adalah perkiraan.
      </div>
    </div>
  );
}
