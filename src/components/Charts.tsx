'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import * as M from '../lib/re-data';

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v))),
    n = v / e;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * e;
}

const yTicks = (max: number, min: number, n = 4) =>
  Array.from({ length: n + 1 }, (_, i) => min + ((max - min) * i) / n);

function axMoney(n: number, numbersFormat: string) {
  const p = M.fmtParts(n, numbersFormat === 'full' ? 'cr' : numbersFormat);
  return p.sign + p.num + (p.unit || '');
}

const pct = (n: number, d = 1) => (isFinite(n) ? n.toFixed(d) + '%' : '—');

/** The figure written on a bar: every digit when "Full PKR" is picked, otherwise in crore or lakh
    to two places (1.73Cr, 67.25Lakh) and in full below a lakh, so no bar is rounded out of shape. */
export function barValue(n: number, numbersFormat: string) {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (numbersFormat === 'full') return sign + Math.round(a).toLocaleString('en-US');
  if (numbersFormat === 'm') return axMoney(n, numbersFormat);
  const two = (v: number) => String(+v.toFixed(2));
  if (a >= 9.995e6) return sign + two(a / 1e7) + 'Cr';
  if (a >= 1e5) return sign + two(a / 1e5) + 'Lakh';
  return sign + Math.round(a).toLocaleString('en-US');
}
/** Roughly how wide a bar's figure is drawn, in the units of the chart. */
const textW = (t: string) => t.length * 6.3 + 6;

