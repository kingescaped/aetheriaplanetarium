import type { SolarSystemBodyMeta } from './solarSystem.ts';
import type { DeepSkyMeta } from './deepSky.ts';
import type { SatelliteBodyMeta } from './satellite.ts';

export interface Star {
  id: string | number;
  name?: string;
  properName?: string;
  bayerFlamsteed?: string;
  mag: number; // Visual magnitude (smaller is brighter, e.g. Sirius = -1.46)
  ra: number;  // Right Ascension in degrees (0 - 360) or hours (0 - 24)
  dec: number; // Declination in degrees (-90 to +90)
  dist?: number; // Distance in light years
  spect?: string; // Spectral class: O, B, A, F, G, K, M
  con?: string;  // Constellation 3-letter abbreviation (e.g. 'ORI', 'UMA')
  color?: string; // Hex color based on spectral type or temperature
  x?: number; // 3D Dome Cartesian X
  y?: number; // 3D Dome Cartesian Y (Height/Zenith)
  z?: number; // 3D Dome Cartesian Z
  alt?: number; // Altitude in degrees (-90 to +90)
  az?: number;  // Azimuth in degrees (0 to 360)
  bodyType?: 'star' | 'sun' | 'moon' | 'planet' | 'dso' | 'satellite';
  solarSystemData?: SolarSystemBodyMeta;
  deepSkyData?: DeepSkyMeta;
  satelliteData?: SatelliteBodyMeta;
}

export interface ConstellationLine {
  id: string;
  name: string;
  nameVi?: string;
  pairs: [number, number][]; // pairs of star IDs or indices
}

export interface ObserverLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export type ViewMode = '2D_PLANETARIUM' | '3D_ZENITH_DOME';

export interface CelestialSettings {
  showConstellationLines: boolean;
  showConstellationLabels: boolean;
  showStarLabels: boolean;
  showGridLines: boolean;
  showMilkyWay: boolean;
  showGroundHorizon: boolean;
  starGlowIntensity: number;
  magnitudeLimit: number;
  timeSpeed: number; // 0 = paused, 1 = 1x real time, 60 = 1 min/sec, etc.
  simulateSkyWeather: boolean;
  showSolarSystem: boolean;
  showDeepSky: boolean;
  showEclipticLine: boolean;
  showAtmosphereTwilight: boolean;
  showEquatorialGrid: boolean;
  showSatellites: boolean;
}
