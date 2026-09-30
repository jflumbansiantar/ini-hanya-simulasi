# Penumpang TJ

Game 2D puzzle rute: kamu jadi penumpang Transjakarta yang harus sampai tujuan
tepat waktu, di atas peta Jakarta asli. Dibangun dengan Next.js + Phaser 3.

> Simulasi — jadwal, headway, dan koordinat halte adalah perkiraan, bukan data
> resmi Transjakarta.

## Cara main

- **100 misi dalam 10 bab**, dari termudah ke tersulit. Misi berikutnya
  terbuka setelah misi sebelumnya selesai. Progres (bintang) tersimpan di
  `localStorage`.
- **Mode rencana** (bab 1–2, dan sesekali sesudahnya): jam berhenti selama kamu
  menyusun rencana (naik koridor apa, turun di mana, atau jalan kaki), lalu
  rencana dijalankan.
- **Mode real-time** (bab 3 ke atas): jam berjalan. Di halte, pilih bus yang mau
  ditunggu. Di dalam bus, pilih halte turun lewat panel atau dengan klik halte
  di peta.
- **Tarif mirip TJ**: Rp3.500 per tap (Rp2.000 pukul 05.00–07.00). Transfer di
  halte yang sama gratis. Keluar halte (jalan kaki) berarti harus tap lagi.
- **Rintangan** (diperkenalkan bertahap per bab):
  - 🚦 lampu merah: tambahan menit di ruas tertentu
  - 👥 antrean panjang di halte: bus yang datang mengangkut orang di depanmu dulu
  - 🧍 kapasitas bus (gandeng 150, subkoridor 70): bus penuh tidak bisa dinaiki
  - 🚗 kendaraan pribadi masuk busway: bus melambat di ruas itu
  - ⛔ halte ditutup dan saldo kartu mepet
  - 💥 kecelakaan: busway ditutup sementara, bus lewat lajur umum (lambat) dan
    halte di ruas itu tidak dilayani
  - 🚧 macet imbas kecelakaan di koridor sekitarnya
  - 📢 tawuran/demo di sekitar Gedung MPR/DPR atau Bundaran HI: halte di zona itu
    ditutup selama demo
  - 🚑 penumpang pingsan (kejadian mendadak): bus berhenti 30 menit di halte
    terdekat untuk evakuasi dan bus di belakangnya ikut tertahan; kamu bisa
    menunggu atau turun dan cari jalan lain
  - ⚰️ rombongan jenazah masuk jalur TJ (kejadian mendadak): bus di ruas itu
    tertahan 15 menit

  Kejadian mendadak tidak diumumkan di briefing; saat terjadi, muncul peringatan
  dan game dijeda supaya kamu sempat bereaksi. Hanya ada di misi real-time.
- **Rintangan acak**: setiap kali misi dimulai (atau diulang), letak, jam, dan
  kekuatan rintangan diacak, begitu juga jenis rintangan tambahannya. Tingkat
  kesulitan tetap sama karena mengikuti resep misi (rintangan wajib bab, jumlah
  rintangan, faktor batas waktu), dan bintang dihitung dari rute tercepat versi
  acak itu. 8 misi buatan tangan tetap memakai rintangan tetap.
- **Bintang**: misi gagal kalau lewat batas waktu atau saldo tidak cukup.
  Bintang 1–3 dihitung dari selisih waktu tiba dengan rute tercepat.

Kontrol: geser peta dengan drag, zoom dengan scroll, dan jeda dengan spasi.
Tombol ⏭ melompat ke kejadian berikutnya.

## Menjalankan

```bash
npm install
npm run dev              # http://localhost:3000
npm run build            # build produksi
npm run check:missions      # validasi semua misi (+30 variasi acak per misi)
npm run generate:missions   # buat ulang 100 misi (deterministik)
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
| `lib/game/missions.ts` | Tipe misi, 10 bab |
| `lib/game/missionData.ts` | 100 misi + resep rintangan (hasil generator, jangan diedit manual) |
| `lib/game/obstacles.ts` | Pemasangan rintangan acak sesuai resep (dipakai generator & game) |
| `lib/game/controller.ts` | Penghubung Phaser ↔ React (fase layar, rencana, kecepatan jam) |
| `components/game/phaserGame.ts` | Scene Phaser: ubin peta, koridor, halte, bus, pemain, kamera |
| `components/game/*.tsx` | UI: menu misi, briefing, HUD, panel rencana/real-time, hasil |
| `scripts/generate-missions.ts` | Generator misi: aturan per bab, pemasangan rintangan, misi buatan tangan |
| `scripts/check-missions.ts` | Cek setiap misi punya solusi dan mesin = solver |

Mengubah misi: ubah aturan bab atau daftar misi buatan tangan di
`scripts/generate-missions.ts`, lalu jalankan `npm run generate:missions`.
Generator hanya menerima misi yang bisa diselesaikan, rintangannya benar-benar
berpengaruh, dan hasil mesin game sama dengan solver. Batas waktu = durasi rute
tercepat × faktor longgar bab (2,0× di bab 1 sampai 1,28× di bab 10).
