'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from './AppIcons';
import { Icon } from './Icons';
import { SHORTCUTS, type ShortcutDef } from '../lib/appearance';

/* The home screen as cards under headings: each heading (Sales, Purchases ...) holds the pages
   and the "new entry" buttons that belong together. Headings are renamed, added, removed and
   reordered under "Customize". Cards are dragged within and between headings — with a mouse at
   any time, with a finger under "Customize" (so the page still scrolls). An item is a
   page tile id, or "sc:<shortcut id>" for a button that opens a new entry. Kept in this browser. */

export interface HomeTile {
  icon: string;
  label: string;
  value?: string;
  go: string;
  need?: string;
  before?: () => void;
}
export interface HomeSection {
  id: string;
  title: string;
  items: string[];
}
export type HomeView = 'icons' | 'cards' | 'big';
type Spot = { sec: string; idx: number | null; after: boolean };

const SECTIONS_KEY = 'home-sections-v1';
const VIEW_KEY = 'home-view-v1';

export const DEFAULT_SECTIONS: HomeSection[] = [
  {
    id: 'sales',
    title: 'Sales',
    items: ['sc:sale', 'sales', 'sc:proforma', 'proforma', 'sc:saleInvoice', 'saleInvoice', 'receivables', 'commission', 'agents', 'mirrorSaleInvoices'],
  },
  {
    id: 'purchases',
    title: 'Purchases & stock',
    items: ['sc:property', 'purchase', 'inventory', 'sc:purchaseInvoice', 'purchaseInvoice', 'sc:costSheet', 'costSheets', 'projects', 'mirrorPurchaseInvoices', 'mirrorSheets'],
  },
  {
    id: 'money',
    title: 'Money',
    items: ['cash', 'sc:payment', 'expenses', 'sc:expense', 'finance', 'assets', 'tax', 'sc:tax', 'zakat', 'charity'],
  },
  { id: 'reports', title: 'Reports', items: ['dashboard', 'pnl', 'gross', 'net', 'fiscal'] },
  { id: 'office', title: 'Office', items: ['tasks', 'sc:task', 'admin', 'appearance', 'account'] },
];

const copyDefault = () => DEFAULT_SECTIONS.map((s) => ({ ...s, items: s.items.slice() }));

export function loadHomeView(): HomeView {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    return v === 'cards' || v === 'big' ? v : 'icons';
  } catch {
    return 'icons';
  }
}
export function saveHomeView(v: HomeView) {
  try {
    window.localStorage.setItem(VIEW_KEY, v);
  } catch {
    /* not remembered */
  }
}
function loadSections(): HomeSection[] {
  try {
    const raw = window.localStorage.getItem(SECTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s: any) => s && typeof s.id === 'string' && Array.isArray(s.items))
        .map((s: any) => ({ id: s.id, title: String(s.title || ''), items: s.items.filter((x: any) => typeof x === 'string') }));
    }
  } catch {
    /* storage blocked or corrupt */
  }
  return copyDefault();
}
function saveSections(list: HomeSection[]) {
  try {
    window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(list));
  } catch {
    /* not remembered */
  }
}

/** Buttons that start a new entry are named for what they do, so they read apart from the pages. */
const ACTION_LABELS: Record<string, string> = {
  sale: 'Record a sale', proforma: 'New proforma', saleInvoice: 'New sale invoice', purchaseInvoice: 'New purchase invoice',
  property: 'Add a purchase', costSheet: 'New cost sheet', expense: 'Add an expense', asset: 'Add an asset',
  payment: 'Record a payment', task: 'New task', tax: 'Add a tax entry', zakat: 'Record Zakat', salary: 'Pay a salary',
  bill: 'Add a bill', agent: 'Add an agent',
};
const actionLabel = (s: ShortcutDef) => ACTION_LABELS[s.id] || s.label;

const shortcutOf = (item: string) => (item.startsWith('sc:') ? SHORTCUTS.find((s) => s.id === item.slice(3)) : undefined);

