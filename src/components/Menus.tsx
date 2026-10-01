'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icons';
import { NAV } from '../lib/constants';
import * as M from '../lib/re-data';

export function Menus() {
  const {
    menu,
    closeMenu,
    user,
    role,
    setUser,
    numbers,
    setNumbers,
    filters,
    setFilter,
    clearFilters,
    denied,
    openModal,
    openCostSheet,
    goto,
    page,
    tab,
    visibleSections,
    visibleTabs,
  } = useApp();

  if (!menu) return null;

  const { id, x, y } = menu;

  const alertGo = (v: string) => {
    const map: Record<string, string> = {
      receivables: 'sales/receivables',
      commissions: 'agents/commissions',
      tax: 'costs/tax',
      bills: 'costs/bills',
      salaries: 'costs/salaries',
      purchases: 'properties/purchases',
      inventory: 'properties/inventory',
    };
    return map[v] || 'dashboard/alerts';
  };

  let inner: React.ReactNode = null;

  const { signOut } = useAuth();

  if (id === 'account') {
    inner = (
      <>
        <h5>Signed in as</h5>
        <button
          type="button"
          onClick={() => {
            goto('account');
            closeMenu();
          }}
        >
          <Icon name="user" />
          <span className="row2">
            {user.name}
            <small>
              {user.title} · {role}
            </small>
          </span>
        </button>
        <div className="sep" />
        <button
          type="button"
          onClick={() => {
            goto('account');
            closeMenu();
          }}
        >
          <Icon name="user" /> My account &amp; permissions
        </button>
        <button
          type="button"
          onClick={() => {
            goto('admin/users');
            closeMenu();
          }}
        >
          <Icon name="shield" /> Users &amp; roles
        </button>
        <div className="sep" />
        <button
          type="button"
          onClick={async () => {
            closeMenu();
            await signOut();
          }}
          style={{ color: 'var(--bad)' }}
        >
          <Icon name="x" /> Sign out
        </button>
      </>
    );
  } else if (id === 'new') {
    inner = (
      <>
        <h5>Add a record</h5>
        <button
          type="button"
          onClick={() => {
            openModal('property');
          }}
        >
          <Icon name="grid" /> Property purchase
        </button>
        <button
          type="button"
          onClick={() => {
            openModal('sale');
          }}
        >
          <Icon name="tag" /> Property sale
        </button>
        <button
          type="button"
          onClick={() => {
            openCostSheet('new');
            closeMenu();
          }}
        >
          <Icon name="calculator" /> Trade cost calculator
        </button>
        <div className="sep" />
        <h5>Invoices</h5>
        <button
          type="button"
          onClick={() => {
            openModal('saleInvoice' as any);
          }}
        >
          <Icon name="receipt" /> Sale invoice
        </button>
        <button
          type="button"
          onClick={() => {
            openModal('purchaseInvoice' as any);
          }}
        >
          <Icon name="receipt" /> Purchase invoice
        </button>
        <div className="sep" />
        <button
          type="button"
          disabled={denied('expenses')}
          onClick={() => {
            if (!denied('expenses')) openModal('expense');
          }}
        >
          <Icon name="wallet" /> Expense
        </button>
        <button
          type="button"
          disabled={denied('transactions')}
          onClick={() => {
            if (!denied('transactions')) openModal('payment');
          }}
        >
          <Icon name="receipt" /> Payment
        </button>
      </>
    );
  } else if (id === 'bell') {
    const al = M.alerts().filter((a: any) => !denied(a.view));
    inner = (
      <>
        <h5>Alerts</h5>
        {al.slice(0, 6).map((a: any, idx: number) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              goto(alertGo(a.view));
              closeMenu();
            }}
          >
            <Icon name={a.sev === 'high' ? 'warn' : 'info'} />
            <span className="row2">
              {a.title}
              <small>{a.detail.slice(0, 58)}…</small>
            </span>
          </button>
        ))}
        <div className="sep" />
        <button
          type="button"
          onClick={() => {
            goto('dashboard/alerts');
            closeMenu();
          }}
        >
          <Icon name="bell" /> See all {M.fmtNum(al.length)} alerts
        </button>
      </>
    );
  } else if (id === 'filters') {
    const sel = (key: string, label: string, opts: [string, string][]) => (
      <div className="fld" style={{ padding: '4px 8px' }}>
        <label>{label}</label>
        <select
          value={(filters as any)[key] || 'all'}
          onChange={(e) => setFilter(key, e.target.value)}
        >
          <option value="all">All</option>
          {opts.map(([v2, l]) => (
            <option key={v2} value={v2}>
              {l}
            </option>
          ))}
        </select>
      </div>
    );

    inner = (
      <>
        <h5>Filter records</h5>
        {sel(
          'project',
          'Project / society',
          M.PROJECTS.map((p: any) => [p.id, p.name])
        )}
        {sel(
          'agent',
          'Agent',
          M.DATA.agents.map((a: any) => [a.id, a.name])
        )}
        {sel(
          'office',
          'Office / branch',
          M.OFFICES.map((o: any) => [o, o])
        )}
        {sel(
          'type',
          'Property type',
          M.TYPES.map((t: any) => [t, t])
        )}
        {sel(
          'status',
          'Property status',
          M.STATUSES.map((t: any) => [t, t])
        )}
        {sel(
          'payStatus',
          'Payment status',
          M.PAY_STATUS.map((t: any) => [t, t])
        )}
        <div className="sep" />
        <button type="button" onClick={clearFilters}>
          <Icon name="x" /> Clear all filters
        </button>
      </>
    );
  } else if (id === 'numbers') {
    const numOpts: [string, string, string][] = [
      ['cr', 'Crore / Lakh', 'PKR 13.5 Cr'],
      ['m', 'Million', 'PKR 135.1M'],
      ['full', 'Full digits', 'PKR 135,148,500'],
    ];
    inner = (
      <>
        <h5>Number format</h5>
        {numOpts.map(([v2, l, ex]) => (
          <button
            key={v2}
            type="button"
            className={numbers === v2 ? 'on' : ''}
            onClick={() => {
              setNumbers(v2 as any);
              closeMenu();
            }}
          >
            <span className="row2">
              {l}
              <small>{ex}</small>
            </span>
          </button>
        ))}
      </>
    );
  } else if (id === 'burger') {
    const secs = visibleSections();
    inner = (
      <>
        {secs.map((sc) => {
          const firstTab = visibleTabs(sc)[0]?.id || '';
          return (
            <button
              key={sc.id}
              type="button"
              className={page === sc.id ? 'on' : ''}
              onClick={() => {
                goto(`${sc.id}/${firstTab}`);
                closeMenu();
              }}
            >
              <Icon name={sc.icon} />
              {sc.label}
            </button>
          );
        })}
      </>
    );
  } else {
    // Section flyout menu
    const sec = NAV.find((s) => s.id === id);
    if (!sec) return null;
    const tabs = visibleTabs(sec);
    inner = (
      <>
        <h5>
          {sec.label}
          <span className="u"> {sec.u}</span>
        </h5>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={page === sec.id && tab === t.id ? 'on' : ''}
            onClick={() => {
              goto(`${sec.id}/${t.id}`);
              closeMenu();
            }}
          >
            <Icon name={sec.icon} />
            {t.label}
          </button>
        ))}
        {sec.id === 'properties' && (
          <>
            <div className="sep" />
            <button
              type="button"
              onClick={() => {
                openModal('property');
              }}
            >
              <Icon name="plus" /> Add property
            </button>
          </>
        )}
        {sec.id === 'trading' && (
          <>
            <div className="sep" />
            <button
              type="button"
              onClick={() => {
                openCostSheet('new');
                closeMenu();
              }}
            >
              <Icon name="calculator" /> New Cost Calculator
            </button>
          </>
        )}

        {sec.id === 'sales' && (
          <>
            <div className="sep" />
            <button
              type="button"
              onClick={() => {
                openModal('sale');
              }}
            >
              <Icon name="plus" /> Record sale
            </button>
            <button
              type="button"
              onClick={() => {
                openModal('saleInvoice' as any);
              }}
            >
              <Icon name="receipt" /> Sale invoice
            </button>
            <button
              type="button"
              onClick={() => {
                openModal('purchaseInvoice' as any);
              }}
            >
              <Icon name="receipt" /> Purchase invoice
            </button>
          </>
        )}
        {sec.id === 'costs' && !denied('expenses') && (
          <>
            <div className="sep" />
            <button
              type="button"
              onClick={() => {
                openModal('expense');
              }}
            >
              <Icon name="plus" /> Add expense
            </button>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <div className="scrim" onClick={closeMenu} />
      <div className="menu" style={{ left: `${x}px`, top: `${y}px` }}>
        {inner}
      </div>
    </>
  );
}
