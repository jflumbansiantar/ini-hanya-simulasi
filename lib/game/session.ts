import { formatClock } from "../simulation";
import { LINES, STOP_COORDS, World, fareAt, lineLabel, type Line } from "./world";
import type { Mission } from "./missions";

/**
 * Mesin permainan: state pemain + jam simulasi. Deterministik — dengan misi
 * dan urutan perintah yang sama, hasilnya selalu sama. Mode rencana dan mode
 * real-time memakai mesin yang sama; bedanya mode rencana memberi semua
 * perintah di depan (`plan`), mode real-time memberi perintah satu per satu.
 */

export type PlanLeg =
  | { type: "ride"; lineKey: string; alight: string }
  | { type: "walk"; to: string };

export type PlayerState =
  | { kind: "stop"; stop: string; inside: boolean; waitFor: { lineKey: string; alight: string | null } | null }
  | { kind: "ride"; lineKey: string; slot: number; boardIdx: number; alightIdx: number }
  | { kind: "walk"; from: string; to: string; startT: number; endT: number }
  | { kind: "done"; arrivedAt: number }
  | { kind: "failed"; reason: string };

export interface LogEntry {
  t: number;
  text: string;
  tone: "info" | "good" | "warn" | "bad";
}

export interface TripRecord {
  type: "ride" | "walk";
  label: string;
  color: string;
  from: string;
  to: string;
  startT: number;
  endT: number;
  lineKey?: string;
}

export class Session {
  readonly world: World;
  now: number;
  balance: number;
  spent = 0;
  taps = 0;
  state: PlayerState;
  log: LogEntry[] = [];
  trips: TripRecord[] = [];
  plan: PlanLeg[] | null = null;
  private planIdx = 0;
  private rideStartT = 0;
  version = 0; // naik setiap state berubah, untuk re-render UI

  constructor(readonly mission: Mission) {
    this.world = new World(mission.conditions);
    this.now = mission.start;
    this.balance = mission.balance;
    this.state = { kind: "stop", stop: mission.from, inside: false, waitFor: null };
  }

  get finished(): boolean {
    return this.state.kind === "done" || this.state.kind === "failed";
  }

  private note(text: string, tone: LogEntry["tone"] = "info") {
    this.log.push({ t: this.now, text, tone });
    this.version++;
  }

  private fail(reason: string) {
    this.state = { kind: "failed", reason };
    this.note(reason, "bad");
  }

  // ---------- perintah pemain ----------

  /** Tunggu bus `lineKey` di halte ini; `alight` = halte turun (null = putuskan nanti). */
  waitFor(lineKey: string, alight: string | null): string | null {
    const s = this.state;
    if (s.kind !== "stop") return "Kamu tidak sedang di halte.";
    const line = LINES.get(lineKey);
    if (!line || !this.world.lines.includes(line)) return "Koridor ini tidak tersedia.";
    const idx = line.stopIndex.get(s.stop);
    if (idx === undefined) return `${line.corridor.name} tidak lewat halte ${s.stop}.`;
    if (idx === line.stops.length - 1) return `${s.stop} adalah halte terakhir arah ini.`;
    if (this.world.isClosed(s.stop)) return `Halte ${s.stop} ditutup, bus tidak berhenti di sini.`;
    if (alight !== null) {
      const err = this.checkAlight(line, idx, alight);
      if (err) return err;
    } else if (this.lastOpenIdx(line, idx) < 0) {
      return "Semua halte di depan pada arah ini ditutup.";
    }
    s.waitFor = { lineKey, alight };
    this.note(`Menunggu ${lineLabel(line)} di ${s.stop}.`);
    return null;
  }

  cancelWait() {
    if (this.state.kind === "stop" && this.state.waitFor) {
      this.state.waitFor = null;
      this.note("Batal menunggu.");
    }
  }

