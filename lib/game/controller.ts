import { MISSIONS, type Mission } from "./missions";
import { loadProgress, saveProgress, type Progress } from "./progress";
import { Session, simulatePlan, type PlanLeg } from "./session";
import { solve, starsFor, type Solution } from "./solver";
import { LINES, STOP_COORDS, World, type Line } from "./world";

/**
 * Penghubung antara Phaser (peta, digambar tiap frame) dan React (panel UI).
 * Phaser memanggil `tick()` setiap frame; React berlangganan lewat
 * `subscribe()` / `getSnapshot()` (useSyncExternalStore). Snapshot hanya
 * berupa nomor versi — komponen membaca state langsung dari controller.
 */

export type Phase = "menu" | "briefing" | "planning" | "playing" | "result";

export const SPEEDS = [1, 4, 15, 40] as const; // menit simulasi per detik nyata

export interface MapPath {
  points: { lat: number; lng: number }[];
  color: string;
  dashed?: boolean;
}

export interface CameraRequest {
  seq: number;
  points: { lat: number; lng: number }[];
}

export interface Result {
  success: boolean;
  stars: number;
  reason?: string;
  arrivedAt?: number;
}

export class GameController {
  phase: Phase = "menu";
  mission: Mission | null = null;
  world: World | null = null;
  session: Session | null = null;
  solution: Solution | null = null;
  result: Result | null = null;
  progress: Progress = {};

  // mode rencana
  draft: PlanLeg[] = [];
  draftLine: string | null = null; // koridor yang sedang dipilih, menunggu halte turun
  preview: Session | null = null;

  speedIdx = 1;
  paused = false;
  follow = true;
  camera: CameraRequest = { seq: 0, points: [] };
  message: { text: string; seq: number } | null = null;

  private version = 0;
  private listeners = new Set<() => void>();
  private lastEmit = 0;
  private lastSessionVersion = -1;

