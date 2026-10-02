'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag } from '../Shared';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function AgentsPage() {
  const { tab, effectiveFilters: f, range: r, numbers, openModal } = useApp();

  const meta = PAGE_META[`agents/${tab}`] || { t: 'Agents' };

  if (tab === 'commissions') {
    const ids = new Set(M.DATA.properties.filter((p: any) => M.propMatch(p, f)).map((p: any) => p.id));
    const rows = M.DATA.commissions.filter(
      (c: any) => ids.has(c.propertyId) && M.inRange(c.date, r) && (f.agent === 'all' || c.agentId === f.agent)
    );

    const summaryPairs: [string, string][] = [
      ['Entries', M.fmtNum(rows.length)],
      ['Earned', M.fmt(rows.reduce((a: number, c: any) => a + c.amount, 0), numbers)],
      ['Paid', M.fmt(rows.reduce((a: number, c: any) => a + c.paid, 0), numbers)],
      ['Outstanding', M.fmt(rows.reduce((a: number, c: any) => a + c.outstanding, 0), numbers)],
    ];

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'agent', label: 'Agent' },
      { key: 'property', label: 'Property' },
      { key: 'counterparty', label: 'Buyer' },
      { key: 'date', label: 'Date', cls: 'mono', render: (c: any) => M.fmtDate(c.date) },
      { key: 'pct', label: 'Rate', a: 'r' as const, cls: 'mono', render: (c: any) => `${c.pct.toFixed(2)}%` },
      { key: 'amount', label: 'Commission', a: 'r' as const, sum: true, cls: 'mono', render: (c: any) => M.fmt(c.amount, numbers) },
      { key: 'paid', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (c: any) => M.fmt(c.paid, numbers) },
      { key: 'outstanding', label: 'Outstanding', a: 'r' as const, sum: true, cls: 'mono', render: (c: any) => M.fmt(c.outstanding, numbers) },
      { key: 'status', label: 'Status', render: (c: any) => <Tag text={c.status} /> },
      {
        key: 'pay',
        label: '',
        render: (c: any) =>
          c.outstanding > 0 ? (
            <button
              type="button"
              className="btn sm"
              onClick={() => openModal('payment', { settle: 'comm:' + c.id })}
              title="Record a commission payment to this agent"
            >
              Pay
            </button>
          ) : null,
      },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p}>
        <SummaryKpis pairs={summaryPairs} />
        <DataTable cols={cols} rows={rows} totals={true} attach="commissions" />
      </PageShell>
    );
  }

  // Directory tab (default)
  const rows = M.agentSummary(r, f).map((a: any, i: number) => ({ ...a, rank: i + 1 }));

  const summaryPairs: [string, string][] = [
    ['Agents', M.fmtNum(rows.length)],
    ['Sales value', M.fmt(rows.reduce((a: number, x: any) => a + x.salesValue, 0), numbers)],
    ['Profit generated', M.fmt(rows.reduce((a: number, x: any) => a + x.profit, 0), numbers)],
    ['Commission', M.fmt(rows.reduce((a: number, x: any) => a + x.commission, 0), numbers)],
    ['Outstanding', M.fmt(rows.reduce((a: number, x: any) => a + x.outstanding, 0), numbers)],
  ];

  const cols = [
    { key: 'rank', label: '#', a: 'r' as const, cls: 'mono', render: (a: any) => String(a.rank) },
    { key: 'name', label: 'Agent' },
    { key: 'id', label: 'Agent ID' },
    { key: 'office', label: 'Office' },
    { key: 'phone', label: 'Phone', cls: 'mono' },
    { key: 'rate', label: 'Rate', a: 'r' as const, cls: 'mono', render: (a: any) => `${a.rate}%` },
    { key: 'transactions', label: 'Deals', a: 'r' as const, cls: 'mono', render: (a: any) => M.fmtNum(a.transactions) },
    { key: 'salesValue', label: 'Sales value', a: 'r' as const, sum: true, cls: 'mono', render: (a: any) => M.fmt(a.salesValue, numbers) },
    {
      key: 'profit',
      label: 'Profit generated',
      a: 'r' as const,
      sum: true,
      cls: 'mono',
      render: (a: any) => <span className="pos">{M.fmt(a.profit, numbers)}</span>,
    },
    { key: 'commission', label: 'Commission', a: 'r' as const, sum: true, cls: 'mono', render: (a: any) => M.fmt(a.commission, numbers) },
    { key: 'paid', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (a: any) => M.fmt(a.paid, numbers) },
    { key: 'outstanding', label: 'Outstanding', a: 'r' as const, sum: true, cls: 'mono', render: (a: any) => M.fmt(a.outstanding, numbers) },
  ];

  return (
    <PageShell
      title={meta.t}
      u={meta.u}
      p={meta.p}
      acts={
        <button type="button" className="btn pri" onClick={() => openModal('agent')}>
          <Icon name="plus" /> Add agent
        </button>
      }
    >
      <SummaryKpis pairs={summaryPairs} />
      {rows.length === 0 ? (
        <div className="empty">
          <Icon name="empty" />
          <h3>No agents yet</h3>
          <p>Add your agents here. They can then be picked when recording a sale and earn commission on it.</p>
        </div>
      ) : (
        <DataTable cols={cols} rows={rows} totals={true} attach="agents" />
      )}
    </PageShell>
  );
}
