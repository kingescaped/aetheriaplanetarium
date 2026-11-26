const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MAX_AVATAR_BYTES = 400 * 1024;
const REFRESH_TTL_SEC = 2592000; // 30 days
const STS_TIMEOUT_MS = 5000;
const ALLOWED_IMAGE_TYPES = new Set(['image/webp', 'image/jpeg', 'image/png']);
const EXACT_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
]);
const GITHUB_PAGES_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.github\.io$/i;

let cachedJwks = null;
let cachedJwksExpiresAt = 0;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return EXACT_ALLOWED_ORIGINS.has(origin) || GITHUB_PAGES_ORIGIN_RE.test(origin);
}

function buildCorsHeaders(request, allowWildcardWhenNoOrigin = false) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (!origin && allowWildcardWhenNoOrigin) {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

function jsonResponse(data, status, request, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...buildCorsHeaders(request, true),
      ...extraHeaders,
    },
  });
}

function generateRefreshToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function resolveRole(email, env) {
  const adminEmail = (env.ADMIN_EMAIL || 'admin@lvq.std').toLowerCase();
  const isAdmin = typeof email === 'string' && email.toLowerCase() === adminEmail;
  return {
    role: isAdmin ? 'supreme_admin' : 'observer',
    isAdmin,
  };
}

