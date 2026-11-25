import type { ObserverLocation, Star, ViewMode } from './celestial.ts';

export type TwilightPhase =
  | 'daylight'
  | 'civil'
  | 'nautical'
  | 'astronomical'
  | 'night';

export interface TwilightState {
  enabled: boolean;
  phase: TwilightPhase;
  sunAltDeg: number;
  sunAzDeg: number;
  zenithColor: string;
  midColor: string;
  horizonColor: string;
  sunGlowColor: string;
  sunGlowOpacity: number;
  starOpacityFactor: number;
  magPenalty: number;
  constellationOpacityFactor: number;
  skyBrightness: number;
}

export interface EquatorialCurvePoint {
  alt: number;
  az: number;
  raDeg: number;
  decDeg: number;
}

export interface EquatorialMeridian {
  raHours: number;
  raDeg: number;
  label: string;
  points: EquatorialCurvePoint[];
  labelPoint: EquatorialCurvePoint | null;
}

export interface EquatorialParallel {
  decDeg: number;
  label: string;
  isEquator: boolean;
  points: EquatorialCurvePoint[];
  labelPoint: EquatorialCurvePoint | null;
}

export interface EquatorialPole {
  id: 'NCP' | 'SCP';
  label: string;
  decDeg: number;
  alt: number;
  az: number;
}

export interface EquatorialGridData {
  meridians: EquatorialMeridian[];
  parallels: EquatorialParallel[];
  poles: EquatorialPole[];
}

export interface SkyCaptureMetadata {
  location: ObserverLocation;
  date: Date;
  viewMode: ViewMode;
  selectedStar: Star | null;
  twilightPhase: TwilightPhase;
  sunAltDeg: number;
  showAtmosphereTwilight: boolean;
  nightVisionMode: boolean;
}

export interface CaptureWatermarkInfo {
  brand: string;
  modeBadge: string;
  locationLine: string;
  timeLine: string;
  targetLine: string | null;
}
