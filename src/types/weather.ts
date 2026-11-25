export type SeeingGrade = 'excellent' | 'good' | 'fair' | 'poor';

export interface RawAtmosphericInput {
  cloudCover: number;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
  humidity: number;
  windSpeedKmh: number;
  visibilityKm: number;
  temperatureC: number;
  dewPointC: number;
}

export interface WeatherSample extends RawAtmosphericInput {
  timestampMs: number;
  dewSpreadC: number;
  seeingScore: number;
  seeingArcsec: number;
  seeingGrade: SeeingGrade;
}

export interface SkyVisualAttenuation {
  starOpacity: number;
  magPenalty: number;
  hazeOpacity: number;
  twinkleBoost: number;
  constellationOpacity: number;
}

export interface WeatherForecastData {
  latitude: number;
  longitude: number;
  fetchedAtMs: number;
  timezoneAbbreviation: string;
  current: WeatherSample;
  hourly: WeatherSample[];
}

export interface ResolvedSkyWeather {
  sample: WeatherSample;
  isForecastSynced: boolean;
  isOutOfRange: boolean;
  attenuation: SkyVisualAttenuation;
}

export type WeatherStatus = 'idle' | 'loading' | 'ready' | 'error';
