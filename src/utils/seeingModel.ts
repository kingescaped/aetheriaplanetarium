import type {
  RawAtmosphericInput,
  SeeingGrade,
  SkyVisualAttenuation,
  WeatherForecastData,
  WeatherSample,
  ResolvedSkyWeather,
} from '../types/weather.ts';

const HALF_HOUR_MS = 1_800_000;
const LIVE_SYNC_THRESHOLD_MS = 15 * 60 * 1000;

export const CLEAR_SKY_ATTENUATION: SkyVisualAttenuation = {
  starOpacity: 1,
  magPenalty: 0,
  hazeOpacity: 0,
  twinkleBoost: 1,
  constellationOpacity: 1,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getSeeingGrade(score: number): SeeingGrade {
  if (score >= 78) return 'excellent';
  if (score >= 58) return 'good';
  if (score >= 35) return 'fair';
  return 'poor';
}

export function computeSeeingMetrics(input: RawAtmosphericInput): {
  dewSpreadC: number;
  seeingScore: number;
  seeingArcsec: number;
  seeingGrade: SeeingGrade;
} {
  const effectiveCloud = clamp(
    input.cloudLow * 0.55 + input.cloudMid * 0.3 + input.cloudHigh * 0.15,
    0,
    100
  );
  const combinedCloud = clamp(input.cloudCover * 0.7 + effectiveCloud * 0.3, 0, 100);
  const cloudFactor = 1 - combinedCloud / 100;

  const dewSpreadC = Number((input.temperatureC - input.dewPointC).toFixed(1));
  const dewPenalty =
    dewSpreadC < 2.5 ? clamp((2.5 - dewSpreadC) / 2.5, 0, 1) * 0.3 : 0;
  const humidityFactor = clamp(
    1 - clamp((input.humidity - 40) / 60, 0, 1) * 0.7 - dewPenalty,
    0,
    1
  );

  const windFactor = 1 - clamp((input.windSpeedKmh - 8) / 37, 0, 1);
  const visibilityFactor = clamp(input.visibilityKm / 20, 0, 1);

  const rawScore =
    (cloudFactor * 0.55 +
      humidityFactor * 0.2 +
      windFactor * 0.15 +
      visibilityFactor * 0.1) *
    100;
  const seeingScore = Math.round(clamp(rawScore, 0, 100));
  const seeingArcsec = Number((4.5 - (seeingScore / 100) * 3.7).toFixed(1));

  return {
    dewSpreadC,
    seeingScore,
    seeingArcsec,
    seeingGrade: getSeeingGrade(seeingScore),
  };
}

export function buildWeatherSample(
  input: RawAtmosphericInput,
  timestampMs: number
): WeatherSample {
  return {
    ...input,
    timestampMs,
    ...computeSeeingMetrics(input),
  };
}

export function computeSkyVisualAttenuation(
  sample: WeatherSample | null,
  enabled: boolean
): SkyVisualAttenuation {
  if (!enabled || !sample) {
    return CLEAR_SKY_ATTENUATION;
  }

  const cloudFrac = clamp(
    (sample.cloudCover * 0.65 + sample.cloudLow * 0.25 + sample.cloudMid * 0.1) / 100,
    0,
    1
  );
  const moistureFrac =
    clamp((sample.humidity - 55) / 45, 0, 1) * (sample.visibilityKm < 12 ? 1 : 0.5);

  return {
    starOpacity: Number(clamp(1 - cloudFrac * 0.88 - moistureFrac * 0.12, 0.08, 1).toFixed(3)),
    magPenalty: Number(clamp(cloudFrac * 3.8 + moistureFrac * 0.7, 0, 4.5).toFixed(2)),
    hazeOpacity: Number(clamp(cloudFrac * 0.52 + moistureFrac * 0.18, 0, 0.65).toFixed(3)),
    twinkleBoost: Number(clamp(1 + (1 - sample.seeingScore / 100) * 1.4, 1, 2.4).toFixed(2)),
    constellationOpacity: Number(clamp(1 - cloudFrac * 0.75, 0.15, 1).toFixed(3)),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateSample(
  a: WeatherSample,
  b: WeatherSample,
  t: number,
  timestampMs: number
): WeatherSample {
  return buildWeatherSample(
    {
      cloudCover: Math.round(lerp(a.cloudCover, b.cloudCover, t)),
      cloudLow: Math.round(lerp(a.cloudLow, b.cloudLow, t)),
      cloudMid: Math.round(lerp(a.cloudMid, b.cloudMid, t)),
      cloudHigh: Math.round(lerp(a.cloudHigh, b.cloudHigh, t)),
      humidity: Math.round(lerp(a.humidity, b.humidity, t)),
      windSpeedKmh: Number(lerp(a.windSpeedKmh, b.windSpeedKmh, t).toFixed(1)),
      visibilityKm: Number(lerp(a.visibilityKm, b.visibilityKm, t).toFixed(1)),
      temperatureC: Number(lerp(a.temperatureC, b.temperatureC, t).toFixed(1)),
      dewPointC: Number(lerp(a.dewPointC, b.dewPointC, t).toFixed(1)),
    },
    timestampMs
  );
}

function resolveBracketedSample(hourly: WeatherSample[], targetMs: number): WeatherSample {
  const first = hourly[0];
  if (targetMs <= first.timestampMs) {
    return targetMs === first.timestampMs ? first : { ...first, timestampMs: targetMs };
  }

  const last = hourly[hourly.length - 1];
  if (targetMs >= last.timestampMs) {
    return targetMs === last.timestampMs ? last : { ...last, timestampMs: targetMs };
  }

  for (let i = 0; i < hourly.length - 1; i++) {
    const a = hourly[i];
    const b = hourly[i + 1];
    if (targetMs >= a.timestampMs && targetMs <= b.timestampMs) {
      const span = b.timestampMs - a.timestampMs;
      const t = span > 0 ? (targetMs - a.timestampMs) / span : 0;
      return interpolateSample(a, b, t, targetMs);
    }
  }

  return last;
}

export function interpolateWeatherAtDate(
  data: WeatherForecastData,
  targetDate: Date,
  simulationEnabled: boolean,
  referenceNowMs = Date.now()
): ResolvedSkyWeather {
  const hourly = data.hourly;
  const targetMs = targetDate.getTime();

  if (hourly.length === 0) {
    return {
      sample: data.current,
      isForecastSynced: false,
      isOutOfRange: true,
      attenuation: CLEAR_SKY_ATTENUATION,
    };
  }

  const minTs = hourly[0].timestampMs - HALF_HOUR_MS;
  const maxTs = hourly[hourly.length - 1].timestampMs + HALF_HOUR_MS;

  if (targetMs < minTs || targetMs > maxTs) {
    return {
      sample: data.current,
      isForecastSynced: false,
      isOutOfRange: true,
      attenuation: CLEAR_SKY_ATTENUATION,
    };
  }

  const sample = resolveBracketedSample(hourly, targetMs);
  return {
    sample,
    isForecastSynced: Math.abs(targetMs - referenceNowMs) > LIVE_SYNC_THRESHOLD_MS,
    isOutOfRange: false,
    attenuation: computeSkyVisualAttenuation(sample, simulationEnabled),
  };
}
