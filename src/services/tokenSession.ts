import { onIdTokenChanged, type User as FirebaseUser } from 'firebase/auth';
import { CLOUDFLARE_API_BASE } from '../config/firebaseConfig.ts';
import { getFirebaseAuth } from './firebase.ts';

export const REFRESH_SESSION_STORAGE_KEY = 'aetheria_session_refresh_v1';
export const ADMIN_GOD_MODE_STORAGE_KEY = 'aetheria_admin_godmode_enabled';

const WORKER_SESSION_TIMEOUT_MS = 8500;
const REFRESH_STALE_ROTATE_SEC = 12 * 3600;
const KEEP_ALIVE_LEAD_SEC = 300; // 5 min before expiry
const KEEP_ALIVE_MIN_DELAY_MS = 60_000;
const KEEP_ALIVE_WAKE_WINDOW_SEC = 600; // 10 min on wake/online

export interface StoredRefreshSession {
  refreshToken: string;
  expiresAt: number;
  uid: string;
  lastRefreshedAt: number;
}

export type MinimalTokenUser = Pick<FirebaseUser, 'uid' | 'getIdToken'> & {
  refreshToken?: string;
};

interface InFlightTokenEntry {
  forced: boolean;
  promise: Promise<string>;
}

const inFlightTokenRequests = new Map<string, InFlightTokenEntry>();

/**
 * Reads the persisted Admin God Mode toggle (defaults to `true`).
 */
