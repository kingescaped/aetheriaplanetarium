import { useCallback, useEffect, useRef, useState } from 'react';
import { CLOUDFLARE_API_BASE } from '../config/firebaseConfig.ts';
import type { ObserverLocation } from '../types/celestial.ts';
import { TRANSLATIONS, type Language } from '../utils/i18n.ts';

export interface UseGeolocationResult {
  locate: () => Promise<ObserverLocation | null>;
  isLocating: boolean;
  error: string | null;
  clearError: () => void;
  lastAccuracy: number | null;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12_000,
  maximumAge: 60_000,
};

const REVERSE_GEOCODE_TIMEOUT_MS = 5500;
const BIGDATACLOUD_REVERSE_URL =
  'https://api.bigdatacloud.net/data/reverse-geocode-client';

/**
 * Validates geographic latitude/longitude ranges.
 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Formats coordinates as a clean human-readable fallback location label.
 */
export function formatCoordinateFallbackName(
  latitude: number,
  longitude: number,
  lang: Language = 'vi'
): string {
  const latHemisphere = latitude >= 0 ? 'N' : 'S';
  const lonHemisphere = longitude >= 0 ? 'E' : 'W';
  const formattedCoords = `${Math.abs(latitude).toFixed(2)}°${latHemisphere}, ${Math.abs(longitude).toFixed(2)}°${lonHemisphere}`;
  const prefix = TRANSLATIONS[lang].geoResolvedPlace;
  return `${prefix} (${formattedCoords})`;
}

/**
 * Extracts a concise place name from either our Cloudflare Worker /api/geocode/reverse
 * response or BigDataCloud's reverse-geocode-client JSON response.
 */
export function formatReverseGeocodePlace(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;

  if (typeof data.name === 'string' && data.name.trim()) {
    return data.name.trim();
  }

  const rawParts = [data.locality, data.city, data.principalSubdivision, data.countryName]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  const uniqueParts: string[] = [];
  for (const part of rawParts) {
    const normalized = part.toLowerCase();
    if (!uniqueParts.some((existing) => existing.toLowerCase() === normalized)) {
      uniqueParts.push(part);
    }
  }

  if (uniqueParts.length === 0) return null;
  return uniqueParts.slice(0, 2).join(', ');
}

/**
 * Maps standard GeolocationPositionError codes into bilingual user guidance.
 */
export function mapGeolocationError(
  code: number | undefined,
  lang: Language = 'vi'
): string {
  const t = TRANSLATIONS[lang];
  switch (code) {
    case 1: // PERMISSION_DENIED
      return t.geoErrorPermissionDenied;
    case 2: // POSITION_UNAVAILABLE
      return t.geoErrorUnavailable;
    case 3: // TIMEOUT
      return t.geoErrorTimeout;
    default:
      return t.geoErrorUnknown;
  }
}

async function fetchJsonWithTimeout(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Reverse-geocodes latitude/longitude via Cloudflare Worker first, falling back to
 * BigDataCloud free public endpoint and finally formatted coordinates if offline.
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
  lang: Language = 'vi',
  apiBase: string = CLOUDFLARE_API_BASE,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  if (!isValidCoordinate(latitude, longitude)) {
    throw new Error('Invalid coordinates for reverse geocoding.');
  }

  const workerUrl = `${apiBase}/api/geocode/reverse?lat=${encodeURIComponent(
    latitude.toFixed(4)
  )}&lon=${encodeURIComponent(longitude.toFixed(4))}&lang=${lang}`;

  const workerPayload = await fetchJsonWithTimeout(
    workerUrl,
    fetchImpl,
    REVERSE_GEOCODE_TIMEOUT_MS
  );
  const workerPlace = formatReverseGeocodePlace(workerPayload);
  if (workerPlace) return workerPlace;

  const fallbackUrl = `${BIGDATACLOUD_REVERSE_URL}?latitude=${encodeURIComponent(
    latitude.toFixed(4)
  )}&longitude=${encodeURIComponent(longitude.toFixed(4))}&localityLanguage=${lang}`;

  const bigDataPayload = await fetchJsonWithTimeout(
    fallbackUrl,
    fetchImpl,
    REVERSE_GEOCODE_TIMEOUT_MS
  );
  const bigDataPlace = formatReverseGeocodePlace(bigDataPayload);
  if (bigDataPlace) return bigDataPlace;

  return formatCoordinateFallbackName(latitude, longitude, lang);
}

function requestBrowserPosition(
  options: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * React hook providing high-accuracy browser GPS location + reverse-geocoding
 * with bilingual Vietnamese/English error feedback.
 */
export function useGeolocation(lang: Language): UseGeolocationResult {
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const locate = useCallback(async (): Promise<ObserverLocation | null> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      if (isMountedRef.current) {
        setError(TRANSLATIONS[lang].geoErrorUnsupported);
      }
      return null;
    }

    if (isMountedRef.current) {
      setIsLocating(true);
      setError(null);
    }

    try {
      const position = await requestBrowserPosition(GEOLOCATION_OPTIONS);
      const { latitude, longitude, accuracy } = position.coords;

      if (isMountedRef.current && Number.isFinite(accuracy)) {
        setLastAccuracy(Math.round(accuracy));
      }

      const placeName = await reverseGeocodeCoordinates(latitude, longitude, lang);

      return {
        latitude,
        longitude,
        name: placeName,
      };
    } catch (err) {
      const geoCode =
        err && typeof err === 'object' && 'code' in err
          ? Number((err as { code?: unknown }).code)
          : undefined;
      if (isMountedRef.current) {
        setError(mapGeolocationError(geoCode, lang));
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setIsLocating(false);
      }
    }
  }, [lang]);

  return {
    locate,
    isLocating,
    error,
    clearError,
    lastAccuracy,
  };
}
