'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { KpiCard, PageShell, PeriodControl, Tag } from '../Shared';
import { ChartGroupedBars, ChartDonut, ShareBar, RankedList } from '../Charts';
import { PropArt, Icon } from '../Icons';
import { PAGE_META, SC, OC } from '../../lib/constants';
import * as M from '../../lib/re-data';

export function DashboardPage() {
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

  const basisView = (targetK: any) => {
    if (targetK.scoped) {
      return {
        cost: targetK.costOfSales,
        gross: targetK.grossProfit,
        op: targetK.operatingProfit,
        net: targetK.netProfit,
        costLabel: 'cost of the units sold',
        doc: false,
      };
    }
    const isCogs = grossBasis === 'cogs';
    const cost = isCogs ? targetK.costOfSales : targetK.purchaseCost;
    const gross = targetK.salesRevenue - cost;
    const op = gross - targetK.operatingCosts;
    return {
      cost,
      gross,
      op,
      net: op - targetK.tax - targetK.zakat,
      costLabel: isCogs ? 'cost of the units sold' : 'period purchase spend',
      doc: !isCogs,
    };
  };

  const bv = basisView(k);
  const bvPrev = basisView(cmp.prev);
  const cash = M.cashLedger(r, f);

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
      Tax: 'costs/tax',
      Zakat: 'costs/zakat',
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
        </div>
      </div>

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
              <KpiCard k="Cash in hand" v={cash.closing} cls="lead" go="finance/cashflow" />
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
          .map((p: any) => ({ ...p, up: p.currentValue - p.totalCost }))
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
        const series = M.monthlySeries(M.TODAY.getFullYear(), f).map((m: any) => ({
          label: m.label,
          full: m.full,
          purchase: m.k.purchaseCost,
          sales: m.k.salesRevenue,
          net: m.k.netProfit,
          expenses: m.k.totalExpenses,
        }));
        const al = M.alerts().filter((a: any) => !denied(a.view));
        const rawExp = M.expenseBreakdown(k);
        const exp = rawExp.slice(0, 5).map((x: any, i: number) => ({ k: x[0], v: x[1], c: SC[i] }));
        const restTot = rawExp.slice(5).reduce((a: number, x: any) => a + x[1], 0);
        if (restTot > 0) exp.push({ k: 'Other categories', v: restTot, c: SC[5] });

        const portfolioItems = [
          ['Available', k.counts.available],
          ['Reserved', k.counts.reserved],
          ['Under process', k.counts.underProcess],
          ['Sold', k.counts.sold],
        ];

        return (
          <>
            <div className="kpis">
              <KpiCard
                k="Selling revenue"
                v={k.salesRevenue}
                d={d('salesRevenue')}
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
              <KpiCard
                k="Cash in hand"
                v={cash.closing}
                f={`at ${M.fmtDate(r.end)}`}
                go="finance/cashflow"
              />
              <KpiCard k="Receivables" v={k.receivable} f="owed to us" go="sales/receivables" />
              <KpiCard k="Payables" v={k.payable} f="we owe" cls="warnbox" go="finance/payables" />
            </div>

            <div className="grid c2u">
              <div style={{ display: 'grid', gap: '14px', minWidth: 0 }}>
                <div className="panel">
                  <div className="panel-h">
                    <h3>Sales against purchases</h3>
                    <span className="sub">{M.TODAY.getFullYear()}, by month</span>
                    <span className="spacer" />
                    <button type="button" className="link" onClick={() => goto('finance/profit')}>
                      Profit tracking
                    </button>
                  </div>
                  <div className="panel-b">
                    <ChartGroupedBars
                      rows={series}
                      s1="purchase"
                      s2="sales"
                      l1="Purchase cost"
                      l2="Selling revenue"
                    />
                  </div>
                </div>

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
              </div>

              <div style={{ display: 'grid', gap: '14px', minWidth: 0 }}>
                <div className="panel">
                  <div className="panel-h">
                    <h3>Needs attention</h3>
                    <span className="sub">{M.fmtNum(al.length)} items</span>
                  </div>
                  <div className="panel-b tight">
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

                <div className="panel">
                  <div className="panel-h">
                    <h3>Portfolio</h3>
                    <span className="sub">{M.fmtNum(k.counts.total)} properties</span>
                  </div>
                  <div className="panel-b tight">
                    <ShareBar
                      items={portfolioItems.map((x, i) => ({
                        k: x[0] as string,
                        v: x[1] as number,
                        c: OC[i],
                        disp: `${M.fmtNum(x[1] as number)} properties`,
                      }))}
                      total={k.counts.total}
                    />
                    <RankedList
                      items={portfolioItems.map((x, i) => ({
                        k: x[0] as string,
                        v: x[1] as number,
                        c: OC[i],
                        disp: M.fmtNum(x[1] as number),
                        go: 'properties/inventory',
                      }))}
                      total={k.counts.total}
                    />
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span className="vs">
                        Portfolio cost <b>{M.fmt(k.portfolioCost, numbers)}</b>
                      </span>
                      <span className="vs">
                        Market value <b>{M.fmt(k.portfolioValue, numbers)}</b>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
