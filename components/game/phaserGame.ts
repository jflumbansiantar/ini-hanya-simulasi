import Phaser from "phaser";
import type { GameController, MapPath } from "@/lib/game/controller";
import { TILE_TINT, tileUrl } from "@/lib/game/tiles";
import { DEMO_ZONES, LINES, STOP_COORDS, hazardRange, type World } from "@/lib/game/world";
import { formatClock } from "@/lib/simulation";
import {
  MAX_TILE_ZOOM,
  MIN_TILE_ZOOM,
  ORIGIN,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  WORLD_ZOOM,
  project,
} from "@/lib/game/projection";

/**
 * Peta game di Phaser. Ubin peta (default OpenStreetMap, lihat lib/game/tiles.ts) dimuat sendiri oleh loader
 * Phaser sesuai posisi & zoom kamera; semua objek game digambar dalam
 * koordinat dunia (lib/game/projection.ts) dan diskalakan 1/zoom supaya
 * ukurannya di layar tetap.
 */

const MIN_CAM_ZOOM = 2 ** (MIN_TILE_ZOOM - WORLD_ZOOM);
const MAX_CAM_ZOOM = 2 ** (MAX_TILE_ZOOM - WORLD_ZOOM);
const MAX_TEXTURES = 350;

const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;
const TILE_TINT_COLOR = hex(TILE_TINT);

class MapScene extends Phaser.Scene {
  private ctl!: GameController;
  private tiles = new Map<string, Phaser.GameObjects.Image>();
  private tileTextures: string[] = []; // urutan LRU
  private pending = new Set<string>();
  private failed = new Set<string>();

  private network!: Phaser.GameObjects.Graphics;
  private highlight!: Phaser.GameObjects.Graphics;
  private marks!: Phaser.GameObjects.Graphics;
  private hazardGfx!: Phaser.GameObjects.Graphics;
  private hazardIcons: Phaser.GameObjects.Text[] = [];
  private hazardKey = "";
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private buses: Phaser.GameObjects.Image[] = [];
  private player!: Phaser.GameObjects.Image;
  private ring!: Phaser.GameObjects.Graphics;

  private drawnFor = { world: null as World | null, zoom: 0, pathsKey: "" };
  private cameraSeq = -1;
  private dragStart: { x: number; y: number } | null = null;
  private dragged = false;
  private hoverStop: string | null = null;

  constructor() {
    super("map");
  }

