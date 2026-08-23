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
}

/**
 * Rute (nama & arah) diverifikasi dari sumber publik. Koordinat halte =
 * perkiraan berbasis pengetahuan geografis umum, BUKAN hasil digitasi
 * GTFS resmi. totalKm & durationMin dihitung otomatis dari koordinat ini
 * di lib/simulation.ts, tidak di-hardcode.
 */
export const CORRIDORS: Corridor[] = [
  {
    id: "k1", name: "Koridor 1", route: "Blok M – Kota", color: "#E63946",
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
  {
    id: "k2", name: "Koridor 2", route: "Harmoni – Pulogadung", color: "#F3722C",
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
  {
    id: "k3", name: "Koridor 3", route: "Kalideres – Monas (via Veteran)", color: "#F9C74F",
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
  {
    id: "k4", name: "Koridor 4", route: "Pulogadung – Dukuh Atas 2", color: "#90BE6D",
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
  {
    id: "k5", name: "Koridor 5", route: "Ancol – Kampung Melayu", color: "#43AA8B",
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
  {
    id: "k6", name: "Koridor 6", route: "Ragunan – Dukuh Atas 2", color: "#4D908E",
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
  {
    id: "k7", name: "Koridor 7", route: "Kampung Rambutan – Kampung Melayu", color: "#577590",
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
  {
    id: "k8", name: "Koridor 8", route: "Lebak Bulus – Pasar Baru", color: "#277DA1",
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
  {
    id: "k9", name: "Koridor 9", route: "Pinang Ranti – Pluit", color: "#F72585",
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
  {
    id: "k10", name: "Koridor 10", route: "Tanjung Priok – PGC 2 (Cililitan)", color: "#B5179E",
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
  {
    id: "k11", name: "Koridor 11", route: "Kampung Melayu – Pulo Gebang", color: "#7209B7",
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
  {
    id: "k12", name: "Koridor 12", route: "Pluit – Tanjung Priok", color: "#FFD60A",
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
  {
    id: "k13", name: "Koridor 13", route: "Ciledug – Kapten Tendean", color: "#00F5D4",
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
];
