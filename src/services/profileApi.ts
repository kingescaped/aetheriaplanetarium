import { updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ADMIN_EMAIL, CLOUDFLARE_API_BASE } from '../config/firebaseConfig.ts';
import type {
  ObservationLog,
  SavedObserverLocation,
  UserPreferences,
  UserProfile,
  UserRank,
  UserRole,
} from '../types/account.ts';
import { resizeAvatarFile } from '../utils/avatarResize.ts';
import { DEFAULT_USER_PREFERENCES } from './authService.ts';
import { getFirebaseAuth, getFirestoreDb } from './firebase.ts';
import {
  establishWorkerRefreshSession,
  fetchWithAuthRefresh,
  getValidIdToken,
  readStoredRefreshSession,
} from './tokenSession.ts';

export interface WorkerAuthVerifyResult {
  uid: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
}

export interface CloudUserBundle {
  profile: UserProfile;
  favorites: string[];
  observationLogs: ObservationLog[];
  preferences: UserPreferences;
  verifiedFromServer: boolean;
}

export interface CloudProfilePatch {
  name?: string;
  callsign?: string;
  avatarUrl?: string;
  rank?: UserRank;
  savedLocation?: SavedObserverLocation;
}

export interface CloudUserSyncPatch {
  favorites?: string[];
  observationLogs?: ObservationLog[];
  preferences?: UserPreferences;
}

const REQUEST_TIMEOUT_MS = 8500;
const VALID_RANKS = new Set<UserRank>([
  'Apprentice Stargazer',
  'Observer',
  'Senior Astrophotographer',
  'Chief Astronomer',
  'Supreme Sovereign',
]);

/**
 * Normalizes any stored admin title to the canonical 'ADMIN' display label.
 */
export function resolveAdminBadgeLabel(_adminTitle?: string): string {
  return 'ADMIN';
}

function normalizeSavedLocation(raw: unknown): SavedObserverLocation | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const candidate = raw as Record<string, unknown>;
  const lat = Number(candidate.latitude);
  const lon = Number(candidate.longitude);
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';

  if (
    !name ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return undefined;
  }

  const result: SavedObserverLocation = {
    name: name.slice(0, 120),
    latitude: lat,
    longitude: lon,
  };
  if (typeof candidate.updatedAt === 'string' && candidate.updatedAt.trim()) {
    result.updatedAt = candidate.updatedAt.trim().slice(0, 64);
  }
  return result;
}

function clampNum(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function normalizePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_PREFERENCES };
  const p = raw as Record<string, unknown>;
  return {
    nightVisionMode:
      typeof p.nightVisionMode === 'boolean'
        ? p.nightVisionMode
        : DEFAULT_USER_PREFERENCES.nightVisionMode,
    soundEnabled:
      typeof p.soundEnabled === 'boolean'
        ? p.soundEnabled
        : DEFAULT_USER_PREFERENCES.soundEnabled,
    coordinateFormat:
      p.coordinateFormat === 'DMS' || p.coordinateFormat === 'DECIMAL'
        ? p.coordinateFormat
        : DEFAULT_USER_PREFERENCES.coordinateFormat,
    distanceUnit:
      p.distanceUnit === 'PARSEC' || p.distanceUnit === 'LY'
        ? p.distanceUnit
        : DEFAULT_USER_PREFERENCES.distanceUnit,
    starGlowIntensity:
      typeof p.starGlowIntensity === 'number' && Number.isFinite(p.starGlowIntensity)
        ? clampNum(p.starGlowIntensity, 0, 10)
        : DEFAULT_USER_PREFERENCES.starGlowIntensity,
    fovSpeed:
      typeof p.fovSpeed === 'number' && Number.isFinite(p.fovSpeed)
        ? clampNum(p.fovSpeed, 0.1, 10)
        : DEFAULT_USER_PREFERENCES.fovSpeed,
  };
}

/**
 * Verifies the user's Firebase ID token against Cloudflare Worker /api/auth/verify.
 * Server response is authoritative for elevated roles such as supreme_admin.
 */
