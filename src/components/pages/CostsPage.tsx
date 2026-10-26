'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag, FigText } from '../Shared';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function CostsPage() {
  const { tab, effectiveFilters: f, range: r, openModal, openCostSheet, numbers } = useApp();

  const meta = PAGE_META[`costs/${tab}`] || { t: 'Costs' };
  // Expenses: the company's own, or the costs picked for a plot (part of that plot's cost sheet).
  const [expView, setExpView] = React.useState<'company' | 'plots'>('company');

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
    // The plot's sale date beside each entry, when the plot has been sold.
    const saleDateOf = (propertyId: string | null) => {
      const s = propertyId ? M.DATA.sales.find((x: any) => x.propertyId === propertyId) : null;
      return s ? s.date : null;
    };
    // Every list and card follows the filters and the period.
    const rows = M.DATA.taxes
      .filter((t: any) => M.inRange(t.date, r) && M.taxMatch(t, f))
      .map((t: any) => ({ ...t, saleDate: saleDateOf(t.propertyId) }));
    const fySummary = M.fiscalYearTaxSummary(f, r);
    // Withholding tax taken on the period's sales that is not also a tax entry: part of the tax total.
    const saleTax = M.salesUnder(f)
      .filter((s: any) => M.inRange(s.date, r))
      .reduce((a: number, s: any) => a + M.saleTaxCounted(s), 0);
    // Tax deal by deal: due on the cost sheet against what has actually been paid, for the plots
    // under the filters that were bought or sold in the period.
    const plots = new Set(M.DATA.properties.filter((p: any) => M.propMatch(p, f)).map((p: any) => p.id));
    const deals = M.dealTaxes().filter(
      (x: any) =>
        plots.has(x.propertyId) &&
        (f.agent === 'all' || M.DATA.sales.some((s: any) => s.propertyId === x.propertyId && s.agentId === f.agent)) &&
        (M.inRange(x.purchaseDate, r) || M.inRange(x.saleDate, r))
    );
    const dsum = (key: string) => deals.reduce((a: number, x: any) => a + (x[key] || 0), 0);
    const dealCols = [
      { key: 'property', label: 'Property' },
      { key: 'status', label: 'Deal', render: (x: any) => <Tag text={x.status === 'Sold' ? 'Sold' : 'Held'} /> },
      { key: 'purchaseDate', label: 'Purchase date', cls: 'mono', render: (x: any) => (x.purchaseDate ? M.fmtDate(x.purchaseDate) : '—') },
      { key: 'saleDate', label: 'Sale date', cls: 'mono', render: (x: any) => (x.saleDate ? M.fmtDate(x.saleDate) : '—') },
      { key: 'stampCvt', label: 'Stamp duty & CVT', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => M.fmt(x.stampCvt, numbers) },
      { key: 'tax236K', label: '§236K', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => M.fmt(x.tax236K, numbers) },
      { key: 'tax236C', label: '§236C', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => M.fmt(x.tax236C, numbers) },
      { key: 'cgt', label: 'CGT', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => M.fmt(x.cgt, numbers) },
      { key: 'due', label: 'Tax due', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => <b>{M.fmt(x.due, numbers)}</b> },
      { key: 'paid', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => <span className="pos">{M.fmt(x.paid, numbers)}</span> },
      {
        key: 'remaining',
        label: 'Remaining',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (x: any) => <b className={x.remaining > 0 ? 'neg' : ''}>{M.fmt(x.remaining, numbers)}</b>,
      },
      {
        key: 'act',
        label: '',
        render: (x: any) => (
          <span className="rowacts">
            {x.missing.length > 0 && (
              <button
                type="button"
                className="btn sm pri"
                onClick={() => openModal('tax', { type: x.missing[0].type, propertyId: x.propertyId, amount: String(x.missing[0].amount) })}
                title={
                  'Only on the cost sheet: ' +
                  x.missing.map((m: any) => `${m.label} ${M.fmt(m.amount, 'full')}`).join(', ') +
                  '. Enter each as a tax entry, with anything already paid.'
                }
              >
                <Icon name="plus" size={12} /> Enter {x.missing[0].label}
              </button>
            )}
            <button type="button" className="btn sm" onClick={() => openCostSheet(x.propertyId)} title="Open the deal's cost sheet">
              <Icon name="calculator" size={12} /> Cost sheet
            </button>
          </span>
        ),
      },
    ];

    const summaryPairs: [string, string][] = [
      ['Entries', M.fmtNum(rows.length)],
      ['Total tax', M.fmt(rows.reduce((a: number, t: any) => a + t.amount, 0) + saleTax, numbers)],
      ['Paid', M.fmt(rows.reduce((a: number, t: any) => a + t.paid, 0) + saleTax, numbers)],
      ['Outstanding', M.fmt(rows.reduce((a: number, t: any) => a + t.outstanding, 0), numbers)],
      ['Due in 30 days', M.fmt(k.taxDueSoon, numbers)],
    ];

    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'type', label: 'Tax type' },
      { key: 'ref', label: 'Reference' },
      { key: 'property', label: 'Property' },
      { key: 'saleDate', label: 'Sale date', cls: 'mono', render: (t: any) => (t.saleDate ? M.fmtDate(t.saleDate) : '—') },
      { key: 'authority', label: 'Authority' },
      { key: 'amount', label: 'Amount', a: 'r' as const, sum: true, cls: 'mono', render: (t: any) => M.fmt(t.amount, numbers) },
      { key: 'paid', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (t: any) => M.fmt(t.paid, numbers) },
      { key: 'outstanding', label: 'Outstanding', a: 'r' as const, sum: true, cls: 'mono', render: (t: any) => M.fmt(t.outstanding, numbers) },
      { key: 'dueDate', label: 'Paid date', cls: 'mono', render: (t: any) => M.fmtDate(t.dueDate) },
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

        {deals.length > 0 && (
          <div className="panel" style={{ marginBottom: '14px' }}>
            <div className="panel-h">
              <h3>Tax on each deal</h3>
              <span className="sub">due on its cost sheet, against what has been paid · deals bought or sold in {r.label}</span>
            </div>
            <div className="panel-b tight">
              <div className="kpis">
                <div className="kpi">
                  <span className="k">Tax due on deals</span>
                  <span className="v"><FigText str={M.fmt(dsum('due'), numbers)} /></span>
                </div>
                <div className="kpi">
                  <span className="k">Paid</span>
                  <span className="v pos"><FigText str={M.fmt(dsum('paid'), numbers)} /></span>
                </div>
                <div className="kpi">
                  <span className="k">Remaining to pay</span>
                  <span className="v" style={{ color: dsum('remaining') > 0 ? 'var(--bad)' : 'inherit' }}><FigText str={M.fmt(dsum('remaining'), numbers)} /></span>
                </div>
                <div className="kpi">
                  <span className="k">Only on cost sheets</span>
                  <span className="v"><FigText str={M.fmt(dsum('notRecorded'), numbers)} /></span>
                </div>
              </div>
              <p className="muted" style={{ margin: '0 0 8px', fontSize: '12.5px' }}>
                “Only on cost sheets” is tax typed on a sheet but never entered here, so no payment or payable knows about it.
                Withholding tax taken on a sale counts as paid.
              </p>
              <DataTable cols={dealCols} rows={deals} totals={true} />
            </div>
          </div>
        )}

        {/* Fiscal Year Tax Summary Panel */}
        <div className="panel" style={{ marginBottom: '14px' }}>
          <div className="panel-h">
            <h3>{fySummary.fyLabel} — Tax summary</h3>
            <span className="sub">
              {M.fmtDate(fySummary.fyStart)} – {M.fmtDate(fySummary.fyEnd)} · the financial year {r.label} falls in. Pakistan&apos;s financial year runs July to June.
            </span>
          </div>
          <div className="panel-b">
            <div className="kpis">
              <div className="kpi">
                <span className="k">Stamp duty &amp; CVT</span>
                <span className="v"><FigText str={M.fmt(fySummary.stampCvt, numbers)} /></span>
              </div>
              <div className="kpi">
                <span className="k">Advance Tax §236K (buy)</span>
                <span className="v"><FigText str={M.fmt(fySummary.advanceTax236K, numbers)} /></span>
              </div>
              <div className="kpi">
                <span className="k">Advance Tax §236C (sell)</span>
                <span className="v"><FigText str={M.fmt(fySummary.advanceTax236C, numbers)} /></span>
                {fySummary.withholdingTax > 0 && (
                  <span className="f">incl. {M.fmt(fySummary.withholdingTax, numbers)} taken on sales</span>
                )}
              </div>
              <div className="kpi">
                <span className="k">Capital Gains Tax</span>
                <span className="v"><FigText str={M.fmt(fySummary.cgt, numbers)} /></span>
              </div>
              {fySummary.otherTax > 0 && (
                <div className="kpi">
                  <span className="k">Other tax</span>
                  <span className="v"><FigText str={M.fmt(fySummary.otherTax, numbers)} /></span>
                </div>
              )}
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
            <b>Each tax is counted once.</b> Total tax adds up every tax entry below, plus the withholding tax taken
            on a sale whose plot has no §236C entry of its own (that tax is paid at the sale). Once a plot has its own
            §236C entry, the entry is counted instead of the figure on the sale. The financial year closes in <b>June</b> —
            the summary above is the July→June year the selected period falls in; pick <b>This fiscal year</b> or{' '}
            <b>Last fiscal year</b> as the period to see a whole year. Every list and card follows the filters.
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
      { key: 'property', label: 'Deal', render: (z: any) => z.property || '—' },
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
  // Assets are bought to keep, not spent: they are listed under Finance → Assets instead.
  // A cost picked for a plot belongs to that plot: it is on its cost sheet and counts in profit
  // when the plot is sold, so it is kept apart from the company's own expenses.
  const plotIds = new Set(M.DATA.properties.map((p: any) => p.id));
  const ofPlot = (e: any) => !!e.propertyId && plotIds.has(e.propertyId) && e.group !== 'Personal Expenses';
  const all = M.DATA.expenses.filter(
    (e: any) => e.group !== 'Assets' && M.inRange(e.date, r) && (f.office === 'all' || e.office === f.office)
  );
  const plotRows = all.filter(ofPlot);
  const rows = expView === 'plots' ? plotRows : all.filter((e: any) => !ofPlot(e));
  const sumOf = (pred: (e: any) => boolean) => rows.filter(pred).reduce((a: number, e: any) => a + e.amount, 0);
  const plotsCount = new Set(plotRows.map((e: any) => e.propertyId)).size;

  const summaryPairs: [string, string][] =
    expView === 'plots'
      ? [
          ['Entries', M.fmtNum(rows.length)],
          ['Plots', M.fmtNum(plotsCount)],
          ['Plot costs', M.fmt(sumOf(() => true), numbers)],
          ['Paid', M.fmt(rows.reduce((a: number, e: any) => a + e.paid, 0), numbers)],
          ['Unpaid', M.fmt(rows.reduce((a: number, e: any) => a + e.outstanding, 0), numbers)],
        ]
      : [
          ['Entries', M.fmtNum(rows.length)],
          ['Business expenses', M.fmt(sumOf((e) => e.group !== 'Personal Expenses'), numbers)],
          ['Personal expenses', M.fmt(sumOf((e) => e.group === 'Personal Expenses'), numbers)],
          ['Paid', M.fmt(rows.reduce((a: number, e: any) => a + e.paid, 0), numbers)],
          ['Unpaid', M.fmt(rows.reduce((a: number, e: any) => a + e.outstanding, 0), numbers)],
        ];

  const cols = [
    { key: 'id', label: 'ID' },
    { key: 'group', label: 'Category' },
    { key: 'category', label: 'Sub-category' },
    {
      key: 'property',
      label: 'Deal',
      render: (e: any) =>
        e.propertyId ? (
          <button type="button" className="linkbtn" onClick={() => openCostSheet(e.propertyId)} title="Open this deal’s cost sheet">
            {e.property || e.propertyId}
          </button>
        ) : (
          '—'
        ),
    },
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
      <div className="exp-switch" data-noprint="1">
        <span className="seg" role="group" aria-label="Which expenses">
          <button type="button" aria-pressed={expView === 'company'} onClick={() => setExpView('company')}>
            Company expenses
          </button>
          <button type="button" aria-pressed={expView === 'plots'} onClick={() => setExpView('plots')}>
            Plot costs ({M.fmtNum(plotRows.length)})
          </button>
        </span>
        <span className="muted">
          {expView === 'plots'
            ? 'Costs picked for a plot. Each is on that plot’s cost sheet and counts in profit when the plot is sold.'
            : 'Office, salaries, marketing and other costs not picked for any plot. A plot’s own costs are under Plot costs and on its cost sheet.'}
        </span>
      </div>
      <SummaryKpis pairs={summaryPairs} />
      <DataTable cols={cols} rows={rows} totals={true} attach="expenses" />
    </PageShell>
  );
}
