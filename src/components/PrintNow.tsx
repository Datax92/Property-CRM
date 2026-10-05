'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * One-click printing: mounts the document off-screen, opens the print dialog straight away,
 * and removes itself once printing is done. While it is mounted, printing prints this
 * document and nothing else.
 */
export function PrintNow({
  children,
  onDone,
  page = 'A4 portrait',
  margin = '10mm',
}: {
  children: React.ReactNode;
  onDone: () => void;
  page?: string;
  margin?: string;
}) {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `@media print { @page { size: ${page}; margin: ${margin}; } }`;
    document.head.appendChild(style);
    document.body.classList.add('printing-now');

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    window.addEventListener('afterprint', finish);
    // Let the document lay out (and its web fonts settle) before the dialog takes a snapshot.
    const t = window.setTimeout(() => {
      const ready = (document as any).fonts?.ready || Promise.resolve();
      ready.then(() => {
        window.print();
        // Browsers whose print() returns before printing still fire afterprint; this is the fallback.
        window.setTimeout(finish, 1000);
      });
    }, 80);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', finish);
      document.body.classList.remove('printing-now');
      style.remove();
    };
    // Printing happens once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(<div className="print-now">{children}</div>, document.body);
}
