'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { AppShell } from '../components/AppShell';
import { AppearanceProvider } from '../context/AppearanceContext';

export default function Home() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppearanceProvider>
          <AppShell />
        </AppearanceProvider>
      </AppProvider>
    </AuthProvider>
  );
}
