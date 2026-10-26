'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import { useApp, editFormFor } from '../context/AppContext';
import { Icon } from './Icons';
import * as M from '../lib/re-data';
import type { TableColumn } from '../lib/types';
import { AttachButton } from './Attachments';
import { BrandMark } from './Brand';
import { DateField } from './DateField';
import { PrintingContext } from './PrintNow';

const Pencil = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11.2 2.6l2.2 2.2-7.6 7.6-2.9.7.7-2.9 7.6-7.6z" />
  </svg>
);

/** Runs a figure up to its value over a moment, so a changed number is noticed. On paper it is
    the value at once: the page is printed as soon as it is put up, and must not catch it part-way. */
function useCountUp(target: number) {
  const still = useContext(PrintingContext);
  const [val, setVal] = useState(target);
  const from = useRef(still ? target : 0);
  useEffect(() => {
    if (still || typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !isFinite(target)) {
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
  }, [target, still]);
  return still ? target : val;
}

function CountFig({ n }: { n: number }) {
  return <Fig n={useCountUp(n)} />;
}

export function Fig({ n, cls = '' }: { n: number; cls?: string }) {
  const { numbers } = useApp();
  const p = M.fmtParts(n, numbers);
  return (
    <span className={`fig ${cls}`}>
      <span className="cur">PKR</span>
      {p.sign}
      {p.num}
      {p.unit ? <span className="unit">{p.unit}</span> : null}
    </span>
  );
}

export function FigText({ str, cls = '' }: { str: string; cls?: string }) {
  // The minus may come before or after the currency; it is shown after it.
  const m = String(str).match(/^(−?)PKR\s+(−?.+?)(?:\s+(Cr|Lakh|B|M|K))?$/);
  if (!m) return <span className={`fig ${cls}`}>{str}</span>;
  return (
    <span className={`fig ${cls}`}>
      <span className="cur">PKR</span>
      {m[1]}
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
  const cls = /Paid|Completed|Posted|Available|^Received/.test(text)
    ? 'ok'
    : /Overdue|Unpaid|Voided/.test(text)
    ? 'bad'
    : /Partial|Partly|To receive|Pending|Process|Reserved|Payment/.test(text)
    ? 'warn'
    : 'mute';
  return <span className={`tag ${cls}`}>{text}</span>;
}

/** How a purchase or sale was paid: one mode, or both modes each with its amount. */
export function PaidBy({ x, total, numbers }: { x: any; total: number; numbers: any }) {
  if (!x.method2 || !x.amount2) return <>{total > 0 ? x.method || '—' : '—'}</>;
  return (
    <span className="paidby">
      <span>
        {x.method} <b className="mono">{M.fmt(Math.max(0, total - x.amount2), numbers)}</b>
      </span>
      <span>
        {x.method2} <b className="mono">{M.fmt(x.amount2, numbers)}</b>
      </span>
    </span>
  );
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
          <DateField className="sm" value={custom.start} max={M.dateInput(M.TODAY)} onChange={(v) => v && setCustom({ ...custom, start: v })} label="Start date" />
          <span className="vs">to</span>
          <DateField className="sm" value={custom.end} max={M.dateInput(M.TODAY)} onChange={(v) => v && setCustom({ ...custom, end: v })} label="End date" />
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

/* The order someone has dragged a table's columns into, remembered in this browser. */
const colOrderKey = (name: string) => 'col-order-v1:' + name;
function loadColOrder(name: string): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(colOrderKey(name)) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** The columns in the order saved: a column not in it (added since) keeps its own place. */
function inOrder<C extends { key: string }>(cols: C[], order: string[]): C[] {
  if (!order.length) return cols;
  const known = order.map((k) => cols.find((c) => c.key === k)).filter(Boolean) as C[];
  const out = known.slice();
  cols.forEach((c, i) => {
    if (order.indexOf(c.key) < 0) out.splice(Math.min(i, out.length), 0, c);
  });
  return out;
}

/** Columns that can be dragged by their heading into another order, remembered under `name` in
    this browser. */
export function useColumnOrder<C extends { key: string }>(name: string, baseCols: C[]) {
  // The column picked up, and where it would land.
  const [order, setOrderState] = useState<string[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ key: string; after: boolean } | null>(null);
  useEffect(() => {
    setOrderState(loadColOrder(name));
  }, [name]);
  const setOrder = (o: string[]) => {
    setOrderState(o);
    try {
      if (o.length) window.localStorage.setItem(colOrderKey(name), JSON.stringify(o));
      else window.localStorage.removeItem(colOrderKey(name));
    } catch {
      /* not remembered */
    }
  };
  const cols = inOrder(baseCols, order);
  const moved = cols.some((c, i) => c.key !== baseCols[i].key);
  const endDrag = () => {
    setDragKey(null);
    setDrop(null);
  };
  /** What a heading needs to be dragged, and to show where a dragged one would land. */
  const headProps = (key: string, cls = '') => ({
    className: [
      cls,
      'th-drag',
      dragKey === key ? 'dragging' : '',
      drop && drop.key === key && dragKey !== key ? (drop.after ? 'drop-after' : 'drop-before') : '',
    ]
      .filter(Boolean)
      .join(' '),
    draggable: true,
    title: 'Drag to move this column',
    onDragStart: (e: React.DragEvent<HTMLTableCellElement>) => {
      setDragKey(key);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', key);
    },
    onDragOver: (e: React.DragEvent<HTMLTableCellElement>) => {
      if (!dragKey) return;
      e.preventDefault();
      const box = e.currentTarget.getBoundingClientRect();
      const after = e.clientX > box.left + box.width / 2;
      if (!drop || drop.key !== key || drop.after !== after) setDrop({ key, after });
    },
    onDrop: (e: React.DragEvent<HTMLTableCellElement>) => {
      e.preventDefault();
      if (dragKey && drop && dragKey !== key) {
        const keys = cols.map((c) => c.key).filter((k) => k !== dragKey);
        keys.splice(keys.indexOf(key) + (drop.after ? 1 : 0), 0, dragKey);
        setOrder(keys);
      }
      endDrag();
    },
    onDragEnd: endDrag,
  });
  return { cols, moved, headProps, reset: () => setOrder([]) };
}

/** A box that scrolls sideways with a second scroll bar above it, so a wide table can be moved
    along without first going down to its last row. The upper bar shows only when it is needed. */
export function TopScroll({ className, children }: { className?: string; children: React.ReactNode }) {
  const top = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(0);
  useEffect(() => {
    const b = box.current;
    if (!b || typeof ResizeObserver === 'undefined') return;
    const measure = () => setWide(b.scrollWidth > b.clientWidth + 1 ? b.scrollWidth : 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(b);
    const t = b.querySelector('table');
    if (t) ro.observe(t);
    return () => ro.disconnect();
  }, []);
  const follow = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (from && to && to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
  };
  return (
    <>
      {wide > 0 && (
        <div className="topscroll" ref={top} data-noprint="1" aria-hidden="true" onScroll={() => follow(top.current, box.current)}>
          <div style={{ width: wide }} />
        </div>
      )}
      <div className={className} ref={box} onScroll={() => follow(box.current, top.current)}>
        {children}
      </div>
    </>
  );
}

export function DataTable<T extends { id?: string }>({
  cols: baseCols,
  rows,
  totals = false,
  attach,
  reorder,
}: {
  cols: TableColumn<T>[];
  rows: T[];
  totals?: boolean;
  /** Ledger these rows belong to: adds a paperclip column for their attachments. */
  attach?: string;
  /** A name to remember the column order under: the column headings can then be dragged into
      another order. */
  reorder?: string;
}) {
  const { page, tab, query, sort, setSort, fresh, showAll, toggleShowAll, numbers, openEdit, deleteRecord } = useApp();
  // Ledgers with an entry form can have their rows corrected, and most can have a row deleted.
  const editable = !!attach && !!editFormFor(attach);
  const deletable = !!attach && M.DELETABLE.indexOf(attach) >= 0;
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Every table's columns can be dragged into another order. A table not given a name is
  // remembered by its page and its first columns, which tell two tables on one page apart.
  const { cols, moved, headProps, reset } = useColumnOrder(
    reorder || `${page}/${tab}:${baseCols.slice(0, 3).map((c) => c.key).join(',')}`,
    baseCols
  );

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
        <TopScroll className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key} {...headProps(c.key, c.a === 'r' ? 'r' : '')}>
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
                    if (i === Math.max(0, cols.findIndex((x) => !x.sum))) return <td key={c.key}>Total · {M.fmtNum(data.length)} rows</td>;
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
        </TopScroll>
      </div>
      <div className="pager" data-noprint="1">
        {(moved || reorder) && (
          <span className="muted pager-hint">
            {moved ? (
              <button type="button" className="link" onClick={reset} title="Put the columns back in their first order">
                Reset column order
              </button>
            ) : (
              'Drag a column heading to move it'
            )}
          </span>
        )}
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