export function ChartGroupedBars({
  rows,
  s1,
  s2,
  l1,
  l2,
}: {
  rows: any[];
  s1: string;
  s2: string;
  l1: string;
  l2: string;
}) {
  const { numbers, showTip, hideTip } = useApp();
  const W = 760,
    H = 230,
    PL = 46,
    PR = 12,
    PT = 12,
    PB = 28;
  const iw = W - PL - PR,
    ih = H - PT - PB;
  const max = niceMax(Math.max(1, ...rows.map((r) => Math.max(r[s1] || 0, r[s2] || 0))));
  const y = (v: number) => PT + ih - (v / max) * ih;
  const bw = iw / (rows.length || 1),
    barW = Math.max(5, Math.min(19, (bw - 8) / 2));

  return (
    <div className="chart">
      <div className="legend">
        <span className="it">
          <i className="sw" style={{ background: 'var(--s1)' }} />
          {l1}
        </span>
        <span className="it">
          <i className="sw" style={{ background: 'var(--s2)' }} />
          {l2}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${l1} versus ${l2}`}>
        {yTicks(max, 0).map((t, idx) => (
          <React.Fragment key={idx}>
            <line className="gridline" x1={PL} x2={W - PR} y1={y(t).toFixed(1)} y2={y(t).toFixed(1)} />
            <text className="ax" x={PL - 8} y={(y(t) + 3.5).toFixed(1)} textAnchor="end">
              {axMoney(t, numbers)}
            </text>
          </React.Fragment>
        ))}
        {rows.map((r, i) => {
          const cx = PL + bw * i + bw / 2;
          const tipHtml = `<div class="tt">${r.label}</div><div class="rw"><i class="sw" style="background:var(--s1)"></i>${l1}<b class="vv">${M.fmt(r[s1], numbers)}</b></div><div class="rw"><i class="sw" style="background:var(--s2)"></i>${l2}<b class="vv">${M.fmt(r[s2], numbers)}</b></div>`;
          return (
            <React.Fragment key={i}>
              <rect
                x={(cx - barW - 1).toFixed(1)}
                y={y(r[s1] || 0).toFixed(1)}
                width={barW}
                height={Math.max(0, PT + ih - y(r[s1] || 0)).toFixed(1)}
                rx="3"
                fill="var(--s1)"
              />
              <rect
                x={(cx + 1).toFixed(1)}
                y={y(r[s2] || 0).toFixed(1)}
                width={barW}
                height={Math.max(0, PT + ih - y(r[s2] || 0)).toFixed(1)}
                rx="3"
                fill="var(--s2)"
              />
              <rect
                x={(PL + bw * i).toFixed(1)}
                y={PT}
                width={bw.toFixed(1)}
                height={ih}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => showTip(tipHtml, e.clientX, e.clientY)}
                onMouseLeave={hideTip}
              />
              {(rows.length <= 14 || i % 2 === 0) && (
                <text className="ax" x={cx.toFixed(1)} y={H - 9} textAnchor="middle">
                  {r.label}
                </text>
              )}
            </React.Fragment>
          );
        })}
        <line className="axline" x1={PL} x2={W - PR} y1={PT + ih} y2={PT + ih} />
      </svg>
    </div>
  );
}

export function ChartDonut({ items }: { items: { k: string; v: number; c: string }[] }) {
  const { numbers, showTip, hideTip } = useApp();
  const R = 88,
    r = 54,
    cx = 105,
    cy = 105;
  const total = items.reduce((a, x) => a + x.v, 0) || 1;
  let a0 = -Math.PI / 2;

  const segs = items.map((it, idx) => {
    const sweep = (it.v / total) * Math.PI * 2;
    const a1 = a0 + Math.max(0, sweep - 0.016);
    const big = sweep > Math.PI ? 1 : 0;
    const p = (rad: number, ang: number) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
    const [x1, y1] = p(R, a0),
      [x2, y2] = p(R, a1),
      [x3, y3] = p(r, a1),
      [x4, y4] = p(r, a0);
    const tipHtml = `<div class="tt">${it.k}</div><div class="rw"><b class="vv">${M.fmt(
      it.v,
      numbers
    )}</b></div><div class="rw">${pct((it.v / total) * 100)} of total</div>`;
    a0 += sweep;
    return (
      <path
        key={idx}
        d={`M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${big} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(
          2
        )} ${y3.toFixed(2)} A${r} ${r} 0 ${big} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`}
        fill={it.c}
        style={{ cursor: 'pointer' }}
        onMouseMove={(e) => showTip(tipHtml, e.clientX, e.clientY)}
        onMouseLeave={hideTip}
      />
    );
  });

  return (
    <div className="chart">
      <svg viewBox="0 0 210 210" style={{ maxWidth: '215px', margin: '0 auto', display: 'block' }} role="img" aria-label="Breakdown by share">
        {segs}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--ink-3)" letterSpacing="1.4">
          TOTAL
        </text>
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--ink)">
          {axMoney(total, numbers)}
        </text>
      </svg>
    </div>
  );
}

export function ChartWaterfall({ steps }: { steps: any[] }) {
  const { numbers, showTip, hideTip } = useApp();
  const W = 780,
    H = 260,
    PL = 8,
    PR = 8,
    PT = 24,
    PB = 58;
  const iw = W - PL - PR,
    ih = H - PT - PB;
  // Every bar stands on the axis. A cost step is drawn at its size, in the cost colour,
  // rather than hanging from the bar before it.
  const pts = steps.map((s) => ({ ...s, from: 0, to: s.total ? s.v : Math.abs(s.v) }));
  const hi = Math.max(...pts.map((p) => Math.max(p.from, p.to)), 0);
  const lo = Math.min(...pts.map((p) => Math.min(p.from, p.to)), 0);
  const max = niceMax(hi),
    min = lo < 0 ? -niceMax(-lo) : 0;
  const y = (v: number) => PT + ih - ((v - min) / (max - min || 1)) * ih;
  const bw = iw / (pts.length || 1),
    barW = Math.min(62, bw - 14);

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Profit bridge">
        <line className="axline" x1={PL} x2={W - PR} y1={y(0).toFixed(1)} y2={y(0).toFixed(1)} />
        {pts.map((p, i) => {
          const cx = PL + bw * i + bw / 2;
          const yTop = Math.min(y(p.from), y(p.to)),
            h = Math.max(2, Math.abs(y(p.to) - y(p.from)));
          const c = p.total ? 'var(--brand)' : p.v >= 0 ? 'var(--s3)' : 'var(--s2)';
          const tipHtml = `<div class="tt">${p.k}</div><div class="rw"><b class="vv">${M.fmt(
            p.total ? p.to : p.v,
            numbers
          )}</b></div>${p.why ? `<div class="rw">${p.why}</div>` : ''}`;

          let line = '',
            lines: string[] = [];
          String(p.k)
            .split(' ')
            .forEach((w) => {
              if ((line + ' ' + w).trim().length > 11) {
                lines.push(line.trim());
                line = w;
              } else line += ' ' + w;
            });
          lines.push(line.trim());

          return (
            <React.Fragment key={i}>
              <rect
                x={(cx - barW / 2).toFixed(1)}
                y={yTop.toFixed(1)}
                width={barW.toFixed(1)}
                height={h.toFixed(1)}
                rx="3"
                fill={c}
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => showTip(tipHtml, e.clientX, e.clientY)}
                onMouseLeave={hideTip}
              />
              <text
                className="dlab"
                x={cx.toFixed(1)}
                y={(yTop - 6).toFixed(1)}
                textAnchor="middle"
                fill={p.total ? 'var(--brand)' : undefined}
              >
                {axMoney(p.total ? p.to : p.v, numbers)}
              </text>
              {lines.slice(0, 3).map((l, li) => (
                <text
                  key={li}
                  className="ax"
                  x={cx.toFixed(1)}
                  y={(PT + ih + 15 + li * 10.5).toFixed(1)}
                  textAnchor="middle"
                  fontWeight={p.total ? '700' : undefined}
                  fill={p.total ? 'var(--ink)' : undefined}
                >
                  {l}
                </text>
              ))}
            </React.Fragment>
          );
        })}
      </svg>
    </div>
  );
}

export function ShareBar({ items, total }: { items: { k: string; v: number; c: string; disp?: string }[]; total?: number }) {
  const { showTip, hideTip } = useApp();
  const t = total || items.reduce((a, x) => a + x.v, 0) || 1;

  return (
    <div className="sharebar">
      {items
        .filter((x) => x.v > 0)
        .map((x, idx) => {
          const tipHtml = `<div class="tt">${x.k}</div><div class="rw"><b class="vv">${
            x.disp || M.fmtNum(x.v)
          }</b></div><div class="rw">${pct((x.v / t) * 100)}</div>`;
          return (
            <i
              key={idx}
              style={{ width: `${((x.v / t) * 100).toFixed(2)}%`, background: x.c }}
              onMouseMove={(e) => showTip(tipHtml, e.clientX, e.clientY)}
              onMouseLeave={hideTip}
            />
          );
        })}
    </div>
  );
}

export function RankedList({
  items,
  total,
  onGo,
}: {
  items: { k: string; v: number; c: string; disp?: string; go?: string }[];
  total?: number;
  onGo?: (target: string) => void;
}) {
  const { numbers, goto } = useApp();
  const t = total || items.reduce((a, x) => a + x.v, 0) || 1;

  return (
    <div className="ranked">
      {items.map((x, idx) => {
        const handleClick = () => {
          if (x.go) {
            if (onGo) onGo(x.go);
            else goto(x.go);
          }
        };

        if (x.go) {
          return (
            <button key={idx} type="button" className="r" onClick={handleClick}>
              <i className="sw" style={{ background: x.c }} />
              <span className="nm">{x.k}</span>
              <span className="vv">{x.disp || M.fmt(x.v, numbers)}</span>
              <span className="pc">{pct((x.v / t) * 100, 1)}</span>
            </button>
          );
        }

        return (
          <div key={idx} className="r">
            <i className="sw" style={{ background: x.c }} />
            <span className="nm">{x.k}</span>
            <span className="vv">{x.disp || M.fmt(x.v, numbers)}</span>
            <span className="pc">{pct((x.v / t) * 100, 1)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** An axis with round steps that always has zero on it, with room under the lowest bar for its label.
    A fixed `step` (e.g. 5 Lakh) gives finer lines so small bars can be read against them. */
function niceScale(lo: number, hi: number, fixedStep?: number) {
  lo = Math.min(0, lo);
  hi = Math.max(0, hi);
  if (hi === lo) hi = 1;
  let step: number;
  if (fixedStep && fixedStep > 0) {
    // No more than 20 steps: a larger range takes a multiple of the step asked for.
    step = fixedStep * Math.max(1, Math.ceil((hi - lo) / fixedStep / 20));
  } else {
    const raw = (hi - lo) / 4;
    const e = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / e;
    step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  }
  let min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  if (lo < 0 && lo - min < step * 0.3) min -= step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.abs(t) < step / 1e6 ? 0 : t);
  return { min, max, ticks };
}

/** Labels are tilted only when they would run into each other level. */
const LABEL_PX = 6.4;
const tilt = (rows: { label: string }[], slot: number) => rows.some((r) => String(r.label).length * LABEL_PX > slot - 6);
const clip = (s: string, n = 24) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** One plot size for every bar chart, so two charts side by side line up: the same top, the same
    zero line and the same room for the labels under it. A chart with more grid lines is taller. */
function frame(width: number, rows: { label: string }[], ticks: number, low = false, PL0 = 54) {
  const PR = 12,
    PT = 32;
  const tilted = tilt(rows, (width - PL0 - PR) / (rows.length || 1));
  // A slanted name runs left of its bar: the first one gets room enough not to be cut off.
  const first = rows.length ? clip(String(rows[0].label)).length * LABEL_PX * 0.82 : 0;
  const PL = tilted ? Math.min(160, Math.max(PL0, first - (width - PL0 - PR) / (rows.length || 1) / 2 + 6)) : PL0;
  const slot = (width - PL - PR) / (rows.length || 1);
  const PB = tilted ? 92 : 30;
  // A low chart (on a printed page) keeps the same top and bottom, with less between.
  const ih = Math.max(low ? 112 : 196, (ticks - 1) * (low ? 17 : 26));
  return { W: width, H: PT + ih + PB, PL, PR, PT, PB, iw: width - PL - PR, ih, slot, tilted };
}

/** The label under a bar or group of bars. */
function XLabel({ x, y, text, tilted }: { x: number; y: number; text: string; tilted: boolean }) {
  const lx = x.toFixed(1),
    ly = y.toFixed(1);
  return tilted ? (
    <text className="ax" x={lx} y={ly} textAnchor="end" transform={`rotate(-35 ${lx} ${ly})`}>
      <title>{text}</title>
      {clip(text)}
    </text>
  ) : (
    <text className="ax" x={lx} y={ly} textAnchor="middle">
      {text}
    </text>
  );
}

/** A figure written up a bar: inside it when the bar is tall enough, otherwise just beyond its end
    (above a gain, below a loss). */
function upLabel(x: number, top: number, h: number, v: number, text: string, hollow?: boolean) {
  const inside = h > textW(text) + 4;
  const px = (x + 3.5).toFixed(1);
  const py = (inside ? top + 6 : v >= 0 ? top - 4 : top + h + 4).toFixed(1);
  const anchor = inside || v < 0 ? 'end' : 'start';
  return (
    <text className={`dlab sm ${inside ? 'in' : ''} ${hollow ? 'on-hollow' : ''}`} x={px} y={py} textAnchor={anchor} transform={`rotate(-90 ${px} ${py})`}>
      {text}
    </text>
  );
}

/**
 * One bar per item, each in its own colour (the colour of its kind, named in the legend) or, when
 * `signed`, green for a gain and red for a loss. Bars stand on the zero line; values sit on them,
 * with a second line (`tag`, e.g. the gain as a percentage) when given.
 */
export function ChartBars({
  rows,
  legend,
  signed = false,
  label = 'Bar chart',
  width = 760,
  step,
  low = false,
}: {
  /** `tone`: whether the tag is a rise or a fall, when the bar's own sign does not say it. */
  rows: { label: string; v: number; c?: string; full?: string; sub?: string; tag?: string; tone?: 'up' | 'down' }[];
  legend?: { k: string; c: string }[];
  signed?: boolean;
  label?: string;
  /** Drawing width: wider for a chart that spans the page, so its text keeps its size. */
  width?: number;
  /** A fixed distance between the grid lines, in rupees. */
  step?: number;
  /** Less height, e.g. for a printed page. */
  low?: boolean;
}) {
  const { numbers, showTip, hideTip } = useApp();
  const vals = rows.map((r) => r.v || 0);
  const { min, max, ticks } = niceScale(Math.min(...vals), Math.max(...vals), step);
  const { W, H, PL, PR, PT, ih, slot: bw, tilted } = frame(width, rows, ticks.length, low);
  const y = (v: number) => PT + ih - ((v - min) / (max - min || 1)) * ih;
  const barW = Math.max(6, Math.min(46, bw * 0.62));
  const colour = (r: { v: number; c?: string }) => (signed ? (r.v >= 0 ? 'var(--good)' : 'var(--bad)') : r.c || 'var(--s1)');
  // Every bar carries its figure. Too narrow to write it across, it runs up the bar instead.
  const upright = rows.some((r) => r.v && textW(barValue(r.v, numbers)) > bw - 2);

  return (
    <div className="chart">
      {legend && legend.length > 1 && (
        <div className="legend">
          {legend.map((l) => (
            <span key={l.k} className="it">
              <i className="sw" style={{ background: l.c }} />
              {l.k}
            </span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((t, idx) => (
          <React.Fragment key={idx}>
            <line className="gridline" x1={PL} x2={W - PR} y1={y(t).toFixed(1)} y2={y(t).toFixed(1)} />
            <text className="ax" x={PL - 8} y={(y(t) + 3.5).toFixed(1)} textAnchor="end">
              {axMoney(t, numbers)}
            </text>
          </React.Fragment>
        ))}
        {rows.map((r, i) => {
          const cx = PL + bw * i + bw / 2;
          const v = r.v || 0;
          // A bar too small for the scale still shows as a sliver.
          const h = v ? Math.max(3, Math.abs(y(v) - y(0))) : 0;
          const top = v >= 0 ? y(0) - h : y(0);
          const tipHtml = `<div class="tt">${r.full || r.label}</div><div class="rw"><i class="sw" style="background:${colour(r)}"></i><b class="vv">${M.fmt(
            v,
            numbers
          )}</b></div>${r.sub ? `<div class="rw">${r.sub}</div>` : ''}`;
          // Labels of a loss sit just above the zero line, clear of the names under the chart.
          const ly = v >= 0 ? top : y(0);
          return (
            <React.Fragment key={i}>
              {v !== 0 && <rect x={(cx - barW / 2).toFixed(1)} y={top.toFixed(1)} width={barW.toFixed(1)} height={h.toFixed(1)} rx="3" fill={colour(r)} />}
              {upright && v !== 0 && upLabel(cx, top, h, v, barValue(v, numbers))}
              {!upright && v !== 0 && (
                // The amount sits well clear of the percentage written under it.
                <text className="dlab" x={cx.toFixed(1)} y={(ly - (r.tag ? 22 : 5)).toFixed(1)} textAnchor="middle">
                  {barValue(v, numbers)}
                </text>
              )}
              {!upright && v !== 0 && r.tag && (
                <text className={`dlab tag ${r.tone || (signed ? (v >= 0 ? 'up' : 'down') : '')}`} x={cx.toFixed(1)} y={(ly - 5).toFixed(1)} textAnchor="middle">
                  {r.tag}
                </text>
              )}
              <rect
                x={(PL + bw * i).toFixed(1)}
                y={PT}
                width={bw.toFixed(1)}
                height={ih}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => showTip(tipHtml, e.clientX, e.clientY)}
                onMouseLeave={hideTip}
              />
              <XLabel x={cx} y={PT + ih + (tilted ? 12 : 18)} text={String(r.label)} tilted={tilted} />
            </React.Fragment>
          );
        })}
        <line className="axline" x1={PL} x2={W - PR} y1={y(0).toFixed(1)} y2={y(0).toFixed(1)} />
      </svg>
    </div>
  );
}

/** Several series side by side for each row (e.g. invested against worth today), negatives below the line. */
export function ChartBarGroups({
  rows,
  series,
  label = 'Grouped bar chart',
  width = 760,
  step,
  values = false,
  low = false,
}: {
  rows: any[];
  /** `hollow`: drawn as an outline on paper, where every other bar is solid black. */
  series: { key: string; label: string; c: string; hollow?: boolean }[];
  label?: string;
  width?: number;
  /** A fixed distance between the grid lines, in rupees. */
  step?: number;
  /** Write each bar's amount on it (only bars that are not zero). */
  values?: boolean;
  /** Less height, e.g. for a printed page. */
  low?: boolean;
}) {
  const { numbers, showTip, hideTip } = useApp();
  const all = rows.flatMap((r) => series.map((s) => r[s.key] || 0));
  const { min, max, ticks } = niceScale(Math.min(...all), Math.max(...all), step);
  const { W, H, PL, PR, PT, ih, slot: bw, tilted } = frame(width, rows, ticks.length, low);
  const y = (v: number) => PT + ih - ((v - min) / (max - min || 1)) * ih;
  const barW = Math.max(4, Math.min(22, (bw - 12) / series.length - 2));
  const groupW = series.length * (barW + 2) - 2;

  return (
    <div className="chart">
      <div className="legend">
        {series.map((s) => (
          <span key={s.key} className="it">
            <i className={`sw ${s.hollow ? 'hollow' : ''}`} style={{ background: s.c }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {ticks.map((t, idx) => (
          <React.Fragment key={idx}>
            <line className="gridline" x1={PL} x2={W - PR} y1={y(t).toFixed(1)} y2={y(t).toFixed(1)} />
            <text className="ax" x={PL - 8} y={(y(t) + 3.5).toFixed(1)} textAnchor="end">
              {axMoney(t, numbers)}
            </text>
          </React.Fragment>
        ))}
        {rows.map((r, i) => {
          const cx = PL + bw * i + bw / 2;
          const x0 = cx - groupW / 2;
          const tipHtml =
            `<div class="tt">${r.full || r.label}</div>` +
            series
              .map((s) => `<div class="rw"><i class="sw" style="background:${s.c}"></i>${s.label}<b class="vv">${M.fmt(r[s.key] || 0, numbers)}</b></div>`)
              .join('');
          return (
            <React.Fragment key={i}>
              {series.map((s, si) => {
                const v = r[s.key] || 0;
                if (!v) return null;
                // A bar too small for the scale still shows as a sliver.
                const h = Math.max(3, Math.abs(y(v) - y(0)));
                const top = v >= 0 ? y(0) - h : y(0);
                const bx = x0 + si * (barW + 2);
                return (
                  <React.Fragment key={s.key}>
                    <rect className={s.hollow ? 'hollow' : undefined} x={bx.toFixed(1)} y={top.toFixed(1)} width={barW.toFixed(1)} height={h.toFixed(1)} rx="3" fill={s.c} />
                    {values && upLabel(bx + barW / 2, top, h, v, barValue(v, numbers), s.hollow)}
                  </React.Fragment>
                );
              })}
              <rect
                x={(PL + bw * i).toFixed(1)}
                y={PT}
                width={bw.toFixed(1)}
                height={ih}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => showTip(tipHtml, e.clientX, e.clientY)}
                onMouseLeave={hideTip}
              />
              <XLabel x={cx} y={PT + ih + (tilted ? 12 : 18)} text={String(r.label)} tilted={tilted} />
            </React.Fragment>
          );
        })}
        <line className="axline" x1={PL} x2={W - PR} y1={y(0).toFixed(1)} y2={y(0).toFixed(1)} />
      </svg>
    </div>
  );
}
