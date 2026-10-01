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
import { syncFirestoreData } from '../lib/firestore-service';

export function AppShell() {
  const { user: authUser, loading } = useAuth();
  const { setUser, refreshData } = useApp();

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

  if (loading) {
    return (
      <div className="login-wrap">
        <div style={{ textAlign: 'center', color: 'var(--mute)' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--brand)',
              borderRadius: '50%',
              margin: '0 auto 14px',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: '15px' }}>Meridian Estates</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Loading session...</div>
        </div>
      </div>
    );
  }

  // Not logged in -> Show login / register screen
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
