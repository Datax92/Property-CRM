'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KpiCard, PageShell, PeriodControl, Tag } from '../Shared';
import { ChartDonut, RankedList } from '../Charts';
import { PropArt, Icon } from '../Icons';
import { AppIcon } from '../AppIcons';
import { PAGE_META, SC } from '../../lib/constants';
import * as M from '../../lib/re-data';
import { HomePage } from './HomePage';
import { InvestmentKpis, InvestmentCharts, INVESTMENT_CHARTS, InvestmentChart } from '../Investments';
import { MonthlyReport, ReportParts } from '../MonthlyReport';
import { PrintNow } from '../PrintNow';
import { PrintSheet } from '../PrintSheet';

/* A figure on the dashboard: an icon, what it is, the amount, and a line under it. */
function Figure({ icon, k, v, f, tone, go, numbers }: { icon: string; k: string; v: number; f?: string; tone?: string; go?: string; numbers: any }) {
  const { goto } = useApp();
  const body = (
    <>
      <span className="dfig-ic">
        <AppIcon name={icon} size={30} />
      </span>
      <span className="dfig-t">
        <span className="k">{k}</span>
        <b className={`v ${tone || (v < 0 ? 'neg' : '')}`}>{M.fmt(v, numbers)}</b>
        {f && <span className="f">{f}</span>}
      </span>
    </>
  );
  return go ? (
    <button type="button" className="dfig" onClick={() => goto(go)}>
      {body}
    </button>
  ) : (
    <div className="dfig">{body}</div>
  );
}

/* What goes on the printed dashboard: the parts of its first page and the sections of More
   details on the second (none of them: one page). Remembered in this browser. */
const MORE_SECTIONS = [
  ['money', 'Where the money went'],
  ['attention', 'Needs attention'],
  ['cash', 'Cash & bank'],
  ['invKpis', 'Investment figures'],
  ...INVESTMENT_CHARTS,
] as const;
type MoreSection = (typeof MORE_SECTIONS)[number][0];
type PrintPick = ReportParts & { figures: boolean; more: MoreSection[] };
const PRINT_KEY = 'dashboard-print-v1';
const ALL_MORE = MORE_SECTIONS.map((x) => x[0]) as MoreSection[];
const PRINT_ALL: PrintPick = { figures: true, cards: true, charts: true, table: true, more: ALL_MORE };
const PRINT_PRESETS: [string, PrintPick][] = [
  ['Everything', PRINT_ALL],
  ['Dashboard only', { ...PRINT_ALL, more: [] }],
  ['Investments only', { figures: false, cards: false, charts: false, table: false, more: ['invKpis', 'portfolio', 'gains', 'vsworth', 'pnl'] }],
];
function loadPrintPick(): PrintPick {
  try {
    const v = JSON.parse(window.localStorage.getItem(PRINT_KEY) || 'null');
    if (v && typeof v === 'object') return { ...PRINT_ALL, ...v, more: Array.isArray(v.more) ? v.more.filter((x: any) => ALL_MORE.indexOf(x) >= 0) : ALL_MORE };
  } catch {
    /* storage blocked or corrupt */
  }
  return PRINT_ALL;
}

const costGo = (label: string) => {
  const map: Record<string, string> = {
    'Employee Salaries': 'costs/salaries',
    'Office Expenses': 'costs/expenses',
    'Agent Commission': 'agents/commissions',
    Marketing: 'costs/expenses',
    Bills: 'costs/bills',
    'Property Expenses': 'costs/expenses',
    'CGT & other tax': 'costs/tax',
    '§236K tax on purchase': 'costs/tax',
    '§236C tax on sale': 'costs/tax',
    'Transfer costs, stamp duty & CVT': 'trading/sheets',
    'Handling expenses on plots': 'trading/sheets',
    Zakat: 'costs/zakat',
    Charity: 'costs/charity',
    'Other selling costs': 'sales/register',
  };
  return map[label] || 'costs/expenses';
};

const alertGo = (v: string) => {
  const map: Record<string, string> = {
    receivables: 'sales/receivables',
    commissions: 'agents/commissions',
    tax: 'costs/tax',
    bills: 'costs/bills',
    salaries: 'costs/salaries',
    purchases: 'properties/purchases',
    inventory: 'properties/inventory',
    tasks: 'tasks/list',
  };
  return map[v] || 'dashboard/alerts';
};

