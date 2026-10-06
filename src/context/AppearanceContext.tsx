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

  return <Ctx.Provider value={{ look, update, surprise, undo, canUndo, reset }}>{children}</Ctx.Provider>;
}

export function useAppearance() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppearance must be used inside AppearanceProvider');
  return v;
}
