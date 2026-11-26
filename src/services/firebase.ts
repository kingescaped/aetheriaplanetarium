import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../config/firebaseConfig.ts';

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

/**
 * Safely returns the singleton Firebase App instance without duplicate initialization.
 */
export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  return cachedApp;
}

/**
 * Safely returns the singleton Firebase Auth instance with explicit IndexedDB +
 * localStorage persistence in browser environments.
 */
export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();
  if (typeof window !== 'undefined') {
    try {
      cachedAuth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
      return cachedAuth;
    } catch {
      // Falls back cleanly if Auth was already initialized (e.g., HMR) or restricted storage
    }
  }
  cachedAuth = getAuth(app);
  return cachedAuth;
}

/**
 * Safely returns the singleton Firestore instance.
 */
export function getFirestoreDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getFirebaseApp());
  return cachedDb;
}
