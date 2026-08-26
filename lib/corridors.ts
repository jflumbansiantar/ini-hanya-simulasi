export interface Stop {
  n: string;
  lat: number;
  lng: number;
}

export interface Corridor {
  id: string;
  name: string;
  route: string;
  color: string;
  headway: number; // menit antar keberangkatan
  activeStart: number; // menit sejak 00:00
  activeEnd: number;
  defaultVisible: boolean;
  stops: Stop[];
  /**
   * Diisi untuk subkoridor/rute pengumpan non-BRT (mis. "1A" turunan "k1").
   * Tidak dihitung sebagai salah satu dari 13 koridor trunk. Royaltrans/APTB
   * tetap di luar scope (lihat PRD §2.2) — hanya rute pengumpan reguler
   * bermerek Transjakarta yang dimasukkan di sini.
   */
  parentId?: string;
  /**
   * true untuk 13 koridor trunk (k1..k13) yang punya varian AMARI (Angkutan
   * Malam Hari) resmi Transjakarta, beroperasi 22.00–05.00 dengan kode
   * terpisah M1–M13 (mis. M9 = versi malam Koridor 9). Subkoridor tidak
   * pernah AMARI — layanan ini spesifik ke rute trunk. Field ini murni
   * informasional (badge di panel), TIDAK mengubah activeStart/activeEnd
   * simulasi — lihat PRD §3 "Penanda AMARI".
   */
  amari?: boolean;
}

/**
 * Rute (nama & arah) diverifikasi dari sumber publik. Koordinat halte =
 * perkiraan berbasis pengetahuan geografis umum, BUKAN hasil digitasi
 * GTFS resmi. totalKm & durationMin dihitung otomatis dari koordinat ini
 * di lib/simulation.ts, tidak di-hardcode.
 */
