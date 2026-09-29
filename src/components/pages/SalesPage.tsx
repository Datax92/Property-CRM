'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag } from '../Shared';
import { ShareBar, RankedList } from '../Charts';
import { Icon } from '../Icons';
import { PAGE_META, OC } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function SalesPage() {
  const { tab, effectiveFilters: f, range: r, openModal, numbers } = useApp();

  const meta = PAGE_META[`sales/${tab}`] || { t: 'Sales' };

  if (tab === 'receivables') {
    const rows = M.receivables(f);
    const ag = M.aging(f);

    const summaryPairs: [string, string][] = [
      ['Open balances', M.fmtNum(rows.length)],
      ['Sale value', M.fmt(rows.reduce((a: number, s: any) => a + s.sellingPrice, 0), numbers)],
      ['Received', M.fmt(rows.reduce((a: number, s: any) => a + s.received, 0), numbers)],
      ['Outstanding', M.fmt(rows.reduce((a: number, s: any) => a + s.outstanding, 0), numbers)],
      ['Overdue', M.fmt(ag.slice(1).reduce((a: number, b: any) => a + b.amount, 0), numbers)],
    ];

    const cols = [
      { key: 'buyer', label: 'Customer' },
      { key: 'property', label: 'Property' },
      { key: 'agent', label: 'Agent' },
      { key: 'sellingPrice', label: 'Sale amount', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.sellingPrice, numbers) },
      { key: 'received', label: 'Received', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.received, numbers) },
      { key: 'outstanding', label: 'Outstanding', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.outstanding, numbers) },
      { key: 'dueDate', label: 'Due date', cls: 'mono', render: (s: any) => M.fmtDate(s.dueDate) },
      {
        key: 'daysOverdue',
        label: 'Days overdue',
        a: 'r' as const,
        cls: 'mono',
        render: (s: any) => (
          <span className={s.daysOverdue > 0 ? 'neg' : ''}>
            {s.daysOverdue > 0 ? M.fmtNum(s.daysOverdue) : '—'}
          </span>
        ),
      },
      { key: 'payStatus', label: 'Status', render: (s: any) => <Tag text={s.payStatus} /> },
    ];

    return (
      <PageShell
        title={meta.t}
        u={meta.u}
        p={meta.p}
        toolProps={{ period: false }}
        acts={
          <button type="button" className="btn pri" onClick={() => openModal('payment')}>
            <Icon name="plus" /> Record payment
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <div className="panel" style={{ marginBottom: '14px' }}>
          <div className="panel-h">
            <h3>Ageing</h3>
            <span className="sub">how far past due</span>
          </div>
          <div className="panel-b tight">
            <ShareBar
              items={ag.map((b: any, i: number) => ({
                k: b.label,
                v: b.amount,
                c: i === 0 ? OC[0] : [OC[1], OC[2], OC[3], 'var(--bad)'][i - 1],
                disp: M.fmt(b.amount, numbers),
              }))}
            />
            <RankedList
              items={ag.map((b: any, i: number) => ({
                k: `${b.label} · ${M.fmtNum(b.count)} ${b.count === 1 ? 'balance' : 'balances'}`,
                v: b.amount,
                c: i === 0 ? OC[0] : [OC[1], OC[2], OC[3], 'var(--bad)'][i - 1],
              }))}
            />
          </div>
        </div>
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  // Sales register (default)
  const ids = new Set(M.DATA.properties.filter((p: any) => M.propMatch(p, f)).map((p: any) => p.id));
  const rows = M.DATA.sales.filter((s: any) => M.saleMatch(s, f, ids) && M.inRange(s.date, r));

  const summaryPairs: [string, string][] = [
    ['Properties sold', M.fmtNum(rows.length)],
    ['Revenue', M.fmt(rows.reduce((a: number, s: any) => a + s.sellingPrice, 0), numbers)],
    ['Received', M.fmt(rows.reduce((a: number, s: any) => a + s.received, 0), numbers)],
    ['Outstanding', M.fmt(rows.reduce((a: number, s: any) => a + s.outstanding, 0), numbers)],
    ['Commission', M.fmt(rows.reduce((a: number, s: any) => a + s.commission, 0), numbers)],
  ];

  const cols = [
    { key: 'id', label: 'ID' },
    { key: 'property', label: 'Property' },
    { key: 'buyer', label: 'Buyer' },
    { key: 'agent', label: 'Agent' },
    { key: 'date', label: 'Sale date', cls: 'mono', render: (s: any) => M.fmtDate(s.date) },
    { key: 'sellingPrice', label: 'Selling price', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.sellingPrice, numbers) },
    { key: 'received', label: 'Received', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.received, numbers) },
    { key: 'outstanding', label: 'Outstanding', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.outstanding, numbers) },
    { key: 'method', label: 'Method' },
    { key: 'commission', label: 'Commission', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.commission, numbers) },
    { key: 'netRevenue', label: 'Net revenue', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.netRevenue, numbers) },
    { key: 'payStatus', label: 'Payment', render: (s: any) => <Tag text={s.payStatus} /> },
    { key: 'saleStatus', label: 'Sale', render: (s: any) => <Tag text={s.saleStatus} /> },
  ];

  return (
    <PageShell
      title={meta.t}
      u={meta.u}
      p={meta.p}
      acts={
        <button type="button" className="btn pri" onClick={() => openModal('sale')}>
          <Icon name="plus" /> Record sale
        </button>
      }
    >
      <SummaryKpis pairs={summaryPairs} />
      <DataTable cols={cols} rows={rows} totals={true} />
    </PageShell>
  );
}
