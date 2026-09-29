'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable } from '../Shared';
import { ChartWaterfall, ChartLines, RankedList } from '../Charts';
import { Icon } from '../Icons';
import { PAGE_META, SC } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function FinancePage() {
  const {
    tab,
    effectiveFilters: f,
    range: r,
    grossBasis,
    setGrossBasis,
    period,
    setPeriod,
    openModal,
    numbers,
    exportCsv,
    print,
  } = useApp();

  const meta = PAGE_META[`finance/${tab}`] || { t: 'Finance' };

  if (tab === 'profit') {
    const rows =
      period === 'weekly'
        ? M.weeklySeries(12, f).map((w: any) => ({
            label: w.label,
            full: w.full,
            purchase: w.k.purchaseCost,
            sales: w.k.salesRevenue,
            gross: w.k.grossProfit,
            commission: w.k.commission,
            expenses: w.k.totalExpenses,
            net: w.k.netProfit,
          }))
        : period === 'yearly'
        ? [M.TODAY.getFullYear() - 1, M.TODAY.getFullYear()].map((y: number) => {
            const kk = M.computeKPIs(M.rangeFor(y === M.TODAY.getFullYear() ? 'thisYear' : 'lastYear'), f);
            return {
              label: 'FY ' + y,
              full: 'FY ' + y,
              purchase: kk.purchaseCost,
              sales: kk.salesRevenue,
              gross: kk.grossProfit,
              commission: kk.commission,
              expenses: kk.totalExpenses,
              net: kk.netProfit,
            };
          })
        : M.monthlySeries(M.TODAY.getFullYear(), f).map((m: any) => ({
            label: m.label,
            full: m.full,
            purchase: m.k.purchaseCost,
            sales: m.k.salesRevenue,
            gross: m.k.grossProfit,
            commission: m.k.commission,
            expenses: m.k.totalExpenses,
            net: m.k.netProfit,
          }));

    const cols = [
      { key: 'full', label: 'Period' },
      { key: 'purchase', label: 'Purchase cost', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.purchase, numbers) },
      { key: 'sales', label: 'Sales', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.sales, numbers) },
      {
        key: 'gross',
        label: 'Gross profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span className="pos">{M.fmt(p.gross, numbers)}</span>,
      },
      { key: 'commission', label: 'Commission', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.commission, numbers) },
      { key: 'expenses', label: 'Expenses', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.expenses, numbers) },
      {
        key: 'net',
        label: 'Net profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (p: any) => <span className="pos">{M.fmt(p.net, numbers)}</span>,
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
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </span>
          <span className="spacer" />
          <button type="button" className="btn" onClick={exportCsv}>
            <Icon name="down" /> CSV
          </button>
          <button type="button" className="btn" onClick={print}>
            <Icon name="print" /> PDF
          </button>
        </div>

        <div className="panel" style={{ marginBottom: '14px' }}>
          <div className="panel-h">
            <h3>Revenue, expenses and net profit</h3>
          </div>
          <div className="panel-b">
            <ChartLines
              rows={rows}
              series={[
                { key: 'sales', label: 'Sales', c: 'var(--s1)' },
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
    const rows = M.DATA.payments
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

  // P&L tab (default)
  const k = M.computeKPIs(r, f);
  const isCogs = grossBasis === 'cogs';
  const bv = {
    cost: isCogs ? k.costOfSales : k.purchaseCost,
    gross: isCogs ? k.grossProfit : k.salesRevenue - k.purchaseCost,
    op: isCogs ? k.operatingProfit : k.salesRevenue - k.purchaseCost - k.operatingCosts,
    net: isCogs
      ? k.netProfit
      : k.salesRevenue - k.purchaseCost - k.operatingCosts - k.tax - k.zakat,
    costLabel: isCogs ? 'cost of the units sold' : 'period purchase spend',
    doc: !isCogs,
  };

  const L = (label: string, v: number | null, kind?: string) => ({ label, v, kind });
  const pnlRows = [
    L('REVENUE', null, 'h'),
    L('Property sales', k.salesRevenue),
    L('Other revenue', 0),
    L('Total revenue', k.salesRevenue, 't'),
    L('COST OF SALES', null, 'h'),
    ...(bv.doc
      ? [
          L('Property purchase cost', -(bv.cost - k.acquisitionCosts)),
          L('Property acquisition costs', -k.acquisitionCosts),
        ]
      : [L('Cost of properties sold', -bv.cost)]),
    L('Gross profit', bv.gross, 't'),
    L('OPERATING EXPENSES', null, 'h'),
    L('Agent commission', -k.commission),
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
  ];

  const wf = [
    { k: 'Selling revenue', v: k.salesRevenue, total: true },
    { k: 'Cost of property sold', v: -bv.cost, why: bv.costLabel },
    { k: 'Gross profit', v: bv.gross, total: true },
    {
      k: 'Operating costs',
      v: -k.operatingCosts,
      why: 'Commission, salaries, office, marketing, property, bills, other',
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
                      <span className={x.v && x.v < 0 ? '' : x.kind ? 'pos' : ''}>
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
          Cost of sales is measured as the <b>{bv.costLabel}</b>. Zakat sits below the operating line,
          separate from operating expenses. Withholding tax on individual sales is already inside net sale
          revenue and is not repeated here.
        </div>
      </div>
    </PageShell>
  );
}
