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
    voidPayment,
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

  if (tab === 'income') {
    // Income earned outside property trading, as received on the cash ledger.
    const all = M.DATA.payments.filter(
      (p: any) => p.dir === 'in' && M.INCOME_CATEGORIES.indexOf(p.category) >= 0 && M.inRange(p.date, r) && (f.office === 'all' || p.office === f.office)
    );
    // A voided entry stays listed for the record but counts nothing.
    const rows = all.map((p: any) => ({
      ...p,
      amount: p.status === 'Voided' ? 0 : p.amount,
      property: (M.DATA.properties.find((x: any) => x.id === p.propertyId) || {}).name || '—',
    }));
    const live = rows.filter((p: any) => p.status !== 'Voided');
    const byCat = M.INCOME_CATEGORIES.map((c: string) => [c, live.filter((p: any) => p.category === c).reduce((a: number, p: any) => a + p.amount, 0)]).filter(
      (x: any) => x[1] > 0
    );

    const summaryPairs: [string, string][] = [
      ['Entries', M.fmtNum(live.length)],
      ['Other income', M.fmt(live.reduce((a: number, p: any) => a + p.amount, 0), numbers)],
      ...byCat.slice(0, 3).map((x: any) => [x[0], M.fmt(x[1], numbers)] as [string, string]),
    ];

    const cols = [
      { key: 'id', label: 'Txn ID' },
      { key: 'date', label: 'Date', cls: 'mono', render: (p: any) => M.fmtDate(p.date) },
      { key: 'category', label: 'Kind of income' },
      { key: 'party', label: 'Received from' },
      { key: 'property', label: 'Property' },
      {
        key: 'amount',
        label: 'Amount',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span className={p.status === 'Voided' ? 'muted' : 'pos'}>{M.fmt(p.amount, numbers)}</span>,
      },
      { key: 'method', label: 'Method' },
      { key: 'account', label: 'Account' },
      { key: 'note', label: 'Description' },
      {
        key: 'status',
        label: '',
        render: (p: any) =>
          p.status === 'Voided' ? (
            <span className="tag bad">Voided</span>
          ) : (
            <button type="button" className="btn sm" onClick={() => voidPayment(p.id)} title="Void this entry — it stays on record but no longer counts">
              Void
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
          <button type="button" className="btn pri" onClick={() => openModal('income')}>
            <Icon name="plus" /> Add income
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <div className="note calm" style={{ marginBottom: '14px' }}>
          <span className="ic">
            <Icon name="info" />
          </span>
          <div>
            Income here counts as <b>other revenue</b> in profit and loss and goes into the account it was received in. Money
            the owner puts in is not income: record it as <b>owner capital</b> on the cash flow page.
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
    const balances = M.accountBalances(r.end, f);
    const balanceCols = [
      { key: 'account', label: 'Account', render: (b: any) => <b>{b.account}</b> },
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
            <span className="sub">on {M.fmtDate(r.end)}</span>
            <span className="spacer" />
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
    L('COST OF SALES', null, 'h'),
    ...(bv.doc
      ? [
          L('Property purchase cost', -(bv.cost - k.acquisitionCosts)),
          L('Property acquisition costs', -k.acquisitionCosts),
        ]
      : [L('Cost of properties sold', -bv.cost)]),
    L('Gross profit', bv.gross, 't'),
    ...(k.scoped
      ? [
          L('DIRECT COSTS OF THESE SALES', null, 'h'),
          L('Agent commission', -k.commission),
          L('Withholding tax on sales', -k.saleTaxes),
          L('Selling costs on sales', -k.sellingCosts),
          L('NET CONTRIBUTION', bv.net, 'g'),
        ]
      : [
          L('OPERATING EXPENSES', null, 'h'),
          L('Agent commission', -k.commission),
          L('Withholding tax on sales', -k.saleTaxes),
          L('Selling costs on sales', -k.sellingCosts),
          L('Salaries', -k.salaries),
          L('Office expenses', -k.officeExp),
          L('Marketing', -k.marketing),
          L('Bills', -k.bills),
          L('Property expenses', -k.propertyExp),
          L('Employee expenses', -k.employeeExp),
          L('Other expenses', -k.other),
          L('Operating profit', bv.op, 't'),
          L('OTHER FINANCIAL OBLIGATIONS', null, 'h'),
          L('Tax', -k.tax),
          L('Zakat', -k.zakat),
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

  const wf = k.scoped
    ? [
        { k: 'Revenue', v: k.totalRevenue, total: true, why: k.otherIncome ? 'Property sales and other income' : undefined },
        { k: 'Cost of property sold', v: -bv.cost, why: bv.costLabel },
        { k: 'Gross profit', v: bv.gross, total: true },
        { k: 'Direct costs', v: -(k.commission + k.directCosts), why: 'Commission, withholding tax and selling costs on these sales' },
        { k: 'Net contribution', v: bv.net, total: true },
      ]
    : [
        { k: 'Revenue', v: k.totalRevenue, total: true, why: k.otherIncome ? 'Property sales and other income' : undefined },
        { k: 'Cost of property sold', v: -bv.cost, why: bv.costLabel },
        { k: 'Gross profit', v: bv.gross, total: true },
        {
          k: 'Operating costs',
          v: -(k.operatingCosts + k.directCosts),
          why: 'Commission, withholding tax and selling costs on sales, salaries, office, marketing, property, bills, other',
        },
        { k: 'Operating profit', v: bv.op, total: true },
        { k: 'Tax', v: -k.tax },
        { k: 'Zakat', v: -k.zakat, why: 'Kept separate from operating expenses' },
        { k: 'Net profit', v: bv.net, total: true },
      ];

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

      <div className="note calm" style={{ marginTop: '14px' }}>
        <span className="ic">
          <Icon name="info" />
        </span>
        <div>
          Cost of sales is measured as the <b>{bv.costLabel}</b>.{' '}
          {k.scoped
            ? 'With an agent, project, type or property filter on, only the costs of those sales are shown; company overheads, tax and Zakat are not allocated.'
            : 'Zakat sits below the operating line, separate from operating expenses.'}{' '}
          Withholding tax and other selling costs entered on a sale are deducted here — do not also record
          the same amount in the Tax register, or it will be counted twice.
        </div>
      </div>
    </PageShell>
  );
}
