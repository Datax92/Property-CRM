'use client';

import React, { useEffect, useId, useMemo, useRef } from 'react';
import DotField from './effects/DotField';

/* Wallpapers for the home screen. Every one moves on its own and answers the pointer.
   Colours come from the theme (--wp-a, --wp-b, --wp-c, --hl and the brand shades), so each
   matches whatever theme is on; the seed varies the generated ones.

   Three kinds:
   - SVG patterns with a lit copy revealed by a soft spotlight at the pointer and a slow sheen;
   - SVG scenes in layers that move with the pointer at different depths (parallax);
   - canvas scenes (water, silk, mirrors, tiles, lamps) drawn every frame. */

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

const W = 1600, H = 1000, TAU = Math.PI * 2;
const r1 = (n: number) => Math.round(n * 10) / 10;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------------------------------
   The pointer, eased, as CSS variables on the wallpaper: --px/--py in px, --mx/--my 0–1.
   -------------------------------------------------------------------------------------- */
function usePointerVars(ref: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !active || reducedMotion()) return;
    let tx = 0.5, ty = 0.42, x = tx, y = ty, raf = 0;
    let rect = el.getBoundingClientRect();
    const write = () => {
      el.style.setProperty('--mx', x.toFixed(4));
      el.style.setProperty('--my', y.toFixed(4));
      el.style.setProperty('--px', (x * rect.width).toFixed(1) + 'px');
      el.style.setProperty('--py', (y * rect.height).toFixed(1) + 'px');
    };
    const tick = () => {
      x += (tx - x) * 0.1;
      y += (ty - y) * 0.1;
      write();
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0006 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      rect = el.getBoundingClientRect();
      tx = Math.min(1.15, Math.max(-0.15, (e.clientX - rect.left) / (rect.width || 1)));
      ty = Math.min(1.15, Math.max(-0.15, (e.clientY - rect.top) / (rect.height || 1)));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    write();
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, [ref, active]);
}

/* --------------------------------------------------------------------------------------
   SVG patterns: a faint base, a lit copy under the pointer, and a slow sheen across.
   -------------------------------------------------------------------------------------- */
type TileArt = (cls: string) => React.ReactNode;

const girihArt = (s: number): TileArt => (cls) => {
  const c = s / 2, a = s * 0.21, d = a * Math.SQRT2, b = s * 0.11;
  const corner = (x: number, y: number) => `${x},${y - b} ${x + b},${y} ${x},${y + b} ${x - b},${y}`;
  return (
    <>
      <g className={cls} fill="none" strokeWidth="1.1">
        <rect x={c - a} y={c - a} width={2 * a} height={2 * a} />
        <rect x={c - a} y={c - a} width={2 * a} height={2 * a} transform={`rotate(45 ${c} ${c})`} />
        <path d={`M${c} ${c - d}V0M${c + d} ${c}H${s}M${c} ${c + d}V${s}M${c - d} ${c}H0`} />
        <path d={`M${c - a} ${c - a}L0 0M${c + a} ${c - a}L${s} 0M${c + a} ${c + a}L${s} ${s}M${c - a} ${c + a}L0 ${s}`} />
        {[corner(0, 0), corner(s, 0), corner(0, s), corner(s, s)].map((p, i) => (
          <polygon key={i} points={p} />
        ))}
      </g>
      <circle className={cls === 's-a' ? 'f-b' : 'f-hl'} cx={c} cy={c} r={a * 0.5} opacity=".5" />
    </>
  );
};

