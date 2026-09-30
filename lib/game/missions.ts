import type { Conditions } from "./world";
import { MISSION_DATA } from "./missionData";
import type { Recipe } from "./obstacles";

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
  /** Resep rintangan; kalau ada, rintangan diacak ulang setiap kali misi dimainkan. */
  recipe?: Recipe;
}

export interface Chapter {
  title: string;
  blurb: string;
}

/** 10 bab × 10 misi, dari termudah ke tersulit. */
export const CHAPTERS: Chapter[] = [
  { title: "Kenalan dengan TJ", blurb: "Rute langsung tanpa transfer, mode rencana." },
  { title: "Belajar Transit", blurb: "Satu kali transfer. Awas lampu merah." },
  { title: "Jam Berjalan", blurb: "Mode real-time dimulai. Halte mulai ramai antrean." },
  { title: "Jam Sibuk", blurb: "Kapasitas bus terbatas — bus penuh tidak bisa dinaiki." },
  { title: "Busway Diserobot", blurb: "Kendaraan pribadi masuk jalur TJ dan memperlambat bus." },
  { title: "Akhir Bulan", blurb: "Halte ditutup, jalan kaki, dan saldo kartu mepet." },
  { title: "Kecelakaan!", blurb: "Jalur TJ ditutup sementara, bus lewat lajur umum." },
  { title: "Efek Domino", blurb: "Kecelakaan memicu macet di koridor sekitarnya." },
  { title: "Kota Sibuk", blurb: "Semua rintangan bercampur, rute makin panjang." },
  { title: "Master Penumpang", blurb: "Tantangan terakhir: rintangan terberat, waktu paling mepet." },
];

export const MISSIONS_PER_CHAPTER = 10;

/**
 * Misi dihasilkan oleh scripts/generate-missions.ts (seed tetap) dan sudah
 * divalidasi solver: setiap misi bisa diselesaikan sebelum batas waktu dengan
 * saldo yang ada. Jalankan `npm run check:missions` setelah mengubahnya.
 */
export const MISSIONS: Mission[] = MISSION_DATA;

/** Posisi misi (0-based) berdasarkan id — misi yang diacak adalah salinan, jadi jangan pakai indexOf. */
export function missionIndex(id: string): number {
  return MISSIONS.findIndex((m) => m.id === id);
}
