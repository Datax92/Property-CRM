import React from 'react';
import { COMPANY } from '../lib/re-data';

const COMPANY_INITIALS = COMPANY.split(/\s+/)
  .filter((w) => /^[A-Za-z]/.test(w))
  .slice(0, 2)
  .map((w) => w[0].toUpperCase())
  .join('');

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

export function Icon({ name, className = 'ic', size = 16 }: IconProps) {
  switch (name) {
    case 'car':
      return (
        <svg className="car" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.7" width={8} height={8}>
          <path d="M1 1l4 4 4-4" />
        </svg>
      );
    case 'bell':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2a4 4 0 0 1 4 4v3l1.4 2.2H2.6L4 9V6a4 4 0 0 1 4-4z" />
          <path d="M6.4 13.4a1.8 1.8 0 0 0 3.2 0" />
        </svg>
      );
    case 'calculator':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="1.5" width="11" height="13" rx="1.8" />
          <line x1="4.5" y1="4.5" x2="11.5" y2="4.5" />
          <circle cx="5" cy="7.5" r=".7" fill="currentColor" />
          <circle cx="8" cy="7.5" r=".7" fill="currentColor" />
          <circle cx="11" cy="7.5" r=".7" fill="currentColor" />
          <circle cx="5" cy="10.5" r=".7" fill="currentColor" />
          <circle cx="8" cy="10.5" r=".7" fill="currentColor" />
          <circle cx="11" cy="10.5" r=".7" fill="currentColor" />
        </svg>
      );
    case 'trend':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2.5 11.5 6.5 7.5 9.5 10.5 13.5 4.5" />
          <polyline points="9.5 4.5 13.5 4.5 13.5 8.5" />
        </svg>
      );

    case 'plus':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3.2v9.6M3.2 8h9.6" />
        </svg>
      );
    case 'home':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.4 7.2 8 2.6l5.6 4.6" />
          <path d="M4 8.4v5h8v-5" />
        </svg>
      );
    case 'grid':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.4" y="2.4" width="4.6" height="4.6" rx="1" />
          <rect x="9" y="2.4" width="4.6" height="4.6" rx="1" />
          <rect x="2.4" y="9" width="4.6" height="4.6" rx="1" />
          <rect x="9" y="9" width="4.6" height="4.6" rx="1" />
        </svg>
      );
    case 'tag':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.6 8.2V2.6h5.6l5.2 5.2-5.6 5.6z" />
          <circle cx="5.2" cy="5.2" r=".9" />
        </svg>
      );
    case 'users':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="5.4" r="2.4" />
          <path d="M2 13c0-2.2 1.8-3.8 4-3.8s4 1.6 4 3.8" />
          <path d="M11 4.2a2.2 2.2 0 0 1 0 4.3M11.6 12.9c0-1.6-.5-2.7-1.4-3.4" />
        </svg>
      );
    case 'chart':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.4 13.2h11.2" />
          <path d="M4.4 13V8M7.4 13V4.6M10.4 13V9.4M13 13V6.4" />
        </svg>
      );
    case 'wallet':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="12" height="9" rx="1.6" />
          <path d="M2 6.6h12M11 9.8h1.2" />
        </svg>
      );
    case 'receipt':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.6 2.4h8.8v11.2l-1.7-1.1-1.7 1.1-1.7-1.1-1.7 1.1-1.9-1.1z" />
          <path d="M5.8 5.6h4.4M5.8 8.2h3" />
        </svg>
      );
    case 'shield':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2 3.4 3.8v3.6c0 2.8 1.9 5.2 4.6 6.2 2.7-1 4.6-3.4 4.6-6.2V3.8z" />
        </svg>
      );
    case 'user':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="5.4" r="2.6" />
          <path d="M3 13.4c0-2.6 2.2-4.4 5-4.4s5 1.8 5 4.4" />
        </svg>
      );
    case 'logout':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3.4H3.6v9.2H6" />
          <path d="M9 5.6 11.6 8 9 10.4M11.6 8H6.2" />
        </svg>
      );
    case 'down':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2.6v8M4.6 7.4 8 10.8l3.4-3.4M2.6 13.4h10.8" />
        </svg>
      );
    case 'print':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.6 6V2.6h6.8V6" />
          <path d="M4.6 12H3.2a1 1 0 0 1-1-1V7.2a1 1 0 0 1 1-1h9.6a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1h-1.4" />
          <rect x="4.6" y="10" width="6.8" height="3.6" rx=".6" />
        </svg>
      );
    case 'filter':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.4 4h11.2M4.6 8h6.8M6.6 12h2.8" />
        </svg>
      );
    case 'warn':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2.6 14.4 13.4H1.6z" />
          <path d="M8 6.6v3.1M8 11.8v.1" />
        </svg>
      );
    case 'info':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.2" />
          <path d="M8 7.3v4M8 4.9v.1" />
        </svg>
      );
    case 'ok':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.2" />
          <path d="M5.3 8.2 7.2 10l3.5-3.9" />
        </svg>
      );
    case 'edit':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.6 2.8l2.6 2.6-7.7 7.7H2.9v-2.6z" />
          <path d="M9.2 4.2l2.6 2.6" />
        </svg>
      );
    case 'copy':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5.4" y="5.4" width="8" height="8" rx="1.6" />
          <path d="M10.6 5.4V3.8a1.2 1.2 0 0 0-1.2-1.2H3.8a1.2 1.2 0 0 0-1.2 1.2v5.6a1.2 1.2 0 0 0 1.2 1.2h1.6" />
        </svg>
      );
    case 'trash':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.8 4.4h10.4M6.2 4.4V2.8h3.6v1.6M4.2 4.4l.7 8.8h6.2l.7-8.8" />
        </svg>
      );
    case 'dice':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="2.6" />
          <circle cx="5.4" cy="5.4" r=".9" fill="currentColor" stroke="none" />
          <circle cx="10.6" cy="5.4" r=".9" fill="currentColor" stroke="none" />
          <circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" />
          <circle cx="5.4" cy="10.6" r=".9" fill="currentColor" stroke="none" />
          <circle cx="10.6" cy="10.6" r=".9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'palette':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M8 2.2C4.6 2.2 2 4.6 2 7.7 2 10.9 4.6 13.8 7.7 13.8c1.2 0 1.7-.7 1.4-1.5-.3-.8.1-1.4 1-1.4H11.6c1.4 0 2.4-1.1 2.4-2.6C14 4.6 11.4 2.2 8 2.2z" />
          <circle cx="5.2" cy="7" r=".9" fill="currentColor" stroke="none" />
          <circle cx="7.6" cy="4.9" r=".9" fill="currentColor" stroke="none" />
          <circle cx="10.6" cy="5.6" r=".9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'undo':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 4.5 2.8 7.2l2.7 2.7" />
          <path d="M3 7.2h6.4a3.6 3.6 0 0 1 0 7.2H7.6" />
        </svg>
      );
    case 'move-up':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 10 8 5.5l4.5 4.5" />
        </svg>
      );
    case 'move-down':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 6 8 10.5 12.5 6" />
        </svg>
      );
    case 'prev':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3.5L5.5 8l4.5 4.5" />
        </svg>
      );
    case 'next':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3.5L10.5 8 6 12.5" />
        </svg>
      );
    case 'x':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" />
        </svg>
      );
    case 'empty':
      return (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="3" y="4.5" width="18" height="15" rx="2" />
          <path d="M3 9h18M8 13h8" />
        </svg>
      );
    case 'lock':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3.6" y="7" width="8.8" height="6.4" rx="1.4" />
          <path d="M5.7 7V5a2.3 2.3 0 0 1 4.6 0v2" />
        </svg>
      );
    case 'history':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.6 8a5.4 5.4 0 1 0 1.7-3.9L2.6 5.6" />
          <path d="M2.6 2.8v2.8h2.8M8 5.2V8l2 1.4" />
        </svg>
      );
    case 'burger':
      return (
        <svg className={className} viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.6 4.4h10.8M2.6 8h10.8M2.6 11.6h10.8" />
        </svg>
      );
    default:
      return null;
  }
}

