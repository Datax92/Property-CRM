import React from 'react';
import { LOGO_VIEWBOX, LOGO_RED, LOGO_DARK } from '../lib/brand-paths';
import * as M from '../lib/re-data';

export const BRAND_NAVY = '#1F2456';
export const BRAND_RED = '#D7262E';

/** The company mark (the kicking figure), drawn as vector paths. */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} viewBox={LOGO_VIEWBOX} width={size} height={size} aria-hidden="true">
      <path fill={BRAND_RED} fillRule="evenodd" d={LOGO_RED} />
      <path fill="#1E1F24" fillRule="evenodd" d={LOGO_DARK} />
    </svg>
  );
}

/* The banner and the address strip are whole SVGs, text included: an SVG fill is printed
   as content, so they stay legible even when the browser leaves out background colours. */

/** Letterhead: mark, "A & SONS", the full company name, and the red sweep on the right. */
export function BrandBanner({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 800 132" width="100%" role="img" aria-label={M.COMPANY} preserveAspectRatio="xMinYMid meet">
      <path d="M330 4 C 530 6, 710 40, 800 112 L 800 60 C 700 22, 545 6, 330 4 Z" fill={BRAND_RED} />
      <path d="M440 44 C 575 52, 700 88, 796 132 L 764 132 C 668 98, 560 62, 440 44 Z" fill={BRAND_RED} />
      <path d="M6 6 L 300 3 L 300 5 L 6 9 Z" fill={BRAND_RED} />
      <svg x="8" y="10" width="112" height="112" viewBox={LOGO_VIEWBOX}>
        <path fill={BRAND_RED} fillRule="evenodd" d={LOGO_RED} />
        <path fill="#1E1F24" fillRule="evenodd" d={LOGO_DARK} />
      </svg>
      <text x="128" y="84" fontFamily="Poppins, 'Segoe UI', Arial, sans-serif" fontWeight="800" fontSize="50" fill={BRAND_NAVY} letterSpacing="1">
        A &amp; SONS
      </text>
      <text x="130" y="112" fontFamily="Poppins, 'Segoe UI', Arial, sans-serif" fontWeight="500" fontSize="16.5" fill="#55575F" letterSpacing="1.6">
        TRADEWAY ASSOCIATE (SMC) PVT LTD
      </text>
    </svg>
  );
}

/** Address strip that closes every printed document. */
export function BrandFooter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 800 62" width="100%" role="img" aria-label={`${M.COMPANY_ADDRESS}. ${M.COMPANY_EMAIL}, ${M.COMPANY_PHONE}`}>
      <path d="M0 0 L 400 15 L 800 0 L 800 20 L 0 20 Z" fill="#33364A" />
      <rect x="0" y="16" width="800" height="46" fill={BRAND_RED} />
      <path d="M0 14 L 400 26 L 800 14 L 800 18 L 400 30 L 0 18 Z" fill={BRAND_RED} />
      <text x="400" y="40" textAnchor="middle" fontFamily="Poppins, 'Segoe UI', Arial, sans-serif" fontWeight="600" fontSize="12.5" fill="#FFFFFF">
        {M.COMPANY_ADDRESS}
      </text>
      <text x="400" y="56" textAnchor="middle" fontFamily="Poppins, 'Segoe UI', Arial, sans-serif" fontWeight="500" fontSize="12" fill="#FFFFFF">
        Email: {M.COMPANY_EMAIL} · Cell: {M.COMPANY_PHONE}
      </text>
    </svg>
  );
}
