'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag, FigText } from '../Shared';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function CostsPage() {
  const { tab, effectiveFilters: f, range: r, openModal, numbers } = useApp();

  const meta = PAGE_META[`costs/${tab}`] || { t: 'Costs' };

  if (tab === 'salaries') {
    const rows = M.DATA.salaries.filter((s: any) => M.inRange(s.date, r) && (f.office === 'all' || s.office === f.office));

    const summaryPairs: [string, string][] = [
      ['Payslips', M.fmtNum(rows.length)],
      ['Basic', M.fmt(rows.reduce((a: number, s: any) => a + s.basic, 0), numbers)],
      ['Bonus + allowance', M.fmt(rows.reduce((a: number, s: any) => a + s.bonus + s.allowance, 0), numbers)],
      ['Net pay', M.fmt(rows.reduce((a: number, s: any) => a + s.net, 0), numbers)],
    ];

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'employee', label: 'Employee' },
      { key: 'dept', label: 'Department' },
      { key: 'monthLabel', label: 'Month' },
      { key: 'basic', label: 'Basic', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.basic, numbers) },
      { key: 'bonus', label: 'Bonus', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.bonus, numbers) },
      { key: 'allowance', label: 'Allowance', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.allowance, numbers) },
      { key: 'deduction', label: 'Deduction', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.deduction, numbers) },
      { key: 'net', label: 'Net pay', a: 'r' as const, sum: true, cls: 'mono', render: (s: any) => M.fmt(s.net, numbers) },
      { key: 'date', label: 'Pay date', cls: 'mono', render: (s: any) => M.fmtDate(s.date) },
      { key: 'status', label: 'Status', render: (s: any) => <Tag text={s.status} /> },
      {
        key: 'pay',
        label: '',
        render: (x: any) =>
          x.status === 'Pending' ? (
            <button
              type="button"
              className="btn sm"
              onClick={() => openModal('payment', { settle: 'sal:' + x.id })}
              title="Record a payment against this balance"
            >
              Pay
            </button>
          ) : null,
      },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} acts={
          <button type="button" className="btn pri" onClick={() => openModal('salary')}>
            <Icon name="plus" /> Add payslip
          </button>
        }>
        <SummaryKpis pairs={summaryPairs} />
        <DataTable cols={cols} rows={rows} totals={true} attach="salaries" />
      </PageShell>
    );
  }

  if (tab === 'bills') {
    const rows = M.DATA.bills.filter((b: any) => M.inRange(b.dueDate, r) && (f.office === 'all' || b.office === f.office));
    const od = rows.filter((b: any) => b.status === 'Overdue');

    const summaryPairs: [string, string][] = [
      ['Bills', M.fmtNum(rows.length)],
      ['Billed', M.fmt(rows.reduce((a: number, b: any) => a + b.amount, 0), numbers)],
      ['Paid', M.fmt(rows.reduce((a: number, b: any) => a + b.paid, 0), numbers)],
      ['Outstanding', M.fmt(rows.reduce((a: number, b: any) => a + b.outstanding, 0), numbers)],
    ];

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'type', label: 'Bill type' },
      { key: 'vendor', label: 'Vendor' },
      { key: 'number', label: 'Bill no.' },
      { key: 'period', label: 'Period' },
      { key: 'dueDate', label: 'Due', cls: 'mono', render: (b: any) => M.fmtDate(b.dueDate) },
      { key: 'amount', label: 'Amount', a: 'r' as const, sum: true, cls: 'mono', render: (b: any) => M.fmt(b.amount, numbers) },
      { key: 'paid', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (b: any) => M.fmt(b.paid, numbers) },
      { key: 'outstanding', label: 'Outstanding', a: 'r' as const, sum: true, cls: 'mono', render: (b: any) => M.fmt(b.outstanding, numbers) },
      { key: 'status', label: 'Status', render: (b: any) => <Tag text={b.status} /> },
      {
        key: 'pay',
        label: '',
        render: (x: any) =>
          x.outstanding > 0 ? (
            <button
              type="button"
              className="btn sm"
              onClick={() => openModal('payment', { settle: 'bill:' + x.id })}
              title="Record a payment against this balance"
            >
              Pay
            </button>
          ) : null,
      },
    ];

    return (
      <PageShell
        title={meta.t}
        u={meta.u}
        p={meta.p}
        acts={
          <button type="button" className="btn pri" onClick={() => openModal('bill')}>
            <Icon name="plus" /> Add bill
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        {od.length > 0 && (
          <div className="note bad" style={{ marginBottom: '14px' }}>
            <span className="ic">
              <Icon name="warn" />
            </span>
            <div>
              <b>
                {M.fmtNum(od.length)} overdue {od.length === 1 ? 'bill' : 'bills'}
              </b>{' '}
              totalling {M.fmt(od.reduce((a: number, b: any) => a + b.outstanding, 0), numbers)}.
            </div>
          </div>
        )}
        <DataTable cols={cols} rows={rows} totals={true} attach="bills" />
      </PageShell>
    );
  }

  if (tab === 'tax') {
    const k = M.computeKPIs(r, f);
    const rows = M.DATA.taxes.filter((t: any) => M.inRange(t.date, r) && (f.office === 'all' || t.office === f.office));
    const fySummary = M.fiscalYearTaxSummary(f);

    const summaryPairs: [string, string][] = [
      ['Entries', M.fmtNum(rows.length)],
      ['Total tax', M.fmt(rows.reduce((a: number, t: any) => a + t.amount, 0), numbers)],
      ['Paid', M.fmt(rows.reduce((a: number, t: any) => a + t.paid, 0), numbers)],
      ['Outstanding', M.fmt(rows.reduce((a: number, t: any) => a + t.outstanding, 0), numbers)],
      ['Due in 30 days', M.fmt(k.taxDueSoon, numbers)],
    ];

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'type', label: 'Tax type' },
      { key: 'ref', label: 'Reference' },
      { key: 'property', label: 'Property' },
      { key: 'authority', label: 'Authority' },
      { key: 'amount', label: 'Amount', a: 'r' as const, sum: true, cls: 'mono', render: (t: any) => M.fmt(t.amount, numbers) },
      { key: 'paid', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (t: any) => M.fmt(t.paid, numbers) },
      { key: 'outstanding', label: 'Outstanding', a: 'r' as const, sum: true, cls: 'mono', render: (t: any) => M.fmt(t.outstanding, numbers) },
      { key: 'dueDate', label: 'Due', cls: 'mono', render: (t: any) => M.fmtDate(t.dueDate) },
      { key: 'status', label: 'Status', render: (t: any) => <Tag text={t.status} /> },
      {
        key: 'pay',
        label: '',
        render: (x: any) =>
          x.outstanding > 0 ? (
            <button
              type="button"
              className="btn sm"
              onClick={() => openModal('payment', { settle: 'tax:' + x.id })}
              title="Record a payment against this balance"
            >
              Pay
            </button>
          ) : null,
      },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} acts={
          <button type="button" className="btn pri" onClick={() => openModal('tax')}>
            <Icon name="plus" /> Add tax entry
          </button>
        }>
        <SummaryKpis pairs={summaryPairs} />

        {/* Fiscal Year Tax Summary Panel */}
        <div className="panel" style={{ marginBottom: '14px' }}>
          <div className="panel-h">
            <h3>{fySummary.fyLabel} — Tax summary</h3>
            <span className="sub">Pakistan fiscal year runs July to June. Closing month is June.</span>
          </div>
          <div className="panel-b">
            <div className="kpis">
              <div className="kpi">
                <span className="k">Advance Tax §236K (buy)</span>
                <span className="v"><FigText str={M.fmt(fySummary.advanceTax236K, numbers)} /></span>
              </div>
              <div className="kpi">
                <span className="k">Advance Tax §236C (sell)</span>
                <span className="v"><FigText str={M.fmt(fySummary.advanceTax236C, numbers)} /></span>
              </div>
              <div className="kpi">
                <span className="k">Capital Gains Tax</span>
                <span className="v"><FigText str={M.fmt(fySummary.cgt, numbers)} /></span>
              </div>
              <div className="kpi">
                <span className="k">Withholding tax (from sales)</span>
                <span className="v"><FigText str={M.fmt(fySummary.withholdingTax, numbers)} /></span>
              </div>
              <div className="kpi">
                <span className="k">Total tax (FY)</span>
                <span className="v"><FigText str={M.fmt(fySummary.totalTax, numbers)} /></span>
              </div>
              <div className="kpi">
                <span className="k">Paid (FY)</span>
                <span className="v"><FigText str={M.fmt(fySummary.totalPaid, numbers)} /></span>
              </div>
              <div className="kpi">
                <span className="k">Tax pending (FY)</span>
                <span className="v" style={{ color: fySummary.totalPending > 0 ? 'var(--bad)' : 'inherit' }}><FigText str={M.fmt(fySummary.totalPending, numbers)} /></span>
              </div>
            </div>
          </div>
        </div>

        <div className="note" style={{ marginBottom: '14px' }} data-noprint="1">
          <span className="ic">
            <Icon name="info" />
          </span>
          <div>
            <b>Two kinds of tax, never added together.</b> Withholding tax on a sale is already deducted
            inside that sale's net revenue. Only advance and corporate income tax is subtracted again in the
            profit bridge. The fiscal year closes in <b>June</b> — all tracking below follows July→June.
          </div>
        </div>
        <DataTable cols={cols} rows={rows} totals={true} attach="taxes" />
      </PageShell>
    );
  }

  if (tab === 'zakat') {
    const zs = M.refreshZakatSummary();
    const rows = M.DATA.zakat.filter((z: any) => M.inRange(z.date, r));

    const summaryPairs: [string, string][] = [
      ['Eligible assets', M.fmt(zs.eligibleAssets, numbers)],
      ['Zakatable amount', M.fmt(zs.zakatable, numbers)],
      ['Rate', `${zs.rate}%`],
      ['Calculated', M.fmt(zs.calculated, numbers)],
      ['Paid', M.fmt(zs.paid, numbers)],
      ['Remaining', M.fmt(zs.remaining, numbers)],
    ];

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'period', label: 'Period' },
      { key: 'eligibleAssets', label: 'Eligible assets', a: 'r' as const, sum: false, cls: 'mono', render: (z: any) => M.fmt(z.eligibleAssets, numbers) },
      { key: 'zakatable', label: 'Zakatable', a: 'r' as const, sum: false, cls: 'mono', render: (z: any) => M.fmt(z.zakatable, numbers) },
      { key: 'rate', label: 'Rate', a: 'r' as const, cls: 'mono', render: (z: any) => `${z.rate}%` },
      { key: 'calculated', label: 'Calculated', a: 'r' as const, sum: false, cls: 'mono', render: (z: any) => M.fmt(z.calculated, numbers) },
      { key: 'amount', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (z: any) => M.fmt(z.amount, numbers) },
      { key: 'date', label: 'Payment date', cls: 'mono', render: (z: any) => M.fmtDate(z.date) },
      { key: 'ref', label: 'Reference' },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} acts={
          <button type="button" className="btn pri" onClick={() => openModal('zakat')}>
            <Icon name="plus" /> Record Zakat
          </button>
        }>
        <SummaryKpis pairs={summaryPairs} />
        <div className="note" style={{ marginBottom: '14px' }}>
          <span className="ic">
            <Icon name="warn" />
          </span>
          <div>
            <b>Confirm the zakatable base with your accountant.</b> Stock held for resale is generally
            zakatable; property held for rental income generally is not. Zakat is reported separately from
            operating expenses.
          </div>
        </div>
        <DataTable cols={cols} rows={rows} totals={true} attach="zakat" />
      </PageShell>
    );
  }

  if (tab === 'charity') {
    const rows = M.charityRows(r);
    const fromSheets = rows.filter((x: any) => x.source === 'Deal cost sheet');

    const summaryPairs: [string, string][] = [
      ['Entries', M.fmtNum(rows.length)],
      ['Total charity', M.fmt(rows.reduce((a: number, x: any) => a + x.amount, 0), numbers)],
      ['From deal cost sheets', M.fmt(fromSheets.reduce((a: number, x: any) => a + x.amount, 0), numbers)],
      ['From expense ledger', M.fmt(rows.reduce((a: number, x: any) => a + x.amount, 0) - fromSheets.reduce((a: number, x: any) => a + x.amount, 0), numbers)],
    ];

    const cols = [
      { key: 'id', label: 'Reference' },
      { key: 'source', label: 'Source' },
      { key: 'detail', label: 'Detail' },
      { key: 'party', label: 'Given to / project' },
      { key: 'date', label: 'Date', cls: 'mono', render: (x: any) => M.fmtDate(x.date) },
      { key: 'amount', label: 'Amount', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => M.fmt(x.amount, numbers) },
    ];

    return (
      <PageShell
        title={meta.t}
        u={meta.u}
        p={meta.p}
        acts={
          <button
            type="button"
            className="btn pri"
            onClick={() => openModal('expense', { group: 'Other Expenses', category: 'Charity' })}
          >
            <Icon name="plus" /> Add charity
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  // Expenses tab (default)
  const rows = M.DATA.expenses.filter((e: any) => M.inRange(e.date, r) && (f.office === 'all' || e.office === f.office));

  const summaryPairs: [string, string][] = [
    ['Entries', M.fmtNum(rows.length)],
    ['Total', M.fmt(rows.reduce((a: number, e: any) => a + e.amount, 0), numbers)],
    ['Paid', M.fmt(rows.reduce((a: number, e: any) => a + e.paid, 0), numbers)],
    ['Unpaid', M.fmt(rows.reduce((a: number, e: any) => a + e.outstanding, 0), numbers)],
  ];

  const cols = [
    { key: 'id', label: 'ID' },
    { key: 'group', label: 'Category' },
    { key: 'category', label: 'Sub-category' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'office', label: 'Office' },
    { key: 'date', label: 'Date', cls: 'mono', render: (e: any) => M.fmtDate(e.date) },
    { key: 'amount', label: 'Amount', a: 'r' as const, sum: true, cls: 'mono', render: (e: any) => M.fmt(e.amount, numbers) },
    { key: 'paid', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (e: any) => M.fmt(e.paid, numbers) },
    { key: 'outstanding', label: 'Outstanding', a: 'r' as const, sum: true, cls: 'mono', render: (e: any) => M.fmt(e.outstanding, numbers) },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status', render: (e: any) => <Tag text={e.status} /> },
    {
      key: 'pay',
      label: '',
      render: (x: any) =>
        x.outstanding > 0 ? (
          <button
            type="button"
            className="btn sm"
            onClick={() => openModal('payment', { settle: 'exp:' + x.id })}
            title="Record a payment against this balance"
          >
            Pay
          </button>
        ) : null,
    },
  ];

  return (
    <PageShell
      title={meta.t}
      u={meta.u}
      p={meta.p}
      acts={
        <button type="button" className="btn pri" onClick={() => openModal('expense')}>
          <Icon name="plus" /> Add expense
        </button>
      }
    >
      <SummaryKpis pairs={summaryPairs} />
      <DataTable cols={cols} rows={rows} totals={true} attach="expenses" />
    </PageShell>
  );
}
