import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGuestUserProfile,
  isAdminUser,
  type UserProfile,
} from '../src/types/account.ts';
import {
  base64ByteLength,
  computeCenterCropRect,
  validateAvatarFile,
} from '../src/utils/avatarResize.ts';
import { mapAuthError } from '../src/services/authService.ts';
import {
  formatCoordinateFallbackName,
  formatReverseGeocodePlace,
  isValidCoordinate,
  mapGeolocationError,
  reverseGeocodeCoordinates,
} from '../src/hooks/useGeolocation.ts';
import {
  resolveAdminBadgeLabel,
  verifyAccountWithWorker,
} from '../src/services/profileApi.ts';
import {
  ADMIN_GOD_MODE_STORAGE_KEY,
  clearStoredRefreshSession,
  fetchWithAuthRefresh,
  getValidIdToken,
  isTokenExpiringSoon,
  parseJwtExpSec,
  readAdminGodModeEnabled,
  readStoredRefreshSession,
  REFRESH_SESSION_STORAGE_KEY,
  revokeWorkerRefreshSession,
  rotateWorkerRefreshSession,
  saveStoredRefreshSession,
  writeAdminGodModeEnabled,
  type MinimalTokenUser,
} from '../src/services/tokenSession.ts';

function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'uid_test_1',
    name: 'Test Observer',
    callsign: 'TEST_OBS',
    email: 'observer@example.com',
    avatarUrl: '',
    rank: 'Observer',
    role: 'observer',
    joinedDate: 'Nov 2026',
    isGuest: false,
    ...overrides,
  };
}

describe('isAdminUser & UserProfile helpers', () => {
  it('returns true only when signed in with role supreme_admin', () => {
    const admin = buildProfile({
      email: 'admin@lvq.std',
      role: 'supreme_admin',
      rank: 'Supreme Sovereign',
      isGuest: false,
    });
    assert.equal(isAdminUser(admin), true);
  });

  it('returns false for guests even if role is spoofed', () => {
    const spoofedGuest = buildProfile({
      role: 'supreme_admin',
      isGuest: true,
    });
    assert.equal(isAdminUser(spoofedGuest), false);
    assert.equal(isAdminUser(createGuestUserProfile('vi')), false);
    assert.equal(isAdminUser(null), false);
    assert.equal(isAdminUser(undefined), false);
  });

  it('returns false for standard authenticated observers', () => {
    const observer = buildProfile({ role: 'observer', isGuest: false });
    assert.equal(isAdminUser(observer), false);
  });
});

describe('mapAuthError', () => {
  it('maps Firebase credential errors clearly in Vietnamese and English', () => {
    const viMsg = mapAuthError('auth/invalid-credential', 'vi');
    const enMsg = mapAuthError('auth/invalid-credential', 'en');
    assert.match(viMsg, /Email hoặc mật khẩu/);
    assert.match(enMsg, /Incorrect email or password/);
  });

  it('extracts Firebase auth code from Error.code and Error.message', () => {
    const errObj = Object.assign(new Error('Firebase: Error (auth/email-already-in-use).'), {
      code: 'auth/email-already-in-use',
    });
    assert.match(mapAuthError(errObj, 'en'), /already registered/i);

    const errMsgOnly = new Error('Firebase: Password should be at least 6 characters (auth/weak-password).');
    assert.match(mapAuthError(errMsgOnly, 'vi'), /6 ký tự/);
  });

  it('provides clean fallback message for unknown error codes', () => {
    assert.ok(mapAuthError('auth/unknown-custom-code', 'en').length > 10);
    assert.ok(mapAuthError(null, 'vi').length > 10);
  });
});

