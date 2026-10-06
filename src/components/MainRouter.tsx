'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { PageShell } from './Shared';
import { Icon } from './Icons';
import { NAV, PAGE_META } from '../lib/constants';
import { DashboardPage } from './pages/DashboardPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { TradingPage } from './pages/TradingPage';
import { SalesPage } from './pages/SalesPage';
import { AgentsPage } from './pages/AgentsPage';
import { FinancePage } from './pages/FinancePage';
import { CostsPage } from './pages/CostsPage';
import { AdminPage } from './pages/AdminPage';
import { AccountPage } from './pages/AccountPage';
import { SearchPage } from './pages/SearchPage';
import { TasksPage } from './pages/TasksPage';

export function MainRouter() {
  const { page, tab, role, denied } = useApp();

  const pageKey = page === 'account' || page === 'search' ? page : `${page}/${tab}`;
  const meta = PAGE_META[pageKey] || { t: 'Page' };
  const sec = NAV.find((s) => s.id === page);

  if (sec) {
    const t = sec.tabs.find((x) => x.id === tab);
    if (t && denied(t.need)) {
      return (
        <PageShell title={meta.t} u={meta.u} p={meta.p} tools={false}>
          <div className="note">
            <span className="ic">
              <Icon name="lock" />
            </span>
            <div>
              Your role (<b>{role}</b>) does not have access to {meta.t.toLowerCase()}.
            </div>
          </div>
        </PageShell>
      );
    }
  }

  switch (page) {
    case 'dashboard':
      return <DashboardPage />;
    case 'tasks':
      return <TasksPage />;
    case 'properties':
      return <PropertiesPage />;
    case 'trading':
      return <TradingPage />;
    case 'sales':
      return <SalesPage />;
    case 'agents':
      return <AgentsPage />;
    case 'finance':
      return <FinancePage />;
    case 'costs':
      return <CostsPage />;
    case 'admin':
      return <AdminPage />;
    case 'account':
      return <AccountPage />;
    case 'search':
      return <SearchPage />;
    default:
      return (
        <PageShell title="Not found" tools={false}>
          <div className="empty">
            <Icon name="empty" />
            <h3>Page not found</h3>
          </div>
        </PageShell>
      );
  }
}
