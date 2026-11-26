import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ADMIN_EMAIL } from '../config/firebaseConfig.ts';
import type { ObservationLog, UserPreferences, UserRole } from '../types/account.ts';
import type { Language } from '../utils/i18n.ts';
import { getFirebaseAuth, getFirestoreDb } from './firebase.ts';
import {
  establishWorkerRefreshSession,
  revokeWorkerRefreshSession,
} from './tokenSession.ts';

export interface RegisterWithEmailInput {
  email: string;
  password: string;
  name: string;
  callsign: string;
  favorites?: string[];
  observationLogs?: ObservationLog[];
  preferences?: UserPreferences;
}

const DEFAULT_FAVORITES = ['sirius', 'betelgeuse', 'vega', 'polaris'];

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  nightVisionMode: false,
  soundEnabled: true,
  coordinateFormat: 'DECIMAL',
  distanceUnit: 'LY',
  starGlowIntensity: 1.5,
  fovSpeed: 1.0,
};

function formatJoinedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function extractAuthErrorCode(errorOrCode: unknown): string {
  if (typeof errorOrCode === 'string') {
    return errorOrCode.trim();
  }
  if (errorOrCode && typeof errorOrCode === 'object') {
    const maybeCode = (errorOrCode as { code?: unknown }).code;
    if (typeof maybeCode === 'string' && maybeCode.trim()) {
      return maybeCode.trim();
    }
    const maybeMessage = (errorOrCode as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') {
      const match = /(auth\/[a-z0-9-]+)/i.exec(maybeMessage);
      if (match) return match[1].toLowerCase();
      return maybeMessage.trim();
    }
  }
  return '';
}

/**
 * Maps Firebase Auth error codes (or thrown Error objects) into clear bilingual messages.
 */
export function mapAuthError(errorOrCode: unknown, lang: Language = 'vi'): string {
  const code = extractAuthErrorCode(errorOrCode).toLowerCase();
  const isVi = lang === 'vi';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return isVi
        ? 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'
        : 'Incorrect email or password. Please check your credentials and try again.';

    case 'auth/invalid-email':
      return isVi
        ? 'Địa chỉ email không hợp lệ.'
        : 'The email address format is invalid.';

    case 'auth/email-already-in-use':
      return isVi
        ? 'Email này đã được đăng ký. Vui lòng chuyển sang tab Đăng nhập.'
        : 'This email is already registered. Please sign in instead.';

    case 'auth/weak-password':
      return isVi
        ? 'Mật khẩu quá yếu. Vui lòng sử dụng ít nhất 6 ký tự.'
        : 'Password is too weak. Please use at least 6 characters.';

    case 'auth/too-many-requests':
      return isVi
        ? 'Quá nhiều lần thử thất bại. Vui lòng đợi vài phút rồi thử lại.'
        : 'Too many failed attempts. Please wait a few minutes and try again.';

    case 'auth/network-request-failed':
      return isVi
        ? 'Lỗi kết nối mạng. Kiểm tra internet hoặc tiếp tục ở chế độ Khách.'
        : 'Network error. Check your internet connection or continue in Guest Mode.';

    case 'auth/user-disabled':
      return isVi
        ? 'Tài khoản này hiện đã bị vô hiệu hóa.'
        : 'This account has been disabled.';

    case 'auth/operation-not-allowed':
      return isVi
        ? 'Phương thức đăng nhập bằng Email/Mật khẩu chưa được kích hoạt trên máy chủ.'
        : 'Email/Password authentication is not enabled on the server.';

    case 'auth/requires-recent-login':
      return isVi
        ? 'Phiên đăng nhập đã cũ. Vui lòng đăng xuất và đăng nhập lại.'
        : 'Please sign out and sign in again before performing this action.';

    case 'auth/missing-password':
      return isVi
        ? 'Vui lòng nhập mật khẩu.'
        : 'Please enter your password.';

    default:
      return isVi
        ? 'Không thể xác thực tài khoản lúc này. Vui lòng thử lại sau.'
        : 'Unable to authenticate right now. Please try again.';
  }
}

async function ensureLocalPersistence(auth: Auth): Promise<void> {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Ignore unsupported environment persistence errors (e.g., restricted/non-DOM tests)
  }
}

/**
 * Signs in an existing observer using Firebase Email/Password Auth.
 */
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  await ensureLocalPersistence(auth);
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  void establishWorkerRefreshSession(cred.user);
  return cred.user;
}

/**
 * Registers a new observer account in Firebase Auth and initializes users/{uid} in Firestore.
 */
export async function registerWithEmail(input: RegisterWithEmailInput): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  await ensureLocalPersistence(auth);
  const db = getFirestoreDb();

  const normalizedEmail = input.email.trim();
  const normalizedName = input.name.trim() || normalizedEmail.split('@')[0] || 'Observer';
  const normalizedCallsign =
    input.callsign.trim().replace(/\s+/g, '_') || 'AETHERIA_OBS';

  const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, input.password);

  await updateProfile(cred.user, {
    displayName: normalizedName,
  });

  const isAdminEmail = normalizedEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const role: UserRole = isAdminEmail ? 'supreme_admin' : 'observer';
  const nowIso = new Date().toISOString();

  const initialDoc: Record<string, unknown> = {
    id: cred.user.uid,
    name: normalizedName,
    callsign: normalizedCallsign,
    email: normalizedEmail,
    avatarUrl: '',
    rank: isAdminEmail ? 'Supreme Sovereign' : 'Observer',
    role,
    joinedDate: formatJoinedDate(),
    favorites: input.favorites ?? DEFAULT_FAVORITES,
    observationLogs: input.observationLogs ?? [],
    preferences: input.preferences ?? DEFAULT_USER_PREFERENCES,
    updatedAt: nowIso,
  };

  if (isAdminEmail) {
    initialDoc.adminTitle = 'ADMIN';
  }

  await setDoc(doc(db, 'users', cred.user.uid), initialDoc);
  void establishWorkerRefreshSession(cred.user);
  return cred.user;
}

/**
 * Signs out the active Firebase user and revokes any stored Worker refresh session.
 */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    await revokeWorkerRefreshSession();
  } finally {
    await signOut(auth);
  }
}

/**
 * Subscribes to Firebase Auth state transitions.
 */
export function subscribeToAuthState(
  callback: (user: FirebaseUser | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

/**
 * Retrieves the current user's Firebase ID token if signed in.
 */
export async function getCurrentIdToken(forceRefresh: boolean = false): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