  init() {
    this.progress = loadProgress();
    this.focus(MISSIONS.flatMap((m) => [STOP_COORDS.get(m.from)!, STOP_COORDS.get(m.to)!]));
    this.emit();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.version;

  private emit() {
    this.version++;
    this.lastEmit = performance.now();
    for (const fn of this.listeners) fn();
  }

  toast(text: string) {
    this.message = { text, seq: (this.message?.seq ?? 0) + 1 };
    this.emit();
  }

  focus(points: { lat: number; lng: number }[]) {
    this.camera = { seq: this.camera.seq + 1, points };
  }

  isUnlocked(i: number): boolean {
    return i === 0 || (this.progress[MISSIONS[i - 1].id] ?? 0) > 0;
  }

  // ---------- alur layar ----------

  openMission(i: number) {
    const m = MISSIONS[i];
    this.mission = m;
    this.world = new World(m.conditions);
    this.session = new Session(m);
    this.solution = solve(m, this.world);
    this.result = null;
    this.draft = [];
    this.draftLine = null;
    this.preview = null;
    this.paused = false;
    this.phase = "briefing";
    this.focus([STOP_COORDS.get(m.from)!, STOP_COORDS.get(m.to)!]);
    this.emit();
  }

  startMission() {
    const m = this.mission!;
    this.session = new Session(m);
    this.lastSessionVersion = -1;
    this.result = null;
    if (m.mode === "plan") {
      this.phase = "planning";
      this.updatePreview();
    } else {
      this.phase = "playing";
      this.speedIdx = 1;
      this.follow = true;
    }
    this.paused = false;
    this.emit();
  }

  backToMenu() {
    this.phase = "menu";
    this.mission = null;
    this.world = null;
    this.session = null;
    this.preview = null;
    this.emit();
  }

  nextMission() {
    const i = MISSIONS.findIndex((m) => m.id === this.mission?.id);
    if (i >= 0 && i + 1 < MISSIONS.length) this.openMission(i + 1);
    else this.backToMenu();
  }

  // ---------- mode rencana ----------

  /** Halte posisi terakhir dari rencana yang sedang disusun. */
  draftEnd(): string {
    const last = this.draft[this.draft.length - 1];
    if (!last) return this.mission!.from;
    return last.type === "ride" ? last.alight : last.to;
  }

  draftReachesGoal(): boolean {
    return this.draft.length > 0 && this.draftEnd() === this.mission!.to;
  }

  selectDraftLine(lineKey: string | null) {
    this.draftLine = lineKey;
    this.emit();
  }

  addDraftLeg(leg: PlanLeg) {
    if (this.draftReachesGoal()) return;
    this.draft = [...this.draft, leg];
    this.draftLine = null;
    this.updatePreview();
    this.emit();
  }

  undoDraft() {
    this.draft = this.draft.slice(0, -1);
    this.draftLine = null;
    this.updatePreview();
    this.emit();
  }

  clearDraft() {
    this.draft = [];
    this.draftLine = null;
    this.updatePreview();
    this.emit();
  }

  private updatePreview() {
    this.preview = this.draft.length ? simulatePlan(this.mission!, this.draft) : null;
  }

  runPlan() {
    if (!this.draftReachesGoal()) return;
    this.session = new Session(this.mission!);
    this.session.setPlan(this.draft);
    this.phase = "playing";
    this.speedIdx = 1;
    this.follow = true;
    this.emit();
  }

  // ---------- mode real-time ----------

  act(fn: (s: Session) => string | null) {
    if (!this.session || this.phase !== "playing") return;
    const err = fn(this.session);
    if (err) this.toast(err);
    this.emit();
  }

  setSpeed(i: number) {
    this.speedIdx = i;
    this.paused = false;
    this.emit();
  }

  togglePause() {
    this.paused = !this.paused;
    this.emit();
  }

  setFollow(v: boolean) {
    if (this.follow === v) return;
    this.follow = v;
    this.emit();
  }

  /** Lompat ke kejadian berikutnya (bus tiba / sampai halte). */
  skipAhead() {
    const s = this.session;
    if (!s || this.phase !== "playing") return;
    const te = s.nextEventTime();
    if (te === null) {
      this.toast(s.state.kind === "stop" ? "Pilih dulu bus yang mau ditunggu." : "Tidak ada kejadian berikutnya.");
      return;
    }
    s.advanceTo(te);
    this.afterAdvance(true);
  }

  /** Klik halte di peta. */
  clickStop(name: string) {
    if (this.phase === "planning" && this.draftLine) {
      const line = LINES.get(this.draftLine)!;
      const from = line.stopIndex.get(this.draftEnd())!;
      const idx = line.stopIndex.get(name);
      if (idx === undefined || idx <= from) {
        this.toast(`${name} tidak ada di depan pada arah ini.`);
        return;
      }
      if (this.world!.isClosed(name)) {
        this.toast(`Halte ${name} ditutup.`);
        return;
      }
      this.addDraftLeg({ type: "ride", lineKey: this.draftLine, alight: name });
      return;
    }
    if (this.phase === "playing" && this.mission?.mode === "live" && this.session) {
      const st = this.session.state;
      if (st.kind === "ride" || (st.kind === "stop" && st.waitFor)) {
        this.act((s) => s.setAlight(name));
      }
    }
  }

  // ---------- loop ----------

  tick(dtMs: number) {
    const s = this.session;
    if (this.phase === "playing" && s && !this.paused && !s.finished) {
      const dt = Math.min(dtMs, 100) / 1000;
      s.advanceTo(s.now + dt * SPEEDS[this.speedIdx]);
      this.afterAdvance(false);
    } else if (performance.now() - this.lastEmit > 500) {
      this.emit();
    }
  }

  private afterAdvance(force: boolean) {
    const s = this.session!;
    if (s.finished) {
      this.finish();
      return;
    }
    const changed = s.version !== this.lastSessionVersion;
    this.lastSessionVersion = s.version;
    if (force || changed || performance.now() - this.lastEmit > 120) this.emit();
  }

  private finish() {
    const s = this.session!;
    const m = this.mission!;
    if (s.state.kind === "done") {
      const stars = this.solution ? starsFor(m, s.state.arrivedAt, this.solution.arrival) : 1;
      this.result = { success: true, stars, arrivedAt: s.state.arrivedAt };
      if (stars > (this.progress[m.id] ?? 0)) {
        this.progress = { ...this.progress, [m.id]: stars };
        saveProgress(this.progress);
      }
    } else {
      this.result = { success: false, stars: 0, reason: s.state.kind === "failed" ? s.state.reason : "" };
    }
    this.phase = "result";
    this.emit();
  }

  // ---------- data untuk peta ----------

  /** Garis sorotan: rencana, perjalanan yang sedang berjalan, atau hasil. */
  highlightPaths(): MapPath[] {
    if (!this.mission) return [];
    if (this.phase === "planning") return legsToPaths(this.mission.from, this.draft);
    const s = this.session;
    if (!s) return [];
    const done = s.trips.map((t) =>
      t.type === "ride" && t.lineKey ? ridePath(LINES.get(t.lineKey)!, t.from, t.to) : walkPath(t.from, t.to)
    );
    if (this.phase === "result") return done;
    const st = s.state;
    if (st.kind === "stop" && st.waitFor) {
      const line = LINES.get(st.waitFor.lineKey)!;
      const to = st.waitFor.alight ?? line.stops[line.stops.length - 1].n;
      done.push({ ...ridePath(line, st.stop, to), dashed: true });
    } else if (st.kind === "ride") {
      const line = LINES.get(st.lineKey)!;
      done.push(ridePath(line, line.stops[st.boardIdx].n, line.stops[st.alightIdx].n));
    } else if (st.kind === "walk") {
      done.push(walkPath(st.from, st.to));
    }
    if (this.mission.mode === "plan" && s.plan) {
      const at = s.planIndex;
      const rest = s.plan.slice(at);
      if (rest.length) {
        done.push(...legsToPaths(planStart(this.mission.from, s.plan, at), rest).map((p) => ({ ...p, dashed: true })));
      }
    }
    return done;
  }
}

function ridePath(line: Line, from: string, to: string): MapPath {
  const a = line.stopIndex.get(from)!;
  const b = line.stopIndex.get(to)!;
  const br = line.dirMeta.breaks;
  return { points: line.dirMeta.points.slice(br[a], br[b] + 1), color: line.corridor.color };
}

function walkPath(from: string, to: string): MapPath {
  return { points: [STOP_COORDS.get(from)!, STOP_COORDS.get(to)!], color: "#e8e9ee", dashed: true };
}

function planStart(origin: string, plan: PlanLeg[], idx: number): string {
  const prev = plan[idx - 1];
  if (!prev) return origin;
  return prev.type === "ride" ? prev.alight : prev.to;
}

function legsToPaths(origin: string, legs: PlanLeg[]): MapPath[] {
  const out: MapPath[] = [];
  let at = origin;
  for (const leg of legs) {
    if (leg.type === "ride") {
      out.push(ridePath(LINES.get(leg.lineKey)!, at, leg.alight));
      at = leg.alight;
    } else {
      out.push(walkPath(at, leg.to));
      at = leg.to;
    }
  }
  return out;
}

export const controller = new GameController();
