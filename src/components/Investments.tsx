'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import { KpiCard } from './Shared';
import { ChartBars, ChartBarGroups, ChartDonut, RankedList } from './Charts';
import { SC } from '../lib/constants';
import * as M from '../lib/re-data';

/* Investment tracking: what the business has money in and still holds — unsold plots and assets
   such as gold, shares and deposits — against what each is worth today. The dashboard and the
   investment tracking page both draw from here, so they never disagree. */

/** Bank and cash, beside the holdings on My portfolio. */
const CASH_COLOUR = 'var(--brand)';
/** Each kind of investment keeps one colour everywhere, in the order of the kinds. */
export const kindColour = (type: string) => SC[Math.max(0, M.INVESTMENT_TYPES.indexOf(type)) % SC.length];

/** A gain or loss as a percentage, in a green or red pill. */
export function GainPill({ pct }: { pct: number }) {
  const cls = !isFinite(pct) || Math.abs(pct) < 0.005 ? 'flat' : pct > 0 ? 'up' : 'down';
  return <span className={`gainpill ${cls}`}>{isFinite(pct) ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}</span>;
}

export function Kind({ type }: { type: string }) {
  return (
    <span className="kind">
      <i style={{ background: kindColour(type) }} />
      {type}
    </span>
  );
}

/** A gain as a percentage of what went in, with its sign. */
const signedPct = (n: number) => (isFinite(n) ? `${n > 0 ? '+' : ''}${n.toFixed(2)}%` : '');

/** Given `cash`, worth today is the holdings and the bank and cash together, as My portfolio
    draws them; the gain is still on the holdings alone. */
export function InvestmentKpis({ rows, cash }: { rows: any[]; cash?: number }) {
  const { range: r, effectiveFilters: f, numbers } = useApp();
  const invested = rows.reduce((a, x) => a + x.invested, 0);
  const worth = rows.reduce((a, x) => a + x.worth, 0);
  const gain = worth - invested;
  // How much the net worth (inventory, assets, bank and cash) grew over the period picked.
  const nw = M.netWorthGrowth(r, f);
  return (
    <div className="kpis">
      <KpiCard k="Total invested" v={invested} f={`${M.fmtNum(rows.length)} ${rows.length === 1 ? 'holding' : 'holdings'}`} go="finance/investments" />
      <KpiCard
        k="Worth today"
        v={worth + (cash || 0)}
        cls="lead"
        f={cash != null ? `holdings ${M.fmt(worth, numbers)} + bank & cash ${M.fmt(cash, numbers)}` : undefined}
        go="finance/investments"
      />
      <KpiCard
        k={gain >= 0 ? 'Unrealised profit' : 'Unrealised loss'}
        v={gain}
        tone={gain >= 0 ? 'pos' : 'neg'}
        f={`${gain >= 0 ? '+' : ''}${M.pctOf(gain, invested).toFixed(2)}% on what went in`}
        go="finance/investments"
      />
      <KpiCard
        k="Net worth increase"
        raw={signedPct(nw.pct) || '—'}
        tone={nw.growth > 0 ? 'pos' : nw.growth < 0 ? 'neg' : ''}
        f={
          isFinite(nw.pct)
            ? `${nw.growth >= 0 ? '+' : '−'}${M.fmt(Math.abs(nw.growth), numbers)} in ${r.label}, owner capital left out`
            : 'no net worth at the start of the period to compare with'
        }
        go="dashboard/overview"
      />
    </div>
  );
}

/** The investment graphs, each of which can be left out (e.g. of a print). */
export const INVESTMENT_CHARTS = [
  ['portfolio', 'My portfolio'],
  ['gains', 'Where the gains are'],
  ['vsworth', 'Invested vs worth today'],
  ['pnl', 'Profit & loss by kind'],
] as const;
export type InvestmentChart = (typeof INVESTMENT_CHARTS)[number][0];

/** The investment graphs: each holding, invested against worth by kind, gain or loss by kind,
    and where the gains are. Panels side by side are the same height, their charts on one line.
    Given `cash`, My portfolio has one more bar: what is in the bank and in hand. */
