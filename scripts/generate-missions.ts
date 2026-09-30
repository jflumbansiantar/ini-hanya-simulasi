// Generator 100 misi (10 bab × 10 misi) dari termudah ke tersulit.
// Deterministik (seed tetap) — hasilnya ditulis ke lib/game/missionData.ts.
// Jalankan ulang: npm run generate:missions
//
// Setiap misi dibuat dengan: pilih asal & tujuan yang cocok dengan target
// bab (jumlah transfer, durasi), cari rute tercepat tanpa rintangan, lalu
// taruh rintangan DI rute itu (supaya benar-benar terasa), cari lagi rute
// tercepat dengan rintangan, dan pasang batas waktu = durasi terbaik × slack
// bab. Misi hanya diterima kalau solver & mesin game sepakat.
import fs from "fs";
import path from "path";
import { CORRIDORS } from "../lib/corridors";
import { CHAPTERS, MISSIONS_PER_CHAPTER, type Mission } from "../lib/game/missions";
import {
  draftMission,
  mulberry32,
  randomTools,
  recipeKinds,
  ridesOf,
  rollObstacles,
  round5,
  type Draft,
  type Obstacle,
  type Recipe,
} from "../lib/game/obstacles";
import { simulatePlan } from "../lib/game/session";
import { solve } from "../lib/game/solver";
import { LINES, STOP_COORDS } from "../lib/game/world";
import { haversineKm } from "../lib/simulation";

const hm = (h: number, m: number) => h * 60 + m;

// ---------- RNG bertitik awal tetap ----------
const rnd = mulberry32(20260930);
const { between, intBetween, pick, pickSome } = randomTools(rnd);

const TRUNKS = CORRIDORS.filter((c) => !c.parentId).map((c) => c.id);
const ALL_IDS = CORRIDORS.map((c) => c.id);

