'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag } from '../Shared';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function PropertiesPage() {
  const { tab, effectiveFilters: f, range: r, openModal, numbers, openCostSheet } = useApp();

  const meta = PAGE_META[`properties/${tab}`] || { t: 'Properties' };

  if (tab === 'purchases') {
    const rows = M.DATA.properties
      .filter((p: any) => M.propMatch(p, f) && M.inRange(p.purchaseDate, r))
      .map((p: any) => ({ ...p, extrasTotal: p.totalCost - p.price }));

    const summaryPairs: [string, string][] = [
      ['Properties bought', M.fmtNum(rows.length)],
      ['Purchase price', M.fmt(rows.reduce((a: number, p: any) => a + p.price, 0), numbers)],
      ['Acquisition costs', M.fmt(rows.reduce((a: number, p: any) => a + p.extrasTotal, 0), numbers)],
      ['Total cost', M.fmt(rows.reduce((a: number, p: any) => a + p.totalCost, 0), numbers)],
      ['Still payable', M.fmt(rows.reduce((a: number, p: any) => a + p.remaining, 0), numbers)],
    ];

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Property' },
      { key: 'type', label: 'Type' },
      { key: 'project', label: 'Project' },
      { key: 'seller', label: 'Seller' },
      { key: 'purchaseDate', label: 'Purchased', cls: 'mono', render: (p: any) => M.fmtDate(p.purchaseDate) },
      { key: 'price', label: 'Price', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.price, numbers) },
      { key: 'extrasTotal', label: 'Extra costs', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.extrasTotal, numbers) },
      { key: 'totalCost', label: 'Total cost', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.totalCost, numbers) },
      { key: 'paid', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.paid, numbers) },
      { key: 'remaining', label: 'Remaining', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.remaining, numbers) },
      { key: 'payStatus', label: 'Payment', render: (p: any) => <Tag text={p.payStatus} /> },
      { key: 'status', label: 'Status', render: (p: any) => <Tag text={p.status} /> },
      {
        key: 'pay',
        label: '',
        render: (p: any) =>
          p.remaining > 0 ? (
            <button
              type="button"
              className="btn sm"
              onClick={() => openModal('payment', { settle: 'prop:' + p.id })}
              title="Record a payment to the seller"
            >
              Pay seller
            </button>
          ) : null,
      },
      {
        key: 'sheet',
        label: 'Cost Sheet',
        render: (p: any) => (
          <button
            type="button"
            className="btn"
            style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
            onClick={() => openCostSheet(p.id)}
            title="Open trade cost sheet"
          >
            <Icon name="calculator" size={12} /> Cost Sheet
          </button>
        ),
      },
    ];

    return (
      <PageShell
        title={meta.t}
        u={meta.u}
        p={meta.p}
        acts={
          <button type="button" className="btn pri" onClick={() => openModal('property')}>
            <Icon name="plus" /> Add property
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <DataTable cols={cols} rows={rows} totals={true} attach="properties" />
      </PageShell>
    );
  }

  if (tab === 'projects') {
    const rows = M.projectSummary(r, f);
    const sum = (key: string) => rows.reduce((a: number, x: any) => a + x[key], 0);

    const summaryPairs: [string, string][] = [
      ['Projects', M.fmtNum(rows.length)],
      ['Properties held', M.fmtNum(sum('held'))],
      ['Cost of stock held', M.fmt(sum('heldCost'), numbers)],
      ['Market value', M.fmt(sum('heldValue'), numbers)],
      ['Sales in period', M.fmt(sum('revenue'), numbers)],
    ];

    const cols = [
      { key: 'project', label: 'Project / society' },
      { key: 'city', label: 'City' },
      { key: 'total', label: 'Properties', a: 'r' as const, cls: 'mono', render: (x: any) => M.fmtNum(x.total) },
      { key: 'held', label: 'Held', a: 'r' as const, cls: 'mono', render: (x: any) => M.fmtNum(x.held) },
      { key: 'heldCost', label: 'Cost of stock', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => M.fmt(x.heldCost, numbers) },
      { key: 'heldValue', label: 'Market value', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => M.fmt(x.heldValue, numbers) },
      {
        key: 'upside',
        label: 'Potential profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (x: any) => <span className={x.upside > 0 ? 'pos' : x.upside < 0 ? 'neg' : ''}>{M.fmt(x.upside, numbers)}</span>,
      },
      { key: 'sold', label: 'Sold in period', a: 'r' as const, cls: 'mono', render: (x: any) => M.fmtNum(x.sold) },
      { key: 'revenue', label: 'Sales', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => M.fmt(x.revenue, numbers) },
      {
        key: 'netProfit',
        label: 'Net profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (x: any) => <span className={x.netProfit > 0 ? 'pos' : x.netProfit < 0 ? 'neg' : ''}>{M.fmt(x.netProfit, numbers)}</span>,
      },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p}>
        <SummaryKpis pairs={summaryPairs} />
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  if (tab === 'performance') {
    const rows = M.propertyPerf(r, f);

    const summaryPairs: [string, string][] = [
      ['Properties sold', M.fmtNum(rows.length)],
      ['Total cost', M.fmt(rows.reduce((a: number, p: any) => a + p.totalCost, 0), numbers)],
      ['Revenue', M.fmt(rows.reduce((a: number, p: any) => a + p.sellingPrice, 0), numbers)],
      ['Gross profit', M.fmt(rows.reduce((a: number, p: any) => a + p.grossProfit, 0), numbers)],
      ['Net profit', M.fmt(rows.reduce((a: number, p: any) => a + p.netProfit, 0), numbers)],
    ];

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Property' },
      { key: 'project', label: 'Project' },
      { key: 'agent', label: 'Agent' },
      { key: 'saleDate', label: 'Sold', cls: 'mono', render: (p: any) => M.fmtDate(p.saleDate) },
      { key: 'price', label: 'Purchase price', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.price, numbers) },
      { key: 'extras', label: 'Acquisition', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.extras, numbers) },
      { key: 'totalCost', label: 'Total cost', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.totalCost, numbers) },
      { key: 'sellingPrice', label: 'Selling price', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.sellingPrice, numbers) },
      { key: 'commission', label: 'Commission', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.commission, numbers) },
      {
        key: 'grossProfit',
        label: 'Gross profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span className={p.grossProfit > 0 ? 'pos' : p.grossProfit < 0 ? 'neg' : ''}>{M.fmt(p.grossProfit, numbers)}</span>,
      },
      {
        key: 'netProfit',
        label: 'Net profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span className={p.netProfit > 0 ? 'pos' : p.netProfit < 0 ? 'neg' : ''}>{M.fmt(p.netProfit, numbers)}</span>,
      },
      { key: 'margin', label: 'Margin', a: 'r' as const, cls: 'mono', render: (p: any) => isFinite(p.margin) ? `${p.margin.toFixed(1)}%` : '—' },
      {
        key: 'sheet',
        label: 'Cost Sheet',
        render: (p: any) => (
          <button
            type="button"
            className="btn"
            style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
            onClick={() => openCostSheet(p.id)}
            title="Open trade cost sheet"
          >
            <Icon name="calculator" size={12} /> Cost Sheet
          </button>
        ),
      },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p}>
        <SummaryKpis pairs={summaryPairs} />
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  // Inventory tab (default)
  const rows = M.DATA.properties
    .filter((p: any) => M.propMatch(p, f) && p.status !== 'Sold')
    .map((p: any) => ({
      ...p,
      upside: p.currentValue - p.totalCost,
      upPct: M.pctOf(p.currentValue - p.totalCost, p.totalCost),
    }))
    .sort((a: any, b: any) => b.upside - a.upside);

  const summaryPairs: [string, string][] = [
    ['Unsold properties', M.fmtNum(rows.length)],
    ['Cost value', M.fmt(rows.reduce((a: number, p: any) => a + p.totalCost, 0), numbers)],
    ['Market value', M.fmt(rows.reduce((a: number, p: any) => a + p.currentValue, 0), numbers)],
    ['Potential profit', M.fmt(rows.reduce((a: number, p: any) => a + p.upside, 0), numbers)],
  ];

  const cols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Property' },
    { key: 'type', label: 'Type' },
    { key: 'project', label: 'Project' },
    { key: 'location', label: 'City' },
    { key: 'size', label: 'Size' },
    { key: 'totalCost', label: 'Purchase cost', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.totalCost, numbers) },
    { key: 'currentValue', label: 'Current value', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.currentValue, numbers) },
    {
      key: 'upside',
      label: 'Potential profit',
      a: 'r' as const,
      sum: true,
      cls: 'mono',
      render: (p: any) => <span className={p.upside > 0 ? 'pos' : p.upside < 0 ? 'neg' : ''}>{M.fmt(p.upside, numbers)}</span>,
    },
    { key: 'upPct', label: 'Upside %', a: 'r' as const, cls: 'mono', render: (p: any) => isFinite(p.upPct) ? `${p.upPct.toFixed(1)}%` : '—' },
    { key: 'heldDays', label: 'Days held', a: 'r' as const, cls: 'mono', render: (p: any) => M.fmtNum(p.heldDays) },
    { key: 'status', label: 'Status', render: (p: any) => <Tag text={p.status} /> },
    {
      key: 'sheet',
      label: 'Cost Sheet',
      render: (p: any) => (
        <button
          type="button"
          className="btn"
          style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
          onClick={() => openCostSheet(p.id)}
          title="Open trade cost sheet"
        >
          <Icon name="calculator" size={12} /> Cost Sheet
        </button>
      ),
    },
  ];

  return (
    <PageShell
      title={meta.t}
      u={meta.u}
      p={meta.p}
      toolProps={{ period: false }}
      acts={
        <button type="button" className="btn pri" onClick={() => openModal('property')}>
          <Icon name="plus" /> Add property
        </button>
      }
    >
      <SummaryKpis pairs={summaryPairs} />
      <div className="note" style={{ marginBottom: '14px' }} data-noprint="1">
        <span className="ic">
          <Icon name="info" />
        </span>
        <div>
          <b>Potential profit is an unrealised estimate</b> on stock nobody has bought yet. It is never added
          to net profit.
        </div>
      </div>
      <DataTable cols={cols} rows={rows} totals={true} attach="properties" />
    </PageShell>
  );
}
