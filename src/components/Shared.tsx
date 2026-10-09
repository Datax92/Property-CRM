'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp, editFormFor } from '../context/AppContext';
import { Icon } from './Icons';
import * as M from '../lib/re-data';
import type { TableColumn } from '../lib/types';
import { AttachButton } from './Attachments';
import { BrandMark } from './Brand';

const Pencil = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11.2 2.6l2.2 2.2-7.6 7.6-2.9.7.7-2.9 7.6-7.6z" />
  </svg>
);

/** Runs a figure up to its value over a moment, so a changed number is noticed. */
function useCountUp(target: number) {
  const [val, setVal] = useState(target);
  const from = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !isFinite(target)) {
      from.current = target;
      setVal(target);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 550);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = target;
    };
  }, [target]);
  return val;
}

function CountFig({ n }: { n: number }) {
  return <Fig n={useCountUp(n)} />;
}

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

/** What a mirror changed from its original, or that it matches it. */
export function MirrorChanges({ edits, label }: { edits?: string[]; label: (key: string) => string }) {
  if (!edits || !edits.length) return <span className="tag ok">Same as original</span>;
  const names = edits.map(label);
  return (
    <span className="tag warn" title={'Changed on this mirror: ' + names.join(', ')}>
      {names.slice(0, 2).join(', ')}
      {names.length > 2 ? ` +${names.length - 2} more` : ''}
    </span>
  );
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
      <span className={`v ${tone}`}>{raw != null ? <FigText str={raw} /> : <CountFig n={v || 0} />}</span>
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
      <div className="print-head-brand">
        <BrandMark size={34} />
        <div className="co">{M.COMPANY}</div>
      </div>
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
  attach,
}: {
  cols: TableColumn<T>[];
  rows: T[];
  totals?: boolean;
  /** Ledger these rows belong to: adds a paperclip column for their attachments. */
  attach?: string;
}) {
  const { query, sort, setSort, fresh, showAll, toggleShowAll, numbers, openEdit, deleteRecord } = useApp();
  // Ledgers with an entry form can have their rows corrected, and most can have a row deleted.
  const editable = !!attach && !!editFormFor(attach);
  const deletable = !!attach && M.DELETABLE.indexOf(attach) >= 0;
  const [confirmId, setConfirmId] = useState<string | null>(null);

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
                {(editable || deletable) && <th data-noexport="1" data-noprint="1" aria-label="Edit or delete" />}
                {attach && (
                  <th data-noexport="1" data-noprint="1">
                    Files
                  </th>
                )}
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
                    {(editable || deletable) && (
                      <td data-noexport="1" data-noprint="1" className="nowrap">
                        {!r.id ? null : confirmId === r.id ? (
                          <span className="task-confirm">
                            Delete {r.id}?
                            <button
                              type="button"
                              className="btn sm bad"
                              onClick={() => {
                                deleteRecord(attach as string, r.id as string);
                                setConfirmId(null);
                              }}
                            >
                              Yes, delete
                            </button>
                            <button type="button" className="btn sm" onClick={() => setConfirmId(null)}>
                              No
                            </button>
                          </span>
                        ) : (
                          <span className="rowacts">
                            {editable && (
                              <button type="button" className="btn sm" title={`Edit ${r.id}`} onClick={() => openEdit(attach as string, r.id as string)}>
                                <Pencil /> Edit
                              </button>
                            )}
                            {deletable && (
                              <button type="button" className="btn sm gh" title={`Delete ${r.id}`} aria-label={`Delete ${r.id}`} onClick={() => setConfirmId(r.id as string)}>
                                <Icon name="trash" size={12} />
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    )}
                    {attach && (
                      <td data-noexport="1" data-noprint="1">
                        {r.id ? <AttachButton coll={attach} id={r.id} /> : null}
                      </td>
                    )}
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
                  {(editable || deletable) && <td data-noexport="1" data-noprint="1" />}
                  {attach && <td data-noexport="1" data-noprint="1" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <div className="pager" data-noprint="1">
        <span>
          1-{M.fmtNum(shown.length)} / {M.fmtNum(data.length)}
        </span>
        {data.length > cap ? (
          <button className="btn sm" onClick={toggleShowAll}>
            Show all
          </button>
        ) : showAll && data.length > 12 ? (
          <button className="btn sm" onClick={toggleShowAll}>
            Show fewer
          </button>
        ) : null}
      </div>
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
      <div className="phead cp">
        {acts && (
          <div className="acts" data-noprint="1">
            {acts}
          </div>
        )}
        <div className="ptitle">
          <h1>
            {title}
            {u && <span className="u">{u}</span>}
          </h1>
          {p && <p>{p}</p>}
        </div>
        {tools && <Toolbar {...toolProps} />}
      </div>
      {children}
    </div>
  );
}
