'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, DataTable, KpiCard } from '../Shared';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';

/* Bank & Cash: cash in hand and every bank account — what each held to begin with, what came in
   and went out, money moved between them, and what each holds now. */
export function BankPage() {
  const { tab, effectiveFilters: f, range: r, numbers, openModal, voidPayment, goto } = useApp();
  const meta = PAGE_META[`bank/${tab}`] || { t: 'Bank & Cash' };
  const money = (n: number) => M.fmt(n, numbers);
  const [picked, setPicked] = useState('');

  const now = M.cashAndBank(r.end, f);
  const acts = (
    <>
      <button type="button" className="btn" onClick={() => openModal('account')}>
        <Icon name="plus" /> New account
      </button>
      <button type="button" className="btn" onClick={() => openModal('renameAccount')}>
        <Icon name="edit" /> Rename account
      </button>
      <button type="button" className="btn" onClick={() => openModal('payment', { dir: 'in', category: 'Opening Balance' })}>
        <Icon name="plus" /> Opening balance
      </button>
      <button type="button" className="btn" onClick={() => openModal('payment', { dir: 'in', category: 'Owner Capital' })}>
        <Icon name="plus" /> Owner capital
      </button>
      <button type="button" className="btn pri" onClick={() => openModal('transfer')}>
        <Icon name="swap" /> Transfer
      </button>
    </>
  );

  const kpis = (
    <div className="kpis">
      <KpiCard k="Cash in hand" v={now.cash} tone={now.cash < 0 ? 'neg' : ''} f={`${M.fmtNum(now.accounts.filter((a: any) => a.kind === 'Cash').length)} cash ${plural(now.accounts.filter((a: any) => a.kind === 'Cash').length)}`} cls="lead" />
      <KpiCard k="Cash in bank" v={now.bank} tone={now.bank < 0 ? 'neg' : ''} f={`${M.fmtNum(now.accounts.filter((a: any) => a.kind === 'Bank').length)} bank ${plural(now.accounts.filter((a: any) => a.kind === 'Bank').length)}`} />
      <KpiCard k="Total cash & bank" v={now.total} tone={now.total < 0 ? 'neg' : 'pos'} f={`on ${M.fmtDate(r.end)}`} />
      <KpiCard k="Opening balances" v={now.accounts.reduce((a: number, x: any) => a + x.opening, 0)} f="what the accounts held to begin with" />
    </div>
  );

  if (tab === 'statement') {
    const names = now.accounts.map((a: any) => a.account);
    const acct = names.indexOf(picked) >= 0 ? picked : names[0] || '';
    const st = acct ? M.accountStatement(acct, r, f) : { opening: 0, rows: [], closing: 0 };
    const cols = [
      { key: 'date', label: 'Date', cls: 'mono', render: (p: any) => M.fmtDate(p.date) },
      { key: 'id', label: 'Txn ID' },
      { key: 'category', label: 'What' },
      { key: 'party', label: 'Party' },
      { key: 'note', label: 'Description' },
      { key: 'inAmt', label: 'In', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => (p.inAmt ? <span className="pos">{money(p.inAmt)}</span> : '') },
      { key: 'outAmt', label: 'Out', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => (p.outAmt ? money(p.outAmt) : '') },
      { key: 'balance', label: 'Balance', a: 'r' as const, cls: 'mono', render: (p: any) => <b className={p.balance < 0 ? 'neg' : ''}>{money(p.balance)}</b> },
    ];
    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} acts={acts} toolProps={{ filters: false }}>
        <div className="toolrow" data-noprint="1">
          <label className="vs" htmlFor="acct-pick">
            Account
          </label>
          <select id="acct-pick" className="fldsel" value={acct} onChange={(e) => setPicked(e.target.value)}>
            {now.accounts.map((a: any) => (
              <option key={a.account} value={a.account}>
                {a.account} · {a.kind}
              </option>
            ))}
          </select>
        </div>
        {acct ? (
          <>
            <div className="kpis">
              <KpiCard k={`Balance on ${M.fmtDate(r.start)}`} v={st.opening} />
              <KpiCard k="Money in" v={st.rows.reduce((a: number, p: any) => a + p.inAmt, 0)} tone="pos" />
              <KpiCard k="Money out" v={st.rows.reduce((a: number, p: any) => a + p.outAmt, 0)} />
              <KpiCard k={`Balance on ${M.fmtDate(r.end)}`} v={st.closing} tone={st.closing < 0 ? 'neg' : 'pos'} cls="lead" />
            </div>
            <DataTable cols={cols} rows={st.rows} totals={true} />
          </>
        ) : (
          <div className="empty">
            <Icon name="empty" />
            <h3>No accounts yet</h3>
            <p>Add a bank or cash account with what it holds today.</p>
          </div>
        )}
      </PageShell>
    );
  }

  if (tab === 'transfers') {
    const outs = M.livePayments()
      .concat(M.DATA.payments.filter((p: any) => p.status === 'Voided'))
      .filter((p: any) => M.isTransfer(p) && p.dir === 'out' && M.inRange(p.date, r) && (f.office === 'all' || p.office === f.office));
    const rows = outs.map((p: any) => ({ ...p, from: p.account, to: p.party }));
    const cols = [
      { key: 'id', label: 'Transfer' },
      { key: 'date', label: 'Date', cls: 'mono', render: (p: any) => M.fmtDate(p.date) },
      { key: 'from', label: 'From' },
      { key: 'to', label: 'To' },
      { key: 'amount', label: 'Amount', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => <b className={p.status === 'Voided' ? 'muted' : ''}>{money(p.amount)}</b> },
      { key: 'method', label: 'How' },
      { key: 'ref', label: 'Reference' },
      { key: 'note', label: 'Description' },
      {
        key: 'status',
        label: '',
        render: (p: any) =>
          p.status === 'Voided' ? (
            <span className="tag bad">Voided</span>
          ) : (
            <button type="button" className="btn sm" onClick={() => voidPayment(p.id)} title="Take this transfer back: both accounts return to what they were">
              Void
            </button>
          ),
      },
    ];
    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} acts={acts} toolProps={{ filters: false }}>
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  // Accounts (default)
  const cols = [
    { key: 'account', label: 'Account', render: (a: any) => <b>{a.account}</b> },
    { key: 'kind', label: 'Kind', render: (a: any) => <span className={`tag ${a.kind === 'Cash' ? 'ok' : ''}`}>{a.kind === 'Cash' ? 'Cash in hand' : 'Bank'}</span> },
    { key: 'opening', label: 'Opening balance', a: 'r' as const, sum: true, cls: 'mono', render: (a: any) => money(a.opening) },
    { key: 'cashIn', label: 'Money in', a: 'r' as const, sum: true, cls: 'mono', render: (a: any) => <span className="pos">{money(a.cashIn)}</span> },
    { key: 'cashOut', label: 'Money out', a: 'r' as const, sum: true, cls: 'mono', render: (a: any) => money(a.cashOut) },
    {
      key: 'moved',
      label: 'Transfers in / out',
      a: 'r' as const,
      cls: 'mono',
      render: (a: any) => (a.transferIn || a.transferOut ? `+${money(a.transferIn)} / −${money(a.transferOut)}` : '—'),
    },
    { key: 'balance', label: 'Balance now', a: 'r' as const, sum: true, cls: 'mono', render: (a: any) => <b className={a.balance < 0 ? 'neg' : 'pos'}>{money(a.balance)}</b> },
    { key: 'last', label: 'Last used', cls: 'mono', render: (a: any) => M.fmtDate(a.last) },
    {
      key: 'act',
      label: '',
      render: (a: any) => (
        <span className="rowacts">
          <button type="button" className="btn sm" onClick={() => { setPicked(a.account); goto('bank/statement'); }}>
            Statement
          </button>
          {a.account !== M.NO_ACCOUNT && (
            <button type="button" className="btn sm" onClick={() => openModal('renameAccount', { from: a.account, to: a.account })} title={`Give ${a.account} a new name`}>
              Rename
            </button>
          )}
        </span>
      ),
    },
  ];
  const negative = now.accounts.filter((a: any) => a.balance < 0);

  return (
    <PageShell title={meta.t} u={meta.u} p={meta.p} acts={acts} toolProps={{ search: false, filters: false }}>
      {kpis}
      {negative.length > 0 && (
        <div className="note bad" style={{ marginBottom: '14px' }}>
          <span className="ic">
            <Icon name="warn" />
          </span>
          <div>
            <b>{negative.map((a: any) => a.account).join(', ')}</b> {negative.length === 1 ? 'is' : 'are'} below zero: more was paid out of{' '}
            {negative.length === 1 ? 'it' : 'them'} than is shown coming in. Enter what each account held to begin with as its{' '}
            <button type="button" className="link" onClick={() => openModal('payment', { dir: 'in', category: 'Opening Balance', account: negative[0].account })}>
              opening balance
            </button>
            , and money the owner put in as{' '}
            <button type="button" className="link" onClick={() => openModal('payment', { dir: 'in', category: 'Owner Capital', account: negative[0].account })}>
              owner capital
            </button>
            .
          </div>
        </div>
      )}
      {now.accounts.length ? (
        <DataTable cols={cols} rows={now.accounts} totals={true} />
      ) : (
        <div className="empty">
          <Icon name="empty" />
          <h3>No accounts yet</h3>
          <p>Add each bank account and the cash in hand with what it holds today.</p>
        </div>
      )}
      <div className="note calm" style={{ marginTop: '14px' }}>
        <span className="ic">
          <Icon name="info" />
        </span>
        <div>
          An account whose name says <b>cash</b> (such as “Cash in hand” or “Petty Cash”) counts as cash in hand; every other account is a
          bank account. An <b>opening balance</b> is what an account held when you started using the software, whatever date it is entered
          on, so it is never counted as income. A <b>transfer</b> — cash deposited in the bank, cash drawn out — moves money between two
          accounts without changing the total.
        </div>
      </div>
    </PageShell>
  );
}

const plural = (n: number) => (n === 1 ? 'account' : 'accounts');
