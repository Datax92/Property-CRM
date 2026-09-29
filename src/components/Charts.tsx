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

export function ChartLines({
  rows,
  series,
}: {
  rows: any[];
  series: { key: string; label: string; c: string }[];
}) {
  const { numbers, showTip, hideTip } = useApp();
  const W = 760,
    H = 230,
    PL = 46,
    PR = 16,
    PT = 12,
    PB = 28;
  const iw = W - PL - PR,
    ih = H - PT - PB;
  const all = rows.flatMap((r) => series.map((s) => r[s.key] || 0));
  const rawMin = Math.min(0, ...all);
  const max = niceMax(Math.max(1, ...all)),
    min = rawMin < 0 ? -niceMax(-rawMin) : 0;
  const x = (i: number) => PL + (rows.length === 1 ? iw / 2 : (iw * i) / (rows.length - 1));
  const y = (v: number) => PT + ih - ((v - min) / (max - min || 1)) * ih;

  return (
    <div className="chart">
      <div className="legend">
        {series.map((s, idx) => (
          <span key={idx} className="it">
            <i className="sw ln" style={{ background: s.c }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend by period">
        {yTicks(max, min).map((t, idx) => (
          <React.Fragment key={idx}>
            <line className="gridline" x1={PL} x2={W - PR} y1={y(t).toFixed(1)} y2={y(t).toFixed(1)} />
            <text className="ax" x={PL - 8} y={(y(t) + 3.5).toFixed(1)} textAnchor="end">
              {axMoney(t, numbers)}
            </text>
          </React.Fragment>
        ))}
        {min < 0 && <line className="axline" x1={PL} x2={W - PR} y1={y(0).toFixed(1)} y2={y(0).toFixed(1)} />}
        {series.map((s, sIdx) => {
          const d = rows
            .map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r[s.key] || 0).toFixed(1)}`)
            .join(' ');
          const last = rows.length - 1;
          return (
            <React.Fragment key={sIdx}>
              <path d={d} fill="none" stroke={s.c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {rows.length <= 14 &&
                rows.map((r, i) => (
                  <circle
                    key={i}
                    cx={x(i).toFixed(1)}
                    cy={y(r[s.key] || 0).toFixed(1)}
                    r="3.2"
                    fill={s.c}
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                ))}
              {last >= 0 && (
                <text
                  className="dlab"
                  x={(x(last) + 6).toFixed(1)}
                  y={(y(rows[last][s.key] || 0) + 4).toFixed(1)}
                  fill={s.c}
                >
                  {axMoney(rows[last][s.key] || 0, numbers)}
                </text>
              )}
            </React.Fragment>
          );
        })}
        {rows.map((r, i) => {
          const bw = iw / Math.max(1, rows.length - 1);
          const tipHtml =
            `<div class="tt">${r.full || r.label}</div>` +
            series
              .map(
                (s) =>
                  `<div class="rw"><i class="sw" style="background:${s.c}"></i>${s.label}<b class="vv">${M.fmt(
                    r[s.key],
                    numbers
                  )}</b></div>`
              )
              .join('');
          return (
            <React.Fragment key={i}>
              <rect
                x={(x(i) - bw / 2).toFixed(1)}
                y={PT}
                width={bw.toFixed(1)}
                height={ih}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => showTip(tipHtml, e.clientX, e.clientY)}
                onMouseLeave={hideTip}
              />
              {(rows.length <= 14 || i % 2 === 0) && (
                <text className="ax" x={x(i).toFixed(1)} y={H - 9} textAnchor="middle">
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
  let run = 0;
  const pts = steps.map((s) => {
    const from = s.total ? 0 : run,
      to = s.total ? s.v : run + s.v;
    run = s.total ? s.v : run + s.v;
    return { ...s, from, to };
  });
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
              {i < pts.length - 1 && (
                <line
                  x1={(cx + barW / 2).toFixed(1)}
                  x2={(PL + bw * (i + 1) + bw / 2 - barW / 2).toFixed(1)}
                  y1={y(p.to).toFixed(1)}
                  y2={y(p.to).toFixed(1)}
                  stroke="var(--rule-2)"
                  strokeWidth="1"
                />
              )}
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