/** The More details tab, on screen or as a printed page: each section can be left out. */
function MoreDetails({ k, al, cb, inv, r, show, forPrint = false }: { k: any; al: any[]; cb: any; inv: any[]; r: any; show: MoreSection[]; forPrint?: boolean }) {
  const { goto, openModal, numbers } = useApp();
  const on = (key: MoreSection) => show.indexOf(key) >= 0;
  const rawExp = M.expenseBreakdown(k);
  const exp = rawExp.slice(0, 5).map((x: any, i: number) => ({ k: x[0], v: x[1], c: SC[i] }));
  const restTot = rawExp.slice(5).reduce((a: number, x: any) => a + x[1], 0);
  if (restTot > 0) exp.push({ k: 'Other categories', v: restTot, c: SC[5] });

  const money = on('money') && (
    <div className="panel">
      <div className="panel-h">
        <h3>Where the money went</h3>
        <span className="sub">{M.fmt(k.totalExpenses, numbers)} total</span>
      </div>
      <div className="panel-b">
        {exp.length ? (
          <div className="grid c2 inv-donut">
            <ChartDonut items={exp} />
            <div>
              <RankedList items={exp.map((x) => ({ ...x, go: costGo(x.k) }))} total={k.totalExpenses} />
            </div>
          </div>
        ) : (
          <div className="empty" style={{ padding: '20px' }}>Nothing spent in this period.</div>
        )}
      </div>
    </div>
  );

  const attention = on('attention') && (
    <div className="panel">
      <div className="panel-h">
        <h3>Needs attention</h3>
        <span className="sub">{M.fmtNum(al.length)} items</span>
      </div>
      <div className="panel-b tight">
        {al.length ? (
          <div className="alerts">
            {al.slice(0, 4).map((a: any, idx: number) => (
              <button key={idx} type="button" className={`alert ${a.sev}`} onClick={() => goto(alertGo(a.view))}>
                <span className="ic">
                  <Icon name={a.sev === 'good' ? 'ok' : a.sev === 'high' ? 'warn' : 'info'} />
                </span>
                <span>
                  <span className="t">{a.title}</span>
                  <span className="d">{a.detail}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: '14px' }}>All clear — nothing needs attention.</div>
        )}
      </div>
    </div>
  );

  const cash = on('cash') && (
    <div className="panel">
      <div className="panel-h">
        <h3>Cash &amp; bank</h3>
        <span className="sub">{M.fmtDate(r.end)}</span>
        <span className="spacer" />
        <button type="button" className="link" data-noprint="1" onClick={() => goto('bank/accounts')}>
          Bank &amp; Cash
        </button>
      </div>
      <div className="panel-b tight">
        {cb.accounts.length ? (
          <div className="acctlist">
            {(['Cash', 'Bank'] as const).map((kind) => {
              const of = cb.accounts.filter((b: any) => b.kind === kind);
              const tot = kind === 'Cash' ? cb.cash : cb.bank;
              return (
                <React.Fragment key={kind}>
                  <div className="r acct-kind">
                    <span>{kind === 'Cash' ? 'Cash in hand' : 'Cash in bank'}</span>
                    <b className={tot < 0 ? 'neg' : 'pos'}>{M.fmt(tot, numbers)}</b>
                  </div>
                  {of.map((b: any) => (
                    <div key={b.account} className="r acct-sub">
                      <span>{b.account}</span>
                      <b className={b.balance < 0 ? 'neg' : ''}>{M.fmt(b.balance, numbers)}</b>
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
            <div className="r acct-total">
              <span>Total</span>
              <b className={cb.total < 0 ? 'neg' : 'pos'}>{M.fmt(cb.total, numbers)}</b>
            </div>
          </div>
        ) : (
          <div className="empty" style={{ padding: '16px' }}>No money recorded in or out yet.</div>
        )}
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }} data-noprint="1">
          <button type="button" className="btn sm" onClick={() => openModal('transfer')}>
            <Icon name="swap" size={12} /> Transfer
          </button>
          <button type="button" className="btn sm" onClick={() => openModal('payment', { dir: 'in', category: 'Opening Balance' })}>
            <Icon name="plus" size={12} /> Opening balance
          </button>
        </div>
      </div>
    </div>
  );

  const charts = INVESTMENT_CHARTS.map((x) => x[0]).filter((x) => on(x)) as InvestmentChart[];
  // On paper a chart keeps its height while the rest of the page is scaled to fit, so with the
  // money, attention and cash panels on the same page the charts are drawn wider and so lower.
  const dense = forPrint && !!(money || attention || cash);
  const side = attention || cash ? (
    <div className="dmore-side">
      {attention}
      {cash}
    </div>
  ) : null;
  const pairOnPaper =
    attention && cash ? (
      <div className="dmore-pair">
        {attention}
        {cash}
      </div>
    ) : (
      attention || cash || null
    );
  return (
    <div className={`dmore ${forPrint ? 'print' : ''} ${dense ? 'dense' : ''}`}>
      {/* On paper the three sit in one row, to leave room for the investments. */}
      {/* On paper the page keeps to one grid: the money panel takes half, attention and cash a
          quarter each, the same lines as the investment cards and charts below. */}
      {forPrint && (money || pairOnPaper) && (
        <div className={money && pairOnPaper ? 'grid eq dmore-top' : 'dmore-top-one'}>
          {money}
          {pairOnPaper}
        </div>
      )}
      {!forPrint && (money || side) && (
        <div className={money && side ? 'grid c2 eq' : ''} style={{ marginBottom: '14px' }}>
          {money}
          {side}
        </div>
      )}
      {(on('invKpis') || charts.length > 0) && (
        <>
          <div className="sech">
            <h2>Investments</h2>
            <span className="sub">unsold plots and assets, at what went in against what each is worth today</span>
            <span className="spacer" />
            <button type="button" className="link" data-noprint="1" onClick={() => goto('finance/investments')}>
              Investment tracking
            </button>
          </div>
          {on('invKpis') && <InvestmentKpis rows={inv} cash={cb.total} />}
          {charts.length > 0 && <InvestmentCharts rows={inv} show={charts} width={forPrint ? (dense ? 780 : 560) : undefined} cash={cb.total} />}
        </>
      )}
    </div>
  );
}

/** Ticks for what goes on the printed dashboard, with quick choices. */
function PrintPicker({ pick, setPick, onClose, moreOnly }: { pick: PrintPick; setPick: (p: PrintPick) => void; onClose: () => void; moreOnly: boolean }) {
  const tick = (label: string, checked: boolean, change: (on: boolean) => void) => (
    <label key={label} className="mr-row-pick">
      <input type="checkbox" checked={checked} onChange={(e) => change(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
  const parts: [keyof ReportParts | 'figures', string][] = [
    ['figures', 'Key figures'],
    ['cards', 'This month against last month'],
    ['charts', 'Charts'],
    ['table', 'Month-by-month table'],
  ];
  return (
    <div className="panel dprint-pick" data-noprint="1">
      <div className="panel-b">
        <div className="mr-rows-h">
          <b>What to print</b>
          <span className="muted">Untick anything not needed on paper. It stays on screen.</span>
          <span className="spacer" />
          {PRINT_PRESETS.filter(([name]) => !moreOnly || name !== 'Dashboard only').map(([name, p]) => (
            <button key={name} type="button" className="btn sm" onClick={() => setPick(p)}>
              {name}
            </button>
          ))}
          <button type="button" className="btn sm pri" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="dprint-cols">
          {!moreOnly && (
            <div>
              <span className="kicker">Page 1 — Dashboard</span>
              {parts.map(([key, label]) => tick(label, !!pick[key], (v) => setPick({ ...pick, [key]: v })))}
            </div>
          )}
          <div>
            <span className="kicker">{moreOnly ? 'More details' : 'Page 2 — More details'}</span>
            {MORE_SECTIONS.map(([key, label]) =>
              tick(label, pick.more.indexOf(key) >= 0, (v) => setPick({ ...pick, more: v ? ALL_MORE.filter((x) => x === key || pick.more.indexOf(x) >= 0) : pick.more.filter((x) => x !== key) }))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export function DashboardPage() {
  // Bumped by "Print dashboard": the monthly report prints with the key figures on top.
  const [printSignal, setPrintSignal] = useState(0);
  // Printing More details on its own, and what goes on the printed pages.
  const [printMore, setPrintMore] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pick, setPickState] = useState<PrintPick>(PRINT_ALL);
  useEffect(() => setPickState(loadPrintPick()), []);
  const setPick = (p: PrintPick) => {
    setPickState(p);
    try {
      window.localStorage.setItem(PRINT_KEY, JSON.stringify(p));
    } catch {
      /* not remembered */
    }
  };
  const {
    tab,
    user,
    role,
    effectiveFilters: f,
    range: r,
    grossBasis,
    denied,
    goto,
    openModal,
    numbers,
  } = useApp();

  const meta = PAGE_META[`dashboard/${tab}`] || { t: 'Dashboard' };

  if (tab === 'home') return <HomePage />;

  if (tab === 'alerts') {
    const al = M.alerts().filter((a: any) => !denied(a.view));

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} tools={false}>
        {al.length ? (
          <div className="alerts">
            {al.map((a: any, idx: number) => (
              <button
                key={idx}
                type="button"
                className={`alert ${a.sev}`}
                onClick={() => goto(alertGo(a.view))}
              >
                <span className="ic">
                  <Icon name={a.sev === 'good' ? 'ok' : a.sev === 'high' ? 'warn' : 'info'} />
                </span>
                <span>
                  <span className="t">{a.title}</span>
                  <span className="d">{a.detail}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Icon name="ok" />
            <h3>All clear</h3>
            <p>Nothing needs attention right now.</p>
          </div>
        )}
      </PageShell>
    );
  }

  // Dashboard Overview
  const cmp = M.compare(r, f);
  const k = cmp.cur;
  const d = cmp.d;

  const bv = M.basisView(k, grossBasis);
  const bvPrev = M.basisView(cmp.prev, grossBasis);
  // Cash in hand and cash in bank, each from its own accounts.
  const cb = M.cashAndBank(r.end, f);

  const roleBlurb = () => {
    switch (role) {
      case 'CEO':
        return 'Full access — every property, sale, cost, tax and profit figure.';
      case 'Accountant':
        return 'Purchases, sales, expenses, payments, tax and Zakat. Salaries are restricted.';
      case 'Manager':
        return 'Properties, sales, agents and commissions. Company financials are restricted.';
      case 'Agent':
        return 'Your assigned properties, your customers and your own commission only.';
      default:
        return '';
    }
  };

  return (
    <div className="page">
      {role !== 'CEO' && (
        <div className="rolestrip">
          <div className="ini">{user.initials}</div>
          <div>
            <div className="t">
              {user.name} — {user.title}
            </div>
            <div className="s">{roleBlurb()}</div>
          </div>
          <span className="spacer" />
          <div className="acts" data-noprint="1">
            <PeriodControl />
          </div>
        </div>
      )}

      {role === 'Agent' && (() => {
        const mySales = M.DATA.sales.filter((s: any) => s.agentId === user.agentId && M.inRange(s.date, r));
        const myComm = M.DATA.commissions.filter((c: any) => c.agentId === user.agentId);
        const earned = myComm.reduce((a: number, c: any) => a + c.amount, 0);
        const paid = myComm.reduce((a: number, c: any) => a + c.paid, 0);

        return (
          <>
            <div className="kpis">
              <KpiCard k="My sales in period" raw={M.fmtNum(mySales.length)} go="sales/register" />
              <KpiCard
                k="Sales value"
                v={mySales.reduce((a: number, s: any) => a + s.sellingPrice, 0)}
                go="sales/register"
              />
              <KpiCard k="Commission earned" v={earned} cls="lead" go="agents/commissions" />
              <KpiCard k="Commission paid" v={paid} tone="pos" go="agents/commissions" />
              <KpiCard
                k="Still owed to me"
                v={earned - paid}
                tone={earned - paid > 0 ? 'neg' : ''}
                cls="warnbox"
                go="agents/commissions"
              />
              <KpiCard
                k="My customers owe"
                v={mySales.reduce((a: number, s: any) => a + s.outstanding, 0)}
                go="sales/receivables"
              />
            </div>
            <div className="panel">
              <div className="panel-h">
                <h3>My recent sales</h3>
                <span className="spacer" />
                <button type="button" className="link" onClick={() => goto('sales/register')}>
                  All my sales
                </button>
              </div>
              <div className="tblwrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Buyer</th>
                      <th>Date</th>
                      <th className="r">Sale price</th>
                      <th className="r">Outstanding</th>
                      <th className="r">My commission</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mySales.slice(0, 8).map((s: any) => (
                      <tr key={s.id}>
                        <td className="strong">{s.property}</td>
                        <td>{s.buyer}</td>
                        <td className="mono">{M.fmtDate(s.date)}</td>
                        <td className="r mono">{M.fmt(s.sellingPrice, numbers)}</td>
                        <td className="r mono">{M.fmt(s.outstanding, numbers)}</td>
                        <td className="r mono">{M.fmt(s.commission, numbers)}</td>
                        <td>
                          <Tag text={s.payStatus} />
                        </td>
                      </tr>
                    ))}
                    {!mySales.length && (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty" style={{ border: 0, padding: '24px' }}>
                            No sales in this period.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="note calm" style={{ marginTop: '14px' }}>
              <span className="ic">
                <Icon name="info" />
              </span>
              <div>
                You are seeing only your own assigned properties, customers and commission. Company financials
                are not visible to the Agent role.
              </div>
            </div>
          </>
        );
      })()}

      {role === 'Accountant' && (() => {
        const bills = M.DATA.bills
          .filter((b: any) => b.status === 'Overdue' || b.status === 'Pending')
          .sort((a: any, b: any) => a.dueDate - b.dueDate)
          .slice(0, 6);

        return (
          <>
            <div className="kpis">
              <KpiCard k="Cash in hand" v={cb.cash} cls="lead" go="bank/accounts" />
              <KpiCard k="Cash in bank" v={cb.bank} go="bank/accounts" />
              <KpiCard k="Receivables" v={k.receivable} f="to collect" go="sales/receivables" />
              <KpiCard k="Payables" v={k.payable} f="to pay" cls="warnbox" go="finance/payables" />
              <KpiCard
                k="Bills outstanding"
                v={k.billsOut}
                f={`${M.fmtNum(k.billsOverdueCount)} overdue`}
                go="costs/bills"
              />
              <KpiCard k="Tax outstanding" v={k.taxOut} go="costs/tax" />
              <KpiCard k="Zakat remaining" v={k.zakatRemaining} go="costs/zakat" />
            </div>
            <div className="grid c2u">
              <div className="panel">
                <div className="panel-h">
                  <h3>Bills due and overdue</h3>
                  <span className="spacer" />
                  <button type="button" className="link" onClick={() => goto('costs/bills')}>
                    All bills
                  </button>
                </div>
                <div className="tblwrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Bill</th>
                        <th>Vendor</th>
                        <th>Due</th>
                        <th className="r">Outstanding</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((b: any) => (
                        <tr key={b.id}>
                          <td className="strong">{b.type}</td>
                          <td>{b.vendor}</td>
                          <td className="mono">{M.fmtDate(b.dueDate)}</td>
                          <td className="r mono">{M.fmt(b.outstanding, numbers)}</td>
                          <td>
                            <Tag text={b.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="panel">
                <div className="panel-h">
                  <h3>Quick entry</h3>
                </div>
                <div className="panel-b">
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <button type="button" className="btn pri" onClick={() => openModal('expense')}>
                      <Icon name="plus" /> Record an expense
                    </button>
                    <button type="button" className="btn" onClick={() => openModal('payment')}>
                      <Icon name="plus" /> Record a payment
                    </button>
                    <button type="button" className="btn" onClick={() => openModal('sale')}>
                      <Icon name="plus" /> Record a sale
                    </button>
                  </div>
                  <div className="note calm" style={{ marginTop: '12px' }}>
                    <span className="ic">
                      <Icon name="info" />
                    </span>
                    <div>
                      Anything entered here posts to the ledger immediately and appears in the reports and the
                      audit trail.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {role === 'Manager' && (() => {
        const agents = M.agentSummary(r, f).slice(0, 5);
        const inv = M.DATA.properties
          .filter((p: any) => M.propMatch(p, f) && p.status !== 'Sold')
          .map((p: any) => ({ ...p, up: M.plotWorth(p) - M.landedCost(p.id) }))
          .sort((a: any, b: any) => b.up - a.up)
          .slice(0, 4);

        return (
          <>
            <div className="kpis">
              <KpiCard
                k="Properties held"
                raw={M.fmtNum(k.counts.unsold)}
                f={`${M.fmtNum(k.counts.total)} in register`}
                go="properties/inventory"
              />
              <KpiCard k="Available" raw={M.fmtNum(k.counts.available)} go="properties/inventory" />
              <KpiCard k="Sold in period" raw={M.fmtNum(k.counts.soldInRange)} go="sales/register" />
              <KpiCard
                k="Selling revenue"
                v={k.salesRevenue}
                cls="lead"
                d={cmp.d('salesRevenue')}
                go="sales/register"
              />
              <KpiCard k="Agent commission" v={k.commission} go="agents/commissions" />
              <KpiCard k="Market value" v={k.portfolioValue} f="unsold stock" go="properties/inventory" />
            </div>
            <div className="grid c2u">
              <div className="panel">
                <div className="panel-h">
                  <h3>Top agents</h3>
                  <span className="sub">by sales value</span>
                  <span className="spacer" />
                  <button type="button" className="link" onClick={() => goto('agents/directory')}>
                    All agents
                  </button>
                </div>
                <div className="panel-b tight">
                  {agents.length ? (
                    <RankedList
                      items={agents.map((a: any, i: number) => ({
                        k: a.name,
                        v: a.salesValue,
                        c: SC[i % 6],
                        go: 'agents/directory',
                      }))}
                      total={agents.reduce((x: number, a: any) => x + a.salesValue, 0)}
                    />
                  ) : (
                    <div className="empty" style={{ padding: '20px' }}>
                      No agent activity in this period.
                    </div>
                  )}
                </div>
              </div>
              <div className="panel">
                <div className="panel-h">
                  <h3>Highest upside held</h3>
                </div>
                <div className="panel-b">
                  {inv.length ? (
                    <div className="pcard-grid">
                      {inv.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          className="pcard"
                          onClick={() => goto('properties/inventory')}
                        >
                          <PropArt p={p} />
                          <div className="meta">
                            <div className="t">{p.name}</div>
                            <div className="s">{p.project}</div>
                            <div className="b">
                              <span className="v pos">{M.fmt(p.up, numbers)}</span>
                              <span className="s">upside</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty" style={{ padding: '20px' }}>
                      No unsold properties.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {role === 'CEO' && (() => {
        const netDelta = M.deltaPct(bv.net, bvPrev.net);
        // Two margins, each named for what it is: the business's (net profit, after company expenses,
        // as a share of revenue) and the deals' own (net margin on the cost sheets of the plots sold).
        const perf = M.propertyPerf(r, f);
        const dealSale = perf.reduce((a: number, x: any) => a + (x.grossSalePrice || 0), 0);
        const dealNet = perf.reduce((a: number, x: any) => a + (x.netMargin || 0), 0);
        const dealPct = dealSale > 0 ? M.pctOf(dealNet, dealSale) : null;
        const netPctText = k.totalRevenue > 0 ? `${bv.netMargin.toFixed(1)}% net margin (net profit ÷ revenue)` : 'no revenue in this period';
        const netPctWhy =
          k.totalRevenue > 0
            ? `Net margin ${bv.netMargin.toFixed(1)}% = net profit ${M.fmt(bv.net, 'full')} ÷ revenue ${M.fmt(k.totalRevenue, 'full')}, for ${r.label}. ` +
              `Net profit is after the cost of the plots sold, selling costs, company expenses (salaries, office, bills), tax, Zakat and charity.` +
              (dealPct != null ? ` The plots sold earned ${dealPct.toFixed(1)}% on their own cost sheets, before company expenses.` : '')
            : 'Nothing was sold and no income was earned in this period, so there is no margin to work out.';
        const al = M.alerts().filter((a: any) => !denied(a.view));

        // What the business has money in and still holds, and what each bank and cash account holds.
        const inv = M.investments(f);
        const page1 = pick.figures || pick.cards || pick.charts || pick.table;
        // The key figures on the printed dashboard, in the order of the month's cards; the last four
        // are not among those cards.
        const figures: [string, number, string][] = [
          ['Net worth', M.netWorthAt(r.end, f), 'inventory + assets + bank & cash'],
          ['Net profit', bv.net, k.totalRevenue > 0 ? `${bv.netMargin.toFixed(1)}% net margin (÷ revenue)` : ''],
          ['Gross profit', bv.gross, ''],
          ['Revenue', k.totalRevenue, `${M.fmtNum(k.counts.soldInRange)} plots sold`],
          ...(k.personal > 0 ? [['After personal spending', bv.net - k.personal, `${M.fmt(k.personal, 'full')} personal`] as [string, number, string]] : []),
          ['Cash in hand', cb.cash, 'in cash'],
          ['Cash in bank', cb.bank, 'in the bank'],
          ['Receivables', k.receivable + k.incomeDue, 'owed to us'],
          ['Payables', k.payable, 'we owe'],
        ];
        const onlyInvestments = pick.more.every((x) => ['invKpis', 'portfolio', 'gains', 'vsworth', 'pnl'].indexOf(x) >= 0);
        const morePage = (pageNo?: string) => (
          <PrintSheet
            kicker={onlyInvestments ? 'INVESTMENT PORTFOLIO' : 'BUSINESS DASHBOARD · MORE DETAILS'}
            title={onlyInvestments ? 'Investments' : 'More details'}
            sub={`${r.label} · ${M.fmtDate(r.start)} – ${M.fmtDate(r.end)}`}
            pageNo={pageNo}
          >
            <MoreDetails k={k} al={al} cb={cb} inv={inv} r={r} show={pick.more} forPrint />
          </PrintSheet>
        );

        return (
          <>
            <div className="dhero">
              <div className="dhero-t">
                <span className="kicker">{greeting()}, {user.name.split(' ')[0]}</span>
                <h1>{tab === 'more' ? 'More details' : 'Business dashboard'}</h1>
                <p>
                  {r.label} · {M.fmtDate(r.start)} – {M.fmtDate(r.end)}
                </p>
              </div>
              <span className="spacer" />
              <div className="dhero-acts" data-noprint="1">
                <PeriodControl />
                <button type="button" className={`btn dhero-pick ${picking ? 'on' : ''}`} onClick={() => setPicking(!picking)} title="Choose what goes on paper">
                  <Icon name="edit" size={14} /> What to print
                </button>
                {tab !== 'more' ? (
                  <button
                    type="button"
                    className="btn dhero-print"
                    // With nothing ticked for the dashboard's own page, only More details is printed.
                    onClick={() => (page1 ? setPrintSignal((n) => n + 1) : setPrintMore(true))}
                    disabled={!page1 && !pick.more.length}
                  >
                    <Icon name="print" size={14} /> Print dashboard
                  </button>
                ) : (
                  <button type="button" className="btn dhero-print" onClick={() => setPrintMore(true)} disabled={!pick.more.length}>
                    <Icon name="print" size={14} /> Print more details
                  </button>
                )}
              </div>
            </div>
            {picking && <PrintPicker pick={pick} setPick={setPick} onClose={() => setPicking(false)} moreOnly={tab === 'more'} />}

            {tab !== 'more' ? (
              <>
                <div className="dtop">
                  <button type="button" className={`dbig ${bv.net < 0 ? 'loss' : ''}`} onClick={() => goto('finance/pnl')}>
                    <span className="k">Net profit</span>
                    <b className="v">{M.fmt(bv.net, numbers)}</b>
                    <span className="f" title={netPctWhy}>
                      <span>{netPctText}</span>
                      {netDelta != null && isFinite(netDelta) && (
                        <em className={netDelta >= 0 ? 'up' : 'down'}>
                          {netDelta >= 0 ? '▲' : '▼'} {Math.abs(netDelta).toFixed(0)}% vs previous period
                        </em>
                      )}
                    </span>
                    <span className="dbig-rows">
                      <span>
                        Revenue <b>{M.fmt(k.totalRevenue, numbers)}</b>
                      </span>
                      <span>
                        Gross profit <b>{M.fmt(bv.gross, numbers)}</b>
                      </span>
                      {dealPct != null && (
                        <span title="Net margin on the cost sheets of the plots sold in this period, as a share of their sale price — before company expenses">
                          Deals&apos; margin (cost sheets) <b>{dealPct.toFixed(1)}%</b>
                        </span>
                      )}
                      {k.personal > 0 && (
                        <span>
                          After personal spending <b>{M.fmt(bv.net - k.personal, numbers)}</b>
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="dfigs">
                    <Figure icon="sales" k="Selling revenue" v={k.salesRevenue} f={k.otherIncome > 0 ? `+ ${M.fmt(k.otherIncome, numbers)} other income` : `${M.fmtNum(k.counts.soldInRange)} sold`} go="sales/register" numbers={numbers} />
                    <Figure icon="gross" k="Gross profit" v={bv.gross} tone={bv.gross >= 0 ? 'pos' : 'neg'} f={isFinite(bv.grossMargin) ? `${bv.grossMargin.toFixed(1)}% margin` : undefined} go="finance/pnl" numbers={numbers} />
                    <Figure icon="cash" k="Cash in hand" v={cb.cash} f={`${M.fmtNum(cb.accounts.filter((a: any) => a.kind === 'Cash').length)} cash account(s)`} go="bank/accounts" numbers={numbers} />
                    <Figure icon="bank" k="Cash in bank" v={cb.bank} f={`${M.fmtNum(cb.accounts.filter((a: any) => a.kind === 'Bank').length)} bank account(s)`} go="bank/accounts" numbers={numbers} />
                    <Figure icon="receivables" k="Receivables" v={k.receivable + k.incomeDue} f="owed to us" go="sales/receivables" numbers={numbers} />
                    <Figure icon="finance" k="Payables" v={k.payable} f="we owe" go="finance/payables" numbers={numbers} />
                  </div>
                </div>

                {al.length > 0 && (
                  <button type="button" className="dalert" onClick={() => goto('dashboard/alerts')}>
                    <Icon name="warn" /> <b>{M.fmtNum(al.length)} {al.length === 1 ? 'item needs' : 'items need'} attention</b> — {al[0].title}: {al[0].detail}
                    <span className="spacer" /> See all →
                  </button>
                )}

                <MonthlyReport
                  printSignal={printSignal}
                  printTitle="BUSINESS DASHBOARD"
                  printParts={pick}
                  printAfter={pick.more.length ? morePage('Page 2 of 2') : undefined}
                  printTop={
                    pick.figures && !pick.cards && (
                      <div className="dp-figs">
                        {figures.map(([label, v, sub]: any, idx: number) => (
                          <div key={label} className={`dp-fig ${idx === 0 ? 'lead' : ''}`}>
                            <span>{label}</span>
                            <b className={v < 0 ? 'neg' : ''}>{M.fmt(v, 'full')}</b>
                            {sub && <i>{sub}</i>}
                          </div>
                        ))}
                        <div className="dp-period">
                          {r.label} · {M.fmtDate(r.start)} – {M.fmtDate(r.end)}
                        </div>
                      </div>
                    )
                  }
                  // Beside the month's cards, only the figures they do not already show.
                  printFigures={
                    pick.figures &&
                    pick.cards &&
                    figures.slice(-4).map(([label, v, sub]: any) => (
                      <div key={label} className="kpi mr-card dp-card">
                        <span className="k">{label}</span>
                        <span className={`v ${v < 0 ? 'neg' : ''}`}>{M.fmt(v, numbers)}</span>
                        <span className="f">{sub}</span>
                      </div>
                    ))
                  }
                />
              </>
            ) : (
              <MoreDetails k={k} al={al} cb={cb} inv={inv} r={r} show={ALL_MORE} />
            )}
            {printMore && (
              <PrintNow onDone={() => setPrintMore(false)} page="A4 landscape" margin="0">
                <div className="mr-print">{morePage()}</div>
              </PrintNow>
            )}
          </>
        );
      })()}
    </div>
  );
}