function base64UrlToUint8Array(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson(input) {
  const bytes = base64UrlToUint8Array(input);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

function decodeStandardBase64ToBytes(base64Input) {
  const cleaned = base64Input.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  if (!cleaned || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    return null;
  }
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { cleaned, bytes };
}

async function fetchGoogleJwks(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedJwks && now < cachedJwksExpiresAt) {
    return cachedJwks;
  }

  const res = await fetch(JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase JWKS (${res.status})`);
  }

  const cacheControl = res.headers.get('Cache-Control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Math.min(Number(maxAgeMatch[1]), 3600) : 300;
  const body = await res.json();
  if (!Array.isArray(body.keys)) {
    throw new Error('Invalid JWKS payload');
  }

  cachedJwks = body.keys;
  cachedJwksExpiresAt = now + maxAgeSec * 1000;
  return cachedJwks;
}

async function verifyFirebaseIdToken(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing Bearer token');
  }

  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeBase64UrlJson(headerB64);
  const payload = decodeBase64UrlJson(payloadB64);

  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    throw new Error('Unsupported JWT header');
  }

  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Worker FIREBASE_PROJECT_ID is not configured');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) {
    throw new Error('Invalid token audience');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Invalid token issuer');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) {
    throw new Error('Invalid token subject');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Token expired');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Invalid token issued-at time');
  }
  if (typeof payload.auth_time !== 'number' || payload.auth_time > nowSec + 300) {
    throw new Error('Invalid token auth_time');
  }

  let keys = await fetchGoogleJwks(false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await fetchGoogleJwks(true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new Error('Signing key not found');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlToUint8Array(signatureB64);
  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    signingInput
  );

  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : '',
    emailVerified: Boolean(payload.email_verified),
  };
}

async function exchangeFirebaseRefreshToken(firebaseRefreshToken, apiKey) {
  if (!firebaseRefreshToken || !apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STS_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: firebaseRefreshToken,
        }).toString(),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || typeof data.id_token !== 'string' || !data.id_token) {
      return null;
    }

    const expiresInNum = Number(data.expires_in);
    return {
      idToken: data.id_token,
      idTokenExpiresIn: Number.isFinite(expiresInNum) ? expiresInNum : undefined,
      firebaseRefreshToken:
        typeof data.refresh_token === 'string' && data.refresh_token.trim()
          ? data.refresh_token.trim()
          : firebaseRefreshToken,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseOptionalJson(request) {
  const raw = await request.text();
  if (!raw.trim()) {
    return { ok: true, data: {} };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, data: null };
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, data: null };
  }
}

function formatPlaceName(nominatimData, lat, lon) {
  const addr = (nominatimData && nominatimData.address) || {};
  const district =
    addr.city_district ||
    addr.district ||
    addr.suburb ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    '';
  const city = addr.city || addr.state || addr.province || addr.region || addr.county || '';
  const country = addr.country || '';

  let name = '';
  if (district && city && district.toLowerCase() !== city.toLowerCase()) {
    name = `${district}, ${city}`;
  } else if (city && country) {
    name = `${city}, ${country}`;
  } else if (city || district) {
    name = city || district;
  } else if (country) {
    name = country;
  } else if (typeof nominatimData?.display_name === 'string' && nominatimData.display_name.trim()) {
    name = nominatimData.display_name
      .split(',')
      .slice(0, 2)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
  } else {
    name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }

  return {
    name,
    city: city || district || name,
    country,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      if (origin && !isAllowedOrigin(origin)) {
        return new Response('Forbidden origin', { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request, true),
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return jsonResponse(
        {
          ok: true,
          service: 'aetheria-planetarium-api',
          projectId: env.FIREBASE_PROJECT_ID || '',
        },
        200,
        request
      );
    }

    if (request.method === 'GET' && url.pathname === '/api/auth/verify') {
      try {
        const verified = await verifyFirebaseIdToken(request, env);
        const { role, isAdmin } = resolveRole(verified.email, env);
        return jsonResponse(
          {
            uid: verified.uid,
            email: verified.email,
            role,
            isAdmin,
          },
          200,
          request
        );
      } catch (err) {
        return jsonResponse(
          { error: err instanceof Error ? err.message : 'Unauthorized' },
          401,
          request
        );
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/session') {
      let verified;
      try {
        verified = await verifyFirebaseIdToken(request, env);
      } catch (err) {
        return jsonResponse(
          { error: err instanceof Error ? err.message : 'Unauthorized' },
          401,
          request
        );
      }

      const parsed = await parseOptionalJson(request);
      if (!parsed.ok) {
        return jsonResponse({ error: 'Invalid JSON body' }, 400, request);
      }

      const firebaseRefreshToken =
        typeof parsed.data.firebaseRefreshToken === 'string' &&
        parsed.data.firebaseRefreshToken.trim()
          ? parsed.data.firebaseRefreshToken.trim()
          : null;

      const { role, isAdmin } = resolveRole(verified.email, env);
      const nowSec = Math.floor(Date.now() / 1000);
      const expiresAt = nowSec + REFRESH_TTL_SEC;
      const refreshToken = generateRefreshToken();
      const tokenHash = await sha256Hex(refreshToken);

      await env.AETHERIA_DB.prepare(
        'DELETE FROM refresh_sessions WHERE uid = ?1 AND expires_at <= ?2'
      )
        .bind(verified.uid, nowSec)
        .run();

      await env.AETHERIA_DB.prepare(
        `INSERT INTO refresh_sessions (
           token_hash, uid, email, role, firebase_refresh_token, expires_at, created_at, last_used_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
      )
        .bind(
          tokenHash,
          verified.uid,
          verified.email,
          role,
          firebaseRefreshToken,
          expiresAt,
          nowSec,
          nowSec
        )
        .run();

      return jsonResponse(
        {
          refreshToken,
          expiresAt,
          expiresInSec: REFRESH_TTL_SEC,
          uid: verified.uid,
          email: verified.email,
          role,
          isAdmin,
        },
        200,
        request
      );
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/refresh') {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400, request);
      }

      const rawRefreshToken =
        typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';
      if (!rawRefreshToken) {
        return jsonResponse({ error: 'Missing refreshToken' }, 400, request);
      }

      const tokenHash = await sha256Hex(rawRefreshToken);
      const row = await env.AETHERIA_DB.prepare(
        `SELECT token_hash, uid, email, role, firebase_refresh_token, expires_at
         FROM refresh_sessions
         WHERE token_hash = ?1`
      )
        .bind(tokenHash)
        .first();

      if (!row) {
        return jsonResponse({ error: 'Invalid refresh token' }, 401, request);
      }

      const nowSec = Math.floor(Date.now() / 1000);
      if (typeof row.expires_at !== 'number' || row.expires_at <= nowSec) {
        await env.AETHERIA_DB.prepare('DELETE FROM refresh_sessions WHERE token_hash = ?1')
          .bind(tokenHash)
          .run();
        return jsonResponse({ error: 'Refresh token expired' }, 401, request);
      }

      const newRefreshToken = generateRefreshToken();
      const newHash = await sha256Hex(newRefreshToken);
      const newExpiresAt = nowSec + REFRESH_TTL_SEC;
      const { role, isAdmin } = resolveRole(row.email, env);

      const sts = await exchangeFirebaseRefreshToken(
        row.firebase_refresh_token,
        env.FIREBASE_WEB_API_KEY
      );
      const nextFirebaseRefreshToken = sts
        ? sts.firebaseRefreshToken
        : row.firebase_refresh_token || null;

      const updateRes = await env.AETHERIA_DB.prepare(
        `UPDATE refresh_sessions
         SET token_hash = ?1,
             role = ?2,
             firebase_refresh_token = ?3,
             expires_at = ?4,
             last_used_at = ?5
         WHERE token_hash = ?6`
      )
        .bind(newHash, role, nextFirebaseRefreshToken, newExpiresAt, nowSec, tokenHash)
        .run();

      if (updateRes?.meta && updateRes.meta.changes === 0) {
        return jsonResponse({ error: 'Refresh token already rotated' }, 401, request);
      }

      return jsonResponse(
        {
          refreshToken: newRefreshToken,
          expiresAt: newExpiresAt,
          expiresInSec: REFRESH_TTL_SEC,
          uid: row.uid,
          email: row.email,
          role,
          isAdmin,
          ...(sts
            ? {
                idToken: sts.idToken,
                ...(sts.idTokenExpiresIn !== undefined
                  ? { idTokenExpiresIn: sts.idTokenExpiresIn }
                  : {}),
              }
            : {}),
        },
        200,
        request
      );
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      const parsed = await parseOptionalJson(request);
      if (parsed.ok && typeof parsed.data?.refreshToken === 'string') {
        const rawRefreshToken = parsed.data.refreshToken.trim();
        if (rawRefreshToken) {
          const tokenHash = await sha256Hex(rawRefreshToken);
          await env.AETHERIA_DB.prepare('DELETE FROM refresh_sessions WHERE token_hash = ?1')
            .bind(tokenHash)
            .run();
        }
      }
      return jsonResponse({ ok: true }, 200, request);
    }

    if (request.method === 'POST' && url.pathname === '/api/avatar') {
      let verified;
      try {
        verified = await verifyFirebaseIdToken(request, env);
      } catch (err) {
        return jsonResponse(
          { error: err instanceof Error ? err.message : 'Unauthorized' },
          401,
          request
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400, request);
      }

      const contentType = typeof body?.contentType === 'string' ? body.contentType.trim() : '';
      const rawBase64 = typeof body?.dataBase64 === 'string' ? body.dataBase64 : '';

      if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        return jsonResponse(
          { error: 'Unsupported contentType. Allowed: image/webp, image/jpeg, image/png' },
          400,
          request
        );
      }

      const decoded = decodeStandardBase64ToBytes(rawBase64);
      if (!decoded || decoded.bytes.byteLength === 0) {
        return jsonResponse({ error: 'Invalid base64 image payload' }, 400, request);
      }
      if (decoded.bytes.byteLength > MAX_AVATAR_BYTES) {
        return jsonResponse({ error: 'Avatar exceeds 400KB limit' }, 413, request);
      }

      const ts = Math.floor(Date.now() / 1000);
      await env.AETHERIA_DB.prepare(
        `INSERT INTO avatars (uid, content_type, data_base64, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(uid) DO UPDATE SET
           content_type = excluded.content_type,
           data_base64 = excluded.data_base64,
           updated_at = excluded.updated_at`
      )
        .bind(verified.uid, contentType, decoded.cleaned, ts)
        .run();

      return jsonResponse(
        {
          avatarUrl: `${url.origin}/api/avatar/${encodeURIComponent(verified.uid)}?v=${ts}`,
        },
        200,
        request
      );
    }

    if (request.method === 'GET' && url.pathname.startsWith('/api/avatar/')) {
      const uid = decodeURIComponent(url.pathname.slice('/api/avatar/'.length)).trim();
      if (!uid || uid.includes('/')) {
        return jsonResponse({ error: 'Invalid avatar uid' }, 400, request);
      }

      const row = await env.AETHERIA_DB.prepare(
        'SELECT content_type, data_base64 FROM avatars WHERE uid = ?1'
      )
        .bind(uid)
        .first();

      if (!row) {
        return jsonResponse({ error: 'Avatar not found' }, 404, request);
      }

      const decoded = decodeStandardBase64ToBytes(row.data_base64);
      if (!decoded) {
        return jsonResponse({ error: 'Corrupted avatar payload' }, 500, request);
      }

      return new Response(decoded.bytes, {
        status: 200,
        headers: {
          'Content-Type': row.content_type,
          'Cache-Control': 'public, max-age=3600',
          ...buildCorsHeaders(request, true),
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/geocode/reverse') {
      const lat = Number(url.searchParams.get('lat'));
      const lon = Number(url.searchParams.get('lon'));
      const rawLang = (url.searchParams.get('lang') || 'en').toLowerCase();
      const lang = rawLang === 'vi' ? 'vi' : 'en';

      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return jsonResponse({ error: 'Invalid lat/lon coordinates' }, 400, request);
      }

      const coordKey = `${lat.toFixed(2)},${lon.toFixed(2)}:${lang}`;
      const cached = await env.AETHERIA_DB.prepare(
        'SELECT display_name FROM geocode_cache WHERE coord_key = ?1'
      )
        .bind(coordKey)
        .first();

      if (cached && typeof cached.display_name === 'string') {
        const parts = cached.display_name
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
        return jsonResponse(
          {
            name: cached.display_name,
            city: parts.length >= 2 ? parts[1] : parts[0] || cached.display_name,
            country: '',
          },
          200,
          request
        );
      }

      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        String(lat)
      )}&lon=${encodeURIComponent(String(lon))}&accept-language=${encodeURIComponent(lang)}`;

      const geoRes = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'AetheriaPlanetarium/1.0 (https://github.com/KingEscaped/aetheriaplanetarium)',
          Accept: 'application/json',
        },
      });

      if (!geoRes.ok) {
        return jsonResponse(
          { error: `Nominatim reverse geocode failed (${geoRes.status})` },
          502,
          request
        );
      }

      const geoJson = await geoRes.json();
      const formatted = formatPlaceName(geoJson, lat, lon);
      const ts = Math.floor(Date.now() / 1000);

      await env.AETHERIA_DB.prepare(
        `INSERT INTO geocode_cache (coord_key, lang, display_name, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(coord_key) DO UPDATE SET
           display_name = excluded.display_name,
           updated_at = excluded.updated_at`
      )
        .bind(coordKey, lang, formatted.name, ts)
        .run();

      return jsonResponse(formatted, 200, request);
    }

    return jsonResponse({ error: 'Not found' }, 404, request);
  },
};