// ---------- misi buatan tangan (dari versi pertama game) ----------
// [posisi 0-based di daftar 100 misi, misi]
const HANDCRAFTED: [number, Omit<Mission, "id">][] = [
  [0, {
    title: "Hari Pertama Kerja",
    story: "Hari pertama magang di kantor dekat Bundaran HI, masuk jam 08.00! Kamu berangkat dari Blok M. Susun rencana perjalanan, lalu lihat bus membawamu ke sana.",
    mode: "plan", from: "Blok M", to: "Bundaran HI", start: hm(7, 10), deadline: hm(8, 0), balance: 10000,
    conditions: { corridors: ["k1", "k6"] },
    tips: "Pilih koridor yang lewat halte kamu sekarang, lalu pilih halte turun. Satu koridor sudah cukup.",
  }],
  [10, {
    title: "Transit Pertama",
    story: "Keponakanmu ingin melihat Monas. Kalian berangkat pagi dari Ragunan. Tidak ada koridor yang langsung — kamu perlu transfer sekali.",
    mode: "plan", from: "Ragunan", to: "Monas", start: hm(6, 40), deadline: hm(8, 15), balance: 10000,
    conditions: { corridors: ["k1", "k4", "k6"] },
    tips: "Transfer di halte yang sama gratis selama kamu tidak keluar halte.",
  }],
  [20, {
    title: "Arah yang Benar",
    story: "Mode real-time dimulai! Kamu di Harmoni, mau ke Pulogadung. Banyak bus lewat Harmoni — pastikan naik koridor dan ARAH yang benar, lalu pilih turun di mana.",
    mode: "live", from: "Harmoni", to: "Pulogadung", start: hm(8, 0), deadline: hm(9, 15), balance: 10000,
    conditions: { corridors: ["k1", "k2", "k3", "k8"] },
    tips: "Pilih bus di panel, lalu tunggu. Jam berjalan terus — gunakan tombol percepat saat menunggu.",
  }],
  [21, {
    title: "Lintas Barat–Timur",
    story: "Pulang kerja dari Kalideres menuju rumah dekat halte Senen. Jam sibuk sore — rencanakan transfer dengan cermat.",
    mode: "live", from: "Kalideres", to: "Senen", start: hm(17, 0), deadline: hm(19, 0), balance: 10000,
    conditions: { corridors: ["k1", "k2", "k3", "k5", "k8", "k9"] },
  }],
  [37, {
    title: "Macet & Penuh",
    story: "Senin pagi. Info lalu lintas: Koridor 9 macet parah (kecepatan 50%) dan bus Koridor 1 sering penuh sesak. Dari Pinang Ranti ke Bundaran HI sebelum jam 09.30.",
    mode: "live", from: "Pinang Ranti", to: "Bundaran HI", start: hm(7, 30), deadline: hm(9, 30), balance: 10000,
    conditions: { corridors: ["k1", "k4", "k6", "k7", "k9"], slowCorridors: { k9: 0.5 }, crowdedCorridors: { k1: 0.5 } },
  }],
  [50, {
    title: "Halte Ditutup",
    story: "Pengumuman: Halte Dukuh Atas ditutup sementara karena perbaikan. Kamu harus dari Ragunan ke Monas untuk acara jam 09.15. Cari jalan lain!",
    mode: "live", from: "Ragunan", to: "Monas", start: hm(7, 0), deadline: hm(9, 15), balance: 10000,
    conditions: { corridors: ["k1", "k3", "k6", "k9"], closedStops: ["Dukuh Atas"] },
    tips: "Bus tetap lewat Dukuh Atas tapi tidak berhenti. Kadang jalan kaki ke halte terdekat bisa jadi jalan pintas — tapi harus tap lagi.",
  }],
  [51, {
    title: "Subuh Hemat",
    story: "Akhir bulan, saldo kartu tinggal Rp2.000. Untung sebelum jam 07.00 tarif cuma Rp2.000! Berangkat dari Kampung Rambutan ke Senen untuk belanja di pasar.",
    mode: "plan", from: "Kampung Rambutan", to: "Senen", start: hm(5, 35), deadline: hm(7, 40), balance: 2000,
    conditions: { corridors: ["k4", "k5", "k7", "k11"] },
    tips: "Kamu hanya bisa tap SEKALI. Jangan keluar halte (jalan kaki) di tengah jalan.",
  }],
  [59, {
    title: "Saldo Mepet",
    story: "Janji ketemu teman di Ancol, berangkat dari Ciledug. Saldo cuma Rp3.500 — satu kali tap, tidak boleh keluar halte. Halte Harmoni ditutup dan Koridor 1 penuh sesak.",
    mode: "live", from: "Ciledug", to: "Ancol", start: hm(9, 0), deadline: hm(11, 30), balance: 3500,
    conditions: { corridors: ["k1", "k2", "k5", "k6", "k8", "k9", "k12", "k13"], closedStops: ["Harmoni"], crowdedCorridors: { k1: 0.6 } },
  }],
];