const jaaliArt = (s: number): TileArt => (cls) => {
  const r = s / 2;
  return (
    <>
      <g className={cls} fill="none" strokeWidth="1.15">
        {[[0, 0], [s, 0], [0, s], [s, s], [r, r]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </g>
      {[[r, 0], [0, r], [s, r], [r, s]].map(([x, y], i) => (
        <circle key={i} className={cls === 's-a' ? 'f-b' : 'f-hl'} cx={x} cy={y} r="2.4" />
      ))}
    </>
  );
};

/* A boteh (paisley) drawn in a 60 × 90 box, with its curl at the top right. */
const PAISLEY = 'M30 88C10 86 1 66 6 48C11 30 28 24 33 12C35 6 41 3 45 8C49 13 44 19 46 27C51 42 60 56 56 71C52 83 43 89 30 88Z';
const mehndiArt = (s: number): TileArt => (cls) => {
  const dot = cls === 's-a' ? 'f-b' : 'f-hl';
  const paisley = (tf: string, key: string) => (
    <g key={key} transform={tf}>
      <g className={cls} fill="none" strokeWidth="1.15" strokeLinecap="round">
        <path d={PAISLEY} />
        <path d={PAISLEY} transform="translate(30 62) scale(.62) translate(-30 -62)" />
        <path d="M30 82C24 66 29 46 41 18" />
        <circle cx="42" cy="12" r="3" />
      </g>
      {[[14, 74], [10, 60], [12, 46], [20, 34]].map(([x, y], i) => (
        <circle key={i} className={dot} cx={x} cy={y} r="1.5" />
      ))}
    </g>
  );
  const flower = (cx: number, cy: number, key: string) => (
    <g key={key} className={cls} fill="none" strokeWidth="1.1">
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx={cx} cy={cy - 7} rx="3.2" ry="6.5" transform={`rotate(${i * 60} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r="2.4" />
    </g>
  );
  return (
    <>
      {paisley(`translate(6 8) rotate(-18 30 45) scale(.78)`, 'p1')}
      {paisley(`translate(${s - 8} ${s - 6}) rotate(162) scale(.62)`, 'p2')}
      {flower(s * 0.8, s * 0.2, 'f1')}
      {flower(s * 0.2, s * 0.82, 'f2')}
      {[[s * 0.5, s * 0.5], [s * 0.62, s * 0.42], [s * 0.38, s * 0.58]].map(([x, y], i) => (
        <circle key={i} className={dot} cx={x} cy={y} r={i ? 1.3 : 2} />
      ))}
    </>
  );
};

function PatternWall({ uid, kind, size, art }: { uid: string; kind: string; size: number; art: TileArt }) {
  const layer = (variant: 'base' | 'lit') => (
    <svg className="wp-svg" width="100%" height="100%">
      <defs>
        <pattern id={`${kind}-${variant}-${uid}`} width={size} height={size} patternUnits="userSpaceOnUse">
          {art(variant === 'base' ? 's-a' : 's-hl')}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${kind}-${variant}-${uid})`} />
    </svg>
  );
  return (
    <>
      <div className="wp-layer wp-base">{layer('base')}</div>
      <div className="wp-layer wp-spot">{layer('lit')}</div>
      <div className="wp-layer wp-sheen">{layer('lit')}</div>
    </>
  );
}

/* --------------------------------------------------------------------------------------
   SVG scenes.
   -------------------------------------------------------------------------------------- */
const par = (dx: number, dy: number): React.CSSProperties => ({
  transform: `translate(calc((var(--mx, .5) - .5) * ${-dx}px), calc((var(--my, .5) - .5) * ${-dy}px))`,
});

function Contour({ seed }: { seed: number }) {
  const paths = useMemo(() => {
    const rand = rng(seed);
    const out: { d: string; major: boolean }[] = [];
    for (let k = 0; k < 3; k++) {
      const cx = 160 + rand() * (W - 320), cy = 120 + rand() * (H - 240);
      const p1 = rand() * 6.28, p2 = rand() * 6.28, p3 = rand() * 6.28;
      const rings = 11 + Math.floor(rand() * 6);
      for (let i = 1; i <= rings; i++) {
        const R = i * (24 + k * 3);
        let d = '';
        for (let j = 0; j <= 72; j++) {
          const t = (j / 72) * TAU;
          const wob = 1 + 0.2 * Math.sin(2 * t + p1 + i * 0.07) + 0.1 * Math.sin(3 * t + p2 - i * 0.05) + 0.05 * Math.sin(5 * t + p3);
          d += (j ? 'L' : 'M') + r1(cx + Math.cos(t) * R * wob) + ' ' + r1(cy + Math.sin(t) * R * wob * 0.78);
        }
        out.push({ d: d + 'Z', major: i % 4 === 0 });
      }
    }
    return out;
  }, [seed]);
  const lines = (cls: string, flow: boolean) => (
    <svg className="wp-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <g className={cls} fill="none">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            className={flow && p.major ? 'flow' : undefined}
            strokeWidth={p.major ? 1.5 : 0.9}
            opacity={p.major ? 0.45 : 0.22}
            style={flow && p.major ? { animationDelay: `${-(i % 7) * 2.3}s` } : undefined}
          />
        ))}
      </g>
    </svg>
  );
  return (
    <>
      <div className="wp-layer wp-base">{lines('s-a', true)}</div>
      <div className="wp-layer wp-spot">{lines('s-hl', false)}</div>
    </>
  );
}

