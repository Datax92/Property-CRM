'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { AppIcon } from '../AppIcons';
import { Icon } from '../Icons';
import DotField from '../effects/DotField';
import * as M from '../../lib/re-data';

interface Tile {
  icon: string;
  label: string;
  /** Live figure for the period, shown on the tile's tooltip. */
  value?: string;
  go: string;
  need?: string;
  before?: () => void;
}

/* The home layout is a list of grid cells, each holding a tile ID or nothing. Dragging a tile
   drops it into the cell under the pointer (swapping with whatever was there), so tiles always
   sit on the grid. The layout is kept in this browser. */
const LAYOUT_KEY = 'home-layout-v2';
const DEFAULT_LAYOUT = [
  'dashboard', 'pnl', 'sales', 'purchase', 'cash', 'expenses',
  'tasks', 'proforma', 'saleInvoice', 'purchaseInvoice', 'costSheets', 'projects',
  'tax', 'zakat', 'charity', 'commission', 'inventory', 'assets',
  'gross', 'net', 'receivables', 'agents', 'finance', 'admin',
  'fiscal', 'account',
];
/** Cells kept free at the end, so there is always room to drop or add a tile. */
const SPARE = 6;

function loadLayout(): (string | null)[] {
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed.map((x) => (typeof x === 'string' ? x : null));
  } catch {
    /* storage blocked or corrupt: fall back to the default */
  }
  return DEFAULT_LAYOUT.slice();
}

function saveLayout(cells: (string | null)[]) {
  try {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(cells));
  } catch {
    /* the layout simply is not remembered */
  }
}

/** Trim empty cells off the end, then leave SPARE free cells (rounded up to a full row of 6). */
function withSpare(cells: (string | null)[]) {
  const out = cells.slice();
  while (out.length && out[out.length - 1] == null) out.pop();
  const target = Math.ceil((out.length + SPARE) / 6) * 6;
  while (out.length < target) out.push(null);
  return out;
}

