'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { NAV, PAGE_META } from '../lib/constants';

export function Tabbar() {
  const { page, tab, visibleTabs, goto } = useApp();

  const sec = NAV.find((s) => s.id === page);

  if (!sec) {
    const meta = PAGE_META[page] || { t: '' };
    return (
      <nav className="tabbar" id="tabs" data-noprint="1" aria-label="Section tabs">
        <button type="button" className="tab on">
          {meta.t}
        </button>
      </nav>
    );
  }

  const tabs = visibleTabs(sec);

  return (
    <nav className="tabbar" id="tabs" data-noprint="1" aria-label="Section tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab ${tab === t.id ? 'on' : ''}`}
          onClick={() => goto(`${sec.id}/${t.id}`)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
