'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { LogoMark, Icon } from './Icons';
import * as M from '../lib/re-data';

export function Sidebar() {
  const { page, user, role, visibleSections, visibleTabs, goto, openMenu } = useApp();
  const secs = visibleSections();

  let lastGroup: string | null = null;

  return (
    <aside className="side" id="side" data-noprint="1" aria-label="Main navigation">
      <div className="side-logo">
        <LogoMark />
        <span className="txt">
          <b>{M.COMPANY.replace(/\s*\(Pvt\)\s*Ltd\.?$/i, '')}</b>
          <span>Real Estate MS</span>
        </span>
      </div>

      <div className="side-nav">
        {secs.map((sec) => {
          const showGroup = sec.group !== lastGroup;
          if (showGroup) lastGroup = sec.group;
          const tabs = visibleTabs(sec);
          const isActive = page === sec.id;

          return (
            <React.Fragment key={sec.id}>
              {showGroup && <h6>{sec.group}</h6>}
              <button
                type="button"
                className={`s-item ${isActive ? 'on' : ''}`}
                onClick={() => goto(`${sec.id}/${tabs[0]?.id || ''}`)}
              >
                <Icon name={sec.icon} />
                <span className="lbl">{sec.label}</span>
                {tabs.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      openMenu(sec.id, r.right + 8, Math.min(r.top, window.innerHeight - 340));
                    }}
                  >
                    <Icon name="car" />
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="side-foot">
        <button
          type="button"
          className="usercard"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            openMenu('account', r.right + 8, Math.min(r.top, window.innerHeight - 340));
          }}
        >
          <span className="ini">{user.initials}</span>
          <span className="who">
            <b>{user.name}</b>
            <span>{role}</span>
          </span>
          <Icon name="car" />
        </button>
      </div>
    </aside>
  );
}
