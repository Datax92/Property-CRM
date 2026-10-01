'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import {
  getFirebaseAuth,
  getFirebaseFirestore,
  googleProvider,
  getActiveFirebaseConfig,
  saveStoredFirebaseConfig,
  FirebaseConfig,
} from '../lib/firebase';
import type { User } from '../lib/types';
import * as M from '../lib/re-data';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (
    e: string,
    p: string,
    profile: { name: string; role: 'CEO' | 'Accountant' | 'Manager' | 'Agent'; title?: string; office?: string }
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  updateFirebaseConfig: (config: FirebaseConfig) => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

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
  const [configVersion, setConfigVersion] = useState<number>(0);

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

    const name = profileData.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
    const role = (profileData.role as User['role']) || 'CEO';
    const title = profileData.title || (role === 'CEO' ? 'Chief Executive' : role);
    const office = profileData.office || M.OFFICES[0];
    const initials = makeInitials(name);

    const userObj: User = {
      id: profileData.id || fbUser.uid.slice(0, 8),
      name,
      role,
      title,
      initials,
      office,
      agentId: profileData.agentId,
    };

    // Save/persist to Firestore if not already saved
    if (db && (!profileData.name || !profileData.role)) {
      try {
        await setDoc(
          doc(db, 'users', fbUser.uid),
          {
            ...userObj,
            uid: fbUser.uid,
            email: fbUser.email,
            createdAt: Timestamp.now(),
          },
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
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const profile = await loadUserProfile(fbUser);
          setUser(profile);
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
  }, [configVersion, loadUserProfile]);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setError(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Authentication is not configured yet. Please provide your Firebase project keys.');
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      let msg = err.message || 'Login failed';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please verify your credentials.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please try again later or reset password.';
      }
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (
      email: string,
      pass: string,
      profile: { name: string; role: 'CEO' | 'Accountant' | 'Manager' | 'Agent'; title?: string; office?: string }
    ) => {
      setError(null);
      const auth = getFirebaseAuth();
      const db = getFirebaseFirestore();
      if (!auth) {
        throw new Error('Firebase is not configured. Please connect your Firebase project.');
      }

      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        await updateProfile(cred.user, { displayName: profile.name });

        const name = profile.name.trim();
        const role = profile.role || 'CEO';
        const title = profile.title || (role === 'CEO' ? 'Chief Executive' : role);
        const office = profile.office || M.OFFICES[0];
        const initials = makeInitials(name);

        const userObj: User = {
          id: cred.user.uid.slice(0, 8),
          name,
          role,
          title,
          initials,
          office,
        };

        if (db) {
          await setDoc(doc(db, 'users', cred.user.uid), {
            ...userObj,
            uid: cred.user.uid,
            email: cred.user.email,
            createdAt: Timestamp.now(),
          });
        }

        setUser(userObj);
      } catch (err: any) {
        let msg = err.message || 'Registration failed';
        if (err.code === 'auth/email-already-in-use') {
          msg = 'An account with this email already exists. Please sign in instead.';
        } else if (err.code === 'auth/weak-password') {
          msg = 'Password is too weak. Please use at least 6 characters.';
        }
        setError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase is not configured. Please configure your Firebase project.');
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      let msg = err.message || 'Google sign in failed';
      if (err.code === 'auth/unauthorized-domain') {
        msg = 'This domain (localhost) is not authorized in Firebase Console > Authentication > Settings > Authorized domains.';
      }
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
    if (!auth) throw new Error('Firebase is not configured.');
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const updateFirebaseConfig = useCallback((config: FirebaseConfig) => {
    saveStoredFirebaseConfig(config);
    setConfigVersion((v) => v + 1);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
        updateFirebaseConfig,
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
