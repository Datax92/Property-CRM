'use client';

import React, { useCallback, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag } from '../Shared';
import { ShareBar, RankedList } from '../Charts';
import { Icon } from '../Icons';
import { PAGE_META, OC } from '../../lib/constants';
import * as M from '../../lib/re-data';
import { InvoiceReceiptModal } from '../InvoiceReceiptModal';
import type { Invoice } from '../../lib/types';

export function SalesPage() {
  const { tab, effectiveFilters: f, range: r, openModal, numbers, openCostSheet } = useApp();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const closeReceipt = useCallback(() => setSelectedInvoice(null), []);

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
      {
        key: 'receive',
        label: 'Collect',
        render: (s: any) => (
          <button
            type="button"
            className="btn pri"
            style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
            onClick={() => openModal('payment', { settle: 'sale:' + s.id })}
            title="Record a payment received against this balance"
          >
            <Icon name="plus" size={12} /> Receive
          </button>
        ),
      },
      {
        key: 'sheet',
        label: 'Cost Sheet',
        render: (s: any) => (
          <button
            type="button"
            className="btn"
            style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
            onClick={() => openCostSheet(s.propertyId)}
            title="Open deal cost sheet"
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
        <DataTable cols={cols} rows={rows} totals={true} attach="sales" />
      </PageShell>
    );
  }

  if (tab === 'saleInvoices' || tab === 'purchaseInvoices') {
    const invoiceType = tab === 'saleInvoices' ? 'sale' : 'purchase';
    const invRows = M.DATA.invoices.filter(
      (i: any) => i.type === invoiceType && M.inRange(i.receiptDate, r)
    );

    const summaryPairs: [string, string][] = [
      ['Invoices', M.fmtNum(invRows.length)],
      ['Total value', M.fmt(invRows.reduce((a: number, i: any) => a + i.totalAmount, 0), numbers)],
      ['Token received', M.fmt(invRows.reduce((a: number, i: any) => a + i.tokenAmount, 0), numbers)],
      ['Balance pending', M.fmt(invRows.reduce((a: number, i: any) => a + i.balanceAmount, 0), numbers)],
    ];

    const invCols = [
      { key: 'id', label: 'Invoice #' },
      { key: 'srNo', label: 'Sr No.' },
      { key: 'receiptDate', label: 'Receipt date', cls: 'mono', render: (i: any) => M.fmtDate(i.receiptDate) },
      { key: 'buyerName', label: 'Buyer name' },
      { key: 'buyerCnic', label: 'Buyer CNIC' },
      { key: 'sellerName', label: 'Seller name' },
      { key: 'propertyName', label: 'Property' },
      { key: 'paymentMode', label: 'Payment mode' },
      { key: 'totalAmount', label: 'Total amount', a: 'r' as const, sum: true, cls: 'mono', render: (i: any) => M.fmt(i.totalAmount, numbers) },
      { key: 'tokenAmount', label: 'Token', a: 'r' as const, sum: true, cls: 'mono', render: (i: any) => M.fmt(i.tokenAmount, numbers) },
      { key: 'balanceAmount', label: 'Balance', a: 'r' as const, sum: true, cls: 'mono', render: (i: any) => M.fmt(i.balanceAmount, numbers) },
      { key: 'tokenDate', label: 'Token date', cls: 'mono', render: (i: any) => M.fmtDate(i.tokenDate) },
      { key: 'transferDate', label: 'Transfer date', cls: 'mono', render: (i: any) => M.fmtDate(i.transferDate) },
      { key: 'receivedByName', label: 'Received by' },
      { key: 'receivedFromName', label: 'Received from' },
    ];
    // The print action leads the row so it is never hidden behind a sideways scroll.
    invCols.unshift({
      key: 'voucher',
      label: 'Voucher',
      render: (i: any) => (
        <button
          type="button"
          className="btn sm pri"
          style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
          onClick={() => setSelectedInvoice(i)}
          title="Open the printable receipt / voucher (A4 or thermal)"
        >
          <Icon name="print" size={12} /> Print Receipt
        </button>
      ),
    } as any);

    const modalType = tab === 'saleInvoices' ? 'saleInvoice' : 'purchaseInvoice';
    const btnLabel = tab === 'saleInvoices' ? 'Create sale invoice' : 'Create purchase invoice';

    return (
      <PageShell
        title={meta.t}
        u={meta.u}
        p={meta.p}
        acts={
          <button type="button" className="btn pri" onClick={() => openModal(modalType)}>
            <Icon name="plus" /> {btnLabel}
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        {invRows.length === 0 ? (
          <div className="empty">
            <Icon name="empty" />
            <h3>No {tab === 'saleInvoices' ? 'sale' : 'purchase'} invoices yet</h3>
            <p>
              Click “{btnLabel}” to create one
              {tab === 'saleInvoices' ? ', or use “Receipt Slip” on a row of the sales register.' : '.'}
            </p>
          </div>
        ) : (
          <DataTable cols={invCols} rows={invRows} totals={true} attach="invoices" />
        )}
        <InvoiceReceiptModal invoice={selectedInvoice} onClose={closeReceipt} />
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
    {
      key: 'sheet',
      label: 'Cost Sheet',
      render: (s: any) => (
        <button
          type="button"
          className="btn"
          style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
          onClick={() => openCostSheet(s.propertyId)}
          title="Open deal cost sheet"
        >
          <Icon name="calculator" size={12} /> Cost Sheet
        </button>
      ),
    },
    {
      key: 'receipt',
      label: 'Receipt Voucher',
      render: (s: any) => (
        <button
          type="button"
          className="btn pri sm"
          style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
          onClick={() => {
            let inv = M.DATA.invoices.find((i: any) => i.saleId === s.id && i.type === 'sale');
            if (!inv) {
              inv = M.generateInvoiceFromSale(s.id);
            }
            setSelectedInvoice(inv);
          }}
          title="Generate & Print Sale Receipt Voucher"
        >
          <Icon name="print" size={12} /> Receipt Slip
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
        <button type="button" className="btn pri" onClick={() => openModal('sale')}>
          <Icon name="plus" /> Record sale
        </button>
      }
    >
      <SummaryKpis pairs={summaryPairs} />
      <DataTable cols={cols} rows={rows} totals={true} attach="sales" />
      <InvoiceReceiptModal invoice={selectedInvoice} onClose={closeReceipt} />
    </PageShell>
  );
}