// ---------- tujuan perjalanan (judul & cerita) ----------
const PURPOSES: [string, string][] = [
  ["Wawancara Kerja", "Ada wawancara kerja di gedung dekat halte {to}. Kesan pertama itu penting — jangan telat!"],
  ["Kuliah", "Dosen killer mengajar di kampus dekat {to}. Telat sedetik, pintu dikunci."],
  ["Kontrol ke Dokter", "Jadwal kontrol di klinik dekat {to} sudah dipesan sebulan lalu. Berangkat dari {from}."],
  ["Nonton Konser", "Band favoritmu manggung dekat {to}. Tiket sudah di tangan, tinggal sampai tepat waktu."],
  ["Jenguk Nenek", "Nenek masak rendang dan menunggumu di rumahnya dekat {to}."],
  ["Belanja Grosir", "Stok warung habis. Kamu harus kulakan di pasar dekat {to} sebelum tutup."],
  ["Rapat Klien", "Klien besar menunggu presentasimu di kantor dekat {to}."],
  ["Kencan Pertama", "Janji ketemu gebetan di kafe dekat {to}. Masa telat di kencan pertama?"],
  ["Ambil Paket", "Paketmu nyasar ke kantor ekspedisi dekat {to} dan harus diambil hari ini."],
  ["Ujian Akhir", "Ujian akhir semester di kampus dekat {to}. Kartu ujian sudah di tas."],
  ["Latihan Futsal", "Tim futsal kantor latihan di lapangan dekat {to}. Kamu kiper satu-satunya."],
  ["Arisan Keluarga", "Arisan keluarga besar dekat {to}. Giliranmu yang dapat kocokan!"],
  ["Pameran Buku", "Pameran buku murah dekat {to} hanya hari ini."],
  ["Antar Dokumen", "Bos minta dokumen asli diantar ke kantor notaris dekat {to}."],
  ["Kondangan", "Sahabatmu menikah di gedung dekat {to}. Batik sudah disetrika."],
  ["Les Musik", "Les gitar di studio dekat {to}. Guru lesmu sangat tepat waktu."],
  ["Kuliner Legendaris", "Bakmi legendaris dekat {to} selalu habis dalam hitungan jam."],
  ["Nobar Bola", "Nonton bareng final liga di kafe dekat {to}."],
  ["Reuni SMA", "Reuni angkatan di restoran dekat {to}. Sudah sepuluh tahun tidak bertemu!"],
  ["Kerja Kelompok", "Kerja kelompok di perpustakaan dekat {to}. Semua bahan ada di laptopmu."],
  ["Servis Laptop", "Laptop rusak dan harus diperbaiki di pusat servis dekat {to}."],
  ["Donor Darah", "Unit donor darah membuka layanan dekat {to} sampai jam tertentu."],
  ["Beli Tiket Kereta", "Loket tiket kereta jarak jauh dekat {to} buka sebentar lagi."],
  ["Komunitas Sepeda", "Komunitas sepeda kumpul dekat {to} untuk gowes bareng."],
  ["Pembukaan Toko", "Teman membuka toko kopi dekat {to} dan kamu diundang jadi tamu pertama."],
  ["Jemput Adik", "Adikmu pulang sekolah dan menunggu dijemput dekat {to}."],
  ["Cari Kado", "Ulang tahun ibu besok! Toko kado incaranmu ada dekat {to}."],
  ["Lomba Lari", "Kamu ikut fun run yang start dekat {to}. Nomor dada sudah dipakai."],
  ["Syuting Konten", "Syuting konten kolaborasi dekat {to}. Kru sudah siap."],
  ["Foto Wisuda", "Sesi foto wisuda di studio dekat {to}. Toga jangan sampai kusut."],
  ["Makan Siang Tim", "Makan siang perpisahan rekan kerja di rumah makan dekat {to}."],
  ["Presentasi Proyek", "Presentasi proyek akhir di ruang rapat dekat {to}."],
  ["Workshop Desain", "Workshop desain grafis gratis dekat {to}, kursi terbatas."],
  ["Ambil Rapor", "Hari pembagian rapor adikmu di sekolah dekat {to}."],
  ["Pulang ke Kos", "Ibu kos mengunci gerbang tepat waktu. Pulang ke kos dekat {to} dari {from}."],
  ["Seminar Startup", "Seminar startup dekat {to} dengan pembicara idolamu."],
  ["Bazar Kuliner", "Bazar kuliner akhir pekan dekat {to}. Antreannya selalu panjang."],
  ["Latihan Paduan Suara", "Latihan paduan suara di aula dekat {to}. Kamu solis minggu ini."],
  ["Urus KTP", "Mengurus KTP di kantor kelurahan dekat {to}. Nomor antrean sudah diambil."],
  ["Kopdar Game", "Kopdar komunitas game di mal dekat {to}."],
];

