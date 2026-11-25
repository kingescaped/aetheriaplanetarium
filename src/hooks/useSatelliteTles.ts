import { useEffect, useState } from 'react';
import type { TleRecord } from '../types/satellite';
import { BUNDLED_SATELLITE_TLES } from '../data/satelliteFallbackTles';
import { fetchLiveSatelliteTles, loadCachedSatelliteTles } from '../services/celestrak';

export function useSatelliteTles(enabled: boolean): { tles: TleRecord[]; isLive: boolean } {
  const [tles, setTles] = useState<TleRecord[]>(
    () => loadCachedSatelliteTles() ?? BUNDLED_SATELLITE_TLES
  );

  useEffect(() => {
    if (!enabled) return;

    const cached = loadCachedSatelliteTles();
    if (cached && cached.some((r) => r.source === 'cache')) {
      setTles(cached);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const timer = window.setTimeout(() => {
      fetchLiveSatelliteTles(controller.signal).then((fresh) => {
        if (!active || controller.signal.aborted) return;
        if (fresh.some((r) => r.source === 'celestrak')) {
          setTles(fresh);
        }
      });
    }, 10000);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled]);

  const isLive = tles.some((r) => r.source === 'celestrak' || r.source === 'cache');
  return { tles, isLive };
}
