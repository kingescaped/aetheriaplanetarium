import type { DeepSkyTuple } from '../types/deepSky.ts';

/**
 * 15 prominent Northern & Southern hemisphere NGC/Caldwell deep-sky highlights.
 */
export const NGC_HIGHLIGHT_ENTRIES: readonly DeepSkyTuple[] = [
  ['NGC 869', 'h Persei', 'Double Cluster (West)', 'Cụm Kép Anh Tiên (Tây)', 'open_cluster', 'PER', 34.77, 57.13, 3.7, 30.0, 7500, true],
  ['NGC 884', 'χ Persei', 'Double Cluster (East)', 'Cụm Kép Anh Tiên (Đông)', 'open_cluster', 'PER', 35.61, 57.15, 3.8, 30.0, 7500],
  ['NGC 5139', 'ω Centauri', 'Omega Centauri', 'Cụm sao cầu Omega Centauri', 'globular_cluster', 'CEN', 201.70, -47.48, 3.9, 36.0, 17090, true],
  ['NGC 104', 'Caldwell 106', '47 Tucanae', 'Cụm sao cầu 47 Tucanae', 'globular_cluster', 'TUC', 6.02, -72.08, 4.1, 31.0, 14500],
  ['NGC 3372', 'Caldwell 92', 'Carina Nebula', 'Tinh vân Thuyền Để', 'nebula', 'CAR', 161.26, -59.87, 1.0, 120.0, 8500, true],
  ['NGC 2070', 'Caldwell 103', 'Tarantula Nebula', 'Tinh vân Nhện Độc', 'nebula', 'DOR', 84.68, -69.10, 8.0, 40.0, 160000],
  ['LMC', 'PGC 17223', 'Large Magellanic Cloud', 'Đám mây Magellan Lớn', 'galaxy', 'DOR', 80.89, -69.76, 0.9, 645.0, 163000, true],
  ['SMC', 'NGC 292', 'Small Magellanic Cloud', 'Đám mây Magellan Nhỏ', 'galaxy', 'TUC', 13.19, -72.83, 2.7, 320.0, 200000],
  ['NGC 4755', 'Caldwell 94', 'Jewel Box Cluster', 'Cụm Hộp Châu Báu', 'open_cluster', 'CRU', 193.41, -60.36, 4.2, 10.0, 6440],
  ['NGC 253', 'Caldwell 65', 'Sculptor Galaxy', 'Thiên hà Ngọc Điêu', 'galaxy', 'SCL', 11.89, -25.29, 7.1, 27.0, 11400000],
  ['NGC 5128', 'Caldwell 77', 'Centaurus A Galaxy', 'Thiên hà Centaurus A', 'galaxy', 'CEN', 201.37, -43.02, 6.8, 25.0, 12000000],
  ['NGC 2237', 'Caldwell 49', 'Rosette Nebula', 'Tinh vân Hoa Hồng', 'nebula', 'MON', 97.98, 5.05, 9.0, 80.0, 5200],
  ['NGC 6992', 'Caldwell 33', 'Eastern Veil Nebula', 'Tinh vân Mạng Che Đông', 'supernova_remnant', 'CYG', 314.11, 31.74, 7.0, 60.0, 2400],
  ['NGC 7000', 'Caldwell 20', 'North America Nebula', 'Tinh vân Bắc Mỹ', 'nebula', 'CYG', 314.75, 44.33, 4.0, 120.0, 2590],
  ['NGC 7293', 'Caldwell 63', 'Helix Nebula', 'Tinh vân Xoắn Ốc', 'planetary_nebula', 'AQR', 337.41, -20.84, 7.6, 16.0, 650, true],
] as const;
