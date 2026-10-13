'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, DataTable, KpiCard, Tag } from '../Shared';
import { ChartBarGroups, ChartDonut, RankedList } from '../Charts';
import { Icon } from '../Icons';
import { PAGE_META, SC } from '../../lib/constants';
import * as M from '../../lib/re-data';

/* Income: money earned outside property trading. Each entry counts as revenue on the date it was
   earned; what has been received of it is on the cash ledger, the rest is still to receive. */
export function IncomePage() {
  const { tab, effectiveFilters: f, range: r, numbers, openModal, voidPayment, goto } = useApp();
  const meta = PAGE_META[`income/${tab}`] || { t: 'Income' };
  const money = (n: number) => M.fmt(n, numbers);

  const rows = M.incomeEntries(r, f).map((x: any) => ({
    ...x,
    property: (M.DATA.properties.find((p: any) => p.id === x.propertyId) || {}).name || '—',
  }));
  const earned = rows.reduce((a: number, x: any) => a + x.amount, 0);
  const received = rows.reduce((a: number, x: any) => a + (x.received || 0), 0);
  // Still to receive is everything not yet in, whenever it was earned.
  const due = (M.DATA.income || []).filter((x: any) => x.outstanding > 0 && (f.office === 'all' || x.office === f.office));
  const dueTotal = due.reduce((a: number, x: any) => a + x.outstanding, 0);
  const overdue = due.filter((x: any) => x.status === 'Overdue');

  const kinds = M.incomeKinds();
  const byKind = Array.from(new Set([...kinds, ...rows.map((x: any) => x.category)]))
    .map((k: string) => [k, rows.filter((x: any) => x.category === k).reduce((a: number, x: any) => a + x.amount, 0)] as [string, number])
    .filter((x) => x[1] > 0)
    .sort((a, b) => b[1] - a[1]);

  const acts = (
    <>
      <button type="button" className="btn" onClick={() => openModal('income', { received: '0' })} title="Income earned that has not come in yet, e.g. rent due">
        <Icon name="plus" /> Income due
      </button>
      <button type="button" className="btn pri" onClick={() => openModal('income')}>
        <Icon name="plus" /> Add income
      </button>
    </>
  );

  const kpis = (
    <div className="kpis">
      <KpiCard k={`Income earned · ${r.label}`} v={earned} cls="lead" />
      <KpiCard k="Received" v={received} tone="pos" go="bank/accounts" />
      <KpiCard k="Still to receive" v={dueTotal} f={overdue.length ? `${M.fmtNum(overdue.length)} overdue` : 'all on time'} cls={overdue.length ? 'warnbox' : ''} />
      <KpiCard k="Entries" raw={M.fmtNum(rows.length)} f={byKind.length ? `top: ${byKind[0][0]}` : undefined} />
      <KpiCard k="Share of revenue" raw={pctLabel(M.computeKPIs(r, f))} f="income as a share of all revenue" go="finance/pnl" />
    </div>
  );

  if (tab === 'summary') {
    const year = r.end.getFullYear();
    const months = M.monthlySeries(year, f).map((m: any) => {
      const inc = M.incomeEntries({ start: m.k.range.start, end: m.k.range.end }, f);
      return {
        label: m.label,
        full: m.full,
        earned: inc.reduce((a: number, x: any) => a + x.amount, 0),
        received: M.livePayments()
          .filter((p: any) => p.dir === 'in' && M.inRange(p.date, m.k.range) && (String(p.settleKey || '').startsWith('inc:') || (M.INCOME_CATEGORIES.indexOf(p.category) >= 0 && !p.settleKey)) && (f.office === 'all' || p.office === f.office))
          .reduce((a: number, p: any) => a + p.amount, 0),
      };
    });
    const byFrom = Object.entries(
      rows.reduce((acc: Record<string, number>, x: any) => ({ ...acc, [x.party]: (acc[x.party] || 0) + x.amount }), {})
    ).sort((a: any, b: any) => b[1] - a[1]) as [string, number][];

    const monthCols = [
      { key: 'full', label: 'Month' },
      { key: 'earned', label: 'Earned', a: 'r' as const, sum: true, cls: 'mono', render: (m: any) => money(m.earned) },
      { key: 'received', label: 'Received', a: 'r' as const, sum: true, cls: 'mono', render: (m: any) => <span className="pos">{money(m.received)}</span> },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} acts={acts} toolProps={{ search: false }}>
        {kpis}
        <div className="panel" style={{ marginBottom: '14px' }}>
          <div className="panel-h">
            <h3>Earned and received</h3>
            <span className="sub">{year}, month by month</span>
          </div>
          <div className="panel-b">
            <ChartBarGroups
              width={1180}
              label="Income earned and received by month"
              rows={months}
              series={[
                { key: 'earned', label: 'Earned', c: 'var(--s1)' },
                { key: 'received', label: 'Received', c: 'var(--s3)' },
              ]}
            />
          </div>
        </div>
        <div className="grid c2" style={{ marginBottom: '14px' }}>
          <div className="panel">
            <div className="panel-h">
              <h3>By kind of income</h3>
              <span className="sub">{r.label}</span>
            </div>
            <div className="panel-b">
              {byKind.length ? (
                <div className="grid c2">
                  <ChartDonut items={byKind.map(([k, v], i) => ({ k, v, c: SC[i % 6] }))} />
                  <RankedList items={byKind.map(([k, v], i) => ({ k, v, c: SC[i % 6] }))} total={earned} />
                </div>
              ) : (
                <div className="empty" style={{ padding: '20px' }}>No income in this period.</div>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-h">
              <h3>By who it is from</h3>
              <span className="sub">{r.label}</span>
            </div>
            <div className="panel-b tight">
              {byFrom.length ? (
                <RankedList items={byFrom.slice(0, 8).map(([k, v], i) => ({ k, v, c: SC[i % 6] }))} total={earned} />
              ) : (
                <div className="empty" style={{ padding: '20px' }}>No income in this period.</div>
              )}
            </div>
          </div>
        </div>
        <DataTable cols={monthCols} rows={months.map((m: any) => ({ ...m, id: m.full }))} totals={true} />
      </PageShell>
    );
  }

  // Register (default)
  const cols = [
    { key: 'id', label: 'ID' },
    { key: 'date', label: 'Earned on', cls: 'mono', render: (x: any) => M.fmtDate(x.date) },
    { key: 'category', label: 'Kind of income' },
    { key: 'party', label: 'Received from' },
    { key: 'property', label: 'Property' },
    { key: 'amount', label: 'Amount', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => <b>{money(x.amount)}</b> },
    { key: 'received', label: 'Received', a: 'r' as const, sum: true, cls: 'mono', render: (x: any) => <span className="pos">{money(x.received || 0)}</span> },
    {
      key: 'outstanding',
      label: 'To receive',
      a: 'r' as const,
      sum: true,
      cls: 'mono',
      render: (x: any) => <span className={x.outstanding > 0 ? 'neg' : ''}>{money(x.outstanding || 0)}</span>,
    },
    { key: 'dueDate', label: 'Due by', cls: 'mono', render: (x: any) => (x.outstanding > 0 ? M.fmtDate(x.dueDate) : '—') },
    { key: 'status', label: 'Status', render: (x: any) => <Tag text={x.status} /> },
    { key: 'account', label: 'Account', render: (x: any) => x.account || '—' },
    { key: 'note', label: 'Description' },
    {
      key: 'act',
      label: '',
      render: (x: any) =>
        x.source === 'payment' ? (
          <button type="button" className="btn sm" onClick={() => voidPayment(x.id)} title="Entered on the cash ledger: void it to take it back">
            Void
          </button>
        ) : x.outstanding > 0 ? (
          <button type="button" className="btn sm pri" onClick={() => openModal('payment', { settle: 'inc:' + x.id })} title="Record money received against this income">
            Receive
          </button>
        ) : null,
    },
  ];
  const ledgerRows = rows.filter((x: any) => x.source === 'income');
  const cashRows = rows.filter((x: any) => x.source === 'payment');

  return (
    <PageShell title={meta.t} u={meta.u} p={meta.p} acts={acts}>
      {kpis}
      {overdue.length > 0 && (
        <div className="note bad" style={{ marginBottom: '14px' }}>
          <span className="ic">
            <Icon name="warn" />
          </span>
          <div>
            <b>
              {M.fmtNum(overdue.length)} {overdue.length === 1 ? 'income entry is' : 'income entries are'} past the due date
            </b>{' '}
            — {money(overdue.reduce((a: number, x: any) => a + x.outstanding, 0))} not received yet. Oldest: {overdue[0].category} from{' '}
            {overdue[0].party}, due {M.fmtDate(overdue[0].dueDate)}.
          </div>
        </div>
      )}
      <DataTable cols={cols} rows={ledgerRows} totals={true} attach="income" />
      {cashRows.length > 0 && (
        <>
          <div className="sech" style={{ marginTop: '18px' }}>
            <h2>Received straight on the cash ledger</h2>
            <span className="sub">income entered as a payment; it counts the same way</span>
          </div>
          <DataTable cols={cols.filter((c) => ['outstanding', 'dueDate', 'received'].indexOf(c.key) < 0)} rows={cashRows} totals={true} />
        </>
      )}
      <div className="note calm" style={{ marginTop: '14px' }}>
        <span className="ic">
          <Icon name="info" />
        </span>
        <div>
          Income counts as <b>other revenue</b> in profit and loss on the date it was earned, and what is received goes into the bank or
          cash account picked (see <button type="button" className="link" onClick={() => goto('bank/accounts')}>Bank &amp; Cash</button>).
          Income still to receive counts in what the business holds. Money the owner puts in is not income: record it as{' '}
          <b>owner capital</b> under Bank &amp; Cash.
        </div>
      </div>
    </PageShell>
  );
}

const pctLabel = (k: any) => (k.totalRevenue > 0 ? `${((k.otherIncome / k.totalRevenue) * 100).toFixed(1)}%` : '—');