// ---------- aturan per bab ----------
// Rintangan tiap misi ditulis sebagai resep (lib/game/obstacles.ts): rintangan
// wajib + rintangan tambahan yang jenisnya diacak. Game mengacak ulang letak,
// kekuatan, dan jenis tambahan setiap kali misi dimainkan.
interface ChapterRule {
  transfers: [number, number];
  duration: [number, number]; // menit tanpa rintangan
  slack: number; // batas waktu = durasi terbaik × slack
  subs: boolean; // boleh pakai subkoridor
  distractors: number;
  recipe: (local: number) => { fixed: Obstacle[]; extra?: { pool: Obstacle[]; count: number } };
  early?: (local: number) => boolean; // berangkat subuh (tarif Rp2.000)
}

const RULES: ChapterRule[] = [
  { transfers: [0, 0], duration: [12, 40], slack: 2.0, subs: false, distractors: 1, recipe: () => ({ fixed: [] }) },
  { transfers: [1, 1], duration: [25, 60], slack: 1.8, subs: false, distractors: 1, recipe: (i) => ({ fixed: i >= 3 ? ["redlight"] : [] }) },
  { transfers: [0, 1], duration: [20, 60], slack: 1.7, subs: false, distractors: 2, recipe: (i) => ({ fixed: i >= 3 ? ["queue", ...(i >= 7 ? ["redlight" as const] : [])] : [] }) },
  { transfers: [1, 1], duration: [25, 70], slack: 1.6, subs: false, distractors: 2, recipe: (i) => ({ fixed: ["crowded", ...(i >= 4 ? ["queue" as const] : [])] }) },
  { transfers: [1, 2], duration: [30, 80], slack: 1.55, subs: true, distractors: 2, recipe: (i) => ({ fixed: ["private"], extra: i >= 3 ? { pool: ["redlight", "crowded", "queue"], count: i >= 6 ? 2 : 1 } : undefined }) },
  { transfers: [1, 2], duration: [30, 85], slack: 1.5, subs: true, distractors: 3, recipe: (i) => ({ fixed: [i % 2 ? "closed" : "saldo"], extra: i >= 5 ? { pool: ["queue", "redlight", "crowded", "demo", "flood"], count: 1 } : undefined }), early: (i) => i === 4 || i === 8 },
  { transfers: [1, 2], duration: [30, 90], slack: 1.45, subs: true, distractors: 3, recipe: (i) => ({ fixed: ["accident"], extra: i >= 4 ? { pool: ["queue", "redlight", "crowded", "medical", "procession", "flood", "fire"], count: 1 } : undefined }) },
  { transfers: [2, 2], duration: [40, 100], slack: 1.4, subs: true, distractors: 3, recipe: (i) => ({ fixed: ["accident", "jam"], extra: i >= 5 ? { pool: ["queue", "private", "crowded", "procession", "demo", "flood", "fire"], count: 1 } : undefined }) },
  { transfers: [2, 3], duration: [45, 120], slack: 1.35, subs: true, distractors: 3, recipe: () => ({ fixed: [], extra: { pool: ["queue", "crowded", "private", "redlight", "closed", "accident", "medical", "procession", "demo", "flood", "fire"], count: 3 } }) },
  { transfers: [2, 3], duration: [50, 140], slack: 1.28, subs: true, distractors: 4, recipe: (i) => ({ fixed: ["accident", "jam"], extra: { pool: ["queue", "crowded", "private", "redlight", "saldo", "medical", "procession", "demo", "flood", "fire"], count: i >= 5 ? 3 : 2 } }) },
];

const FIRST_TIPS: Record<number, string> = {
  1: "🚦 Lampu merah menambah beberapa menit di setiap ruas yang ditandai.",
  2: "👥 Antrean: setiap bus yang datang mengangkut orang di depanmu dulu sesuai sisa kapasitasnya.",
  3: "Bus gandeng koridor utama muat 150 orang, bus subkoridor 70. Bus yang sudah penuh tidak bisa dinaiki.",
  4: "🚗 Kendaraan pribadi yang masuk busway memperlambat bus di ruas itu.",
  5: "Halte ditutup atau saldo mepet: pikirkan apakah jalan kaki (keluar halte = tap lagi) sepadan.",
  6: "💥 Selama kecelakaan, bus dialihkan ke lajur umum (lambat) dan halte di ruas itu tidak dilayani.",
  7: "Macet imbas kecelakaan juga memperlambat koridor lain di sekitarnya.",
};

