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

export function InvestmentKpis({ rows }: { rows: any[] }) {
  const invested = rows.reduce((a, x) => a + x.invested, 0);
  const worth = rows.reduce((a, x) => a + x.worth, 0);
  const gain = worth - invested;
  return (
    <div className="kpis">
      <KpiCard k="Total invested" v={invested} f={`${M.fmtNum(rows.length)} ${rows.length === 1 ? 'holding' : 'holdings'}`} go="finance/investments" />
      <KpiCard k="Worth today" v={worth} cls="lead" go="finance/investments" />
      <KpiCard
        k={gain >= 0 ? 'Unrealised profit' : 'Unrealised loss'}
        v={gain}
        tone={gain >= 0 ? 'pos' : 'neg'}
        f={`${gain >= 0 ? '+' : ''}${M.pctOf(gain, invested).toFixed(2)}% on what went in`}
        go="finance/investments"
      />
      <KpiCard
        k="Gaining / losing"
        raw={`${M.fmtNum(rows.filter((x) => x.gain > 0).length)} / ${M.fmtNum(rows.filter((x) => x.gain < 0).length)}`}
        f="holdings up / down in value"
        go="finance/investments"
      />
    </div>
  );
}

/** The investment graphs: each holding, invested against worth by kind, gain or loss by kind,
    and where the gains are. */
export function InvestmentCharts({ rows }: { rows: any[] }) {
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

  return (
    <>
      <div className="grid c2u">
        <div className="panel">
          <div className="panel-h">
            <h3>My portfolio</h3>
            <span className="sub">what went into each holding</span>
          </div>
          <div className="panel-b">
            <ChartBars
              label="Amount invested in each holding"
              legend={kinds}
              rows={rows.map((x) => ({
                label: x.name,
                v: x.invested,
                c: kindColour(x.type),
                full: `${x.name} · ${x.type}`,
                sub: `Worth today ${M.fmt(x.worth, numbers)} · ${x.gain >= 0 ? '+' : ''}${x.gainPct.toFixed(2)}%`,
              }))}
            />
          </div>
        </div>
        <div className="panel">
          <div className="panel-h">
            <h3>Where the gains are</h3>
            <span className="sub">unrealised profit by holding</span>
          </div>
          <div className="panel-b">
            {donut.length ? (
              <div className="grid c2">
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
      </div>
      <div className="grid c2" style={{ marginTop: '16px' }}>
        <div className="panel">
          <div className="panel-h">
            <h3>Invested vs worth today</h3>
            <span className="sub">by kind of investment</span>
          </div>
          <div className="panel-b">
            <ChartBarGroups
              label="Amount invested and worth today, by kind of investment"
              rows={byType.map((t: any) => ({ label: t.type, invested: t.invested, worth: t.worth }))}
              series={[
                { key: 'invested', label: 'Invested', c: 'var(--o4)' },
                { key: 'worth', label: 'Worth today', c: 'var(--o1)' },
              ]}
            />
          </div>
        </div>
        <div className="panel">
          <div className="panel-h">
            <h3>Profit &amp; loss</h3>
            <span className="sub">by kind of investment, not yet booked</span>
          </div>
          <div className="panel-b">
            <ChartBars
              label="Unrealised profit or loss by kind of investment"
              signed
              rows={byType.map((t: any) => ({
                label: t.type,
                v: t.gain,
                sub: `${t.gain >= 0 ? '+' : ''}${t.gainPct.toFixed(2)}% · ${M.fmtNum(t.count)} ${t.count === 1 ? 'holding' : 'holdings'}`,
              }))}
            />
          </div>
        </div>
      </div>
    </>
  );
}
