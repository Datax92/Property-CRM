'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { BrandBanner } from './Brand';
import * as M from '../lib/re-data';

/**
 * One printed A4 landscape page: the letterhead, a title band and the content. The address line
 * at the foot is left off unless asked for, to give the content the room.
 * Content that would run past the page is scaled down just enough to fit it, so a page never
 * spills onto a second sheet; content that fits prints at full size.
 */
export function PrintSheet({
  kicker,
  title,
  sub,
  pageNo,
  footer = false,
  className = '',
  children,
}: {
  kicker: string;
  title: string;
  sub?: string;
  pageNo?: string;
  footer?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const b = box.current,
      el = inner.current;
    if (!b || !el) return;
    const st = el.style as any;
    st.zoom = '1';
    st.width = '';
    const room = b.getBoundingClientRect().height,
      wide = b.getBoundingClientRect().width;
    const fits = (z: number) => {
      st.zoom = String(z);
      // Scaled-down content is widened back to the page, so it still fills the width.
      st.width = z < 1 ? `${wide / z}px` : '';
      return el.getBoundingClientRect().height <= room + 0.5;
    };
    if (fits(1)) return;
    // Charts grow with the width they are given, so the height does not shrink in step with the
    // scale: the largest scale that fits is found by halving the range a few times.
    let lo = 0.45,
      hi = 1;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    fits(Math.floor(lo * 1000) / 1000);
    // A printed page is laid out once, when it is put up for printing.
  }, []);

  return (
    <div className={`mrp-page ${className}`}>
      <div className="mrp-head">
        <div className="mrp-brand">
          <BrandBanner />
        </div>
        <div className="mrp-meta">
          <span>Printed {M.fmtDate(M.TODAY)}</span>
          <span>{M.COMPANY_PHONE}</span>
          <span>{M.COMPANY_EMAIL}</span>
        </div>
      </div>
      <div className="mrp-band">
        <div>
          <span className="mrp-kicker">{kicker}</span>
          <b>{title}</b>
        </div>
        {sub && <span>{sub}</span>}
      </div>
      <div className="mrp-fit" ref={box}>
        <div className="mrp-fit-in" ref={inner}>
          {children}
        </div>
      </div>
      {/* One line, so the content keeps the room. */}
      {footer && (
        <div className="mrp-slim">
          {M.COMPANY_ADDRESS} · Email: {M.COMPANY_EMAIL} · Cell: {M.COMPANY_PHONE}
        </div>
      )}
      {pageNo && <div className="mrp-pageno">{pageNo}</div>}
    </div>
  );
}
