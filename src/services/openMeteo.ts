import type {
  RawAtmosphericInput,
  WeatherForecastData,
  WeatherSample,
} from '../types/weather.ts';
import { buildWeatherSample, clamp } from '../utils/seeingModel.ts';

const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_VARIABLES =
  'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,wind_speed_10m,visibility,temperature_2m,dew_point_2m';
const CACHE_STORAGE_KEY = 'aetheria_weather_cache_v1';
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 8;
const REQUEST_TIMEOUT_MS = 10_000;

const memoryCache = new Map<string, WeatherForecastData>();

function makeCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function mapRawInput(raw: {
  cloudCover: unknown;
  cloudLow: unknown;
  cloudMid: unknown;
  cloudHigh: unknown;
  humidity: unknown;
  windSpeedKmh: unknown;
  visibilityMeters: unknown;
  temperatureC: unknown;
  dewPointC: unknown;
}): RawAtmosphericInput {
  return {
    cloudCover: clamp(Math.round(readNumber(raw.cloudCover, 0)), 0, 100),
    cloudLow: clamp(Math.round(readNumber(raw.cloudLow, 0)), 0, 100),
    cloudMid: clamp(Math.round(readNumber(raw.cloudMid, 0)), 0, 100),
    cloudHigh: clamp(Math.round(readNumber(raw.cloudHigh, 0)), 0, 100),
    humidity: clamp(Math.round(readNumber(raw.humidity, 60)), 0, 100),
    windSpeedKmh: Math.max(0, Number(readNumber(raw.windSpeedKmh, 8).toFixed(1))),
    visibilityKm: Math.max(
      0,
      Number((readNumber(raw.visibilityMeters, 24_000) / 1000).toFixed(1))
    ),
    temperatureC: Number(readNumber(raw.temperatureC, 20).toFixed(1)),
    dewPointC: Number(readNumber(raw.dewPointC, 12).toFixed(1)),
  };
}

function parseCurrentSample(
  current: Record<string, unknown>,
  fallbackTimestampMs: number
): WeatherSample {
  const unixSec = readNumber(current.time, Math.floor(fallbackTimestampMs / 1000));
  return buildWeatherSample(
    mapRawInput({
      cloudCover: current.cloud_cover,
      cloudLow: current.cloud_cover_low,
      cloudMid: current.cloud_cover_mid,
      cloudHigh: current.cloud_cover_high,
      humidity: current.relative_humidity_2m,
      windSpeedKmh: current.wind_speed_10m,
      visibilityMeters: current.visibility,
      temperatureC: current.temperature_2m,
      dewPointC: current.dew_point_2m,
    }),
    unixSec * 1000
  );
}

function parseHourlySamples(hourly: Record<string, unknown>): WeatherSample[] {
  const times = hourly.time;
  if (!Array.isArray(times) || times.length === 0) {
    throw new Error('Open-Meteo response missing hourly time array');
  }

  const pick = (key: string, idx: number): unknown => {
    const arr = hourly[key];
    return Array.isArray(arr) ? arr[idx] : undefined;
  };

  const samples: WeatherSample[] = [];
  for (let i = 0; i < times.length; i++) {
    const unixSec = times[i];
    if (typeof unixSec !== 'number' || !Number.isFinite(unixSec)) continue;
    samples.push(
      buildWeatherSample(
        mapRawInput({
          cloudCover: pick('cloud_cover', i),
          cloudLow: pick('cloud_cover_low', i),
          cloudMid: pick('cloud_cover_mid', i),
          cloudHigh: pick('cloud_cover_high', i),
          humidity: pick('relative_humidity_2m', i),
          windSpeedKmh: pick('wind_speed_10m', i),
          visibilityMeters: pick('visibility', i),
          temperatureC: pick('temperature_2m', i),
          dewPointC: pick('dew_point_2m', i),
        }),
        unixSec * 1000
      )
    );
  }

  if (samples.length === 0) {
    throw new Error('Open-Meteo hourly array contained no valid timestamps');
  }

  return samples;
}

export function parseOpenMeteoResponse(
  payload: unknown,
  latitude: number,
  longitude: number,
  fetchedAtMs = Date.now()
): WeatherForecastData {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid Open-Meteo payload');
  }
  const data = payload as Record<string, unknown>;
  if (!data.hourly || typeof data.hourly !== 'object') {
    throw new Error('Open-Meteo payload missing hourly forecast');
  }

  const hourly = parseHourlySamples(data.hourly as Record<string, unknown>);
  const current =
    data.current && typeof data.current === 'object'
      ? parseCurrentSample(data.current as Record<string, unknown>, fetchedAtMs)
      : hourly[0];

  const timezoneAbbreviation =
    typeof data.timezone_abbreviation === 'string' && data.timezone_abbreviation
      ? data.timezone_abbreviation
      : 'UTC';

  return {
    latitude,
    longitude,
    fetchedAtMs,
    timezoneAbbreviation,
    current,
    hourly,
  };
}

export function buildOpenMeteoUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(3),
    longitude: longitude.toFixed(3),
    current: WEATHER_VARIABLES,
    hourly: WEATHER_VARIABLES,
    past_days: '1',
    forecast_days: '3',
    timeformat: 'unixtime',
    timezone: 'auto',
  });
  return `${OPEN_METEO_ENDPOINT}?${params.toString()}`;
}

function hydrateMemoryCacheFromStorage(): void {
  if (memoryCache.size > 0 || typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, WeatherForecastData>;
    for (const [key, value] of Object.entries(parsed)) {
      if (value && Array.isArray(value.hourly)) {
        memoryCache.set(key, value);
      }
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }
}

function persistMemoryCacheToStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const entries = Array.from(memoryCache.entries()).slice(-MAX_CACHE_ENTRIES);
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore quota or private-browsing storage errors
  }
}

export function getCachedWeather(
  latitude: number,
  longitude: number,
  nowMs = Date.now()
): { data: WeatherForecastData; isExpired: boolean } | null {
  hydrateMemoryCacheFromStorage();
  const key = makeCacheKey(latitude, longitude);
  const entry = memoryCache.get(key);
  if (!entry) return null;
  return {
    data: entry,
    isExpired: nowMs - entry.fetchedAtMs > CACHE_TTL_MS,
  };
}

export function saveCachedWeather(data: WeatherForecastData): void {
  const key = makeCacheKey(data.latitude, data.longitude);
  memoryCache.delete(key);
  memoryCache.set(key, data);
  while (memoryCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey !== undefined) memoryCache.delete(oldestKey);
  }
  persistMemoryCacheToStorage();
}

export async function fetchAstronomyWeather(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<WeatherForecastData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(buildOpenMeteoUrl(latitude, longitude), {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo request failed with HTTP ${response.status}`);
    }
    const json: unknown = await response.json();
    const parsed = parseOpenMeteoResponse(json, latitude, longitude);
    saveCachedWeather(parsed);
    return parsed;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