const noHazards = (d: Draft, deadline: number) => draftMission(d, deadline, 100000);

// ---------- generator ----------
const usedPairs = new Set<string>();
for (const [, m] of HANDCRAFTED) usedPairs.add(`${m.from}>${m.to}`);

const START_BUCKETS: [number, number][] = [
  [hm(6, 0), hm(9, 0)],
  [hm(10, 0), hm(14, 0)],
  [hm(16, 0), hm(19, 0)],
];

function stopsOf(ids: string[]): string[] {
  const s = new Set<string>();
  for (const id of ids) for (const st of LINES.get(`${id}:forward`)!.stops) s.add(st.n);
  return [...s];
}

const rejects: Record<string, number> = {};
const reject = (why: string) => {
  rejects[why] = (rejects[why] ?? 0) + 1;
};

function generateOne(ch: number, local: number): Mission | null {
  const rule = RULES[ch];
  const pool = rule.subs ? ALL_IDS : TRUNKS;
  const poolStops = stopsOf(TRUNKS);
  for (let attempt = 0; attempt < 400; attempt++) {
    const from = pick(poolStops);
    const to = pick(poolStops);
    if (from === to || usedPairs.has(`${from}>${to}`)) continue;
    if (haversineKm(STOP_COORDS.get(from)!, STOP_COORDS.get(to)!) < 3) continue;
    const [s0, s1] = pick(START_BUCKETS);
    const start = 5 * Math.round(between(s0, s1) / 5);

    const probe: Draft = { from, to, start, balance: 20000, conditions: { corridors: pool } };
    const wide = solve(noHazards(probe, start + 400));
    if (!wide) continue;
    const transfers = wide.legs.length - 1;
    const dur = wide.arrival - start;
    if (transfers < rule.transfers[0] || transfers > rule.transfers[1]) continue;
    if (dur < rule.duration[0] || dur > rule.duration[1]) continue;
    if (wide.legs.some((l) => l.type === "walk") && ch < 5) continue;

    // koridor misi = koridor rute + pengecoh yang lewat halte-halte penting
    const { rides, transferStops } = ridesOf(from, wide.legs);
    const used = new Set(rides.map((r) => r.line.corridor.id));
    const keyStops = new Set([from, to, ...transferStops]);
    const distract = pool.filter((id) => !used.has(id) && LINES.get(`${id}:forward`)!.stops.some((s) => keyStops.has(s.n)));
    const corridors = [...used, ...pickSome(distract, rule.distractors)].sort(
      (a, b) => ALL_IDS.indexOf(a) - ALL_IDS.indexOf(b)
    );

    const early = rule.early?.(local) ?? false;
    const d: Draft = { from, to, start: early ? hm(5, intBetween(5, 40)) : start, balance: 10000, conditions: { corridors } };
    const { fixed, extra } = rule.recipe(local);
    const recipe: Recipe = { chapter: ch, slack: rule.slack, fixed, ...(extra ? { extra } : {}) };

    const mode = ch < 2 ? "plan" : ch >= 3 && local % 5 === 4 ? "plan" : "live";
    let m: Mission;
    if (!fixed.length && !extra) {
      const base = solve(noHazards(d, d.start + 500));
      if (!base) continue;
      m = draftMission(d, d.start + round5((base.arrival - d.start) * rule.slack));
    } else {
      const rolled = rollObstacles(d, recipeKinds(recipe, rnd, mode === "live"), ch, rule.slack, rnd);
      if (!rolled) {
        reject("rintangan tidak layak");
        continue;
      }
      if (rolled.deadline - rolled.start > rule.duration[1] * 1.8 * rule.slack) {
        reject("terlalu lama dengan rintangan");
        continue;
      }
      m = { ...rolled, recipe };
    }
    m.mode = mode;

    // validasi akhir: solver & mesin game sepakat, dan masih bisa selesai
    const final = solve(m);
    if (!final) continue;
    const replay = simulatePlan(m, final.legs);
    if (replay.state.kind !== "done" || Math.abs(replay.state.arrivedAt - final.arrival) > 1e-6) {
      throw new Error(`Mesin & solver tidak sepakat untuk ${from} → ${to}`);
    }
    usedPairs.add(`${from}>${to}`);
    return m;
  }
  return null;
}