export function InvestmentCharts({ rows, show, width, cash }: { rows: any[]; show?: InvestmentChart[]; width?: number; cash?: number }) {
  const on = (key: InvestmentChart) => !show || show.indexOf(key) >= 0;
  const { numbers } = useApp();
  const byType = M.investmentsByType(rows);
  const kinds = byType.map((t: any) => ({ k: t.type, c: kindColour(t.type) }));

  // Gains by holding: the five largest by name, the rest together. Colours follow the holdings,
  // listed by name, not their rank.
  const gainers = rows.filter((x) => x.gain > 0).sort((a, b) => b.gain - a.gain);
  const top = gainers.slice(0, 5).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const rest = gainers.slice(5).reduce((a, x) => a + x.gain, 0);
  const donut = top.map((x, i) => ({ k: x.name, v: x.gain, c: SC[i] }));
  if (rest > 0) donut.push({ k: 'Other holdings', v: rest, c: '#9CA3AF' });

  if (!rows.length) {
    return (
      <div className="empty">
        <h3>Nothing invested yet</h3>
        <p>Unsold plots and assets (gold, shares, savings) show here with what each is worth today.</p>
      </div>
    );
  }

  const portfolio = on('portfolio') && (
        <div className="panel">
          <div className="panel-h">
            <h3>My portfolio</h3>
            <span className="sub">{cash != null ? 'what went into each holding, and bank & cash' : 'what went into each holding'}</span>
          </div>
          <div className="panel-b">
            <ChartBars
              label={cash != null ? 'Amount invested in each holding, and bank and cash' : 'Amount invested in each holding'}
              width={width}
              low={!!width}
              legend={width ? undefined : cash != null ? [...kinds, { k: 'Bank & cash', c: CASH_COLOUR }] : kinds}
              rows={rows
                .map((x) => ({
                  label: x.name,
                  v: x.invested,
                  c: kindColour(x.type),
                  full: `${x.name} · ${x.type}`,
                  sub: `Worth today ${M.fmt(x.worth, numbers)} · ${signedPct(x.gainPct)}`,
                }))
                .concat(cash != null ? [{ label: 'Bank & cash', v: cash, c: CASH_COLOUR, full: 'Bank & cash', sub: 'in every bank and cash account' }] : [])}
            />
          </div>
        </div>
  );
  const gains = on('gains') && (
        <div className="panel">
          <div className="panel-h">
            <h3>Where the gains are</h3>
            <span className="sub">unrealised profit by holding</span>
          </div>
          <div className="panel-b">
            {donut.length ? (
              <div className="grid c2 inv-donut">
                <ChartDonut items={donut} />
                <RankedList items={donut} />
              </div>
            ) : (
              <div className="empty" style={{ padding: '20px' }}>
                No holding is worth more than it cost yet.
              </div>
            )}
          </div>
        </div>
  );
  const vsworth = on('vsworth') && (
        <div className="panel">
          <div className="panel-h">
            <h3>Invested vs worth today</h3>
            <span className="sub">by kind of investment</span>
          </div>
          <div className="panel-b">
            <ChartBarGroups
              label="Amount invested and worth today, by kind of investment"
              width={width}
              low={!!width}
              values
              rows={byType.map((t: any) => ({ label: t.type, invested: t.invested, worth: t.worth }))}
              series={[
                // Two colours that cannot be mistaken for each other, on screen or on paper.
                { key: 'invested', label: 'Invested', c: 'var(--brand)' },
                { key: 'worth', label: 'Worth today', c: 'var(--s4)', hollow: true },
              ]}
            />
          </div>
        </div>
  );
  const pnl = on('pnl') && (
        <div className="panel">
          <div className="panel-h">
            <h3>Profit &amp; loss</h3>
            <span className="sub">by kind of investment, not yet booked · % on what went in</span>
          </div>
          <div className="panel-b">
            <ChartBars
              label="Unrealised profit or loss by kind of investment"
              signed
              width={width}
              low={!!width}
              legend={
                width
                  ? undefined
                  : [
                      { k: 'Profit', c: 'var(--good)' },
                      { k: 'Loss', c: 'var(--bad)' },
                    ]
              }
              rows={byType.map((t: any) => ({
                label: t.type,
                v: t.gain,
                tag: signedPct(t.gainPct),
                sub: `${signedPct(t.gainPct)} · ${M.fmtNum(t.count)} ${t.count === 1 ? 'holding' : 'holdings'}`,
              }))}
            />
          </div>
        </div>
  );

  // Both rows split in half, so the panels above and below line up. A panel left out lets the one
  // beside it take the whole row.
  const pair = (a: React.ReactNode, b: React.ReactNode, cls: string) =>
    a && b ? (
      <div className={`grid ${cls} eq`}>
        {a}
        {b}
      </div>
    ) : (
      a || b || null
    );
  return (
    <div className="inv-charts">
      {pair(portfolio, gains, 'c2')}
      {pair(vsworth, pnl, 'c2')}
    </div>
  );
}
