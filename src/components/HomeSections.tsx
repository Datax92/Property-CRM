'use client';

import React, { useEffect, useState } from 'react';
import { AppIcon } from './AppIcons';
import { Icon } from './Icons';
import { SHORTCUTS, type ShortcutDef } from '../lib/appearance';

/* The home screen as cards under headings: each heading (Sales, Purchases ...) holds the pages
   and the "new entry" buttons that belong together. Headings are renamed, added, removed and
   reordered under "Customize", and cards are dragged from one heading to another. An item is a
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
  const [drag, setDrag] = useState<{ sec: string; idx: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);

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

  // Drop the card being dragged before position `idx` of section `to` (at the end when idx is null).
  const drop = (to: string, idx: number | null) => {
    if (!drag) return;
    const from = sections.find((s) => s.id === drag.sec);
    if (!from) return;
    const item = from.items[drag.idx];
    let next = sections.map((s) => (s.id === drag.sec ? { ...s, items: s.items.filter((_, i) => i !== drag.idx) } : s));
    next = next.map((s) => {
      if (s.id !== to) return s;
      const items = s.items.slice();
      let at = idx == null ? items.length : idx;
      if (to === drag.sec && idx != null && idx > drag.idx) at -= 1;
      items.splice(at, 0, item);
      return { ...s, items };
    });
    setDrag(null);
    setOver(null);
    commit(next);
  };

  const pickerSection = sections.find((s) => s.id === picker);
  const placed = new Set(sections.flatMap((s) => s.items));
  const candidates = [
    ...Object.keys(tiles),
    ...SHORTCUTS.map((s) => 'sc:' + s.id),
  ].filter((x) => allowed(x) && !(pickerSection && pickerSection.items.includes(x)));
  // Items on no heading yet come first.
  candidates.sort((a, b) => Number(placed.has(a)) - Number(placed.has(b)));

  // A plain render function, not a component: the card must not remount while it is being dragged.
  const card = (item: string, sec: string, idx: number) => {
    const sc = shortcutOf(item);
    const t = sc ? null : tiles[item];
    if (!sc && !t) return null;
    const label = sc ? sc.label : t!.label;
    const sub = sc ? sc.sub : t!.value;
    const icon = sc ? sc.icon : t!.icon;
    const dragging = drag && drag.sec === sec && drag.idx === idx;
    return (
      <div
        key={item + ':' + idx}
        className={`hcard-cell ${over === sec + ':' + idx ? 'over' : ''} ${dragging ? 'lifted' : ''}`}
        draggable={editing}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', item);
          setDrag({ sec, idx });
        }}
        onDragEnd={() => {
          setDrag(null);
          setOver(null);
        }}
        onDragOver={(e) => {
          if (!drag) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(sec + ':' + idx);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          drop(sec, idx);
        }}
      >
        <button
          type="button"
          className={`hcard ${sc ? 'act' : ''}`}
          title={sub ? `${label} — ${sub}` : label}
          onClick={() => {
            if (editing) return;
            if (sc) runShortcut(sc);
            else openTile(t!);
          }}
        >
          <span className="hcard-ic">
            <AppIcon name={icon} size={view === 'big' ? 40 : 30} />
            {sc && (
              <span className="hcard-plus" aria-hidden="true">
                <Icon name="plus" size={10} />
              </span>
            )}
          </span>
          <span className="hcard-t">
            <b>{label}</b>
            {view === 'big' && sub && <small>{sub}</small>}
          </span>
        </button>
        {editing && (
          <button
            type="button"
            className="tile-x hcard-x"
            aria-label={`Remove ${label} from this heading`}
            onClick={() => patch(sec, (s) => ({ ...s, items: s.items.filter((_, i) => i !== idx) }))}
          >
            ×
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`hsections ${view === 'big' ? 'big' : ''} ${editing ? 'editing' : ''}`}>
      {sections.map((s, si) => {
        const items = s.items.filter(allowed);
        if (!editing && !items.length) return null;
        return (
          <section
            key={s.id}
            className={`hsec ${over === s.id ? 'over' : ''}`}
            onDragOver={(e) => {
              if (!drag) return;
              e.preventDefault();
              setOver(s.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              drop(s.id, null);
            }}
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
                        <b>{sc ? sc.label : t!.label}</b>
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
