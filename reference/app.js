/* =====================================================================
   Real Estate Management System — application shell
   ---------------------------------------------------------------------
   A product, not a report: compact navbar with dropdown menus, one page
   at a time, contextual tabs, role-based portals and real data entry.

   Every figure comes from re-data.js, which computes it from the
   underlying transactions. Nothing here invents a number.
   ===================================================================== */
import * as M from './re-data.js';

/* ------------------------------ state ------------------------------ */
const S = {
  user: M.USERS[0],
  page: 'dashboard',
  tab: null,
  rangeKey: 'thisYear',
  custom: { start: '2026-01-01', end: '2026-09-01' },
  filters: { ...M.EMPTY_FILTERS },
  numbers: 'cr',
  query: '',
  navQuery: '',
  sort: null,
  showAll: false,
  period: 'monthly',
  grossBasis: 'cogs',
  menu: null,          // { id, x, y }
  modal: null,         // { id, values, errors }
  fresh: [],           // ids added this session, highlighted in tables
};
const role = () => S.user.role;

/* ------------------------------ utils ------------------------------ */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => M.fmt(n, S.numbers);
const num = (n) => M.fmtNum(n);
const date = (d) => M.fmtDate(d);
const pct = (n, d = 1) => (isFinite(n) ? n.toFixed(d) + '%' : '—');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const dstr = (d) => (d instanceof Date ? M.dateInput(d) : d);

function fig(n, cls = '') {
  const p = M.fmtParts(n, S.numbers);
  return `<span class="fig ${cls}">${p.sign}<span class="cur">PKR</span>${p.num}${p.unit ? `<span class="unit">${esc(p.unit)}</span>` : ''}</span>`;
}
function figText(str, cls = '') {
  const m = String(str).match(/^(−?)PKR\s+(.+?)(?:\s+(Cr|Lakh|B|M|K))?$/);
  if (!m) return `<span class="fig ${cls}">${esc(str)}</span>`;
  return `<span class="fig ${cls}">${m[1]}<span class="cur">PKR</span>${esc(m[2])}${m[3] ? `<span class="unit">${m[3]}</span>` : ''}</span>`;
}
function axMoney(n) {
  const p = M.fmtParts(n, S.numbers === 'full' ? 'cr' : S.numbers);
  return p.sign + p.num + (p.unit || '');
}
function delta(d, invert) {
  if (d === null || d === undefined || !isFinite(d)) return `<span class="delta flat">—</span>`;
  const up = d > 0.05, down = d < -0.05;
  const good = invert ? down : up;
  const cls = !up && !down ? 'flat' : good ? 'up' : 'down';
  const ar = !up && !down ? '' : up ? '▲' : '▼';
  return `<span class="delta ${cls}"><span class="ar">${ar}</span>${Math.abs(d) >= 999 ? '>999' : Math.abs(d).toFixed(1)}%</span>`;
}

/* ------------------------------ icons ------------------------------ */
const svg = (d, w = 16) => `<svg class="ic" viewBox="0 0 16 16" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  car: '<svg class="car" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M1 1l4 4 4-4"/></svg>',
  bell: svg('<path d="M8 2a4 4 0 0 1 4 4v3l1.4 2.2H2.6L4 9V6a4 4 0 0 1 4-4z"/><path d="M6.4 13.4a1.8 1.8 0 0 0 3.2 0"/>'),
  plus: svg('<path d="M8 3.2v9.6M3.2 8h9.6"/>'),
  home: svg('<path d="M2.4 7.2 8 2.6l5.6 4.6"/><path d="M4 8.4v5h8v-5"/>'),
  grid: svg('<rect x="2.4" y="2.4" width="4.6" height="4.6" rx="1"/><rect x="9" y="2.4" width="4.6" height="4.6" rx="1"/><rect x="2.4" y="9" width="4.6" height="4.6" rx="1"/><rect x="9" y="9" width="4.6" height="4.6" rx="1"/>'),
  tag: svg('<path d="M2.6 8.2V2.6h5.6l5.2 5.2-5.6 5.6z"/><circle cx="5.2" cy="5.2" r=".9"/>'),
  users: svg('<circle cx="6" cy="5.4" r="2.4"/><path d="M2 13c0-2.2 1.8-3.8 4-3.8s4 1.6 4 3.8"/><path d="M11 4.2a2.2 2.2 0 0 1 0 4.3M11.6 12.9c0-1.6-.5-2.7-1.4-3.4"/>'),
  chart: svg('<path d="M2.4 13.2h11.2"/><path d="M4.4 13V8M7.4 13V4.6M10.4 13V9.4M13 13V6.4"/>'),
  wallet: svg('<rect x="2" y="4" width="12" height="9" rx="1.6"/><path d="M2 6.6h12M11 9.8h1.2"/>'),
  receipt: svg('<path d="M3.6 2.4h8.8v11.2l-1.7-1.1-1.7 1.1-1.7-1.1-1.7 1.1-1.9-1.1z"/><path d="M5.8 5.6h4.4M5.8 8.2h3"/>'),
  shield: svg('<path d="M8 2 3.4 3.8v3.6c0 2.8 1.9 5.2 4.6 6.2 2.7-1 4.6-3.4 4.6-6.2V3.8z"/>'),
  user: svg('<circle cx="8" cy="5.4" r="2.6"/><path d="M3 13.4c0-2.6 2.2-4.4 5-4.4s5 1.8 5 4.4"/>'),
  logout: svg('<path d="M6 3.4H3.6v9.2H6"/><path d="M9 5.6 11.6 8 9 10.4M11.6 8H6.2"/>'),
  down: svg('<path d="M8 2.6v8M4.6 7.4 8 10.8l3.4-3.4M2.6 13.4h10.8"/>'),
  print: svg('<path d="M4.6 6V2.6h6.8V6"/><path d="M4.6 12H3.2a1 1 0 0 1-1-1V7.2a1 1 0 0 1 1-1h9.6a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1h-1.4"/><rect x="4.6" y="10" width="6.8" height="3.6" rx=".6"/>'),
  filter: svg('<path d="M2.4 4h11.2M4.6 8h6.8M6.6 12h2.8"/>'),
  warn: svg('<path d="M8 2.6 14.4 13.4H1.6z"/><path d="M8 6.6v3.1M8 11.8v.1"/>'),
  info: svg('<circle cx="8" cy="8" r="6.2"/><path d="M8 7.3v4M8 4.9v.1"/>'),
  ok: svg('<circle cx="8" cy="8" r="6.2"/><path d="M5.3 8.2 7.2 10l3.5-3.9"/>'),
  x: svg('<path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6"/>'),
  empty: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M3 9h18M8 13h8"/></svg>',
  lock: '<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.6" y="7" width="8.8" height="6.4" rx="1.4"/><path d="M5.7 7V5a2.3 2.3 0 0 1 4.6 0v2"/></svg>',
  burger: svg('<path d="M2.6 4.4h10.8M2.6 8h10.8M2.6 11.6h10.8"/>'),
};
function logoMark() {
  return `<svg viewBox="0 0 40 40" aria-hidden="true">
    <rect x="1" y="1" width="38" height="38" rx="10" fill="#FAF6EC" opacity=".12"/>
    <g stroke="#7FD9BC" stroke-width="1" opacity=".55" fill="none">
      <ellipse cx="20" cy="20" rx="15" ry="8"/><ellipse cx="20" cy="20" rx="15" ry="8" transform="rotate(60 20 20)"/><ellipse cx="20" cy="20" rx="15" ry="8" transform="rotate(120 20 20)"/>
    </g>
    <circle cx="20" cy="20" r="9.5" fill="#08432F" stroke="#E0951B" stroke-width="1.2"/>
    <text x="20" y="24.2" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="10.5" font-weight="700" fill="#FAF6EC">ME</text>
  </svg>`;
}
/** Procedural property artwork — no network request, prints fine. */
function propArt(p) {
  let h = 0; for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
  const rnd = () => ((h = (h * 1664525 + 1013904223) >>> 0), h / 4294967296);
  const skies = [['#E9F4EF', '#C2E0D4'], ['#FCF2DC', '#EFD9A8'], ['#EAF0FA', '#C9DAF3'], ['#F6EEF3', '#E4CEDC']];
  const sky = skies[Math.floor(rnd() * skies.length)];
  const ink = ['#0B5C46', '#1F5C7A', '#7A4A1F', '#4A3A6B'][Math.floor(rnd() * 4)];
  let sil = '', x = 4;
  while (x < 196) {
    const w = 14 + Math.floor(rnd() * 22), ht = 20 + Math.floor(rnd() * 44);
    sil += `<rect x="${x}" y="${92 - ht}" width="${w}" height="${ht}" rx="1.5"/>`;
    for (let wy = 92 - ht + 6; wy < 86; wy += 9) for (let wx = x + 4; wx < x + w - 4; wx += 7)
      if (rnd() > 0.42) sil += `<rect x="${wx}" y="${wy}" width="3" height="4" fill="#FFFDF7" opacity=".5"/>`;
    x += w + 3 + Math.floor(rnd() * 5);
  }
  const gid = 'sk' + String(p.id).replace(/\W/g, '');
  return `<svg viewBox="0 0 200 92" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style="width:100%;height:82px;display:block">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
    <rect width="200" height="92" fill="url(#${gid})"/>
    <g opacity=".14" stroke="${ink}" stroke-width=".7">${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${i * 11} H200"/>`).join('')}</g>
    <g fill="${ink}" opacity=".8">${sil}</g><rect y="88" width="200" height="4" fill="${ink}" opacity=".95"/></svg>`;
}

/* ------------------------------ charts ------------------------------ */
function niceMax(v) {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v))), n = v / e;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * e;
}
const yTicks = (max, min, n = 4) => Array.from({ length: n + 1 }, (_, i) => min + ((max - min) * i) / n);
const tipAttr = (html) => `data-tip="${esc(html)}"`;

function chartGroupedBars(rows, s1, s2, l1, l2) {
  const W = 760, H = 230, PL = 46, PR = 12, PT = 12, PB = 28;
  const iw = W - PL - PR, ih = H - PT - PB;
  const max = niceMax(Math.max(1, ...rows.map((r) => Math.max(r[s1], r[s2]))));
  const y = (v) => PT + ih - (v / max) * ih;
  const bw = iw / rows.length, barW = Math.max(5, Math.min(19, (bw - 8) / 2));
  let g = '', bars = '';
  yTicks(max, 0).forEach((t) => {
    g += `<line class="gridline" x1="${PL}" x2="${W - PR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    g += `<text class="ax" x="${PL - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${esc(axMoney(t))}</text>`;
  });
  rows.forEach((r, i) => {
    const cx = PL + bw * i + bw / 2;
    bars += `<rect x="${(cx - barW - 1).toFixed(1)}" y="${y(r[s1]).toFixed(1)}" width="${barW}" height="${Math.max(0, PT + ih - y(r[s1])).toFixed(1)}" rx="3" fill="var(--s1)"/>`;
    bars += `<rect x="${(cx + 1).toFixed(1)}" y="${y(r[s2]).toFixed(1)}" width="${barW}" height="${Math.max(0, PT + ih - y(r[s2])).toFixed(1)}" rx="3" fill="var(--s2)"/>`;
    bars += `<rect x="${(PL + bw * i).toFixed(1)}" y="${PT}" width="${bw.toFixed(1)}" height="${ih}" fill="transparent" ${tipAttr(
      `<div class="tt">${esc(r.label)}</div><div class="rw"><i class="sw" style="background:var(--s1)"></i>${esc(l1)}<b class="vv">${esc(money(r[s1]))}</b></div><div class="rw"><i class="sw" style="background:var(--s2)"></i>${esc(l2)}<b class="vv">${esc(money(r[s2]))}</b></div>`)}/>`;
    if (rows.length <= 14 || i % 2 === 0) bars += `<text class="ax" x="${cx.toFixed(1)}" y="${H - 9}" text-anchor="middle">${esc(r.label)}</text>`;
  });
  return `<div class="chart"><div class="legend"><span class="it"><i class="sw" style="background:var(--s1)"></i>${esc(l1)}</span><span class="it"><i class="sw" style="background:var(--s2)"></i>${esc(l2)}</span></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(l1)} versus ${esc(l2)}">${g}${bars}<line class="axline" x1="${PL}" x2="${W - PR}" y1="${PT + ih}" y2="${PT + ih}"/></svg></div>`;
}

function chartLines(rows, series) {
  const W = 760, H = 230, PL = 46, PR = 16, PT = 12, PB = 28;
  const iw = W - PL - PR, ih = H - PT - PB;
  const all = rows.flatMap((r) => series.map((s) => r[s.key]));
  const rawMin = Math.min(0, ...all);
  const max = niceMax(Math.max(1, ...all)), min = rawMin < 0 ? -niceMax(-rawMin) : 0;
  const x = (i) => PL + (rows.length === 1 ? iw / 2 : (iw * i) / (rows.length - 1));
  const y = (v) => PT + ih - ((v - min) / (max - min)) * ih;
  let g = '';
  yTicks(max, min).forEach((t) => {
    g += `<line class="gridline" x1="${PL}" x2="${W - PR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`;
    g += `<text class="ax" x="${PL - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${esc(axMoney(t))}</text>`;
  });
  if (min < 0) g += `<line class="axline" x1="${PL}" x2="${W - PR}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>`;
  let paths = '', dots = '', labs = '', hits = '';
  series.forEach((s) => {
    paths += `<path d="${rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r[s.key]).toFixed(1)}`).join(' ')}" fill="none" stroke="${s.c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (rows.length <= 14) rows.forEach((r, i) => { dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(r[s.key]).toFixed(1)}" r="3.2" fill="${s.c}" stroke="var(--card)" stroke-width="2"/>`; });
    const last = rows.length - 1;
    if (last >= 0) labs += `<text class="dlab" x="${(x(last) + 6).toFixed(1)}" y="${(y(rows[last][s.key]) + 4).toFixed(1)}" fill="${s.c}">${esc(axMoney(rows[last][s.key]))}</text>`;
  });
  rows.forEach((r, i) => {
    const bw = iw / Math.max(1, rows.length - 1);
    hits += `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${PT}" width="${bw.toFixed(1)}" height="${ih}" fill="transparent" ${tipAttr(
      `<div class="tt">${esc(r.full || r.label)}</div>` + series.map((s) => `<div class="rw"><i class="sw" style="background:${s.c}"></i>${esc(s.label)}<b class="vv">${esc(money(r[s.key]))}</b></div>`).join(''))}/>`;
    if (rows.length <= 14 || i % 2 === 0) hits += `<text class="ax" x="${x(i).toFixed(1)}" y="${H - 9}" text-anchor="middle">${esc(r.label)}</text>`;
  });
  return `<div class="chart"><div class="legend">${series.map((s) => `<span class="it"><i class="sw ln" style="background:${s.c}"></i>${esc(s.label)}</span>`).join('')}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend by period">${g}${paths}${dots}${labs}${hits}<line class="axline" x1="${PL}" x2="${W - PR}" y1="${PT + ih}" y2="${PT + ih}"/></svg></div>`;
}