function Marble({ seed, uid }: { seed: number; uid: string }) {
  const veins = useMemo(() => {
    const rand = rng(seed);
    return Array.from({ length: 11 }, (_, i) => {
      const y0 = rand() * H, y3 = rand() * H;
      const d = `M-40 ${r1(y0)}C${r1(300 + rand() * 300)} ${r1(rand() * H)} ${r1(900 + rand() * 300)} ${r1(rand() * H)} ${W + 40} ${r1(y3)}`;
      const gold = i < 2;
      return { d, w: gold ? 1.3 : 0.5 + rand() * 1.8, o: gold ? 0.55 : 0.1 + rand() * 0.22, gold };
    });
  }, [seed]);
  return (
    <>
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
          {/* A glint of light running along each gold vein. */}
          {veins
            .filter((v) => v.gold)
            .map((v, i) => (
              <path key={'g' + i} d={v.d} className="glint" strokeWidth={v.w + 1.4} style={{ animationDelay: `${-i * 3.4}s` }} />
            ))}
        </g>
      </svg>
      <div className="wp-polish" />
    </>
  );
}

function Sweep({ seed }: { seed: number }) {
  const off = (rng(seed)() - 0.5) * 140;
  return (
    <svg className="wp-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <g transform={`translate(0 ${r1(off)})`}>
        <g style={par(70, 40)}>
          <path className="f-b sway s1" opacity=".16" d="M480 -60C1000 -20 1420 220 1700 660L1700 430C1420 130 1000 -30 480 -60Z" />
          <path className="f-b sway s2" opacity=".1" d="M820 110C1160 160 1430 360 1660 790L1612 790C1390 410 1130 210 820 110Z" />
        </g>
        <g style={par(30, 18)}>
          <path className="f-a sway s3" opacity=".07" d="M-90 800C310 690 720 760 1020 1100L900 1100C640 830 300 770 -90 900Z" />
          <path className="f-b" opacity=".12" d="M0 40L520 26 520 32 0 50Z" />
        </g>
      </g>
    </svg>
  );
}

function Dunes({ seed, uid }: { seed: number; uid: string }) {
  const { layers, sunX } = useMemo(() => {
    const rand = rng(seed);
    const layers = [0, 1, 2, 3].map((i) => {
      const base = 560 + i * 110;
      // Drawn wider than the view so the slow drift never shows an edge.
      let d = `M-200 ${H}L-200 ${base}`;
      let x = -200, y = base;
      while (x < W + 200) {
        const nx = x + 260 + rand() * 220;
        const ny = base + (rand() - 0.5) * (90 - i * 12);
        d += `Q${r1((x + nx) / 2 + (rand() - 0.5) * 80)} ${r1(Math.min(y, ny) - 40 - rand() * 50)} ${r1(nx)} ${r1(ny)}`;
        x = nx;
        y = ny;
      }
      return d + `L${W + 200} ${H}Z`;
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
      <g style={par(16, 10)}>
        <circle className="sun" cx={sunX} cy="300" r="260" fill={`url(#sun-${uid})`} />
      </g>
      {layers.map((d, i) => (
        <g key={i} style={par(14 + i * 22, 6 + i * 6)}>
          <path className={`${cls[i]} drift d${i}`} d={d} opacity={op[i]} />
        </g>
      ))}
    </svg>
  );
}

function Night({ seed }: { seed: number }) {
  const { stars, near, far } = useMemo(() => {
    const rand = rng(seed);
    const stars = Array.from({ length: 230 }, () => ({
      x: r1(rand() * W), y: r1(rand() * H * 0.8), r: r1(0.4 + rand() * rand() * 1.6), o: 0.3 + rand() * 0.7, tw: rand() < 0.2, delay: r1(rand() * 6),
    }));
    const ridge = (base: number, amp: number) => {
      let d = `M-100 ${H}L-100 ${base}`;
      for (let x = -100; x <= W + 100; x += 60 + rand() * 60) d += `L${r1(x)} ${r1(base - rand() * amp)}`;
      return d + `L${W + 100} ${base}L${W + 100} ${H}Z`;
    };
    return { stars, far: ridge(790, 170), near: ridge(880, 110) };
  }, [seed]);
  return (
    <>
      <div className="wp-glow g1" />
      <div className="wp-glow g2" />
      <svg className="wp-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" width="100%" height="100%">
        <g style={par(14, 10)}>
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} className={s.tw ? 'tw' : undefined} style={s.tw ? { animationDelay: `${s.delay}s` } : undefined} />
          ))}
        </g>
        <g style={par(30, 8)}>
          <path d={far} className="f-brand-dk" opacity=".75" />
        </g>
        <g style={par(52, 12)}>
          <path d={near} fill="#03050B" opacity=".9" />
        </g>
      </svg>
      <i className="shoot s1" />
      <i className="shoot s2" />
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
      {/* One glow keeps the pointer company. */}
      <div className="wp-blob c-b follow" />
    </>
  );
}