  init(data: { ctl: GameController }) {
    this.ctl = data.ctl;
  }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor("#0b0d12");
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.setZoom(2 ** (11 - WORLD_ZOOM));
    cam.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);

    this.load.setCORS("anonymous");
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string) => {
      this.pending.delete(key);
      this.tileTextures.push(key);
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.pending.delete(file.key);
      this.failed.add(file.key);
    });

    this.makeTextures();
    this.network = this.add.graphics().setDepth(10);
    this.highlight = this.add.graphics().setDepth(20);
    this.marks = this.add.graphics().setDepth(30);
    this.hazardGfx = this.add.graphics().setDepth(15);
    this.ring = this.add.graphics().setDepth(49);
    this.player = this.add.image(0, 0, "player").setDepth(50).setVisible(false);

    this.setupInput();
  }

  private makeTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // bus tampak atas, putih supaya bisa di-tint warna koridor
    g.fillStyle(0xffffff, 1).fillRoundedRect(1, 1, 30, 14, 4);
    g.fillStyle(0x10131a, 0.85);
    for (let i = 0; i < 4; i++) g.fillRect(5 + i * 6, 4, 4, 8);
    g.fillStyle(0x10131a, 0.85).fillRect(27, 3, 3, 10);
    g.generateTexture("bus", 32, 16);
    g.clear();
    g.fillStyle(0xffd23f, 1).fillCircle(12, 12, 9);
    g.lineStyle(3, 0x10131a, 1).strokeCircle(12, 12, 9);
    g.fillStyle(0x10131a, 1).fillCircle(12, 9, 3).fillRoundedRect(7, 13, 10, 5, 2);
    g.generateTexture("player", 24, 24);
    g.destroy();
  }

  private setupInput() {
    const cam = this.cameras.main;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.dragStart = { x: p.x, y: p.y };
      this.dragged = false;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown && this.dragStart) {
        if (!this.dragged && Math.hypot(p.x - this.dragStart.x, p.y - this.dragStart.y) > 5) {
          this.dragged = true;
          this.ctl.setFollow(false);
        }
        if (this.dragged) {
          cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
          cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
        }
      } else {
        this.hoverStop = this.stopAt(p.x, p.y);
        this.game.canvas.style.cursor = this.hoverStop ? "pointer" : "grab";
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.dragged) {
        const stop = this.stopAt(p.x, p.y);
        if (stop) this.ctl.clickStop(stop);
      }
      this.dragStart = null;
    });
    this.input.on("wheel", (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      // pertahankan titik dunia di bawah kursor: world = scroll + w/2 + (s - w/2) / zoom
      const hw = cam.width / 2;
      const hh = cam.height / 2;
      const wx = cam.scrollX + hw + (p.x - hw) / cam.zoom;
      const wy = cam.scrollY + hh + (p.y - hh) / cam.zoom;
      const z = Phaser.Math.Clamp(cam.zoom * Math.pow(1.0015, -dy), MIN_CAM_ZOOM, MAX_CAM_ZOOM);
      cam.setZoom(z);
      cam.setScroll(wx - hw - (p.x - hw) / z, wy - hh - (p.y - hh) / z);
    });
    this.input.keyboard?.on("keydown-SPACE", () => this.ctl.togglePause());
  }

  /** Nama halte di bawah titik layar (radius 12px), atau null. */
  private stopAt(sx: number, sy: number): string | null {
    const world = this.ctl.world;
    if (!world) return null;
    const cam = this.cameras.main;
    const wp = cam.getWorldPoint(sx, sy);
    let best: string | null = null;
    let bestD = 12 / cam.zoom;
    for (const name of world.stopNames) {
      const p = project(STOP_COORDS.get(name)!);
      const d = Math.hypot(p.x - wp.x, p.y - wp.y);
      if (d < bestD) {
        bestD = d;
        best = name;
      }
    }
    return best;
  }

  // ---------- ubin peta ----------

  private updateTiles() {
    const cam = this.cameras.main;
    const z = Phaser.Math.Clamp(Math.round(WORLD_ZOOM + Math.log2(cam.zoom)), MIN_TILE_ZOOM, MAX_TILE_ZOOM);
    const size = TILE_SIZE * 2 ** (WORLD_ZOOM - z);
    const v = cam.worldView;
    const n = 2 ** z;
    const x0 = Math.max(0, Math.floor((v.x + ORIGIN.x) / size));
    const x1 = Math.min(n - 1, Math.floor((v.right + ORIGIN.x) / size));
    const y0 = Math.max(0, Math.floor((v.y + ORIGIN.y) / size));
    const y1 = Math.min(n - 1, Math.floor((v.bottom + ORIGIN.y) / size));

    const wanted = new Set<string>();
    let allReady = true;
    let queued = false;
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const key = `t${z}/${x}/${y}`;
        wanted.add(key);
        if (this.textures.exists(key)) {
          if (!this.tiles.has(key)) {
            const img = this.add
              .image(x * size - ORIGIN.x, y * size - ORIGIN.y, key)
              .setOrigin(0)
              .setDisplaySize(size + size / 256, size + size / 256)
              .setDepth(-100 + z)
              .setTint(TILE_TINT_COLOR);
            this.tiles.set(key, img);
          }
          this.tiles.get(key)!.setDepth(0).setVisible(true);
        } else if (!this.failed.has(key)) {
          allReady = false;
          if (!this.pending.has(key)) {
            this.pending.add(key);
            this.load.image(key, tileUrl(z, x, y));
            queued = true;
          }
        }
      }
    }
    if (queued && !this.load.isLoading()) this.load.start();

    // ubin zoom lain tetap tampil sebagai latar sampai ubin zoom sekarang siap
    for (const [key, img] of this.tiles) {
      if (wanted.has(key)) continue;
      const tz = Number(key.slice(1, key.indexOf("/")));
      const inView = Phaser.Geom.Intersects.RectangleToRectangle(img.getBounds(), v);
      if (!allReady && inView && Math.abs(tz - z) <= 2) {
        img.setVisible(true).setDepth(-100 + tz);
      } else {
        img.destroy();
        this.tiles.delete(key);
      }
    }
    while (this.tileTextures.length > MAX_TEXTURES) {
      const old = this.tileTextures.shift()!;
      if (wanted.has(old) || this.tiles.has(old)) {
        this.tileTextures.push(old);
        break;
      }
      this.textures.remove(old);
    }
  }

  // ---------- jaringan koridor & sorotan ----------

  private drawNetwork(world: World, zoom: number) {
    const g = this.network;
    g.clear();
    const px = 1 / zoom;
    for (const line of world.lines) {
      if (line.direction !== "forward") continue;
      const pts = line.dirMeta.points;
      g.lineStyle(3.5 * px, hex(line.corridor.color), 0.5);
      g.beginPath();
      pts.forEach((p, i) => {
        const w = project(p);
        if (i === 0) g.moveTo(w.x, w.y);
        else g.lineTo(w.x, w.y);
      });
      g.strokePath();
    }
    for (const name of world.stopNames) {
      const p = project(STOP_COORDS.get(name)!);
      const transfer = (world.stopLines.get(name)?.length ?? 0) > 2;
      g.fillStyle(0x0b0d12, 1).fillCircle(p.x, p.y, (transfer ? 5 : 3.5) * px);
      g.lineStyle(2 * px, 0xe8e9ee, 0.9).strokeCircle(p.x, p.y, (transfer ? 5 : 3.5) * px);
    }
  }

  private drawPaths(paths: MapPath[], zoom: number) {
    const g = this.highlight;
    g.clear();
    const px = 1 / zoom;
    for (const path of paths) {
      const pts = path.points.map(project);
      if (pts.length < 2) continue;
      if (path.dashed) {
        g.lineStyle(4 * px, hex(path.color), 0.95);
        dashedLine(g, pts, 10 * px, 7 * px);
      } else {
        g.lineStyle(10 * px, 0xffffff, 0.3);
        strokePolyline(g, pts);
        g.lineStyle(6 * px, hex(path.color), 1);
        strokePolyline(g, pts);
      }
    }
  }

  /**
   * Rintangan yang sedang aktif: ruas diwarnai + ikon, halte yang tidak
   * dilayani sementara diberi tanda silang, dan jumlah antrean di halte.
   * Digambar ulang hanya kalau set rintangan aktif atau zoom berubah.
   */
  private drawHazards(world: World | null, now: number, zoom: number, showAll: boolean) {
    // kejadian mendadak tidak pernah ditampilkan sebelum terjadi
    const active = world ? (showAll ? world.hazards.filter((h) => !h.surprise) : world.activeHazards(now)) : [];
    const queues = world ? [...world.queues.entries()] : [];
    const closedNow = world ? world.tempClosures.filter((c) => now >= c.start && now < c.end).map((c) => c.stop) : [];
    const medical = world ? world.surpriseEvents().filter((e) => e.kind === "medical" && now >= e.start && now < e.end) : [];
    const demos = world ? world.demos.filter((d) => showAll || (now >= d.start && now < d.end)) : [];
    const key = [
      showAll,
      active.map((h) => world!.hazards.indexOf(h)).join(","),
      closedNow.join(","),
      medical.length,
      demos.map((d) => d.zone).join(","),
      queues.length,
      zoom.toFixed(3),
    ].join("|");
    if (key === this.hazardKey) return;
    this.hazardKey = key;

    const g = this.hazardGfx;
    g.clear();
    const px = 1 / zoom;
    const style = {
      private: { color: 0xb0b6c3, icon: "🚗" },
      redlight: { color: 0xff4d4d, icon: "🚦" },
      accident: { color: 0xe63946, icon: "💥" },
      jam: { color: 0xf3722c, icon: "🚧" },
      procession: { color: 0x9d4edd, icon: "⚰️" },
    } as const;
    const icons: { x: number; y: number; text: string }[] = [];

    for (const d of demos) {
      const z = DEMO_ZONES[d.zone];
      const c = project(z);
      // jari-jari zona dalam piksel dunia (diukur dari titik 1 derajat lintang ke utara)
      const r = z.radiusKm * (project({ lat: z.lat - 0.01, lng: z.lng }).y - c.y) / 1.112;
      g.fillStyle(0xe63946, 0.13).fillCircle(c.x, c.y, r);
      g.lineStyle(2 * px, 0xe63946, 0.8).strokeCircle(c.x, c.y, r);
      icons.push({ x: c.x, y: c.y - r, text: `📢 Demo ${z.name} s/d ${formatClock(d.end)}` });
    }
    for (const e of medical) {
      const p = project(STOP_COORDS.get(e.at!)!);
      icons.push({ x: p.x, y: p.y - 26 * px, text: `🚑 evakuasi s/d ${formatClock(e.end)}` });
    }

    for (const h of active) {
      const line = LINES.get(`${h.corridor}:forward`);
      const range = line && hazardRange(line, h);
      if (!line || !range) continue;
      const br = line.dirMeta.breaks;
      const pts = line.dirMeta.points.slice(br[range[0]], br[range[1]] + 1).map(project);
      if (pts.length < 2) continue;
      const st = style[h.kind];
      if (h.kind === "private" || h.kind === "redlight") {
        g.lineStyle(9 * px, st.color, 0.55);
        dashedLine(g, pts, 8 * px, 6 * px);
      } else {
        g.lineStyle(12 * px, st.color, h.kind === "accident" ? 0.75 : 0.55);
        strokePolyline(g, pts);
        // garis pembatas putih putus-putus supaya beda dari warna koridor
        g.lineStyle(3 * px, 0xffffff, 0.9);
        dashedLine(g, pts, 6 * px, 6 * px);
      }
      const mid = pts[Math.floor(pts.length / 2)];
      const until = (h.kind === "accident" || h.kind === "procession") && h.end !== undefined ? ` s/d ${formatClock(h.end)}` : "";
      icons.push({ x: mid.x, y: mid.y, text: `${st.icon}${until}` });
    }
    for (const stop of closedNow) {
      const p = project(STOP_COORDS.get(stop)!);
      const r = 7 * px;
      g.fillStyle(0xe63946, 1).fillCircle(p.x, p.y, r + 2 * px);
      g.lineStyle(2.5 * px, 0xffffff, 1);
      g.lineBetween(p.x - r * 0.55, p.y - r * 0.55, p.x + r * 0.55, p.y + r * 0.55);
      g.lineBetween(p.x - r * 0.55, p.y + r * 0.55, p.x + r * 0.55, p.y - r * 0.55);
    }
    for (const [stop, n] of queues) {
      const p = project(STOP_COORDS.get(stop)!);
      icons.push({ x: p.x, y: p.y + 22 * px, text: `👥 ${n}` });
    }

    while (this.hazardIcons.length < icons.length) {
      this.hazardIcons.push(
        this.add
          .text(0, 0, "", {
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            fontSize: "13px",
            color: "#ffffff",
            backgroundColor: "rgba(11,13,18,0.85)",
            padding: { x: 4, y: 2 },
            resolution: Math.max(1, window.devicePixelRatio || 1),
          })
          .setOrigin(0.5)
          .setDepth(46)
      );
    }
    this.hazardIcons.forEach((t, i) => {
      const ic = icons[i];
      if (!ic) {
        t.setVisible(false);
        return;
      }
      if (t.text !== ic.text) t.setText(ic.text);
      t.setVisible(true).setPosition(ic.x, ic.y).setScale(px);
    });
  }

  private drawMarks(world: World, zoom: number) {
    const g = this.marks;
    g.clear();
    const m = this.ctl.mission;
    if (!m) return;
    const px = 1 / zoom;
    for (const name of world.closed) {
      const p = project(STOP_COORDS.get(name)!);
      const r = 8 * px;
      g.fillStyle(0xe63946, 1).fillCircle(p.x, p.y, r + 2 * px);
      g.lineStyle(2.5 * px, 0xffffff, 1);
      g.lineBetween(p.x - r * 0.55, p.y - r * 0.55, p.x + r * 0.55, p.y + r * 0.55);
      g.lineBetween(p.x - r * 0.55, p.y + r * 0.55, p.x + r * 0.55, p.y - r * 0.55);
    }
    const from = project(STOP_COORDS.get(m.from)!);
    g.fillStyle(0x2ecc71, 1).fillCircle(from.x, from.y, 8 * px);
    g.lineStyle(2.5 * px, 0xffffff, 1).strokeCircle(from.x, from.y, 8 * px);
    const to = project(STOP_COORDS.get(m.to)!);
    // bendera tujuan
    g.lineStyle(2.5 * px, 0xffffff, 1).lineBetween(to.x, to.y, to.x, to.y - 26 * px);
    g.fillStyle(0xe63946, 1).fillTriangle(to.x, to.y - 26 * px, to.x + 16 * px, to.y - 20 * px, to.x, to.y - 14 * px);
    g.fillStyle(0xe63946, 1).fillCircle(to.x, to.y, 7 * px);
    g.lineStyle(2.5 * px, 0xffffff, 1).strokeCircle(to.x, to.y, 7 * px);
  }

  private syncLabels(world: World | null, zoom: number) {
    const names = new Set(world ? world.stopNames : []);
    for (const [name, t] of this.labels) {
      if (!names.has(name)) {
        t.destroy();
        this.labels.delete(name);
      }
    }
    if (!world) return;
    const m = this.ctl.mission!;
    const s = this.ctl.session;
    const here = s?.state.kind === "stop" ? s.state.stop : null;
    for (const name of names) {
      let t = this.labels.get(name);
      if (!t) {
        const p = project(STOP_COORDS.get(name)!);
        t = this.add
          .text(p.x, p.y, name, {
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            fontSize: "12px",
            color: "#e8e9ee",
            stroke: "#0b0d12",
            strokeThickness: 4,
            resolution: Math.max(1, window.devicePixelRatio || 1),
          })
          .setOrigin(-0.12, 1.15)
          .setDepth(40);
        this.labels.set(name, t);
      }
      const key = name === m.from || name === m.to || name === here || name === this.hoverStop;
      const transfer = (world.stopLines.get(name)?.length ?? 0) > 2;
      t.setVisible(key || zoom >= 0.5 || (transfer && zoom >= 0.22));
      t.setScale(1 / zoom);
      const color = name === m.to ? "#ff8a8a" : name === m.from ? "#7ee2a8" : world.isClosed(name) ? "#ff6b6b" : "#e8e9ee";
      const style = `${color}${key ? "b" : ""}`;
      // setColor/setFontStyle menggambar ulang teks — hanya kalau berubah
      if (t.getData("style") !== style) {
        t.setData("style", style);
        t.setColor(color);
        t.setFontStyle(key ? "bold" : "normal");
        t.setDepth(key ? 45 : 40);
      }
    }
  }

  // ---------- kamera ----------

  private applyCamera() {
    const req = this.ctl.camera;
    if (req.seq === this.cameraSeq) return;
    this.cameraSeq = req.seq;
    if (!req.points.length) return;
    const pts = req.points.map(project);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const cam = this.cameras.main;
    const pad = 140;
    const zx = (cam.width - pad * 2 - 380) / Math.max(1, maxX - minX); // ruang untuk panel kanan
    const zy = (cam.height - pad * 2) / Math.max(1, maxY - minY);
    const z = Phaser.Math.Clamp(Math.min(zx, zy), MIN_CAM_ZOOM, 2 ** (15 - WORLD_ZOOM));
    cam.zoomTo(z, 600, "Sine.easeInOut");
    cam.pan((minX + maxX) / 2 + 190 / z, (minY + maxY) / 2, 600, "Sine.easeInOut");
  }

  update(_time: number, delta: number) {
    this.ctl.tick(delta);
    this.applyCamera();
    const cam = this.cameras.main;
    const zoom = cam.zoom;
    const world = this.ctl.world;
    const session = this.ctl.session;

    this.updateTiles();

    if (world !== this.drawnFor.world || Math.abs(zoom / this.drawnFor.zoom - 1) > 0.04) {
      if (world) {
        this.drawNetwork(world, zoom);
        this.drawMarks(world, zoom);
      } else {
        this.network.clear();
        this.marks.clear();
      }
      this.drawnFor.world = world;
      this.drawnFor.zoom = zoom;
      this.drawnFor.pathsKey = "";
    }
    const paths = this.ctl.highlightPaths();
    const pathsKey = paths.map((p) => `${p.color}${p.points.length}${p.dashed ? 1 : 0}${p.points[0]?.lat}`).join("|") + zoom.toFixed(3);
    if (pathsKey !== this.drawnFor.pathsKey) {
      this.drawPaths(paths, zoom);
      this.drawnFor.pathsKey = pathsKey;
    }
    this.syncLabels(world, zoom);
    const phase = this.ctl.phase;
    this.drawHazards(phase === "menu" ? null : world, session?.now ?? 0, zoom, phase === "planning" || phase === "briefing");

    // bus
    const active = world && session ? world.activeBuses(session.now) : [];
    const riding = session?.state.kind === "ride" ? session.state : null;
    // bus mengecil saat peta di-zoom jauh supaya tidak menumpuk
    const busScale = Phaser.Math.Clamp(0.55 + 0.3 * Math.log2(zoom / 0.25), 0.55, 0.9);
    while (this.buses.length < active.length) this.buses.push(this.add.image(0, 0, "bus").setDepth(35));
    this.buses.forEach((img, i) => {
      const b = active[i];
      if (!b) {
        img.setVisible(false);
        return;
      }
      const p = project(b);
      const mine = riding && riding.lineKey === b.line.key && riding.slot === b.slot;
      img
        .setVisible(true)
        .setPosition(p.x, p.y)
        .setRotation(b.heading)
        .setTint(hex(b.line.corridor.color))
        .setScale((mine ? 1.25 : busScale) / zoom)
        .setDepth(mine ? 48 : 35);
    });

    // pemain
    if (session && this.ctl.phase !== "menu") {
      const p = project(session.position());
      this.player.setVisible(true).setPosition(p.x, p.y).setScale(1 / zoom);
      const pulse = (this.time.now % 1400) / 1400;
      this.ring.clear();
      this.ring.lineStyle(3 / zoom, 0xffd23f, 1 - pulse);
      this.ring.strokeCircle(p.x, p.y, (12 + pulse * 18) / zoom);
      if (this.ctl.follow && this.ctl.phase === "playing" && !this.dragStart) {
        cam.centerOn(
          Phaser.Math.Linear(cam.midPoint.x, p.x + 190 / zoom, 0.08),
          Phaser.Math.Linear(cam.midPoint.y, p.y, 0.08)
        );
      }
    } else {
      this.player.setVisible(false);
      this.ring.clear();
    }
  }
}

function strokePolyline(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[]) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

function dashedLine(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[], dash: number, gap: number) {
  let on = true;
  let left = dash;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    let ax = pts[i - 1].x;
    let ay = pts[i - 1].y;
    const bx = pts[i].x;
    const by = pts[i].y;
    let seg = Math.hypot(bx - ax, by - ay);
    while (seg > 0) {
      const step = Math.min(seg, left);
      const f = step / seg;
      const nx = ax + (bx - ax) * f;
      const ny = ay + (by - ay) * f;
      if (on) g.lineTo(nx, ny);
      else g.moveTo(nx, ny);
      ax = nx;
      ay = ny;
      seg -= step;
      left -= step;
      if (left <= 1e-9) {
        on = !on;
        left = on ? dash : gap;
      }
    }
  }
  g.strokePath();
}

export function createGame(parent: HTMLElement, ctl: GameController): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0b0d12",
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    render: { antialias: true, roundPixels: false },
    banner: false,
    audio: { noAudio: true },
    input: { keyboard: { target: window } },
    disableContextMenu: true,
  });
  game.scene.add("map", MapScene, true, { ctl });
  return game;
}
