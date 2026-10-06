import React from 'react';

/* Launcher artwork for the home screen: flat, overlapping colour shapes in the style of the
   client's reference board. Decorative only — every tile carries a text label. */
/* Each colour is a variable so an icon pack can recolour every icon at once; the classic
   values are the defaults in globals.css. */
const C = {
  orange: 'var(--ic-orange)',
  amber: 'var(--ic-amber)',
  teal: 'var(--ic-teal)',
  deep: 'var(--ic-deep)',
  purple: 'var(--ic-purple)',
  blue: 'var(--ic-blue)',
  coral: 'var(--ic-coral)',
  red: 'var(--ic-red)',
  navy: 'var(--ic-navy)',
};

const ART: Record<string, React.ReactNode> = {
  dashboard: (
    <>
      <path d="M8 26a16 16 0 0 1 32 0c0 8-6 14-14 14H8z" fill={C.orange} />
      <path d="M14 22a13 13 0 0 1 26 2c0 5-3 9-7 11-9 2-19-4-19-13z" fill={C.amber} opacity=".75" />
    </>
  ),
  pnl: (
    <>
      <rect x="8" y="22" width="9" height="18" rx="2" fill={C.purple} />
      <rect x="20" y="13" width="9" height="27" rx="2" fill={C.teal} />
      <rect x="32" y="27" width="9" height="13" rx="2" fill={C.coral} />
      <path d="M9 15l9-6 8 5 13-8" fill="none" stroke={C.amber} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sales: (
    <>
      <path d="M7 10h17l17 17-14 14L7 24z" fill={C.teal} />
      <circle cx="15.5" cy="18.5" r="3.4" fill="var(--ic-paper)" />
      <circle cx="34" cy="33" r="9" fill={C.deep} />
      <path d="M29.6 33.2l3 3 5.6-6" fill="none" stroke="var(--ic-paper)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  purchase: (
    <>
      <path d="M9 31L31 8l7 7-23 22-8 2z" fill={C.deep} />
      <path d="M31 8l7 7-4 4-7-7z" fill={C.teal} />
      <rect x="18" y="37" width="23" height="3.6" rx="1.8" fill={C.teal} />
    </>
  ),
  cash: (
    <>
      <rect x="6" y="14" width="32" height="24" rx="5" fill={C.purple} />
      <path d="M10 14l19-6a3 3 0 0 1 4 3v3z" fill={C.teal} />
      <rect x="27" y="21" width="15" height="10" rx="5" fill={C.deep} />
      <circle cx="33" cy="26" r="2.2" fill={C.amber} />
    </>
  ),
  expenses: (
    <>
      <path d="M14 8h23v33l-4-3-4 3-4-3-4 3-3.5-3-3.5 3z" fill={C.coral} />
      <path d="M9 6h23v33l-4-3-4 3-4-3-4 3-3.5-3L9 39z" fill={C.teal} />
      <rect x="14" y="14" width="13" height="3" rx="1.5" fill={C.deep} />
      <rect x="14" y="21" width="9" height="3" rx="1.5" fill={C.deep} />
      <rect x="14" y="28" width="11" height="3" rx="1.5" fill={C.deep} />
    </>
  ),
  projects: (
    <>
      <rect x="6" y="9" width="10.5" height="30" rx="3" fill={C.teal} />
      <rect x="18.8" y="9" width="10.5" height="20" rx="3" fill={C.purple} />
      <rect x="31.5" y="9" width="10.5" height="25" rx="3" fill={C.amber} />
      <rect x="8.5" y="12" width="5.5" height="5" rx="1.4" fill="var(--ic-paper)" opacity=".85" />
      <rect x="21.3" y="12" width="5.5" height="5" rx="1.4" fill="var(--ic-paper)" opacity=".85" />
      <rect x="34" y="12" width="5.5" height="5" rx="1.4" fill="var(--ic-paper)" opacity=".85" />
    </>
  ),
  tax: (
    <>
      <rect x="8" y="24" width="12" height="16" rx="2.5" fill={C.purple} />
      <rect x="17" y="16" width="12" height="24" rx="2.5" fill={C.coral} opacity=".92" />
      <rect x="26" y="8" width="13" height="32" rx="2.5" fill={C.amber} opacity=".95" />
    </>
  ),
  zakat: (
    <>
      <rect x="8" y="8" width="15" height="15" rx="3" fill={C.purple} />
      <rect x="26" y="8" width="14" height="6.5" rx="2" fill={C.coral} />
      <rect x="26" y="16.5" width="14" height="6.5" rx="2" fill={C.red} />
      <rect x="8" y="26" width="15" height="14" rx="3" fill={C.blue} />
      <rect x="26" y="26" width="4" height="14" rx="1.6" fill={C.teal} />
      <rect x="31" y="26" width="4" height="14" rx="1.6" fill={C.teal} />
      <rect x="36" y="26" width="4" height="14" rx="1.6" fill={C.teal} />
    </>
  ),
  charity: (
    <>
      <path d="M24 40C12 32 7 26 7 19a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 7-5 13-17 21z" fill={C.coral} />
      <path d="M24 40C12 32 7 26 7 19a8.5 8.5 0 0 1 8.5-8.5c5 0 8.5 4 8.5 9z" fill={C.red} opacity=".55" />
      <circle cx="34" cy="14" r="6" fill={C.amber} />
    </>
  ),
  commission: (
    <>
      <path d="M22 26V8a18 18 0 0 0-16.5 25.2z" fill={C.teal} />
      <path d="M26 8v16h16A16 16 0 0 0 26 8z" fill={C.blue} />
      <path d="M8 36l15-8h19a18 18 0 0 1-34 8z" fill={C.amber} />
    </>
  ),
  inventory: (
    <>
      <rect x="9" y="9" width="17" height="24" rx="3" fill={C.blue} transform="rotate(-10 17.5 21)" />
      <rect x="16" y="11" width="17" height="24" rx="3" fill={C.coral} transform="rotate(8 24.5 23)" />
      <rect x="22" y="14" width="17" height="24" rx="3" fill={C.orange} transform="rotate(26 30.5 26)" />
      <rect x="13" y="12" width="8" height="15" rx="2" fill={C.navy} opacity=".7" transform="rotate(-10 17 19.5)" />
    </>
  ),
  landed: (
    <>
      <path d="M7 25l6-6 9 9-6 6z" fill={C.purple} />
      <path d="M16 34l6-6 6 6-6 6z" fill={C.deep} />
      <path d="M22 28L37 9l6 5-15 20z" fill={C.teal} />
    </>
  ),
  value: (
    <>
      <rect x="5" y="12" width="19" height="24" rx="4" fill={C.amber} />
      <rect x="24" y="12" width="19" height="24" rx="4" fill={C.teal} />
      <rect x="22.4" y="7" width="3.2" height="34" rx="1.6" fill={C.purple} />
      <path d="M17 18v12l-8-6z" fill="var(--ic-paper)" />
      <path d="M31 18v12l8-6z" fill="var(--ic-paper)" />
    </>
  ),
  gross: (
    <>
      <circle cx="24" cy="24" r="18" fill={C.blue} />
      <path d="M6.6 19C12 8 30 3 41.6 20c-8 6-14-3-22 0s-9 3-13-1z" fill={C.teal} />
      <path d="M7 30c7-7 13 2 21-1s9-2 13 1a18 18 0 0 1-34 0z" fill={C.navy} opacity=".9" />
    </>
  ),
  net: (
    <>
      <circle cx="12" cy="15" r="6" fill={C.blue} />
      <rect x="21" y="9" width="21" height="12" rx="3" fill={C.blue} />
      <circle cx="12" cy="33" r="6" fill={C.red} />
      <rect x="21" y="27" width="21" height="12" rx="3" fill={C.coral} />
    </>
  ),
  admin: (
    <>
      <rect x="6" y="10" width="36" height="28" rx="4" fill={C.purple} />
      <path d="M6 14a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v3H6z" fill={C.teal} />
      <rect x="6" y="17" width="36" height="6" fill={C.deep} />
    </>
  ),
  finance: (
    <>
      <path d="M24 6l15 9v18l-15 9-15-9V15z" fill={C.orange} />
      <path d="M24 6l15 9-15 9-15-9z" fill={C.amber} />
      <path d="M24 24l15-9v18l-15 9z" fill={C.purple} />
    </>
  ),
  saleInvoice: (
    <>
      <rect x="7" y="9" width="5" height="30" rx="1.5" fill={C.purple} />
      <rect x="14.5" y="9" width="3" height="30" rx="1.5" fill={C.purple} />
      <rect x="20" y="9" width="6" height="30" rx="1.5" fill={C.purple} />
      <rect x="28.5" y="9" width="3" height="30" rx="1.5" fill={C.purple} />
      <rect x="34" y="9" width="7" height="30" rx="1.5" fill={C.purple} />
    </>
  ),
  purchaseInvoice: (
    <>
      <path d="M8 30c5-3 9-11 9-17 0-5-5-5-5 1 0 8 3 19 6 19s2-9 6-9 2 6 5 6 4-5 8-5" fill="none" stroke={C.deep} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="37" width="34" height="3.2" rx="1.6" fill={C.teal} />
    </>
  ),
  agents: (
    <>
      <circle cx="11" cy="24" r="4.5" fill={C.amber} />
      <circle cx="37" cy="24" r="4.5" fill={C.teal} />
      <rect x="5" y="30" width="18" height="10" rx="5" fill={C.amber} />
      <rect x="25" y="30" width="18" height="10" rx="5" fill={C.teal} />
      <circle cx="24" cy="16" r="7.5" fill={C.purple} />
      <path d="M12 40a12 12 0 0 1 24 0z" fill={C.purple} />
    </>
  ),
  receivables: (
    <>
      <path d="M8 40c1-8 7-11 15-11h4c8 0 14 3 15 11z" fill={C.blue} />
      <circle cx="34" cy="23" r="5.5" fill={C.navy} />
      <path d="M24 40c1-6 4-9 10-9s9 3 10 9z" fill={C.navy} />
      <circle cx="18" cy="16" r="10" fill={C.blue} />
      <path d="M21.6 12.6c-.8-1.2-2.1-1.8-3.6-1.8-2 0-3.4 1-3.4 2.6 0 3.6 7.2 1.6 7.2 5.3 0 1.6-1.5 2.7-3.7 2.7-1.8 0-3.2-.8-3.9-2.1M18 8.6v2.2M18 21.4v2.2" fill="none" stroke="var(--ic-paper)" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  fiscal: (
    <>
      <path d="M22 22V6A18 18 0 0 0 6 22z" fill={C.teal} />
      <path d="M26 22h16A18 18 0 0 0 26 6z" fill={C.purple} />
      <path d="M22 26H6a18 18 0 0 0 16 16z" fill={C.red} />
      <path d="M26 26v16a18 18 0 0 0 16-16z" fill={C.blue} />
    </>
  ),
  appearance: (
    <>
      <path d="M24 6C13 6 5 13.6 5 23c0 9.6 8.2 18 18.2 18 3.6 0 5.2-2 4.2-4.6-.9-2.4.4-4.4 3-4.4H35c4.6 0 8-3.4 8-8.4C43 13.4 34.6 6 24 6z" fill={C.amber} />
      <circle cx="15" cy="20" r="3.6" fill={C.red} />
      <circle cx="22" cy="13.5" r="3.6" fill={C.teal} />
      <circle cx="31.5" cy="15" r="3.6" fill={C.purple} />
      <circle cx="14.5" cy="30" r="3.6" fill={C.deep} />
    </>
  ),
  tasks: (
    <>
      <rect x="8" y="6" width="32" height="36" rx="5" fill={C.teal} />
      <rect x="15" y="3" width="18" height="8" rx="3" fill={C.deep} />
      <path d="M14 21l3.5 3.5L24 18" fill="none" stroke="var(--ic-paper)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="27" y="19" width="8" height="3.4" rx="1.7" fill="var(--ic-paper)" />
      <path d="M14 32l3.5 3.5L24 29" fill="none" stroke="var(--ic-paper)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="27" y="30" width="8" height="3.4" rx="1.7" fill="var(--ic-paper)" opacity=".7" />
    </>
  ),
  proforma: (
    <>
      <path d="M10 5h20l9 9v29H10z" fill={C.orange} />
      <path d="M30 5v9h9z" fill={C.amber} />
      <rect x="15" y="20" width="18" height="3.2" rx="1.6" fill="var(--ic-paper)" />
      <rect x="15" y="27" width="13" height="3.2" rx="1.6" fill="var(--ic-paper)" />
      <circle cx="31" cy="35" r="5" fill={C.navy} />
    </>
  ),
  assets: (
    <>
      <rect x="6" y="20" width="36" height="20" rx="3" fill={C.navy} />
      <path d="M6 20L24 7l18 13z" fill={C.blue} />
      <rect x="12" y="25" width="6" height="15" fill={C.amber} />
      <rect x="22" y="25" width="6" height="15" fill={C.amber} />
      <rect x="32" y="25" width="6" height="15" fill={C.amber} />
    </>
  ),
  account: (
    <>
      <path d="M24 5l16.5 9.5v19L24 43 7.5 33.500v-19z" fill={C.purple} />
      <path d="M24 5l16.5 9.5v9.5H7.5v-9.5z" fill={C.amber} />
      <path d="M40.5 24v9.500L24 43V24z" fill={C.orange} />
      <circle cx="24" cy="24" r="6.5" fill="var(--ic-paper)" />
    </>
  ),
};

export function AppIcon({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      {ART[name] || ART.dashboard}
    </svg>
  );
}