function Velvet({ uid }: { uid: string }) {
  return (
    <>
      <div className="wp-light" />
      <svg className="wp-svg wp-grain" width="100%" height="100%">
        <filter id={`grain-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${uid})`} />
      </svg>
    </>
  );
}

function toHex(css: string) {
  const m = css.match(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  return m ? '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('') : '';
}

/** The interactive dots take the theme's colour; the canvas needs it as a hex value. */
function Dots({ themeKey }: { themeKey: string }) {
  const [accent, setAccent] = React.useState('');
  useEffect(() => {
    // Read again once a theme cross-fade has settled.
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
      setAccent(/^#[0-9a-f]{6}$/i.test(v) ? v : toHex(v) || '#1F2456');
    };
    read();
    const t = window.setTimeout(read, 900);
    return () => window.clearTimeout(t);
  }, [themeKey]);
  return accent ? <DotField key={accent} accent={accent} /> : null;
}

/* --------------------------------------------------------------------------------------
   Canvas scenes.
   -------------------------------------------------------------------------------------- */
interface Frame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  t: number;
  dt: number;
  /** Eased pointer in canvas px, and whether it is over the wallpaper. */
  px: number;
  py: number;
  inside: boolean;
  col: (name: string) => string;
}
interface Scene {
  resize?: (w: number, h: number, col: (name: string) => string) => void;
  draw: (f: Frame) => void;
  move?: (x: number, y: number) => void;
  click?: (x: number, y: number) => void;
}

const COLOR_VARS = ['--wp-a', '--wp-b', '--wp-c', '--brand', '--brand-dk', '--brand-wash', '--hl', '--hl-dk', '--paper', '--paper-2'];

function CanvasWall({ make, seed, still, themeKey }: { make: (rand: () => number) => Scene; seed: number; still: boolean; themeKey: string }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = box.current, canvas = cv.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!el || !canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const colors: Record<string, string> = {};
    let colorKey = '';
    const readColors = () => {
      const cs = getComputedStyle(el);
      COLOR_VARS.forEach((k) => (colors[k] = cs.getPropertyValue(k).trim() || '#888'));
      const key = COLOR_VARS.map((k) => colors[k]).join();
      const changed = key !== colorKey;
      colorKey = key;
      return changed;
    };
    const col = (k: string) => colors[k] || k;
    const scene = make(rng(seed));
    let w = 0, h = 0;
    const resize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (scene.resize) scene.resize(w, h, col);
    };
    readColors();
    resize();

    const p = { x: w * 0.5, y: h * 0.4, sx: w * 0.5, sy: h * 0.4, inside: false };
    const frame = (t: number, dt: number) => scene.draw({ ctx, w, h, t, dt, px: p.sx, py: p.sy, inside: p.inside, col });

    if (still || reducedMotion()) {
      frame(6, 0);
      // A theme change cross-fades for .8s; draw again once its colours have settled.
      const settle = window.setTimeout(() => {
        if (readColors() && scene.resize) scene.resize(w, h, col);
        frame(6, 0);
      }, 900);
      return () => window.clearTimeout(settle);
    }

    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom,
      };
    };
    const onMove = (e: PointerEvent) => {
      const l = local(e);
      p.x = l.x;
      p.y = l.y;
      p.inside = l.inside;
      if (l.inside && scene.move) scene.move(l.x, l.y);
    };
    const onDown = (e: PointerEvent) => {
      const l = local(e);
      if (l.inside && scene.click) scene.click(l.x, l.y);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0, last = performance.now(), sinceColors = 0;
    const start = last;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      sinceColors += dt;
      // A theme change cross-fades its colours; follow along.
      if (sinceColors > 0.25) {
        sinceColors = 0;
        if (readColors() && scene.resize) scene.resize(w, h, col);
      }
      p.sx += (p.x - p.sx) * 0.12;
      p.sy += (p.y - p.sy) * 0.12;
      frame((now - start) / 1000, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, still, themeKey]);
  return (
    <div ref={box} className="wp-canvas">
      <canvas ref={cv} />
    </div>
  );
}

