/// <reference types="vite/client" />

/**
 * Public Firebase Web App configuration and Cloudflare Worker API base URL.
 * Environment variables override defaults when present, while remaining safe
 * under both Vite builds and Node test runners.
 */
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || 'AIzaSyAtCwBzKfITZgc7SaHxWDbIlB6w_4bx3uU',
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || 'aetheria-planetarium-lvq.firebaseapp.com',
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'aetheria-planetarium-lvq',
  storageBucket:
    import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || 'aetheria-planetarium-lvq.firebasestorage.app',
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '573988122424',
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || '1:573988122424:web:488aec87028eb281bc5bcd',
};

export const CLOUDFLARE_API_BASE =
  import.meta.env?.VITE_CLOUDFLARE_API_BASE ||
  'https://aetheria-planetarium-api.starwatch-lvq.workers.dev';

export const ADMIN_EMAIL = 'admin@lvq.std';