describe('avatarResize helpers', () => {
  it('validates allowed image mime types and raw size limits', () => {
    assert.deepEqual(validateAvatarFile({ type: 'image/webp', size: 1024 }), { valid: true });
    assert.deepEqual(validateAvatarFile({ type: 'image/png', size: 512_000 }), { valid: true });
    assert.deepEqual(validateAvatarFile({ type: 'image/gif', size: 1024 }), {
      valid: false,
      reason: 'type',
    });
    assert.deepEqual(validateAvatarFile({ type: 'image/jpeg', size: 20 * 1024 * 1024 }), {
      valid: false,
      reason: 'size',
    });
  });

  it('computes centered square crop rectangles and accurate base64 byte sizes', () => {
    assert.deepEqual(computeCenterCropRect(1200, 800), { sx: 200, sy: 0, size: 800 });
    assert.deepEqual(computeCenterCropRect(600, 1000), { sx: 0, sy: 200, size: 600 });
    assert.equal(base64ByteLength('SGVsbG8='), 5);
    assert.equal(base64ByteLength(''), 0);
  });
});

describe('geolocation & reverse-geocode helpers', () => {
  it('validates geographic coordinate bounds and formats fallback coordinates', () => {
    assert.equal(isValidCoordinate(21.0285, 105.8542), true);
    assert.equal(isValidCoordinate(-90, 180), true);
    assert.equal(isValidCoordinate(91, 105), false);
    assert.equal(isValidCoordinate(21, -181), false);
    assert.equal(isValidCoordinate(Number.NaN, 105), false);

    assert.equal(
      formatCoordinateFallbackName(21.0285, 105.8542, 'vi'),
      'Vị trí hiện tại (21.03°N, 105.85°E)'
    );
    assert.equal(
      formatCoordinateFallbackName(-33.86, 151.21, 'en'),
      'Current Location (33.86°S, 151.21°E)'
    );
  });

  it('parses Cloudflare Worker and BigDataCloud reverse-geocode responses concisely', () => {
    assert.equal(
      formatReverseGeocodePlace({ name: 'Quận Hoàn Kiếm, Hà Nội', city: 'Hà Nội', country: 'Việt Nam' }),
      'Quận Hoàn Kiếm, Hà Nội'
    );
    assert.equal(
      formatReverseGeocodePlace({
        locality: 'Hoan Kiem',
        city: 'Hanoi',
        principalSubdivision: 'Hanoi',
        countryName: 'Vietnam',
      }),
      'Hoan Kiem, Hanoi'
    );
    assert.equal(formatReverseGeocodePlace({}), null);
  });

  it('falls back cleanly from Cloudflare Worker -> BigDataCloud -> coordinates', async () => {
    // 1. Worker succeeds
    const workerFetch = (async () =>
      new Response(JSON.stringify({ name: 'Hoàn Kiếm, Hà Nội' }), {
        status: 200,
      })) as unknown as typeof fetch;

    const place1 = await reverseGeocodeCoordinates(
      21.0285,
      105.8542,
      'vi',
      'https://mock-worker.invalid',
      workerFetch
    );
    assert.equal(place1, 'Hoàn Kiếm, Hà Nội');

    // 2. Worker fails, BigDataCloud succeeds
    let callCount = 0;
    const fallbackFetch = (async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response('err', { status: 502 });
      }
      return new Response(
        JSON.stringify({ locality: 'District 1', city: 'Ho Chi Minh City' }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const place2 = await reverseGeocodeCoordinates(
      10.7769,
      106.7009,
      'en',
      'https://mock-worker.invalid',
      fallbackFetch
    );
    assert.equal(place2, 'District 1, Ho Chi Minh City');

    // 3. Offline: both fail -> formatted coordinates
    const offlineFetch = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;

    const place3 = await reverseGeocodeCoordinates(
      21.0285,
      105.8542,
      'vi',
      'https://mock-worker.invalid',
      offlineFetch
    );
    assert.equal(place3, 'Vị trí hiện tại (21.03°N, 105.85°E)');
  });

  it('maps GeolocationPositionError codes to bilingual messages', () => {
    assert.match(mapGeolocationError(1, 'vi'), /từ chối/i);
    assert.match(mapGeolocationError(1, 'en'), /denied/i);
    assert.match(mapGeolocationError(2, 'en'), /unavailable/i);
    assert.match(mapGeolocationError(3, 'vi'), /Hết thời gian/);
    assert.ok(mapGeolocationError(undefined, 'en').length > 10);
  });
});

describe('verifyAccountWithWorker', () => {
  it('verifies admin role only when server confirms isAdmin and supreme_admin', async () => {
    let capturedAuth = '';
    const okAdminFetch = (async (_url: string, init?: RequestInit) => {
      capturedAuth = String((init?.headers as Record<string, string>)?.Authorization || '');
      return new Response(
        JSON.stringify({
          uid: 'admin_uid_1',
          email: 'admin@lvq.std',
          role: 'supreme_admin',
          isAdmin: true,
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const adminResult = await verifyAccountWithWorker('token_123', okAdminFetch);
    assert.equal(capturedAuth, 'Bearer token_123');
    assert.deepEqual(adminResult, {
      uid: 'admin_uid_1',
      email: 'admin@lvq.std',
      role: 'supreme_admin',
      isAdmin: true,
    });

    // Reject spoofed role when isAdmin is false
    const downgradedFetch = (async () =>
      new Response(
        JSON.stringify({
          uid: 'obs_uid_2',
          email: 'observer@example.com',
          role: 'supreme_admin',
          isAdmin: false,
        }),
        { status: 200 }
      )) as unknown as typeof fetch;

    const obsResult = await verifyAccountWithWorker('token_456', downgradedFetch);
    assert.deepEqual(obsResult, {
      uid: 'obs_uid_2',
      email: 'observer@example.com',
      role: 'observer',
      isAdmin: false,
    });

    // Returns null gracefully on 401/network failure
    const unauthFetch = (async () => new Response('Unauthorized', { status: 401 })) as unknown as typeof fetch;
    assert.equal(await verifyAccountWithWorker('bad_token', unauthFetch), null);
  });
});

describe('resolveAdminBadgeLabel', () => {
  it('always resolves badge label to ADMIN regardless of legacy Firestore titles', () => {
    assert.equal(resolveAdminBadgeLabel('CHÍ TÔN QUẢN TRỊ'), 'ADMIN');
    assert.equal(resolveAdminBadgeLabel(undefined), 'ADMIN');
    assert.equal(resolveAdminBadgeLabel(''), 'ADMIN');
  });
});

function encodeFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

function withMockLocalStorage(fn: (store: Map<string, string>) => Promise<void> | void) {
  return async () => {
    const store = new Map<string, string>();
    const prevDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const mockStorage: Storage = {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });

    try {
      await fn(store);
    } finally {
      if (prevDescriptor) {
        Object.defineProperty(globalThis, 'localStorage', prevDescriptor);
      } else {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      }
    }
  };
}

describe('tokenSession & God Mode storage helpers', () => {
  it('parses JWT exp claims and evaluates isTokenExpiringSoon accurately', () => {
    const jwt = encodeFakeJwt({ sub: 'uid_1', exp: 2_000_000 });
    assert.equal(parseJwtExpSec(jwt), 2_000_000);
    assert.equal(parseJwtExpSec('not.a.jwt'), null);
    assert.equal(parseJwtExpSec('broken'), null);

    // Within 120s buffer -> true; well ahead -> false; malformed -> true
    assert.equal(isTokenExpiringSoon(jwt, 120, 1_999_900), true);
    assert.equal(isTokenExpiringSoon(jwt, 120, 1_999_500), false);
    assert.equal(isTokenExpiringSoon('malformed', 120, 1_999_500), true);
  });

  it(
    'defaults Admin God Mode to true and persists toggle changes cleanly',
    withMockLocalStorage((store) => {
      assert.equal(readAdminGodModeEnabled(), true);

      writeAdminGodModeEnabled(false);
      assert.equal(store.get(ADMIN_GOD_MODE_STORAGE_KEY), 'false');
      assert.equal(readAdminGodModeEnabled(), false);

      writeAdminGodModeEnabled(true);
      assert.equal(store.get(ADMIN_GOD_MODE_STORAGE_KEY), 'true');
      assert.equal(readAdminGodModeEnabled(), true);
    })
  );

  it(
    'deduplicates single-flight token requests and retries once with forceRefresh on 401',
    withMockLocalStorage(async () => {
      const futureJwt = encodeFakeJwt({
        sub: 'uid_single_flight',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const freshJwt = encodeFakeJwt({
        sub: 'uid_single_flight',
        exp: Math.floor(Date.now() / 1000) + 7200,
      });

      let getIdTokenCalls = 0;
      const mockUser: MinimalTokenUser = {
        uid: 'uid_single_flight',
        async getIdToken(forceRefresh?: boolean) {
          getIdTokenCalls += 1;
          await new Promise((r) => setTimeout(r, 15));
          return forceRefresh ? freshJwt : futureJwt;
        },
      };

      const [t1, t2] = await Promise.all([
        getValidIdToken(mockUser),
        getValidIdToken(mockUser),
      ]);
      assert.equal(t1, futureJwt);
      assert.equal(t2, futureJwt);
      assert.equal(getIdTokenCalls, 1);

      const authHeaders: string[] = [];
      let fetchCalls = 0;
      const retryFetch = (async (_url: string, init?: RequestInit) => {
        fetchCalls += 1;
        authHeaders.push(new Headers(init?.headers).get('Authorization') || '');
        if (fetchCalls === 1) {
          return new Response(JSON.stringify({ error: 'Expired' }), { status: 401 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }) as unknown as typeof fetch;

      const res = await fetchWithAuthRefresh(
        mockUser,
        'https://mock-worker.invalid/api/auth/verify',
        { method: 'GET' },
        retryFetch
      );
      assert.equal(res.status, 200);
      assert.deepEqual(authHeaders, [`Bearer ${futureJwt}`, `Bearer ${freshJwt}`]);
    })
  );

  it(
    'rotates refresh tokens on 200, preserves offline sessions on 500, and clears only on 401/403',
    withMockLocalStorage(async (store) => {
      saveStoredRefreshSession({
        refreshToken: 'rt_old_1',
        expiresAt: 9_999_999_999,
        uid: 'uid_rt',
        lastRefreshedAt: 100,
      });

      const okRotateFetch = (async () =>
        new Response(
          JSON.stringify({
            refreshToken: 'rt_new_2',
            expiresAt: 9_999_999_999,
            uid: 'uid_rt',
          }),
          { status: 200 }
        )) as unknown as typeof fetch;

      const rotated = await rotateWorkerRefreshSession(okRotateFetch);
      assert.equal(rotated?.refreshToken, 'rt_new_2');
      assert.equal(readStoredRefreshSession()?.refreshToken, 'rt_new_2');

      // Temporary 500 keeps stored session intact
      const serverErrFetch = (async () =>
        new Response('Server error', { status: 500 })) as unknown as typeof fetch;
      assert.equal(await rotateWorkerRefreshSession(serverErrFetch), null);
      assert.equal(readStoredRefreshSession()?.refreshToken, 'rt_new_2');

      // Explicit 401 clears stored session
      const unauthFetch = (async () =>
        new Response('Invalid', { status: 401 })) as unknown as typeof fetch;
      assert.equal(await rotateWorkerRefreshSession(unauthFetch), null);
      assert.equal(readStoredRefreshSession(), null);
      assert.equal(store.has(REFRESH_SESSION_STORAGE_KEY), false);

      clearStoredRefreshSession();
    })
  );

  it(
    'revokes refresh session best-effort on logout and clears local storage',
    withMockLocalStorage(async () => {
      saveStoredRefreshSession({
        refreshToken: 'rt_logout_1',
        expiresAt: 9_999_999_999,
        uid: 'uid_logout',
        lastRefreshedAt: 100,
      });

      let logoutBody = '';
      const logoutFetch = (async (_url: string, init?: RequestInit) => {
        logoutBody = String(init?.body || '');
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }) as unknown as typeof fetch;

      await revokeWorkerRefreshSession(logoutFetch);
      assert.match(logoutBody, /rt_logout_1/);
      assert.equal(readStoredRefreshSession(), null);
    })
  );
});
