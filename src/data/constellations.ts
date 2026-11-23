export interface ConstellationDefinition {
  id: string;
  name: string;
  nameVi: string;
  centerRa: number;
  centerDec: number;
  lines: [string, string][]; // Star ID pairs
}

export const CONSTELLATIONS: ConstellationDefinition[] = [
  // 1. Orion (Lạp Hộ) - Thợ Săn
  {
    id: 'ORI',
    name: 'Orion',
    nameVi: 'Lạp Hộ (Orion)',
    centerRa: 84.0,
    centerDec: 0.0,
    lines: [
      ['betelgeuse', 'bellatrix'],
      ['bellatrix', 'mintaka'],
      ['mintaka', 'alnilam'],
      ['alnilam', 'alnitak'],
      ['alnitak', 'saiph'],
      ['saiph', 'rigel'],
      ['rigel', 'mintaka'],
      ['betelgeuse', 'alnitak'],
    ],
  },

  // 2. Ursa Major (Đại Hùng) - Gấu Lớn / Bắc Đẩu Thất Tinh
  {
    id: 'UMA',
    name: 'Ursa Major',
    nameVi: 'Đại Hùng (Ursa Major)',
    centerRa: 175.0,
    centerDec: 55.0,
    lines: [
      ['dubhe', 'merak'],
      ['merak', 'phecda'],
      ['phecda', 'megrez'],
      ['megrez', 'dubhe'],
      ['megrez', 'alioth'],
      ['alioth', 'mizar'],
      ['mizar', 'alkaid'],
    ],
  },

  // 3. Ursa Minor (Tiểu Hùng)
  {
    id: 'UMI',
    name: 'Ursa Minor',
    nameVi: 'Tiểu Hùng (Ursa Minor)',
    centerRa: 220.0,
    centerDec: 78.0,
    lines: [
      ['polaris', 'pherkad'],
      ['pherkad', 'kochab'],
    ],
  },

  // 4. Cassiopeia (Tiên Hậu) - Vương Miện Chữ W
  {
    id: 'CAS',
    name: 'Cassiopeia',
    nameVi: 'Tiên Hậu (Cassiopeia)',
    centerRa: 15.0,
    centerDec: 60.0,
    lines: [
      ['caph', 'schedar'],
      ['schedar', 'gamma_cas'],
      ['gamma_cas', 'ruchbah'],
      ['ruchbah', 'segin'],
    ],
  },

  // 5. Cygnus (Thiên Nga) - Thập Tự Phương Bắc
  {
    id: 'CYG',
    name: 'Cygnus',
    nameVi: 'Thiên Nga (Cygnus)',
    centerRa: 308.0,
    centerDec: 42.0,
    lines: [
      ['deneb', 'sadr'],
      ['sadr', 'albireo'],
      ['delta_cyg', 'sadr'],
      ['sadr', 'gienah'],
    ],
  },

  // 6. Lyra (Thiên Cầm)
  {
    id: 'LYR',
    name: 'Lyra',
    nameVi: 'Thiên Cầm (Lyra)',
    centerRa: 282.0,
    centerDec: 35.0,
    lines: [
      ['vega', 'sheliak'],
      ['sheliak', 'sulafat'],
      ['sulafat', 'vega'],
    ],
  },

  // 7. Aquila (Thiên Ưng)
  {
    id: 'AQL',
    name: 'Aquila',
    nameVi: 'Thiên Ưng (Aquila)',
    centerRa: 297.0,
    centerDec: 8.0,
    lines: [
      ['tarazed', 'altair'],
      ['altair', 'alshain'],
    ],
  },

  // 8. Canis Major (Đại Khuyển)
  {
    id: 'CMA',
    name: 'Canis Major',
    nameVi: 'Đại Khuyển (Canis Major)',
    centerRa: 104.0,
    centerDec: -24.0,
    lines: [
      ['sirius', 'mirzam'],
      ['sirius', 'wezen'],
      ['wezen', 'adhara'],
      ['wezen', 'aludra'],
    ],
  },

  // 9. Taurus (Kim Ngưu)
  {
    id: 'TAU',
    name: 'Taurus',
    nameVi: 'Kim Ngưu (Taurus)',
    centerRa: 70.0,
    centerDec: 20.0,
    lines: [
      ['aldebaran', 'elnath'],
      ['aldebaran', 'alcyone'],
    ],
  },

  // 10. Gemini (Song Tử)
  {
    id: 'GEM',
    name: 'Gemini',
    nameVi: 'Song Tử (Gemini)',
    centerRa: 110.0,
    centerDec: 25.0,
    lines: [
      ['castor', 'pollux'],
      ['castor', 'alhena'],
    ],
  },

  // 11. Leo (Sư Tử)
  {
    id: 'LEO',
    name: 'Leo',
    nameVi: 'Sư Tử (Leo)',
    centerRa: 160.0,
    centerDec: 16.0,
    lines: [
      ['regulus', 'algieba'],
      ['algieba', 'zosma'],
      ['zosma', 'denebola'],
      ['denebola', 'regulus'],
    ],
  },

  // 12. Virgo (Xử Nữ)
  {
    id: 'VIR',
    name: 'Virgo',
    nameVi: 'Xử Nữ (Virgo)',
    centerRa: 195.0,
    centerDec: -2.0,
    lines: [
      ['spica', 'porrima'],
      ['porrima', 'vindemiatrix'],
    ],
  },

  // 13. Scorpius (Thiên Yết / Hổ Cáp)
  {
    id: 'SCO',
    name: 'Scorpius',
    nameVi: 'Thiên Yết (Scorpius)',
    centerRa: 252.0,
    centerDec: -32.0,
    lines: [
      ['graffias', 'dschubba'],
      ['dschubba', 'antares'],
      ['antares', 'wei'],
      ['wei', 'sargas'],
      ['sargas', 'shaula'],
      ['shaula', 'lesath'],
    ],
  },

  // 14. Sagittarius (Nhân Mã) - Ấm Trà (Teapot)
  {
    id: 'SGR',
    name: 'Sagittarius',
    nameVi: 'Nhân Mã (Sagittarius)',
    centerRa: 280.0,
    centerDec: -30.0,
    lines: [
      ['kaus_media', 'kaus_australis'],
      ['kaus_australis', 'ascella'],
      ['ascella', 'nunki'],
      ['nunki', 'kaus_borealis'],
      ['kaus_borealis', 'kaus_media'],
      ['kaus_media', 'ascella'],
    ],
  },

  // 15. Crux (Nam Thập Tự)
  {
    id: 'CRU',
    name: 'Crux',
    nameVi: 'Nam Thập Tự (Crux)',
    centerRa: 187.0,
    centerDec: -60.0,
    lines: [
      ['acrux', 'gacrux'],
      ['mimosa', 'imai'],
    ],
  },

  // 16. Boötes (Mục Phu)
  {
    id: 'BOO',
    name: 'Boötes',
    nameVi: 'Mục Phu (Boötes)',
    centerRa: 215.0,
    centerDec: 22.0,
    lines: [
      ['arcturus', 'muphrid'],
      ['arcturus', 'izar'],
    ],
  },

  // 17. Pegasus (Phi Mã)
  {
    id: 'PEG',
    name: 'Pegasus',
    nameVi: 'Phi Mã (Pegasus)',
    centerRa: 345.0,
    centerDec: 20.0,
    lines: [
      ['markab', 'scheat'],
      ['scheat', 'alpheratz'],
      ['alpheratz', 'algenib'],
      ['algenib', 'markab'],
      ['markab', 'enif'],
    ],
  },
];
