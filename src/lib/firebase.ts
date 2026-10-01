import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const DEFAULT_PROJECT_ID = 'property-crm';

export function getStoredFirebaseConfig(): FirebaseConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('property_crm_firebase_config');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse error
  }
  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('property_crm_firebase_config', JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save Firebase config in localStorage:', err);
  }
}

export function clearStoredFirebaseConfig() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('property_crm_firebase_config');
  } catch {
    // ignore
  }
}

export function getActiveFirebaseConfig(): FirebaseConfig {
  const stored = getStoredFirebaseConfig();
  if (stored && stored.apiKey && stored.projectId) {
    return stored;
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID}.appspot.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = getActiveFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    return app;
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  const fApp = getFirebaseApp();
  if (!fApp) return null;
  if (!auth) {
    auth = getAuth(fApp);
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore | null {
  const fApp = getFirebaseApp();
  if (!fApp) return null;
  if (!db) {
    db = getFirestore(fApp);
  }
  return db;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