export const CORRIDORS: Corridor[] = [
  {
    id: "k1", name: "Koridor 1", route: "Blok M – Kota", color: "#E63946", amari: true,
    headway: 8, activeStart: 270, activeEnd: 1410, defaultVisible: true,
    stops: [
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
      { n: "ASEAN", lat: -6.2360, lng: 106.7995 },
      { n: "Senayan", lat: -6.2247, lng: 106.8017 },
      { n: "Karet", lat: -6.2105, lng: 106.8140 },
      { n: "Dukuh Atas", lat: -6.2010, lng: 106.8230 },
      { n: "Bundaran HI", lat: -6.1954, lng: 106.8232 },
      { n: "Sarinah", lat: -6.1875, lng: 106.8230 },
      { n: "Monas", lat: -6.1754, lng: 106.8272 },
      { n: "Harmoni", lat: -6.1655, lng: 106.8168 },
      { n: "Glodok", lat: -6.1500, lng: 106.8140 },
      { n: "Kota", lat: -6.1370, lng: 106.8133 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 1 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Royaltrans 1K/1T sengaja
  // tidak dimasukkan (lihat PRD §2.2 Non-Goals).
  {
    id: "k1a", name: "1A", route: "Pantai Maju – Balai Kota", color: "#FF6B6B", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Pantai Maju", lat: -6.0950, lng: 106.7300 },
      { n: "PIK", lat: -6.1090, lng: 106.7420 },
      { n: "Pluit", lat: -6.1230, lng: 106.7920 },
      { n: "Kota", lat: -6.1370, lng: 106.8133 },
      { n: "Glodok", lat: -6.1500, lng: 106.8140 },
      { n: "Harmoni", lat: -6.1655, lng: 106.8168 },
      { n: "Monas", lat: -6.1754, lng: 106.8272 },
      { n: "Balai Kota", lat: -6.1780, lng: 106.8290 },
    ],
  },
  {
    id: "k1b", name: "1B", route: "Stasiun Palmerah – Transport Hub Dukuh Atas", color: "#C1121F", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Stasiun Palmerah", lat: -6.1945, lng: 106.7975 },
      { n: "Slipi", lat: -6.1870, lng: 106.8060 },
      { n: "Petamburan", lat: -6.1830, lng: 106.8130 },
      { n: "Tanah Abang", lat: -6.1860, lng: 106.8130 },
      { n: "Karet", lat: -6.2105, lng: 106.8140 },
      { n: "Dukuh Atas", lat: -6.2010, lng: 106.8230 },
    ],
  },
  {
    id: "k1c", name: "1C", route: "Pesanggrahan – Blok M", color: "#FF8FA3", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Pesanggrahan", lat: -6.2320, lng: 106.7580 },
      { n: "Cipulir", lat: -6.2320, lng: 106.7660 },
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k1e", name: "1E", route: "Pondok Labu – Blok M", color: "#D00000", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Pondok Labu", lat: -6.2970, lng: 106.7990 },
      { n: "Fatmawati", lat: -6.2830, lng: 106.7970 },
      { n: "Cipete", lat: -6.2700, lng: 106.7990 },
      { n: "Gandaria", lat: -6.2500, lng: 106.7950 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k1f", name: "1F", route: "Stasiun Palmerah – Bundaran Senayan", color: "#E85D75", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Stasiun Palmerah", lat: -6.1945, lng: 106.7975 },
      { n: "Bundaran Senayan", lat: -6.2200, lng: 106.8010 },
    ],
  },
  {
    id: "k1h", name: "1H", route: "Tanah Abang – Stasiun Gondangdia", color: "#F25C54", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Tanah Abang", lat: -6.1860, lng: 106.8130 },
      { n: "Kebon Sirih", lat: -6.1830, lng: 106.8230 },
      { n: "Stasiun Gondangdia", lat: -6.1850, lng: 106.8330 },
    ],
  },
  {
    id: "k1m", name: "1M", route: "Meruya – Blok M", color: "#A4133C", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Meruya", lat: -6.1930, lng: 106.7460 },
      { n: "Joglo", lat: -6.2100, lng: 106.7550 },
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k1p", name: "1P", route: "Senen – Blok M", color: "#FF4D6D", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Senen", lat: -6.1755, lng: 106.8420 },
      { n: "Dukuh Atas", lat: -6.2010, lng: 106.8230 },
      { n: "Senayan", lat: -6.2247, lng: 106.8017 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k1q", name: "1Q", route: "Rempoa – Blok M", color: "#9D0208", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Rempoa", lat: -6.2980, lng: 106.7550 },
      { n: "Bintaro", lat: -6.2750, lng: 106.7650 },
      { n: "Radio Dalam", lat: -6.2650, lng: 106.7850 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k1r", name: "1R", route: "Senen – Tanah Abang", color: "#E76F51", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Senen", lat: -6.1755, lng: 106.8420 },
      { n: "Kwitang", lat: -6.1810, lng: 106.8330 },
      { n: "Tanah Abang", lat: -6.1860, lng: 106.8130 },
    ],
  },
  {
    id: "k1w", name: "1W", route: "Blok M – Ancol", color: "#EF476F", parentId: "k1",
    headway: 15, activeStart: 300, activeEnd: 1380, defaultVisible: false,
    stops: [
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
      { n: "Bundaran HI", lat: -6.1954, lng: 106.8232 },
      { n: "Monas", lat: -6.1754, lng: 106.8272 },
      { n: "Kemayoran", lat: -6.1590, lng: 106.8480 },
      { n: "Ancol", lat: -6.1250, lng: 106.8390 },
    ],
  },
  {
    id: "k2", name: "Koridor 2", route: "Harmoni – Pulogadung", color: "#F3722C", amari: true,
    headway: 10, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Harmoni", lat: -6.1655, lng: 106.8168 },
      { n: "Sawah Besar", lat: -6.1585, lng: 106.8250 },
      { n: "Pasar Baru", lat: -6.1660, lng: 106.8330 },
      { n: "Senen", lat: -6.1755, lng: 106.8420 },
      { n: "Cempaka Mas", lat: -6.1815, lng: 106.8660 },
      { n: "Pulomas", lat: -6.1900, lng: 106.8850 },
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 2 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Rute "2C: Balai Kota –
  // JIEXPO Kemayoran" sengaja TIDAK dimasukkan — itu layanan musiman khusus
  // Jakarta Fair (jam operasi terbatas ke periode event), bukan rute harian
  // permanen seperti subkoridor lain di sini, jadi bukan Royaltrans tapi
  // tetap beda kelas layanan. Tidak ada rute Royaltrans di bawah Koridor 2.
  {
    id: "k2a", name: "2A", route: "Pulo Gadung – Rawa Buaya", color: "#FB8500", parentId: "k2",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
      { n: "Cempaka Mas", lat: -6.1815, lng: 106.8660 },
      { n: "Sawah Besar", lat: -6.1585, lng: 106.8250 },
      { n: "Harmoni", lat: -6.1655, lng: 106.8168 },
      { n: "Grogol", lat: -6.1630, lng: 106.7900 },
      { n: "Rawa Buaya", lat: -6.1520, lng: 106.7350 },
    ],
  },
  {
    id: "k2b", name: "2B", route: "Transera Harapan Indah – Pulo Gadung", color: "#FF9E00", parentId: "k2",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Harapan Indah", lat: -6.1670, lng: 106.9800 },
      { n: "Kayu Tinggi", lat: -6.1780, lng: 106.9350 },
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
    ],
  },
  {
    id: "k2f", name: "2F", route: "Pulo Gadung – Rusun Cakung Barat", color: "#E85D04", parentId: "k2",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
      { n: "Rusun Cakung Barat", lat: -6.1740, lng: 106.9470 },
    ],
  },
  {
    id: "k2h", name: "2H", route: "Rusun Jati Rawasari – Senen", color: "#FFB627", parentId: "k2",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Jati Rawasari", lat: -6.1830, lng: 106.8620 },
      { n: "Cempaka Putih", lat: -6.1810, lng: 106.8660 },
      { n: "Senen", lat: -6.1755, lng: 106.8420 },
    ],
  },
  {
    id: "k2p", name: "2P", route: "Terminal Senen – Stasiun Gondangdia", color: "#FAA307", parentId: "k2",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Senen", lat: -6.1755, lng: 106.8420 },
      { n: "Kwitang", lat: -6.1810, lng: 106.8330 },
      { n: "Stasiun Gondangdia", lat: -6.1850, lng: 106.8330 },
    ],
  },
  {
    id: "k2q", name: "2Q", route: "Gondangdia – Balai Kota", color: "#FFC300", parentId: "k2",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Stasiun Gondangdia", lat: -6.1850, lng: 106.8330 },
      { n: "Monas", lat: -6.1754, lng: 106.8272 },
      { n: "Balai Kota", lat: -6.1780, lng: 106.8290 },
    ],
  },
  {
    id: "k3", name: "Koridor 3", route: "Kalideres – Monas (via Veteran)", color: "#F9C74F", amari: true,
    headway: 12, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kalideres", lat: -6.1530, lng: 106.7020 },
      { n: "Rawa Buaya", lat: -6.1520, lng: 106.7350 },
      { n: "Jembatan Baru", lat: -6.1500, lng: 106.7650 },
      { n: "Grogol", lat: -6.1630, lng: 106.7900 },
      { n: "Tomang", lat: -6.1780, lng: 106.7970 },
      { n: "Harmoni", lat: -6.1655, lng: 106.8168 },
      { n: "Monas", lat: -6.1754, lng: 106.8272 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 3 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Tidak ada rute Royaltrans
  // di bawah Koridor 3.
  {
    id: "k3a", name: "3A", route: "Rusun Pesakih – Kalideres", color: "#F2C14E", parentId: "k3",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Pesakih", lat: -6.1450, lng: 106.6950 },
      { n: "Kalideres", lat: -6.1530, lng: 106.7020 },
    ],
  },
  {
    id: "k3b", name: "3B", route: "Rusun Flamboyan – Cengkareng", color: "#E9C46A", parentId: "k3",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Flamboyan", lat: -6.1480, lng: 106.7280 },
      { n: "Cengkareng", lat: -6.1500, lng: 106.7300 },
    ],
  },
  {
    id: "k3c", name: "3C", route: "Rusun Kapuk Muara – Penjaringan", color: "#EFB700", parentId: "k3",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Kapuk Muara", lat: -6.1030, lng: 106.7370 },
      { n: "Penjaringan", lat: -6.1220, lng: 106.8080 },
    ],
  },
  {
    id: "k3d", name: "3D", route: "Taman Kota – Penjaringan via Tubagus Angke", color: "#DDA448", parentId: "k3",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Taman Kota", lat: -6.1590, lng: 106.7550 },
      { n: "Tubagus Angke", lat: -6.1350, lng: 106.7850 },
      { n: "Penjaringan", lat: -6.1220, lng: 106.8080 },
    ],
  },
  {
    id: "k3e", name: "3E", route: "Sentraland Cengkareng – Puri Kembangan", color: "#C9A227", parentId: "k3",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Sentraland Cengkareng", lat: -6.1450, lng: 106.7250 },
      { n: "Puri Kembangan", lat: -6.1850, lng: 106.7450 },
    ],
  },
  {
    id: "k3f", name: "3F", route: "Kalideres – Senayan Bank Jakarta", color: "#FFCB69", parentId: "k3",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kalideres", lat: -6.1530, lng: 106.7020 },
      { n: "Rawa Buaya", lat: -6.1520, lng: 106.7350 },
      { n: "Grogol", lat: -6.1630, lng: 106.7900 },
      { n: "Tomang", lat: -6.1780, lng: 106.7970 },
      { n: "Senayan Bank Jakarta", lat: -6.2190, lng: 106.8020 },
    ],
  },
  {
    id: "k3h", name: "3H", route: "Damai – Kota", color: "#D4A017", parentId: "k3",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Damai", lat: -6.1150, lng: 106.8850 },
      { n: "Kota", lat: -6.1370, lng: 106.8133 },
    ],
  },
  {
    id: "k4", name: "Koridor 4", route: "Pulogadung – Dukuh Atas 2", color: "#90BE6D", amari: true,
    headway: 10, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
      { n: "Klender", lat: -6.1980, lng: 106.8870 },
      { n: "Cipinang", lat: -6.1970, lng: 106.8700 },
      { n: "Pramuka", lat: -6.1920, lng: 106.8570 },
      { n: "Matraman", lat: -6.1990, lng: 106.8500 },
      { n: "Manggarai", lat: -6.2085, lng: 106.8500 },
      { n: "Dukuh Atas", lat: -6.2010, lng: 106.8230 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 4 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Tidak ada rute Royaltrans
  // di bawah Koridor 4.
  {
    id: "k4b", name: "4B", route: "Stasiun Manggarai – Universitas Indonesia", color: "#B5E48C", parentId: "k4",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Manggarai", lat: -6.2085, lng: 106.8500 },
      { n: "Universitas Indonesia", lat: -6.3624, lng: 106.8306 },
    ],
  },
  {
    id: "k4c", name: "4C", route: "JIEP – Bundaran Senayan", color: "#99D98C", parentId: "k4",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "JIEP", lat: -6.1850, lng: 106.9150 },
      { n: "Cempaka Mas", lat: -6.1815, lng: 106.8660 },
      { n: "Senen", lat: -6.1755, lng: 106.8420 },
      { n: "Bundaran Senayan", lat: -6.2200, lng: 106.8010 },
    ],
  },
  {
    id: "k4d", name: "4D", route: "Pulo Gadung – Patra Kuningan", color: "#76C893", parentId: "k4",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
      { n: "Cipinang", lat: -6.1970, lng: 106.8700 },
      { n: "Patra Kuningan", lat: -6.2270, lng: 106.8300 },
    ],
  },
  {
    id: "k4e", name: "4E", route: "Rusun Jatinegara Kaum – Pulo Gadung", color: "#52B788", parentId: "k4",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Jatinegara Kaum", lat: -6.1950, lng: 106.8850 },
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
    ],
  },
  {
    id: "k4f", name: "4F", route: "Pinang Ranti – Pulo Gadung", color: "#74C69D", parentId: "k4",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pinang Ranti", lat: -6.2820, lng: 106.8770 },
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
    ],
  },
  {
    id: "k4k", name: "4K", route: "Pulo Gadung – Kejaksaan Agung", color: "#6A994E", parentId: "k4",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
      { n: "Matraman", lat: -6.1990, lng: 106.8500 },
      { n: "Kejaksaan Agung", lat: -6.2310, lng: 106.7970 },
    ],
  },
  {
    id: "k5", name: "Koridor 5", route: "Ancol – Kampung Melayu", color: "#43AA8B", amari: true,
    headway: 9, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Ancol", lat: -6.1250, lng: 106.8390 },
      { n: "Kemayoran", lat: -6.1590, lng: 106.8480 },
      { n: "Senen", lat: -6.1755, lng: 106.8420 },
      { n: "Matraman", lat: -6.1990, lng: 106.8500 },
      { n: "Jatinegara", lat: -6.2140, lng: 106.8700 },
      { n: "Kampung Melayu", lat: -6.2245, lng: 106.8600 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 5 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Tidak ada rute Royaltrans
  // di bawah Koridor 5.
  {
    id: "k5b", name: "5B", route: "Stasiun Tebet – Bidara Cina", color: "#2D6A4F", parentId: "k5",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Stasiun Tebet", lat: -6.2255, lng: 106.8505 },
      { n: "Bidara Cina", lat: -6.2270, lng: 106.8680 },
    ],
  },
  {
    id: "k5c", name: "5C", route: "Cililitan – Juanda", color: "#3A5A40", parentId: "k5",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "PGC (Cililitan)", lat: -6.2600, lng: 106.8620 },
      { n: "Matraman", lat: -6.1990, lng: 106.8500 },
      { n: "Juanda", lat: -6.1670, lng: 106.8300 },
    ],
  },
  {
    id: "k5f", name: "5F", route: "Kampung Melayu – Tanah Abang (via Casablanca)", color: "#588157", parentId: "k5",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kampung Melayu", lat: -6.2245, lng: 106.8600 },
      { n: "Casablanca", lat: -6.2210, lng: 106.8390 },
      { n: "Tanah Abang", lat: -6.1860, lng: 106.8130 },
    ],
  },
  {
    id: "k5m", name: "5M", route: "Kampung Melayu – Tanah Abang (via Cikini)", color: "#6B9080", parentId: "k5",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kampung Melayu", lat: -6.2245, lng: 106.8600 },
      { n: "Cikini", lat: -6.1930, lng: 106.8390 },
      { n: "Tanah Abang", lat: -6.1860, lng: 106.8130 },
    ],
  },
  {
    id: "k5n", name: "5N", route: "Ragunan – Kampung Melayu", color: "#A4C3B2", parentId: "k5",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Ragunan", lat: -6.3010, lng: 106.8210 },
      { n: "Kampung Melayu", lat: -6.2245, lng: 106.8600 },
    ],
  },
  {
    id: "k6", name: "Koridor 6", route: "Ragunan – Dukuh Atas 2", color: "#4D908E", amari: true,
    headway: 8, activeStart: 280, activeEnd: 1380, defaultVisible: true,
    stops: [
      { n: "Ragunan", lat: -6.3010, lng: 106.8210 },
      { n: "Dept. Pertanian", lat: -6.2900, lng: 106.8210 },
      { n: "Warung Jati", lat: -6.2700, lng: 106.8280 },
      { n: "Mampang", lat: -6.2480, lng: 106.8250 },
      { n: "Pancoran", lat: -6.2440, lng: 106.8390 },
      { n: "Kuningan", lat: -6.2250, lng: 106.8330 },
      { n: "Dukuh Atas", lat: -6.2010, lng: 106.8230 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 6 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Royaltrans 6P sengaja tidak
  // dimasukkan (lihat PRD §2.2 Non-Goals).
  {
    id: "k6a", name: "6A", route: "Ragunan – Balai Kota via Kuningan", color: "#2A9D8F", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Ragunan", lat: -6.3010, lng: 106.8210 },
      { n: "Warung Jati", lat: -6.2700, lng: 106.8280 },
      { n: "Mampang", lat: -6.2480, lng: 106.8250 },
      { n: "Kuningan", lat: -6.2250, lng: 106.8330 },
      { n: "Epicentrum", lat: -6.2230, lng: 106.8300 },
      { n: "Dukuh Atas", lat: -6.2010, lng: 106.8230 },
      { n: "Balai Kota", lat: -6.1780, lng: 106.8290 },
    ],
  },
  {
    id: "k6b", name: "6B", route: "Ragunan – Balai Kota via Semanggi", color: "#52B69A", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Ragunan", lat: -6.3010, lng: 106.8210 },
      { n: "Warung Jati", lat: -6.2700, lng: 106.8280 },
      { n: "Mampang", lat: -6.2480, lng: 106.8250 },
      { n: "Semanggi", lat: -6.2220, lng: 106.8080 },
      { n: "Bundaran HI", lat: -6.1954, lng: 106.8232 },
      { n: "Balai Kota", lat: -6.1780, lng: 106.8290 },
    ],
  },
  {
    id: "k6c", name: "6C", route: "Stasiun Tebet – Kuningan", color: "#168AAD", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Stasiun Tebet", lat: -6.2255, lng: 106.8505 },
      { n: "Casablanca", lat: -6.2210, lng: 106.8390 },
      { n: "Kuningan", lat: -6.2250, lng: 106.8330 },
    ],
  },
  {
    id: "k6d", name: "6D", route: "Stasiun Tebet – Bundaran Senayan", color: "#34A0A4", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Stasiun Tebet", lat: -6.2255, lng: 106.8505 },
      { n: "Manggarai", lat: -6.2085, lng: 106.8500 },
      { n: "Karet", lat: -6.2105, lng: 106.8140 },
      { n: "Bundaran Senayan", lat: -6.2200, lng: 106.8010 },
    ],
  },
  {
    id: "k6h", name: "6H", route: "Senen – Lebak Bulus", color: "#1B998B", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Senen", lat: -6.1755, lng: 106.8420 },
      { n: "Matraman", lat: -6.1990, lng: 106.8500 },
      { n: "Kuningan", lat: -6.2250, lng: 106.8330 },
      { n: "Mampang", lat: -6.2480, lng: 106.8250 },
      { n: "Fatmawati", lat: -6.2830, lng: 106.7970 },
      { n: "Lebak Bulus", lat: -6.2890, lng: 106.7750 },
    ],
  },
  {
    id: "k6k", name: "6K", route: "Kuningan – Karet", color: "#40916C", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kuningan", lat: -6.2250, lng: 106.8330 },
      { n: "Karet Kuningan", lat: -6.2135, lng: 106.8285 },
      { n: "Karet", lat: -6.2105, lng: 106.8140 },
    ],
  },
  {
    id: "k6m", name: "6M", route: "Stasiun Manggarai – Blok M", color: "#0096C7", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Stasiun Manggarai", lat: -6.2085, lng: 106.8500 },
      { n: "Kuningan", lat: -6.2250, lng: 106.8330 },
      { n: "Semanggi", lat: -6.2220, lng: 106.8080 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k6n", name: "6N", route: "Ragunan – Blok M via Kemang", color: "#38A3A5", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Ragunan", lat: -6.3010, lng: 106.8210 },
      { n: "Warung Jati", lat: -6.2700, lng: 106.8280 },
      { n: "Kemang", lat: -6.2600, lng: 106.8140 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k6q", name: "6Q", route: "Dukuh Atas – Casablanca via Epicentrum", color: "#48CAE4", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Dukuh Atas", lat: -6.2010, lng: 106.8230 },
      { n: "Epicentrum", lat: -6.2230, lng: 106.8300 },
      { n: "Casablanca", lat: -6.2210, lng: 106.8390 },
    ],
  },
  {
    id: "k6t", name: "6T", route: "Pasar Minggu – Velbak via Kebon Jeruk", color: "#006D77", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pasar Minggu", lat: -6.2830, lng: 106.8420 },
      { n: "Fatmawati", lat: -6.2830, lng: 106.7970 },
      { n: "Kebon Jeruk", lat: -6.1920, lng: 106.7680 },
      { n: "Velbak", lat: -6.2420, lng: 106.7810 },
    ],
  },
  {
    id: "k6u", name: "6U", route: "Blok M – Pasar Minggu", color: "#83C5BE", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
      { n: "Fatmawati", lat: -6.2830, lng: 106.7970 },
      { n: "Pasar Minggu", lat: -6.2830, lng: 106.8420 },
    ],
  },
  {
    id: "k6v", name: "6V", route: "Ragunan – Senayan Bank Jakarta", color: "#0A9396", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Ragunan", lat: -6.3010, lng: 106.8210 },
      { n: "Warung Jati", lat: -6.2700, lng: 106.8280 },
      { n: "Mampang", lat: -6.2480, lng: 106.8250 },
      { n: "Semanggi", lat: -6.2220, lng: 106.8080 },
      { n: "Senayan Bank Jakarta", lat: -6.2190, lng: 106.8020 },
    ],
  },
  {
    id: "k6w", name: "6W", route: "Duren Tiga – Blok M via Bangka Raya", color: "#1D7874", parentId: "k6",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Duren Tiga", lat: -6.2450, lng: 106.8270 },
      { n: "Bangka Raya", lat: -6.2540, lng: 106.8190 },
      { n: "Melawai", lat: -6.2440, lng: 106.8020 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k7", name: "Koridor 7", route: "Kampung Rambutan – Kampung Melayu", color: "#577590", amari: true,
    headway: 10, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kampung Rambutan", lat: -6.3040, lng: 106.8620 },
      { n: "Pasar Rebo", lat: -6.2980, lng: 106.8560 },
      { n: "Kalibata", lat: -6.2620, lng: 106.8460 },
      { n: "Tebet", lat: -6.2260, lng: 106.8500 },
      { n: "Cawang", lat: -6.2430, lng: 106.8620 },
      { n: "Kampung Melayu", lat: -6.2245, lng: 106.8600 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 7 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Tidak ada rute Royaltrans
  // di bawah Koridor 7.
  {
    id: "k7a", name: "7A", route: "Kampung Rambutan – Lebak Bulus", color: "#5D7A9E", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kampung Rambutan", lat: -6.3040, lng: 106.8620 },
      { n: "Ragunan", lat: -6.3010, lng: 106.8210 },
      { n: "Lebak Bulus", lat: -6.2890, lng: 106.7750 },
    ],
  },
  {
    id: "k7b", name: "7B", route: "Kampung Rambutan – Blok M", color: "#6B8CAF", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kampung Rambutan", lat: -6.3040, lng: 106.8620 },
      { n: "Pasar Minggu", lat: -6.2830, lng: 106.8420 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k7c", name: "7C", route: "Cibubur – Cawang Cililitan", color: "#4C6685", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Cibubur", lat: -6.3690, lng: 106.8930 },
      { n: "Cawang Cililitan", lat: -6.2500, lng: 106.8630 },
    ],
  },
  {
    id: "k7d", name: "7D", route: "TMII – Pancoran", color: "#7A9BC2", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "TMII", lat: -6.3025, lng: 106.8951 },
      { n: "Cawang", lat: -6.2430, lng: 106.8620 },
      { n: "Pancoran", lat: -6.2440, lng: 106.8390 },
    ],
  },
  {
    id: "k7e", name: "7E", route: "Kampung Rambutan – Ragunan", color: "#3D5570", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kampung Rambutan", lat: -6.3040, lng: 106.8620 },
      { n: "Ragunan", lat: -6.3010, lng: 106.8210 },
    ],
  },
  {
    id: "k7f", name: "7F", route: "Kampung Rambutan – Juanda via Cempaka Putih", color: "#8FADD1", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kampung Rambutan", lat: -6.3040, lng: 106.8620 },
      { n: "Cempaka Putih", lat: -6.1810, lng: 106.8660 },
      { n: "Juanda", lat: -6.1670, lng: 106.8300 },
    ],
  },
  {
    id: "k7p", name: "7P", route: "Pondok Kelapa – Cawang Cililitan", color: "#2E455E", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pondok Kelapa", lat: -6.2280, lng: 106.9080 },
      { n: "Cawang Cililitan", lat: -6.2500, lng: 106.8630 },
    ],
  },
  {
    id: "k7q", name: "7Q", route: "Blok M – Cawang Cililitan", color: "#A3C0E0", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
      { n: "Pancoran", lat: -6.2440, lng: 106.8390 },
      { n: "Cawang Cililitan", lat: -6.2500, lng: 106.8630 },
    ],
  },
  {
    id: "k7r", name: "7R", route: "Cibubur – Pluit", color: "#55708F", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Cibubur", lat: -6.3690, lng: 106.8930 },
      { n: "Cawang", lat: -6.2430, lng: 106.8620 },
      { n: "Semanggi", lat: -6.2220, lng: 106.8080 },
      { n: "Pluit", lat: -6.1230, lng: 106.7920 },
    ],
  },
  {
    id: "k7t", name: "7T", route: "Cibubur – Tanjung Priok", color: "#6F94BC", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Cibubur", lat: -6.3690, lng: 106.8930 },
      { n: "Cawang", lat: -6.2430, lng: 106.8620 },
      { n: "Tanjung Priok", lat: -6.1110, lng: 106.8800 },
    ],
  },
  {
    id: "k7u", name: "7U", route: "Cibubur – Ancol", color: "#405C7A", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Cibubur", lat: -6.3690, lng: 106.8930 },
      { n: "Cawang", lat: -6.2430, lng: 106.8620 },
      { n: "Ancol", lat: -6.1250, lng: 106.8390 },
    ],
  },
  {
    id: "k7v", name: "7V", route: "Cibubur – Kampung Rambutan", color: "#83A6CC", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Cibubur", lat: -6.3690, lng: 106.8930 },
      { n: "Kampung Rambutan", lat: -6.3040, lng: 106.8620 },
    ],
  },
  {
    id: "k7w", name: "7W", route: "Cawang – Stasiun Kereta Cepat Halim", color: "#365174", parentId: "k7",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Cawang", lat: -6.2430, lng: 106.8620 },
      { n: "Stasiun Kereta Cepat Halim", lat: -6.2660, lng: 106.8890 },
    ],
  },
  {
    id: "k8", name: "Koridor 8", route: "Lebak Bulus – Pasar Baru", color: "#277DA1", amari: true,
    headway: 9, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Lebak Bulus", lat: -6.2890, lng: 106.7750 },
      { n: "Pondok Pinang", lat: -6.2660, lng: 106.7830 },
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Kelapa Dua", lat: -6.2100, lng: 106.7800 },
      { n: "Pos Pengumben", lat: -6.1990, lng: 106.7850 },
      { n: "Palmerah", lat: -6.1930, lng: 106.7970 },
      { n: "Slipi", lat: -6.1870, lng: 106.8060 },
      { n: "Petamburan", lat: -6.1830, lng: 106.8130 },
      { n: "Harmoni", lat: -6.1655, lng: 106.8168 },
      { n: "Pasar Baru", lat: -6.1660, lng: 106.8330 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 8 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Rute "8A: Jelambar – Pasar
  // Baru" muncul di Wikipedia tapi TIDAK ada di listing langsung
  // transjakarta.co.id/rute saat diverifikasi — sengaja tidak dimasukkan.
  // Tidak ada rute Royaltrans di bawah Koridor 8.
  {
    id: "k8c", name: "8C", route: "Kebayoran Lama – Tanah Abang", color: "#1A6E96", parentId: "k8",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Palmerah", lat: -6.1930, lng: 106.7970 },
      { n: "Tanah Abang", lat: -6.1860, lng: 106.8130 },
    ],
  },
  {
    id: "k8d", name: "8D", route: "Meruya Selatan – Blok M", color: "#2E8FBF", parentId: "k8",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Meruya Selatan", lat: -6.2050, lng: 106.7500 },
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k8e", name: "8E", route: "Bintaro – Blok M", color: "#0F5A80", parentId: "k8",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Bintaro", lat: -6.2750, lng: 106.7650 },
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Blok M", lat: -6.2440, lng: 106.7997 },
    ],
  },
  {
    id: "k8k", name: "8K", route: "Batusari – Grogol", color: "#4FA8D1", parentId: "k8",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Batusari", lat: -6.2950, lng: 106.7350 },
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Grogol", lat: -6.1630, lng: 106.7900 },
    ],
  },
  {
    id: "k8m", name: "8M", route: "Tanah Abang – Tanjung Duren", color: "#10495F", parentId: "k8",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Tanah Abang", lat: -6.1860, lng: 106.8130 },
      { n: "Tanjung Duren", lat: -6.1780, lng: 106.7920 },
    ],
  },
  {
    id: "k8n", name: "8N", route: "Kebayoran – Petamburan via Asia Afrika", color: "#6BB8DE", parentId: "k8",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kebayoran", lat: -6.2430, lng: 106.7940 },
      { n: "Asia Afrika", lat: -6.2170, lng: 106.8010 },
      { n: "Petamburan", lat: -6.1830, lng: 106.8130 },
    ],
  },
  {
    id: "k9", name: "Koridor 9", route: "Pinang Ranti – Pluit", color: "#F72585", amari: true,
    headway: 7, activeStart: 270, activeEnd: 1410, defaultVisible: true,
    stops: [
      { n: "Pinang Ranti", lat: -6.2820, lng: 106.8770 },
      { n: "Cawang", lat: -6.2430, lng: 106.8620 },
      { n: "Tebet", lat: -6.2260, lng: 106.8500 },
      { n: "Casablanca", lat: -6.2210, lng: 106.8390 },
      { n: "Kuningan", lat: -6.2250, lng: 106.8330 },
      { n: "Semanggi", lat: -6.2220, lng: 106.8080 },
      { n: "Slipi", lat: -6.1870, lng: 106.8060 },
      { n: "Tomang", lat: -6.1780, lng: 106.7970 },
      { n: "Grogol", lat: -6.1630, lng: 106.7900 },
      { n: "Pluit", lat: -6.1230, lng: 106.7920 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 9 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Tidak ada rute Royaltrans
  // di bawah Koridor 9.
  {
    id: "k9a", name: "9A", route: "Cililitan – Grogol", color: "#E4368E", parentId: "k9",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "PGC (Cililitan)", lat: -6.2600, lng: 106.8620 },
      { n: "Tomang", lat: -6.1780, lng: 106.7970 },
      { n: "Grogol", lat: -6.1630, lng: 106.7900 },
    ],
  },
  {
    id: "k9c", name: "9C", route: "Pinang Ranti – Bundaran Senayan", color: "#FF6FA5", parentId: "k9",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pinang Ranti", lat: -6.2820, lng: 106.8770 },
      { n: "Cawang", lat: -6.2430, lng: 106.8620 },
      { n: "Semanggi", lat: -6.2220, lng: 106.8080 },
      { n: "Bundaran Senayan", lat: -6.2200, lng: 106.8010 },
    ],
  },
  {
    id: "k9d", name: "9D", route: "Pasar Minggu – Tanah Abang", color: "#C9184A", parentId: "k9",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pasar Minggu", lat: -6.2830, lng: 106.8420 },
      { n: "Kuningan", lat: -6.2250, lng: 106.8330 },
      { n: "Semanggi", lat: -6.2220, lng: 106.8080 },
      { n: "Tanah Abang", lat: -6.1860, lng: 106.8130 },
    ],
  },
  {
    id: "k9e", name: "9E", route: "Kebayoran – Jelambar", color: "#FF85A8", parentId: "k9",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kebayoran", lat: -6.2430, lng: 106.7940 },
      { n: "Grogol", lat: -6.1630, lng: 106.7900 },
      { n: "Jelambar", lat: -6.1550, lng: 106.7850 },
    ],
  },
  {
    id: "k9f", name: "9F", route: "Rusun Tambora – Pluit", color: "#A61E4D", parentId: "k9",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Tambora", lat: -6.1450, lng: 106.8000 },
      { n: "Pluit", lat: -6.1230, lng: 106.7920 },
    ],
  },
  {
    id: "k9h", name: "9H", route: "Cipedak – Pasar Minggu", color: "#FF9EBB", parentId: "k9",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Cipedak", lat: -6.3350, lng: 106.8180 },
      { n: "Pasar Minggu", lat: -6.2830, lng: 106.8420 },
    ],
  },
  {
    id: "k9n", name: "9N", route: "Pinang Ranti – Simpang Cawang", color: "#7C0A3D", parentId: "k9",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pinang Ranti", lat: -6.2820, lng: 106.8770 },
      { n: "Simpang Cawang", lat: -6.2480, lng: 106.8680 },
    ],
  },
  {
    id: "k10", name: "Koridor 10", route: "Tanjung Priok – PGC 2 (Cililitan)", color: "#B5179E", amari: true,
    headway: 10, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Tanjung Priok", lat: -6.1110, lng: 106.8800 },
      { n: "Sunter", lat: -6.1390, lng: 106.8720 },
      { n: "Ahmad Yani", lat: -6.1780, lng: 106.8720 },
      { n: "Rawamangun", lat: -6.1930, lng: 106.8790 },
      { n: "Utan Kayu", lat: -6.2000, lng: 106.8650 },
      { n: "PGC (Cililitan)", lat: -6.2600, lng: 106.8620 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 10 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Tidak ada rute Royaltrans
  // di bawah Koridor 10.
  {
    id: "k10a", name: "10A", route: "Rusun Marunda – Tanjung Priok", color: "#D662B0", parentId: "k10",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Marunda", lat: -6.1050, lng: 106.9500 },
      { n: "Tanjung Priok", lat: -6.1110, lng: 106.8800 },
    ],
  },
  {
    id: "k10b", name: "10B", route: "Rusun Cipinang Besar Selatan – Penas Kalimalang", color: "#9A1750", parentId: "k10",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Cipinang Besar Selatan", lat: -6.2150, lng: 106.8750 },
      { n: "Penas Kalimalang", lat: -6.2350, lng: 106.9150 },
    ],
  },
  {
    id: "k10h", name: "10H", route: "Tanjung Priok – Bundaran Senayan", color: "#E85DA0", parentId: "k10",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Tanjung Priok", lat: -6.1110, lng: 106.8800 },
      { n: "Ahmad Yani", lat: -6.1780, lng: 106.8720 },
      { n: "Semanggi", lat: -6.2220, lng: 106.8080 },
      { n: "Bundaran Senayan", lat: -6.2200, lng: 106.8010 },
    ],
  },
  {
    id: "k11", name: "Koridor 11", route: "Kampung Melayu – Pulo Gebang", color: "#7209B7", amari: true,
    headway: 12, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kampung Melayu", lat: -6.2245, lng: 106.8600 },
      { n: "Cipinang", lat: -6.1970, lng: 106.8700 },
      { n: "Klender", lat: -6.1980, lng: 106.8870 },
      { n: "Buaran", lat: -6.2000, lng: 106.9100 },
      { n: "Malaka", lat: -6.1900, lng: 106.9200 },
      { n: "Pulo Gebang", lat: -6.1830, lng: 106.9280 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 11 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Tidak ada rute Royaltrans
  // di bawah Koridor 11.
  {
    id: "k11b", name: "11B", route: "Rusun Ujung Menteng – Penggilingan", color: "#9D4EDD", parentId: "k11",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Ujung Menteng", lat: -6.1700, lng: 106.9600 },
      { n: "Penggilingan", lat: -6.1900, lng: 106.9350 },
    ],
  },
  {
    id: "k11c", name: "11C", route: "Rusun Pulo Gebang – Penggilingan", color: "#5A189A", parentId: "k11",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Pulo Gebang", lat: -6.1800, lng: 106.9330 },
      { n: "Penggilingan", lat: -6.1900, lng: 106.9350 },
    ],
  },
  {
    id: "k11d", name: "11D", route: "Pulo Gebang – Pulo Gadung via PIK", color: "#7B2CBF", parentId: "k11",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pulo Gebang", lat: -6.1830, lng: 106.9280 },
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
    ],
  },
  {
    id: "k11m", name: "11M", route: "Rusun Rawa Bebek – Bukit Duri", color: "#C77DFF", parentId: "k11",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Rawa Bebek", lat: -6.1550, lng: 106.9350 },
      { n: "Jatinegara", lat: -6.2140, lng: 106.8700 },
      { n: "Bukit Duri", lat: -6.2170, lng: 106.8560 },
    ],
  },
  {
    id: "k11p", name: "11P", route: "Rusun Pondok Bambu – Walikota Jakarta Timur", color: "#3C096C", parentId: "k11",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Pondok Bambu", lat: -6.2280, lng: 106.9020 },
      { n: "Walikota Jakarta Timur", lat: -6.2140, lng: 106.8720 },
    ],
  },
  {
    id: "k11q", name: "11Q", route: "Kampung Melayu – Pulo Gebang via BKT", color: "#B298DC", parentId: "k11",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kampung Melayu", lat: -6.2245, lng: 106.8600 },
      { n: "Cipinang", lat: -6.1970, lng: 106.8700 },
      { n: "Klender", lat: -6.1980, lng: 106.8870 },
      { n: "Pulo Gebang", lat: -6.1830, lng: 106.9280 },
    ],
  },
  {
    id: "k11r", name: "11R", route: "Rusun Cakung KM2 – Penggilingan", color: "#560BAD", parentId: "k11",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Cakung KM2", lat: -6.1650, lng: 106.9480 },
      { n: "Penggilingan", lat: -6.1900, lng: 106.9350 },
    ],
  },
  {
    id: "k11w", name: "11W", route: "Stasiun Klender – Pulo Gadung", color: "#6247AA", parentId: "k11",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Stasiun Klender", lat: -6.1980, lng: 106.8870 },
      { n: "Pulogadung", lat: -6.1890, lng: 106.9070 },
    ],
  },
  {
    id: "k12", name: "Koridor 12", route: "Pluit – Tanjung Priok", color: "#FFD60A", amari: true,
    headway: 10, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pluit", lat: -6.1230, lng: 106.7920 },
      { n: "Penjaringan", lat: -6.1220, lng: 106.8080 },
      { n: "Pademangan", lat: -6.1250, lng: 106.8280 },
      { n: "Ancol", lat: -6.1250, lng: 106.8390 },
      { n: "Sunter", lat: -6.1390, lng: 106.8720 },
      { n: "Tanjung Priok", lat: -6.1110, lng: 106.8800 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 12 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Tidak ada rute Royaltrans
  // di bawah Koridor 12.
  {
    id: "k12a", name: "12A", route: "Kota – Kaliadem", color: "#F9E784", parentId: "k12",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Kota", lat: -6.1370, lng: 106.8133 },
      { n: "Kaliadem", lat: -6.1000, lng: 106.7350 },
    ],
  },
  {
    id: "k12b", name: "12B", route: "Pluit – Senen", color: "#FCE300", parentId: "k12",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Pluit", lat: -6.1230, lng: 106.7920 },
      { n: "Senen", lat: -6.1755, lng: 106.8420 },
    ],
  },
  {
    id: "k12c", name: "12C", route: "Rusun Waduk Pluit – Penjaringan", color: "#FFF275", parentId: "k12",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Waduk Pluit", lat: -6.1280, lng: 106.7950 },
      { n: "Penjaringan", lat: -6.1220, lng: 106.8080 },
    ],
  },
  {
    id: "k12f", name: "12F", route: "Rusun Marunda – Rusun Waduk Pluit", color: "#F4D35E", parentId: "k12",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Marunda", lat: -6.1050, lng: 106.9500 },
      { n: "Rusun Waduk Pluit", lat: -6.1280, lng: 106.7950 },
    ],
  },
  {
    id: "k12h", name: "12H", route: "Rusun Penjaringan – Penjaringan", color: "#F0C808", parentId: "k12",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Rusun Penjaringan", lat: -6.1180, lng: 106.8050 },
      { n: "Penjaringan", lat: -6.1220, lng: 106.8080 },
    ],
  },
  {
    id: "k12p", name: "12P", route: "Stasiun LRT Pegangsaan – JIS", color: "#FFC93C", parentId: "k12",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Stasiun LRT Pegangsaan", lat: -6.1550, lng: 106.9000 },
      { n: "JIS", lat: -6.1250, lng: 106.8700 },
    ],
  },
  {
    id: "k13", name: "Koridor 13", route: "Ciledug – Kapten Tendean", color: "#00F5D4", amari: true,
    headway: 6, activeStart: 280, activeEnd: 1380, defaultVisible: true,
    stops: [
      { n: "Ciledug", lat: -6.2400, lng: 106.7220 },
      { n: "Cipulir", lat: -6.2320, lng: 106.7660 },
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Seskoal", lat: -6.2530, lng: 106.7900 },
      { n: "Adam Malik", lat: -6.2540, lng: 106.8010 },
      { n: "Kapten Tendean", lat: -6.2380, lng: 106.8210 },
    ],
  },
  // Subkoridor/rute pengumpan Koridor 13 (non-BRT, bermerek Transjakarta).
  // Diverifikasi dari transjakarta.co.id/rute (kode & titik akhir), koordinat
  // halte tetap perkiraan seperti koridor trunk. Rute "L13E: Puri Beta –
  // Flyover Kuningan (Express)" sengaja TIDAK dimasukkan — itu varian
  // limited-stop dari 13E dengan titik akhir sama persis, bukan rute fisik
  // baru, dan model data proyek ini tidak merepresentasikan pola berhenti
  // per-halte. Royaltrans B13/B14 (Summarecon Bekasi) tetap di luar scope
  // (lihat Non-Goals §2.2), jadi tidak dimasukkan.
  {
    id: "k13b", name: "13B", route: "Puri Beta – Pancoran", color: "#00B8A9", parentId: "k13",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Puri Beta", lat: -6.2350, lng: 106.7150 },
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Pancoran", lat: -6.2440, lng: 106.8390 },
    ],
  },
  {
    id: "k13e", name: "13E", route: "Puri Beta – Flyover Kuningan", color: "#5EFCE8", parentId: "k13",
    headway: 15, activeStart: 300, activeEnd: 1320, defaultVisible: false,
    stops: [
      { n: "Puri Beta", lat: -6.2350, lng: 106.7150 },
      { n: "Kebayoran Lama", lat: -6.2440, lng: 106.7830 },
      { n: "Flyover Kuningan", lat: -6.2200, lng: 106.8300 },
    ],
  },
];
