'use client';

import React, { useCallback, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag, PaidBy } from '../Shared';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import { ledgersReady, ledgerError } from '../../lib/firestore-service';
import * as M from '../../lib/re-data';
import { InvoiceReceiptModal } from '../InvoiceReceiptModal';
import type { Invoice } from '../../lib/types';

export function PropertiesPage() {
  const { tab, effectiveFilters: f, range: r, openModal, numbers, openCostSheet, toast, refreshData } = useApp();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const closeReceipt = useCallback(() => setSelectedInvoice(null), []);

  const meta = PAGE_META[`properties/${tab}`] || { t: 'Properties' };

  if (tab === 'purchases') {
    const rows = M.DATA.properties
      .filter((p: any) => M.propMatch(p, f) && M.inRange(p.purchaseDate, r))
      // Every amount is the plot's cost sheet: net buy cost + §236K + expenses + agent fee = landed cost.
      .map((p: any) => {
        const d: any = M.dealColumns(p.id) || {};
        const sale = M.DATA.sales.find((s: any) => s.propertyId === p.id);
        // Held until it was sold, or until today while it is still held.
        const until = sale ? sale.date : M.TODAY;
        return {
          ...p,
          landed: d.landed || 0,
          tax236K: d.tax236K || 0,
          expenses: d.buyExpenses || 0,
          buyAgent: d.buyAgent || 0,
          heldDays: p.purchaseDate instanceof Date ? Math.max(0, Math.round((until - p.purchaseDate) / 864e5)) : null,
          heldTo: sale ? 'sold ' + M.fmtDate(sale.date) : 'still held',
        };
      });

    const sum = (key: string) => rows.reduce((a: number, p: any) => a + (p[key] || 0), 0);
    const summaryPairs: [string, string][] = [
      ['Properties bought', M.fmtNum(rows.length)],
      ['Net buy cost', M.fmt(sum('price'), numbers)],
      ['§236K tax', M.fmt(sum('tax236K'), numbers)],
      ['Expenses', M.fmt(sum('expenses'), numbers)],
      ['Landed cost', M.fmt(sum('landed'), numbers)],
      ['Still payable to sellers', M.fmt(sum('remaining'), numbers)],
    ];

    const purchaseVoucher = (p: any) => {
      let inv = M.purchaseInvoiceOf(p.id);
      if (!inv) {
        if (!ledgersReady() || ledgerError()) {
          toast('Not made — your records are not reachable right now');
          return;
        }
        inv = M.generateInvoiceFromPurchase(p.id);
        refreshData();
        toast(`Purchase invoice ${inv.id} made for ${p.name}`);
      }
      setSelectedInvoice(inv);
    };

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Property' },
      { key: 'type', label: 'Type' },
      { key: 'project', label: 'Project' },
      { key: 'seller', label: 'Seller' },
      { key: 'purchaseDate', label: 'Purchase date', cls: 'mono', render: (p: any) => M.fmtDate(p.purchaseDate) },
      {
        key: 'heldDays',
        label: 'Days held',
        a: 'r' as const,
        cls: 'mono',
        render: (p: any) => (p.heldDays == null ? '—' : <span title={`From the purchase date, ${p.heldTo}`}>{M.fmtNum(p.heldDays)}</span>),
      },
      { key: 'estampNo', label: 'e-Stamp no.', cls: 'mono', render: (p: any) => p.estampNo || '—' },
      { key: 'price', label: 'Net buy cost', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.price, numbers) },
      { key: 'tax236K', label: '§236K tax', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.tax236K, numbers) },
      {
        key: 'expenses',
        label: 'Expenses',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span title="Transfer, stamp duty, CVT and fees, and the expenses picked for this plot, as on its cost sheet">{M.fmt(p.expenses, numbers)}</span>,
      },
      { key: 'buyAgent', label: 'Agent fee', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.buyAgent, numbers) },
      { key: 'landed', label: 'Landed cost', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => <b>{M.fmt(p.landed, numbers)}</b> },
      { key: 'paid', label: 'Paid to seller', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.paid, numbers) },
      { key: 'method', label: 'Paid by', render: (p: any) => <PaidBy x={p} total={p.paid} numbers={numbers} /> },
      { key: 'remaining', label: 'Remaining', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.remaining, numbers) },
      { key: 'payStatus', label: 'Payment', render: (p: any) => <Tag text={p.payStatus} /> },
      { key: 'status', label: 'Status', render: (p: any) => <Tag text={p.status} /> },
      {
        key: 'voucher',
        label: 'Purchase invoice',
        render: (p: any) => {
          const inv = M.purchaseInvoiceOf(p.id);
          return (
            <button
              type="button"
              className={`btn sm ${inv ? '' : 'pri'}`}
              style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
              onClick={() => purchaseVoucher(p)}
              title={inv ? `Open purchase invoice ${inv.id}` : 'Make the purchase invoice from this purchase, as a sale invoice is made from a sale'}
            >
              <Icon name="print" size={12} /> {inv ? inv.id : 'Make invoice'}
            </button>
          );
        },
      },
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
        <DataTable cols={cols} rows={rows} totals={true} attach="properties" reorder="purchase-register" />
        <InvoiceReceiptModal invoice={selectedInvoice} onClose={closeReceipt} />
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
      <PageShell
        title={meta.t}
        u={meta.u}
        p={meta.p}
        acts={
          <button type="button" className="btn pri" onClick={() => openModal('project')}>
            <Icon name="plus" /> Add project
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  if (tab === 'performance') {
    // Every figure is the property's own cost sheet, laid out as the cost sheet register lays it out.
    const rows = M.propertyPerf(r, f);
    const sum = (key: string) => rows.reduce((a: number, p: any) => a + (p[key] || 0), 0);
    const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

    const summaryPairs: [string, string][] = [
      ['Properties sold', M.fmtNum(rows.length)],
      ['Purchase price (landed)', M.fmt(sum('purchasePrice'), numbers)],
      ['Sale price', M.fmt(sum('grossSalePrice'), numbers)],
      ['Gross profit', M.fmt(sum('grossProfit'), numbers)],
      ['Net margin', M.fmt(sum('netMargin'), numbers)],
      ['Net margin %', pct(M.pctOf(sum('netMargin'), sum('grossSalePrice')))],
    ];

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Property' },
      { key: 'project', label: 'Project' },
      { key: 'agent', label: 'Agent' },
      { key: 'saleDate', label: 'Sold', cls: 'mono', render: (p: any) => M.fmtDate(p.saleDate) },
      {
        key: 'sheet',
        label: 'Sheet',
        render: (p: any) =>
          p.sheet ? (
            <span className="mono">{p.sheet}</span>
          ) : (
            <span className="tag mute" title="No cost sheet saved yet: read from the property, sale, expense and tax records.">
              From records
            </span>
          ),
      },
      { key: 'netBuyCost', label: 'Net buy cost', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.netBuyCost, numbers) },
      { key: 'purchasePrice', label: 'Purchase price', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.purchasePrice, numbers) },
      { key: 'grossSalePrice', label: 'Sale price', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => <b>{M.fmt(p.grossSalePrice, numbers)}</b> },
      { key: 'sellingCosts', label: 'Selling costs', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.sellingCosts, numbers) },
      {
        key: 'grossProfit',
        label: 'Gross profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span className={p.grossProfit >= 0 ? 'pos' : 'neg'}>{M.fmt(p.grossProfit, numbers)}</span>,
      },
      { key: 'deductions', label: 'CGT, Zakat & charity', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.deductions, numbers) },
      {
        key: 'netMargin',
        label: 'Net margin',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => (
          <span className={p.netMargin >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 800 }}>
            {M.fmt(p.netMargin, numbers)}
          </span>
        ),
      },
      { key: 'netMarginPct', label: 'Margin %', a: 'r' as const, cls: 'mono', render: (p: any) => pct(p.netMarginPct) },
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
    .map((p: any) => {
      const landed = M.landedCost(p.id), worth = M.plotWorth(p);
      return { ...p, landed, worth, upside: worth - landed, upPct: M.pctOf(worth - landed, landed) };
    })
    .sort((a: any, b: any) => b.upside - a.upside);

  const summaryPairs: [string, string][] = [
    ['Unsold properties', M.fmtNum(rows.length)],
    ['Landed cost', M.fmt(rows.reduce((a: number, p: any) => a + p.landed, 0), numbers)],
    ['Market value', M.fmt(rows.reduce((a: number, p: any) => a + p.worth, 0), numbers)],
    ['Potential profit', M.fmt(rows.reduce((a: number, p: any) => a + p.upside, 0), numbers)],
  ];

  const cols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Property' },
    { key: 'type', label: 'Type' },
    { key: 'project', label: 'Project' },
    { key: 'location', label: 'City' },
    { key: 'size', label: 'Size' },
    { key: 'landed', label: 'Landed cost', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.landed, numbers) },
    { key: 'worth', label: 'Current value', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.worth, numbers) },
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
