'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Tabbar } from './Tabbar';
import { MainRouter } from './MainRouter';
import { Menus } from './Menus';
import { Modals } from './Modals';
import { TooltipToast } from './TooltipToast';

export function AppShell() {
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
