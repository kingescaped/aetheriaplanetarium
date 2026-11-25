import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ObserverLocation } from '../types/celestial';
import type {
  ResolvedSkyWeather,
  WeatherForecastData,
  WeatherStatus,
} from '../types/weather';
import {
  fetchAstronomyWeather,
  getCachedWeather,
} from '../services/openMeteo';
import { interpolateWeatherAtDate } from '../utils/seeingModel';

export interface UseAstronomyWeatherResult {
  status: WeatherStatus;
  forecast: WeatherForecastData | null;
  resolved: ResolvedSkyWeather | null;
  isStale: boolean;
  error: string | null;
  refresh: () => void;
}

const LOCATION_DEBOUNCE_MS = 400;

export function useAstronomyWeather(
  location: ObserverLocation,
  currentDate: Date,
  simulateSkyWeather: boolean
): UseAstronomyWeatherResult {
  const [status, setStatus] = useState<WeatherStatus>('idle');
  const [forecast, setForecast] = useState<WeatherForecastData | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const lastProcessedRefreshRef = useRef<number>(0);

  const refresh = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const isManualRefresh = refreshTick !== lastProcessedRefreshRef.current;
    lastProcessedRefreshRef.current = refreshTick;

    const cached = getCachedWeather(location.latitude, location.longitude);
    if (cached) {
      setForecast(cached.data);
      setIsStale(cached.isExpired);
      setStatus('ready');
      setError(null);
      if (!cached.isExpired && !isManualRefresh) {
        return;
      }
    } else {
      setForecast(null);
      setIsStale(false);
      setStatus('loading');
      setError(null);
    }

    const controller = new AbortController();
    const delay = isManualRefresh ? 0 : LOCATION_DEBOUNCE_MS;

    const timerId = window.setTimeout(async () => {
      if (!cached) setStatus('loading');
      try {
        const fresh = await fetchAstronomyWeather(
          location.latitude,
          location.longitude,
          controller.signal
        );
        if (controller.signal.aborted) return;
        setForecast(fresh);
        setIsStale(false);
        setStatus('ready');
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : 'Unable to fetch weather data';
        setError(message);
        if (cached) {
          setForecast(cached.data);
          setIsStale(true);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      }
    }, delay);

    return () => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [location.latitude, location.longitude, refreshTick]);

  const minuteBucket = Math.floor(currentDate.getTime() / 60_000);

  const resolved = useMemo<ResolvedSkyWeather | null>(() => {
    if (!forecast) return null;
    return interpolateWeatherAtDate(
      forecast,
      new Date(minuteBucket * 60_000),
      simulateSkyWeather
    );
  }, [forecast, minuteBucket, simulateSkyWeather]);

  return {
    status,
    forecast,
    resolved,
    isStale,
    error,
    refresh,
  };
}