export function readAdminGodModeEnabled(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem(ADMIN_GOD_MODE_STORAGE_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

/**
 * Persists the Admin God Mode toggle state cleanly.
 */
export function writeAdminGodModeEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ADMIN_GOD_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

function decodeBase64UrlUtf8(input: string): string | null {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);

  try {
    if (typeof atob === 'function') {
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Parses the numeric `exp` claim (Unix seconds) from a JWT without verifying signature.
 */
export function parseJwtExpSec(jwt: string): number | null {
  if (typeof jwt !== 'string') return null;
  const parts = jwt.split('.');
  if (parts.length !== 3 || !parts[1]) return null;

  const decoded = decodeBase64UrlUtf8(parts[1]);
  if (!decoded) return null;

  try {
    const payload = JSON.parse(decoded) as { exp?: unknown };
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      ? payload.exp
      : null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the JWT is missing/invalid or expires within `bufferSec` seconds.
 */
export function isTokenExpiringSoon(
  jwt: string,
  bufferSec: number = 120,
  nowSec: number = Math.floor(Date.now() / 1000)
): boolean {
  const exp = parseJwtExpSec(jwt);
  if (exp === null) return true;
  return exp <= nowSec + bufferSec;
}

export function readStoredRefreshSession(): StoredRefreshSession | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(REFRESH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRefreshSession>;
    if (
      !parsed ||
      typeof parsed.refreshToken !== 'string' ||
      !parsed.refreshToken ||
      typeof parsed.uid !== 'string' ||
      !parsed.uid ||
      typeof parsed.expiresAt !== 'number' ||
      !Number.isFinite(parsed.expiresAt)
    ) {
      return null;
    }
    return {
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      uid: parsed.uid,
      lastRefreshedAt:
        typeof parsed.lastRefreshedAt === 'number' && Number.isFinite(parsed.lastRefreshedAt)
          ? parsed.lastRefreshedAt
          : 0,
    };
  } catch {
    return null;
  }
}

export function saveStoredRefreshSession(session: StoredRefreshSession): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(REFRESH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredRefreshSession(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(REFRESH_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Exchanges the active Firebase ID token + Firebase refresh token for a 30-day
 * rotating Cloudflare D1 refresh session (`POST /api/auth/session`).
 */
export async function establishWorkerRefreshSession(
  firebaseUser: MinimalTokenUser,
  fetchImpl: typeof fetch = fetch
): Promise<StoredRefreshSession | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WORKER_SESSION_TIMEOUT_MS);

  try {
    const idToken = await firebaseUser.getIdToken();
    const res = await fetchImpl(`${CLOUDFLARE_API_BASE}/api/auth/session`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebaseRefreshToken: firebaseUser.refreshToken || '',
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      refreshToken?: unknown;
      expiresAt?: unknown;
      uid?: unknown;
    };

    if (
      typeof data?.refreshToken !== 'string' ||
      !data.refreshToken ||
      typeof data?.expiresAt !== 'number' ||
      !Number.isFinite(data.expiresAt)
    ) {
      return null;
    }

    const session: StoredRefreshSession = {
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      uid: typeof data.uid === 'string' && data.uid ? data.uid : firebaseUser.uid,
      lastRefreshedAt: Math.floor(Date.now() / 1000),
    };
    saveStoredRefreshSession(session);
    return session;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Rotates the stored Cloudflare refresh session (`POST /api/auth/refresh`).
 * Clears local storage ONLY when the server explicitly rejects (`401`/`403`) so
 * temporary offline periods do not log the observer out.
 */
export async function rotateWorkerRefreshSession(
  fetchImpl: typeof fetch = fetch
): Promise<StoredRefreshSession | null> {
  const stored = readStoredRefreshSession();
  if (!stored) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WORKER_SESSION_TIMEOUT_MS);

  try {
    const res = await fetchImpl(`${CLOUDFLARE_API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      clearStoredRefreshSession();
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      refreshToken?: unknown;
      expiresAt?: unknown;
      uid?: unknown;
    };

    if (
      typeof data?.refreshToken !== 'string' ||
      !data.refreshToken ||
      typeof data?.expiresAt !== 'number' ||
      !Number.isFinite(data.expiresAt)
    ) {
      return null;
    }

    const rotated: StoredRefreshSession = {
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      uid: typeof data.uid === 'string' && data.uid ? data.uid : stored.uid,
      lastRefreshedAt: Math.floor(Date.now() / 1000),
    };
    saveStoredRefreshSession(rotated);
    return rotated;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Revokes the Worker refresh session best-effort (`POST /api/auth/logout`) and clears storage.
 */
export async function revokeWorkerRefreshSession(
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const stored = readStoredRefreshSession();
  clearStoredRefreshSession();

  if (!stored?.refreshToken) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WORKER_SESSION_TIMEOUT_MS);

  try {
    await fetchImpl(`${CLOUDFLARE_API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
      signal: controller.signal,
    });
  } catch {
    // Best-effort revocation; local session is already cleared
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Single-flight Firebase ID token retriever that refreshes automatically when
 * expired or expiring within 120s and lazily rotates stale Worker refresh sessions (>12h).
 */
export function getValidIdToken(
  firebaseUser: MinimalTokenUser,
  options?: { forceRefresh?: boolean; fetchImpl?: typeof fetch }
): Promise<string> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const uid = firebaseUser.uid;

  const existing = inFlightTokenRequests.get(uid);
  if (existing && (existing.forced || !forceRefresh)) {
    return existing.promise;
  }

  const run = async (): Promise<string> => {
    let token: string;
    if (forceRefresh) {
      token = await firebaseUser.getIdToken(true);
    } else {
      token = await firebaseUser.getIdToken(false);
      if (isTokenExpiringSoon(token, 120)) {
        token = await firebaseUser.getIdToken(true);
      }
    }

    const stored = readStoredRefreshSession();
    const nowSec = Math.floor(Date.now() / 1000);
    if (
      stored &&
      stored.uid === uid &&
      nowSec - stored.lastRefreshedAt > REFRESH_STALE_ROTATE_SEC
    ) {
      void rotateWorkerRefreshSession(fetchImpl);
    }

    return token;
  };

  const entry: InFlightTokenEntry = {
    forced: forceRefresh,
    promise: run().finally(() => {
      if (inFlightTokenRequests.get(uid) === entry) {
        inFlightTokenRequests.delete(uid);
      }
    }),
  };

  inFlightTokenRequests.set(uid, entry);
  return entry.promise;
}

/**
 * Performs an authenticated fetch with fresh Firebase Bearer token and retries
 * ONCE with a force-refreshed ID token if the server responds `401`.
 */
export async function fetchWithAuthRefresh(
  firebaseUser: MinimalTokenUser,
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const token = await getValidIdToken(firebaseUser, { fetchImpl });
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const firstRes = await fetchImpl(url, { ...init, headers });
  if (firstRes.status !== 401) {
    return firstRes;
  }

  const freshToken = await getValidIdToken(firebaseUser, {
    forceRefresh: true,
    fetchImpl,
  });
  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${freshToken}`);
  return fetchImpl(url, { ...init, headers: retryHeaders });
}

/**
 * Hooks `onIdTokenChanged` + visibility/online recovery to proactively refresh
 * active Firebase ID tokens 5 minutes before expiry and rotate stale Worker sessions.
 */
export function startSessionKeepAlive(
  getActiveUser: () => FirebaseUser | null
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let disposed = false;
  let timerId = 0;

  const scheduleForUser = (user: FirebaseUser | null) => {
    window.clearTimeout(timerId);
    if (!user || disposed) return;

    user
      .getIdToken(false)
      .then((jwt) => {
        if (disposed) return;
        const exp = parseJwtExpSec(jwt);
        const nowSec = Math.floor(Date.now() / 1000);
        const rawDelayMs =
          exp !== null
            ? (exp - KEEP_ALIVE_LEAD_SEC - nowSec) * 1000
            : 50 * 60_000;
        const clampedDelayMs = Math.min(
          2_147_483_647,
          Math.max(KEEP_ALIVE_MIN_DELAY_MS, rawDelayMs)
        );

        timerId = window.setTimeout(() => {
          if (disposed) return;
          const active = getActiveUser();
          if (!active) return;
          getValidIdToken(active, { forceRefresh: true })
            .then(() => scheduleForUser(getActiveUser()))
            .catch(() => {
              // Retry gently on next visibility/online recovery or token event
            });
        }, clampedDelayMs);
      })
      .catch(() => {
        // Ignore transient token lookup errors while offline
      });
  };

  const handleWakeCheck = () => {
    if (disposed) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    const active = getActiveUser();
    if (!active) return;

    active
      .getIdToken(false)
      .then((jwt) => {
        if (disposed) return;
        if (isTokenExpiringSoon(jwt, KEEP_ALIVE_WAKE_WINDOW_SEC)) {
          return getValidIdToken(active, { forceRefresh: true }).then(() => {
            scheduleForUser(getActiveUser());
          });
        }
        const stored = readStoredRefreshSession();
        const nowSec = Math.floor(Date.now() / 1000);
        if (
          stored &&
          stored.uid === active.uid &&
          nowSec - stored.lastRefreshedAt > REFRESH_STALE_ROTATE_SEC
        ) {
          void rotateWorkerRefreshSession();
        }
        return undefined;
      })
      .catch(() => {
        // Ignore offline wake failures
      });
  };

  let unsubIdToken = () => {};
  try {
    unsubIdToken = onIdTokenChanged(getFirebaseAuth(), (user) => {
      scheduleForUser(user);
    });
  } catch {
    // Safe guard in constrained environments
  }

  scheduleForUser(getActiveUser());
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleWakeCheck);
  }
  window.addEventListener('online', handleWakeCheck);

  return () => {
    disposed = true;
    window.clearTimeout(timerId);
    unsubIdToken();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleWakeCheck);
    }
    window.removeEventListener('online', handleWakeCheck);
  };
}
