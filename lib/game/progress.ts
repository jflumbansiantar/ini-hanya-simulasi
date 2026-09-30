// Progres (bintang terbaik per misi) disimpan di localStorage browser.
// Semua akses dibungkus try/catch: mode privat / storage diblokir tetap
// bisa main, hanya progresnya tidak tersimpan.
const KEY = "tj-game-progress-v1";

export type Progress = Record<string, number>; // missionId -> bintang terbaik (1..3)

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // abaikan
  }
}
