import type { Conditions } from "./world";

export type MissionMode = "plan" | "live";

export interface Mission {
  id: string;
  title: string;
  story: string;
  mode: MissionMode;
  from: string;
  to: string;
  start: number; // menit sejak 00:00
  deadline: number;
  balance: number; // saldo kartu awal (Rp)
  conditions: Conditions;
  tips?: string;
}

const hm = (h: number, m: number) => h * 60 + m;

/**
 * Misi dirancang berurutan dari mudah ke sulit. Setiap misi sudah dicek
 * dengan solver (scripts/check-missions.ts) supaya selalu bisa diselesaikan
 * sebelum batas waktu dengan saldo yang ada.
 */
export const MISSIONS: Mission[] = [
  {
    id: "m1",
    title: "Hari Pertama Kerja",
    story:
      "Hari pertama magang di kantor dekat Bundaran HI, masuk jam 08.00! Kamu berangkat dari Blok M. Susun rencana perjalanan, lalu lihat bus membawamu ke sana.",
    mode: "plan",
    from: "Blok M",
    to: "Bundaran HI",
    start: hm(7, 10),
    deadline: hm(8, 0),
    balance: 10000,
    conditions: { corridors: ["k1", "k6"] },
    tips: "Pilih koridor yang lewat halte kamu sekarang, lalu pilih halte turun. Satu koridor sudah cukup.",
  },
  {
    id: "m2",
    title: "Transit Pertama",
    story:
      "Keponakanmu ingin melihat Monas. Kalian berangkat pagi dari Ragunan. Tidak ada koridor yang langsung — kamu perlu transfer sekali.",
    mode: "plan",
    from: "Ragunan",
    to: "Monas",
    start: hm(6, 40),
    deadline: hm(8, 15),
    balance: 10000,
    conditions: { corridors: ["k1", "k4", "k6"] },
    tips: "Transfer di halte yang sama gratis selama kamu tidak keluar halte.",
  },
  {
    id: "m3",
    title: "Subuh Hemat",
    story:
      "Akhir bulan, saldo kartu tinggal Rp2.000. Untung sebelum jam 07.00 tarif cuma Rp2.000! Berangkat dari Kampung Rambutan ke Senen untuk belanja di pasar.",
    mode: "plan",
    from: "Kampung Rambutan",
    to: "Senen",
    start: hm(5, 35),
    deadline: hm(7, 40),
    balance: 2000,
    conditions: { corridors: ["k4", "k5", "k7", "k11"] },
    tips: "Kamu hanya bisa tap SEKALI. Jangan keluar halte (jalan kaki) di tengah jalan.",
  },
  {
    id: "m4",
    title: "Arah yang Benar",
    story:
      "Mode real-time dimulai! Kamu di Harmoni, mau ke Pulogadung. Banyak bus lewat Harmoni — pastikan naik koridor dan ARAH yang benar, lalu pilih turun di mana.",
    mode: "live",
    from: "Harmoni",
    to: "Pulogadung",
    start: hm(8, 0),
    deadline: hm(9, 15),
    balance: 10000,
    conditions: { corridors: ["k1", "k2", "k3", "k8"] },
    tips: "Pilih bus di panel, lalu tunggu. Jam berjalan terus — gunakan tombol percepat saat menunggu.",
  },
  {
    id: "m5",
    title: "Lintas Barat–Timur",
    story:
      "Pulang kerja dari Kalideres menuju rumah dekat halte Senen. Jam sibuk sore — rencanakan transfer dengan cermat.",
    mode: "live",
    from: "Kalideres",
    to: "Senen",
    start: hm(17, 0),
    deadline: hm(19, 0),
    balance: 10000,
    conditions: { corridors: ["k1", "k2", "k3", "k5", "k8", "k9"] },
  },
  {
    id: "m6",
    title: "Halte Ditutup",
    story:
      "Pengumuman: Halte Dukuh Atas ditutup sementara karena perbaikan. Kamu harus dari Ragunan ke Monas untuk acara jam 09.15. Cari jalan lain!",
    mode: "live",
    from: "Ragunan",
    to: "Monas",
    start: hm(7, 0),
    deadline: hm(9, 15),
    balance: 10000,
    conditions: { corridors: ["k1", "k3", "k6", "k9"], closedStops: ["Dukuh Atas"] },
    tips: "Bus tetap lewat Dukuh Atas tapi tidak berhenti. Kadang jalan kaki ke halte terdekat bisa jadi jalan pintas — tapi harus tap lagi.",
  },
  {
    id: "m7",
    title: "Macet & Penuh",
    story:
      "Senin pagi. Info lalu lintas: Koridor 9 macet parah (kecepatan 50%) dan bus Koridor 1 sering penuh sesak. Dari Pinang Ranti ke Bundaran HI sebelum jam 09.30.",
    mode: "live",
    from: "Pinang Ranti",
    to: "Bundaran HI",
    start: hm(7, 30),
    deadline: hm(9, 30),
    balance: 10000,
    conditions: {
      corridors: ["k1", "k4", "k6", "k7", "k9"],
      slowCorridors: { k9: 0.5 },
      crowdedCorridors: { k1: 0.5 },
    },
  },
  {
    id: "m8",
    title: "Final: Saldo Mepet",
    story:
      "Janji ketemu teman di Ancol, berangkat dari Ciledug. Saldo cuma Rp3.500 — satu kali tap, tidak boleh keluar halte. Halte Harmoni ditutup dan Koridor 1 penuh sesak.",
    mode: "live",
    from: "Ciledug",
    to: "Ancol",
    start: hm(9, 0),
    deadline: hm(11, 30),
    balance: 3500,
    conditions: {
      corridors: ["k1", "k2", "k5", "k6", "k8", "k9", "k12", "k13"],
      closedStops: ["Harmoni"],
      crowdedCorridors: { k1: 0.6 },
    },
  },
];
