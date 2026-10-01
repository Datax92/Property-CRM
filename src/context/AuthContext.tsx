'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore, getActiveFirebaseConfig } from '../lib/firebase';
import type { User } from '../lib/types';
import * as M from '../lib/re-data';

/* Single-admin sign-in.
   There is no registration in the app: the one admin account is created by hand in
   Firebase Console → Authentication → Users. Setting NEXT_PUBLIC_ADMIN_EMAIL locks the
   portal to that address, so any other account in the project is signed straight out. */
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const NOT_ADMIN = 'This account is not authorised for this portal / یہ اکاؤنٹ اس پورٹل کے لیے مجاز نہیں ہے';

/** Firebase error codes → a message the admin can act on (English / Urdu). */
function authMessage(err: any): string {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Incorrect email or password / ای میل یا پاس ورڈ درست نہیں ہے';
    case 'auth/user-disabled':
      return 'This account has been disabled / یہ اکاؤنٹ غیر فعال ہے';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later / بہت زیادہ کوششیں، کچھ دیر بعد کوشش کریں';
    case 'auth/network-request-failed':
      return 'No internet connection / انٹرنیٹ کنکشن دستیاب نہیں';
    default:
      return 'Sign-in failed. Please try again / سائن اِن نہیں ہو سکا، دوبارہ کوشش کریں';
  }
}

function makeInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeConfig = getActiveFirebaseConfig();
  const isConfigured = Boolean(activeConfig.apiKey && activeConfig.projectId);

  const clearError = useCallback(() => setError(null), []);

  const loadUserProfile = useCallback(async (fbUser: FirebaseUser): Promise<User> => {
    const db = getFirebaseFirestore();
    let profileData: Partial<User> = {};

    if (db) {
      try {
        const uDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (uDoc.exists()) {
          profileData = uDoc.data() as Partial<User>;
        }
      } catch (err) {
        console.warn('Could not read user profile from Firestore:', err);
      }
    }

    // The profile document only supplies a display name, title and office. The role is not
    // read from it: the one account that can sign in is the administrator.
    const name = profileData.name || fbUser.displayName || 'Admin';
    const userObj: User = {
      id: profileData.id || fbUser.uid.slice(0, 8),
      name,
      role: 'CEO',
      title: profileData.title || 'Administrator',
      initials: makeInitials(name),
      office: profileData.office || M.OFFICES[0],
    };

    // First sign-in of a console-created account: store the profile so it can be edited there.
    if (db && !profileData.name) {
      try {
        await setDoc(
          doc(db, 'users', fbUser.uid),
          { ...userObj, uid: fbUser.uid, email: fbUser.email, createdAt: Timestamp.now() },
          { merge: true }
        );
      } catch (e) {
        console.warn('Failed to auto-create user profile in Firestore:', e);
      }
    }

    return userObj;
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && ADMIN_EMAIL && (fbUser.email || '').toLowerCase() !== ADMIN_EMAIL) {
        setError(NOT_ADMIN);
        await fbSignOut(auth);
        return;
      }
      if (fbUser) {
        setLoading(true);
        setFirebaseUser(fbUser);
        try {
          setUser(await loadUserProfile(fbUser));
        } catch (err: any) {
          console.error('Failed to load profile:', err);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadUserProfile]);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setError(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      const msg = 'Sign-in is not set up yet — the Firebase project keys are missing.';
      setError(msg);
      throw new Error(msg);
    }
    if (ADMIN_EMAIL && email.trim().toLowerCase() !== ADMIN_EMAIL) {
      // Same wording as a wrong password, so the form does not reveal which address is the admin's.
      const msg = authMessage({ code: 'auth/invalid-credential' });
      setError(msg);
      throw new Error(msg);
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      const msg = authMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    const auth = getFirebaseAuth();
    if (auth) {
      await fbSignOut(auth);
    }
    setFirebaseUser(null);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Sign-in is not set up yet.');
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      // An unknown address is not reported, so the form cannot be used to probe for accounts.
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-email') return;
      const msg = authMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isConfigured,
        signInWithEmail,
        signOut,
        resetPassword,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
