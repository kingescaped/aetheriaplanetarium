export type SolarSystemBodyId =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export type SolarBodyKind = 'sun' | 'moon' | 'planet';

export type MoonPhaseName =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export interface SolarSystemBodyMeta {
  bodyId: SolarSystemBodyId;
  kind: SolarBodyKind;
  nameEn: string;
  nameVi: string;
  subtitleEn: string;
  subtitleVi: string;
  accentColor: string;
  distanceAu: number;
  distanceKm: number;
  phaseFraction?: number;
  moonPhaseAngle?: number;
  moonAgeDays?: number;
  moonPhaseName?: MoonPhaseName;
  ringTiltDeg?: number;
}

export interface SolarBodyRiseSet {
  nextRiseMs: number | null;
  nextSetMs: number | null;
}
