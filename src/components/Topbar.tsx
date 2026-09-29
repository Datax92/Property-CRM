'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from './Icons';
import { NAV, PAGE_META } from '../lib/constants';
import * as M from '../lib/re-data';

export function Topbar() {
  const { page, tab, navQuery, setNavQuery, openMenu, denied } = useApp();

  const sec = NAV.find((s) => s.id === page);
  const pageKey = page === 'account' || page === 'search' ? page : `${page}/${tab}`;
  const meta = PAGE_META[pageKey] || { t: '' };
  const currentTab = sec ? sec.tabs.find((x) => x.id === tab) : null;
  const leaf = currentTab ? currentTab.label : meta.t;

  const al = M.alerts().filter((x: any) => !denied(x.view)).length;

  return (
    <header className="topbar" id="topbar" data-noprint="1">
      <button
        type="button"
        className="iconbtn burger"
        aria-label="Menu"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          openMenu('burger', r.left, r.bottom + 6);
        }}
      >
        <Icon name="burger" />
      </button>

      <div className="crumb">
        {sec && sec.label !== leaf && (
          <>
            {sec.label} <span>/</span>{' '}
          </>
        )}
        <b>{leaf}</b>
      </div>

      <span className="spacer" />

      <input
        className="navsearch"
        placeholder="Search properties, buyers, agents…"
        value={navQuery}
        onChange={(e) => setNavQuery(e.target.value)}
        aria-label="Search everything"
      />

      <button
        type="button"
        className="iconbtn"
        title="Number format"
        aria-label="Number format"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          openMenu('numbers', Math.max(8, r.left - 180), r.bottom + 6);
        }}
      >
        <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M5.5 3v10M10.5 3v10M2.5 6h11M2.5 10h11" />
        </svg>
      </button>

      <button
        type="button"
        className="iconbtn"
        title="Alerts"
        aria-label="Alerts"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          openMenu('bell', Math.max(8, r.left - 200), r.bottom + 6);
        }}
      >
        <Icon name="bell" />
        {al > 0 && <span className="dot">{al > 9 ? '9+' : al}</span>}
      </button>

      <button
        type="button"
        className="navnew"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          openMenu('new', Math.max(8, r.left - 100), r.bottom + 6);
        }}
      >
        <Icon name="plus" /> New
      </button>
    </header>
  );
}
