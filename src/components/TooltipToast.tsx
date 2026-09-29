'use client';

import React, { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from './Icons';

export function TooltipToast() {
  const { tip, toastMsg } = useApp();
  const tipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tip.visible && tipRef.current && typeof window !== 'undefined') {
      const b = tipRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - b.width - 8, tip.x + 14));
      const top = Math.max(8, Math.min(window.innerHeight - b.height - 8, tip.y - b.height - 12));
      tipRef.current.style.left = `${left}px`;
      tipRef.current.style.top = `${top}px`;
    }
  }, [tip.visible, tip.x, tip.y, tip.html]);

  return (
    <>
      <div
        ref={tipRef}
        className={`tip ${tip.visible ? 'on' : ''}`}
        role="tooltip"
        aria-hidden={!tip.visible}
        dangerouslySetInnerHTML={{ __html: tip.html }}
      />
      <div className={`toast ${toastMsg.visible ? 'on' : ''}`} role="status" aria-live="polite">
        <Icon name="ok" />
        <span>{toastMsg.text}</span>
      </div>
    </>
  );
}
