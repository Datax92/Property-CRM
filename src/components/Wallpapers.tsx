'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import DotField from './effects/DotField';

/* Wallpapers for the home screen. Each is drawn in code from the theme's colours
   (--wp-a, --wp-b, --wp-c and the brand shades), so it matches whatever theme is on.
   The seed varies the generated ones: contours, marble veins, dunes, stars. */

function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1600, H = 1000;
const r1 = (n: number) => Math.round(n * 10) / 10;

function Girih({ uid }: { uid: string }) {
  const s = 76, c = s / 2, a = s * 0.21, d = a * Math.SQRT2, b = s * 0.11;
  const corner = (x: number, y: number) => `${x},${y - b} ${x + b},${y} ${x},${y + b} ${x - b},${y}`;
  return (
    <svg className="wp-svg" width="100%" height="100%">
      <defs>
        <pattern id={`girih-${uid}`} width={s} height={s} patternUnits="userSpaceOnUse">
          <g className="s-a" fill="none" strokeWidth="1.1">
            <rect x={c - a} y={c - a} width={2 * a} height={2 * a} />
            <rect x={c - a} y={c - a} width={2 * a} height={2 * a} transform={`rotate(45 ${c} ${c})`} />
            <path d={`M${c} ${c - d}V0M${c + d} ${c}H${s}M${c} ${c + d}V${s}M${c - d} ${c}H0`} />
            <path d={`M${c - a} ${c - a}L0 0M${c + a} ${c - a}L${s} 0M${c + a} ${c + a}L${s} ${s}M${c - a} ${c + a}L0 ${s}`} />
            {[corner(0, 0), corner(s, 0), corner(0, s), corner(s, s)].map((p, i) => (
              <polygon key={i} points={p} />
            ))}
          </g>
          <circle className="f-b" cx={c} cy={c} r={a * 0.5} opacity=".5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#girih-${uid})`} />
    </svg>
  );
}

