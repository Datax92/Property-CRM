'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChartBarGroups, ChartBars } from './Charts';
import { Icon } from './Icons';
import { PrintNow } from './PrintNow';
import { PrintSheet } from './PrintSheet';
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

/* Rows of the month table someone has chosen not to see (or print), remembered in this browser. */
const HIDDEN_KEY = 'monthly-report-hidden-rows-v1';
function loadHidden(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(HIDDEN_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** The parts of the dashboard's printed first page. */
export type ReportParts = { cards: boolean; charts: boolean; table: boolean };
const ALL_PARTS: ReportParts = { cards: true, charts: true, table: true };

export function MonthlyReport({
  printSignal = 0,
  printTitle = 'MONTHLY COMPARISON REPORT',
  printTop,
  printParts = ALL_PARTS,
  printAfter,
  printFigures,
}: {
  /** Bumped from outside (the dashboard's "Print dashboard") to print this report. */
  printSignal?: number;
  printTitle?: string;
  /** Printed above the report, e.g. the dashboard's key figures. */
  printTop?: React.ReactNode;
  /** Which parts of the report go on the dashboard's printed page. */
  printParts?: ReportParts;
  /** Further printed pages after the dashboard's, e.g. More details. */
  printAfter?: React.ReactNode;
  /** Printed in the same row as the month's cards, e.g. cash and what is owed. */
  printFigures?: React.ReactNode;
} = {}) {
  const { effectiveFilters: f, numbers } = useApp();
  const thisYear = M.TODAY.getFullYear();
  const [year, setYear] = useState(thisYear);
  const [target, setTarget] = useState<Target>({ ...M.DEFAULT_MONTHLY_TARGET });
  const [editTarget, setEditTarget] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [pickRows, setPickRows] = useState(false);
  useEffect(() => {
    setTarget(loadTarget());
    setHidden(loadHidden());
  }, []);
  const saveHidden = (h: string[]) => {
    setHidden(h);
    try {
      window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(h));
    } catch {
      /* not remembered */
    }
  };
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

  type Row = { id: string; label: string; kind?: 'h' | 't' | 'g'; get?: (m: any) => number; total?: number | null; fmt?: (n: number) => string; tone?: boolean };
  const allRows: Row[] = [
    { id: 'h-profit', label: 'PROFIT — AS IN THE P&L', kind: 'h' },
    { id: 'revenue', label: 'Revenue', get: (m) => m.revenue, total: sum('revenue') },
    ...(sum('otherIncome') > 0 ? [{ id: 'otherIncome', label: '  of which other income', get: (m: any) => m.otherIncome, total: sum('otherIncome') }] : []),
    { id: 'sold', label: 'Plots sold', get: (m) => m.sold, total: sum('sold'), fmt: (n) => M.fmtNum(n) },
    { id: 'landed', label: 'Landed cost of plots sold', get: (m) => -m.landed, total: -sum('landed') },
    { id: 'selling', label: 'Selling costs (§236C, agent, other)', get: (m) => -m.selling, total: -sum('selling') },
    { id: 'gross', label: 'Gross profit', kind: 't', get: (m) => m.gross, total: sum('gross'), tone: true },
    { id: 'expenses', label: 'Company expenses', get: (m) => -m.expenses, total: -sum('expenses') },
    { id: 'deductions', label: 'Tax, Zakat & charity', get: (m) => -m.deductions, total: -sum('deductions') },
    { id: 'net', label: 'Net profit', kind: 'g', get: (m) => m.net, total: sum('net'), tone: true },
    { id: 'margin', label: 'Net margin', get: (m) => m.margin, total: M.pctOf(sum('net'), sum('revenue')), fmt: pct },
    // The owner's personal spending is drawn out of profit, not a cost of earning it.
    ...(sum('personal') > 0
      ? [
          { id: 'personal', label: 'Personal spending (owner)', get: (m: any) => -m.personal, total: -sum('personal') },
          { id: 'afterPersonal', label: 'Left after personal spending', kind: 't' as const, get: (m: any) => m.afterPersonal, total: sum('afterPersonal'), tone: true },
        ]
      : []),
    { id: 'target', label: `Target profit (${pct(rep.targetPct)} of ${money(+target.capital || 0)})`, get: (m) => m.target, total: sum('target') },
    { id: 'vsTarget', label: 'Ahead / behind target', kind: 't', get: (m) => m.vsTarget, total: sum('vsTarget'), tone: true },
    { id: 'h-holds', label: 'WHAT THE BUSINESS HOLDS — AT MONTH END', kind: 'h' },
    { id: 'property', label: 'Property stock (landed cost)', get: (m) => m.holdings.property, total: null },
    ...rep.types.map((t: string) => ({ id: 'type:' + t, label: t + ' (at cost)', get: (m: any) => m.holdings.byType[t] || 0, total: null })),
    { id: 'cash', label: 'Cash & bank', get: (m) => m.holdings.cash, total: null },
    { id: 'receivable', label: 'Receivables', get: (m) => m.holdings.receivable, total: null },
    { id: 'holdTotal', label: 'Total', kind: 't', get: (m) => m.holdings.total, total: null },
    { id: 'growth', label: 'Growth on the month before', kind: 'g', get: (m) => m.growth, total: sum('growth'), tone: true },
    { id: 'growthPct', label: 'Growth %', get: (m) => m.growthPct, total: M.pctOf(sum('growth'), rep.opening.total), fmt: pct },
  ];
  // Rows with nothing in any month of the year, which the Rows list can hide in one go.
  const emptyRows = allRows.filter((row) => row.kind !== 'h' && months.every((m) => !row.get!(m)) && !row.total).map((row) => row.id);
  // Rows chosen not to show are left out on screen and in print; a heading goes with its last row.
  const rows = allRows.filter((row, i) => {
    if (row.kind !== 'h') return hidden.indexOf(row.id) < 0;
    const next = allRows.slice(i + 1);
    const end = next.findIndex((x) => x.kind === 'h');
    return (end < 0 ? next : next.slice(0, end)).some((x) => hidden.indexOf(x.id) < 0);
  });

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

  const body = (forPrint: boolean, parts: ReportParts = ALL_PARTS) => (
    <>
      {cur ? (
        <>
          {parts.cards && (
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
            {forPrint && printFigures}
          </div>
          )}

          {parts.charts && (
          <div className={forPrint ? 'mr-charts print' : 'grid c2 eq mr-charts'}>
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
                    { key: 'target', label: 'Target', c: 'var(--s2)', hollow: true },
                  ]}
                  label="Net profit against target by month"
                  width={forPrint ? 540 : undefined}
                  low={forPrint}
                />
              </div>
            </div>
            <div className="panel">
              <div className="panel-h">
                <h3>Growth in what the business holds</h3>
                <span className="sub">change on the month before</span>
              </div>
              <div className="panel-b">
                <ChartBars
                  signed
                  rows={months.map((m) => ({ label: m.label, full: m.full, v: m.growth }))}
                  // On paper every bar is black: a fall shows by going below the line.
                  legend={
                    forPrint
                      ? undefined
                      : [
                          { k: 'Grew', c: 'var(--good)' },
                          { k: 'Fell', c: 'var(--bad)' },
                        ]
                  }
                  label="Growth by month"
                  width={forPrint ? 540 : undefined}
                  low={forPrint}
                />
              </div>
            </div>
          </div>
          )}

          {parts.table && (
          <>
          <div className="panel">
            <div className="tblwrap">
              <table className="tbl mr-tbl">
                <thead>
                  <tr>
                    <th>{forPrint ? `${year} · amounts in PKR` : year}</th>
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
                    // On paper the currency is named once, in the corner, so every figure fits its column.
                    const show = row.fmt || (forPrint ? (n: number) => money(n).replace('PKR ', '') : money);
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
          {!forPrint && (
          <p className="muted mr-note">
            Profit follows the P&amp;L: each plot counts whole in the month it is sold, as on its cost sheet. Holdings are
            what the business has at each month end — unsold plots at landed cost, assets at what was paid for them, bank
            and cash, and what buyers still owe. Growth is the change in that total from the month before.
          </p>
          )}
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
          <button
            type="button"
            className={`btn sm ${pickRows ? 'pri' : ''}`}
            onClick={() => setPickRows(!pickRows)}
            title="Choose which rows of the month table are shown and printed"
          >
            <Icon name="filter" size={12} /> Rows{hidden.length ? ` (${M.fmtNum(allRows.filter((x) => x.kind !== 'h' && hidden.indexOf(x.id) >= 0).length)} hidden)` : ''}
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

      {pickRows && (
        <div className="panel mr-target" data-noprint="1">
          <div className="panel-b">
            <div className="mr-rows-h">
              <b>Rows of the month table</b>
              <span className="muted">Untick what is not needed: it is left out here and when printing.</span>
              <span className="spacer" />
              <button
                type="button"
                className="btn sm"
                onClick={() => saveHidden(Array.from(new Set([...hidden, ...emptyRows])))}
                disabled={!emptyRows.some((id) => hidden.indexOf(id) < 0)}
                title="Leave out every row with no figure in any month of the year"
              >
                Hide empty rows{emptyRows.length ? ` (${M.fmtNum(emptyRows.length)})` : ''}
              </button>
              <button type="button" className="link" onClick={() => saveHidden([])}>
                Show all
              </button>
              <button type="button" className="btn sm" onClick={() => setPickRows(false)}>
                Done
              </button>
            </div>
            <div className="mr-rows">
              {allRows.map((row) =>
                row.kind === 'h' ? (
                  <span key={row.id} className="kicker mr-rows-sec">
                    {row.label}
                  </span>
                ) : (
                  <label key={row.id} className="mr-row-pick">
                    <input
                      type="checkbox"
                      checked={hidden.indexOf(row.id) < 0}
                      onChange={(e) => saveHidden(e.target.checked ? hidden.filter((x) => x !== row.id) : [...hidden, row.id])}
                    />
                    <span className={row.kind ? 'strong' : ''}>{row.label.trim()}</span>
                  </label>
                )
              )}
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
            {/* Print dashboard: the whole dashboard on one page, then any further pages (More details).
                Print report: the month table alone. */}
            {extra ? (
              <PrintSheet
                kicker={printTitle}
                title={cur.full}
                sub={prev ? `compared with ${prev.full} and every earlier month of ${year}` : `the months of ${year}`}
                pageNo={printAfter ? 'Page 1 of 2' : undefined}
              >
                {printTop}
                {body(true, printParts)}
              </PrintSheet>
            ) : (
              <PrintSheet className="solo" kicker="MONTHLY COMPARISON REPORT" title={`${year}, month by month`} sub={`${cur.full} highlighted`}>
                {body(true, { cards: false, charts: false, table: true })}
              </PrintSheet>
            )}
            {extra && printAfter}
          </div>
        </PrintNow>
      )}
    </section>
  );
}
