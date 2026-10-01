'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from './Icons';
import * as M from '../lib/re-data';
import type { TableColumn } from '../lib/types';

export function Fig({ n, cls = '' }: { n: number; cls?: string }) {
  const { numbers } = useApp();
  const p = M.fmtParts(n, numbers);
  return (
    <span className={`fig ${cls}`}>
      {p.sign}
      <span className="cur">PKR</span>
      {p.num}
      {p.unit ? <span className="unit">{p.unit}</span> : null}
    </span>
  );
}

export function FigText({ str, cls = '' }: { str: string; cls?: string }) {
  const m = String(str).match(/^(−?)PKR\s+(.+?)(?:\s+(Cr|Lakh|B|M|K))?$/);
  if (!m) return <span className={`fig ${cls}`}>{str}</span>;
  return (
    <span className={`fig ${cls}`}>
      {m[1]}
      <span className="cur">PKR</span>
      {m[2]}
      {m[3] ? <span className="unit">{m[3]}</span> : null}
    </span>
  );
}

export function Delta({ d, invert }: { d: number | null | undefined; invert?: boolean }) {
  if (d === null || d === undefined || !isFinite(d)) {
    return <span className="delta flat">—</span>;
  }
  const up = d > 0.05,
    down = d < -0.05;
  const good = invert ? down : up;
  const cls = !up && !down ? 'flat' : good ? 'up' : 'down';
  const ar = !up && !down ? '' : up ? '▲' : '▼';
  return (
    <span className={`delta ${cls}`}>
      <span className="ar">{ar}</span>
      {Math.abs(d) >= 999 ? '>999' : Math.abs(d).toFixed(1)}%
    </span>
  );
}

export function Tag({ text }: { text: string }) {
  const cls = /Paid|Completed|Posted|Available/.test(text)
    ? 'ok'
    : /Overdue|Unpaid|Voided/.test(text)
    ? 'bad'
    : /Partial|Pending|Process|Reserved|Payment/.test(text)
    ? 'warn'
    : 'mute';
  return <span className={`tag ${cls}`}>{text}</span>;
}

export function KpiCard({
  k,
  v,
  raw,
  d,
  f,
  cls = '',
  tone = '',
  go,
  invert,
}: {
  k: string;
  v?: number;
  raw?: string;
  d?: number | null;
  f?: string;
  cls?: string;
  tone?: string;
  go?: string;
  invert?: boolean;
}) {
  const { goto } = useApp();
  const hasStrip = /lead|warnbox/.test(cls);

  const content = (
    <>
      {hasStrip && <i className="strip" />}
      <span className="k">{k}</span>
      <span className={`v ${tone}`}>{raw != null ? <FigText str={raw} /> : <Fig n={v || 0} />}</span>
      {((d !== undefined && d !== null && isFinite(d)) || f) && (
        <span className="f">
          {d !== undefined && d !== null && isFinite(d) && (
            <>
              <Delta d={d} invert={invert} />
              <span className="vs">vs previous period</span>
            </>
          )}
          {f && <span className="vs">{f}</span>}
        </span>
      )}
    </>
  );

  if (go) {
    return (
      <button type="button" className={`kpi ${cls}`} onClick={() => goto(go)}>
        {content}
      </button>
    );
  }

  return <div className={`kpi ${cls}`}>{content}</div>;
}