export async function verifyAccountWithWorker(
  idToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<WorkerAuthVerifyResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetchImpl(`${CLOUDFLARE_API_BASE}/api/auth/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as Partial<WorkerAuthVerifyResult>;
    if (!data || typeof data.uid !== 'string') return null;

    const isAdmin = Boolean(data.isAdmin && data.role === 'supreme_admin');
    return {
      uid: data.uid,
      email: typeof data.email === 'string' ? data.email : '',
      role: isAdmin ? 'supreme_admin' : 'observer',
      isAdmin,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function verifyAccountWithAuthRefresh(
  firebaseUser: FirebaseUser
): Promise<WorkerAuthVerifyResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetchWithAuthRefresh(
      firebaseUser,
      `${CLOUDFLARE_API_BASE}/api/auth/verify`,
      {
        method: 'GET',
        signal: controller.signal,
      }
    );

    if (!res.ok) return null;
    const data = (await res.json()) as Partial<WorkerAuthVerifyResult>;
    if (!data || typeof data.uid !== 'string') return null;

    const isAdmin = Boolean(data.isAdmin && data.role === 'supreme_admin');
    return {
      uid: data.uid,
      email: typeof data.email === 'string' ? data.email : '',
      role: isAdmin ? 'supreme_admin' : 'observer',
      isAdmin,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Loads Firestore users/{uid} and verifies account role via Cloudflare /api/auth/verify.
 * Never trusts localStorage for supreme_admin elevation.
 */
export async function loadUserCloudData(
  firebaseUser: FirebaseUser
): Promise<CloudUserBundle> {
  const db = getFirestoreDb();
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  await getValidIdToken(firebaseUser);

  const [docResult, workerResult] = await Promise.allSettled([
    getDoc(userDocRef),
    verifyAccountWithAuthRefresh(firebaseUser),
  ]);

  const storedSession = readStoredRefreshSession();
  const nowSec = Math.floor(Date.now() / 1000);
  if (
    !storedSession ||
    storedSession.uid !== firebaseUser.uid ||
    storedSession.expiresAt <= nowSec
  ) {
    void establishWorkerRefreshSession(firebaseUser);
  }

  const workerVerify =
    workerResult.status === 'fulfilled' ? workerResult.value : null;
  const docSnap = docResult.status === 'fulfilled' ? docResult.value : null;
  const docData =
    docSnap && docSnap.exists()
      ? (docSnap.data() as Record<string, unknown>)
      : null;

  const email = (
    firebaseUser.email ||
    (typeof docData?.email === 'string' ? docData.email : '') ||
    workerVerify?.email ||
    ''
  ).trim();

  const isAdminEmailMatch =
    email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Authoritative server verification first; offline fallback strictly requires verified Firebase Auth email === ADMIN_EMAIL & doc role
  let verifiedRole: UserRole = 'observer';
  if (workerVerify) {
    verifiedRole = workerVerify.isAdmin ? 'supreme_admin' : 'observer';
  } else if (isAdminEmailMatch && docData?.role === 'supreme_admin') {
    verifiedRole = 'supreme_admin';
  }

  const fallbackName =
    firebaseUser.displayName?.trim() ||
    email.split('@')[0] ||
    'Stargazer';
  const fallbackCallsign =
    fallbackName.replace(/[^a-zA-Z0-9_]/g, '').toUpperCase().slice(0, 14) ||
    'AETHERIA';

  const rawRank = typeof docData?.rank === 'string' ? (docData.rank as UserRank) : null;
  const defaultRank: UserRank =
    verifiedRole === 'supreme_admin' ? 'Supreme Sovereign' : 'Observer';
  const rank = rawRank && VALID_RANKS.has(rawRank) ? rawRank : defaultRank;

  const favorites = Array.isArray(docData?.favorites)
    ? docData.favorites.filter((item): item is string => typeof item === 'string')
    : ['sirius', 'betelgeuse', 'vega', 'polaris'];

  const observationLogs = Array.isArray(docData?.observationLogs)
    ? (docData.observationLogs as ObservationLog[])
    : [];

  const preferences = normalizePreferences(docData?.preferences);

  const profile: UserProfile = {
    id: firebaseUser.uid,
    name:
      typeof docData?.name === 'string' && docData.name.trim()
        ? docData.name.trim()
        : fallbackName,
    callsign:
      typeof docData?.callsign === 'string' && docData.callsign.trim()
        ? docData.callsign.trim()
        : fallbackCallsign,
    email,
    avatarUrl:
      (typeof docData?.avatarUrl === 'string' && docData.avatarUrl.trim()) ||
      firebaseUser.photoURL ||
      '',
    rank,
    role: verifiedRole,
    adminTitle:
      verifiedRole === 'supreme_admin'
        ? typeof docData?.adminTitle === 'string' && docData.adminTitle.trim()
          ? docData.adminTitle.trim()
          : 'ADMIN'
        : undefined,
    savedLocation: normalizeSavedLocation(docData?.savedLocation),
    joinedDate:
      typeof docData?.joinedDate === 'string' && docData.joinedDate.trim()
        ? docData.joinedDate
        : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    isGuest: false,
  };

  // Bootstrap Firestore user doc if user authenticated without an existing document
  if (!docData) {
    const seedDoc: Record<string, unknown> = {
      id: profile.id,
      name: profile.name,
      callsign: profile.callsign,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      rank: profile.rank,
      role: profile.role,
      joinedDate: profile.joinedDate,
      favorites,
      observationLogs,
      preferences,
      updatedAt: new Date().toISOString(),
    };
    if (profile.role === 'supreme_admin' && profile.adminTitle) {
      seedDoc.adminTitle = profile.adminTitle;
    }
    try {
      await setDoc(userDocRef, seedDoc);
    } catch {
      // Ignore transient offline bootstrap failure; next sync will retry
    }
  }

  return {
    profile,
    favorites,
    observationLogs,
    preferences,
    verifiedFromServer: Boolean(workerVerify),
  };
}

/**
 * Updates mutable profile fields in Firestore users/{uid} and syncs Firebase Auth displayName/photoURL.
 * Immutable fields (role, email, id, adminTitle) are never mutated here.
 */
export async function saveCloudProfile(
  uid: string,
  patch: CloudProfilePatch
): Promise<void> {
  const db = getFirestoreDb();
  const auth = getFirebaseAuth();

  const firestorePatch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (typeof patch.name === 'string') {
    const cleanName = patch.name.trim().slice(0, 80);
    if (cleanName.length > 0) {
      firestorePatch.name = cleanName;
    }
  }
  if (typeof patch.callsign === 'string') {
    const cleanCallsign = patch.callsign.trim().slice(0, 40);
    if (cleanCallsign.length > 0) {
      firestorePatch.callsign = cleanCallsign;
    }
  }
  if (typeof patch.avatarUrl === 'string') {
    firestorePatch.avatarUrl = patch.avatarUrl.trim().slice(0, 500);
  }
  if (patch.rank && VALID_RANKS.has(patch.rank)) {
    firestorePatch.rank = patch.rank;
  }
  if (patch.savedLocation) {
    const cleanLocation = normalizeSavedLocation({
      ...patch.savedLocation,
      updatedAt: patch.savedLocation.updatedAt || new Date().toISOString(),
    });
    if (!cleanLocation) {
      throw new Error('Invalid saved observer coordinates.');
    }
    firestorePatch.savedLocation = cleanLocation;
  }

  await updateDoc(doc(db, 'users', uid), firestorePatch);

  const currentUser = auth.currentUser;
  if (currentUser && currentUser.uid === uid) {
    const authPatch: { displayName?: string; photoURL?: string } = {};
    if (typeof firestorePatch.name === 'string') {
      authPatch.displayName = firestorePatch.name;
    }
    if (typeof firestorePatch.avatarUrl === 'string') {
      authPatch.photoURL = firestorePatch.avatarUrl;
    }
    if (Object.keys(authPatch).length > 0) {
      await updateProfile(currentUser, authPatch);
    }
  }
}

/**
 * Syncs favorites, observationLogs, and preferences to Firestore users/{uid}.
 */
export async function syncCloudUserData(
  uid: string,
  data: CloudUserSyncPatch
): Promise<void> {
  const db = getFirestoreDb();
  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (Array.isArray(data.favorites)) {
    patch.favorites = data.favorites
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, 500);
  }
  if (Array.isArray(data.observationLogs)) {
    patch.observationLogs = data.observationLogs.slice(0, 500);
  }
  if (data.preferences) {
    patch.preferences = normalizePreferences(data.preferences);
  }

  await updateDoc(doc(db, 'users', uid), patch);
}

/**
 * Resizes an uploaded avatar image to 256x256 WebP/JPEG <= 250KB, uploads it to
 * Cloudflare Worker POST /api/avatar with Firebase ID token, and persists avatarUrl
 * to Firestore users/{uid} and Firebase Auth profile.
 */
export async function uploadAvatarToCloudflare(
  file: File
): Promise<{ avatarUrl: string }> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('AUTH_REQUIRED');
  }

  const resized = await resizeAvatarFile(file, 256, 250 * 1024);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let avatarUrl = '';
  try {
    const response = await fetchWithAuthRefresh(
      currentUser,
      `${CLOUDFLARE_API_BASE}/api/avatar`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: resized.contentType,
          dataBase64: resized.dataBase64,
        }),
        signal: controller.signal,
      }
    );

    const payload = (await response.json().catch(() => null)) as {
      avatarUrl?: string;
      error?: string;
    } | null;

    if (!response.ok || !payload?.avatarUrl) {
      throw new Error(
        payload?.error || `Avatar upload failed with status ${response.status}.`
      );
    }

    avatarUrl = payload.avatarUrl;
  } finally {
    clearTimeout(timeoutId);
  }

  await saveCloudProfile(currentUser.uid, { avatarUrl });
  return { avatarUrl };
}
