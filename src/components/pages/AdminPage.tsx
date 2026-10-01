'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag } from '../Shared';
import { Icon } from '../Icons';
import { NAV, PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';
import { getFirebaseFirestore } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export function AdminPage() {
  const {
    tab,
    effectiveFilters: f,
    range: r,
    user,
    voidPayment,
    openModal,
    numbers,
  } = useApp();

  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);

  useEffect(() => {
    const db = getFirebaseFirestore();
    if (!db) return;
    try {
      const unsub = onSnapshot(collection(db, 'users'), (snap) => {
        const uList: any[] = [];
        snap.forEach((d) => uList.push({ id: d.id, ...d.data() }));
        if (uList.length) setRegisteredUsers(uList);
      });
      return () => unsub();
    } catch {
      // ignore
    }
  }, []);

  const meta = PAGE_META[`admin/${tab}`] || { t: 'Admin' };

  if (tab === 'audit') {
    const cols = [
      { key: 'id', label: 'Entry' },
      { key: 'date', label: 'Date', cls: 'mono', render: (a: any) => M.fmtDate(a.date) },
      { key: 'txnId', label: 'Transaction' },
      { key: 'action', label: 'Action' },
      { key: 'user', label: 'User' },
      { key: 'entity', label: 'Entity' },
      {
        key: 'prevAmount',
        label: 'Previous amount',
        a: 'r' as const,
        cls: 'mono',
        render: (a: any) => (a.prevAmount == null ? '—' : M.fmt(a.prevAmount, numbers)),
      },
      {
        key: 'newAmount',
        label: 'New amount',
        a: 'r' as const,
        sum: false,
        cls: 'mono',
        render: (a: any) => M.fmt(a.newAmount, numbers),
      },
      { key: 'note', label: 'Note' },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} toolProps={{ period: false }}>
        <div className="note calm" style={{ marginBottom: '14px' }}>
          <span className="ic">
            <Icon name="info" />
          </span>
          <div>
            <b>Financial records are never deleted.</b> They are voided, reversed or adjusted, and both the
            previous and the new amount are kept.
          </div>
        </div>
        <DataTable cols={cols} rows={M.DATA.audit} />
      </PageShell>
    );
  }

  if (tab === 'users') {
    const allTabs = NAV.flatMap((s) => s.tabs.map((t) => ({ sec: s.label, ...t })));

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p} tools={false}>
        <div className="grid c3" style={{ marginBottom: '16px' }}>
          {(registeredUsers.length ? registeredUsers : [user]).map((u: any) => (
            <div
              key={u.id || u.uid}
              className="panel"
              style={{ textAlign: 'left' }}
            >
              <div className="panel-b" style={{ display: 'flex', gap: '11px', alignItems: 'center' }}>
                <div className="rolestrip" style={{ margin: 0, padding: 0, border: 0, background: 'none' }}>
                  <div className="ini">{u.initials || (u.name ? u.name.slice(0, 2).toUpperCase() : 'U')}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {u.name}
                    {u.id === user.id && <span className="tag ok"> you</span>}
                  </div>
                  {u.email && <div className="vs" style={{ color: 'var(--brand)' }}>{u.email}</div>}
                  <div className="vs">
                    {u.title || u.role} · <span className="tag mute">{u.role}</span>
                  </div>
                  <div className="vs">{u.office}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-h">
            <h3>What each role can see</h3>
          </div>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Screen</th>
                  {Object.keys(M.ROLES).map((x) => (
                    <th key={x} style={{ textAlign: 'center' }}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTabs.map((t: any, idx: number) => (
                  <tr key={idx}>
                    <td className="vs">{t.sec}</td>
                    <td className="strong">{t.label}</td>
                    {Object.keys(M.ROLES).map((rl) => {
                      const ok = !t.need || ((M.ROLES as any)[rl].deny || []).indexOf(t.need) < 0;
                      return (
                        <td key={rl} style={{ textAlign: 'center' }}>
                          {ok ? <span className="tag ok">Allowed</span> : <span className="tag mute">Hidden</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="note" style={{ marginTop: '14px' }}>
          <span className="ic">
            <Icon name="warn" />
          </span>
          <div>
            <b>Open question for the client.</b> The requirement document says Accountant salary access is
            "according to company policy", which a developer cannot build from. It is set to <b>hidden</b>{' '}
            here — please confirm.
          </div>
        </div>
      </PageShell>
    );
  }

  // Transactions tab (default)
  const rows = M.DATA.payments.filter((p: any) => M.inRange(p.date, r) && (f.office === 'all' || p.office === f.office));

  const summaryPairs: [string, string][] = [
    ['Transactions', M.fmtNum(rows.length)],
    [
      'Cash in',
      M.fmt(
        rows.filter((p: any) => p.dir === 'in').reduce((a: number, p: any) => a + p.amount, 0),
        numbers
      ),
    ],
    [
      'Cash out',
      M.fmt(
        rows.filter((p: any) => p.dir === 'out').reduce((a: number, p: any) => a + p.amount, 0),
        numbers
      ),
    ],
  ];

  const cols = [
    { key: 'id', label: 'Transaction ID' },
    { key: 'date', label: 'Date', cls: 'mono', render: (p: any) => M.fmtDate(p.date) },
    { key: 'category', label: 'Type' },
    { key: 'party', label: 'Customer / vendor' },
    { key: 'amount', label: 'Amount', a: 'r' as const, sum: true, cls: 'mono', render: (p: any) => M.fmt(p.amount, numbers) },
    { key: 'method', label: 'Method' },
    { key: 'account', label: 'Account' },
    { key: 'ref', label: 'Reference' },
    { key: 'createdBy', label: 'Created by' },
    { key: 'approvedBy', label: 'Approved by' },
    { key: 'status', label: 'Status', render: (p: any) => <Tag text={p.status} /> },
    {
      key: 'void',
      label: '',
      render: (t: any) =>
        t.status === 'Voided' ? null : (
          <button
            type="button"
            className="btn sm"
            onClick={() => voidPayment(t.id)}
          >
            Void
          </button>
        ),
    },
  ];

  return (
    <PageShell
      title={meta.t}
      u={meta.u}
      p={meta.p}
      acts={
        <button type="button" className="btn pri" onClick={() => openModal('payment')}>
          <Icon name="plus" /> Record payment
        </button>
      }
    >
      <SummaryKpis pairs={summaryPairs} />
      <DataTable cols={cols} rows={rows} totals={true} />
    </PageShell>
  );
}
