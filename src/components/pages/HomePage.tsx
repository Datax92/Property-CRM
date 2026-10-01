'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { PeriodControl } from '../Shared';
import { AppIcon } from '../AppIcons';
import { Icon } from '../Icons';
import * as M from '../../lib/re-data';

interface Tile {
  icon: string;
  label: string;
  /** Live figure under the label, so the home screen answers the question before the click. */
  value?: string;
  tone?: 'pos' | 'neg';
  go: string;
  need?: string;
  before?: () => void;
}

/** Home: one large icon per area of the business, each showing its headline figure. */
export function HomePage() {
  const { user, effectiveFilters: f, range: r, numbers, goto, denied, openModal, openCostSheet, setRangeKey } = useApp();

  const k = M.computeKPIs(r, f);
  const cash = M.cashLedger(r, f);
  const sheets: any[] = M.DATA.costSheets;
  const landed = sheets.reduce((a, s) => a + (s.totalLandedCost || 0), 0);
  const sheetSales = sheets.reduce((a, s) => a + (s.grossSalePrice || s.sellingPrice || 0), 0);
  const sheetGross = sheets.reduce((a, s) => a + (s.grossProfit || 0), 0);
  // Gross margin comes from the deal cost sheets; before any exist, from the sales ledger.
  const grossPct = sheetSales > 0 ? M.pctOf(sheetGross, sheetSales) : k.grossMargin;
  const charity = M.charityRows(r).reduce((a: number, x: any) => a + x.amount, 0);
  const invoices = (kind: string) => M.DATA.invoices.filter((i: any) => i.type === kind).length;
  const projects = M.projectSummary(r, f).filter((p: any) => p.total > 0).length;
  const alerts = M.alerts().filter((a: any) => !denied(a.view));

  const money = (n: number) => M.fmt(n, numbers);
  const pct = (n: number) => `${n.toFixed(1)}%`;
  const count = (n: number, one: string, many: string) => `${M.fmtNum(n)} ${n === 1 ? one : many}`;
  const sign = (n: number): 'pos' | 'neg' | undefined => (n > 0 ? 'pos' : n < 0 ? 'neg' : undefined);

  const tiles: Tile[] = [
    { icon: 'dashboard', label: 'Dashboard', value: 'Graphs & comparison', go: 'dashboard/overview' },
    { icon: 'pnl', label: 'Profit / Loss', value: money(k.netProfit), tone: sign(k.netProfit), go: 'finance/pnl', need: 'pnl' },
    { icon: 'sales', label: 'Total Sales', value: money(k.salesRevenue), go: 'sales/register' },
    { icon: 'purchase', label: 'Total Purchase', value: money(k.purchaseCost), go: 'properties/purchases', need: 'purchases' },
    { icon: 'cash', label: 'Cash in Hand', value: money(cash.closing), tone: sign(cash.closing), go: 'finance/cashflow', need: 'cashflow' },
    { icon: 'expenses', label: 'Expenses', value: money(k.totalExpenses), go: 'costs/expenses', need: 'expenses' },

    { icon: 'projects', label: 'Projects', value: count(projects, 'active project', 'active projects'), go: 'properties/projects' },
    { icon: 'tax', label: 'Taxes & CGT', value: money(k.tax), go: 'costs/tax', need: 'tax' },
    { icon: 'zakat', label: 'Zakat', value: money(k.zakatRemaining) + ' due', go: 'costs/zakat', need: 'zakat' },
    { icon: 'charity', label: 'Charity', value: money(charity), go: 'costs/charity' },
    { icon: 'commission', label: 'Agent Commission', value: money(k.commission), go: 'agents/commissions' },
    { icon: 'inventory', label: 'Inventory', value: count(k.counts.unsold, 'property held', 'properties held'), go: 'properties/inventory' },

    { icon: 'landed', label: 'Purchase Price Landed', value: money(landed), go: 'trading/sheets' },
    { icon: 'value', label: 'Current Value / Sale', value: money(sheetSales || k.portfolioValue), go: 'trading/calculator' },
    { icon: 'gross', label: 'Gross Margin', value: pct(grossPct), tone: sign(grossPct), go: 'trading/analytics' },
    { icon: 'net', label: 'Net Margin %', value: pct(k.netMargin), tone: sign(k.netMargin), go: 'finance/profit', need: 'profit' },
    { icon: 'admin', label: 'Admin', value: 'Transactions & audit', go: 'admin/transactions', need: 'transactions' },
    { icon: 'finance', label: 'Finance', value: money(k.payable) + ' payable', go: 'finance/payables', need: 'payables' },

    { icon: 'saleInvoice', label: 'Sale Invoices', value: count(invoices('sale'), 'invoice', 'invoices'), go: 'sales/saleInvoices' },
    { icon: 'purchaseInvoice', label: 'Purchase Invoices', value: count(invoices('purchase'), 'invoice', 'invoices'), go: 'sales/purchaseInvoices' },
    { icon: 'agents', label: 'Agents', value: count(M.DATA.agents.length, 'agent', 'agents'), go: 'agents/directory', need: 'agents' },
    { icon: 'receivables', label: 'Receivables', value: money(k.receivable) + ' to collect', go: 'sales/receivables', need: 'receivables' },
    {
      icon: 'fiscal',
      label: 'Financial Year',
      value: M.rangeFor('thisFiscalYear').label + ' (Jul–Jun)',
      go: 'finance/pnl',
      need: 'pnl',
      before: () => setRangeKey('thisFiscalYear'),
    },
    { icon: 'account', label: 'My Account', value: 'Profile & sign out', go: 'account' },
  ];

  return (
    <div className="page">
      <div className="rolestrip">
        <div className="ini">{user.initials}</div>
        <div>
          <div className="t">Welcome, {user.name}</div>
          <div className="s">Figures below are for the selected period. Tap any icon to open it.</div>
        </div>
        <span className="spacer" />
        <div className="acts" data-noprint="1">
          <PeriodControl />
        </div>
      </div>

      <div className="quickrow" data-noprint="1">
        <span className="kicker">Quick entry</span>
        <button type="button" className="btn" onClick={() => openModal('property')}>
          <Icon name="plus" /> Property purchase
        </button>
        <button type="button" className="btn" onClick={() => openModal('sale')}>
          <Icon name="plus" /> Sale
        </button>
        <button type="button" className="btn" onClick={() => openModal('saleInvoice')}>
          <Icon name="plus" /> Sale invoice
        </button>
        <button type="button" className="btn" onClick={() => openModal('purchaseInvoice')}>
          <Icon name="plus" /> Purchase invoice
        </button>
        <button type="button" className="btn" onClick={() => openModal('expense')}>
          <Icon name="plus" /> Expense
        </button>
        <button type="button" className="btn" onClick={() => openModal('payment')}>
          <Icon name="plus" /> Payment
        </button>
        <button type="button" className="btn" onClick={() => openCostSheet('new')}>
          <Icon name="calculator" /> Cost sheet
        </button>
      </div>

      <nav className="launch" aria-label="All sections">
        {tiles
          .filter((t) => !denied(t.need))
          .map((t) => (
            <button
              key={t.label}
              type="button"
              className="tile"
              onClick={() => {
                if (t.before) t.before();
                goto(t.go);
              }}
            >
              <span className="tile-ic">
                <AppIcon name={t.icon} />
              </span>
              <span className="tile-l">{t.label}</span>
              {t.value && <span className={`tile-v ${t.tone || ''}`}>{t.value}</span>}
            </button>
          ))}
      </nav>

      {alerts.length > 0 && (
        <button type="button" className="note" style={{ marginTop: '14px', width: '100%', textAlign: 'left' }} onClick={() => goto('dashboard/alerts')}>
          <span className="ic">
            <Icon name="warn" />
          </span>
          <span>
            <b>
              {M.fmtNum(alerts.length)} {alerts.length === 1 ? 'item needs' : 'items need'} attention.
            </b>{' '}
            {alerts[0].title}: {alerts[0].detail}
          </span>
        </button>
      )}
    </div>
  );
}
