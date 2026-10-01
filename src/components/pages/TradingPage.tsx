'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, PrintHead } from '../Shared';
import { ledgersReady } from '../../lib/firestore-service';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';
import type { CostSheet } from '../../lib/types';

export function TradingPage() {
  const {
    tab,
    effectiveFilters: f,
    numbers,
    activeCostSheetId,
    openCostSheet,
  } = useApp();

  const meta = PAGE_META[`trading/${tab}`] || { t: 'Cost Sheet' };

  // =========================================================================
  // TAB 1: COST SHEET REGISTER (Matching Client Excel Rows 2–4)
  // =========================================================================
  if (tab === 'sheets') {
    const costSheets: CostSheet[] = (M.DATA as any).costSheets || [];

    // Filter matching
    const rows = costSheets.filter((cs) => {
      if (f.project !== 'all') {
        const prj = M.PROJECTS.find((p: any) => p.name === cs.project);
        if (prj && prj.id !== f.project) return false;
      }
      if (f.type !== 'all' && cs.type !== f.type) return false;
      if (f.office !== 'all' && cs.office !== f.office) return false;
      if (f.status !== 'all') {
        if (f.status === 'Sold' && cs.status !== 'Sold') return false;
        if (f.status !== 'Sold' && cs.status === 'Sold') return false;
      }
      return true;
    });

    const totalNetBuy = rows.reduce((a, s) => a + (s.netBuyCost || s.purchasePrice), 0);
    const totalPurchasePrice = rows.reduce((a, s) => a + s.purchasePrice, 0);
    const totalRev = rows.reduce((a, s) => a + (s.grossSalePrice || s.sellingPrice), 0);
    const totalGrossProfit = rows.reduce((a, s) => a + s.grossProfit, 0);
    const totalNetMargin = rows.reduce((a, s) => a + (s.netMargin ?? s.netProfit), 0);
    const totalCommissions = rows.reduce((a, s) => a + s.totalCommissions, 0);

    const summaryPairs: [string, string][] = [
      ['Total deals', M.fmtNum(rows.length)],
      ['Net Buy Cost', M.fmt(totalNetBuy, numbers)],
      ['Purchase Price (Landed)', M.fmt(totalPurchasePrice, numbers)],
      ['Current Value / Sale', M.fmt(totalRev, numbers)],
      ['Agent Commission', M.fmt(totalCommissions, numbers)],
      ['Gross Profit', M.fmt(totalGrossProfit, numbers)],
      ['Net Margin', M.fmt(totalNetMargin, numbers)],
    ];

    // Columns directly matching Excel rows 2-4
    const cols = [
      {
        key: 'id',
        label: 'ID',
        cls: 'mono',
        render: (cs: CostSheet) => (
          <span style={{ fontWeight: 700, color: 'var(--brand)' }}>{cs.id}</span>
        ),
      },
      {
        key: 'name',
        label: 'Property',
        render: (cs: CostSheet) => (
          <div>
            <b>{cs.name}</b>
          </div>
        ),
      },
      { key: 'type', label: 'Type' },
      { key: 'project', label: 'Project' },
      { key: 'city', label: 'City' },
      { key: 'size', label: 'Size', cls: 'mono' },
      {
        key: 'netBuyCost',
        label: 'Net Buy Cost',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => M.fmt(cs.netBuyCost || cs.purchasePrice, numbers),
      },
      {
        key: 'totalCommissions',
        label: 'Agent Commission',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => M.fmt(cs.totalCommissions, numbers),
      },
      {
        key: 'grossSalePrice',
        label: 'Current Value',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => <b>{M.fmt(cs.grossSalePrice || cs.sellingPrice, numbers)}</b>,
      },
      {
        key: 'grossProfit',
        label: 'GROSS PROFIT',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => (
          <span className={cs.grossProfit >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>
            {M.fmt(cs.grossProfit, numbers)}
          </span>
        ),
      },
      {
        key: 'netMargin',
        label: 'NET MARGIN',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => (
          <span
            className={(cs.netMargin ?? cs.netProfit) >= 0 ? 'pos' : 'neg'}
            style={{ fontWeight: 800 }}
          >
            {M.fmt(cs.netMargin ?? cs.netProfit, numbers)}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Action',
        render: (cs: CostSheet) => (
          <button
            type="button"
            className="btn"
            style={{ padding: '3px 8px', fontSize: '11px', height: '24px' }}
            onClick={() => openCostSheet(cs.id)}
          >
            <Icon name="calculator" size={12} /> Open Sheet
          </button>
        ),
      },
    ];

    return (
      <PageShell
        title="Cost Sheet Register"
        u="لاگت رجسٹر"
        p="Summary register of property trade deals matching your Excel sheet format."
        acts={
          <button
            type="button"
            className="btn pri"
            onClick={() => openCostSheet('new')}
          >
            <Icon name="calculator" /> New Cost Sheet
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <div style={{ marginTop: '14px' }}>
          <DataTable cols={cols} rows={rows} totals={true} />
        </div>
      </PageShell>
    );
  }

  // =========================================================================
  // TAB 3: TRADING ANALYTICS (Clean Simple Comparison Table)
  // =========================================================================
  if (tab === 'analytics') {
    const costSheets: CostSheet[] = (M.DATA as any).costSheets || [];
    
    // Project breakdown
    const prjMap: Record<string, { count: number; buyCost: number; rev: number; gross: number; net: number; comm: number }> = {};
    costSheets.forEach((cs) => {
      if (!prjMap[cs.project]) {
        prjMap[cs.project] = { count: 0, buyCost: 0, rev: 0, gross: 0, net: 0, comm: 0 };
      }
      prjMap[cs.project].count++;
      prjMap[cs.project].buyCost += cs.netBuyCost || cs.purchasePrice;
      prjMap[cs.project].rev += cs.grossSalePrice || cs.sellingPrice;
      prjMap[cs.project].gross += cs.grossProfit;
      prjMap[cs.project].net += cs.netMargin ?? cs.netProfit;
      prjMap[cs.project].comm += cs.totalCommissions;
    });

    const prjRows = Object.keys(prjMap).map((prj) => {
      const d = prjMap[prj];
      return {
        id: prj,
        project: prj,
        count: d.count,
        buyCost: d.buyCost,
        rev: d.rev,
        comm: d.comm,
        gross: d.gross,
        net: d.net,
        margin: d.rev > 0 ? (d.net / d.rev) * 100 : 0,
      };
    }).sort((a, b) => b.net - a.net);

    const prjCols = [
      { key: 'project', label: 'Society / Project' },
      { key: 'count', label: 'Deals', a: 'r' as const, cls: 'mono', render: (r: any) => M.fmtNum(r.count) },
      { key: 'buyCost', label: 'Total Net Buy Cost', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.buyCost, numbers) },
      { key: 'rev', label: 'Current Value / Sale', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.rev, numbers) },
      { key: 'comm', label: 'Agent Commission', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.comm, numbers) },
      { key: 'gross', label: 'Gross Profit', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => <span className={r.gross >= 0 ? 'pos' : 'neg'}>{M.fmt(r.gross, numbers)}</span> },
      { key: 'net', label: 'Net Margin', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => <span className={r.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>{M.fmt(r.net, numbers)}</span> },
      { key: 'margin', label: 'Margin %', a: 'r' as const, cls: 'mono', render: (r: any) => `${r.margin.toFixed(1)}%` },
    ];

    return (
      <PageShell title="Trading Comparison" u="تجزیہ منافع" p="Simple profitability comparison by society.">
        <div className="panel">
          <div className="panel-h">
            <h3>Society Comparison</h3>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <DataTable cols={prjCols} rows={prjRows} totals={true} />
          </div>
        </div>
      </PageShell>
    );
  }

  // =========================================================================
  // TAB 2: INTERACTIVE DEAL COST SHEET (Exact Excel Format, No Extra Clutter)
  // =========================================================================
  return <SimpleCostSheetView activeCostSheetId={activeCostSheetId} />;
}

// ---------------------------------------------------------------------------
// BEAUTIFUL, EXECUTIVE PRINTABLE COST SHEET DOCUMENT
// ---------------------------------------------------------------------------
function PrintableCostSheetDoc({
  sheet,
  form,
  numbers,
}: {
  sheet: CostSheet;
  form: any;
  numbers: any;
}) {
  const marginPct = (sheet.netMarginPct || 0).toFixed(1);
  const roiPct = (sheet.roiPct || 0).toFixed(1);

  return (
    <div
      className="printable-cost-sheet-doc"
      style={{
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
        padding: '24px 28px',
        maxWidth: '820px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. OFFICIAL CORPORATE LETTERHEAD */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '3px solid #047857',
          paddingBottom: '10px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#047857',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '20px',
              fontFamily: 'var(--display)',
              boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)',
            }}
          >
            {M.COMPANY[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#064e3b', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {M.COMPANY.toUpperCase()}
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginTop: '2px' }}>
              Real Estate Trading &amp; Portfolio RMS · Financial Deal Division
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
            <span>OFFICIAL COST SHEET</span>
            <span>·</span>
            <span>#{sheet.id || 'NEW'}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
            Issued: <b>{M.fmtDate(M.TODAY)}</b>
          </div>
        </div>
      </div>

      {/* 2. PROPERTY SPECIFICATION & DEAL CONTEXT STRIP */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          fontSize: '11.5px',
        }}
      >
        <div>
          <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Property</span>
          <span style={{ fontWeight: 800, color: '#0f172a' }}>{sheet.name || 'Untitled Deal'}</span>
        </div>
        <div>
          <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Project / Society</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{sheet.project}</span>
        </div>
        <div>
          <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Location &amp; City</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>{sheet.city}</span>
        </div>
        <div>
          <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Size &amp; Category</span>
          <span style={{ fontWeight: 700, color: '#047857' }}>{sheet.size} · {sheet.type}</span>
        </div>
      </div>

      {/* 3. EXECUTIVE FINANCIAL SUMMARY CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '10px',
        }}
      >
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
          <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Net Purchase Cost</div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, fontFamily: 'var(--mono)', color: '#0f172a', marginTop: '2px' }}>
            {M.fmt(sheet.netBuyCost || form.netBuyCost, numbers)}
          </div>
          <div style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '1px' }}>Base Property Price</div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px' }}>
          <div style={{ fontSize: '9px', color: '#0369a1', textTransform: 'uppercase', fontWeight: 700 }}>Total Landed Basis</div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, fontFamily: 'var(--mono)', color: '#0284c7', marginTop: '2px' }}>
            {M.fmt(sheet.purchasePrice, numbers)}
          </div>
          <div style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '1px' }}>Cost + Taxes + Fees</div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
          <div style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>Gross Sale / Exit</div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, fontFamily: 'var(--mono)', color: '#0f172a', marginTop: '2px' }}>
            {M.fmt(sheet.grossSalePrice || form.grossSalePrice, numbers)}
          </div>
          <div style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '1px' }}>Target Selling Value</div>
        </div>

        <div style={{ background: '#ecfdf5', border: '1.5px solid #059669', borderRadius: '6px', padding: '6px 8px' }}>
          <div style={{ fontSize: '9px', color: '#047857', textTransform: 'uppercase', fontWeight: 800 }}>Clean Net Margin</div>
          <div style={{ fontSize: '14.5px', fontWeight: 900, fontFamily: 'var(--mono)', color: '#047857', marginTop: '2px' }}>
            {M.fmt(sheet.netMargin ?? sheet.netProfit, numbers)}
          </div>
          <div style={{ fontSize: '9px', color: '#059669', fontWeight: 700, marginTop: '1px' }}>
            Margin: {marginPct}% · ROI: {roiPct}%
          </div>
        </div>
      </div>

      {/* 4. MASTER LEDGER TABLE */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '11px',
          marginBottom: '10px',
        }}
      >
        <thead>
          <tr style={{ background: '#0f172a', color: '#ffffff' }}>
            <th style={{ padding: '4px 6px', textAlign: 'center', width: '35px', fontWeight: 700 }}>#</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 700 }}>Item Description</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', width: '180px', fontWeight: 600 }}>Calculation Basis / Detail</th>
            <th style={{ padding: '4px 6px', textAlign: 'right', width: '140px', fontWeight: 700 }}>Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>
          {/* NET BUY COST */}
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontWeight: 700 }}>
            <td style={{ padding: '4px 6px', textAlign: 'center' }}>•</td>
            <td style={{ padding: '4px 6px', color: '#047857', fontWeight: 800 }}>NET BUY COST</td>
            <td style={{ padding: '4px 6px', color: '#64748b' }}>Base property acquisition price</td>
            <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '11.5px' }}>
              {M.fmt(form.netBuyCost ?? sheet.netBuyCost, numbers)}
            </td>
          </tr>

          {/* SECTION 1 */}
          <tr style={{ background: '#f1f5f9', fontWeight: 800, borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '3.5px 6px', textAlign: 'center', color: '#047857' }}>1</td>
            <td style={{ padding: '3.5px 6px', textTransform: 'uppercase', color: '#0f172a' }} colSpan={3}>
              Society / Govt Transfer Cost
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>1.0</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>NDC &amp; Verification Fee</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Verification fee</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.ndcFee ?? 10000, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>1.1</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Provincial Stamp Duty</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>1% Stamp</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.stampDuty ?? 0, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>•</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Capital Value Tax (CVT)</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>1% CVT</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.cvt ?? 0, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>1.2</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Govt Authority CDA/RDA Transfer Fee</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>0.5% of sale value</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.cdaRdaTransferFee ?? 0, numbers)}</td>
          </tr>

          {/* SECTION 2 */}
          <tr style={{ background: '#f1f5f9', fontWeight: 800, borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '3.5px 6px', textAlign: 'center', color: '#047857' }}>2</td>
            <td style={{ padding: '3.5px 6px', textTransform: 'uppercase', color: '#0f172a' }} colSpan={3}>
              Govt Taxes (Buy Side)
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>2.1</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>FBR Section 236K (Advance Tax on Purchase)</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Filer (sec236k : 3%)</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>{M.fmt(form.tax236K ?? 150000, numbers)}</td>
          </tr>

          {/* SECTION 3 */}
          <tr style={{ background: '#f1f5f9', fontWeight: 800, borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '3.5px 6px', textAlign: 'center', color: '#047857' }}>3</td>
            <td style={{ padding: '3.5px 6px', textTransform: 'uppercase', color: '#0f172a' }} colSpan={3}>
              Handling &amp; Operating Expenses
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>3.1</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Renovation &amp; Repairs</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Property repairs &amp; fixes</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.renovationRepairs ?? 0, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>3.2</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Maintenance &amp; Bills</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Holding upkeep &amp; dues</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.maintenanceBills ?? 0, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>3.3</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Marketing</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Ad &amp; portal promotion</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.marketingExpenses ?? 1000, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>3.4</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Fuel &amp; Travelling</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Site visits &amp; inspection</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.fuelTravelling ?? 1000, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>3.5</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Salary &amp; other Expenses</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Staff &amp; office allocation</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.salaryExpenses ?? 5000, numbers)}</td>
          </tr>

          {/* SECTION 4 */}
          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '3.5px 6px', textAlign: 'center', fontWeight: 800, color: '#047857' }}>4</td>
            <td style={{ padding: '3.5px 6px', fontWeight: 800, color: '#0f172a' }}>REAL ESTATE AGENT FEE</td>
            <td style={{ padding: '3.5px 6px', color: '#64748b' }}>BUY SIDE</td>
            <td style={{ padding: '3.5px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>{M.fmt(form.buySideAgentFee ?? 10000, numbers)}</td>
          </tr>

          {/* PURCHASE PRICE (LANDED BASIS) */}
          <tr style={{ background: '#047857', color: '#ffffff', fontWeight: 900, borderTop: '2px solid #064e3b', borderBottom: '2px solid #064e3b' }}>
            <td style={{ padding: '4.5px 6px', textAlign: 'center' }}>★</td>
            <td style={{ padding: '4.5px 6px', fontSize: '11.5px', letterSpacing: '0.02em' }}>PURCHASE PRICE (ALL-IN LANDED BASIS)</td>
            <td style={{ padding: '4.5px 6px', fontSize: '10px', opacity: 0.9 }}>= Total Investment Cost</td>
            <td style={{ padding: '4.5px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}>
              {M.fmt(sheet.purchasePrice, numbers)}
            </td>
          </tr>

          {/* SALE SIDE */}
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>2.2</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>FBR Section 236C (Advance Tax on Sale)</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Filer (sec236C : 3%)</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.tax236C ?? 150000, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>•</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>REAL ESTATE AGENT FEE</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>SELL SIDE</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.sellSideAgentFee ?? 10000, numbers)}</td>
          </tr>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '3.5px 6px', textAlign: 'center', fontWeight: 800, color: '#047857' }}>5</td>
            <td style={{ padding: '3.5px 6px', fontWeight: 800, color: '#0f172a' }}>GROSS SALE PRICE (incl. CGT)</td>
            <td style={{ padding: '3.5px 6px', color: '#64748b' }}>Current Value / Exit Price</td>
            <td style={{ padding: '3.5px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '11px', color: '#0f172a' }}>
              {M.fmt(form.grossSalePrice ?? 5600000, numbers)}
            </td>
          </tr>

          {/* GROSS PROFIT */}
          <tr style={{ background: '#ecfdf5', fontWeight: 900, borderTop: '1px solid #10b981', borderBottom: '1px solid #10b981' }}>
            <td style={{ padding: '4.5px 6px', textAlign: 'center' }}>•</td>
            <td style={{ padding: '4.5px 6px', fontSize: '11px', color: '#047857' }}>GROSS PROFIT</td>
            <td style={{ padding: '4.5px 6px', color: '#059669', fontSize: '10px' }}>= Exit Value − Landed Basis</td>
            <td style={{ padding: '4.5px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px', color: '#047857' }}>
              {M.fmt(sheet.grossProfit, numbers)}
            </td>
          </tr>

          {/* DEDUCTIONS */}
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>•</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Capital Gain Tax (CGT)</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>= Profit × 15%</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
              {M.fmt(form.cgtAmount ?? Math.max(0, Math.round(sheet.grossProfit * 0.15)), numbers)}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>•</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>ZAQAT</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Zakat fund</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.zakat ?? 10000, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>•</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>CHARITY</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>Welfare</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.charity ?? 5000, numbers)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
            <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>•</td>
            <td style={{ padding: '3px 6px 3px 18px', color: '#334155' }}>Salary &amp; other Expenses (Deduction)</td>
            <td style={{ padding: '3px 6px', color: '#64748b' }}>= F19 Allocation</td>
            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(form.officeExpenseDeduction ?? 5000, numbers)}</td>
          </tr>

          {/* NET MARGIN FINAL ROW */}
          <tr style={{ background: '#dcfce7', borderTop: '2px solid #047857', borderBottom: '2px solid #047857', fontWeight: 900 }}>
            <td style={{ padding: '6px 6px', textAlign: 'center', color: '#047857', fontSize: '13px' }}>✔</td>
            <td style={{ padding: '6px 6px' }}>
              <div style={{ fontSize: '12px', color: '#047857', fontWeight: 900, letterSpacing: '0.02em' }}>
                NET MARGIN (CLEAN PROFIT)
              </div>
              <div style={{ fontSize: '9.5px', color: '#059669', fontWeight: 700, marginTop: '1px' }}>
                Net Margin: {marginPct}% · Cash ROI: {roiPct}%
              </div>
            </td>
            <td style={{ padding: '6px 6px', fontSize: '9.5px', color: '#475569' }}>
              = Gross Profit − CGT − Zakat − Charity − Deduction
            </td>
            <td style={{ padding: '6px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '15px', color: '#047857', fontWeight: 900 }}>
              {M.fmt(sheet.netMargin ?? sheet.netProfit, numbers)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 5. OFFICIAL AUTHORIZATION & SIGNATURES */}
      <div
        style={{
          borderTop: '1px solid #cbd5e1',
          paddingTop: '10px',
          marginTop: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #94a3b8', height: '28px', marginBottom: '3px' }}></div>
          <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>Prepared By</div>
          <div style={{ fontSize: '8.5px', color: '#64748b' }}>Trading Desk / Accounts Officer</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #94a3b8', height: '28px', marginBottom: '3px' }}></div>
          <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>Verified &amp; Audited</div>
          <div style={{ fontSize: '8.5px', color: '#64748b' }}>Chief Financial Officer</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #94a3b8', height: '28px', marginBottom: '3px' }}></div>
          <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>Approved &amp; Accepted</div>
          <div style={{ fontSize: '8.5px', color: '#64748b' }}>Client / Managing Partner</div>
        </div>
      </div>

      {/* 6. DOCUMENT FOOTER */}
      <div
        style={{
          borderTop: '1px dashed #cbd5e1',
          marginTop: '10px',
          paddingTop: '5px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '8.5px',
          color: '#94a3b8',
        }}
      >
        <span>Meridian Estates (Pvt) Ltd · RMS Real Estate Trading Division</span>
        <span>Certified Deal Record · Deal #{sheet.id || 'DRAFT'}</span>
        <span>Page 1 of 1 · Confidential</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SIMPLE, DIRECT COST SHEET (Matches property bussiness erp software.xlsx)
// ---------------------------------------------------------------------------
function SimpleCostSheetView({ activeCostSheetId }: { activeCostSheetId: string | null }) {
  const { numbers, toast, setActiveCostSheetId } = useApp();
  const allSheets: CostSheet[] = (M.DATA as any).costSheets || [];

  const blankDeal = (over: Record<string, any> = {}) =>
    M.calculateCostSheet({
      id: '',
      name: '',
      project: M.PROJECTS[0].name,
      city: M.PROJECTS[0].city,
      type: 'Residential Plot',
      size: '',
      status: 'Active Deal',
      office: M.OFFICES[0],
      netBuyCost: 0,
      ndcFee: 0,
      stampDuty: 0,
      cvt: 0,
      cdaRdaTransferFee: 0,
      societyTransferFee: 0,
      legalCharges: 0,
      developmentCharges: 0,
      otherAcquisition: 0,
      buyerFilerStatus: 'Filer',
      tax236K: 0,
      renovationRepairs: 0,
      maintenanceBills: 0,
      marketingExpenses: 0,
      fuelTravelling: 0,
      salaryExpenses: 0,
      buySideAgentFee: 0,
      sellerFilerStatus: 'Filer',
      tax236C: 0,
      sellSideAgentFee: 0,
      grossSalePrice: 0,
      cgtAmount: 0,
      zakat: 0,
      charity: 0,
      officeExpenseDeduction: 0,
      ...over,
    });

  // The deal asked for: a saved sheet (by its own ID or its property's), else a new sheet
  // started from that property's purchase, else a blank one.
  const wanted = activeCostSheetId && activeCostSheetId !== 'new' ? activeCostSheetId : null;
  const target = wanted ? allSheets.find((s) => s.id === wanted || s.propertyId === wanted) : null;
  const targetProp = wanted && !target ? M.DATA.properties.find((p: any) => p.id === wanted) : null;

  const initialSheet = () => {
    if (target) return target;
    if (targetProp) {
      // A property that is already sold brings its actual sale price and date.
      const sale = M.DATA.sales.find((s: any) => s.propertyId === targetProp.id);
      const exit = sale ? sale.sellingPrice : targetProp.currentValue;
      return blankDeal({
        propertyId: targetProp.id,
        name: targetProp.name,
        project: targetProp.project,
        city: targetProp.location,
        type: targetProp.type,
        size: targetProp.size,
        office: targetProp.office,
        seller: targetProp.seller,
        purchaseDate: targetProp.purchaseDate,
        netBuyCost: targetProp.price,
        tax236K: Math.round(targetProp.price * 0.03),
        grossSalePrice: exit,
        tax236C: Math.round(exit * 0.03),
        saleDate: sale ? sale.date : null,
        buyer: sale ? sale.buyer : undefined,
        status: targetProp.status === 'Sold' ? 'Sold' : 'Active Deal',
      });
    }
    if (activeCostSheetId === 'new') return blankDeal();
    return allSheets[0] || blankDeal();
  };

  const [form, setForm] = useState<any>(initialSheet);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Reload the form only when a different deal is asked for (or it first arrives from the
  // server) — never just because the ledger refreshed, which would wipe unsaved edits.
  const loadKey = `${activeCostSheetId || ''}|${target ? target.id : targetProp ? 'property' : allSheets.length ? 'first' : 'blank'}`;
  useEffect(() => {
    setForm(initialSheet());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey]);

  // Recalculate
  const liveCostSheet: CostSheet = useMemo(() => {
    return M.calculateCostSheet(form);
  }, [form]);

  const updateField = (key: string, val: any) => {
    setForm((prev: any) => {
      const next = { ...prev, [key]: val };
      // Quick auto-updates if netBuyCost or grossSalePrice changes
      if (key === 'netBuyCost') {
        const p = +val || 0;
        next.tax236K = Math.round(p * 0.03);
      }
      if (key === 'grossSalePrice') {
        const sp = +val || 0;
        next.tax236C = Math.round(sp * 0.03);
      }
      return next;
    });
  };

  const handleSelectProperty = (id: string) => {
    setActiveCostSheetId(id);
    if (id === 'new') setForm(blankDeal());
  };

  const handleResetToExcelTemplate = () => {
    const s =
      allSheets.find((x) => x.id === '10002') ||
      M.calculateCostSheet({
        id: '10002',
        name: 'Plot # 940 A Block (Faisal Hills)',
        project: 'Faisal Hills',
        city: 'Islamabad',
        type: 'Residential Plot',
        size: '30x60',
        netBuyCost: 5000000,
        ndcFee: 10000,
        stampDuty: 0,
        cvt: 0,
        cdaRdaTransferFee: 0,
        societyTransferFee: 0,
        legalCharges: 0,
        developmentCharges: 0,
        otherAcquisition: 0,
        buyerFilerStatus: 'Filer',
        tax236K: 150000,
        renovationRepairs: 0,
        maintenanceBills: 0,
        marketingExpenses: 1000,
        fuelTravelling: 1000,
        salaryExpenses: 5000,
        buySideAgentFee: 10000,
        sellerFilerStatus: 'Filer',
        tax236C: 150000,
        sellSideAgentFee: 10000,
        grossSalePrice: 5600000,
        cgtAmount: 61950,
        zakat: 10000,
        charity: 5000,
        officeExpenseDeduction: 5000,
      });
    setForm(s);
    toast('Loaded Excel template: Plot # 940 A Block (Faisal Hills)');
  };

  const handleSave = () => {
    if (!String(form.name || '').trim()) {
      toast('Enter the property name under “Deal details” before saving');
      return;
    }
    if (!ledgersReady()) {
      toast('Your records are still loading — please try again in a moment');
      return;
    }
    const saved = M.saveCostSheet(liveCostSheet);
    setForm(saved);
    setActiveCostSheetId(saved.id);
    toast(`Cost Sheet #${saved.id} saved!`);
  };

  const dateValue = (d: any) => (d ? M.dateInput(M.parseDate(d)) : '');

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <div className="page" style={{ paddingTop: '8px' }}>
      {/* SCREEN VIEW (INTERACTIVE FORM) */}
      <div className="cost-sheet-screen-only">
        <PrintHead title="Property Business Cost Sheet" />
        <div
          className="phead"
          style={{
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '18px', margin: 0, letterSpacing: '-0.02em' }}>Property Business Cost Sheet</h1>
            <span className="u" style={{ fontSize: '12px', color: 'var(--ink-3)' }}>پراپرٹی بزنس لاگت شیٹ</span>
          </div>
          <div className="acts" data-noprint="1" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
            <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--ink)' }}>Select Deal:</span>
            <select
              className="fldsel"
              style={{ minWidth: '240px', fontWeight: 600, height: '30px', padding: '2px 8px' }}
              value={liveCostSheet.id || 'new'}
              onChange={(e) => handleSelectProperty(e.target.value)}
            >
              <option value="new">➕ New Blank Deal</option>
              {allSheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.name} ({s.project})
                </option>
              ))}
            </select>
            <button type="button" className="btn" style={{ height: '30px', padding: '0 8px', fontSize: '12px' }} onClick={handleResetToExcelTemplate} title="Load Plot 940 from Excel">
              <Icon name="history" /> Excel Template
            </button>
            <button
              type="button"
              className="btn pri"
              style={{
                height: '30px',
                padding: '0 11px',
                fontSize: '12px',
                fontWeight: 700,
                background: '#047857',
                borderColor: '#059669',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              onClick={() => setShowPrintModal(true)}
              title="Open and print official Cost Sheet statement"
            >
              <Icon name="print" /> Print Cost Sheet
            </button>
            <button type="button" className="btn pri" style={{ height: '30px', padding: '0 10px', fontSize: '12px' }} onClick={handleSave}>
              <Icon name="ok" /> Save
            </button>
          </div>
        </div>

      {/* DEAL DETAILS — which property this sheet is for */}
      <div className="panel" style={{ marginBottom: '8px' }} data-noprint="1">
        <div className="panel-h">
          <h3>Deal details</h3>
          <span className="sub">Which property this cost sheet is for</span>
        </div>
        <div className="panel-b">
          <div className="formgrid">
            <div className="fld">
              <label htmlFor="cs-name">Property name *</label>
              <input id="cs-name" value={form.name || ''} placeholder="Plot 940, A Block" onChange={(e) => updateField('name', e.target.value)} />
            </div>
            <div className="fld">
              <label htmlFor="cs-project">Project / society</label>
              <input id="cs-project" list="cs-projects" value={form.project || ''} onChange={(e) => updateField('project', e.target.value)} />
              <datalist id="cs-projects">
                {M.PROJECTS.map((p: any) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="fld">
              <label htmlFor="cs-city">City</label>
              <input id="cs-city" value={form.city || ''} onChange={(e) => updateField('city', e.target.value)} />
            </div>
            <div className="fld">
              <label htmlFor="cs-type">Property type</label>
              <select id="cs-type" value={form.type || M.TYPES[0]} onChange={(e) => updateField('type', e.target.value)}>
                {M.TYPES.map((t: string) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="fld">
              <label htmlFor="cs-size">Size</label>
              <input id="cs-size" value={form.size || ''} placeholder="10 Marla" onChange={(e) => updateField('size', e.target.value)} />
            </div>
            <div className="fld">
              <label htmlFor="cs-status">Deal status</label>
              <select id="cs-status" value={form.status || 'Active Deal'} onChange={(e) => updateField('status', e.target.value)}>
                {['Draft', 'Active Deal', 'Reserved', 'Sold'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="fld">
              <label htmlFor="cs-pdate">Purchase date</label>
              <input id="cs-pdate" type="date" value={dateValue(form.purchaseDate)} onChange={(e) => updateField('purchaseDate', e.target.value || M.TODAY)} />
            </div>
            <div className="fld">
              <label htmlFor="cs-sdate">Sale date</label>
              <input id="cs-sdate" type="date" value={dateValue(form.saleDate)} onChange={(e) => updateField('saleDate', e.target.value || null)} />
            </div>
            <div className="fld">
              <label htmlFor="cs-prop">Linked property</label>
              <select id="cs-prop" value={form.propertyId || ''} onChange={(e) => updateField('propertyId', e.target.value)}>
                <option value="">— Not linked —</option>
                {M.DATA.properties.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
              </select>
              <span className="hint">Saving updates this property’s cost and value.</span>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY TABLE (EXACT ROWS 2–4 OF EXCEL) */}
      <div className="panel" style={{ marginBottom: '8px', overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--rule-2)' }}>
              <th style={{ padding: '5px 8px' }}>ID</th>
              <th style={{ padding: '5px 8px' }}>Property</th>
              <th style={{ padding: '5px 8px' }}>Type</th>
              <th style={{ padding: '5px 8px' }}>Project</th>
              <th style={{ padding: '5px 8px' }}>City</th>
              <th style={{ padding: '5px 8px' }}>Size</th>
              <th style={{ padding: '5px 8px', textAlign: 'right' }}>Net Buy Cost</th>
              <th style={{ padding: '5px 8px', textAlign: 'right' }}>Agent Commission</th>
              <th style={{ padding: '5px 8px', textAlign: 'right' }}>Current value</th>
              <th style={{ padding: '5px 8px', textAlign: 'right' }}>GROSS PROFIT</th>
              <th style={{ padding: '5px 8px', textAlign: 'right' }}>NET MARGIN</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontWeight: 600 }}>
              <td style={{ padding: '5px 8px', fontFamily: 'var(--mono)' }}>{liveCostSheet.id}</td>
              <td style={{ padding: '5px 8px' }}>{liveCostSheet.name}</td>
              <td style={{ padding: '5px 8px' }}>{liveCostSheet.type}</td>
              <td style={{ padding: '5px 8px' }}>{liveCostSheet.project}</td>
              <td style={{ padding: '5px 8px' }}>{liveCostSheet.city}</td>
              <td style={{ padding: '5px 8px', fontFamily: 'var(--mono)' }}>{liveCostSheet.size}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                {M.fmt(liveCostSheet.netBuyCost || liveCostSheet.purchasePrice, numbers)}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                {M.fmt(liveCostSheet.totalCommissions, numbers)}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                {M.fmt(liveCostSheet.grossSalePrice || liveCostSheet.sellingPrice, numbers)}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--good)', fontWeight: 700 }}>
                {M.fmt(liveCostSheet.grossProfit, numbers)}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--good)', fontWeight: 800 }}>
                {M.fmt(liveCostSheet.netMargin ?? liveCostSheet.netProfit, numbers)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* DETAILED COST SHEET LEDGER (EXACT ROWS 6–31 OF EXCEL) */}
      <div
        className="panel"
        style={{
          maxWidth: '820px',
          margin: '0 auto',
          border: '2px solid var(--rule-2)',
          background: 'var(--card)',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '2px solid var(--brand)',
            background: 'var(--paper-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--brand)' }}>
              Cost Sheet Ledger
            </span>
            <h2 style={{ fontSize: '17px', margin: '2px 0 0', color: 'var(--ink)' }}>
              {liveCostSheet.name} · {liveCostSheet.project}
            </h2>
          </div>
          <span className="tag ok" style={{ fontSize: '12px', fontWeight: 700 }}>
            ID: {liveCostSheet.id}
          </span>
        </div>

        <div style={{ padding: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule-2)', color: 'var(--ink-2)', fontSize: '11.5px' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', width: '50px' }}>#</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Description</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', width: '180px' }}>Rate / Detail</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: '180px' }}>Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>

              {/* NET BUY COST (ROW 6) */}
              <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '8px', fontWeight: 700 }}></td>
                <td style={{ padding: '8px', fontWeight: 700, color: 'var(--brand)' }}>
                  NET BUY COST
                </td>
                <td style={{ padding: '8px', color: 'var(--ink-2)' }}>Base property price</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="50000"
                    style={{ width: '150px', padding: '4px 8px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '13px' }}
                    value={form.netBuyCost ?? form.purchasePrice ?? 5000000}
                    onChange={(e) => updateField('netBuyCost', +e.target.value)}
                  />
                </td>
              </tr>

              {/* SECTION 1: SOCIETY / GOVT TRANSFER COST */}
              <tr style={{ background: 'var(--paper)', fontWeight: 700 }}>
                <td style={{ padding: '6px 8px' }}>1</td>
                <td style={{ padding: '6px 8px' }} colSpan={3}>
                  SOCIETY / GOVT TRANSFER COST
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>1.0</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>NDC &amp; Verification Fee</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Verification fee</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.ndcFee ?? 10000}
                    onChange={(e) => updateField('ndcFee', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>1.1</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>Provincial Stamp Duty</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>1% Stamp</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.stampDuty ?? 0}
                    onChange={(e) => updateField('stampDuty', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}></td>
                <td style={{ padding: '5px 8px 5px 24px' }}>Capital Value Tax (CVT)</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>1% CVT</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.cvt ?? 0}
                    onChange={(e) => updateField('cvt', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>1.2</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>Govt Authority CDA/RDA Transfer Fee</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>0.5% of sale value</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.cdaRdaTransferFee ?? 0}
                    onChange={(e) => updateField('cdaRdaTransferFee', +e.target.value)}
                  />
                </td>
              </tr>

              {/* SECTION 2: GOVT TAXES (BUY SIDE) */}
              <tr style={{ background: 'var(--paper)', fontWeight: 700 }}>
                <td style={{ padding: '6px 8px' }}>2</td>
                <td style={{ padding: '6px 8px' }} colSpan={3}>
                  GOVT TAXES
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>2.1</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>FBR Section 236K (Advance Tax on Purchase)</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Filer (sec236k : 3%)</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="5000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}
                    value={form.tax236K ?? 150000}
                    onChange={(e) => updateField('tax236K', +e.target.value)}
                  />
                </td>
              </tr>

              {/* SECTION 3: HANDLING \ EXPENSES */}
              <tr style={{ background: 'var(--paper)', fontWeight: 700 }}>
                <td style={{ padding: '6px 8px' }}>3</td>
                <td style={{ padding: '6px 8px' }} colSpan={3}>
                  HANDLING \ EXPENSES
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>3.1</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>Renovation &amp; Repairs</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Property repairs</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.renovationRepairs ?? 0}
                    onChange={(e) => updateField('renovationRepairs', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>3.2</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>Maintenance &amp; Bills</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Holding upkeep</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.maintenanceBills ?? 0}
                    onChange={(e) => updateField('maintenanceBills', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>3.3</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>Marketing</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Ad &amp; portal</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="500"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.marketingExpenses ?? 1000}
                    onChange={(e) => updateField('marketingExpenses', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>3.4</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>Fuel &amp; Travelling</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Visits</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="500"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.fuelTravelling ?? 1000}
                    onChange={(e) => updateField('fuelTravelling', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>3.5</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>Salary &amp; other Expenses</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Staff &amp; office</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.salaryExpenses ?? 5000}
                    onChange={(e) => updateField('salaryExpenses', +e.target.value)}
                  />
                </td>
              </tr>

              {/* SECTION 4: REAL ESTATE AGENT FEE (BUY SIDE) */}
              <tr style={{ borderBottom: '1px solid var(--rule-2)' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700 }}>4</td>
                <td style={{ padding: '6px 8px', fontWeight: 700 }}>REAL ESTATE AGENT FEE</td>
                <td style={{ padding: '6px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>BUY SIDE</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}
                    value={form.buySideAgentFee ?? 10000}
                    onChange={(e) => updateField('buySideAgentFee', +e.target.value)}
                  />
                </td>
              </tr>

              {/* ROW 21: PURCHASE PRICE (All-in Landed Basis = SUM(F6:F20)) */}
              <tr style={{ background: 'var(--brand)', color: '#fff', fontWeight: 800 }}>
                <td style={{ padding: '8px' }}></td>
                <td style={{ padding: '8px', fontSize: '13px' }}>PURCHASE PRICE</td>
                <td style={{ padding: '8px', fontSize: '11.5px', opacity: 0.9 }}>= Landed Basis</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '14px' }}>
                  {M.fmt(liveCostSheet.purchasePrice, numbers)}
                </td>
              </tr>

              {/* SALE SIDE (ROWS 22–24) */}
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px', color: 'var(--ink-3)' }}>2.2</td>
                <td style={{ padding: '5px 8px 5px 24px' }}>FBR Section 236C (Advance Tax on Sale)</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Filer (sec236C : 3%)</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="5000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.tax236C ?? 150000}
                    onChange={(e) => updateField('tax236C', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px' }}></td>
                <td style={{ padding: '5px 8px 5px 24px' }}>REAL ESTATE AGENT FEE</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>SELL SIDE</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.sellSideAgentFee ?? 10000}
                    onChange={(e) => updateField('sellSideAgentFee', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ background: 'rgba(18, 166, 124, 0.08)', borderBottom: '1px solid var(--rule-2)' }}>
                <td style={{ padding: '8px' }}></td>
                <td style={{ padding: '8px', fontWeight: 700, color: 'var(--good)' }}>
                  GROSS SALE PRICE (incl. CGT)
                </td>
                <td style={{ padding: '8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Current Value / Exit</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="50000"
                    style={{ width: '150px', padding: '4px 8px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '13px' }}
                    value={form.grossSalePrice ?? form.sellingPrice ?? 5600000}
                    onChange={(e) => updateField('grossSalePrice', +e.target.value)}
                  />
                </td>
              </tr>

              {/* ROW 26: GROSS PROFIT */}
              <tr style={{ background: 'var(--paper-2)', fontWeight: 800, borderBottom: '1px solid var(--rule-2)' }}>
                <td style={{ padding: '8px' }}></td>
                <td style={{ padding: '8px', fontSize: '13px' }}>GROSS PROFIT</td>
                <td style={{ padding: '8px', fontSize: '11.5px', color: 'var(--ink-2)' }}>= Exit − Landed</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '14px' }} className={liveCostSheet.grossProfit >= 0 ? 'pos' : 'neg'}>
                  {M.fmt(liveCostSheet.grossProfit, numbers)}
                </td>
              </tr>

              {/* ROWS 27–30: STATUTORY & PURIFICATION DEDUCTIONS */}
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px' }}></td>
                <td style={{ padding: '5px 8px 5px 24px', color: 'var(--ink-2)' }}>Capital Gain Tax (CGT)</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>= F26 * 15%</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="500"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.cgtAmount ?? Math.max(0, Math.round(liveCostSheet.grossProfit * 0.15))}
                    onChange={(e) => updateField('cgtAmount', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px' }}></td>
                <td style={{ padding: '5px 8px 5px 24px', color: 'var(--ink-2)' }}>ZAQAT</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Zakat fund</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.zakat ?? 10000}
                    onChange={(e) => updateField('zakat', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: '5px 8px' }}></td>
                <td style={{ padding: '5px 8px 5px 24px', color: 'var(--ink-2)' }}>CHARITY</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>Welfare</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="500"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.charity ?? 5000}
                    onChange={(e) => updateField('charity', +e.target.value)}
                  />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--rule-2)' }}>
                <td style={{ padding: '5px 8px' }}></td>
                <td style={{ padding: '5px 8px 5px 24px', color: 'var(--ink-2)' }}>Salary &amp; other Expenses (Deduction)</td>
                <td style={{ padding: '5px 8px', color: 'var(--ink-2)', fontSize: '11.5px' }}>= F19</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)' }}
                    value={form.officeExpenseDeduction ?? form.salaryExpenses ?? 5000}
                    onChange={(e) => updateField('officeExpenseDeduction', +e.target.value)}
                  />
                </td>
              </tr>

              {/* ROW 31: NET MARGIN */}
              <tr style={{ background: 'var(--good-wash)', borderTop: '2px solid var(--ink)', fontWeight: 900, fontSize: '15px' }}>
                <td style={{ padding: '12px 8px' }}></td>
                <td style={{ padding: '12px 8px' }}>
                  NET MARGIN
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--good)' }}>
                    Net Margin: {(liveCostSheet.netMarginPct || 0).toFixed(1)}% · Cash ROI: {(liveCostSheet.roiPct || 0).toFixed(1)}%
                  </div>
                </td>
                <td style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--ink-2)' }}>
                  = F26 − F28 − F29 − F27 − F19
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '18px' }} className="pos">
                  {M.fmt(liveCostSheet.netMargin ?? liveCostSheet.netProfit, numbers)}
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* PRINT-ONLY EMBEDDED SHEET (Ensures standard Ctrl+P prints the official document) */}
      <div className="cost-sheet-print-only">
        <PrintableCostSheetDoc sheet={liveCostSheet} form={form} numbers={numbers} />
      </div>

      {/* INTERACTIVE PRINT PREVIEW MODAL */}
      {showPrintModal && (
        <div
          className="cost-sheet-print-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrintModal(false);
          }}
        >
          <div className="cost-sheet-print-modal-dialog">
            <div className="cost-sheet-print-modal-header" data-noprint="1">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: '#047857',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="print" size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#ffffff' }}>
                    Official Cost Sheet Printout — #{liveCostSheet.id}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {liveCostSheet.name} ({liveCostSheet.project}) · Formatted for A4 / PDF Export
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn pri"
                  style={{
                    height: '32px',
                    padding: '0 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    background: '#047857',
                    borderColor: '#059669',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                >
                  <Icon name="print" /> Print / Save as PDF
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    fontSize: '12px',
                    background: '#334155',
                    color: '#ffffff',
                    borderColor: '#475569',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowPrintModal(false)}
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="cost-sheet-print-modal-body">
              <PrintableCostSheetDoc sheet={liveCostSheet} form={form} numbers={numbers} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