/** Rawal lake: raindrops ring the still water; the pointer and clicks ripple it too. */
const ripplesScene = (rand: () => number): Scene => {
  type Ring = { x: number; y: number; r: number; max: number; str: number; v: number };
  const rings: Ring[] = [];
  let next = 0, lx = -1e4, ly = -1e4, primed = false;
  const spawn = (x: number, y: number, max: number, str: number) => rings.push({ x, y, r: 0, max, str, v: 36 + max * 0.22 });
  return {
    resize(w, h) {
      if (primed) return;
      primed = true;
      for (let i = 0; i < 9; i++) {
        spawn(rand() * w, rand() * h, 120 + rand() * 140, 0.8);
        rings[rings.length - 1].r = rand() * rings[rings.length - 1].max * 0.8;
      }
    },
    move(x, y) {
      if (Math.hypot(x - lx, y - ly) > 70) {
        spawn(x, y, 80 + rand() * 50, 0.6);
        lx = x;
        ly = y;
      }
    },
    click(x, y) {
      spawn(x, y, 340, 1.25);
      spawn(x, y, 230, 0.9);
    },
    draw({ ctx, w, h, t, dt, col }) {
      ctx.clearRect(0, 0, w, h);
      // Light on the water: faint bands that shimmer.
      ctx.fillStyle = col('--wp-c');
      for (let y = h * 0.1; y < h; y += 26) {
        ctx.globalAlpha = 0.035 + 0.03 * Math.sin(t * 0.8 + y * 0.05);
        ctx.fillRect(0, y, w, 1.4);
      }
      next -= dt;
      if (next <= 0) {
        spawn(rand() * w, rand() * h, 110 + rand() * 160, 0.7 + rand() * 0.3);
        next = 0.6 + rand() * 1.1;
      }
      ctx.lineWidth = 1.3;
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.r += g.v * dt;
        const k = g.r / g.max;
        if (k >= 1) {
          rings.splice(i, 1);
          continue;
        }
        const a = Math.pow(1 - k, 1.6) * g.str;
        // Seen across the lake, each ring is an ellipse.
        ctx.strokeStyle = col('--wp-a');
        ctx.globalAlpha = a * 0.55;
        ctx.beginPath();
        ctx.ellipse(g.x, g.y, g.r, g.r * 0.4, 0, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = a * 0.3;
        ctx.beginPath();
        ctx.ellipse(g.x, g.y, g.r * 0.72, g.r * 0.29, 0, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = col('--wp-b');
        ctx.globalAlpha = a * 0.28;
        ctx.beginPath();
        ctx.ellipse(g.x, g.y, g.r * 0.46, g.r * 0.18, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
};

/** Resham silk: translucent ribbons that drift and part around the pointer. */
const silkScene = (rand: () => number): Scene => {
  const cols = ['--wp-a', '--wp-b', '--wp-c', '--brand', '--wp-b', '--wp-a'];
  const ribbons = cols.map((c, i) => ({
    c, y: 0.16 + i * 0.14 + (rand() - 0.5) * 0.05, a: 26 + rand() * 40, l: 360 + rand() * 320, s: 0.22 + rand() * 0.3,
    p: rand() * TAU, th: 40 + rand() * 70, op: 0.09 + rand() * 0.07,
  }));
  const top: number[] = [], bot: number[] = [];
  return {
    draw({ ctx, w, h, t, px, py, inside, col }) {
      ctx.clearRect(0, 0, w, h);
      for (const rb of ribbons) {
        top.length = 0;
        bot.length = 0;
        const y0 = rb.y * h;
        for (let x = -20; x <= w + 20; x += 14) {
          let y = y0 + rb.a * Math.sin(x / rb.l + t * rb.s + rb.p) + rb.a * 0.5 * Math.sin(x / (rb.l * 0.6) - t * rb.s * 1.3 + rb.p * 2);
          if (inside) {
            const dx = x - px, dy = y - py;
            const inf = Math.exp(-(dx * dx) / (2 * 150 * 150)) * Math.exp(-(dy * dy) / (2 * 120 * 120));
            y += (dy >= 0 ? 1 : -1) * 70 * inf;
          }
          top.push(x, y);
          bot.push(x, y + rb.th * (0.55 + 0.45 * Math.sin(x / (rb.l * 0.8) + t * rb.s * 0.7 + rb.p)));
        }
        ctx.beginPath();
        ctx.moveTo(top[0], top[1]);
        for (let i = 2; i < top.length; i += 2) ctx.lineTo(top[i], top[i + 1]);
        for (let i = bot.length - 2; i >= 0; i -= 2) ctx.lineTo(bot[i], bot[i + 1]);
        ctx.closePath();
        ctx.fillStyle = col(rb.c);
        ctx.globalAlpha = rb.op;
        ctx.fill();
        // The sheen along the upper edge is what makes it read as silk.
        ctx.beginPath();
        ctx.moveTo(top[0], top[1]);
        for (let i = 2; i < top.length; i += 2) ctx.lineTo(top[i], top[i + 1]);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.strokeStyle = col(rb.c);
        ctx.globalAlpha = rb.op * 2.4;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* A soft fade where the icons sit, so busy scenes frame the middle instead of filling it. */
const centreFade = (w: number, h: number, x: number, y: number) => {
  const nx = (x - w * 0.5) / (w * 0.42), ny = (y - h * 0.46) / (h * 0.5);
  return Math.min(1, 0.32 + 0.68 * Math.min(1, Math.sqrt(nx * nx + ny * ny)));
};

const offscreen = (w: number, h: number) => {
  const c = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return { c, ctx };
};

/** Shisha: embroidered mirrors that catch the light coming from the pointer. */
const shishaScene = (rand: () => number): Scene => {
  type Mirror = { x: number; y: number; f: number; ph: number };
  let mirrors: Mirror[] = [];
  let cloth: HTMLCanvasElement | null = null;
  const R = 12;
  return {
    resize(w, h, col) {
      const gap = 118;
      mirrors = [];
      for (let row = 0, y = 34; y < h + gap; y += gap * 0.86, row++)
        for (let x = (row % 2) * gap * 0.5 + 20; x < w + gap; x += gap) mirrors.push({ x, y, f: centreFade(w, h, x, y), ph: rand() * TAU });
      const { c: canvas, ctx: c } = offscreen(w, h);
      cloth = canvas;
      for (const m of mirrors) {
        // Calmer where the icons sit: the fade is squared for the embroidery.
        m.f = m.f * m.f;
        c.globalAlpha = 0.8 * m.f;
        // Stitched ring, a ring of knots, four petals, and a diamond stitch between mirrors.
        c.setLineDash([2.2, 2.6]);
        c.lineWidth = 1.8;
        c.strokeStyle = col('--hl');
        c.beginPath();
        c.arc(m.x, m.y, R + 5, 0, TAU);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = col('--wp-a');
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          c.beginPath();
          c.arc(m.x + Math.cos(a) * (R + 11), m.y + Math.sin(a) * (R + 11), 1.7, 0, TAU);
          c.fill();
        }
        c.fillStyle = col('--wp-c');
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU + Math.PI / 4;
          c.save();
          c.translate(m.x + Math.cos(a) * (R + 22), m.y + Math.sin(a) * (R + 22));
          c.rotate(a);
          c.beginPath();
          c.ellipse(0, 0, 7, 3.2, 0, 0, TAU);
          c.fill();
          c.restore();
        }
        c.fillStyle = col('--wp-b');
        c.beginPath();
        c.moveTo(m.x + 48, m.y - 5);
        c.lineTo(m.x + 52, m.y);
        c.lineTo(m.x + 48, m.y + 5);
        c.lineTo(m.x + 44, m.y);
        c.fill();
        // The mirror itself: polished silver.
        c.globalAlpha = Math.max(0.3, m.f);
        const g = c.createRadialGradient(m.x - 4, m.y - 4, 1, m.x, m.y, R);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.55, '#c9d0d8');
        g.addColorStop(1, '#8b95a2');
        c.fillStyle = g;
        c.beginPath();
        c.arc(m.x, m.y, R, 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
    },
    draw({ ctx, w, h, t, px, py, inside }) {
      ctx.clearRect(0, 0, w, h);
      if (cloth) ctx.drawImage(cloth, 0, 0, w, h);
      // Without a pointer, the light circles slowly.
      const lx = inside ? px : w * (0.5 + 0.35 * Math.cos(t * 0.25));
      const ly = inside ? py : h * (0.45 + 0.3 * Math.sin(t * 0.31));
      for (const m of mirrors) {
        const vx = lx - m.x, vy = ly - m.y, d = Math.hypot(vx, vy) || 1;
        const near = Math.exp(-(d * d) / (2 * 230 * 230));
        const hx = m.x + (vx / d) * R * 0.45, hy = m.y + (vy / d) * R * 0.45;
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.9);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = (0.25 + 0.75 * near) * Math.max(0.35, m.f);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, R, 0, TAU);
        ctx.fill();
        // Now and then a mirror flashes a four-pointed glint.
        const flash = Math.max(0, Math.sin(t * 0.9 + m.ph) - 0.94) / 0.06 + near * 0.6;
        if (flash > 0.05) {
          ctx.globalAlpha = Math.min(1, flash) * Math.max(0.4, m.f);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          const L = 5 + 9 * Math.min(1, flash);
          ctx.beginPath();
          ctx.moveTo(hx - L, hy);
          ctx.lineTo(hx + L, hy);
          ctx.moveTo(hx, hy - L);
          ctx.lineTo(hx, hy + L);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
};

/** Kashi: glazed tiles; a wave of light runs across them and the glaze shines under the pointer. */
const kashiScene = (rand: () => number): Scene => {
  const S = 84;
  let tiles: HTMLCanvasElement | null = null;
  let cells: { x: number; y: number }[] = [];
  const twist = rand() * 0.6;
  return {
    resize(w, h, col) {
      cells = [];
      const { c: canvas, ctx: c } = offscreen(w, h);
      tiles = canvas;
      for (let y = 0; y < h + S; y += S)
        for (let x = 0; x < w + S; x += S) {
          cells.push({ x, y });
          const cx = x + S / 2, cy = y + S / 2, f0 = centreFade(w, h, cx, cy), f = f0 * f0;
          c.globalAlpha = 0.9 * Math.max(0.35, f);
          c.fillStyle = ((x + y) / S) % 2 ? col('--paper') : col('--brand-wash');
          c.fillRect(x, y, S, S);
          // Quarter circles at the corners join into rounds across four tiles.
          c.fillStyle = col('--wp-c');
          c.globalAlpha = 0.24 * f;
          for (const [qx, qy] of [[x, y], [x + S, y], [x, y + S], [x + S, y + S]]) {
            c.beginPath();
            c.arc(qx, qy, 17, 0, TAU);
            c.fill();
          }
          c.fillStyle = col('--wp-a');
          c.globalAlpha = 0.34 * f;
          for (let i = 0; i < 8; i++) {
            c.save();
            c.translate(cx, cy);
            c.rotate((i / 8) * TAU + twist);
            c.beginPath();
            c.ellipse(0, -15, 5.2, 13, 0, 0, TAU);
            c.fill();
            c.restore();
          }
          c.fillStyle = col('--hl');
          c.globalAlpha = 0.7 * f;
          c.beginPath();
          c.arc(cx, cy, 6, 0, TAU);
          c.fill();
          // Grout.
          c.globalAlpha = 0.7;
          c.strokeStyle = '#ffffff';
          c.lineWidth = 2;
          c.strokeRect(x + 1, y + 1, S - 2, S - 2);
        }
      c.globalAlpha = 1;
    },
    draw({ ctx, w, h, t, px, py, inside }) {
      ctx.clearRect(0, 0, w, h);
      if (tiles) ctx.drawImage(tiles, 0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      for (const c of cells) {
        const s = Math.sin(t * 0.9 - (c.x + c.y) / 240);
        if (s > 0.55) {
          ctx.globalAlpha = (s - 0.55) * 0.5;
          ctx.fillRect(c.x + 2, c.y + 2, S - 4, S - 4);
        }
      }
      if (inside) {
        const g = ctx.createRadialGradient(px, py, 0, px, py, 260);
        g.addColorStop(0, 'rgba(255,255,255,.55)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    },
  };
};

/** Chiraghan: lamps rising over a skyline of domes and minarets; click to release more. */
const lanternsScene = (rand: () => number): Scene => {
  type Lamp = { x: number; y: number; z: number; sp: number; sw: number; ph: number; c: number };
  const make = (y?: number): Lamp => ({
    x: rand(), y: y ?? 1 + rand() * 0.2, z: 0.25 + rand() * 0.75, sp: 0.02 + rand() * 0.035, sw: 0.4 + rand() * 0.8, ph: rand() * TAU, c: Math.floor(rand() * 3),
  });
  const lamps: Lamp[] = Array.from({ length: 64 }, () => make(rand() * 1.1));
  const cols = ['--hl', '--wp-b', '#FFD58A'];
  let skyline: Path2D | null = null;
  let sw = 1, sh = 1;
  return {
    resize(w, h) {
      sw = w || 1;
      sh = h || 1;
      // Domes and minarets along the bottom, from the seed.
      const p = new Path2D(), f = new Path2D();
      const base = h * 0.94;
      p.moveTo(-60, h);
      p.lineTo(-60, base);
      let x = -40;
      while (x < w + 60) {
        const kind = rand();
        if (kind < 0.42) {
          const r = 22 + rand() * 46, wall = 18 + rand() * 30;
          p.lineTo(x, base - wall);
          p.ellipse(x + r, base - wall, r * 0.92, r * 0.95, 0, Math.PI, 0);
          p.lineTo(x + r * 2, base);
          // A finial on top, kept out of the outline so the outline stays one closed shape.
          f.rect(x + r - 1.2, base - wall - r * 0.95 - 12, 2.4, 13);
          f.moveTo(x + r + 4, base - wall - r * 0.95 - 12);
          f.arc(x + r, base - wall - r * 0.95 - 12, 4, 0, TAU);
          x += r * 2 + 6;
        } else if (kind < 0.7) {
          const tall = 90 + rand() * 120, bw = 9 + rand() * 6;
          p.lineTo(x, base);
          p.lineTo(x, base - tall);
          p.ellipse(x + bw / 2, base - tall, bw / 2 + 3, bw * 0.9, 0, Math.PI, 0);
          p.lineTo(x + bw, base - tall);
          p.lineTo(x + bw, base);
          x += bw + 14;
        } else {
          const bh = 24 + rand() * 40, bw = 40 + rand() * 70;
          p.lineTo(x, base - bh);
          p.lineTo(x + bw, base - bh);
          p.lineTo(x + bw, base);
          x += bw;
        }
      }
      p.lineTo(w + 60, base);
      p.lineTo(w + 60, h);
      p.closePath();
      p.addPath(f);
      skyline = p;
    },
    click(x, y) {
      for (let i = 0; i < 7; i++) {
        const l = make();
        l.x = x / sw + (rand() - 0.5) * 0.05;
        l.y = y / sh;
        l.sp *= 2.2;
        l.z = 0.6 + rand() * 0.4;
        lamps.push(l);
      }
      if (lamps.length > 140) lamps.splice(0, lamps.length - 140);
    },
    draw({ ctx, w, h, t, dt, px, py, inside, col }) {
      ctx.clearRect(0, 0, w, h);
      const mx = inside ? px / w - 0.5 : 0, my = inside ? py / h - 0.5 : 0;
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lamps) {
        l.y -= l.sp * dt * (0.6 + l.z);
        if (l.y < -0.08) Object.assign(l, make());
        let x = l.x * w + Math.sin(t * l.sw + l.ph) * 14 * l.z - mx * 70 * l.z;
        let y = l.y * h - my * 30 * l.z;
        if (inside) {
          const dx = x - px, dy = y - py, d = Math.hypot(dx, dy);
          if (d < 150 && d > 0) {
            x += (dx / d) * (150 - d) * 0.35;
            y += (dy / d) * (150 - d) * 0.35;
          }
        }
        const r = 3 + l.z * 9;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
        g.addColorStop(0, col(cols[l.c]));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.5 * l.z * (0.75 + 0.25 * Math.sin(t * 3 + l.ph));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 3.2, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.9 * l.z;
        ctx.fillStyle = '#FFF2D2';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.38, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (skyline) {
        ctx.save();
        ctx.translate(-mx * 18, 0);
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = '#05060B';
        ctx.fill(skyline);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
};

/* --------------------------------------------------------------------------------------
   The wallpaper.
   -------------------------------------------------------------------------------------- */
const CANVAS: Record<string, (rand: () => number) => Scene> = {
  ripples: ripplesScene,
  silk: silkScene,
  shisha: shishaScene,
  kashi: kashiScene,
  lanterns: lanternsScene,
};

export function Wallpaper({ id, seed, still = false, themeKey = '' }: { id: string; seed: number; still?: boolean; themeKey?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ref = useRef<HTMLDivElement>(null);
  usePointerVars(ref, !still);
  let art: React.ReactNode = null;
  if (CANVAS[id]) art = <CanvasWall make={CANVAS[id]} seed={seed} still={still} themeKey={themeKey} />;
  else if (id === 'girih') art = <PatternWall uid={uid} kind="girih" size={76} art={girihArt(76)} />;
  else if (id === 'jaali') art = <PatternWall uid={uid} kind="jaali" size={58} art={jaaliArt(58)} />;
  else if (id === 'mehndi') art = <PatternWall uid={uid} kind="mehndi" size={120} art={mehndiArt(120)} />;
  else if (id === 'contour') art = <Contour seed={seed} />;
  else if (id === 'marble') art = <Marble seed={seed} uid={uid} />;
  else if (id === 'sweep') art = <Sweep seed={seed} />;
  else if (id === 'dunes') art = <Dunes seed={seed} uid={uid} />;
  else if (id === 'night') art = <Night seed={seed} />;
  else if (id === 'aurora') art = <Aurora seed={seed} />;
  else if (id === 'velvet') art = <Velvet uid={uid} />;
  else if (id === 'clean') art = <div className="wp-light" />;
  else if (id === 'dots' && !still) art = <Dots themeKey={themeKey} />;
  return (
    <div ref={ref} className={`wallpaper wp-${id}${still ? ' still' : ''}`} aria-hidden="true">
      {art}
    </div>
  );
}
