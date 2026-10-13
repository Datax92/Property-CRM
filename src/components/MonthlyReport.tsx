'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChartBarGroups, ChartBars } from './Charts';
import { Icon } from './Icons';
import { BrandBanner, BrandFooter } from './Brand';
import { PrintNow } from './PrintNow';
import * as M from '../lib/re-data';

/* Monthly comparison report: the month picked against the month before it and every earlier
   month of the year — profit as the P&L counts it, against the monthly target, and what the
   business holds at each month end. Printable on one landscape page. */

const TARGET_KEY = 'monthly-target-v1';
type Target = typeof M.DEFAULT_MONTHLY_TARGET;

function loadTarget(): Target {
  try {
    const raw = window.localStorage.getItem(TARGET_KEY);
    const t = raw ? JSON.parse(raw) : null;
    if (t && typeof t === 'object') return { ...M.DEFAULT_MONTHLY_TARGET, ...t };
  } catch {
    /* storage blocked or corrupt */
  }
  return { ...M.DEFAULT_MONTHLY_TARGET };
}

const pct = (n: number) => (isFinite(n) ? `${n.toFixed(2)}%` : '—');

export function MonthlyReport({
  printSignal = 0,
  printTitle = 'MONTHLY COMPARISON REPORT',
  printTop,
}: {
  /** Bumped from outside (the dashboard's "Print dashboard") to print this report. */
  printSignal?: number;
  printTitle?: string;
  /** Printed above the report, e.g. the dashboard's key figures. */
  printTop?: React.ReactNode;
} = {}) {
  const { effectiveFilters: f, numbers } = useApp();
  const thisYear = M.TODAY.getFullYear();
  const [year, setYear] = useState(thisYear);
  const [target, setTarget] = useState<Target>({ ...M.DEFAULT_MONTHLY_TARGET });
  const [editTarget, setEditTarget] = useState(false);
  const [printing, setPrinting] = useState(false);
  useEffect(() => setTarget(loadTarget()), []);
  const [extra, setExtra] = useState(false);
  useEffect(() => {
    if (printSignal > 0) {
      setExtra(true);
      setPrinting(true);
    }
  }, [printSignal]);

  const rep = M.monthlyComparison(year, f, target);
  const months: any[] = rep.months;
  const lastIdx = months.length - 1;
  const [pick, setPick] = useState<number | null>(null);
  const sel = pick != null && pick <= lastIdx ? pick : lastIdx;
  const cur = months[sel];
  const prev = sel > 0 ? months[sel - 1] : null;

  const years: number[] = [];
  const first = Math.min(thisYear, ...M.DATA.properties.map((p: any) => (p.purchaseDate instanceof Date ? p.purchaseDate.getFullYear() : thisYear)));
  for (let y = thisYear; y >= first; y--) years.push(y);

  const saveTarget = (t: Target) => {
    setTarget(t);
    try {
      window.localStorage.setItem(TARGET_KEY, JSON.stringify(t));
    } catch {
      /* not remembered */
    }
  };

  const money = (n: number) => M.fmt(n, numbers);
  const sum = (key: string) => months.reduce((a, m) => a + (m[key] || 0), 0);

  type Row = { label: string; kind?: 'h' | 't' | 'g'; get?: (m: any) => number; total?: number | null; fmt?: (n: number) => string; tone?: boolean };
  const rows: Row[] = [
    { label: 'PROFIT — AS IN THE P&L', kind: 'h' },
    { label: 'Revenue', get: (m) => m.revenue, total: sum('revenue') },
    ...(sum('otherIncome') > 0 ? [{ label: '  of which other income', get: (m: any) => m.otherIncome, total: sum('otherIncome') }] : []),
    { label: 'Plots sold', get: (m) => m.sold, total: sum('sold'), fmt: (n) => M.fmtNum(n) },
    { label: 'Landed cost of plots sold', get: (m) => -m.landed, total: -sum('landed') },
    { label: 'Selling costs (§236C, agent, other)', get: (m) => -m.selling, total: -sum('selling') },
    { label: 'Gross profit', kind: 't', get: (m) => m.gross, total: sum('gross'), tone: true },
    { label: 'Company expenses', get: (m) => -m.expenses, total: -sum('expenses') },
    { label: 'Tax, Zakat & charity', get: (m) => -m.deductions, total: -sum('deductions') },
    { label: 'Net profit', kind: 'g', get: (m) => m.net, total: sum('net'), tone: true },
    { label: 'Net margin', get: (m) => m.margin, total: M.pctOf(sum('net'), sum('revenue')), fmt: pct },
    // The owner's personal spending is drawn out of profit, not a cost of earning it.
    ...(sum('personal') > 0
      ? [
          { label: 'Personal spending (owner)', get: (m: any) => -m.personal, total: -sum('personal') },
          { label: 'Left after personal spending', kind: 't' as const, get: (m: any) => m.afterPersonal, total: sum('afterPersonal'), tone: true },
        ]
      : []),
    { label: `Target profit (${pct(rep.targetPct)} of ${money(+target.capital || 0)})`, get: (m) => m.target, total: sum('target') },
    { label: 'Ahead / behind target', kind: 't', get: (m) => m.vsTarget, total: sum('vsTarget'), tone: true },
    { label: 'WHAT THE BUSINESS HOLDS — AT MONTH END', kind: 'h' },
    { label: 'Property stock (landed cost)', get: (m) => m.holdings.property, total: null },
    ...rep.types.map((t: string) => ({ label: t + ' (at cost)', get: (m: any) => m.holdings.byType[t] || 0, total: null })),
    { label: 'Cash & bank', get: (m) => m.holdings.cash, total: null },
    { label: 'Receivables', get: (m) => m.holdings.receivable, total: null },
    { label: 'Total', kind: 't', get: (m) => m.holdings.total, total: null },
    { label: 'Growth on the month before', kind: 'g', get: (m) => m.growth, total: sum('growth'), tone: true },
    { label: 'Growth %', get: (m) => m.growthPct, total: M.pctOf(sum('growth'), rep.opening.total), fmt: pct },
  ];

  const compare = (label: string, a: number, b: number | null, opts: { fmt?: (n: number) => string; good?: 'up' | 'down' } = {}) => {
    const show = opts.fmt || money;
    const diff = b == null ? null : a - b;
    const better = diff == null || diff === 0 ? '' : (diff > 0) === (opts.good !== 'down') ? 'pos' : 'neg';
    return (
      <div className={`kpi mr-card ${better ? "mr-" + better : ""}`} key={label}>
        <span className="k">{label}</span>
        <span className={`v ${a < 0 ? 'neg' : ''}`}>{show(a)}</span>
        <span className="f">
          {b == null ? (
            <span className="muted">no month before it this year</span>
          ) : (
            <>
              <span className={`mr-chip ${better}`}>
                {diff! > 0 ? '▲' : diff! < 0 ? '▼' : '='} {show(Math.abs(diff!))}
              </span>
              <span className="muted">vs {prev.label} ({show(b)})</span>
            </>
          )}
        </span>
      </div>
    );
  };

  const letterhead = (
    <div className="mrp-head">
      <div className="mrp-brand">
        <BrandBanner />
      </div>
      <div className="mrp-meta">
        <span>Printed {M.fmtDate(M.TODAY)}</span>
        <span>{M.COMPANY_PHONE}</span>
        <span>{M.COMPANY_EMAIL}</span>
      </div>
    </div>
  );

  const body = (forPrint: boolean, part: 'all' | 'top' | 'table' = 'all') => (
    <>
      {cur ? (
        <>
          {part !== 'table' && (
          <>
          <div className="kpis mr-kpis">
            {compare('Revenue', cur.revenue, prev && prev.revenue)}
            {compare('Gross profit', cur.gross, prev && prev.gross)}
            {compare('Net profit', cur.net, prev && prev.net)}
            {cur.personal > 0 || (prev && prev.personal > 0)
              ? compare('After personal spending', cur.afterPersonal, prev && prev.afterPersonal)
              : null}
            {compare('Against target', cur.vsTarget, prev && prev.vsTarget)}
            {compare('Business holds', cur.holdings.total, prev && prev.holdings.total)}
            {compare('Growth in the month', cur.growth, prev && prev.growth)}
          </div>

          <div className={forPrint ? 'mr-charts print' : 'grid c2 mr-charts'}>
            <div className="panel">
              <div className="panel-h">
                <h3>Net profit against target</h3>
                <span className="sub">{year}, by month</span>
              </div>
              <div className="panel-b">
                <ChartBarGroups
                  rows={months.map((m) => ({ label: m.label, full: m.full, net: m.net, target: m.target }))}
                  series={[
                    { key: 'net', label: 'Net profit', c: 'var(--s1)' },
                    { key: 'target', label: 'Target', c: 'var(--s2)' },
                  ]}
                  label="Net profit against target by month"
                  width={forPrint ? 620 : undefined}
                />
              </div>
            </div>
            <div className="panel">
              <div className="panel-h">
                <h3>Growth in what the business holds</h3>
                <span className="sub">change on the month before</span>
              </div>
              <div className="panel-b">
                <ChartBars signed rows={months.map((m) => ({ label: m.label, full: m.full, v: m.growth }))} label="Growth by month" width={forPrint ? 620 : undefined} />
              </div>
            </div>
          </div>

          </>
          )}

          {part !== 'top' && (
          <>
          <div className="panel">
            <div className="tblwrap">
              <table className="tbl mr-tbl">
                <thead>
                  <tr>
                    <th>{year}</th>
                    {months.map((m, i) => (
                      <th key={m.month} className={`r ${i === sel ? 'mr-sel' : ''}`}>
                        {m.label}
                      </th>
                    ))}
                    <th className="r">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => {
                    if (row.kind === 'h') {
                      return (
                        <tr key={ri}>
                          <td colSpan={months.length + 2} style={{ paddingTop: '12px' }}>
                            <span className="kicker">{row.label}</span>
                          </td>
                        </tr>
                      );
                    }
                    const show = row.fmt || money;
                    const cell = (v: number) => (
                      <span className={row.tone ? (v > 0 ? 'pos' : v < 0 ? 'neg' : '') : ''}>{show(v)}</span>
                    );
                    return (
                      <tr key={ri} className={row.kind ? 'strong' : ''}>
                        <td className={row.kind ? 'strong' : ''}>{row.label}</td>
                        {months.map((m, i) => (
                          <td key={m.month} className={`r mono ${i === sel ? 'mr-sel' : ''} ${row.kind ? 'strong' : ''}`}>
                            {cell(row.get!(m))}
                          </td>
                        ))}
                        <td className={`r mono ${row.kind ? 'strong' : ''}`}>{row.total == null ? '—' : cell(row.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="muted mr-note">
            Profit follows the P&amp;L: each plot counts whole in the month it is sold, as on its cost sheet. Holdings are
            what the business has at each month end — unsold plots at landed cost, assets at what was paid for them, bank
            and cash, and what buyers still owe. Growth is the change in that total from the month before.
          </p>
          </>
          )}
        </>
      ) : (
        <div className="empty" style={{ padding: '24px' }}>
          Nothing to compare in {year} yet.
        </div>
      )}
    </>
  );

  return (
    <section className="mr">
      <div className="mr-band">
        <div className="mr-title">
          <span className="kicker">Monthly comparison report</span>
          <h2>{cur ? cur.full : String(year)}</h2>
          <span className="sub">
            {cur && prev ? `against ${prev.full} and every earlier month of ${year}` : `the months of ${year}`}
          </span>
        </div>
        <span className="spacer" />
        <span className="mr-ctl" data-noprint="1">
          <select className="fldsel" value={year} onChange={(e) => { setYear(+e.target.value); setPick(null); }} aria-label="Year">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select className="fldsel" value={sel} onChange={(e) => setPick(+e.target.value)} aria-label="Month to compare" disabled={!months.length}>
            {months.map((m, i) => (
              <option key={m.month} value={i}>
                {m.full}
              </option>
            ))}
          </select>
          <button type="button" className={`btn sm ${editTarget ? 'pri' : ''}`} onClick={() => setEditTarget(!editTarget)}>
            <Icon name="edit" size={12} /> Target
          </button>
          <button type="button" className="btn sm" onClick={() => setPrinting(true)} disabled={!cur}>
            <Icon name="print" size={12} /> Print report
          </button>
        </span>
      </div>

      {editTarget && (
        <div className="panel mr-target" style={{ marginBottom: '14px' }}>
          <div className="panel-b">
            <div className="mr-target-row">
              {(
                [
                  ['capital', 'Capital (PKR)'],
                  ['inflation', 'Inflation % a month'],
                  ['growth', 'Growth % a month'],
                  ['profit', 'Profit % a month'],
                  ['zakat', 'Zakat % a month'],
                ] as [keyof Target, string][]
              ).map(([key, label]) => (
                <label key={key} className="fld">
                  <span>{label}</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={target[key]}
                    onChange={(e) => saveTarget({ ...target, [key]: e.target.value === '' ? 0 : +e.target.value })}
                  />
                </label>
              ))}
              <div className="mr-target-sum">
                Target each month <b>{pct(rep.targetPct)}</b> = <b>{M.fmt(rep.targetProfit, 'full')}</b>
                <button type="button" className="link" onClick={() => saveTarget({ ...M.DEFAULT_MONTHLY_TARGET })}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mr-body">{body(false)}</div>

      {printing && cur && (
        <PrintNow
          onDone={() => {
            setPrinting(false);
            setExtra(false);
          }}
          page="A4 landscape"
          margin="0"
        >
          <div className="mr-print">
            {/* Print dashboard: the key figures and charts, then the month table. Print report: the month table only. */}
            {extra && (
              <div className="mrp-page">
                {letterhead}
                <div className="mrp-band">
                  <div>
                    <span className="mrp-kicker">{printTitle}</span>
                    <b>{cur.full}</b>
                  </div>
                  <span>{prev ? `compared with ${prev.full} and every earlier month of ${year}` : `the months of ${year}`}</span>
                </div>
                {printTop}
                {body(true, 'top')}
                <div className="mrp-pageno">Page 1 of 2</div>
              </div>
            )}
            <div className="mrp-page">
              {extra ? (
                <div className="mrp-band slim">
                  <div>
                    <span className="mrp-kicker">MONTHLY COMPARISON REPORT · MONTH BY MONTH</span>
                    <b>{year}</b>
                  </div>
                  <span>{M.COMPANY}</span>
                </div>
              ) : (
                <>
                  {letterhead}
                  <div className="mrp-band">
                    <div>
                      <span className="mrp-kicker">MONTHLY COMPARISON REPORT</span>
                      <b>{year}, month by month</b>
                    </div>
                    <span>{cur.full} highlighted · printed {M.fmtDate(M.TODAY)}</span>
                  </div>
                </>
              )}
              {body(true, 'table')}
              <div className="mrp-foot">
                <BrandFooter />
              </div>
              {extra && <div className="mrp-pageno">Page 2 of 2</div>}
            </div>
          </div>
        </PrintNow>
      )}
    </section>
  );
}
