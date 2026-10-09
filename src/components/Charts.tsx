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

/** An axis with round steps that always has zero on it, with room under the lowest bar for its label. */
function niceScale(lo: number, hi: number) {
  lo = Math.min(0, lo);
  hi = Math.max(0, hi);
  if (hi === lo) hi = 1;
  const raw = (hi - lo) / 4;
  const e = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / e;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
  let min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  if (lo < 0 && lo - min < step * 0.3) min -= step;
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.abs(t) < step / 1e6 ? 0 : t);
  return { min, max, ticks };
}

/** Long axis labels are tilted so each stays readable; short ones sit level. */
const tilt = (rows: { label: string }[]) => rows.length > 6 || rows.some((r) => String(r.label).length > 11);
const clip = (s: string, n = 16) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/**
 * One bar per item, each in its own colour (the colour of its kind, named in the legend) or, when
 * `signed`, green for a gain and red for a loss. Bars stand on the zero line; values sit on them.
 */
export function ChartBars({
  rows,
  legend,
  signed = false,
  label = 'Bar chart',
  width = 760,
}: {
  rows: { label: string; v: number; c?: string; full?: string; sub?: string }[];
  legend?: { k: string; c: string }[];
  signed?: boolean;
  label?: string;
  /** Drawing width: wider for a chart that spans the page, so its text keeps its size. */
  width?: number;
}) {
  const { numbers, showTip, hideTip } = useApp();
  const tilted = tilt(rows);
  const W = width,
    H = tilted ? 280 : 240,
    PL = 50,
    PR = 12,
    PT = 20,
    PB = tilted ? 70 : 28;
  const iw = W - PL - PR,
    ih = H - PT - PB;
  const vals = rows.map((r) => r.v || 0);
  const { min, max, ticks } = niceScale(Math.min(...vals), Math.max(...vals));
  const y = (v: number) => PT + ih - ((v - min) / (max - min || 1)) * ih;
  const bw = iw / (rows.length || 1),
    barW = Math.max(6, Math.min(46, bw * 0.62));
  const colour = (r: { v: number; c?: string }) => (signed ? (r.v >= 0 ? 'var(--good)' : 'var(--bad)') : r.c || 'var(--s1)');

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
          const top = y(Math.max(v, 0)),
            h = Math.max(1.5, Math.abs(y(v) - y(0)));
          const tipHtml = `<div class="tt">${r.full || r.label}</div><div class="rw"><i class="sw" style="background:${colour(r)}"></i><b class="vv">${M.fmt(
            v,
            numbers
          )}</b></div>${r.sub ? `<div class="rw">${r.sub}</div>` : ''}`;
          const lx = cx.toFixed(1),
            ly = (PT + ih + (tilted ? 12 : 17)).toFixed(1);
          return (
            <React.Fragment key={i}>
              <rect x={(cx - barW / 2).toFixed(1)} y={top.toFixed(1)} width={barW.toFixed(1)} height={h.toFixed(1)} rx="3" fill={colour(r)} />
              {rows.length <= 14 && v !== 0 && (
                <text className="dlab" x={lx} y={(v >= 0 ? top - 5 : top + h + 12).toFixed(1)} textAnchor="middle">
                  {axMoney(v, numbers)}
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
              {tilted ? (
                <text className="ax" x={lx} y={ly} textAnchor="end" transform={`rotate(-35 ${lx} ${ly})`}>
                  {clip(String(r.label))}
                </text>
              ) : (
                <text className="ax" x={lx} y={ly} textAnchor="middle">
                  {r.label}
                </text>
              )}
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
}: {
  rows: any[];
  series: { key: string; label: string; c: string }[];
  label?: string;
  width?: number;
}) {
  const { numbers, showTip, hideTip } = useApp();
  const tilted = tilt(rows);
  const W = width,
    H = tilted ? 270 : 236,
    PL = 50,
    PR = 12,
    PT = 14,
    PB = tilted ? 64 : 28;
  const iw = W - PL - PR,
    ih = H - PT - PB;
  const all = rows.flatMap((r) => series.map((s) => r[s.key] || 0));
  const { min, max, ticks } = niceScale(Math.min(...all), Math.max(...all));
  const y = (v: number) => PT + ih - ((v - min) / (max - min || 1)) * ih;
  const bw = iw / (rows.length || 1);
  const barW = Math.max(4, Math.min(22, (bw - 12) / series.length - 2));
  const groupW = series.length * (barW + 2) - 2;

  return (
    <div className="chart">
      <div className="legend">
        {series.map((s) => (
          <span key={s.key} className="it">
            <i className="sw" style={{ background: s.c }} />
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
          const lx = cx.toFixed(1),
            ly = (PT + ih + (tilted ? 12 : 17)).toFixed(1);
          return (
            <React.Fragment key={i}>
              {series.map((s, si) => {
                const v = r[s.key] || 0;
                const top = y(Math.max(v, 0));
                return (
                  <rect
                    key={s.key}
                    x={(x0 + si * (barW + 2)).toFixed(1)}
                    y={top.toFixed(1)}
                    width={barW.toFixed(1)}
                    height={Math.max(v ? 1.5 : 0, Math.abs(y(v) - y(0))).toFixed(1)}
                    rx="3"
                    fill={s.c}
                  />
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
              {tilted ? (
                <text className="ax" x={lx} y={ly} textAnchor="end" transform={`rotate(-35 ${lx} ${ly})`}>
                  {clip(String(r.label))}
                </text>
              ) : (
                (rows.length <= 14 || i % 2 === 0) && (
                  <text className="ax" x={lx} y={ly} textAnchor="middle">
                    {r.label}
                  </text>
                )
              )}
            </React.Fragment>
          );
        })}
        <line className="axline" x1={PL} x2={W - PR} y1={y(0).toFixed(1)} y2={y(0).toFixed(1)} />
      </svg>
    </div>
  );
}
