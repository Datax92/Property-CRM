'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { AppShell } from '../components/AppShell';

export default function Home() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AuthProvider>
  );
}
