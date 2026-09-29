'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell } from '../Shared';
import { Icon } from '../Icons';
import { NAV, PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function AccountPage() {
  const { user, role, visibleTabs, openMenu } = useApp();
  const meta = PAGE_META['account'] || { t: 'My account', u: 'میرا اکاؤنٹ' };

  const allowed = NAV.flatMap((s) => visibleTabs(s).map((t: any) => `${s.label} · ${t.label}`));

  const roleBlurb = () => {
    switch (role) {
      case 'CEO':
        return 'Full access — every property, sale, cost, tax and profit figure.';
      case 'Accountant':
        return 'Purchases, sales, expenses, payments, tax and Zakat. Salaries are restricted.';
      case 'Manager':
        return 'Properties, sales, agents and commissions. Company financials are restricted.';
      case 'Agent':
        return 'Your assigned properties, your customers and your own commission only.';
      default:
        return '';
    }
  };

  return (
    <PageShell title={meta.t} u={meta.u} tools={false}>
      <div className="grid c2u">
        <div className="panel">
          <div className="panel-h">
            <h3>Profile</h3>
          </div>
          <div className="panel-b">
            <div className="formgrid">
              <div className="fld">
                <span>Full name</span>
                <input value={user.name} readOnly />
              </div>
              <div className="fld">
                <span>Job title</span>
                <input value={user.title} readOnly />
              </div>
              <div className="fld">
                <span>Role</span>
                <input value={user.role} readOnly />
              </div>
              <div className="fld">
                <span>Office / branch</span>
                <input value={user.office} readOnly />
              </div>
              <div className="fld full">
                <span>User ID</span>
                <input value={user.id} readOnly />
              </div>
            </div>
            <div className="note calm" style={{ marginTop: '13px' }}>
              <span className="ic">
                <Icon name="info" />
              </span>
              <div>{roleBlurb()}</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <h3>Screens you can open</h3>
            <span className="sub">{M.fmtNum(allowed.length)}</span>
          </div>
          <div className="panel-b tight">
            <div className="ranked">
              {allowed.map((a, idx) => (
                <div key={idx} className="r">
                  <i className="sw" style={{ background: 'var(--brand-2)' }} />
                  <span className="nm">{a}</span>
                  <span />
                  <span />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '14px' }}>
        <button
          type="button"
          className="btn"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            openMenu('account', r.left, r.bottom + 6);
          }}
        >
          <Icon name="user" /> Switch to another account
        </button>
      </div>
    </PageShell>
  );
}