  /** Ubah halte turun saat di dalam bus (atau saat menunggu). */
  setAlight(stop: string): string | null {
    const s = this.state;
    if (s.kind === "stop" && s.waitFor) {
      const line = LINES.get(s.waitFor.lineKey)!;
      const err = this.checkAlight(line, line.stopIndex.get(s.stop)!, stop);
      if (err) return err;
      s.waitFor.alight = stop;
      this.version++;
      return null;
    }
    if (s.kind !== "ride") return "Kamu tidak sedang naik bus.";
    const line = LINES.get(s.lineKey)!;
    const passed = this.world.passedIndex(line, s.slot, this.now);
    const err = this.checkAlight(line, passed, stop);
    if (err) return err;
    s.alightIdx = line.stopIndex.get(stop)!;
    this.note(`Akan turun di ${stop}.`);
    return null;
  }

  /** Halte terakhir yang buka setelah `afterIdx` (default turun kalau pemain belum memilih), -1 kalau tidak ada. */
  lastOpenIdx(line: Line, afterIdx: number): number {
    for (let i = line.stops.length - 1; i > afterIdx; i--) if (!this.world.isClosed(line.stops[i].n)) return i;
    return -1;
  }

  private checkAlight(line: Line, afterIdx: number, stop: string): string | null {
    const idx = line.stopIndex.get(stop);
    if (idx === undefined) return `${line.corridor.name} tidak lewat ${stop}.`;
    if (idx <= afterIdx) return `${stop} sudah terlewat / bukan di depan pada arah ini.`;
    if (this.world.isClosed(stop)) return `Halte ${stop} ditutup, bus tidak berhenti di sana.`;
    return null;
  }

  walkTo(to: string): string | null {
    const s = this.state;
    if (s.kind !== "stop") return "Kamu harus di halte untuk berjalan kaki.";
    const link = this.world.walkLinks.get(s.stop)?.find((l) => l.to === to);
    if (!link) return `${to} terlalu jauh untuk jalan kaki dari ${s.stop}.`;
    this.state = { kind: "walk", from: s.stop, to, startT: this.now, endT: this.now + link.minutes };
    this.note(
      `Keluar halte ${s.stop}, jalan kaki ${Math.round(link.km * 1000)} m ke ${to}.` +
        (s.inside ? " Nanti harus tap kartu lagi." : "")
    );
    return null;
  }

  /** Jumlah langkah rencana yang sudah dimulai. */
  get planIndex(): number {
    return this.planIdx;
  }

  setPlan(plan: PlanLeg[]) {
    this.plan = plan;
    this.planIdx = 0;
    this.runPlan();
  }

  private runPlan() {
    if (!this.plan || this.state.kind !== "stop" || this.state.waitFor) return;
    const leg = this.plan[this.planIdx];
    if (!leg) {
      this.fail(`Rencana habis tapi kamu masih di ${this.state.stop}, belum sampai tujuan.`);
      return;
    }
    this.planIdx++;
    const err = leg.type === "ride" ? this.waitFor(leg.lineKey, leg.alight) : this.walkTo(leg.to);
    if (err) this.fail(`Rencana gagal: ${err}`);
  }

  // ---------- jalannya waktu ----------

  /** Waktu kejadian berikutnya yang mengubah state (null = tidak ada). */
  nextEventTime(): number | null {
    const s = this.state;
    if (s.kind === "stop" && s.waitFor) {
      const line = LINES.get(s.waitFor.lineKey)!;
      const a = this.world.nextArrival(line, line.stopIndex.get(s.stop)!, this.now);
      return a ? a.time : null;
    }
    if (s.kind === "ride") return this.world.arrivalTime(LINES.get(s.lineKey)!, s.slot, s.alightIdx);
    if (s.kind === "walk") return s.endT;
    return null;
  }

  /** Majukan jam ke `target`, memproses semua kejadian di antaranya secara berurutan. */
  advanceTo(target: number) {
    let guard = 0;
    while (!this.finished && guard++ < 1000) {
      const te = this.nextEventTime();
      const limit = Math.min(target, this.mission.deadline);
      if (te === null || te > limit) {
        this.now = Math.max(this.now, limit);
        break;
      }
      this.now = Math.max(this.now, te);
      this.handleEvent();
    }
    if (!this.finished && this.now >= this.mission.deadline) {
      this.fail(`Terlambat! Sudah ${formatClock(this.mission.deadline)} dan kamu belum sampai ${this.mission.to}.`);
    }
    if (this.state.kind === "stop" && this.state.waitFor) {
      const line = LINES.get(this.state.waitFor.lineKey)!;
      if (!this.world.nextArrival(line, line.stopIndex.get(this.state.stop)!, this.now)) {
        this.note(`Layanan ${lineLabel(line)} sudah selesai untuk hari ini.`, "warn");
        this.state.waitFor = null;
      }
    }
  }