export function HomeSections({
  tiles,
  view,
  editing,
  denied,
  openTile,
  runShortcut,
  resetKey,
}: {
  tiles: Record<string, HomeTile>;
  view: HomeView;
  editing: boolean;
  denied: (need?: string) => boolean;
  openTile: (t: HomeTile) => void;
  runShortcut: (s: ShortcutDef) => void;
  /** Bumped by the page's "Reset" button: the headings go back to the standard ones. */
  resetKey: number;
}) {
  // Read after mounting: the server render has no access to this browser's storage.
  const [sections, setSections] = useState<HomeSection[]>(copyDefault);
  useEffect(() => setSections(loadSections()), []);
  useEffect(() => {
    if (!resetKey) return;
    const d = copyDefault();
    setSections(d);
    saveSections(d);
  }, [resetKey]);

  const [picker, setPicker] = useState<string | null>(null);
  // The card being carried, where the pointer is, and the place it would land.
  const [drag, setDrag] = useState<{ sec: string; idx: number; x: number; y: number; w: number; over: Spot | null } | null>(null);
  const pending = useRef<{ sec: string; idx: number; x: number; y: number; w: number; id: number } | null>(null);
  const justDragged = useRef(false);

  const commit = (next: HomeSection[]) => {
    setSections(next);
    saveSections(next);
  };
  const patch = (id: string, fn: (s: HomeSection) => HomeSection) => commit(sections.map((s) => (s.id === id ? fn(s) : s)));

  const allowed = (item: string) => {
    const sc = shortcutOf(item);
    if (sc) return !denied(sc.need);
    const t = tiles[item];
    return !!t && !denied(t.need);
  };

  const moveSection = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= sections.length) return;
    const next = sections.slice();
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const addSection = () => {
    const id = 'sec-' + Date.now().toString(36);
    commit([...sections, { id, title: 'New heading', items: [] }]);
  };

  // Move card `idx` of section `from` to position `at` of section `to` (at the end when at is null).
  const move = (from: string, idx: number, to: string, at: number | null) => {
    const src = sections.find((x) => x.id === from);
    if (!src) return;
    const item = src.items[idx];
    let next = sections.map((x) => (x.id === from ? { ...x, items: x.items.filter((_, i) => i !== idx) } : x));
    next = next.map((x) => {
      if (x.id !== to) return x;
      const items = x.items.slice();
      let pos = at == null ? items.length : at;
      if (to === from && at != null && at > idx) pos -= 1;
      items.splice(pos, 0, item);
      return { ...x, items };
    });
    commit(next);
  };

  // What is under the pointer: a card (land before or after it, by which half) or a heading's empty space.
  const spotAt = (x: number, y: number): Spot | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el && (el.closest('[data-hcard]') as HTMLElement | null);
    if (cell) {
      const r = cell.getBoundingClientRect();
      return { sec: cell.dataset.sec as string, idx: +(cell.dataset.hcard as string), after: x > r.left + r.width / 2 };
    }
    const sec = el && (el.closest('[data-hsec]') as HTMLElement | null);
    return sec ? { sec: sec.dataset.hsec as string, idx: null, after: false } : null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>, sec: string, idx: number) => {
    // A mouse can drag at any time; on a touch screen dragging is for "Customize", so scrolling still works.
    if (e.button !== 0 || (!editing && e.pointerType !== 'mouse')) return;
    const w = e.currentTarget.getBoundingClientRect().width;
    pending.current = { sec, idx, x: e.clientX, y: e.clientY, w, id: e.pointerId };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pending.current;
      if (!p || e.pointerId !== p.id) return;
      if (!drag && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      e.preventDefault();
      setDrag({ sec: p.sec, idx: p.idx, x: e.clientX, y: e.clientY, w: p.w, over: spotAt(e.clientX, e.clientY) });
    };
    const onUp = (e: PointerEvent) => {
      const p = pending.current;
      if (!p || e.pointerId !== p.id) return;
      pending.current = null;
      if (!drag) return;
      const to = spotAt(e.clientX, e.clientY);
      setDrag(null);
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), 0);
      if (!to) return;
      move(p.sec, p.idx, to.sec, to.idx == null ? null : to.idx + (to.after ? 1 : 0));
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  });

  const pickerSection = sections.find((s) => s.id === picker);
  const placed = new Set(sections.flatMap((s) => s.items));
  const candidates = [
    ...Object.keys(tiles),
    ...SHORTCUTS.map((s) => 'sc:' + s.id),
  ].filter((x) => allowed(x) && !(pickerSection && pickerSection.items.includes(x)));
  // Items on no heading yet come first.
  candidates.sort((a, b) => Number(placed.has(a)) - Number(placed.has(b)));

  const cardParts = (item: string) => {
    const sc = shortcutOf(item);
    const t = sc ? null : tiles[item];
    if (!sc && !t) return null;
    return { sc, t, label: sc ? actionLabel(sc) : t!.label, sub: sc ? sc.sub : t!.value, icon: sc ? sc.icon : t!.icon };
  };
  const cardFace = (c: NonNullable<ReturnType<typeof cardParts>>) => (
    <>
      <span className="hcard-ic">
        <AppIcon name={c.icon} size={view === 'big' ? 40 : 30} />
        {c.sc && (
          <span className="hcard-plus" aria-hidden="true">
            <Icon name="plus" size={10} />
          </span>
        )}
      </span>
      <span className="hcard-t">
        <b>{c.label}</b>
        {view === 'big' && c.sub && <small>{c.sub}</small>}
      </span>
    </>
  );

  // A plain render function, not a component: the card must not remount while it is being dragged.
  const card = (item: string, sec: string, idx: number) => {
    const c = cardParts(item);
    if (!c) return null;
    const o = drag && drag.over;
    const self = !!drag && drag.sec === sec && drag.idx === idx;
    const mark = o && o.sec === sec && o.idx === idx && !self ? (o.after ? 'over-after' : 'over') : '';
    return (
      <div key={item + ':' + idx} data-hcard={idx} data-sec={sec} className={`hcard-cell ${mark} ${self ? 'lifted' : ''}`}>
        <button
          type="button"
          className={`hcard ${c.sc ? 'act' : ''}`}
          title={c.sub ? `${c.label} — ${c.sub}` : c.label}
          onPointerDown={(e) => onPointerDown(e, sec, idx)}
          onClick={() => {
            if (editing || justDragged.current) return;
            if (c.sc) runShortcut(c.sc);
            else openTile(c.t!);
          }}
        >
          {cardFace(c)}
        </button>
        {editing && (
          <button
            type="button"
            className="tile-x hcard-x"
            aria-label={`Remove ${c.label} from this heading`}
            onClick={() => patch(sec, (s) => ({ ...s, items: s.items.filter((_, i) => i !== idx) }))}
          >
            ×
          </button>
        )}
      </div>
    );
  };

  const carried = drag ? cardParts((sections.find((x) => x.id === drag.sec) || { items: [] as string[] }).items[drag.idx]) : null;

  return (
    <div className={`hsections ${view === 'big' ? 'big' : ''} ${editing ? 'editing' : ''} ${drag ? 'dragging' : ''}`}>
      {sections.map((s, si) => {
        const items = s.items.filter(allowed);
        if (!editing && !items.length) return null;
        return (
          <section
            key={s.id}
            data-hsec={s.id}
            className={`hsec ${drag && drag.over && drag.over.sec === s.id ? 'over' : ''}`}
          >
            <div className="hsec-h">
              {editing ? (
                <>
                  <input
                    className="hsec-title-in"
                    value={s.title}
                    placeholder="Heading"
                    aria-label="Heading name"
                    onChange={(e) => patch(s.id, (x) => ({ ...x, title: e.target.value }))}
                  />
                  <span className="spacer" />
                  <button type="button" className="iconbtn" onClick={() => moveSection(si, -1)} disabled={si === 0} aria-label="Move this heading up">
                    <Icon name="move-up" />
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => moveSection(si, 1)}
                    disabled={si === sections.length - 1}
                    aria-label="Move this heading down"
                  >
                    <Icon name="move-down" />
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => commit(sections.filter((x) => x.id !== s.id))}
                    aria-label={`Remove the heading ${s.title}`}
                    title="Remove this heading (its cards stay available under + Add)"
                  >
                    <Icon name="trash" />
                  </button>
                </>
              ) : (
                <h2 className="hsec-title">{s.title}</h2>
              )}
            </div>
            <div className="hgrid">
              {s.items.map((item, idx) => (allowed(item) ? card(item, s.id, idx) : null))}
              {editing && (
                <button type="button" className="hcard-add" onClick={() => setPicker(s.id)}>
                  <Icon name="plus" /> Add
                </button>
              )}
            </div>
          </section>
        );
      })}

      {editing && (
        <button type="button" className="btn hsec-new" onClick={addSection}>
          <Icon name="plus" /> Add a heading
        </button>
      )}

      {/* The card being carried. It lives on <body> so nothing on the page can pin it in place. */}
      {drag &&
        carried &&
        createPortal(
          <div className={`hcard-ghost ${view === 'big' ? 'big' : ''}`} style={{ left: drag.x, top: drag.y, width: drag.w }} aria-hidden="true">
            <div className={`hcard ${carried.sc ? 'act' : ''}`}>{cardFace(carried)}</div>
          </div>,
          document.body
        )}

      {pickerSection && (
        <div className="overlay" onClick={() => setPicker(null)}>
          <div className="modal tile-picker" role="dialog" aria-modal="true" aria-label="Add a card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <div>
                <h2>Add to “{pickerSection.title || 'Heading'}”</h2>
                <p>Pages open a register or report; buttons marked + start a new entry.</p>
              </div>
              <button type="button" className="x" onClick={() => setPicker(null)} aria-label="Close">
                <Icon name="x" />
              </button>
            </div>
            <div className="modal-b">
              <div className="hgrid picker">
                {candidates.map((item) => {
                  const sc = shortcutOf(item);
                  const t = sc ? null : tiles[item];
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`hcard ${sc ? 'act' : ''}`}
                      onClick={() => {
                        patch(pickerSection.id, (x) => ({ ...x, items: [...x.items, item] }));
                        setPicker(null);
                      }}
                    >
                      <span className="hcard-ic">
                        <AppIcon name={sc ? sc.icon : t!.icon} size={28} />
                        {sc && (
                          <span className="hcard-plus" aria-hidden="true">
                            <Icon name="plus" size={10} />
                          </span>
                        )}
                      </span>
                      <span className="hcard-t">
                        <b>{sc ? actionLabel(sc) : t!.label}</b>
                        <small>{sc ? sc.sub : placed.has(item) ? 'Also under another heading' : 'Page'}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