function Jaali({ uid }: { uid: string }) {
  const s = 58, r = s / 2;
  return (
    <svg className="wp-svg" width="100%" height="100%">
      <defs>
        <pattern id={`jaali-${uid}`} width={s} height={s} patternUnits="userSpaceOnUse">
          <g className="s-a" fill="none" strokeWidth="1.15">
            {[[0, 0], [s, 0], [0, s], [s, s], [r, r]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
          {[[r, 0], [0, r], [s, r], [r, s]].map(([x, y], i) => (
            <circle key={i} className="f-b" cx={x} cy={y} r="2.4" />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#jaali-${uid})`} />
    </svg>
  );
}

function Contour({ seed }: { seed: number }) {
  const paths = useMemo(() => {
    const rand = rng(seed);
    const out: { d: string; major: boolean }[] = [];
    const hills = 3;
    for (let k = 0; k < hills; k++) {
      const cx = 160 + rand() * (W - 320), cy = 120 + rand() * (H - 240);
      const p1 = rand() * 6.28, p2 = rand() * 6.28, p3 = rand() * 6.28;
      const rings = 11 + Math.floor(rand() * 6);
      for (let i = 1; i <= rings; i++) {
        const R = i * (24 + k * 3);
        let d = '';
        for (let j = 0; j <= 72; j++) {
          const t = (j / 72) * Math.PI * 2;
          const wob = 1 + 0.2 * Math.sin(2 * t + p1 + i * 0.07) + 0.1 * Math.sin(3 * t + p2 - i * 0.05) + 0.05 * Math.sin(5 * t + p3);
          d += (j ? 'L' : 'M') + r1(cx + Math.cos(t) * R * wob) + ' ' + r1(cy + Math.sin(t) * R * wob * 0.78);
        }
        out.push({ d: d + 'Z', major: i % 4 === 0 });
      }
    }
    return out;
  }, [seed]);
  return (
    <svg className="wp-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <g className="s-a" fill="none">
        {paths.map((p, i) => (
          <path key={i} d={p.d} strokeWidth={p.major ? 1.5 : 0.9} opacity={p.major ? 0.42 : 0.2} />
        ))}
      </g>
    </svg>
  );
}

function Marble({ seed, uid }: { seed: number; uid: string }) {
  const veins = useMemo(() => {
    const rand = rng(seed);
    const v: { d: string; w: number; o: number; gold: boolean }[] = [];
    for (let i = 0; i < 11; i++) {
      const y0 = rand() * H, y3 = rand() * H;
      const d = `M-40 ${r1(y0)}C${r1(300 + rand() * 300)} ${r1(rand() * H)} ${r1(900 + rand() * 300)} ${r1(rand() * H)} ${W + 40} ${r1(y3)}`;
      const gold = i < 2;
      v.push({ d, w: gold ? 1.3 : 0.5 + rand() * 1.8, o: gold ? 0.55 : 0.1 + rand() * 0.22, gold });
    }
    return v;
  }, [seed]);
  return (
    <svg className="wp-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <filter id={`cloud-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="4" seed={seed % 997} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id={`crack-${uid}`}>
          <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" seed={(seed % 991) + 3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="26" />
        </filter>
      </defs>
      <rect width={W} height={H} filter={`url(#cloud-${uid})`} opacity=".07" />
      <g fill="none" filter={`url(#crack-${uid})`}>
        {veins.map((v, i) => (
          <path key={i} d={v.d} className={v.gold ? 's-b' : 's-stone'} strokeWidth={v.w} opacity={v.o} />
        ))}
      </g>
    </svg>
  );
}

function Sweep({ seed }: { seed: number }) {
  const off = (rng(seed)() - 0.5) * 140;
  return (
    <svg className="wp-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <g transform={`translate(0 ${r1(off)})`}>
        <path className="f-b" opacity=".16" d="M480 -60C1000 -20 1420 220 1700 660L1700 430C1420 130 1000 -30 480 -60Z" />
        <path className="f-b" opacity=".1" d="M820 110C1160 160 1430 360 1660 790L1612 790C1390 410 1130 210 820 110Z" />
        <path className="f-a" opacity=".07" d="M-90 800C310 690 720 760 1020 1100L900 1100C640 830 300 770 -90 900Z" />
        <path className="f-b" opacity=".12" d="M0 40L520 26 520 32 0 50Z" />
      </g>
    </svg>
  );
}

function Dunes({ seed, uid }: { seed: number; uid: string }) {
  const { layers, sunX } = useMemo(() => {
    const rand = rng(seed);
    const layers = [0, 1, 2, 3].map((i) => {
      const base = 560 + i * 110;
      let d = `M0 ${H}L0 ${base}`;
      let x = 0, y = base;
      while (x < W) {
        const nx = x + 260 + rand() * 220;
        const ny = base + (rand() - 0.5) * (90 - i * 12);
        d += `Q${r1((x + nx) / 2 + (rand() - 0.5) * 80)} ${r1(Math.min(y, ny) - 40 - rand() * 50)} ${r1(nx)} ${r1(ny)}`;
        x = nx;
        y = ny;
      }
      return d + `L${W} ${H}Z`;
    });
    // The sun sits low on one side, clear of the middle where the icons are.
    return { layers, sunX: rand() < 0.5 ? 120 + rand() * 220 : 1260 + rand() * 220 };
  }, [seed]);
  const cls = ['f-c', 'f-a', 'f-b', 'f-brand'];
  const op = [0.16, 0.13, 0.15, 0.12];
  return (
    <svg className="wp-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" width="100%" height="100%">
      <defs>
        <radialGradient id={`sun-${uid}`}>
          <stop offset="0" style={{ stopColor: 'var(--wp-b)', stopOpacity: 0.34 }} />
          <stop offset=".45" style={{ stopColor: 'var(--wp-b)', stopOpacity: 0.12 }} />
          <stop offset="1" style={{ stopColor: 'var(--wp-b)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <circle cx={sunX} cy="300" r="260" fill={`url(#sun-${uid})`} />
      {layers.map((d, i) => (
        <path key={i} className={cls[i]} d={d} opacity={op[i]} />
      ))}
    </svg>
  );
}

function Night({ seed }: { seed: number }) {
  const { stars, near, far } = useMemo(() => {
    const rand = rng(seed);
    const stars = Array.from({ length: 230 }, () => ({
      x: r1(rand() * W), y: r1(rand() * H * 0.8), r: r1(0.4 + rand() * rand() * 1.6), o: 0.3 + rand() * 0.7, tw: rand() < 0.16, delay: r1(rand() * 6),
    }));
    const ridge = (base: number, amp: number) => {
      let d = `M0 ${H}L0 ${base}`;
      for (let x = 0; x <= W; x += 60 + rand() * 60) d += `L${r1(x)} ${r1(base - rand() * amp)}`;
      return d + `L${W} ${base}L${W} ${H}Z`;
    };
    return { stars, far: ridge(790, 170), near: ridge(880, 110) };
  }, [seed]);
  return (
    <>
      <div className="wp-glow g1" />
      <div className="wp-glow g2" />
      <svg className="wp-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" width="100%" height="100%">
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} className={s.tw ? 'tw' : undefined} style={s.tw ? { animationDelay: `${s.delay}s` } : undefined} />
        ))}
        <path d={far} className="f-brand-dk" opacity=".75" />
        <path d={near} fill="#03050B" opacity=".9" />
      </svg>
    </>
  );
}

function Aurora({ seed }: { seed: number }) {
  const blobs = useMemo(() => {
    const rand = rng(seed);
    return ['a', 'b', 'c', 'a'].map((c, i) => ({
      c, left: r1(-15 + rand() * 75), top: r1(-20 + rand() * 70), size: r1(48 + rand() * 30), dur: r1(26 + rand() * 18), i,
    }));
  }, [seed]);
  return (
    <>
      {blobs.map((b) => (
        <div
          key={b.i}
          className={`wp-blob c-${b.c}`}
          style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.size + 10}%`, animationDuration: `${b.dur}s` }}
        />
      ))}
    </>
  );
}

function Velvet({ uid }: { uid: string }) {
  return (
    <svg className="wp-svg wp-grain" width="100%" height="100%">
      <filter id={`grain-${uid}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#grain-${uid})`} />
    </svg>
  );
}

/** The interactive dots take the theme's colour; the canvas needs it as a hex value. */
function Dots({ themeKey }: { themeKey: string }) {
  const [accent, setAccent] = useState('');
  useEffect(() => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
    setAccent(/^#[0-9a-f]{6}$/i.test(v) ? v : '#1F2456');
  }, [themeKey]);
  return accent ? <DotField key={accent} accent={accent} /> : null;
}

export function Wallpaper({ id, seed, still = false, themeKey = '' }: { id: string; seed: number; still?: boolean; themeKey?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  let art: React.ReactNode = null;
  if (id === 'girih') art = <Girih uid={uid} />;
  else if (id === 'jaali') art = <Jaali uid={uid} />;
  else if (id === 'contour') art = <Contour seed={seed} />;
  else if (id === 'marble') art = <Marble seed={seed} uid={uid} />;
  else if (id === 'sweep') art = <Sweep seed={seed} />;
  else if (id === 'dunes') art = <Dunes seed={seed} uid={uid} />;
  else if (id === 'night') art = <Night seed={seed} />;
  else if (id === 'aurora') art = <Aurora seed={seed} />;
  else if (id === 'velvet') art = <Velvet uid={uid} />;
  else if (id === 'dots' && !still) art = <Dots themeKey={themeKey} />;
  return (
    <div className={`wallpaper wp-${id}${still ? ' still' : ''}`} aria-hidden="true">
      {art}
    </div>
  );
}