const out: Mission[] = new Array(CHAPTERS.length * MISSIONS_PER_CHAPTER);
for (const [pos, m] of HANDCRAFTED) out[pos] = { id: "", ...m };

let purposeIdx = 0;
for (let ch = 0; ch < CHAPTERS.length; ch++) {
  const slots: number[] = [];
  for (let i = 0; i < MISSIONS_PER_CHAPTER; i++) if (!out[ch * MISSIONS_PER_CHAPTER + i]) slots.push(i);
  const made: { m: Mission; local: number }[] = [];
  for (const local of slots) {
    for (const k in rejects) delete rejects[k];
    const m = generateOne(ch, local);
    if (!m) throw new Error(`Gagal membuat misi bab ${ch + 1} #${local + 1}: ${JSON.stringify(rejects)}`);
    made.push({ m, local });
  }
  // urutkan dalam bab dari termudah: durasi × transfer × jumlah rintangan
  const score = (m: Mission) => {
    const c = m.conditions;
    const n = (c.hazards?.length ?? 0) + Object.keys(c.queues ?? {}).length + Object.keys(c.crowdedCorridors ?? {}).length + (c.closedStops?.length ?? 0);
    return (m.deadline - m.start) * (1 + 0.25 * n);
  };
  made.sort((a, b) => score(a.m) - score(b.m));
  let tipGiven = false;
  made.forEach(({ m }, k) => {
    const pos = ch * MISSIONS_PER_CHAPTER + slots[k];
    const [title, story] = PURPOSES[purposeIdx++ % PURPOSES.length];
    m.title = title;
    m.story = story.replace("{to}", m.to).replace("{from}", m.from);
    const saldo = m.recipe?.fixed.includes("saldo") || m.recipe?.extra?.pool.includes("saldo");
    if (m.balance <= 3500 || saldo) m.story += " Saldo kartumu sedang mepet, hitung ongkosnya baik-baik.";
    // tips perkenalan rintangan bab ini di misi pertama yang memuatnya
    const hasObstacle = !!(m.recipe?.fixed.length || m.recipe?.extra);
    if (!tipGiven && hasObstacle && FIRST_TIPS[ch]) {
      m.tips = FIRST_TIPS[ch];
      tipGiven = true;
    }
    out[pos] = m;
  });
}
out.forEach((m, i) => {
  m.id = `m${i + 1}`;
  if (m.conditions.hazards && !m.conditions.hazards.length) delete m.conditions.hazards;
});

const lines = [
  "// AUTO-GENERATED oleh scripts/generate-missions.ts — jangan diedit manual,",
  "// ubah generatornya lalu jalankan `npm run generate:missions`.",
  'import type { Mission } from "./missions";',
  "",
  "export const MISSION_DATA: Mission[] = [",
  ...out.map((m) => `  ${JSON.stringify(m)},`),
  "];",
  "",
];
fs.writeFileSync(path.join(__dirname, "..", "lib", "game", "missionData.ts"), lines.join("\n"));
console.log(`Menulis ${out.length} misi.`);
for (let ch = 0; ch < CHAPTERS.length; ch++) {
  const ms = out.slice(ch * MISSIONS_PER_CHAPTER, (ch + 1) * MISSIONS_PER_CHAPTER);
  console.log(`Bab ${ch + 1} ${CHAPTERS[ch].title}: ` + ms.map((m) => `${m.from}→${m.to}`).join(", "));
}