function chartDonut(items) {
  const R = 88, r = 54, cx = 105, cy = 105;
  const total = items.reduce((a, x) => a + x.v, 0) || 1;
  let a0 = -Math.PI / 2, seg = '';
  items.forEach((it) => {
    const sweep = (it.v / total) * Math.PI * 2, a1 = a0 + Math.max(0, sweep - 0.016);
    const big = sweep > Math.PI ? 1 : 0, p = (rad, ang) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
    const [x1, y1] = p(R, a0), [x2, y2] = p(R, a1), [x3, y3] = p(r, a1), [x4, y4] = p(r, a0);
    seg += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${big} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A${r} ${r} 0 ${big} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z" fill="${it.c}" ${tipAttr(
      `<div class="tt">${esc(it.k)}</div><div class="rw"><b class="vv">${esc(money(it.v))}</b></div><div class="rw">${pct((it.v / total) * 100)} of total</div>`)}/>`;
    a0 += sweep;
  });
  return `<div class="chart"><svg viewBox="0 0 210 210" style="max-width:215px;margin:0 auto" role="img" aria-label="Breakdown by share">${seg}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--ink-3)" letter-spacing="1.4">TOTAL</text>
    <text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="16" font-weight="700" fill="var(--ink)">${esc(axMoney(total))}</text></svg></div>`;
}

function chartWaterfall(steps) {
  const W = 780, H = 260, PL = 8, PR = 8, PT = 24, PB = 58;
  const iw = W - PL - PR, ih = H - PT - PB;
  let run = 0;
  const pts = steps.map((s) => {
    const from = s.total ? 0 : run, to = s.total ? s.v : run + s.v;
    run = s.total ? s.v : run + s.v;
    return { ...s, from, to };
  });
  const hi = Math.max(...pts.map((p) => Math.max(p.from, p.to)), 0);
  const lo = Math.min(...pts.map((p) => Math.min(p.from, p.to)), 0);
  const max = niceMax(hi), min = lo < 0 ? -niceMax(-lo) : 0;
  const y = (v) => PT + ih - ((v - min) / (max - min || 1)) * ih;
  const bw = iw / pts.length, barW = Math.min(62, bw - 14);
  let out = '', conn = '';
  pts.forEach((p, i) => {
    const cx = PL + bw * i + bw / 2;
    const yTop = Math.min(y(p.from), y(p.to)), h = Math.max(2, Math.abs(y(p.to) - y(p.from)));
    const c = p.total ? 'var(--brand)' : p.v >= 0 ? 'var(--s3)' : 'var(--s2)';
    out += `<rect x="${(cx - barW / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${c}" ${tipAttr(
      `<div class="tt">${esc(p.k)}</div><div class="rw"><b class="vv">${esc(money(p.total ? p.to : p.v))}</b></div>${p.why ? `<div class="rw">${esc(p.why)}</div>` : ''}`)}/>`;
    out += `<text class="dlab" x="${cx.toFixed(1)}" y="${(yTop - 6).toFixed(1)}" text-anchor="middle" ${p.total ? 'fill="var(--brand)"' : ''}>${esc(axMoney(p.total ? p.to : p.v))}</text>`;
    let line = '', lines = [];
    String(p.k).split(' ').forEach((w) => { if ((line + ' ' + w).trim().length > 11) { lines.push(line.trim()); line = w; } else line += ' ' + w; });
    lines.push(line.trim());
    lines.slice(0, 3).forEach((l, li) => {
      out += `<text class="ax" x="${cx.toFixed(1)}" y="${(PT + ih + 15 + li * 10.5).toFixed(1)}" text-anchor="middle" ${p.total ? 'font-weight="700" fill="var(--ink)"' : ''}>${esc(l)}</text>`;
    });
    if (i < pts.length - 1) conn += `<line x1="${(cx + barW / 2).toFixed(1)}" x2="${(PL + bw * (i + 1) + bw / 2 - barW / 2).toFixed(1)}" y1="${y(p.to).toFixed(1)}" y2="${y(p.to).toFixed(1)}" stroke="var(--rule-2)" stroke-width="1"/>`;
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Profit bridge"><line class="axline" x1="${PL}" x2="${W - PR}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>${conn}${out}</svg></div>`;
}

function shareBar(items, total) {
  const t = total || items.reduce((a, x) => a + x.v, 0) || 1;
  return `<div class="sharebar">${items.filter((x) => x.v > 0).map((x) => `<i style="width:${((x.v / t) * 100).toFixed(2)}%;background:${x.c}" ${tipAttr(`<div class="tt">${esc(x.k)}</div><div class="rw"><b class="vv">${esc(x.disp || num(x.v))}</b></div><div class="rw">${pct((x.v / t) * 100)}</div>`)}></i>`).join('')}</div>`;
}
function ranked(items, total) {
  const t = total || items.reduce((a, x) => a + x.v, 0) || 1;
  return `<div class="ranked">${items.map((x) => {
    const tag = x.go ? 'button' : 'div';
    const at = x.go ? `type="button" data-go="${esc(x.go)}"` : '';
    return `<${tag} class="r" ${at}><i class="sw" style="background:${x.c}"></i><span class="nm">${esc(x.k)}</span><span class="vv">${esc(x.disp || money(x.v))}</span><span class="pc">${pct((x.v / t) * 100, 1)}</span></${tag}>`;
  }).join('')}</div>`;
}
const SC = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];
const OC = ['var(--o1)', 'var(--o2)', 'var(--o3)', 'var(--o4)'];

/* ------------------------------ navigation model ------------------------------ */
/* Each tab names the permission key it needs (§30). A section disappears entirely
   when the signed-in role can see none of its tabs — no dead menu items. */
const NAV = [
  { id: 'dashboard', label: 'Dashboard', u: 'ڈیش بورڈ', icon: 'home', group: 'Main', tabs: [
    { id: 'overview', label: 'Overview' },
    { id: 'alerts', label: 'Alerts' },
  ] },
  { id: 'properties', label: 'Properties', u: 'جائیدادیں', icon: 'grid', group: 'Operations', tabs: [
    { id: 'inventory', label: 'Inventory' },
    { id: 'purchases', label: 'Purchase register', need: 'purchases' },
    { id: 'performance', label: 'Performance' },
  ] },
  { id: 'sales', label: 'Sales', u: 'فروخت', icon: 'tag', group: 'Operations', tabs: [
    { id: 'register', label: 'Sales register' },
    { id: 'receivables', label: 'Receivables', need: 'receivables' },
  ] },
  { id: 'agents', label: 'Agents', u: 'ایجنٹ', icon: 'users', group: 'Operations', tabs: [
    { id: 'directory', label: 'Agent directory', need: 'agents' },
    { id: 'commissions', label: 'Commissions' },
  ] },
  { id: 'finance', label: 'Finance', u: 'مالیات', icon: 'chart', group: 'Finance', tabs: [
    { id: 'pnl', label: 'Profit & loss', need: 'pnl' },
    { id: 'profit', label: 'Profit tracking', need: 'profit' },
    { id: 'cashflow', label: 'Cash flow', need: 'cashflow' },
    { id: 'payables', label: 'Payables', need: 'payables' },
  ] },
  { id: 'costs', label: 'Costs', u: 'اخراجات', icon: 'wallet', group: 'Finance', tabs: [
    { id: 'expenses', label: 'Expenses', need: 'expenses' },
    { id: 'salaries', label: 'Salaries', need: 'salaries' },
    { id: 'bills', label: 'Bills', need: 'bills' },
    { id: 'tax', label: 'Tax', need: 'tax' },
    { id: 'zakat', label: 'Zakat', need: 'zakat' },
  ] },
  { id: 'admin', label: 'Admin', u: 'انتظام', icon: 'shield', group: 'System', tabs: [
    { id: 'transactions', label: 'Transactions', need: 'transactions' },
    { id: 'audit', label: 'Audit trail', need: 'audit' },
    { id: 'users', label: 'Users & roles' },
  ] },
];
const denied = (key) => !!key && (M.ROLES[role()].deny || []).indexOf(key) >= 0;
const sectionOf = (id) => NAV.find((s) => s.id === id);
const visibleTabs = (sec) => sec.tabs.filter((t) => !denied(t.need));
const visibleSections = () => NAV.filter((s) => visibleTabs(s).length > 0);

function effFilters() {
  const f = { ...S.filters };
  if (role() === 'Agent') {
    f.agent = S.user.agentId;
    if (!effFilters._ids) effFilters._ids = M.DATA.sales.filter((s) => s.agentId === S.user.agentId).map((s) => s.propertyId);
    f.propIds = effFilters._ids;
  }
  return f;
}
const rangeNow = () => M.rangeFor(S.rangeKey, S.custom);
function basisView(k) {
  if (k.scoped) return { cost: k.costOfSales, gross: k.grossProfit, op: k.operatingProfit, net: k.netProfit, costLabel: 'cost of the units sold', doc: false };
  const cogs = S.grossBasis === 'cogs';
  const cost = cogs ? k.costOfSales : k.purchaseCost;
  const gross = k.salesRevenue - cost, op = gross - k.operatingCosts;
  return { cost, gross, op, net: op - k.tax - k.zakat, costLabel: cogs ? 'cost of the units sold' : 'period purchase spend', doc: !cogs };
}

/* ------------------------------ shared pieces ------------------------------ */
function kpi(o) {
  const tag = o.go ? 'button' : 'div';
  const at = o.go ? `type="button" data-go="${esc(o.go)}"` : '';
  return `<${tag} class="kpi ${o.cls || ''}" ${at}>${/lead|warnbox/.test(o.cls || '') ? '<i class="strip"></i>' : ''}
    <span class="k">${esc(o.k)}</span>
    <span class="v ${o.tone || ''}">${o.raw != null ? figText(o.raw) : fig(o.v)}</span>
    ${(o.d !== undefined && o.d !== null && isFinite(o.d)) || o.f ? `<span class="f">${o.d !== undefined && o.d !== null && isFinite(o.d) ? delta(o.d, o.invert) + '<span class="vs">vs previous period</span>' : ''}${o.f ? `<span class="vs">${esc(o.f)}</span>` : ''}</span>` : ''}
  </${tag}>`;
}
const mini = (k, v, raw) => `<div class="kpi"><span class="k">${esc(k)}</span><span class="v">${raw != null ? figText(raw) : fig(v)}</span></div>`;
const summary = (pairs) => `<div class="kpis">${pairs.map(([k, v]) => `<div class="kpi"><span class="k">${esc(k)}</span><span class="v">${figText(v)}</span></div>`).join('')}</div>`;

function printHead(title) {
  const r = rangeNow();
  return `<div class="print-head"><div class="co">${esc(M.COMPANY)}</div>
    <div class="mt"><b>${esc(title)}</b> · Period: ${esc(r.label)} (${esc(date(r.start))} – ${esc(date(r.end))}) · Generated: ${esc(date(M.TODAY))} · User: ${esc(S.user.name)} (${esc(role())})</div></div>`;
}
const restricted = (what) => `<div class="note"><span class="ic">${I.lock}</span><div>Your role (<b>${esc(role())}</b>) does not have access to ${esc(what)}. Use the account menu to sign in as another user.</div></div>`;

/** Sortable, searchable table. */
function table(cols, rows, opts = {}) {
  const q = S.query.trim().toLowerCase();
  let data = rows;
  if (q) data = data.filter((r) => cols.some((c) => String(r[c.key] == null ? '' : r[c.key]).toLowerCase().includes(q)));
  if (S.sort) {
    const c = cols.find((x) => x.key === S.sort.key);
    if (c) data = [...data].sort((a, b) => {
      const av = a[c.key], bv = b[c.key];
      const n = typeof av === 'number' && typeof bv === 'number' ? av - bv
        : av instanceof Date && bv instanceof Date ? av - bv : String(av).localeCompare(String(bv));
      return S.sort.dir === 'asc' ? n : -n;
    });
  }
  if (S.fresh.length) {
    const isFresh = (r) => S.fresh.indexOf(r.id) >= 0;
    data = data.filter(isFresh).concat(data.filter((r) => !isFresh(r)));
  }
  if (!data.length) return `<div class="empty">${I.empty}<h3>Nothing to show</h3><p>${q ? 'No rows match “' + esc(S.query) + '”.' : 'No records fall inside this period and filter combination.'}</p></div>`;
  const cap = S.showAll ? data.length : 12;
  const shown = data.slice(0, cap);
  const head = cols.map((c) => `<th class="${c.a === 'r' ? 'r' : ''}"><button data-act="sort" data-arg="${esc(c.key)}">${esc(c.label)}${S.sort && S.sort.key === c.key ? (S.sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>`).join('');
  const body = shown.map((r) => `<tr class="${S.fresh.indexOf(r.id) >= 0 ? 'fresh' : ''}">${cols.map((c) => {
    const v = c.render ? c.render(r) : r[c.key];
    return `<td class="${c.a === 'r' ? 'r' : ''} ${c.cls || ''}">${c.render ? v : esc(v)}</td>`;
  }).join('')}</tr>`).join('');
  const foot = opts.totals ? `<tfoot><tr>${cols.map((c, i) => {
    if (i === 0) return `<td>Total · ${num(data.length)} rows</td>`;
    if (!c.sum) return '<td></td>';
    return `<td class="r">${esc(money(data.reduce((a, r) => a + (r[c.key] || 0), 0)))}</td>`;
  }).join('')}</tr></tfoot>` : '';
  return `<div class="panel"><div class="tblwrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table></div></div>
    ${data.length > cap ? `<div style="margin-top:11px" data-noprint="1"><button class="btn" data-act="showall">Show all ${num(data.length)} rows</button></div>`
      : S.showAll && data.length > 12 ? `<div style="margin-top:11px" data-noprint="1"><button class="btn" data-act="showless">Show fewer</button></div>` : ''}`;
}
const cTxt = (key, label) => ({ key, label });
const cMoney = (key, label, o = {}) => ({ key, label, a: 'r', sum: o.sum !== false, cls: 'mono', render: (r) => `<span class="${o.good && r[key] > 0 ? 'pos' : r[key] < 0 ? 'neg' : ''}">${esc(money(r[key]))}</span>` });
const cDate = (key, label) => ({ key, label, cls: 'mono', render: (r) => esc(date(r[key])) });
const cTag = (key, label) => ({ key, label, render: (r) => tagOf(r[key]) });
function tagOf(s) {
  const cls = /Paid|Completed|Posted|Available/.test(s) ? 'ok' : /Overdue|Unpaid|Voided/.test(s) ? 'bad'
    : /Partial|Pending|Process|Reserved|Payment/.test(s) ? 'warn' : 'mute';
  return `<span class="tag ${cls}">${esc(s)}</span>`;
}

