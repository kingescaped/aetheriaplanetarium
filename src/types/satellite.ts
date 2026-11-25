export type SatelliteId = 'iss' | 'tiangong' | 'hubble';

export type TleSource = 'celestrak' | 'cache' | 'bundled';

export interface TleRecord {
  id: SatelliteId;
  noradId: number;
  nameEn: string;
  nameVi: string;
  subtitleEn: string;
  subtitleVi: string;
  accentColor: string;
  baseMag: number;
  line1: string;
  line2: string;
  source: TleSource;
  fetchedAtMs: number;
}

export interface ParsedTleElements {
  noradId: number;
  epochMs: number;
  inclinationDeg: number;
  raanDeg: number;
  eccentricity: number;
  argPerigeeDeg: number;
  meanAnomalyDeg: number;
  meanMotionRevPerDay: number;
}

export interface SatelliteTrackPoint {
  alt: number;
  az: number;
  offsetMin: number;
}

export interface SatellitePassPrediction {
  riseTimeMs: number;
  riseAzDeg: number;
  peakTimeMs: number;
  maxAltDeg: number;
  peakAzDeg: number;
  setTimeMs: number;
  setAzDeg: number;
  isSunlitAtPeak: boolean;
}

export interface SatelliteBodyMeta {
  id: SatelliteId;
  noradId: number;
  nameEn: string;
  nameVi: string;
  subtitleEn: string;
  subtitleVi: string;
  altitudeKm: number;
  velocityKms: number;
  rangeKm: number;
  subLatDeg: number;
  subLonDeg: number;
  periodMin: number;
  inclinationDeg: number;
  isSunlit: boolean;
  source: TleSource;
  tleRecord: TleRecord;
  track: SatelliteTrackPoint[];
}