/** Home: premium shortcuts on top, then one large icon per area of the business. */
export function HomePage() {
  const { effectiveFilters: f, range: r, numbers, grossBasis, goto, denied, setRangeKey, openModal } = useApp();

  const k = M.computeKPIs(r, f);
  // Same profit basis as the dashboard and the P&L, so the three never disagree.
  const bv = M.basisView(k, grossBasis);
  const cash = M.cashLedger(r, f);
  const sheets: any[] = M.dealSheets();
  const sheetSales = sheets.reduce((a, s) => a + (s.grossSalePrice || 0), 0);
  const sheetGross = sheets.reduce((a, s) => a + (s.grossProfit || 0), 0);
  const grossPct = sheetSales > 0 ? M.pctOf(sheetGross, sheetSales) : bv.grossMargin;
  const charity = M.charityRows(r).reduce((a: number, x: any) => a + x.amount, 0);
  const invoices = (kind: string) => M.DATA.invoices.filter((i: any) => i.type === kind).length;
  const projects = M.projectSummary(r, f).filter((p: any) => p.total > 0).length;
  const alerts = M.alerts().filter((a: any) => !denied(a.view));
  const openTasks = M.DATA.tasks.filter((t: any) => ['Completed', 'Cancelled'].indexOf(M.taskStatus(t)) < 0).length;
  const assetsHeld = M.DATA.expenses.filter((e: any) => e.group === 'Assets').reduce((a: number, e: any) => a + e.amount, 0);

  const money = (n: number) => M.fmt(n, numbers);
  const pct = (n: number) => `${n.toFixed(1)}%`;
  const count = (n: number, one: string, many: string) => `${M.fmtNum(n)} ${n === 1 ? one : many}`;

  const TILES: Record<string, Tile> = {
    dashboard: { icon: 'dashboard', label: 'Dashboard', value: 'Graphs & comparison', go: 'dashboard/overview' },
    pnl: { icon: 'pnl', label: 'Profit / Loss', value: money(bv.net), go: 'finance/pnl', need: 'pnl' },
    sales: { icon: 'sales', label: 'Total Sales', value: money(k.salesRevenue), go: 'sales/register' },
    purchase: { icon: 'purchase', label: 'Total Purchase', value: money(k.purchaseCost), go: 'properties/purchases', need: 'purchases' },
    cash: { icon: 'cash', label: 'Cash in Hand', value: money(cash.closing), go: 'finance/cashflow', need: 'cashflow' },
    expenses: { icon: 'expenses', label: 'Expenses', value: money(k.totalExpenses), go: 'costs/expenses', need: 'expenses' },
    tasks: { icon: 'tasks', label: 'Tasks', value: count(openTasks, 'task to do', 'tasks to do'), go: 'tasks/list' },
    proforma: { icon: 'proforma', label: 'Proforma Invoices', value: count(invoices('proforma'), 'invoice', 'invoices'), go: 'sales/proformaInvoices' },
    saleInvoice: { icon: 'saleInvoice', label: 'Sale Invoices', value: count(invoices('sale'), 'invoice', 'invoices'), go: 'sales/saleInvoices' },
    purchaseInvoice: { icon: 'purchaseInvoice', label: 'Purchase Invoices', value: count(invoices('purchase'), 'invoice', 'invoices'), go: 'sales/purchaseInvoices' },
    costSheets: { icon: 'landed', label: 'Cost Sheets', value: count(sheets.length, 'deal', 'deals'), go: 'trading/sheets' },
    projects: { icon: 'projects', label: 'Projects', value: count(projects, 'active project', 'active projects'), go: 'properties/projects' },
    tax: { icon: 'tax', label: 'Taxes & CGT', value: money(k.tax), go: 'costs/tax', need: 'tax' },
    zakat: { icon: 'zakat', label: 'Zakat', value: money(k.zakatRemaining) + ' due', go: 'costs/zakat', need: 'zakat' },
    charity: { icon: 'charity', label: 'Charity', value: money(charity), go: 'costs/charity' },
    commission: { icon: 'commission', label: 'Agent Commission', value: money(k.commission), go: 'agents/commissions' },
    inventory: { icon: 'inventory', label: 'Inventory', value: count(k.counts.unsold, 'property held', 'properties held'), go: 'properties/inventory' },
    assets: { icon: 'assets', label: 'Assets', value: money(assetsHeld), go: 'finance/assets', need: 'pnl' },
    gross: { icon: 'gross', label: 'Gross Margin', value: pct(grossPct), go: 'trading/analytics' },
    net: { icon: 'net', label: 'Net Margin %', value: pct(bv.netMargin), go: 'finance/profit', need: 'profit' },
    receivables: { icon: 'receivables', label: 'Receivables', value: money(k.receivable) + ' to collect', go: 'sales/receivables', need: 'receivables' },
    agents: { icon: 'agents', label: 'Agents', value: count(M.DATA.agents.length, 'agent', 'agents'), go: 'agents/directory', need: 'agents' },
    finance: { icon: 'finance', label: 'Payables', value: money(k.payable) + ' payable', go: 'finance/payables', need: 'payables' },
    admin: { icon: 'admin', label: 'Admin', value: 'Transactions & audit', go: 'admin/transactions', need: 'transactions' },
    fiscal: {
      icon: 'fiscal',
      label: 'Financial Year',
      value: M.rangeFor('thisFiscalYear').label + ' (Jul–Jun)',
      go: 'finance/pnl',
      need: 'pnl',
      before: () => setRangeKey('thisFiscalYear'),
    },
    account: { icon: 'account', label: 'My Account', value: 'Profile & sign out', go: 'account' },
  };

  // The layout is read after mounting: the server render has no access to this browser's storage.
  const [cells, setCells] = useState<(string | null)[]>(() => withSpare(DEFAULT_LAYOUT));
  useEffect(() => {
    setCells(withSpare(loadLayout().filter((id) => id == null || TILES[id])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const commit = useCallback((next: (string | null)[]) => {
    const tidy = withSpare(next);
    setCells(tidy);
    saveLayout(tidy);
  }, []);

  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ from: number; over: number | null; x: number; y: number } | null>(null);
  const pending = useRef<{ from: number; x: number; y: number; id: number } | null>(null);
  const justDragged = useRef(false);

  const visible = (id: string | null) => !!id && !!TILES[id] && !denied(TILES[id].need);
  const hidden = Object.keys(TILES).filter((id) => !cells.includes(id) && !denied(TILES[id].need));

  const cellAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el && (el.closest('[data-cell]') as HTMLElement | null);
    return cell ? +(cell.dataset.cell as string) : null;
  };

  const onPointerDown = (e: React.PointerEvent, i: number) => {
    // A mouse can drag at any time; on a touch screen dragging is for "Customize", so scrolling still works.
    if (e.button !== 0 || (!editing && e.pointerType !== 'mouse')) return;
    pending.current = { from: i, x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = pending.current;
      if (!p || e.pointerId !== p.id) return;
      if (!drag && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      e.preventDefault();
      setDrag({ from: p.from, over: cellAt(e.clientX, e.clientY), x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => {
      const p = pending.current;
      if (!p || e.pointerId !== p.id) return;
      pending.current = null;
      if (!drag) return;
      const to = cellAt(e.clientX, e.clientY);
      setDrag(null);
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), 0);
      if (to == null || to === p.from) return;
      const next = cells.slice();
      [next[p.from], next[to]] = [next[to], next[p.from]];
      commit(next);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, cells, commit]);

  const open = (t: Tile) => {
    if (justDragged.current || editing) return;
    if (t.before) t.before();
    goto(t.go);
  };

  const remove = (i: number) => {
    const next = cells.slice();
    next[i] = null;
    commit(next);
  };

  const add = (id: string) => {
    if (picker == null) return;
    const next = cells.slice();
    next[picker] = id;
    commit(next);
    setPicker(null);
  };

  const dragTile = drag ? cells[drag.from] : null;
  // Outside "Customize" and dragging, the spare places after the last icon are not drawn at all.
  let lastFilled = cells.length - 1;
  while (lastFilled >= 0 && !(cells[lastFilled] && visible(cells[lastFilled]))) lastFilled--;

  return (
    <div className="page o-home">
      <DotField />

      {/* Premium shortcuts: the three documents made most often. */}
      <div className="shortcuts" data-noprint="1">
        <button type="button" className="shortcut sc-proforma" onClick={() => openModal('proformaInvoice')}>
          <span className="sc-ic"><AppIcon name="proforma" size={30} /></span>
          <span className="sc-t">
            <b>Proforma</b>
            <small>Quotation for a buyer</small>
          </span>
          <span className="sc-plus"><Icon name="plus" /></span>
        </button>
        <button type="button" className="shortcut sc-sale" onClick={() => openModal('saleInvoice')}>
          <span className="sc-ic"><AppIcon name="saleInvoice" size={30} /></span>
          <span className="sc-t">
            <b>Sale Invoice</b>
            <small>Receipt to the buyer</small>
          </span>
          <span className="sc-plus"><Icon name="plus" /></span>
        </button>
        <button type="button" className="shortcut sc-purchase" onClick={() => openModal('purchaseInvoice')}>
          <span className="sc-ic"><AppIcon name="purchaseInvoice" size={30} /></span>
          <span className="sc-t">
            <b>Purchase Invoice</b>
            <small>Payment to a seller</small>
          </span>
          <span className="sc-plus"><Icon name="plus" /></span>
        </button>
      </div>

      {alerts.length > 0 && (
        <button type="button" className="home-alert" data-noprint="1" onClick={() => goto('dashboard/alerts')}>
          <b>
            {M.fmtNum(alerts.length)} {alerts.length === 1 ? 'item needs' : 'items need'} attention.
          </b>{' '}
          {alerts[0].title}: {alerts[0].detail}
        </button>
      )}

      <div className="launch-bar" data-noprint="1">
        <span className="kicker">{editing ? 'Drag icons to move them · × removes · + adds' : 'Your apps'}</span>
        <span className="spacer" />
        {editing && (
          <button type="button" className="btn sm" onClick={() => commit(DEFAULT_LAYOUT.slice())}>
            Reset
          </button>
        )}
        <button type="button" className={`btn sm ${editing ? 'pri' : ''}`} onClick={() => { setEditing(!editing); setPicker(null); }}>
          {editing ? <><Icon name="ok" /> Done</> : <><Icon name="grid" /> Customize</>}
        </button>
      </div>

      <nav className={`launch ${editing ? 'editing' : ''} ${drag ? 'dragging' : ''}`} aria-label="All sections">
        {(editing || drag ? cells : cells.slice(0, lastFilled + 1)).map((id, i) => {
          const t = id && visible(id) ? TILES[id] : null;
          const isOver = drag && drag.over === i && drag.from !== i;
          if (!t) {
            return (
              <div key={'empty-' + i} data-cell={i} className={`cell empty ${isOver ? 'over' : ''}`}>
                {editing && (
                  <button type="button" className="cell-add" onClick={() => setPicker(i)} aria-label="Add an icon here" disabled={!hidden.length}>
                    <Icon name="plus" />
                  </button>
                )}
              </div>
            );
          }
          return (
            <div key={id} data-cell={i} className={`cell ${isOver ? 'over' : ''} ${drag && drag.from === i ? 'lifted' : ''}`}>
              <button
                type="button"
                className="tile"
                title={t.value ? `${t.label} — ${t.value}` : t.label}
                style={{ '--i': i } as React.CSSProperties}
                onPointerDown={(e) => onPointerDown(e, i)}
                onClick={() => open(t)}
              >
                <span className="tile-ic">
                  <AppIcon name={t.icon} />
                </span>
                <span className="tile-l">{t.label}</span>
              </button>
              {editing && (
                <button type="button" className="tile-x" onClick={() => remove(i)} aria-label={`Remove ${t.label}`}>
                  ×
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {/* The icon being carried. It lives on <body> so nothing on the page can pin it in place. */}
      {drag &&
        dragTile &&
        TILES[dragTile] &&
        createPortal(
          <div className="tile-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
            <span className="tile-ic">
              <AppIcon name={TILES[dragTile].icon} />
            </span>
            <span className="tile-l">{TILES[dragTile].label}</span>
          </div>,
          document.body
        )}

      {picker != null && (
        <div className="overlay" onClick={() => setPicker(null)}>
          <div className="modal tile-picker" role="dialog" aria-modal="true" aria-label="Add an icon" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <div>
                <h2>Add an icon</h2>
                <p>Pick the icon to put in this place.</p>
              </div>
              <button type="button" className="x" onClick={() => setPicker(null)} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="modal-b">
              <div className="picker-grid">
                {hidden.map((id) => (
                  <button key={id} type="button" className="tile" onClick={() => add(id)}>
                    <span className="tile-ic">
                      <AppIcon name={TILES[id].icon} />
                    </span>
                    <span className="tile-l">{TILES[id].label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
