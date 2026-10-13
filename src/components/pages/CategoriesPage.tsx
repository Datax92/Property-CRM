'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, KpiCard, Tag } from '../Shared';
import { ChartDonut, RankedList } from '../Charts';
import { Icon } from '../Icons';
import { PAGE_META, SC } from '../../lib/constants';
import { ledgersReady, ledgerError } from '../../lib/firestore-service';
import * as M from '../../lib/re-data';

/* Expense or income categories: the built-in ones and those added here, what was spent or earned
   under each in the period, and a button to add more. An added category can be taken off the
   list again; entries already made under it keep its name. */
export function CategoriesPage({ kind }: { kind: 'expense' | 'income' }) {
  const { effectiveFilters: f, range: r, numbers, openModal, refreshData, toast, goto } = useApp();
  const [confirm, setConfirm] = useState<string | null>(null);
  const meta = PAGE_META[`${kind === 'income' ? 'income' : 'costs'}/categories`] || { t: 'Categories' };
  const money = (n: number) => M.fmt(n, numbers);
  const income = kind === 'income';

  const rows: any[] = income ? M.incomeCategoryStats(r, f) : M.expenseCategoryStats(r, f);
  const total = rows.filter((x) => income || x.business).reduce((a, x) => a + x.amount, 0);
  // Personal spending is not a business cost, so it is listed but not in the chart or the shares.
  const used = rows.filter((x) => x.amount > 0 && (income || x.business)).sort((a, b) => b.amount - a.amount);
  const chart = used.slice(0, 5).map((x, i) => ({ k: x.name, v: x.amount, c: SC[i], go: income ? 'income/register' : 'costs/expenses' }));
  const rest = used.slice(5).reduce((a, x) => a + x.amount, 0);
  if (rest > 0) chart.push({ k: 'Other categories', v: rest, c: SC[5], go: income ? 'income/register' : 'costs/expenses' });
  const addedCount = (M.DATA.categories || []).filter((c: any) => c.kind === kind).length;

  const remove = (ids: string[], label: string) => {
    if (!ledgersReady()) return toast('Your records are still loading — please try again in a moment');
    if (ledgerError()) return toast('Not saved — the database is not reachable');
    try {
      ids.forEach((id) => M.removeCategory(id));
      setConfirm(null);
      refreshData();
      toast(label + ' removed from the list');
    } catch (e: any) {
      toast(String(e && e.message ? e.message : e));
    }
  };

  // An added category (with what was added under it) or sub-category: removed after a second press.
  const removeBtn = (recs: any[], label: string) =>
    confirm === recs[0].id ? (
      <span className="task-confirm">
        Remove {label}?
        <button type="button" className="btn sm bad" onClick={() => remove(recs.map((c) => c.id), label)}>
          Yes
        </button>
        <button type="button" className="btn sm" onClick={() => setConfirm(null)}>
          No
        </button>
      </span>
    ) : (
      <button type="button" className="iconbtn" title={`Remove ${label} from the list`} aria-label={`Remove ${label}`} onClick={() => setConfirm(recs[0].id)}>
        <Icon name="trash" />
      </button>
    );

  return (
    <PageShell
      title={meta.t}
      u={meta.u}
      p={meta.p}
      toolProps={{ search: false, filters: false }}
      acts={
        <button type="button" className="btn pri" onClick={() => openModal(income ? 'incomeCategory' : 'expenseCategory')}>
          <Icon name="plus" /> Add category
        </button>
      }
    >
      <div className="kpis">
        <KpiCard k={income ? `Income earned · ${r.label}` : `Business expenses · ${r.label}`} v={total} cls="lead" go={income ? 'income/register' : 'costs/expenses'} />
        <KpiCard k="Categories" raw={M.fmtNum(rows.length)} f={`${M.fmtNum(used.length)} used in the period`} />
        <KpiCard k="Added by you" raw={M.fmtNum(addedCount)} f={income ? 'income categories' : 'categories and sub-categories'} />
        <KpiCard k={income ? 'Largest source' : 'Largest category'} raw={used.length ? used[0].name : '—'} f={used.length ? money(used[0].amount) : 'nothing in the period'} />
      </div>

      <div className="panel" style={{ marginBottom: '14px' }}>
        <div className="panel-h">
          <h3>{income ? 'Income by category' : 'Spending by category'}</h3>
          <span className="sub">{r.label}</span>
        </div>
        <div className="panel-b">
          {chart.length ? (
            <div className="grid c2">
              <ChartDonut items={chart} />
              <RankedList items={chart} />
            </div>
          ) : (
            <div className="empty" style={{ padding: '20px' }}>
              Nothing {income ? 'earned' : 'spent'} in this period.
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="tblwrap">
          <table className="tbl catl">
            <thead>
              <tr>
                <th>Category</th>
                {!income && <th>Sub-categories</th>}
                <th className="r">Entries</th>
                <th className="r">{income ? 'Earned' : 'Spent'}</th>
                <th className="r">Share</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const own = income ? (x.added ? [x.added] : []) : x.builtin ? [] : x.added;
                const share = (income || x.business) && total ? (x.amount / total) * 100 : null;
                return (
                  <tr key={x.name}>
                    <td className="strong">
                      {x.name}
                      {!x.builtin && <Tag text="Added" />}
                      {!income && !x.business && <span className="muted catl-note">not a business cost</span>}
                    </td>
                    {!income && (
                      <td className="wrap">
                        <div className="catl-subs">
                          {x.subs.map((s: any) => (
                            <span key={s.name} className={`catl-sub ${s.added ? 'own' : ''}`} title={s.count ? `${M.fmtNum(s.count)} entries · ${M.fmt(s.amount, 'full')}` : 'Nothing spent under it in this period'}>
                              {s.name}
                              {s.amount > 0 && <b>{money(s.amount)}</b>}
                              {s.added && x.builtin && removeBtn([s.added], s.name)}
                            </span>
                          ))}
                          <button type="button" className="catl-addsub" onClick={() => openModal('expenseCategory', { group: x.name })}>
                            <Icon name="plus" size={12} /> Sub-category
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="r mono">{M.fmtNum(x.count)}</td>
                    <td className="r mono strong">{money(x.amount)}</td>
                    <td className="r mono">{share == null ? '—' : `${share.toFixed(1)}%`}</td>
                    <td className="r">
                      <span className="rowacts">
                        {x.count > 0 && (
                          <button type="button" className="btn sm" onClick={() => goto(income ? 'income/register' : 'costs/expenses')}>
                            Entries
                          </button>
                        )}
                        {own.length > 0 && removeBtn(own, x.name)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="note calm" style={{ marginTop: '14px' }}>
        <span className="ic">
          <Icon name="info" />
        </span>
        <div>
          {income
            ? 'An income category added here can be picked when adding income or recording money in, and counts as revenue in profit and loss.'
            : 'A category added here is a business expense: it can be picked when adding an expense, and what is spent under it is on its own line in profit and loss and on the dashboard.'}{' '}
          Removing an added category only takes it off the list — entries already made under it keep it.
        </div>
      </div>
    </PageShell>
  );
}
