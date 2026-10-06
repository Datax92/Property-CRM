'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DEFAULT_LOOK, applyLook, loadLook, saveLook, surpriseLook, type Look } from '../lib/appearance';

interface AppearanceValue {
  look: Look;
  /** Change part of the look; the previous look can be brought back with undo. */
  update: (patch: Partial<Look>) => void;
  surprise: () => void;
  undo: () => void;
  canUndo: boolean;
  reset: () => void;
}

const Ctx = createContext<AppearanceValue | null>(null);

/** The look of the app, kept in this browser and applied to the whole page. */
export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  // Null until the saved look has been read. The server render cannot see this browser's
  // storage, and nothing may be saved before it is read, or the default would overwrite it.
  const [stored, setLook] = useState<Look | null>(null);
  const look = stored || DEFAULT_LOOK;
  const history = useRef<Look[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    setLook(loadLook());
  }, []);

  useEffect(() => {
    if (!stored) return;
    applyLook(stored);
    saveLook(stored);
  }, [stored]);

  const current = useRef(look);
  current.current = look;

  const commit = useCallback((next: (prev: Look) => Look) => {
    const prev = current.current;
    history.current = [...history.current, prev].slice(-20);
    setCanUndo(true);
    setLook(next(prev));
  }, []);

  const update = useCallback(
    (patch: Partial<Look>) =>
      commit((prev) => {
        const next = { ...prev, ...patch };
        // A named theme carries no one-off colours.
        if (patch.theme && patch.theme !== 'unique') {
          delete next.vars;
          delete next.uniqueName;
        }
        return next;
      }),
    [commit]
  );

  const surprise = useCallback(() => commit((prev) => surpriseLook(prev)), [commit]);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (prev) setLook(prev);
  }, []);

  const reset = useCallback(
    () => commit((prev) => ({ ...DEFAULT_LOOK, shortcuts: prev.shortcuts })),
    [commit]
  );

  useTileTilt();

  return (
    <Ctx.Provider value={{ look, update, surprise, undo, canUndo, reset }}>
      <IconDefs />
      {children}
    </Ctx.Provider>
  );
}

/** Tells the icon tile under the pointer where the pointer is (--tx/--ty, 0–1), which tilts
    it and places its glare. One listener for the whole app. */
function useTileTilt() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let current: HTMLElement | null = null;
    let raf = 0;
    let last: PointerEvent | null = null;
    const clear = () => {
      if (!current) return;
      current.style.removeProperty('--tx');
      current.style.removeProperty('--ty');
      current = null;
    };
    const apply = () => {
      raf = 0;
      const e = last;
      if (!e) return;
      const target = e.target instanceof Element ? e.target : null;
      const holder = target && target.closest('.tile, .tile-ic');
      const tile = holder ? ((holder.classList.contains('tile-ic') ? holder : holder.querySelector('.tile-ic')) as HTMLElement | null) : null;
      if (tile !== current) clear();
      if (!tile) return;
      const r = tile.getBoundingClientRect();
      tile.style.setProperty('--tx', Math.min(1, Math.max(0, (e.clientX - r.left) / (r.width || 1))).toFixed(3));
      tile.style.setProperty('--ty', Math.min(1, Math.max(0, (e.clientY - r.top) / (r.height || 1))).toFixed(3));
      current = tile;
    };
    const move = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', clear);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', clear);
      cancelAnimationFrame(raf);
      clear();
    };
  }, []);
}

/** Gradients the Zari pack paints its icons with: metallic gold that drifts, so it shimmers. */
function IconDefs() {
  const gold = (id: string, stops: [string, string][], dur: string) => (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1" spreadMethod="reflect">
      {stops.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
      <animateTransform attributeName="gradientTransform" type="translate" values="-1 -1; 1 1; -1 -1" dur={dur} repeatCount="indefinite" />
    </linearGradient>
  );
  return (
    <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true" focusable="false">
      <defs>
        {gold('zari-gold', [['0', '#7A5612'], ['.32', '#D9AE4E'], ['.5', '#FFF1C2'], ['.68', '#D4A440'], ['1', '#7A5612']], '6s')}
        {gold('zari-pale', [['0', '#B08A3E'], ['.4', '#F3D98C'], ['.55', '#FFFBE6'], ['1', '#C79B45']], '7.5s')}
        {gold('zari-rose', [['0', '#7E4A3A'], ['.4', '#D99C84'], ['.55', '#FBE1D3'], ['1', '#9C5E4A']], '8s')}
      </defs>
    </svg>
  );
}

export function useAppearance() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppearance must be used inside AppearanceProvider');
  return v;
}
