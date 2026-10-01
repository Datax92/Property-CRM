import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBanRvPdiDpB4q1y4btd_-FEW9DmphLXVM',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'property-crm-5a401.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'property-crm-5a401',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'property-crm-5a401.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '583726252771',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:583726252771:web:bb4ae70d621d576d56fbd6',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-GS0YMYVFHE',
};

export function getActiveFirebaseConfig(): FirebaseConfig {
  return DEFAULT_FIREBASE_CONFIG;
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
