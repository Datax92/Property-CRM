'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KpiCard, PageShell, PeriodControl, Tag } from '../Shared';
import { ChartDonut, RankedList } from '../Charts';
import { PropArt, Icon } from '../Icons';
import { PAGE_META, SC } from '../../lib/constants';
import * as M from '../../lib/re-data';
import { HomePage } from './HomePage';
import { InvestmentKpis, InvestmentCharts } from '../Investments';
import { MonthlyReport } from '../MonthlyReport';

/* Sections of the dashboard the owner can show or hide; kept in this browser. Investments are
   under Finance → Investment tracking, so they start hidden here. */
const DASH_KEY = 'dashboard-sections-v1';
const DASH_SECTIONS: [string, string][] = [
  ['figures', 'Key figures'],
  ['money', 'Where the money went'],
  ['attention', 'Needs attention'],
  ['cash', 'Cash & bank'],
  ['report', 'Monthly comparison report'],
  ['investments', 'Investments'],
];
const DASH_DEFAULT: Record<string, boolean> = { figures: true, money: true, attention: true, cash: true, report: true, investments: false };
function loadDash(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(DASH_KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === 'object') return { ...DASH_DEFAULT, ...v };
  } catch {
    /* storage blocked or corrupt */
  }
  return { ...DASH_DEFAULT };
}