  private handleEvent() {
    const s = this.state;
    if (s.kind === "stop" && s.waitFor) {
      const line = LINES.get(s.waitFor.lineKey)!;
      const idx = line.stopIndex.get(s.stop)!;
      const a = this.world.nextArrival(line, idx, this.now)!;
      if (a.full) {
        this.note(`${lineLabel(line)} tiba tapi penuh sesak — tidak bisa naik. Tunggu bus berikutnya.`, "warn");
        this.now += 1e-6;
        return;
      }
      let fare = 0;
      if (!s.inside) {
        fare = fareAt(this.now);
        if (this.balance < fare) {
          this.fail(`Saldo kartu tidak cukup untuk tap masuk (butuh Rp${fare.toLocaleString("id-ID")}).`);
          return;
        }
        this.balance -= fare;
        this.spent += fare;
        this.taps++;
      }
      const alightIdx = s.waitFor.alight !== null ? line.stopIndex.get(s.waitFor.alight)! : this.lastOpenIdx(line, idx);
      this.state = { kind: "ride", lineKey: line.key, slot: a.slot, boardIdx: idx, alightIdx };
      this.rideStartT = this.now;
      this.note(
        `Naik ${lineLabel(line)} di ${s.stop}` +
          (fare ? ` (tap Rp${fare.toLocaleString("id-ID")}).` : " (transfer gratis)."),
        "good"
      );
      return;
    }
    if (s.kind === "ride") {
      const line = LINES.get(s.lineKey)!;
      const stop = line.stops[s.alightIdx].n;
      this.trips.push({
        type: "ride",
        label: lineLabel(line),
        color: line.corridor.color,
        from: line.stops[s.boardIdx].n,
        to: stop,
        startT: this.rideStartT,
        endT: this.now,
        lineKey: line.key,
      });
      this.arriveAt(stop, true, `Turun di ${stop}.`);
      return;
    }
    if (s.kind === "walk") {
      this.trips.push({ type: "walk", label: "Jalan kaki", color: "#cfd3dc", from: s.from, to: s.to, startT: s.startT, endT: s.endT });
      this.arriveAt(s.to, false, `Sampai di halte ${s.to} dengan jalan kaki.`);
    }
  }

  private arriveAt(stop: string, inside: boolean, msg: string) {
    if (stop === this.mission.to) {
      this.state = { kind: "done", arrivedAt: this.now };
      this.note(`Sampai di ${stop} pukul ${formatClock(this.now)}!`, "good");
      return;
    }
    this.state = { kind: "stop", stop, inside, waitFor: null };
    this.note(msg);
    this.runPlan();
  }

  // ---------- untuk tampilan ----------

  /** Posisi pemain di peta. */
  position(): { lat: number; lng: number } {
    const s = this.state;
    if (s.kind === "stop") return STOP_COORDS.get(s.stop)!;
    if (s.kind === "ride") {
      const line = LINES.get(s.lineKey)!;
      return this.world.busPosition(line, s.slot, this.now) ?? STOP_COORDS.get(line.stops[s.boardIdx].n)!;
    }
    if (s.kind === "walk") {
      const a = STOP_COORDS.get(s.from)!;
      const b = STOP_COORDS.get(s.to)!;
      const f = Math.min(1, Math.max(0, (this.now - s.startT) / (s.endT - s.startT)));
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
    }
    return STOP_COORDS.get(this.mission.to)!;
  }
}

/** Jalankan rencana sampai selesai secara instan (untuk pratinjau mode rencana). */
export function simulatePlan(mission: Mission, plan: PlanLeg[]): Session {
  const s = new Session(mission);
  s.setPlan(plan);
  s.advanceTo(mission.deadline);
  return s;
}
