'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell } from '../Shared';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function SearchPage() {
  const { navQuery, effectiveFilters: f, denied, goto, numbers } = useApp();
  const meta = PAGE_META['search'] || { t: 'Search results', u: 'تلاش' };

  const q = navQuery.trim().toLowerCase();

  if (!q) {
    return (
      <PageShell title={meta.t} u={meta.u} tools={false}>
        <div className="empty">
          <Icon name="empty" />
          <h3>Type to search</h3>
          <p>Search properties, buyers, agents, vendors and transaction references.</p>
        </div>
      </PageShell>
    );
  }

  const props = M.DATA.properties
    .filter(
      (p: any) =>
        M.propMatch(p, f) && (p.name + p.project + p.seller + p.id).toLowerCase().includes(q)
    )
    .slice(0, 8);

  const ids = new Set(M.DATA.properties.filter((p: any) => M.propMatch(p, f)).map((p: any) => p.id));
  const sales = M.DATA.sales
    .filter(
      (s: any) =>
        ids.has(s.propertyId) && (s.buyer + s.property + s.agent + s.id).toLowerCase().includes(q)
    )
    .slice(0, 8);

  const agents = denied('agents')
    ? []
    : M.DATA.agents.filter((a: any) => (a.name + a.id).toLowerCase().includes(q)).slice(0, 6);

  const txns = denied('transactions')
    ? []
    : M.DATA.payments
        .filter((p: any) => (p.party + p.ref + p.id + p.note).toLowerCase().includes(q))
        .slice(0, 8);

  const renderSection = (
    title: string,
    rows: React.ReactNode[],
    go: string
  ) => {
    if (!rows.length) return null;
    return (
      <div className="panel" style={{ marginBottom: '14px' }}>
        <div className="panel-h">
          <h3>{title}</h3>
          <span className="sub">{M.fmtNum(rows.length)}</span>
          <span className="spacer" />
          <button type="button" className="link" onClick={() => goto(go)}>
            Open section
          </button>
        </div>
        <div className="panel-b tight">
          <div className="ranked">{rows}</div>
        </div>
      </div>
    );
  };

  const hasResults = props.length > 0 || sales.length > 0 || agents.length > 0 || txns.length > 0;

  return (
    <PageShell title={meta.t} u={meta.u} tools={false}>
      <p className="muted" style={{ margin: '-6px 0 14px' }}>
        Results for “<b>{navQuery}</b>”.
      </p>

      {renderSection(
        'Properties',
        props.map((p: any) => (
          <button
            key={p.id}
            type="button"
            className="r"
            onClick={() => goto('properties/inventory')}
          >
            <i className="sw" style={{ background: 'var(--s1)' }} />
            <span className="nm">
              {p.name} · {p.project}
            </span>
            <span className="vv">{M.fmt(p.totalCost, numbers)}</span>
            <span className="pc">{p.status}</span>
          </button>
        )),
        'properties/inventory'
      )}

      {renderSection(
        'Sales',
        sales.map((s: any) => (
          <button
            key={s.id}
            type="button"
            className="r"
            onClick={() => goto('sales/register')}
          >
            <i className="sw" style={{ background: 'var(--s2)' }} />
            <span className="nm">
              {s.buyer} · {s.property}
            </span>
            <span className="vv">{M.fmt(s.sellingPrice, numbers)}</span>
            <span className="pc">{M.fmtDate(s.date)}</span>
          </button>
        )),
        'sales/register'
      )}

      {renderSection(
        'Agents',
        agents.map((a: any) => (
          <button
            key={a.id}
            type="button"
            className="r"
            onClick={() => goto('agents/directory')}
          >
            <i className="sw" style={{ background: 'var(--s3)' }} />
            <span className="nm">{a.name}</span>
            <span className="vv">{a.office}</span>
            <span className="pc">{a.id}</span>
          </button>
        )),
        'agents/directory'
      )}

      {renderSection(
        'Transactions',
        txns.map((t: any) => (
          <button
            key={t.id}
            type="button"
            className="r"
            onClick={() => goto('admin/transactions')}
          >
            <i className="sw" style={{ background: 'var(--s4)' }} />
            <span className="nm">
              {t.party} · {t.note}
            </span>
            <span className="vv">{M.fmt(t.amount, numbers)}</span>
            <span className="pc">{t.ref}</span>
          </button>
        )),
        'admin/transactions'
      )}

      {!hasResults && (
        <div className="empty">
          <Icon name="empty" />
          <h3>No matches</h3>
          <p>Nothing found for “{navQuery}”.</p>
        </div>
      )}
    </PageShell>
  );
}