export function DashboardPage() {
  const [show, setShow] = useState<Record<string, boolean>>({ ...DASH_DEFAULT });
  const [picking, setPicking] = useState(false);
  useEffect(() => setShow(loadDash()), []);
  const toggleSection = (key: string) => {
    const next = { ...show, [key]: !show[key] };
    setShow(next);
    try {
      window.localStorage.setItem(DASH_KEY, JSON.stringify(next));
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
    };
    return map[v] || 'dashboard/alerts';
  };

  return (
    <div className="page">
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
          {role === 'CEO' && (
            <button type="button" className={`btn sm ${picking ? 'pri' : ''}`} onClick={() => setPicking(!picking)} aria-expanded={picking}>
              <Icon name="grid" size={12} /> {picking ? 'Done' : 'Customize'}
            </button>
          )}
        </div>
      </div>
      {role === 'CEO' && picking && (
        <div className="panel dash-pick" data-noprint="1">
          <div className="panel-b">
            <span className="kicker">Show on the dashboard</span>
            <div className="dash-pick-row">
              {DASH_SECTIONS.map(([key, label]) => (
                <label key={key} className={`dash-chip ${show[key] ? 'on' : ''}`}>
                  <input type="checkbox" checked={!!show[key]} onChange={() => toggleSection(key)} /> {label}
                </label>
              ))}
            </div>
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
          .map((p: any) => ({ ...p, up: p.currentValue - M.landedCost(p.id) }))
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
        const al = M.alerts().filter((a: any) => !denied(a.view));
        const rawExp = M.expenseBreakdown(k);
        const exp = rawExp.slice(0, 5).map((x: any, i: number) => ({ k: x[0], v: x[1], c: SC[i] }));
        const restTot = rawExp.slice(5).reduce((a: number, x: any) => a + x[1], 0);
        if (restTot > 0) exp.push({ k: 'Other categories', v: restTot, c: SC[5] });

        // What the business has money in and still holds, and what each bank and cash account holds.
        const inv = M.investments(f);

        return (
          <>
            {show.figures && (
            <div className="kpis">
              <KpiCard
                k="Selling revenue"
                v={k.salesRevenue}
                d={d('salesRevenue')}
                f={k.otherIncome > 0 ? `+ ${M.fmt(k.otherIncome, numbers)} other income` : undefined}
                go="sales/register"
              />
              <KpiCard
                k="Gross profit"
                v={bv.gross}
                tone={bv.gross >= 0 ? 'pos' : 'neg'}
                go="finance/pnl"
              />
              <KpiCard
                k="Net profit"
                v={bv.net}
                tone={bv.net >= 0 ? 'pos' : 'neg'}
                cls="lead"
                d={netDelta}
                go="finance/pnl"
              />
              {k.personal > 0 && (
                <KpiCard
                  k="Profit after personal spending"
                  v={bv.net - k.personal}
                  tone={bv.net - k.personal >= 0 ? 'pos' : 'neg'}
                  f={`net profit less ${M.fmt(k.personal, numbers)} personal`}
                  go="costs/expenses"
                />
              )}
              <KpiCard
                k="Cash in hand"
                v={cb.cash}
                tone={cb.cash < 0 ? 'neg' : ''}
                f={`${M.fmtNum(cb.accounts.filter((a: any) => a.kind === 'Cash').length)} cash ${cb.accounts.filter((a: any) => a.kind === 'Cash').length === 1 ? 'account' : 'accounts'} · ${M.fmtDate(r.end)}`}
                go="bank/accounts"
              />
              <KpiCard
                k="Cash in bank"
                v={cb.bank}
                tone={cb.bank < 0 ? 'neg' : ''}
                f={`${M.fmtNum(cb.accounts.filter((a: any) => a.kind === 'Bank').length)} bank ${cb.accounts.filter((a: any) => a.kind === 'Bank').length === 1 ? 'account' : 'accounts'} · ${M.fmtDate(r.end)}`}
                go="bank/accounts"
              />
              <KpiCard k="Receivables" v={k.receivable + k.incomeDue} f={k.incomeDue > 0 ? `incl. ${M.fmt(k.incomeDue, numbers)} income due` : 'owed to us'} go="sales/receivables" />
              <KpiCard k="Payables" v={k.payable} f="we owe" cls="warnbox" go="finance/payables" />
            </div>
            )}

            {(show.money || show.attention || show.cash) && (
            <div className={show.money && (show.attention || show.cash) ? 'grid c2u' : 'grid'} style={{ marginBottom: '14px' }}>
              {show.money && (
                <div className="panel">
                  <div className="panel-h">
                    <h3>Where the money went</h3>
                    <span className="sub">{M.fmt(k.totalExpenses, numbers)} total</span>
                  </div>
                  <div className="panel-b">
                    <div className="grid c2">
                      <ChartDonut items={exp} />
                      <div>
                        <RankedList
                          items={exp.map((x) => ({ ...x, go: costGo(x.k) }))}
                          total={k.totalExpenses}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(show.attention || show.cash) && (
              <div style={{ display: 'grid', gap: '14px', minWidth: 0, alignContent: 'start' }}>
                {show.attention && (
                <div className="panel">
                  <div className="panel-h">
                    <h3>Needs attention</h3>
                    <span className="sub">{M.fmtNum(al.length)} items</span>
                  </div>
                  <div className="panel-b tight">
                    {al.length ? (
                      <div className="alerts">
                        {al.slice(0, 4).map((a: any, idx: number) => (
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
                      <div className="empty" style={{ padding: '14px' }}>All clear — nothing needs attention.</div>
                    )}
                    {al.length > 4 && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="link"
                          onClick={() => goto('dashboard/alerts')}
                        >
                          All {M.fmtNum(al.length)} alerts
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                )}

                {show.cash && (
                <div className="panel">
                  <div className="panel-h">
                    <h3>Cash &amp; bank</h3>
                    <span className="sub">{M.fmtDate(r.end)}</span>
                    <span className="spacer" />
                    <button type="button" className="link" onClick={() => goto('bank/accounts')}>
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
                              {!of.length && (
                                <div className="r acct-sub muted">
                                  <span>{kind === 'Cash' ? 'No cash account yet' : 'No bank account yet'}</span>
                                  <span />
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                        <div className="r acct-total">
                          <span>Total</span>
                          <b className={cb.total < 0 ? 'neg' : 'pos'}>{M.fmt(cb.total, numbers)}</b>
                        </div>
                      </div>
                    ) : (
                      <div className="empty" style={{ padding: '16px' }}>
                        No money recorded in or out yet.
                      </div>
                    )}
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button type="button" className="btn sm" onClick={() => openModal('transfer')}>
                        <Icon name="swap" size={12} /> Transfer
                      </button>
                      <button type="button" className="btn sm" onClick={() => openModal('payment', { dir: 'in', category: 'Opening Balance' })}>
                        <Icon name="plus" size={12} /> Opening balance
                      </button>
                      <button type="button" className="btn sm" onClick={() => openModal('payment', { dir: 'in', category: 'Owner Capital' })}>
                        <Icon name="plus" size={12} /> Owner capital
                      </button>
                    </div>
                  </div>
                </div>
                )}
              </div>
              )}
            </div>
            )}

            {show.report && <MonthlyReport />}

            {show.investments && (
              <>
                <div className="sech">
                  <h2>Investments</h2>
                  <span className="sub">unsold plots and assets, at what went in against what each is worth today</span>
                  <span className="spacer" />
                  <button type="button" className="link" onClick={() => goto('finance/investments')}>
                    Investment tracking
                  </button>
                </div>
                <InvestmentKpis rows={inv} />
                <InvestmentCharts rows={inv} />
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}
