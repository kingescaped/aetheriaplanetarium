import type { SatelliteId, TleRecord } from '../types/satellite.ts';
import { BUNDLED_SATELLITE_TLES } from '../data/satelliteFallbackTles.ts';

const STORAGE_KEY = 'aetheria_sat_tles_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

interface CachedTlePayload {
  cachedAtMs: number;
  records: Array<{
    id: SatelliteId;
    noradId: number;
    line1: string;
    line2: string;
    fetchedAtMs: number;
  }>;
}

export function isValidTlePair(line1: string, line2: string): boolean {
  const l1 = line1.trim();
  const l2 = line2.trim();
  return l1.startsWith('1 ') && l2.startsWith('2 ') && l1.length >= 60 && l2.length >= 60;
}

export function parseCelesTrakTleResponse(rawText: string): { line1: string; line2: string } | null {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as { line1?: string; line2?: string };
      if (
        typeof json.line1 === 'string' &&
        typeof json.line2 === 'string' &&
        isValidTlePair(json.line1, json.line2)
      ) {
        return { line1: json.line1.trim(), line2: json.line2.trim() };
      }
      return null;
    } catch {
      return null;
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length - 1; i++) {
    if (isValidTlePair(lines[i], lines[i + 1])) {
      return { line1: lines[i], line2: lines[i + 1] };
    }
  }
  return null;
}

export function loadCachedSatelliteTles(nowMs = Date.now()): TleRecord[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTlePayload;
    if (!parsed || !Array.isArray(parsed.records)) return null;
    if (nowMs - parsed.cachedAtMs > CACHE_TTL_MS) return null;

    return BUNDLED_SATELLITE_TLES.map((base) => {
      const match = parsed.records.find((r) => r.noradId === base.noradId);
      if (!match || !isValidTlePair(match.line1, match.line2)) return base;
      return {
        ...base,
        line1: match.line1,
        line2: match.line2,
        source: 'cache' as const,
        fetchedAtMs: match.fetchedAtMs,
      };
    });
  } catch {
    return null;
  }
}

function saveCachedSatelliteTles(records: TleRecord[], nowMs: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: CachedTlePayload = {
      cachedAtMs: nowMs,
      records: records.map((r) => ({
        id: r.id,
        noradId: r.noradId,
        line1: r.line1,
        line2: r.line2,
        fetchedAtMs: r.fetchedAtMs,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

async function fetchSingleNoradTle(
  noradId: number,
  signal?: AbortSignal
): Promise<{ line1: string; line2: string } | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const url = `https://tle.ivanstanojevic.me/api/tle/${noradId}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const text = await res.text();
    return parseCelesTrakTleResponse(text);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function fetchLiveSatelliteTles(signal?: AbortSignal): Promise<TleRecord[]> {
  const nowMs = Date.now();
  const results = await Promise.all(
    BUNDLED_SATELLITE_TLES.map(async (base) => {
      const live = await fetchSingleNoradTle(base.noradId, signal);
      if (!live) return base;
      return {
        ...base,
        line1: live.line1,
        line2: live.line2,
        source: 'celestrak' as const,
        fetchedAtMs: nowMs,
      };
    })
  );

  if (results.some((r) => r.source === 'celestrak')) {
    saveCachedSatelliteTles(results, nowMs);
  }
  return results;
}