export function SummaryKpis({ pairs }: { pairs: [string, string][] }) {
  return (
    <div className="kpis">
      {pairs.map(([k, v], idx) => (
        <div key={idx} className="kpi">
          <span className="k">{k}</span>
          <span className="v">
            <FigText str={v} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function PrintHead({ title }: { title: string }) {
  const { range, user, role } = useApp();
  return (
    <div className="print-head">
      <div className="co">{M.COMPANY}</div>
      <div className="mt">
        <b>{title}</b> · Period: {range.label} ({M.fmtDate(range.start)} – {M.fmtDate(range.end)}) · Generated:{' '}
        {M.fmtDate(M.TODAY)} · User: {user.name} ({role})
      </div>
    </div>
  );
}

export function PeriodControl() {
  const { rangeKey, setRangeKey, range, custom, setCustom } = useApp();

  return (
    <>
      <select
        className="fldsel"
        value={rangeKey}
        onChange={(e) => setRangeKey(e.target.value)}
        aria-label="Reporting period"
        title="Reporting period"
      >
        {M.RANGE_KEYS.map(([k, l]: any) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      {rangeKey === 'custom' && (
        <>
          <input
            type="date"
            className="fldsel"
            value={custom.start}
            max={M.dateInput(M.TODAY)}
            onChange={(e) => setCustom({ ...custom, start: e.target.value })}
            aria-label="Start date"
            title="Start date"
            style={{ width: 'auto', minWidth: '120px' }}
          />
          <span className="vs">to</span>
          <input
            type="date"
            className="fldsel"
            value={custom.end}
            max={M.dateInput(M.TODAY)}
            onChange={(e) => setCustom({ ...custom, end: e.target.value })}
            aria-label="End date"
            title="End date"
            style={{ width: 'auto', minWidth: '120px' }}
          />
        </>
      )}
      <span className="vs" title={`${M.fmtDate(range.start)} to ${M.fmtDate(range.end)}`}>
        {range.label}
      </span>
    </>
  );
}

export function Toolbar({
  search = true,
  filters = true,
  period = true,
}: {
  search?: boolean;
  filters?: boolean;
  period?: boolean;
}) {
  const { query, setQuery, filters: appFilters, openMenu, exportCsv, exportXls, print } = useApp();
  const fc = Object.keys(M.EMPTY_FILTERS).filter((k) => (appFilters as any)[k] !== 'all').length;

  return (
    <div className="toolrow" data-noprint="1">
      {search && (
        <input
          className="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {filters && (
        <button
          className={`btn ${fc ? 'on' : ''}`}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            openMenu('filters', Math.max(8, r.left), r.bottom + 6);
          }}
        >
          <Icon name="filter" /> Filters{fc ? ` · ${fc}` : ''}
        </button>
      )}
      {period && <PeriodControl />}
      <span className="spacer" />
      <button className="btn" onClick={exportCsv}>
        <Icon name="down" /> CSV
      </button>
      <button className="btn" onClick={exportXls}>
        <Icon name="down" /> Excel
      </button>
      <button className="btn" onClick={print}>
        <Icon name="print" /> PDF
      </button>
    </div>
  );
}

export function DataTable<T extends { id?: string }>({
  cols,
  rows,
  totals = false,
}: {
  cols: TableColumn<T>[];
  rows: T[];
  totals?: boolean;
}) {
  const { query, sort, setSort, fresh, showAll, toggleShowAll, numbers } = useApp();

  const q = query.trim().toLowerCase();
  let data = rows;

  if (q) {
    data = data.filter((r) =>
      cols.some((c) =>
        String((r as any)[c.key] == null ? '' : (r as any)[c.key])
          .toLowerCase()
          .includes(q)
      )
    );
  }

  if (sort) {
    const c = cols.find((x) => x.key === sort.key);
    if (c) {
      data = [...data].sort((a, b) => {
        const av = (a as any)[c.key],
          bv = (b as any)[c.key];
        const n =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : av instanceof Date && bv instanceof Date
            ? av.getTime() - bv.getTime()
            : String(av).localeCompare(String(bv));
        return sort.dir === 'asc' ? n : -n;
      });
    }
  }

  if (fresh.length) {
    const isFresh = (r: T) => r.id && fresh.indexOf(r.id) >= 0;
    data = data.filter((r) => isFresh(r)).concat(data.filter((r) => !isFresh(r)));
  }

  if (!data.length) {
    return (
      <div className="empty">
        <Icon name="empty" />
        <h3>Nothing to show</h3>
        <p>
          {q
            ? `No rows match “${query}”.`
            : 'No records fall inside this period and filter combination.'}
        </p>
      </div>
    );
  }

  const cap = showAll ? data.length : 12;
  const shown = data.slice(0, cap);

  return (
    <>
      <div className="panel">
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className={c.a === 'r' ? 'r' : ''}>
                    <button type="button" onClick={() => setSort(c.key)}>
                      {c.label}
                      {sort && sort.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, rIdx) => {
                const isFresh = r.id && fresh.indexOf(r.id) >= 0;
                return (
                  <tr key={r.id || rIdx} className={isFresh ? 'fresh' : ''}>
                    {cols.map((c) => {
                      const v = c.render ? c.render(r) : (r as any)[c.key];
                      return (
                        <td key={c.key} className={`${c.a === 'r' ? 'r' : ''} ${c.cls || ''}`}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            {totals && (
              <tfoot>
                <tr>
                  {cols.map((c, i) => {
                    if (i === 0) return <td key={c.key}>Total · {M.fmtNum(data.length)} rows</td>;
                    if (!c.sum) return <td key={c.key} />;
                    const sum = data.reduce((a, r) => a + ((r as any)[c.key] || 0), 0);
                    return (
                      <td key={c.key} className="r">
                        {M.fmt(sum, numbers)}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      {data.length > cap ? (
        <div style={{ marginTop: '11px' }} data-noprint="1">
          <button className="btn" onClick={toggleShowAll}>
            Show all {M.fmtNum(data.length)} rows
          </button>
        </div>
      ) : showAll && data.length > 12 ? (
        <div style={{ marginTop: '11px' }} data-noprint="1">
          <button className="btn" onClick={toggleShowAll}>
            Show fewer
          </button>
        </div>
      ) : null}
    </>
  );
}

export function PageShell({
  title,
  u,
  p,
  acts,
  tools = true,
  toolProps,
  children,
}: {
  title: string;
  u?: string;
  p?: string;
  acts?: React.ReactNode;
  tools?: boolean;
  toolProps?: { search?: boolean; filters?: boolean; period?: boolean };
  children: React.ReactNode;
}) {
  return (
    <div className="page">
      <PrintHead title={title} />
      <div className="phead">
        <div>
          <h1>{title}</h1>
          {u && <span className="u">{u}</span>}
          {p && <p>{p}</p>}
        </div>
        {acts && (
          <div className="acts" data-noprint="1">
            {acts}
          </div>
        )}
      </div>
      {tools && <Toolbar {...toolProps} />}
      {children}
    </div>
  );
}
