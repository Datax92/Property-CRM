'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, KpiCard } from '../Shared';
import { ChartWaterfall, ChartBarGroups, RankedList } from '../Charts';
import { InvestmentKpis, InvestmentCharts, Kind, GainPill } from '../Investments';
import { Icon } from '../Icons';
import { PAGE_META, SC } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function FinancePage() {
  // The financial year picked on net margin tracking (its first year, e.g. 2025 for FY 2025-26).
  const [fyYear, setFyYear] = useState<number | null>(null);
  const {
    tab,
    effectiveFilters: f,
    range: r,
    grossBasis,
    setGrossBasis,
    period,
    setPeriod,
    openModal,
    openEdit,
    numbers,
    exportCsv,
    print,
    openCostSheet,
    goto,
  } = useApp();

  const meta = PAGE_META[`finance/${tab}`] || { t: 'Finance' };

  if (tab === 'profit') {
    // Tracked by financial year (July to June): a year's months, or year against year.
    const years: number[] = M.fiscalYears();
    const fy = years.indexOf(fyYear as number) >= 0 ? (fyYear as number) : years[0];
    const line = (label: string, full: string, k: any) => {
      const bv = M.basisView(k, grossBasis);
      return {
        label,
        full,
        purchase: k.purchaseCost,
        sales: k.totalRevenue,
        gross: bv.gross,
        commission: k.commission,
        expenses: k.totalExpenses,
        net: bv.net,
        margin: M.pctOf(bv.net, k.totalRevenue),
      };
    };
    const rows =
      period === 'weekly'
        ? M.weeklySeries(12, f).map((w: any) => line(w.label, w.full, w.k))
        : period === 'yearly'
        ? years
            .slice()
            .reverse()
            .map((y: number) => line(M.fyLabel(y), M.fyLabel(y) + ' (July to June)', M.computeKPIs(M.fyRange(y), f)))
        : M.fyMonthlySeries(fy, f).map((m: any) => line(m.label, m.full, m.k));
    const fyLine = line(M.fyLabel(fy), M.fyLabel(fy), M.computeKPIs(M.fyRange(fy), f));
    const pctCell = (n: number) => (isFinite(n) ? `${n.toFixed(1)}%` : '—');

    const cols = [
      { key: 'full', label: 'Period' },
      { key: 'purchase', label: 'Purchase cost', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.purchase, numbers) },
      { key: 'sales', label: 'Revenue', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.sales, numbers) },
      {
        key: 'gross',
        label: 'Gross profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span className={p.gross > 0 ? 'pos' : p.gross < 0 ? 'neg' : ''}>{M.fmt(p.gross, numbers)}</span>,
      },
      { key: 'commission', label: 'Commission', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.commission, numbers) },
      { key: 'expenses', label: 'Expenses', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.expenses, numbers) },
      {
        key: 'net',
        label: 'Net profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span className={p.net > 0 ? 'pos' : p.net < 0 ? 'neg' : ''}>{M.fmt(p.net, numbers)}</span>,
      },
      {
        key: 'margin',
        label: 'Net margin %',
        a: 'r' as const,
        cls: 'mono',
        render: (p: any) => <b className={p.margin > 0 ? 'pos' : p.margin < 0 ? 'neg' : ''}>{pctCell(p.margin)}</b>,
      },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} tools={false}>
        <div className="toolrow" data-noprint="1">
          <span className="seg">
            {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
              >
                {p === 'monthly' ? 'Monthly' : p === 'yearly' ? 'Year on year' : 'Weekly'}
              </button>
            ))}
          </span>
          <label className="vs" htmlFor="fy-pick">
            Financial year
          </label>
          <select id="fy-pick" className="fldsel" value={fy} onChange={(e) => setFyYear(+e.target.value)} title="July to June">
            {years.map((y: number) => (
              <option key={y} value={y}>
                {M.fyLabel(y)} (Jul {y} – Jun {y + 1})
              </option>
            ))}
          </select>
          <span className="spacer" />
          <button type="button" className="btn" onClick={exportCsv}>
            <Icon name="down" /> CSV
          </button>
          <button type="button" className="btn" onClick={print}>
            <Icon name="print" /> PDF
          </button>
        </div>

        <div className="kpis">
          <KpiCard k={`Revenue · ${fyLine.label}`} v={fyLine.sales} />
          <KpiCard k="Gross profit" v={fyLine.gross} tone={fyLine.gross >= 0 ? 'pos' : 'neg'} />
          <KpiCard k="Expenses" v={fyLine.expenses} />
          <KpiCard k="Net profit" v={fyLine.net} tone={fyLine.net >= 0 ? 'pos' : 'neg'} cls="lead" />
          <KpiCard k="Net margin %" raw={pctCell(fyLine.margin)} tone={fyLine.margin >= 0 ? 'pos' : 'neg'} f="net profit as a share of revenue" />
        </div>
        <div className="panel" style={{ marginBottom: '14px' }}>
          <div className="panel-h">
            <h3>Revenue, expenses and net profit</h3>
            <span className="sub">
              {period === 'yearly' ? 'each financial year' : period === 'weekly' ? 'the last 12 weeks' : `${M.fyLabel(fy)}, month by month`}
            </span>
          </div>
          <div className="panel-b">
            <ChartBarGroups
              width={1180}
              // Grid lines every 5 Lakh, and each bar's amount on it, so the small months can be read.
              step={500000}
              values
              label="Revenue, expenses and net profit by period"
              rows={rows}
              series={[
                { key: 'sales', label: 'Revenue', c: 'var(--s1)' },
                { key: 'expenses', label: 'Expenses', c: 'var(--s2)' },
                { key: 'net', label: 'Net profit', c: 'var(--s3)' },
              ]}
            />
          </div>
        </div>

        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  if (tab === 'cashflow') {
    const cl = M.cashLedger(r, f);
    const rows = M.livePayments()
      .filter((p: any) => M.inRange(p.date, r) && (f.office === 'all' || p.office === f.office))
      .map((p: any) => ({
        ...p,
        inAmt: p.dir === 'in' ? p.amount : 0,
        outAmt: p.dir === 'out' ? p.amount : 0,
      }));

    const summaryPairs: [string, string][] = [
      ['Opening balance', M.fmt(cl.opening, numbers)],
      ['Cash in', M.fmt(cl.cashIn, numbers)],
      ['Cash out', M.fmt(cl.cashOut, numbers)],
      ['Net cash flow', M.fmt(cl.net, numbers)],
      ['Closing balance', M.fmt(cl.closing, numbers)],
    ];

    const cols = [
      { key: 'id', label: 'Txn ID' },
      { key: 'date', label: 'Date', cls: 'mono', render: (p: any) => M.fmtDate(p.date) },
      { key: 'category', label: 'Category' },
      { key: 'party', label: 'Party' },
      {
        key: 'inAmt',
        label: 'Cash in',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span className={p.inAmt > 0 ? 'pos' : ''}>{M.fmt(p.inAmt, numbers)}</span>,
      },
      { key: 'outAmt', label: 'Cash out', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.outAmt, numbers) },
      { key: 'method', label: 'Method' },
      { key: 'account', label: 'Account' },
    ];

    // What each bank and cash account holds at the end of the period.
    const split = M.cashAndBank(r.end, f);
    const balances = split.accounts;
    const balanceCols = [
      { key: 'account', label: 'Account', render: (b: any) => <b>{b.account}</b> },
      { key: 'kind', label: 'Kind', render: (b: any) => (b.kind === 'Cash' ? 'Cash in hand' : 'Bank') },
      { key: 'opening', label: 'Opening balance', a: 'r' as const, sum: true, cls: 'mono', render: (b: any) => M.fmt(b.opening, numbers) },
      { key: 'cashIn', label: 'Received into it', a: 'r' as const, sum: true, cls: 'mono', render: (b: any) => M.fmt(b.cashIn, numbers) },
      { key: 'cashOut', label: 'Paid from it', a: 'r' as const, sum: true, cls: 'mono', render: (b: any) => M.fmt(b.cashOut, numbers) },
      {
        key: 'balance',
        label: 'Balance',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (b: any) => <b className={b.balance < 0 ? 'neg' : 'pos'}>{M.fmt(b.balance, numbers)}</b>,
      },
      { key: 'last', label: 'Last used', cls: 'mono', render: (b: any) => M.fmtDate(b.last) },
    ];

    return (
      <PageShell
        title={meta.t}
        u={meta.u}
        p={meta.p}
        acts={
          <button type="button" className="btn pri" onClick={() => openModal('payment')}>
            <Icon name="plus" /> Record payment
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <div className="panel" style={{ marginBottom: '14px' }}>
          <div className="panel-h">
            <h3>Cash &amp; bank balances</h3>
            <span className="sub">
              on {M.fmtDate(r.end)} · cash in hand {M.fmt(split.cash, numbers)} · in bank {M.fmt(split.bank, numbers)}
            </span>
            <span className="spacer" />
            <button type="button" className="btn sm" data-noprint="1" onClick={() => goto('bank/accounts')}>
              <Icon name="bank" size={12} /> Bank &amp; Cash
            </button>
            <button type="button" className="btn sm" data-noprint="1" onClick={() => openModal('payment', { dir: 'in', category: 'Opening Balance' })}>
              <Icon name="plus" size={12} /> Opening balance
            </button>
            <button type="button" className="btn sm" data-noprint="1" onClick={() => openModal('payment', { dir: 'in', category: 'Owner Capital' })}>
              <Icon name="plus" size={12} /> Owner capital
            </button>
          </div>
          <div className="panel-b tight">
            {balances.some((b: any) => b.balance < 0) && (
              <p className="muted" style={{ margin: '0 0 8px', fontSize: '12.5px' }}>
                An account below zero has paid out money that was never shown coming in. Enter what it held to begin with as an
                <b> opening balance</b>, and money the owner put in as <b>owner capital</b>.
              </p>
            )}
            <DataTable cols={balanceCols} rows={balances} totals={true} />
          </div>
        </div>
        <div className="grid c2" style={{ marginBottom: '14px' }}>
          <div className="panel">
            <div className="panel-h">
              <h3>Where cash came from</h3>
            </div>
            <div className="panel-b tight">
              <RankedList
                items={cl.inflows.map((x: any, i: number) => ({
                  k: x[0],
                  v: x[1],
                  c: SC[i % 6],
                }))}
                total={cl.cashIn}
              />
            </div>
          </div>
          <div className="panel">
            <div className="panel-h">
              <h3>Where cash went</h3>
            </div>
            <div className="panel-b tight">
              <RankedList
                items={cl.outflows.map((x: any, i: number) => ({
                  k: x[0],
                  v: x[1],
                  c: SC[i % 6],
                }))}
                total={cl.cashOut}
              />
            </div>
          </div>
        </div>
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  if (tab === 'payables') {
    const k = M.computeKPIs(r, f);
    const rows = k.payableBreakdown
      .filter((x: any) => x[1] > 0)
      .map(([label, v]: any) => ({ id: label, label, v }));

    const summaryPairs: [string, string][] = [
      ['Total payable', M.fmt(k.payable, numbers)],
      ...rows.map((x: any) => [x.label, M.fmt(x.v, numbers)] as [string, string]),
    ];

    const cols = [
      { key: 'label', label: 'Owed to' },
      { key: 'v', label: 'Amount', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.v, numbers) },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} toolProps={{ search: false }}>
        <SummaryKpis pairs={summaryPairs} />
        <div className="panel" style={{ marginBottom: '14px' }}>
          <div className="panel-b">
            <RankedList
              items={rows.map((x: any, i: number) => ({
                k: x.label,
                v: x.v,
                c: SC[i % 6],
              }))}
              total={k.payable}
            />
          </div>
        </div>
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  if (tab === 'investments') {
    // Every holding, however long ago it was bought: unsold plots and assets.
    const rows = M.investments(f);
    const cols = [
      { key: 'name', label: 'Holding', render: (x: any) => <b>{x.name}</b> },
      { key: 'type', label: 'Kind', render: (x: any) => <Kind type={x.type} /> },
      { key: 'detail', label: 'Detail' },
      { key: 'started', label: 'Started on', cls: 'mono', render: (x: any) => M.fmtDate(x.started) },
      { key: 'invested', label: 'Invested', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => M.fmt(x.invested, numbers) },
      { key: 'worth', label: 'Worth today', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => <b>{M.fmt(x.worth, numbers)}</b> },
      {
        key: 'gain',
        label: 'Profit / loss',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (x: any) => <span className={x.gain > 0 ? 'pos' : x.gain < 0 ? 'neg' : ''}>{M.fmt(x.gain, numbers)}</span>,
      },
      { key: 'gainPct', label: '%', a: 'r' as const, render: (x: any) => <GainPill pct={x.gainPct} /> },
      {
        key: 'act',
        label: '',
        render: (x: any) => (
          <button
            type="button"
            className="btn sm"
            onClick={() => openEdit(x.coll, x.id)}
            title={x.coll === 'properties' ? 'Change the plot’s current market value' : 'Change what this asset is worth today'}
          >
            Update value
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
          <>
            <button type="button" className="btn" onClick={() => openModal('property')}>
              <Icon name="plus" /> Add plot
            </button>
            <button type="button" className="btn pri" onClick={() => openModal('asset')}>
              <Icon name="plus" /> Add asset
            </button>
          </>
        }
      >
        <InvestmentKpis rows={rows} />
        <InvestmentCharts rows={rows} />
        <div style={{ marginTop: '16px' }}>
          <DataTable cols={cols} rows={rows} totals={true} />
        </div>
      </PageShell>
    );
  }

  if (tab === 'assets') {
    // An asset stays an asset however long ago it was bought, so the register is not limited to the period.
    const rows = M.DATA.expenses
      .filter((e: any) => e.group === 'Assets' && (f.office === 'all' || e.office === f.office))
      .map((e: any) => {
        const worth = M.assetWorth(e);
        return { ...e, worth, gain: worth - e.amount, gainPct: M.pctOf(worth - e.amount, e.amount) };
      });
    const inPeriod = rows.filter((e: any) => M.inRange(e.date, r));
    const summaryPairs: [string, string][] = [
      ['Assets held', M.fmtNum(rows.length)],
      ['At cost', M.fmt(rows.reduce((a: number, e: any) => a + e.amount, 0), numbers)],
      ['Worth today', M.fmt(rows.reduce((a: number, e: any) => a + e.worth, 0), numbers)],
      ['Profit / loss', M.fmt(rows.reduce((a: number, e: any) => a + e.gain, 0), numbers)],
      [`Bought in ${r.label}`, M.fmt(inPeriod.reduce((a: number, e: any) => a + e.amount, 0), numbers)],
      ['Still owed to vendors', M.fmt(rows.reduce((a: number, e: any) => a + e.outstanding, 0), numbers)],
    ];
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'category', label: 'Asset type' },
      { key: 'note', label: 'Description' },
      { key: 'vendor', label: 'Bought from' },
      { key: 'office', label: 'Office' },
      { key: 'date', label: 'Date bought', cls: 'mono', render: (e: any) => M.fmtDate(e.date) },
      { key: 'amount', label: 'Cost', a: 'r' as const, sum: true, cls: 'mono', render: (e: any) => M.fmt(e.amount, numbers) },
      {
        key: 'worth',
        label: 'Worth today',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (e: any) => (
          <span title={e.valueDate ? `Valued on ${M.fmtDate(e.valueDate)}` : 'No value entered yet: shown at cost'}>
            <b>{M.fmt(e.worth, numbers)}</b>
          </span>
        ),
      },
      {
        key: 'gain',
        label: 'Profit / loss',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (e: any) => <span className={e.gain > 0 ? 'pos' : e.gain < 0 ? 'neg' : ''}>{M.fmt(e.gain, numbers)}</span>,
      },
      { key: 'gainPct', label: '%', a: 'r' as const, render: (e: any) => <GainPill pct={e.gainPct} /> },
      { key: 'paid', label: 'Paid', a: 'r' as const, sum: true, cls: 'mono', render: (e: any) => M.fmt(e.paid, numbers) },
      { key: 'outstanding', label: 'Owed', a: 'r' as const, sum: true, cls: 'mono', render: (e: any) => M.fmt(e.outstanding, numbers) },
    ];
    return (
      <PageShell
        title={meta.t}
        u={meta.u}
        p={meta.p}
        toolProps={{ period: false }}
        acts={
          <button type="button" className="btn pri" onClick={() => openModal('asset')}>
            <Icon name="plus" /> Add asset
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <div className="note calm" style={{ marginBottom: '14px' }}>
          <span className="ic">
            <Icon name="info" />
          </span>
          <div>
            Buying an asset moves cash into something the company owns, so it shows on the cash flow but is{' '}
            <b>not an expense</b> and does not reduce profit. Keep <b>worth today</b> up to date (Edit) and its gain or
            loss shows here, in investment tracking and on the dashboard.
          </div>
        </div>
        <DataTable cols={cols} rows={rows} totals={true} attach="expenses" />
      </PageShell>
    );
  }

  // P&L tab (default)
  const k = M.computeKPIs(r, f);
  const bv = M.basisView(k, grossBasis);

  const L = (label: string, v: number | null, kind?: string) => ({ label, v, kind });
  const pnlRows = [
    L('REVENUE', null, 'h'),
    L('Property sales', k.salesRevenue),
    L('Other revenue', k.otherIncome),
    L('Total revenue', k.totalRevenue, 't'),
    L('COST OF PROPERTIES SOLD — AS ON THEIR COST SHEETS', null, 'h'),
    bv.doc
      ? L('Purchase price of plots bought in the period', -k.purchasePrice)
      : L('Purchase price (net buy cost)', -k.deal.buyPrice),
    L('Society / govt transfer cost (incl. stamp duty & CVT)', -k.deal.transfer),
    L('§236K advance tax on purchase', -k.deal.buyTax),
    L('Handling & expenses', -k.deal.handling),
    L('Agent fee — buy side', -k.deal.buyAgent),
    L('Purchase price (landed cost)', -bv.cost, 't'),
    L('SELLING COSTS', null, 'h'),
    L('§236C advance tax on sale', -k.saleTaxes),
    L('Agent fee — sell side', -k.deal.sellAgent),
    L('Other selling expenses', -k.sellingCosts),
    L('Gross profit', bv.gross, 't'),
    ...(k.scoped
      ? [
          L('DEDUCTIONS FROM PROFIT', null, 'h'),
          L('Capital gains tax (CGT)', -k.tax),
          L('Zakat', -k.zakat),
          L('Charity', -k.charity),
          L('NET MARGIN', bv.net, 'g'),
        ]
      : [
          L('COMPANY EXPENSES — NOT PICKED FOR ANY PLOT', null, 'h'),
          L('Salaries', -k.salaries),
          L('Office expenses', -k.officeExp),
          L('Marketing', -k.marketing),
          L('Bills', -k.bills),
          L('Property expenses', -k.propertyExp),
          L('Employee expenses', -k.employeeExp),
          L('Other expenses', -k.other),
          ...(k.customGroups || []).filter((x: any) => x[1]).map((x: any) => L(x[0], -x[1])),
          L('Operating profit', bv.op, 't'),
          L('DEDUCTIONS FROM PROFIT', null, 'h'),
          L('Capital gains tax (CGT)', -k.deal.cgt),
          L('Other tax not picked for a plot', -k.overheadTax),
          L('Zakat', -k.zakat),
          L('Charity', -k.charity),
          L('NET PROFIT', bv.net, 'g'),
          // The owner's personal spending is drawn out of profit, not a cost of earning it.
          ...(k.personal > 0
            ? [
                L('BELOW THE PROFIT LINE', null, 'h'),
                L('Personal expenses (owner drawings)', -k.personal),
                L('Left in the business', bv.net - k.personal, 't'),
              ]
            : []),
        ]),
  ];

  const wf = [
    { k: 'Revenue', v: k.totalRevenue, total: true, why: k.otherIncome ? 'Property sales and other income' : undefined },
    { k: 'Landed cost', v: -bv.cost, why: 'Price, transfer costs, stamp duty, CVT, §236K, handling and buy-side agent fee' },
    { k: 'Selling costs', v: -k.directCosts, why: '§236C tax, sell-side agent fee and other selling expenses' },
    { k: 'Gross profit', v: bv.gross, total: true },
    ...(k.scoped ? [] : [
      { k: 'Company expenses', v: -k.operatingCosts, why: 'Salaries, office, marketing, bills and other costs not picked for a plot' },
      { k: 'Operating profit', v: bv.op, total: true },
    ]),
    { k: 'Deductions', v: -(k.tax + k.zakat + k.charity), why: 'CGT and other tax, Zakat and charity' },
    { k: k.scoped ? 'Net margin' : 'Net profit', v: bv.net, total: true },
  ];

  // The same deals on their saved cost sheets: the two agree unless a sheet holds amounts no
  // record has (the sheet shows them in red, with a button that records them).
  const sheetRows = k.deal.propertyIds.map((id: string) => ({ id, sheet: M.realSheet(id), gaps: M.sheetGaps(M.realSheet(id)) }));
  const sheetNet = sheetRows.reduce((a: number, x: any) => a + (x.sheet ? x.sheet.netMargin : 0), 0);
  const unmatched = sheetRows.filter((x: any) => x.gaps.length);

  return (
    <PageShell title={meta.t} u={meta.u} p={meta.p} toolProps={{ search: false }}>
      <div className="panel" style={{ marginBottom: '14px' }}>
        <div className="panel-h">
          <h3>From revenue to net profit</h3>
          <span className="sub">{r.label}</span>
          <span className="spacer" />
          <span className="seg" data-noprint="1" role="group" aria-label="Cost basis">
            <button
              type="button"
              aria-pressed={grossBasis === 'cogs'}
              onClick={() => setGrossBasis('cogs')}
            >
              Cost of units sold
            </button>
            <button
              type="button"
              aria-pressed={grossBasis === 'doc'}
              onClick={() => setGrossBasis('doc')}
            >
              Document wording
            </button>
          </span>
        </div>
        <div className="panel-b">
          <ChartWaterfall steps={wf} />
        </div>
      </div>

      <div className="panel">
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Line</th>
                <th className="r">{r.label}</th>
              </tr>
            </thead>
            <tbody>
              {pnlRows.map((x, idx) => {
                if (x.kind === 'h') {
                  return (
                    <tr key={idx}>
                      <td colSpan={2} style={{ paddingTop: '15px' }}>
                        <span className="kicker">{x.label}</span>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={idx}>
                    <td className={x.kind ? 'strong' : ''}>{x.label}</td>
                    <td
                      className={`r mono ${x.kind ? 'strong' : ''}`}
                      style={{ fontSize: x.kind === 'g' ? '15px' : undefined }}
                    >
                      <span className={!x.kind ? '' : x.v && x.v < 0 ? 'neg' : 'pos'}>
                        {x.v !== null ? M.fmt(x.v, numbers) : ''}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {sheetRows.length > 0 && (
        <div className={`note ${unmatched.length ? 'bad' : 'calm'}`} style={{ marginTop: '14px' }}>
          <span className="ic">
            <Icon name={unmatched.length ? 'warn' : 'ok'} />
          </span>
          <div>
            {unmatched.length ? (
              <>
                The cost sheets of these {sheetRows.length} sales add up to <b>{M.fmt(sheetNet, 'full')}</b> net margin,
                against <b>{M.fmt(k.deal.net, 'full')}</b> from the records. The difference is amounts typed on{' '}
                {unmatched.map((x: any, i: number) => (
                  <span key={x.id}>
                    {i > 0 ? ', ' : ''}
                    <button type="button" className="link" onClick={() => openCostSheet(x.sheet.id || x.id)}>{x.sheet.id || x.id}</button>
                  </span>
                ))}{' '}
                and not recorded yet. Open the sheet and press <b>Record them</b>.
              </>
            ) : (
              <>
                Matches the cost sheets: {sheetRows.length === 1 ? 'the sale in this period comes' : `the ${sheetRows.length} sales in this period come`} to{' '}
                <b>{M.fmt(sheetNet, 'full')}</b> net margin on {sheetRows.length === 1 ? 'its cost sheet' : 'their cost sheets'}, line for line as above.
              </>
            )}
          </div>
        </div>
      )}

      <div className="note calm" style={{ marginTop: '14px' }}>
        <span className="ic">
          <Icon name="info" />
        </span>
        <div>
          Each plot sold counts once, whole, in the period of its sale, with the same lines as its cost sheet. Every tax is
          on one line only: stamp duty, CVT and §236K in the landed cost, §236C in the selling costs, CGT under deductions.
          When the plot has its own §236C entry in the Tax register, that entry is counted instead of the figure on the sale.
          {k.scoped
            ? ' With an agent, project, type or property filter on, company expenses not picked for a plot are left out.'
            : ''}
        </div>
      </div>
    </PageShell>
  );
}
