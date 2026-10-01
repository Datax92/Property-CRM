'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { LoginPage } from './LoginPage';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Tabbar } from './Tabbar';
import { MainRouter } from './MainRouter';
import { Menus } from './Menus';
import { Modals } from './Modals';
import { TooltipToast } from './TooltipToast';
import { syncFirestoreData, onFirestoreSaveError } from '../lib/firestore-service';

export function AppShell() {
  const { user: authUser, loading } = useAuth();
  const { setUser, refreshData, toast } = useApp();

  // Sync authenticated user into AppContext
  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser, setUser]);

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
        <Sidebar />
        <div className="content">
          <Topbar />
          <Tabbar />
          <main id="main">
            <MainRouter />
          </main>
        </div>
      </div>

      <div id="layer">
        <Menus />
        <Modals />
      </div>

      <TooltipToast />
    </>
  );
}