/** The period control — one dropdown, not fourteen chips. */
function periodControl() {
  const r = rangeNow();
  return `<select class="fldsel" data-act="range" aria-label="Reporting period" title="Reporting period">
    ${M.RANGE_KEYS.map(([k, l]) => `<option value="${k}" ${S.rangeKey === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}
  </select><span class="vs" title="${esc(date(r.start))} to ${esc(date(r.end))}">${esc(r.label)}</span>`;
}
const activeFilterCount = () => Object.keys(M.EMPTY_FILTERS).filter((k) => S.filters[k] !== 'all').length;
function toolbar(o = {}) {
  const fc = activeFilterCount();
  return `<div class="toolrow" data-noprint="1">
    ${o.search === false ? '' : `<input class="search" placeholder="Search…" value="${esc(S.query)}" data-act="query" />`}
    ${o.filters === false ? '' : `<button class="btn ${fc ? 'on' : ''}" data-menu="filters">${I.filter} Filters${fc ? ` · ${fc}` : ''}</button>`}
    ${o.period === false ? '' : periodControl()}
    <span class="spacer"></span>
    <button class="btn" data-act="csv">${I.down} CSV</button>
    <button class="btn" data-act="xls">${I.down} Excel</button>
    <button class="btn" data-act="print">${I.print} PDF</button>
  </div>`;
}

/* ------------------------------ pages ------------------------------ */
const PAGE_META = {
  'dashboard/overview': { t: 'Dashboard', u: 'ڈیش بورڈ' },
  'dashboard/alerts': { t: 'Alerts & notifications', u: 'اطلاعات', p: 'Everything that needs a decision, most urgent first.' },
  'properties/inventory': { t: 'Property inventory', u: 'اسٹاک و مالیت', p: 'Unsold stock: what it cost, what it is worth today, and the difference.' },
  'properties/purchases': { t: 'Purchase register', u: 'خرید رجسٹر', p: 'Every property bought, with acquisition costs and what is still owed to the seller.' },
  'properties/performance': { t: 'Property performance', u: 'جائیداد کارکردگی', p: 'Profit on each property sold, after acquisition costs, commission, tax and selling costs.' },
  'sales/register': { t: 'Sales register', u: 'فروخت رجسٹر', p: 'Every sale with buyer, agent, amount received and amount outstanding.' },
  'sales/receivables': { t: 'Accounts receivable', u: 'واجب الوصول', p: 'What customers still owe, and how far past due each balance is.' },
  'agents/directory': { t: 'Agent directory', u: 'ایجنٹ', p: 'Sales, profit generated and commission for every agent in the period.' },
  'agents/commissions': { t: 'Commission ledger', u: 'کمیشن کھاتہ', p: 'What each agent earned, what has been paid, and what is still owed.' },
  'finance/pnl': { t: 'Profit & loss', u: 'نفع و نقصان', p: 'The full statement for the selected period, revenue down to net profit.' },
  'finance/profit': { t: 'Profit tracking', u: 'منافع', p: 'Purchases, sales, gross profit, expenses and net profit by week, month or year.' },
  'finance/cashflow': { t: 'Cash flow', u: 'نقدی بہاؤ', p: 'Money received and paid, with opening and closing balance.' },
  'finance/payables': { t: 'Accounts payable', u: 'واجب الادا', p: 'What the company owes sellers, agents, staff, vendors and the tax authority.' },
  'costs/expenses': { t: 'Expenses', u: 'اخراجات', p: 'Operating expenses by category and vendor, with anything still unpaid.' },
  'costs/salaries': { t: 'Employee salaries', u: 'تنخواہیں', p: 'Basic, bonus, allowance and deductions per employee.' },
  'costs/bills': { t: 'Bills', u: 'بل', p: 'Recurring and one-off bills, their due dates and anything overdue.' },
  'costs/tax': { t: 'Tax', u: 'ٹیکس', p: 'All tax obligations, split between transaction withholding tax and corporate income tax.' },
  'costs/zakat': { t: 'Zakat', u: 'زکوٰۃ', p: 'Zakat calculated, paid and remaining — reported separately from operating expenses.' },
  'admin/transactions': { t: 'Transaction ledger', u: 'لین دین کھاتہ', p: 'Every financial transaction with reference, method, account and approver.' },
  'admin/audit': { t: 'Audit trail', u: 'آڈٹ', p: 'Who did what, and when. Records are voided or reversed, never deleted.' },
  'admin/users': { t: 'Users & roles', u: 'اجازتیں', p: 'Who can see what. Sign in as any user to view the system through their eyes.' },
  'account': { t: 'My account', u: 'میرا اکاؤنٹ' },
  'search': { t: 'Search results', u: 'تلاش' },
};
const pageKey = () => (S.page === 'account' || S.page === 'search' ? S.page : S.page + '/' + S.tab);

function renderPage() {
  const key = pageKey();
  const meta = PAGE_META[key] || { t: 'Page' };
  const sec = sectionOf(S.page);
  if (sec) {
    const t = sec.tabs.find((x) => x.id === S.tab);
    if (t && denied(t.need)) return pageShell(meta, restricted(meta.t.toLowerCase()), { tools: false });
  }
  switch (key) {
    case 'dashboard/overview': return pageDashboard();
    case 'dashboard/alerts': return pageAlerts(meta);
    case 'properties/inventory': return pageInventory(meta);
    case 'properties/purchases': return pagePurchases(meta);
    case 'properties/performance': return pagePerformance(meta);
    case 'sales/register': return pageSales(meta);
    case 'sales/receivables': return pageReceivables(meta);
    case 'agents/directory': return pageAgents(meta);
    case 'agents/commissions': return pageCommissions(meta);
    case 'finance/pnl': return pagePnl(meta);
    case 'finance/profit': return pageProfit(meta);
    case 'finance/cashflow': return pageCashflow(meta);
    case 'finance/payables': return pagePayables(meta);
    case 'costs/expenses': return pageExpenses(meta);
    case 'costs/salaries': return pageSalaries(meta);
    case 'costs/bills': return pageBills(meta);
    case 'costs/tax': return pageTax(meta);
    case 'costs/zakat': return pageZakat(meta);
    case 'admin/transactions': return pageTransactions(meta);
    case 'admin/audit': return pageAudit(meta);
    case 'admin/users': return pageUsers(meta);
    case 'account': return pageAccount(meta);
    case 'search': return pageSearch(meta);
    default: return pageShell(meta, `<div class="empty">${I.empty}<h3>Not found</h3></div>`, { tools: false });
  }
}
function pageShell(meta, body, o = {}) {
  return `<div class="page">
    ${printHead(meta.t)}
    <div class="phead">
      <div><h1>${esc(meta.t)}</h1>${meta.u ? `<span class="u">${esc(meta.u)}</span>` : ''}${meta.p ? `<p>${esc(meta.p)}</p>` : ''}</div>
      ${o.acts ? `<div class="acts" data-noprint="1">${o.acts}</div>` : ''}
    </div>
    ${o.tools === false ? '' : toolbar(o)}
    ${body}
  </div>`;
}

/* ---------- dashboards, one per role ---------- */
function pageDashboard() {
  const f = effFilters(), r = rangeNow();
  const cmp = M.compare(r, f), k = cmp.cur, d = cmp.d;
  const bv = basisView(k), bvPrev = basisView(cmp.prev);
  const cash = M.cashLedger(r, f);
  const strip = `<div class="rolestrip"><div class="ini">${esc(S.user.initials)}</div>
    <div><div class="t">${esc(S.user.name)} — ${esc(S.user.title)}</div>
    <div class="s">${esc(roleBlurb())}</div></div>
    <span class="spacer"></span><div class="acts" data-noprint="1">${periodControl()}</div></div>`;

  let body;
  if (role() === 'Agent') body = dashAgent(k, r, f);
  else if (role() === 'Accountant') body = dashAccountant(k, cash, r, f);
  else if (role() === 'Manager') body = dashManager(k, cmp, r, f);
  else body = dashCEO(k, cmp, bv, bvPrev, cash, r, f);

  return `<div class="page">${printHead('Dashboard')}${strip}${body}</div>`;
}
function roleBlurb() {
  return {
    CEO: 'Full access — every property, sale, cost, tax and profit figure.',
    Accountant: 'Purchases, sales, expenses, payments, tax and Zakat. Salaries are restricted.',
    Manager: 'Properties, sales, agents and commissions. Company financials are restricted.',
    Agent: 'Your assigned properties, your customers and your own commission only.',
  }[role()];
}
function dashCEO(k, cmp, bv, bvPrev, cash, r, f) {
  const d = cmp.d;
  const netDelta = M.deltaPct(bv.net, bvPrev.net);
  const series = M.monthlySeries(M.TODAY.getFullYear(), f).map((m) => ({ label: m.label, full: m.full, purchase: m.k.purchaseCost, sales: m.k.salesRevenue, net: m.k.netProfit, expenses: m.k.totalExpenses }));
  const al = M.alerts().filter((a) => !denied(a.view));
  const exp = M.expenseBreakdown(k).slice(0, 5).map((x, i) => ({ k: x[0], v: x[1], c: SC[i] }));
  const restTot = M.expenseBreakdown(k).slice(5).reduce((a, x) => a + x[1], 0);
  if (restTot > 0) exp.push({ k: 'Other categories', v: restTot, c: SC[5] });
  return `
  <div class="kpis">
    ${kpi({ k: 'Selling revenue', v: k.salesRevenue, d: d('salesRevenue'), go: 'sales/register' })}
    ${kpi({ k: 'Gross profit', v: bv.gross, tone: bv.gross >= 0 ? 'pos' : 'neg', go: 'finance/pnl' })}
    ${kpi({ k: 'Net profit', v: bv.net, tone: bv.net >= 0 ? 'pos' : 'neg', cls: 'lead', d: netDelta, go: 'finance/pnl' })}
    ${kpi({ k: 'Cash in hand', v: cash.closing, f: 'at ' + date(r.end), go: 'finance/cashflow' })}
    ${kpi({ k: 'Receivables', v: k.receivable, f: 'owed to us', go: 'sales/receivables' })}
    ${kpi({ k: 'Payables', v: k.payable, f: 'we owe', cls: 'warnbox', go: 'finance/payables' })}
  </div>
  <div class="grid c2u">
   <div style="display:grid;gap:14px;min-width:0">
    <div class="panel"><div class="panel-h"><h3>Sales against purchases</h3><span class="sub">${esc(M.TODAY.getFullYear())}, by month</span><span class="spacer"></span><button class="link" data-go="finance/profit">Profit tracking</button></div>
      <div class="panel-b">${chartGroupedBars(series, 'purchase', 'sales', 'Purchase cost', 'Selling revenue')}</div></div>
    <div class="panel"><div class="panel-h"><h3>Where the money went</h3><span class="sub">${esc(money(k.totalExpenses))} total</span></div>
      <div class="panel-b"><div class="grid c2">${chartDonut(exp)}<div>${ranked(exp.map((x) => ({ ...x, go: costGo(x.k) })), k.totalExpenses)}</div></div></div></div>
   </div>
   <div style="display:grid;gap:14px;min-width:0">
    <div class="panel"><div class="panel-h"><h3>Needs attention</h3><span class="sub">${num(al.length)} items</span></div>
      <div class="panel-b tight"><div class="alerts">${al.slice(0, 4).map(alertRow).join('')}</div>
      ${al.length > 4 ? `<div style="margin-top:10px"><button class="link" data-go="dashboard/alerts">All ${num(al.length)} alerts</button></div>` : ''}</div></div>
    <div class="panel"><div class="panel-h"><h3>Portfolio</h3><span class="sub">${num(k.counts.total)} properties</span></div>
      <div class="panel-b tight">
        ${shareBar([['Available', k.counts.available], ['Reserved', k.counts.reserved], ['Under process', k.counts.underProcess], ['Sold', k.counts.sold]].map((x, i) => ({ k: x[0], v: x[1], c: OC[i], disp: num(x[1]) + ' properties' })), k.counts.total)}
        ${ranked([['Available', k.counts.available], ['Reserved', k.counts.reserved], ['Under process', k.counts.underProcess], ['Sold', k.counts.sold]].map((x, i) => ({ k: x[0], v: x[1], c: OC[i], disp: num(x[1]), go: 'properties/inventory' })), k.counts.total)}
        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
          <span class="vs">Portfolio cost <b>${esc(money(k.portfolioCost))}</b></span>
          <span class="vs">Market value <b>${esc(money(k.portfolioValue))}</b></span>
        </div>
      </div></div>
   </div>
  </div>`;
}
const costGo = (label) => ({ 'Employee Salaries': 'costs/salaries', 'Office Expenses': 'costs/expenses', 'Agent Commission': 'agents/commissions', Marketing: 'costs/expenses', Bills: 'costs/bills', 'Property Expenses': 'costs/expenses', Tax: 'costs/tax', Zakat: 'costs/zakat' }[label] || 'costs/expenses');

function dashAccountant(k, cash, r, f) {
  const bills = M.DATA.bills.filter((b) => b.status === 'Overdue' || b.status === 'Pending').sort((a, b) => a.dueDate - b.dueDate).slice(0, 6);
  return `
  <div class="kpis">
    ${kpi({ k: 'Cash in hand', v: cash.closing, cls: 'lead', go: 'finance/cashflow' })}
    ${kpi({ k: 'Receivables', v: k.receivable, f: 'to collect', go: 'sales/receivables' })}
    ${kpi({ k: 'Payables', v: k.payable, f: 'to pay', cls: 'warnbox', go: 'finance/payables' })}
    ${kpi({ k: 'Bills outstanding', v: k.billsOut, f: num(k.billsOverdueCount) + ' overdue', go: 'costs/bills' })}
    ${kpi({ k: 'Tax outstanding', v: k.taxOut, go: 'costs/tax' })}
    ${kpi({ k: 'Zakat remaining', v: k.zakatRemaining, go: 'costs/zakat' })}
  </div>
  <div class="grid c2u">
    <div class="panel"><div class="panel-h"><h3>Bills due and overdue</h3><span class="spacer"></span><button class="link" data-go="costs/bills">All bills</button></div>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>Bill</th><th>Vendor</th><th>Due</th><th class="r">Outstanding</th><th>Status</th></tr></thead><tbody>
      ${bills.map((b) => `<tr><td class="strong">${esc(b.type)}</td><td>${esc(b.vendor)}</td><td class="mono">${esc(date(b.dueDate))}</td><td class="r mono">${esc(money(b.outstanding))}</td><td>${tagOf(b.status)}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="panel"><div class="panel-h"><h3>Quick entry</h3></div><div class="panel-b">
      <div style="display:grid;gap:8px">
        <button class="btn pri" data-modal="expense">${I.plus} Record an expense</button>
        <button class="btn" data-modal="payment">${I.plus} Record a payment</button>
        <button class="btn" data-modal="sale">${I.plus} Record a sale</button>
      </div>
      <div class="note calm" style="margin-top:12px"><span class="ic">${I.info}</span><div>Anything entered here posts to the ledger immediately and appears in the reports and the audit trail.</div></div>
    </div></div>
  </div>`;
}
function dashManager(k, cmp, r, f) {
  const agents = M.agentSummary(r, f).slice(0, 5);
  const inv = M.DATA.properties.filter((p) => M.propMatch(p, f) && p.status !== 'Sold').map((p) => ({ ...p, up: p.currentValue - p.totalCost })).sort((a, b) => b.up - a.up).slice(0, 4);
  return `
  <div class="kpis">
    ${kpi({ k: 'Properties held', raw: num(k.counts.unsold), f: num(k.counts.total) + ' in register', go: 'properties/inventory' })}
    ${kpi({ k: 'Available', raw: num(k.counts.available), go: 'properties/inventory' })}
    ${kpi({ k: 'Sold in period', raw: num(k.counts.soldInRange), go: 'sales/register' })}
    ${kpi({ k: 'Selling revenue', v: k.salesRevenue, cls: 'lead', d: cmp.d('salesRevenue'), go: 'sales/register' })}
    ${kpi({ k: 'Agent commission', v: k.commission, go: 'agents/commissions' })}
    ${kpi({ k: 'Market value', v: k.portfolioValue, f: 'unsold stock', go: 'properties/inventory' })}
  </div>
  <div class="grid c2u">
    <div class="panel"><div class="panel-h"><h3>Top agents</h3><span class="sub">by sales value</span><span class="spacer"></span><button class="link" data-go="agents/directory">All agents</button></div>
      <div class="panel-b tight">${agents.length ? ranked(agents.map((a, i) => ({ k: a.name, v: a.salesValue, c: SC[i % 6], go: 'agents/directory' })), agents.reduce((x, a) => x + a.salesValue, 0)) : '<div class="empty" style="padding:20px">No agent activity in this period.</div>'}</div></div>
    <div class="panel"><div class="panel-h"><h3>Highest upside held</h3></div><div class="panel-b">
      ${inv.length ? `<div class="pcard-grid">${inv.map((p) => `<button class="pcard" data-go="properties/inventory">${propArt(p)}<div class="meta"><div class="t">${esc(p.name)}</div><div class="s">${esc(p.project)}</div><div class="b"><span class="v pos">${esc(money(p.up))}</span><span class="s">upside</span></div></div></button>`).join('')}</div>` : '<div class="empty" style="padding:20px">No unsold properties.</div>'}
    </div></div>
  </div>`;
}
function dashAgent(k, r, f) {
  const mySales = M.DATA.sales.filter((s) => s.agentId === S.user.agentId && M.inRange(s.date, r));
  const myComm = M.DATA.commissions.filter((c) => c.agentId === S.user.agentId);
  const earned = myComm.reduce((a, c) => a + c.amount, 0), paid = myComm.reduce((a, c) => a + c.paid, 0);
  return `
  <div class="kpis">
    ${kpi({ k: 'My sales in period', raw: num(mySales.length), go: 'sales/register' })}
    ${kpi({ k: 'Sales value', v: mySales.reduce((a, s) => a + s.sellingPrice, 0), go: 'sales/register' })}
    ${kpi({ k: 'Commission earned', v: earned, cls: 'lead', go: 'agents/commissions' })}
    ${kpi({ k: 'Commission paid', v: paid, tone: 'pos', go: 'agents/commissions' })}
    ${kpi({ k: 'Still owed to me', v: earned - paid, tone: earned - paid > 0 ? 'neg' : '', cls: 'warnbox', go: 'agents/commissions' })}
    ${kpi({ k: 'My customers owe', v: mySales.reduce((a, s) => a + s.outstanding, 0), go: 'sales/receivables' })}
  </div>
  <div class="panel"><div class="panel-h"><h3>My recent sales</h3><span class="spacer"></span><button class="link" data-go="sales/register">All my sales</button></div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>Property</th><th>Buyer</th><th>Date</th><th class="r">Sale price</th><th class="r">Outstanding</th><th class="r">My commission</th><th>Status</th></tr></thead><tbody>
    ${mySales.slice(0, 8).map((s) => `<tr><td class="strong">${esc(s.property)}</td><td>${esc(s.buyer)}</td><td class="mono">${esc(date(s.date))}</td><td class="r mono">${esc(money(s.sellingPrice))}</td><td class="r mono">${esc(money(s.outstanding))}</td><td class="r mono">${esc(money(s.commission))}</td><td>${tagOf(s.payStatus)}</td></tr>`).join('') || '<tr><td colspan="7"><div class="empty" style="border:0;padding:24px">No sales in this period.</div></td></tr>'}
    </tbody></table></div></div>
  <div class="note calm" style="margin-top:14px"><span class="ic">${I.info}</span><div>You are seeing only your own assigned properties, customers and commission. Company financials are not visible to the Agent role.</div></div>`;
}
const alertRow = (a) => `<button class="alert ${esc(a.sev)}" data-go="${esc(alertGo(a.view))}"><span class="ic">${a.sev === 'good' ? I.ok : a.sev === 'high' ? I.warn : I.info}</span><span><span class="t">${esc(a.title)}</span><span class="d">${esc(a.detail)}</span></span></button>`;
const alertGo = (v) => ({ receivables: 'sales/receivables', commissions: 'agents/commissions', tax: 'costs/tax', bills: 'costs/bills', salaries: 'costs/salaries', purchases: 'properties/purchases', inventory: 'properties/inventory' }[v] || 'dashboard/alerts');

function pageAlerts(meta) {
  const al = M.alerts().filter((a) => !denied(a.view));
  return pageShell(meta, al.length ? `<div class="alerts">${al.map(alertRow).join('')}</div>`
    : `<div class="empty">${I.ok}<h3>All clear</h3><p>Nothing needs attention right now.</p></div>`, { tools: false });
}

/* ---------- property pages ---------- */
function pageInventory(meta) {
  const f = effFilters();
  const rows = M.DATA.properties.filter((p) => M.propMatch(p, f) && p.status !== 'Sold')
    .map((p) => ({ ...p, upside: p.currentValue - p.totalCost, upPct: M.pctOf(p.currentValue - p.totalCost, p.totalCost) }))
    .sort((a, b) => b.upside - a.upside);
  const body = summary([['Unsold properties', num(rows.length)], ['Cost value', money(rows.reduce((a, p) => a + p.totalCost, 0))], ['Market value', money(rows.reduce((a, p) => a + p.currentValue, 0))], ['Potential profit', money(rows.reduce((a, p) => a + p.upside, 0))]])
    + `<div class="note" style="margin-bottom:14px" data-noprint="1"><span class="ic">${I.info}</span><div><b>Potential profit is an unrealised estimate</b> on stock nobody has bought yet. It is never added to net profit.</div></div>`
    + toolbar({ period: false })
    + table([cTxt('id', 'ID'), cTxt('name', 'Property'), cTxt('type', 'Type'), cTxt('project', 'Project'), cTxt('location', 'City'), cTxt('size', 'Size'), cMoney('totalCost', 'Purchase cost'), cMoney('currentValue', 'Current value'), cMoney('upside', 'Potential profit', { good: true }), { key: 'upPct', label: 'Upside %', a: 'r', cls: 'mono', render: (p) => esc(pct(p.upPct)) }, { key: 'heldDays', label: 'Days held', a: 'r', cls: 'mono', render: (p) => esc(num(p.heldDays)) }, cTag('status', 'Status')], rows, { totals: true });
  return pageShell(meta, body, { tools: false, acts: `<button class="btn pri" data-modal="property">${I.plus} Add property</button>` });
}
function pagePurchases(meta) {
  const f = effFilters(), r = rangeNow();
  const rows = M.DATA.properties.filter((p) => M.propMatch(p, f) && M.inRange(p.purchaseDate, r)).map((p) => ({ ...p, extrasTotal: p.totalCost - p.price }));
  const body = summary([['Properties bought', num(rows.length)], ['Purchase price', money(rows.reduce((a, p) => a + p.price, 0))], ['Acquisition costs', money(rows.reduce((a, p) => a + p.extrasTotal, 0))], ['Total cost', money(rows.reduce((a, p) => a + p.totalCost, 0))], ['Still payable', money(rows.reduce((a, p) => a + p.remaining, 0))]])
    + toolbar()
    + table([cTxt('id', 'ID'), cTxt('name', 'Property'), cTxt('type', 'Type'), cTxt('project', 'Project'), cTxt('seller', 'Seller'), cDate('purchaseDate', 'Purchased'), cMoney('price', 'Price'), cMoney('extrasTotal', 'Extra costs'), cMoney('totalCost', 'Total cost'), cMoney('paid', 'Paid'), cMoney('remaining', 'Remaining'), cTag('payStatus', 'Payment'), cTag('status', 'Status')], rows, { totals: true });
  return pageShell(meta, body, { tools: false, acts: `<button class="btn pri" data-modal="property">${I.plus} Add property</button>` });
}
function pagePerformance(meta) {
  const rows = M.propertyPerf(rangeNow(), effFilters());
  const body = summary([['Properties sold', num(rows.length)], ['Total cost', money(rows.reduce((a, p) => a + p.totalCost, 0))], ['Revenue', money(rows.reduce((a, p) => a + p.sellingPrice, 0))], ['Gross profit', money(rows.reduce((a, p) => a + p.grossProfit, 0))], ['Net profit', money(rows.reduce((a, p) => a + p.netProfit, 0))]])
    + toolbar()
    + table([cTxt('id', 'ID'), cTxt('name', 'Property'), cTxt('project', 'Project'), cTxt('agent', 'Agent'), cDate('saleDate', 'Sold'), cMoney('price', 'Purchase price'), cMoney('extras', 'Acquisition'), cMoney('totalCost', 'Total cost'), cMoney('sellingPrice', 'Selling price'), cMoney('commission', 'Commission'), cMoney('grossProfit', 'Gross profit', { good: true }), cMoney('netProfit', 'Net profit', { good: true }), { key: 'margin', label: 'Margin', a: 'r', cls: 'mono', render: (p) => esc(pct(p.margin)) }], rows, { totals: true });
  return pageShell(meta, body, { tools: false });
}

/* ---------- sales pages ---------- */
function pageSales(meta) {
  const f = effFilters(), r = rangeNow();
  const ids = new Set(M.DATA.properties.filter((p) => M.propMatch(p, f)).map((p) => p.id));
  const rows = M.DATA.sales.filter((s) => M.saleMatch(s, f, ids) && M.inRange(s.date, r));
  const body = summary([['Properties sold', num(rows.length)], ['Revenue', money(rows.reduce((a, s) => a + s.sellingPrice, 0))], ['Received', money(rows.reduce((a, s) => a + s.received, 0))], ['Outstanding', money(rows.reduce((a, s) => a + s.outstanding, 0))], ['Commission', money(rows.reduce((a, s) => a + s.commission, 0))]])
    + toolbar()
    + table([cTxt('id', 'ID'), cTxt('property', 'Property'), cTxt('buyer', 'Buyer'), cTxt('agent', 'Agent'), cDate('date', 'Sale date'), cMoney('sellingPrice', 'Selling price'), cMoney('received', 'Received'), cMoney('outstanding', 'Outstanding'), cTxt('method', 'Method'), cMoney('commission', 'Commission'), cMoney('netRevenue', 'Net revenue'), cTag('payStatus', 'Payment'), cTag('saleStatus', 'Sale')], rows, { totals: true });
  return pageShell(meta, body, { tools: false, acts: `<button class="btn pri" data-modal="sale">${I.plus} Record sale</button>` });
}
function pageReceivables(meta) {
  const f = effFilters();
  const rows = M.receivables(f), ag = M.aging(f);
  const body = summary([['Open balances', num(rows.length)], ['Sale value', money(rows.reduce((a, s) => a + s.sellingPrice, 0))], ['Received', money(rows.reduce((a, s) => a + s.received, 0))], ['Outstanding', money(rows.reduce((a, s) => a + s.outstanding, 0))], ['Overdue', money(ag.slice(1).reduce((a, b) => a + b.amount, 0))]])
    + `<div class="panel" style="margin-bottom:14px"><div class="panel-h"><h3>Ageing</h3><span class="sub">how far past due</span></div><div class="panel-b tight">
       ${shareBar(ag.map((b, i) => ({ k: b.label, v: b.amount, c: i === 0 ? OC[0] : [OC[1], OC[2], OC[3], 'var(--bad)'][i - 1], disp: money(b.amount) })))}
       ${ranked(ag.map((b, i) => ({ k: b.label + ' · ' + num(b.count) + (b.count === 1 ? ' balance' : ' balances'), v: b.amount, c: i === 0 ? OC[0] : [OC[1], OC[2], OC[3], 'var(--bad)'][i - 1] })))}</div></div>`
    + toolbar({ period: false })
    + table([cTxt('buyer', 'Customer'), cTxt('property', 'Property'), cTxt('agent', 'Agent'), cMoney('sellingPrice', 'Sale amount'), cMoney('received', 'Received'), cMoney('outstanding', 'Outstanding'), cDate('dueDate', 'Due date'), { key: 'daysOverdue', label: 'Days overdue', a: 'r', cls: 'mono', render: (s) => `<span class="${s.daysOverdue > 0 ? 'neg' : ''}">${esc(s.daysOverdue > 0 ? num(s.daysOverdue) : '—')}</span>` }, cTag('payStatus', 'Status')], rows, { totals: true });
  return pageShell(meta, body, { tools: false, acts: `<button class="btn pri" data-modal="payment">${I.plus} Record payment</button>` });
}

/* ---------- agents ---------- */
function pageAgents(meta) {
  const rows = M.agentSummary(rangeNow(), effFilters()).map((a, i) => ({ ...a, rank: i + 1 }));
  const body = summary([['Agents', num(rows.length)], ['Sales value', money(rows.reduce((a, x) => a + x.salesValue, 0))], ['Profit generated', money(rows.reduce((a, x) => a + x.profit, 0))], ['Commission', money(rows.reduce((a, x) => a + x.commission, 0))], ['Outstanding', money(rows.reduce((a, x) => a + x.outstanding, 0))]])
    + toolbar()
    + table([{ key: 'rank', label: '#', a: 'r', cls: 'mono', render: (a) => esc(String(a.rank)) }, cTxt('name', 'Agent'), cTxt('id', 'Agent ID'), cTxt('office', 'Office'), { key: 'transactions', label: 'Deals', a: 'r', cls: 'mono', render: (a) => esc(num(a.transactions)) }, cMoney('salesValue', 'Sales value'), cMoney('profit', 'Profit generated', { good: true }), cMoney('commission', 'Commission'), cMoney('paid', 'Paid'), cMoney('outstanding', 'Outstanding')], rows, { totals: true });
  return pageShell(meta, body, { tools: false });
}
function pageCommissions(meta) {
  const f = effFilters(), r = rangeNow();
  const ids = new Set(M.DATA.properties.filter((p) => M.propMatch(p, f)).map((p) => p.id));
  const rows = M.DATA.commissions.filter((c) => ids.has(c.propertyId) && M.inRange(c.date, r) && (f.agent === 'all' || c.agentId === f.agent));
  const body = summary([['Entries', num(rows.length)], ['Earned', money(rows.reduce((a, c) => a + c.amount, 0))], ['Paid', money(rows.reduce((a, c) => a + c.paid, 0))], ['Outstanding', money(rows.reduce((a, c) => a + c.outstanding, 0))]])
    + toolbar()
    + table([cTxt('id', 'ID'), cTxt('agent', 'Agent'), cTxt('property', 'Property'), cTxt('counterparty', 'Buyer'), cDate('date', 'Date'), { key: 'pct', label: 'Rate', a: 'r', cls: 'mono', render: (c) => esc(c.pct.toFixed(2) + '%') }, cMoney('amount', 'Commission'), cMoney('paid', 'Paid'), cMoney('outstanding', 'Outstanding'), cTag('status', 'Status')], rows, { totals: true });
  return pageShell(meta, body, { tools: false });
}

/* ---------- finance ---------- */
function pagePnl(meta) {
  const k = M.computeKPIs(rangeNow(), effFilters()), bv = basisView(k), r = rangeNow();
  const L = (label, v, kind) => ({ label, v, kind });
  const rows = [
    L('REVENUE', null, 'h'), L('Property sales', k.salesRevenue), L('Other revenue', 0), L('Total revenue', k.salesRevenue, 't'),
    L('COST OF SALES', null, 'h'),
    ...(bv.doc ? [L('Property purchase cost', -(bv.cost - k.acquisitionCosts)), L('Property acquisition costs', -k.acquisitionCosts)] : [L('Cost of properties sold', -bv.cost)]),
    L('Gross profit', bv.gross, 't'),
    L('OPERATING EXPENSES', null, 'h'),
    L('Agent commission', -k.commission), L('Salaries', -k.salaries), L('Office expenses', -k.officeExp),
    L('Marketing', -k.marketing), L('Bills', -k.bills), L('Property expenses', -k.propertyExp),
    L('Employee expenses', -k.employeeExp), L('Other expenses', -k.other),
    L('Operating profit', bv.op, 't'),
    L('OTHER FINANCIAL OBLIGATIONS', null, 'h'), L('Tax', -k.tax), L('Zakat', -k.zakat),
    L('NET PROFIT', bv.net, 'g'),
  ];
  const wf = [
    { k: 'Selling revenue', v: k.salesRevenue, total: true },
    { k: 'Cost of property sold', v: -bv.cost, why: bv.costLabel },
    { k: 'Gross profit', v: bv.gross, total: true },
    { k: 'Operating costs', v: -k.operatingCosts, why: 'Commission, salaries, office, marketing, property, bills, other' },
    { k: 'Operating profit', v: bv.op, total: true },
    { k: 'Tax', v: -k.tax }, { k: 'Zakat', v: -k.zakat, why: 'Kept separate from operating expenses' },
    { k: 'Net profit', v: bv.net, total: true },
  ];
  const body = toolbar({ search: false })
    + `<div class="panel" style="margin-bottom:14px"><div class="panel-h"><h3>From revenue to net profit</h3><span class="sub">${esc(r.label)}</span>
        <span class="spacer"></span><span class="seg" data-noprint="1" role="group" aria-label="Cost basis">
          <button data-act="basis" data-arg="cogs" aria-pressed="${S.grossBasis === 'cogs'}">Cost of units sold</button>
          <button data-act="basis" data-arg="doc" aria-pressed="${S.grossBasis === 'doc'}">Document wording</button></span></div>
       <div class="panel-b">${chartWaterfall(wf)}</div></div>
      <div class="panel"><div class="tblwrap"><table class="tbl"><thead><tr><th>Line</th><th class="r">${esc(r.label)}</th></tr></thead><tbody>
      ${rows.map((x) => x.kind === 'h'
        ? `<tr><td colspan="2" style="padding-top:15px"><span class="kicker">${esc(x.label)}</span></td></tr>`
        : `<tr><td class="${x.kind ? 'strong' : ''}">${esc(x.label)}</td><td class="r mono ${x.kind ? 'strong' : ''}" style="${x.kind === 'g' ? 'font-size:15px' : ''}"><span class="${x.v < 0 ? '' : x.kind ? 'pos' : ''}">${esc(money(x.v))}</span></td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="note calm" style="margin-top:14px"><span class="ic">${I.info}</span><div>Cost of sales is measured as the <b>${esc(bv.costLabel)}</b>. Zakat sits below the operating line, separate from operating expenses. Withholding tax on individual sales is already inside net sale revenue and is not repeated here.</div></div>`;
  return pageShell(meta, body, { tools: false });
}
function pageProfit(meta) {
  const f = effFilters();
  const rows = S.period === 'weekly'
    ? M.weeklySeries(12, f).map((w) => ({ label: w.label, full: w.full, purchase: w.k.purchaseCost, sales: w.k.salesRevenue, gross: w.k.grossProfit, commission: w.k.commission, expenses: w.k.totalExpenses, net: w.k.netProfit }))
    : S.period === 'yearly'
      ? [M.TODAY.getFullYear() - 1, M.TODAY.getFullYear()].map((y) => { const kk = M.computeKPIs(M.rangeFor(y === M.TODAY.getFullYear() ? 'thisYear' : 'lastYear'), f); return { label: 'FY ' + y, full: 'FY ' + y, purchase: kk.purchaseCost, sales: kk.salesRevenue, gross: kk.grossProfit, commission: kk.commission, expenses: kk.totalExpenses, net: kk.netProfit }; })
      : M.monthlySeries(M.TODAY.getFullYear(), f).map((m) => ({ label: m.label, full: m.full, purchase: m.k.purchaseCost, sales: m.k.salesRevenue, gross: m.k.grossProfit, commission: m.k.commission, expenses: m.k.totalExpenses, net: m.k.netProfit }));
  const body = `<div class="toolrow" data-noprint="1"><span class="seg">${['weekly', 'monthly', 'yearly'].map((p) => `<button data-act="period" data-arg="${p}" aria-pressed="${S.period === p}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}</span><span class="spacer"></span>
      <button class="btn" data-act="csv">${I.down} CSV</button><button class="btn" data-act="print">${I.print} PDF</button></div>
    <div class="panel" style="margin-bottom:14px"><div class="panel-h"><h3>Revenue, expenses and net profit</h3></div><div class="panel-b">${chartLines(rows, [
      { key: 'sales', label: 'Sales', c: 'var(--s1)' }, { key: 'expenses', label: 'Expenses', c: 'var(--s2)' }, { key: 'net', label: 'Net profit', c: 'var(--s3)' }])}</div></div>`
    + table([cTxt('full', 'Period'), cMoney('purchase', 'Purchase cost'), cMoney('sales', 'Sales'), cMoney('gross', 'Gross profit', { good: true }), cMoney('commission', 'Commission'), cMoney('expenses', 'Expenses'), cMoney('net', 'Net profit', { good: true })], rows, { totals: true });
  return pageShell(meta, body, { tools: false });
}
function pageCashflow(meta) {
  const f = effFilters(), r = rangeNow(), cl = M.cashLedger(r, f);
  const rows = M.DATA.payments.filter((p) => M.inRange(p.date, r) && (f.office === 'all' || p.office === f.office))
    .map((p) => ({ ...p, inAmt: p.dir === 'in' ? p.amount : 0, outAmt: p.dir === 'out' ? p.amount : 0 }));
  const body = summary([['Opening balance', money(cl.opening)], ['Cash in', money(cl.cashIn)], ['Cash out', money(cl.cashOut)], ['Net cash flow', money(cl.net)], ['Closing balance', money(cl.closing)]])
    + `<div class="grid c2" style="margin-bottom:14px">
      <div class="panel"><div class="panel-h"><h3>Where cash came from</h3></div><div class="panel-b tight">${ranked(cl.inflows.map((x, i) => ({ k: x[0], v: x[1], c: SC[i % 6] })), cl.cashIn)}</div></div>
      <div class="panel"><div class="panel-h"><h3>Where cash went</h3></div><div class="panel-b tight">${ranked(cl.outflows.map((x, i) => ({ k: x[0], v: x[1], c: SC[i % 6] })), cl.cashOut)}</div></div></div>`
    + toolbar()
    + table([cTxt('id', 'Txn ID'), cDate('date', 'Date'), cTxt('category', 'Category'), cTxt('party', 'Party'), cMoney('inAmt', 'Cash in', { good: true }), cMoney('outAmt', 'Cash out'), cTxt('method', 'Method'), cTxt('account', 'Account')], rows, { totals: true });
  return pageShell(meta, body, { tools: false, acts: `<button class="btn pri" data-modal="payment">${I.plus} Record payment</button>` });
}
function pagePayables(meta) {
  const k = M.computeKPIs(rangeNow(), effFilters());
  const rows = k.payableBreakdown.filter((x) => x[1] > 0).map(([label, v]) => ({ id: label, label, v }));
  const body = summary([['Total payable', money(k.payable)]].concat(rows.map((x) => [x.label, money(x.v)])))
    + `<div class="panel" style="margin-bottom:14px"><div class="panel-b">${ranked(rows.map((x, i) => ({ k: x.label, v: x.v, c: SC[i % 6] })), k.payable)}</div></div>`
    + toolbar({ search: false })
    + table([cTxt('label', 'Owed to'), cMoney('v', 'Amount')], rows, { totals: true });
  return pageShell(meta, body, { tools: false });
}

/* ---------- costs ---------- */
function pageExpenses(meta) {
  const f = effFilters(), r = rangeNow();
  const rows = M.DATA.expenses.filter((e) => M.inRange(e.date, r) && (f.office === 'all' || e.office === f.office));
  const body = summary([['Entries', num(rows.length)], ['Total', money(rows.reduce((a, e) => a + e.amount, 0))], ['Paid', money(rows.reduce((a, e) => a + e.paid, 0))], ['Unpaid', money(rows.reduce((a, e) => a + e.outstanding, 0))]])
    + toolbar()
    + table([cTxt('id', 'ID'), cTxt('group', 'Category'), cTxt('category', 'Sub-category'), cTxt('vendor', 'Vendor'), cTxt('office', 'Office'), cDate('date', 'Date'), cMoney('amount', 'Amount'), cMoney('paid', 'Paid'), cMoney('outstanding', 'Outstanding'), cTxt('method', 'Method'), cTag('status', 'Status')], rows, { totals: true });
  return pageShell(meta, body, { tools: false, acts: `<button class="btn pri" data-modal="expense">${I.plus} Add expense</button>` });
}
function pageSalaries(meta) {
  const f = effFilters(), r = rangeNow();
  const rows = M.DATA.salaries.filter((s) => M.inRange(s.date, r) && (f.office === 'all' || s.office === f.office));
  const body = summary([['Payslips', num(rows.length)], ['Basic', money(rows.reduce((a, s) => a + s.basic, 0))], ['Bonus + allowance', money(rows.reduce((a, s) => a + s.bonus + s.allowance, 0))], ['Net paid', money(rows.reduce((a, s) => a + s.net, 0))]])
    + toolbar()
    + table([cTxt('id', 'ID'), cTxt('employee', 'Employee'), cTxt('dept', 'Department'), cTxt('monthLabel', 'Month'), cMoney('basic', 'Basic'), cMoney('bonus', 'Bonus'), cMoney('allowance', 'Allowance'), cMoney('deduction', 'Deduction'), cMoney('net', 'Net paid'), cDate('date', 'Pay date'), cTag('status', 'Status')], rows, { totals: true });
  return pageShell(meta, body, { tools: false });
}
function pageBills(meta) {
  const f = effFilters(), r = rangeNow();
  const rows = M.DATA.bills.filter((b) => M.inRange(b.dueDate, r) && (f.office === 'all' || b.office === f.office));
  const od = rows.filter((b) => b.status === 'Overdue');
  const body = summary([['Bills', num(rows.length)], ['Billed', money(rows.reduce((a, b) => a + b.amount, 0))], ['Paid', money(rows.reduce((a, b) => a + b.paid, 0))], ['Outstanding', money(rows.reduce((a, b) => a + b.outstanding, 0))]])
    + (od.length ? `<div class="note bad" style="margin-bottom:14px"><span class="ic">${I.warn}</span><div><b>${num(od.length)} overdue ${od.length === 1 ? 'bill' : 'bills'}</b> totalling ${esc(money(od.reduce((a, b) => a + b.outstanding, 0)))}.</div></div>` : '')
    + toolbar()
    + table([cTxt('id', 'ID'), cTxt('type', 'Bill type'), cTxt('vendor', 'Vendor'), cTxt('number', 'Bill no.'), cTxt('period', 'Period'), cDate('dueDate', 'Due'), cMoney('amount', 'Amount'), cMoney('paid', 'Paid'), cMoney('outstanding', 'Outstanding'), cTag('status', 'Status')], rows, { totals: true });
  return pageShell(meta, body, { tools: false, acts: `<button class="btn pri" data-modal="payment">${I.plus} Record payment</button>` });
}
function pageTax(meta) {
  const f = effFilters(), r = rangeNow(), k = M.computeKPIs(r, f);
  const rows = M.DATA.taxes.filter((t) => M.inRange(t.date, r) && (f.office === 'all' || t.office === f.office));
  const body = summary([['Entries', num(rows.length)], ['Total tax', money(rows.reduce((a, t) => a + t.amount, 0))], ['Paid', money(rows.reduce((a, t) => a + t.paid, 0))], ['Outstanding', money(rows.reduce((a, t) => a + t.outstanding, 0))], ['Due in 30 days', money(k.taxDueSoon)]])
    + `<div class="note" style="margin-bottom:14px" data-noprint="1"><span class="ic">${I.info}</span><div><b>Two kinds of tax, never added together.</b> Withholding tax on a sale is already deducted inside that sale's net revenue. Only advance and corporate income tax is subtracted again in the profit bridge.</div></div>`
    + toolbar()
    + table([cTxt('id', 'ID'), cTxt('type', 'Tax type'), cTxt('ref', 'Reference'), cTxt('property', 'Property'), cTxt('authority', 'Authority'), cMoney('amount', 'Amount'), cMoney('paid', 'Paid'), cMoney('outstanding', 'Outstanding'), cDate('dueDate', 'Due'), cTag('status', 'Status')], rows, { totals: true });
  return pageShell(meta, body, { tools: false });
}
function pageZakat(meta) {
  const zs = M.DATA.zakatSummary;
  const rows = M.DATA.zakat.filter((z) => M.inRange(z.date, rangeNow()));
  const body = summary([['Eligible assets', money(zs.eligibleAssets)], ['Zakatable amount', money(zs.zakatable)], ['Rate', zs.rate + '%'], ['Calculated', money(zs.calculated)], ['Paid', money(zs.paid)], ['Remaining', money(zs.remaining)]])
    + `<div class="note" style="margin-bottom:14px"><span class="ic">${I.warn}</span><div><b>Confirm the zakatable base with your accountant.</b> Stock held for resale is generally zakatable; property held for rental income generally is not. Zakat is reported separately from operating expenses, as the requirement document asks.</div></div>`
    + toolbar()
    + table([cTxt('id', 'ID'), cTxt('period', 'Period'), cMoney('eligibleAssets', 'Eligible assets', { sum: false }), cMoney('zakatable', 'Zakatable', { sum: false }), cTxt('rate', 'Rate'), cMoney('calculated', 'Calculated', { sum: false }), cMoney('amount', 'Paid'), cDate('date', 'Payment date'), cTxt('ref', 'Reference')], rows, { totals: true });
  return pageShell(meta, body, { tools: false });
}

/* ---------- admin ---------- */
function pageTransactions(meta) {
  const f = effFilters(), r = rangeNow();
  const rows = M.DATA.payments.filter((p) => M.inRange(p.date, r) && (f.office === 'all' || p.office === f.office));
  const body = summary([['Transactions', num(rows.length)], ['Cash in', money(rows.filter((p) => p.dir === 'in').reduce((a, p) => a + p.amount, 0))], ['Cash out', money(rows.filter((p) => p.dir === 'out').reduce((a, p) => a + p.amount, 0))]])
    + toolbar()
    + table([cTxt('id', 'Transaction ID'), cDate('date', 'Date'), cTxt('category', 'Type'), cTxt('party', 'Customer / vendor'), cMoney('amount', 'Amount'), cTxt('method', 'Method'), cTxt('account', 'Account'), cTxt('ref', 'Reference'), cTxt('createdBy', 'Created by'), cTxt('approvedBy', 'Approved by'), cTag('status', 'Status'),
      { key: 'void', label: '', render: (t) => t.status === 'Voided' ? '' : `<button class="btn sm" data-act="void" data-arg="${esc(t.id)}">Void</button>` }], rows, { totals: true });
  return pageShell(meta, body, { tools: false, acts: `<button class="btn pri" data-modal="payment">${I.plus} Record payment</button>` });
}
function pageAudit(meta) {
  const body = `<div class="note calm" style="margin-bottom:14px"><span class="ic">${I.info}</span><div><b>Financial records are never deleted.</b> They are voided, reversed or adjusted, and both the previous and the new amount are kept.</div></div>`
    + toolbar({ period: false })
    + table([cTxt('id', 'Entry'), cDate('date', 'Date'), cTxt('txnId', 'Transaction'), cTxt('action', 'Action'), cTxt('user', 'User'), cTxt('entity', 'Entity'),
      { key: 'prevAmount', label: 'Previous amount', a: 'r', cls: 'mono', render: (a) => esc(a.prevAmount == null ? '—' : money(a.prevAmount)) },
      cMoney('newAmount', 'New amount', { sum: false }), cTxt('note', 'Note')], M.DATA.audit);
  return pageShell(meta, body, { tools: false });
}
function pageUsers(meta) {
  const allTabs = NAV.flatMap((s) => s.tabs.map((t) => ({ sec: s.label, ...t })));
  const body = `<div class="grid c3" style="margin-bottom:16px">
    ${M.USERS.map((u) => `<button class="panel" data-act="signin" data-arg="${esc(u.id)}" style="text-align:left;cursor:pointer">
      <div class="panel-b" style="display:flex;gap:11px;align-items:center">
        <div class="rolestrip" style="margin:0;padding:0;border:0;background:none"><div class="ini">${esc(u.initials)}</div></div>
        <div><div style="font-weight:700">${esc(u.name)}${u.id === S.user.id ? ' <span class="tag new">signed in</span>' : ''}</div>
        <div class="vs">${esc(u.title)} · ${esc(u.role)}</div><div class="vs">${esc(u.office)}</div></div>
      </div></button>`).join('')}
  </div>
  <div class="panel"><div class="panel-h"><h3>What each role can see</h3></div><div class="tblwrap"><table class="tbl">
    <thead><tr><th>Section</th><th>Screen</th>${Object.keys(M.ROLES).map((x) => `<th style="text-align:center">${esc(x)}</th>`).join('')}</tr></thead><tbody>
    ${allTabs.map((t) => `<tr><td class="vs">${esc(t.sec)}</td><td class="strong">${esc(t.label)}</td>${Object.keys(M.ROLES).map((rl) => {
      const ok = !t.need || (M.ROLES[rl].deny || []).indexOf(t.need) < 0;
      return `<td style="text-align:center">${ok ? '<span class="tag ok">Allowed</span>' : '<span class="tag mute">Hidden</span>'}</td>`;
    }).join('')}</tr>`).join('')}
  </tbody></table></div></div>
  <div class="note" style="margin-top:14px"><span class="ic">${I.warn}</span><div><b>Open question for the client.</b> The requirement document says Accountant salary access is "according to company policy", which a developer cannot build from. It is set to <b>hidden</b> here — please confirm.</div></div>`;
  return pageShell(meta, body, { tools: false });
}
function pageAccount(meta) {
  const u = S.user;
  const allowed = NAV.flatMap((s) => visibleTabs(s).map((t) => s.label + ' · ' + t.label));
  const body = `<div class="grid c2u">
    <div class="panel"><div class="panel-h"><h3>Profile</h3></div><div class="panel-b">
      <div class="formgrid">
        <div class="fld"><span>Full name</span><input value="${esc(u.name)}" readonly /></div>
        <div class="fld"><span>Job title</span><input value="${esc(u.title)}" readonly /></div>
        <div class="fld"><span>Role</span><input value="${esc(u.role)}" readonly /></div>
        <div class="fld"><span>Office / branch</span><input value="${esc(u.office)}" readonly /></div>
        <div class="fld full"><span>User ID</span><input value="${esc(u.id)}" readonly /></div>
      </div>
      <div class="note calm" style="margin-top:13px"><span class="ic">${I.info}</span><div>${esc(roleBlurb())}</div></div>
    </div></div>
    <div class="panel"><div class="panel-h"><h3>Screens you can open</h3><span class="sub">${num(allowed.length)}</span></div>
      <div class="panel-b tight"><div class="ranked">${allowed.map((a) => `<div class="r"><i class="sw" style="background:var(--brand-2)"></i><span class="nm">${esc(a)}</span><span></span><span></span></div>`).join('')}</div></div></div>
  </div>
  <div style="margin-top:14px"><button class="btn" data-menu="account">${I.user} Switch to another account</button></div>`;
  return pageShell(meta, body, { tools: false });
}

/* ---------- global search ---------- */
function pageSearch(meta) {
  const q = S.navQuery.trim().toLowerCase();
  if (!q) return pageShell(meta, `<div class="empty">${I.empty}<h3>Type to search</h3><p>Search properties, buyers, agents, vendors and transaction references.</p></div>`, { tools: false });
  const f = effFilters();
  const props = M.DATA.properties.filter((p) => M.propMatch(p, f) && (p.name + p.project + p.seller + p.id).toLowerCase().includes(q)).slice(0, 8);
  const ids = new Set(M.DATA.properties.filter((p) => M.propMatch(p, f)).map((p) => p.id));
  const sales = M.DATA.sales.filter((s) => ids.has(s.propertyId) && (s.buyer + s.property + s.agent + s.id).toLowerCase().includes(q)).slice(0, 8);
  const agents = denied('agents') ? [] : M.DATA.agents.filter((a) => (a.name + a.id).toLowerCase().includes(q)).slice(0, 6);
  const txns = denied('transactions') ? [] : M.DATA.payments.filter((p) => (p.party + p.ref + p.id + p.note).toLowerCase().includes(q)).slice(0, 8);
  const sec = (title, rows, go) => rows.length ? `<div class="panel" style="margin-bottom:14px"><div class="panel-h"><h3>${esc(title)}</h3><span class="sub">${num(rows.length)}</span><span class="spacer"></span><button class="link" data-go="${go}">Open section</button></div>
    <div class="panel-b tight"><div class="ranked">${rows.join('')}</div></div></div>` : '';
  const body = `<p class="muted" style="margin:-6px 0 14px">Results for “<b>${esc(S.navQuery)}</b>”.</p>`
    + sec('Properties', props.map((p) => `<button class="r" data-go="properties/inventory"><i class="sw" style="background:var(--s1)"></i><span class="nm">${esc(p.name)} · ${esc(p.project)}</span><span class="vv">${esc(money(p.totalCost))}</span><span class="pc">${esc(p.status)}</span></button>`), 'properties/inventory')
    + sec('Sales', sales.map((s) => `<button class="r" data-go="sales/register"><i class="sw" style="background:var(--s2)"></i><span class="nm">${esc(s.buyer)} · ${esc(s.property)}</span><span class="vv">${esc(money(s.sellingPrice))}</span><span class="pc">${esc(date(s.date))}</span></button>`), 'sales/register')
    + sec('Agents', agents.map((a) => `<button class="r" data-go="agents/directory"><i class="sw" style="background:var(--s3)"></i><span class="nm">${esc(a.name)}</span><span class="vv">${esc(a.office)}</span><span class="pc">${esc(a.id)}</span></button>`), 'agents/directory')
    + sec('Transactions', txns.map((t) => `<button class="r" data-go="admin/transactions"><i class="sw" style="background:var(--s4)"></i><span class="nm">${esc(t.party)} · ${esc(t.note)}</span><span class="vv">${esc(money(t.amount))}</span><span class="pc">${esc(t.ref)}</span></button>`), 'admin/transactions');
  return pageShell(meta, body || `<div class="empty">${I.empty}<h3>No matches</h3><p>Nothing found for “${esc(S.navQuery)}”.</p></div>`, { tools: false });
}

/* ------------------------------ forms ------------------------------ */
const FORMS = {
  property: {
    title: 'Add a property', sub: 'Records a purchase. Acquisition costs are added to the price to give total cost (§6).',
    fields: [
      { g: 'Property' },
      { k: 'name', l: 'Property name / title', req: true, ph: 'House A-126' },
      { k: 'type', l: 'Property type', type: 'select', opts: () => M.TYPES, req: true },
      { k: 'projectId', l: 'Project / society', type: 'select', opts: () => M.PROJECTS.map((p) => [p.id, p.name]), req: true },
      { k: 'size', l: 'Size', ph: '10 Marla', req: true },
      { k: 'block', l: 'Block', ph: 'Block C' },
      { k: 'unit', l: 'Plot / unit number', ph: '126' },
      { k: 'status', l: 'Current status', type: 'select', opts: () => M.STATUSES, def: 'Available', req: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { g: 'Purchase' },
      { k: 'seller', l: 'Seller / vendor', req: true, ph: 'Falcon Developers' },
      { k: 'purchaseDate', l: 'Purchase date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { k: 'price', l: 'Purchase price (PKR)', type: 'money', req: true, min: 1 },
      { k: 'registration', l: 'Registration / transfer', type: 'money' },
      { k: 'legal', l: 'Legal charges', type: 'money' },
      { k: 'development', l: 'Development charges', type: 'money' },
      { k: 'otherCost', l: 'Other purchase costs', type: 'money' },
      { g: 'Payment & valuation' },
      { k: 'paid', l: 'Amount paid to seller', type: 'money', hint: 'Cannot exceed total cost.' },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer' },
      { k: 'currentValue', l: 'Current market value', type: 'money', hint: 'Defaults to the purchase price.' },
    ],
    calc: (v) => {
      const total = n(v.price) + n(v.registration) + n(v.legal) + n(v.development) + n(v.otherCost);
      return [['Purchase price', n(v.price)], ['Acquisition costs', total - n(v.price)], ['Total property cost', total, true],
        ['Paid', n(v.paid)], ['Remaining to seller', Math.max(0, total - n(v.paid))]];
    },
    validate: (v) => {
      const e = {};
      const total = n(v.price) + n(v.registration) + n(v.legal) + n(v.development) + n(v.otherCost);
      if (n(v.paid) > total) e.paid = 'Paid cannot exceed the total cost of ' + money(total) + '.';
      return e;
    },
    submit: (v) => { const p = M.addProperty(v); return { id: p.id, msg: 'Property ' + p.id + ' added', go: 'properties/inventory' }; },
  },
  sale: {
    title: 'Record a sale', sub: 'Creates the sale, the agent commission entry and the receipt (§7, §10, §26).',
    fields: [
      { g: 'Sale' },
      { k: 'propertyId', l: 'Property', type: 'select', req: true, opts: () => M.DATA.properties.filter((p) => p.status !== 'Sold').map((p) => [p.id, p.name + ' · ' + p.project]) },
      { k: 'buyer', l: 'Buyer', req: true, ph: 'Kamran Aziz' },
      { k: 'agentId', l: 'Agent', type: 'select', req: true, opts: () => M.DATA.agents.map((a) => [a.id, a.name + ' (' + a.rate + '%)']) },
      { k: 'date', l: 'Sale date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { g: 'Money' },
      { k: 'sellingPrice', l: 'Selling price (PKR)', type: 'money', req: true, min: 1 },
      { k: 'received', l: 'Amount received', type: 'money', hint: 'Cannot exceed the selling price.' },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', req: true },
      { k: 'commissionPct', l: 'Commission %', type: 'number', hint: 'Blank uses the agent’s standard rate.' },
      { k: 'tax', l: 'Withholding tax', type: 'money', hint: 'Blank uses 1% of the selling price.' },
      { k: 'otherExpenses', l: 'Other selling expenses', type: 'money' },
    ],
    calc: (v) => {
      const p = M.DATA.properties.find((x) => x.id === v.propertyId);
      const price = n(v.sellingPrice);
      const ag = M.DATA.agents.find((a) => a.id === v.agentId);
      const rate = v.commissionPct === '' || v.commissionPct == null ? (ag ? ag.rate : 0) : n(v.commissionPct);
      const comm = Math.round((price * rate) / 100);
      const tax = v.tax === '' || v.tax == null ? Math.round(price * 0.01) : n(v.tax);
      const cost = p ? p.totalCost : 0;
      return [['Property cost', cost], ['Selling price', price], ['Gross profit', price - cost, false, true],
        ['Commission (' + rate + '%)', -comm], ['Withholding tax', -tax], ['Other selling costs', -n(v.otherExpenses)],
        ['Net profit on this sale', price - cost - comm - tax - n(v.otherExpenses), true]];
    },
    validate: (v) => {
      const e = {};
      if (n(v.received) > n(v.sellingPrice)) e.received = 'Received cannot exceed the selling price.';
      const p = M.DATA.properties.find((x) => x.id === v.propertyId);
      if (p && v.date && M.parseDate(v.date) < p.purchaseDate) e.date = 'Sale date is before the property was purchased (' + date(p.purchaseDate) + ').';
      if (v.commissionPct !== '' && (n(v.commissionPct) < 0 || n(v.commissionPct) > 20)) e.commissionPct = 'Commission must be between 0 and 20%.';
      return e;
    },
    submit: (v) => { const s = M.addSale(v); return { id: s.id, msg: 'Sale ' + s.id + ' recorded', go: 'sales/register' }; },
  },
  expense: {
    title: 'Add an expense', sub: 'Posts to the expense ledger and, if paid, to the cash ledger (§13).',
    fields: [
      { g: 'Expense' },
      { k: 'group', l: 'Category', type: 'select', req: true, opts: () => ['Office Expenses', 'Employee Expenses', 'Marketing Expenses', 'Property Expenses', 'Other Expenses'] },
      { k: 'category', l: 'Sub-category', req: true, ph: 'Electricity' },
      { k: 'vendor', l: 'Vendor', req: true, ph: 'City Traders' },
      { k: 'date', l: 'Date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { g: 'Amount' },
      { k: 'amount', l: 'Amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'paid', l: 'Amount paid', type: 'money', hint: 'Cannot exceed the amount.' },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer' },
      { k: 'note', l: 'Note', ph: 'Optional description', full: true },
    ],
    calc: (v) => [['Amount', n(v.amount)], ['Paid', n(v.paid)], ['Outstanding', Math.max(0, n(v.amount) - n(v.paid)), true]],
    validate: (v) => (n(v.paid) > n(v.amount) ? { paid: 'Paid cannot exceed the amount.' } : {}),
    submit: (v) => { const e = M.addExpense(v); return { id: e.id, msg: 'Expense ' + e.id + ' recorded', go: 'costs/expenses' }; },
  },
  payment: {
    title: 'Record a payment', sub: 'A single money-in or money-out entry on the cash ledger (§26, §27).',
    fields: [
      { g: 'Payment' },
      { k: 'dir', l: 'Direction', type: 'select', req: true, opts: () => [['in', 'Money in (received)'], ['out', 'Money out (paid)']], def: 'in' },
      { k: 'category', l: 'Category', type: 'select', req: true, opts: () => ['Property Sale', 'Customer Payment', 'Other Income', 'Investment', 'Property Purchase', 'Agent Commission', 'Employee Salaries', 'Office Expenses', 'Bills', 'Taxes', 'Zakat', 'Marketing Expenses', 'Other Expenses'] },
      { k: 'party', l: 'Customer / vendor', req: true, ph: 'Kamran Aziz' },
      { k: 'date', l: 'Date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { g: 'Amount' },
      { k: 'amount', l: 'Amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'method', l: 'Method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', req: true },
      { k: 'account', l: 'Bank / cash account', type: 'select', opts: () => M.ACCOUNTS, req: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { k: 'ref', l: 'Reference number', ph: 'Cheque or transfer reference' },
      { k: 'note', l: 'Description', ph: 'What this payment is for', full: true },
    ],
    calc: (v) => [[v.dir === 'out' ? 'Money out' : 'Money in', n(v.amount), true]],
    validate: () => ({}),
    submit: (v) => { const t = M.addPayment(v); return { id: t.id, msg: 'Transaction ' + t.id + ' posted', go: 'admin/transactions' }; },
  },
};
const n = (v) => (v === '' || v == null || isNaN(+v) ? 0 : +v);

function formDefaults(id) {
  const v = {};
  FORMS[id].fields.forEach((fd) => {
    if (fd.g) return;
    v[fd.k] = typeof fd.def === 'function' ? fd.def() : fd.def !== undefined ? fd.def
      : fd.type === 'select' ? String(optPairs(fd)[0][0]) : '';
  });
  return v;
}
const optPairs = (fd) => fd.opts().map((o) => (Array.isArray(o) ? o : [o, o]));

function renderModal() {
  if (!S.modal) return '';
  const { id, values, errors } = S.modal;
  const F = FORMS[id];
  let html = '', open = false;
  F.fields.forEach((fd) => {
    if (fd.g) {
      if (open) html += '</div></div>';
      html += `<div class="fieldset"><span class="kicker">${esc(fd.g)}</span><div class="formgrid">`;
      open = true; return;
    }
    const err = errors[fd.k];
    const val = values[fd.k] == null ? '' : values[fd.k];
    let ctl;
    if (fd.type === 'select') {
      ctl = `<select data-field="${esc(fd.k)}" ${err ? 'aria-invalid="true"' : ''}>${optPairs(fd).map(([v2, l]) => `<option value="${esc(v2)}" ${String(val) === String(v2) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    } else {
      const type = fd.type === 'date' ? 'date' : fd.type === 'money' || fd.type === 'number' ? 'number' : 'text';
      ctl = `<input type="${type}" data-field="${esc(fd.k)}" value="${esc(val)}" ${fd.ph ? `placeholder="${esc(fd.ph)}"` : ''} ${fd.maxToday ? `max="${dstr(M.TODAY)}"` : ''} ${fd.min != null ? `min="${fd.min}"` : fd.type === 'money' ? 'min="0"' : ''} ${fd.type === 'money' ? 'step="1000"' : fd.type === 'number' ? 'step="0.25"' : ''} ${err ? 'aria-invalid="true"' : ''} />`;
    }
    html += `<div class="fld ${fd.full ? 'full' : ''}"><label>${esc(fd.l)}${fd.req ? ' *' : ''}</label>${ctl}
      ${err ? `<span class="bad">${esc(err)}</span>` : fd.hint ? `<span class="hint">${esc(fd.hint)}</span>` : ''}</div>`;
  });
  if (open) html += '</div></div>';

  const calc = F.calc ? F.calc(values) : null;
  const calcHtml = calc ? `<div class="calcbox">${calc.map(([l, v, tot]) => `<div class="row ${tot ? 'tot' : ''}"><span>${esc(l)}</span><b>${esc(money(v))}</b></div>`).join('')}</div>` : '';

  return `<div class="overlay" data-act="closemodal"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(F.title)}" data-stop="1">
    <div class="modal-h"><div><h2>${esc(F.title)}</h2><p>${esc(F.sub)}</p></div><button class="x" data-act="closemodal" aria-label="Close">${I.x}</button></div>
    <div class="modal-b">${html}${calcHtml}
      ${errors._form ? `<div class="note bad" style="margin-top:12px"><span class="ic">${I.warn}</span><div>${esc(errors._form)}</div></div>` : ''}</div>
    <div class="modal-f"><span class="vs">Fields marked * are required.</span><span class="spacer"></span>
      <button class="btn" data-act="closemodal">Cancel</button>
      <button class="btn pri" data-act="save">${I.ok} Save</button></div>
  </div></div>`;
}
function submitModal() {
  const { id, values } = S.modal;
  const F = FORMS[id];
  const errors = {};
  F.fields.forEach((fd) => {
    if (fd.g) return;
    const v = values[fd.k];
    if (fd.req && (v === '' || v == null)) errors[fd.k] = 'Required.';
    else if (fd.min != null && v !== '' && n(v) < fd.min) errors[fd.k] = 'Must be at least ' + fd.min + '.';
    else if (fd.maxToday && v && M.parseDate(v) > M.TODAY) errors[fd.k] = 'Cannot be a future date (today is ' + date(M.TODAY) + ').';
  });
  Object.assign(errors, F.validate(values));
  if (Object.keys(errors).length) { S.modal.errors = errors; render(); return; }
  // One saved form can create several records — a sale also creates the agent
  // commission and the receipt. Snapshot every ledger so ALL of them get pinned to the
  // top of their table, not just the one the form is named after.
  const LEDGERS = ['properties', 'sales', 'commissions', 'expenses', 'payments', 'audit'];
  const before = {};
  LEDGERS.forEach((key) => { before[key] = M.DATA[key].length; });
  try {
    const res = F.submit(values);
    const created = LEDGERS.flatMap((key) => M.DATA[key].slice(before[key]).map((x) => x.id));
    S.fresh = created.concat([res.id], S.fresh).slice(0, 24);
    S.modal = null;
    goto(res.go);
    toast(res.msg);
  } catch (err) {
    S.modal.errors = { _form: String(err && err.message ? err.message : err) };
    render();
  }
}

/* ------------------------------ menus ------------------------------ */
function renderMenu() {
  if (!S.menu) return '';
  const { id, x, y } = S.menu;
  let inner = '';
  if (id === 'account') {
    inner = `<h5>Signed in as</h5>
      <button data-go="account"><span class="ic">${I.user}</span><span class="row2">${esc(S.user.name)}<small>${esc(S.user.title)} · ${esc(role())}</small></span></button>
      <div class="sep"></div><h5>Switch account</h5>
      ${M.USERS.map((u) => `<button data-act="signin" data-arg="${esc(u.id)}" class="${u.id === S.user.id ? 'on' : ''}">
        <span class="ic">${I.user}</span><span class="row2">${esc(u.name)}<small>${esc(u.role)}</small></span></button>`).join('')}
      <div class="sep"></div>
      <button data-go="admin/users"><span class="ic">${I.shield}</span>Users &amp; roles</button>`;
  } else if (id === 'new') {
    inner = `<h5>Add a record</h5>
      <button data-modal="property"><span class="ic">${I.grid}</span>Property purchase</button>
      <button data-modal="sale"><span class="ic">${I.tag}</span>Property sale</button>
      <button data-modal="expense" ${denied('expenses') ? 'disabled' : ''}><span class="ic">${I.wallet}</span>Expense</button>
      <button data-modal="payment" ${denied('transactions') ? 'disabled' : ''}><span class="ic">${I.receipt}</span>Payment</button>`;
  } else if (id === 'bell') {
    const al = M.alerts().filter((a) => !denied(a.view));
    inner = `<h5>Alerts</h5>${al.slice(0, 6).map((a) => `<button data-go="${esc(alertGo(a.view))}"><span class="ic">${a.sev === 'high' ? I.warn : I.info}</span><span class="row2">${esc(a.title)}<small>${esc(a.detail.slice(0, 58))}…</small></span></button>`).join('')}
      <div class="sep"></div><button data-go="dashboard/alerts"><span class="ic">${I.bell}</span>See all ${num(al.length)} alerts</button>`;
  } else if (id === 'filters') {
    const sel = (key, label, opts) => `<div class="fld" style="padding:4px 8px"><label>${esc(label)}</label>
      <select data-act="filter" data-arg="${key}"><option value="all">All</option>${opts.map(([v2, l]) => `<option value="${esc(v2)}" ${S.filters[key] === v2 ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    inner = `<h5>Filter records</h5>
      ${sel('project', 'Project / society', M.PROJECTS.map((p) => [p.id, p.name]))}
      ${sel('agent', 'Agent', M.DATA.agents.map((a) => [a.id, a.name]))}
      ${sel('office', 'Office / branch', M.OFFICES.map((o) => [o, o]))}
      ${sel('type', 'Property type', M.TYPES.map((t) => [t, t]))}
      ${sel('status', 'Property status', M.STATUSES.map((t) => [t, t]))}
      ${sel('payStatus', 'Payment status', M.PAY_STATUS.map((t) => [t, t]))}
      <div class="sep"></div><button data-act="clearfilters"><span class="ic">${I.x}</span>Clear all filters</button>`;
  } else if (id === 'numbers') {
    inner = `<h5>Number format</h5>
      ${[['cr', 'Crore / Lakh', 'PKR 13.5 Cr'], ['m', 'Million', 'PKR 135.1M'], ['full', 'Full digits', 'PKR 135,148,500']].map(([v2, l, ex]) =>
        `<button data-act="numbers" data-arg="${v2}" class="${S.numbers === v2 ? 'on' : ''}"><span class="row2">${esc(l)}<small>${esc(ex)}</small></span></button>`).join('')}`;
  } else if (id === 'burger') {
    inner = visibleSections().map((sc) => `<button data-go="${sc.id}/${visibleTabs(sc)[0].id}" class="${S.page === sc.id ? 'on' : ''}"><span class="ic">${I[sc.icon]}</span>${esc(sc.label)}</button>`).join('');
  } else {
    const sec = sectionOf(id);
    if (!sec) return '';
    const tabs = visibleTabs(sec);
    inner = `<h5>${esc(sec.label)}<span class="u"> ${esc(sec.u)}</span></h5>` + tabs.map((t) =>
      `<button data-go="${sec.id}/${t.id}" class="${S.page === sec.id && S.tab === t.id ? 'on' : ''}"><span class="ic">${I[sec.icon]}</span>${esc(t.label)}</button>`).join('')
      + (sec.id === 'properties' ? `<div class="sep"></div><button data-modal="property"><span class="ic">${I.plus}</span>Add property</button>`
        : sec.id === 'sales' ? `<div class="sep"></div><button data-modal="sale"><span class="ic">${I.plus}</span>Record sale</button>`
        : sec.id === 'costs' && !denied('expenses') ? `<div class="sep"></div><button data-modal="expense"><span class="ic">${I.plus}</span>Add expense</button>` : '');
  }
  return `<div class="scrim" data-act="closemenu"></div><div class="menu" style="left:${x}px;top:${y}px" data-stop="1">${inner}</div>`;
}

/* ------------------------------ shell render ------------------------------ */
function renderSide() {
  const secs = visibleSections();
  let out = `<div class="side-logo">${logoMark()}<span class="txt"><b>Meridian Estates</b><span>Real Estate MS</span></span></div><div class="side-nav">`;
  let group = null;
  secs.forEach((sec) => {
    if (sec.group !== group) { group = sec.group; out += `<h6>${esc(group)}</h6>`; }
    const tabs = visibleTabs(sec);
    out += `<button class="s-item ${S.page === sec.id ? 'on' : ''}" data-go="${sec.id}/${tabs[0].id}" data-flyout="${sec.id}">
      <span class="ic">${I[sec.icon]}</span><span class="lbl">${esc(sec.label)}</span>${tabs.length > 1 ? I.car : ''}</button>`;
  });
  out += `</div><div class="side-foot">
    <button class="usercard" data-menu="account">
      <span class="ini">${esc(S.user.initials)}</span>
      <span class="who"><b>${esc(S.user.name)}</b><span>${esc(role())}</span></span>${I.car}</button>
  </div>`;
  return out;
}
function renderTop() {
  const al = M.alerts().filter((x) => !denied(x.view)).length;
  const sec = sectionOf(S.page);
  const meta = PAGE_META[pageKey()] || { t: '' };
  const tab = sec ? sec.tabs.find((x) => x.id === S.tab) : null;
  const leaf = tab ? tab.label : meta.t;
  return `<button class="iconbtn burger" data-menu="burger" aria-label="Menu">${I.burger}</button>
    <div class="crumb">${sec && sec.label !== leaf ? esc(sec.label) + ' <span>/</span> ' : ''}<b>${esc(leaf)}</b></div>
    <span class="spacer"></span>
    <input class="navsearch" placeholder="Search properties, buyers, agents…" value="${esc(S.navQuery)}" data-act="navsearch" aria-label="Search everything" />
    <button class="iconbtn" data-menu="numbers" title="Number format" aria-label="Number format"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5.5 3v10M10.5 3v10M2.5 6h11M2.5 10h11"/></svg></button>
    <button class="iconbtn" data-menu="bell" title="Alerts" aria-label="Alerts">${I.bell}${al ? `<span class="dot">${al > 9 ? '9+' : al}</span>` : ''}</button>
    <button class="navnew" data-menu="new">${I.plus} New</button>`;
}
function renderTabs() {
  const sec = sectionOf(S.page);
  if (!sec) return `<button class="tab on">${esc((PAGE_META[pageKey()] || {}).t || '')}</button>`;
  return visibleTabs(sec).map((t) => `<button class="tab ${S.tab === t.id ? 'on' : ''}" data-go="${sec.id}/${t.id}">${esc(t.label)}</button>`).join('');
}
function render() {
  $('#side').innerHTML = renderSide();
  $('#topbar').innerHTML = renderTop();
  $('#tabs').innerHTML = renderTabs();
  $('#main').innerHTML = renderPage();
  $('#layer').innerHTML = renderMenu() + renderModal();
  const meta = PAGE_META[pageKey()] || { t: 'Dashboard' };
  document.title = meta.t + ' — Meridian Estates';
  if (S.modal) { const first = $('#layer .modal [data-field]'); if (first) first.focus(); }
}
function goto(path) {
  const [p, t] = String(path).split('/');
  const sec = sectionOf(p);
  if (sec && !visibleTabs(sec).length) { S.page = 'dashboard'; S.tab = 'overview'; }
  else {
    S.page = p;
    S.tab = t || (sec ? visibleTabs(sec)[0].id : null);
    if (sec) {
      const tab = sec.tabs.find((x) => x.id === S.tab);
      if (!tab || denied(tab.need)) S.tab = visibleTabs(sec)[0].id;
    }
  }
  S.query = ''; S.sort = null; S.showAll = false; S.menu = null;
  location.hash = sec ? S.page + '/' + S.tab : S.page;
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ------------------------------ export ------------------------------ */
function currentExport() {
  const r = rangeNow();
  const title = (PAGE_META[pageKey()] || { t: 'Report' }).t;
  const meta = [['Company', M.COMPANY], ['Report', title], ['Period', r.label], ['From', date(r.start)], ['To', date(r.end)],
    ['Generated', date(M.TODAY)], ['User', S.user.name], ['Role', role()]];
  const tbl = document.querySelector('#main table.tbl');
  let cols = [], rows = [];
  if (tbl) {
    cols = [...tbl.querySelectorAll('thead th')].map((th) => th.textContent.replace(/[↑↓]/g, '').trim());
    rows = [...tbl.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()));
  } else {
    const f = effFilters(), k = M.computeKPIs(r, f), cash = M.cashLedger(r, f), bv = basisView(k);
    cols = ['KPI', 'Amount'];
    rows = [['Total properties', num(k.counts.total)], ['Available', num(k.counts.available)], ['Reserved', num(k.counts.reserved)],
      ['Under process', num(k.counts.underProcess)], ['Sold', num(k.counts.sold)],
      ['Portfolio cost', money(k.portfolioCost)], ['Market value', money(k.portfolioValue)], ['Potential profit (unrealised)', money(k.potentialProfit)],
      ['Purchase cost', money(k.purchaseCost)], ['Selling revenue', money(k.salesRevenue)],
      ['Cost basis used', bv.costLabel], ['Gross profit', money(bv.gross)], ['Operating profit', money(bv.op)],
      ['Agent commission', money(k.commission)], ['Salaries', money(k.salaries)], ['Office expenses', money(k.officeExp)],
      ['Marketing', money(k.marketing)], ['Bills', money(k.bills)], ['Tax', money(k.tax)], ['Zakat', money(k.zakat)],
      ['Net profit', money(bv.net)], ['Opening cash', money(cash.opening)], ['Cash in', money(cash.cashIn)],
      ['Cash out', money(cash.cashOut)], ['Closing cash', money(cash.closing)],
      ['Receivables', money(k.receivable)], ['Payables', money(k.payable)]];
  }
  return { title, meta, cols, rows };
}
function download(name, mime, text) {
  const blob = new Blob(['﻿' + text], { type: mime });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
}
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function exportCsv() {
  const e = currentExport();
  download(slug(e.title) + '.csv', 'text/csv;charset=utf-8',
    e.meta.map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`).join('\r\n') + '\r\n\r\n' + M.csv(e.cols, e.rows));
  toast('CSV downloaded');
}
function exportXls() {
  const e = currentExport();
  download(slug(e.title) + '.xls', 'application/vnd.ms-excel',
    `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
     <table>${e.meta.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table><br/>
     <table border="1"><thead><tr>${e.cols.map((c) => `<th style="background:#F3ECDC;text-align:left">${esc(c)}</th>`).join('')}</tr></thead>
     <tbody>${e.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
  toast('Excel file downloaded');
}

/* ------------------------------ tooltip / toast ------------------------------ */
const tipEl = () => $('#tip');
function showTip(html, x, y) {
  const t = tipEl();
  t.innerHTML = html; t.classList.add('on');
  const b = t.getBoundingClientRect();
  t.style.left = clamp(x + 14, 8, innerWidth - b.width - 8) + 'px';
  t.style.top = clamp(y - b.height - 12, 8, innerHeight - b.height - 8) + 'px';
}
const hideTip = () => tipEl().classList.remove('on');
let toastT = null;
function toast(msg) {
  const t = $('#toast');
  t.innerHTML = I.ok + '<span>' + esc(msg) + '</span>';
  t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

/* ------------------------------ events ------------------------------ */
function openMenu(btn, id) {
  const r = btn.getBoundingClientRect();
  const w = id === 'filters' ? 262 : 240;
  const side = btn.closest('.side');
  const x = side ? r.right + 8 : r.left;                 // sidebar menus fly out sideways
  const y = side ? Math.min(r.top, innerHeight - 340) : r.bottom + 6;
  S.menu = { id, x: clamp(x, 8, innerWidth - w - 8), y: Math.max(8, y) };
  render();
}
document.addEventListener('click', (ev) => {
  const goEl = ev.target.closest('[data-go]');
  const menuEl = ev.target.closest('[data-menu]');
  const modalEl = ev.target.closest('[data-modal]');
  const actEl = ev.target.closest('[data-act]');

  if (menuEl) { ev.preventDefault(); const id = menuEl.getAttribute('data-menu'); S.menu && S.menu.id === id ? (S.menu = null, render()) : openMenu(menuEl, id); return; }
  // chevron on a sidebar section opens its sub-views without leaving the current page
  const fly = ev.target.closest('.car') && ev.target.closest('[data-flyout]');
  if (fly) { ev.preventDefault(); ev.stopPropagation(); const id = fly.getAttribute('data-flyout'); S.menu && S.menu.id === id ? (S.menu = null, render()) : openMenu(fly, id); return; }
  if (modalEl) { ev.preventDefault(); const id = modalEl.getAttribute('data-modal'); S.modal = { id, values: formDefaults(id), errors: {} }; S.menu = null; render(); return; }
  if (goEl) { ev.preventDefault(); goto(goEl.getAttribute('data-go')); return; }
  if (!actEl) return;
  const act = actEl.getAttribute('data-act'), arg = actEl.getAttribute('data-arg');
  // clicking inside a menu or modal body must not close it
  if ((act === 'closemenu' || act === 'closemodal') && ev.target.closest('[data-stop]') && ev.target !== actEl) return;
  switch (act) {
    case 'closemenu': S.menu = null; render(); break;
    case 'closemodal': S.modal = null; render(); break;
    case 'save': submitModal(); break;
    case 'signin': {
      const u = M.USERS.find((x) => x.id === arg);
      if (u) {
        S.user = u; effFilters._ids = null; S.menu = null; S.filters = { ...M.EMPTY_FILTERS };
        goto('dashboard/overview');
        toast('Signed in as ' + u.name + ' (' + u.role + ')');
      }
      break;
    }
    case 'numbers': S.numbers = arg; S.menu = null; render(); break;
    case 'basis': S.grossBasis = arg; render(); break;
    case 'period': S.period = arg; render(); break;
    case 'clearfilters': S.filters = { ...M.EMPTY_FILTERS }; S.menu = null; render(); break;
    case 'sort': S.sort = S.sort && S.sort.key === arg ? { key: arg, dir: S.sort.dir === 'asc' ? 'desc' : 'asc' } : { key: arg, dir: 'desc' }; render(); break;
    case 'showall': S.showAll = true; render(); break;
    case 'showless': S.showAll = false; render(); break;
    case 'csv': exportCsv(); break;
    case 'xls': exportXls(); break;
    case 'print': window.print(); break;
    case 'void': {
      const t = M.voidPayment(arg, S.user.name);
      render(); toast(t ? 'Transaction ' + arg + ' voided — the original record is kept' : 'Already voided');
      break;
    }
  }
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-act], [data-field]');
  if (!el) return;
  const fieldKey = el.getAttribute('data-field');
  if (fieldKey && S.modal) { S.modal.values[fieldKey] = el.value; delete S.modal.errors[fieldKey]; render(); return; }
  const act = el.getAttribute('data-act');
  if (act === 'range') { S.rangeKey = el.value; render(); }
  else if (act === 'filter') { S.filters[el.getAttribute('data-arg')] = el.value; render(); }
});
document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.matches('[data-act="query"]')) {
    S.query = el.value;
    const pos = el.selectionStart; render();
    const nx = document.querySelector('[data-act="query"]');
    if (nx) { nx.focus(); nx.setSelectionRange(pos, pos); }
  } else if (el.matches('[data-act="navsearch"]')) {
    S.navQuery = el.value;
    if (S.page !== 'search') { S.page = 'search'; S.tab = null; }
    const pos = el.selectionStart; render();
    const nx = document.querySelector('[data-act="navsearch"]');
    if (nx) { nx.focus(); nx.setSelectionRange(pos, pos); }
  }
});
document.addEventListener('mousemove', (ev) => {
  const el = ev.target.closest('[data-tip]');
  if (el) showTip(el.getAttribute('data-tip'), ev.clientX, ev.clientY); else hideTip();
});
addEventListener('scroll', hideTip, { passive: true });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (S.modal) { S.modal = null; render(); } else if (S.menu) { S.menu = null; render(); } hideTip(); }
  if (e.key === 'Enter' && S.modal && e.target.closest('.modal') && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); submitModal(); }
});

/* ------------------------------ boot ------------------------------ */
/* #properties/inventory — every screen is linkable, so a specific view can be sent. */
function fromHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!h) return false;
  const [p, t] = h.split('/');
  if (p === 'account' || p === 'search') { S.page = p; S.tab = null; S.query = ''; S.sort = null; S.showAll = false; return true; }
  const sec = sectionOf(p);
  if (!sec) return false;
  const vis = visibleTabs(sec);
  // B3 — a search typed on one page used to survive navigation and silently empty the
  // next page's table. Navigation resets the per-page controls, like goto() does.
  S.query = ''; S.sort = null; S.showAll = false; S.menu = null;
  if (!vis.length) { S.page = 'dashboard'; S.tab = 'overview'; return true; }
  S.page = p;
  const tab = sec.tabs.find((x) => x.id === t);
  S.tab = tab && !denied(tab.need) ? tab.id : vis[0].id;
  return true;
}
addEventListener('hashchange', () => { if (fromHash()) render(); });
if (!fromHash()) { S.page = 'dashboard'; S.tab = 'overview'; }
render();