export function LogoMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" width={28} height={28}>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="#FAF6EC" opacity=".12" />
      <g stroke="#7FD9BC" strokeWidth="1" opacity=".55" fill="none">
        <ellipse cx="20" cy="20" rx="15" ry="8" />
        <ellipse cx="20" cy="20" rx="15" ry="8" transform="rotate(60 20 20)" />
        <ellipse cx="20" cy="20" rx="15" ry="8" transform="rotate(120 20 20)" />
      </g>
      <circle cx="20" cy="20" r="9.5" fill="#08432F" stroke="#E0951B" strokeWidth="1.2" />
      <text x="20" y="24.2" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontSize="10.5" fontWeight="700" fill="#FAF6EC">
        {COMPANY_INITIALS}
      </text>
    </svg>
  );
}

/** Procedural property artwork — no network request, prints fine. */
export function PropArt({ p }: { p: { id: string } }) {
  let h = 0;
  for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
  const rnd = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
  const skies = [
    ['#E9F4EF', '#C2E0D4'],
    ['#FCF2DC', '#EFD9A8'],
    ['#EAF0FA', '#C9DAF3'],
    ['#F6EEF3', '#E4CEDC'],
  ];
  const sky = skies[Math.floor(rnd() * skies.length)];
  const ink = ['#0B5C46', '#1F5C7A', '#7A4A1F', '#4A3A6B'][Math.floor(rnd() * 4)];
  const rects: React.ReactNode[] = [];
  let x = 4;
  let keyIdx = 0;
  while (x < 196) {
    const w = 14 + Math.floor(rnd() * 22);
    const ht = 20 + Math.floor(rnd() * 44);
    rects.push(<rect key={`sil-${keyIdx++}`} x={x} y={92 - ht} width={w} height={ht} rx={1.5} />);
    for (let wy = 92 - ht + 6; wy < 86; wy += 9) {
      for (let wx = x + 4; wx < x + w - 4; wx += 7) {
        if (rnd() > 0.42) {
          rects.push(<rect key={`win-${keyIdx++}`} x={wx} y={wy} width={3} height={4} fill="#FFFDF7" opacity={0.5} />);
        }
      }
    }
    x += w + 3 + Math.floor(rnd() * 5);
  }
  const gid = 'sk' + String(p.id).replace(/\W/g, '');

  return (
    <svg viewBox="0 0 200 92" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style={{ width: '100%', height: '82px', display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="200" height="92" fill={`url(#${gid})`} />
      <g opacity=".14" stroke={ink} strokeWidth=".7">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${i * 11} H200`} />
        ))}
      </g>
      <g fill={ink} opacity=".8">
        {rects}
      </g>
      <rect y="88" width="200" height="4" fill={ink} opacity=".95" />
    </svg>
  );
}
