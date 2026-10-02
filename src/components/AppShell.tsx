'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { LoginPage } from './LoginPage';
import { Navbar } from './Navbar';
import { MainRouter } from './MainRouter';
import { Menus } from './Menus';
import { Modals } from './Modals';
import { TooltipToast } from './TooltipToast';
import { syncFirestoreData, onFirestoreSaveError, onFirestoreReadError } from '../lib/firestore-service';

export function AppShell() {
  const { user: authUser, loading } = useAuth();
  const { setUser, refreshData, toast, page, tab } = useApp();
  const mainRef = useRef<HTMLElement | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  // Sync authenticated user into AppContext
  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser, setUser]);

  // A database that cannot be read must say so: an empty register is not an answer.
  useEffect(() => {
    onFirestoreReadError(setDbError);
    return () => onFirestoreReadError(null);
  }, []);

  // Bind live Firestore real-time listeners
  useEffect(() => {
    if (!authUser) return;
    const unsubscribe = syncFirestoreData(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [authUser, refreshData]);

  // A record that fails to reach the database must be visible, not just logged.
  useEffect(() => {
    onFirestoreSaveError(toast);
    return () => onFirestoreSaveError(null);
  }, [toast]);

  // Each screen slides in when the page or its menu changes. The element is animated in
  // place rather than remounted, so nothing typed on a page is lost.
  useEffect(() => {
    const el = mainRef.current;
    if (!el || typeof el.animate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 260, easing: 'cubic-bezier(.2,.7,.3,1)' }
    );
  }, [page, tab]);

  if (loading) {
    return (
      <div className="login-wrap" role="status">
        <div style={{ textAlign: 'center' }}>
          <div className="spin" />
          <b>Property CRM</b>
          <span>Loading session…</span>
        </div>
      </div>
    );
  }

  // Not logged in -> show the admin sign-in screen
  if (!authUser) {
    return <LoginPage />;
  }

  return (
    <>
      <div className="shell">
        <Navbar />
        {dbError && (
          <div className="dbdown" role="alert">
            <b>Database not connected.</b> {dbError}
          </div>
        )}
        <main id="main" ref={mainRef} className={page === 'dashboard' && tab === 'home' ? 'home' : ''}>
          <MainRouter />
        </main>
      </div>

      <div id="layer">
        <Menus />
        <Modals />
      </div>

      <TooltipToast />
    </>
  );
}
