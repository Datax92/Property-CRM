'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from './Icons';
import { NAV, PAGE_META } from '../lib/constants';
import * as M from '../lib/re-data';

/** Top navbar: apps button, the open app's name and its menus, then the systray. */
export function Navbar() {
  const { page, tab, user, navQuery, setNavQuery, openMenu, denied, visibleTabs, goto } = useApp();

  const sec = NAV.find((s) => s.id === page);
  const isHome = page === 'dashboard' && tab === 'home';
  // The home screen is reached with the apps button, so it is not repeated as a menu.
  const tabs = sec ? visibleTabs(sec).filter((t: any) => !(sec.id === 'dashboard' && t.id === 'home')) : [];
  const brand = isHome
    ? M.COMPANY.replace(/\s*\(Pvt\)\s*Ltd\.?$/i, '')
    : sec
    ? sec.label
    : (PAGE_META[page] || { t: '' }).t;

  const al = M.alerts().filter((x: any) => !denied(x.view)).length;

  // Dropdowns hang from the bottom of the navbar, right-aligned to the button that opened them.
  const drop = (id: string, width: number) => (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    openMenu(id, Math.max(8, Math.min(r.left, window.innerWidth - width - 8)), r.bottom + 2);
  };

  return (
    <header className="o-nav" id="topbar" data-noprint="1">
      <button type="button" className="o-nav-apps" title="Home menu" aria-label="Home menu" onClick={() => goto('dashboard/home')}>
        <svg viewBox="0 0 16 16" width={16} height={16} fill="currentColor" aria-hidden="true">
          {[2, 7, 12].map((y) => [2, 7, 12].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="2.4" height="2.4" rx=".5" />))}
        </svg>
      </button>

      <button
        type="button"
        className="o-nav-brand"
        onClick={() => (sec && tabs[0] ? goto(`${sec.id}/${tabs[0].id}`) : goto('dashboard/home'))}
      >
        {brand}
      </button>

      {!isHome && sec && (
        <>
          <nav className="o-nav-menu" aria-label="Section menu">
            {tabs.map((t: any) => (
              <button
                key={t.id}
                type="button"
                className={`o-nav-item ${tab === t.id ? 'on' : ''}`}
                onClick={() => goto(`${sec.id}/${t.id}`)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <button type="button" className="o-nav-ic burger" aria-label="Menu" onClick={drop(sec.id, 250)}>
            <Icon name="burger" />
          </button>
        </>
      )}

      <span className="spacer" />

      <input
        className="navsearch"
        placeholder="Search…"
        value={navQuery}
        onChange={(e) => setNavQuery(e.target.value)}
        aria-label="Search everything"
      />

      <button type="button" className="o-nav-ic" title="New record" aria-label="New record" onClick={drop('new', 250)}>
        <Icon name="plus" />
      </button>

      <button type="button" className="o-nav-ic" title="Number format" aria-label="Number format" onClick={drop('numbers', 250)}>
        <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M5.5 3v10M10.5 3v10M2.5 6h11M2.5 10h11" />
        </svg>
      </button>

      <button type="button" className="o-nav-ic" title="Alerts" aria-label="Alerts" onClick={drop('bell', 330)}>
        <Icon name="bell" />
        {al > 0 && <span className="dot">{al > 9 ? '9+' : al}</span>}
      </button>

      <button type="button" className="o-nav-user" onClick={drop('account', 250)}>
        <span className="ini">{user.initials}</span>
        <span className="nm">{user.name}</span>
      </button>
    </header>
  );
}
