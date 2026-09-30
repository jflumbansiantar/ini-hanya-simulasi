# Penumpang TJ

Game 2D puzzle rute: kamu jadi penumpang Transjakarta yang harus sampai tujuan
tepat waktu, di atas peta Jakarta asli. Dibangun dengan Next.js + Phaser 3.

> Simulasi — jadwal, headway, dan koordinat halte adalah perkiraan, bukan data
> resmi Transjakarta.

## Cara main

- **8 misi berurutan**, dari mudah ke sulit. Misi berikutnya terbuka setelah
  misi sebelumnya selesai. Progres (bintang) tersimpan di `localStorage`.
- **Mode rencana** (misi 1–3): jam berhenti selama kamu menyusun rencana
  (naik koridor apa, turun di mana, atau jalan kaki), lalu rencana dijalankan.
- **Mode real-time** (misi 4–8): jam berjalan. Di halte, pilih bus yang mau
  ditunggu. Di dalam bus, pilih halte turun lewat panel atau dengan klik halte
  di peta.
- **Tarif mirip TJ**: Rp3.500 per tap (Rp2.000 pukul 05.00–07.00). Transfer di
  halte yang sama gratis. Keluar halte (jalan kaki) berarti harus tap lagi.
- **Event**: halte ditutup, koridor macet (bus lebih lambat), dan bus penuh
  (tidak bisa naik, tunggu bus berikutnya).
- **Bintang**: misi gagal kalau lewat batas waktu atau saldo tidak cukup.
  Bintang 1–3 dihitung dari selisih waktu tiba dengan rute tercepat.

Kontrol: geser peta dengan drag, zoom dengan scroll, dan jeda dengan spasi.
Tombol ⏭ melompat ke kejadian berikutnya.

## Menjalankan

```bash
npm install
npm run dev              # http://localhost:3000
npm run build            # build produksi
npm run check:missions   # validasi semua misi bisa diselesaikan
```

Ubin peta dimuat langsung dari CARTO (`basemaps.cartocdn.com`). Tanpa akses
internet, game tetap bisa dimainkan dengan latar gelap polos.

## Struktur

| Path | Isi |
|---|---|
| `lib/corridors.ts` | Data 106 koridor & subkoridor (halte, headway, jam operasi) |
| `lib/corridorPaths.ts` | Geometri jalan per koridor (hasil `scripts/fetch-road-geometry.js`) |
| `lib/simulation.ts` | Jarak, meta koridor, posisi di sepanjang jalur |
| `lib/game/world.ts` | Jadwal bus per arah, kondisi misi (halte tutup, macet, penuh), jalan kaki, tarif |
| `lib/game/session.ts` | Mesin permainan deterministik: state pemain, perintah, jam |
| `lib/game/solver.ts` | Rute tercepat (kunci jawaban bintang) dengan aturan yang sama persis |
| `lib/game/missions.ts` | Daftar misi |
| `lib/game/controller.ts` | Penghubung Phaser ↔ React (fase layar, rencana, kecepatan jam) |
| `components/game/phaserGame.ts` | Scene Phaser: ubin peta, koridor, halte, bus, pemain, kamera |
| `components/game/*.tsx` | UI: menu misi, briefing, HUD, panel rencana/real-time, hasil |
| `scripts/check-missions.ts` | Cek setiap misi punya solusi dan mesin = solver |

Menambah misi: tambahkan entri di `lib/game/missions.ts`, lalu jalankan
`npm run check:missions` untuk memastikan misi bisa diselesaikan dan batas
waktunya masuk akal. Batas waktu idealnya sekitar 1,5× durasi rute tercepat.
