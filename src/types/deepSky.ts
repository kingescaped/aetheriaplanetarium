export type DeepSkyType =
  | 'galaxy'
  | 'nebula'
  | 'planetary_nebula'
  | 'supernova_remnant'
  | 'globular_cluster'
  | 'open_cluster';

export interface DeepSkyMeta {
  catalogCode: string;
  ngcCode?: string;
  dsoType: DeepSkyType;
  nameEn: string;
  nameVi: string;
  sizeArcmin: number;
  featured?: boolean;
  accentColor: string;
}

export type DeepSkyTuple = readonly [
  code: string,
  ngc: string,
  nameEn: string,
  nameVi: string,
  type: DeepSkyType,
  con: string,
  raDeg: number,
  decDeg: number,
  mag: number,
  sizeArcmin: number,
  distLy: number,
  featured?: boolean,
];

export interface EclipticPoint {
  lonDeg: number;
  raDeg: number;
  decDeg: number;
  alt: number;
  az: number;
}

export interface EclipticTick extends EclipticPoint {
  nextRaDeg: number;
  nextDecDeg: number;
  nextAlt: number;
  nextAz: number;
}

export interface EclipticMarker extends EclipticPoint {
  id: 'vernal' | 'summer' | 'autumnal' | 'winter';
  labelEn: string;
  labelVi: string;
}

export interface EclipticOverlayData {
  obliquityDeg: number;
  points: EclipticPoint[];
  ticks: EclipticTick[];
  markers: EclipticMarker[];
}
