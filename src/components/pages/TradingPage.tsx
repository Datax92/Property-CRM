'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag, PrintHead } from '../Shared';
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
    setActiveCostSheetId,
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
            onClick={() => {
              setActiveCostSheetId('10002');
              openCostSheet('10002');
            }}
          >
            <Icon name="calculator" /> Open Cost Sheet (Plot # 940)
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
// SIMPLE, DIRECT COST SHEET (Matches property bussiness erp software.xlsx)
// ---------------------------------------------------------------------------
function SimpleCostSheetView({ activeCostSheetId }: { activeCostSheetId: string | null }) {
  const { numbers, toast, goto } = useApp();
  const allSheets: CostSheet[] = (M.DATA as any).costSheets || [];

  // Default to Plot 940 from Excel
  const defaultSheet = useMemo(() => {
    if (activeCostSheetId === 'new') {
      return M.calculateCostSheet({
        id: '10003',
        name: 'New Plot / Unit Deal',
        project: 'Faisal Hills',
        city: 'Islamabad',
        type: 'Residential Plot',
        size: '30x60',
        netBuyCost: 5000000,
        ndcFee: 10000,
        stampDuty: 0,
        cvt: 0,
        cdaRdaTransferFee: 0,
        tax236K: 150000,
        renovationRepairs: 0,
        maintenanceBills: 0,
        marketingExpenses: 1000,
        fuelTravelling: 1000,
        salaryExpenses: 5000,
        buySideAgentFee: 10000,
        tax236C: 150000,
        sellSideAgentFee: 10000,
        grossSalePrice: 5600000,
        cgtAmount: 61950,
        zakat: 10000,
        charity: 5000,
        officeExpenseDeduction: 5000,
      });
    }

    if (activeCostSheetId) {
      const found = allSheets.find((s) => s.id === activeCostSheetId || s.propertyId === activeCostSheetId);
      if (found) return found;
    }

    return allSheets[0] || ({} as CostSheet);
  }, [activeCostSheetId, allSheets]);

  const [form, setForm] = useState<any>(defaultSheet);

  useEffect(() => {
    setForm(defaultSheet);
  }, [defaultSheet]);

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
    if (id === 'new') {
      goto('trading/calculator');
      setForm(
        M.calculateCostSheet({
          id: '10003',
          name: 'New Plot Deal',
          project: 'Faisal Hills',
          city: 'Islamabad',
          type: 'Residential Plot',
          size: '30x60',
          netBuyCost: 5000000,
          ndcFee: 10000,
          stampDuty: 0,
          cvt: 0,
          cdaRdaTransferFee: 0,
          tax236K: 150000,
          renovationRepairs: 0,
          maintenanceBills: 0,
          marketingExpenses: 1000,
          fuelTravelling: 1000,
          salaryExpenses: 5000,
          buySideAgentFee: 10000,
          tax236C: 150000,
          sellSideAgentFee: 10000,
          grossSalePrice: 5600000,
          cgtAmount: 61950,
          zakat: 10000,
          charity: 5000,
          officeExpenseDeduction: 5000,
        })
      );
      return;
    }
    const found = allSheets.find((s) => s.id === id || s.propertyId === id);
    if (found) setForm(found);
  };

  const handleResetToExcelTemplate = () => {
    const s = allSheets.find((x) => x.id === '10002') || allSheets[0];
    if (s) {
      setForm(s);
      toast('Reset to Excel template: Plot # 940 A Block (Faisal Hills)');
    }
  };

  const handleSave = () => {
    const saved = M.saveCostSheet(liveCostSheet);
    setForm(saved);
    toast(`Cost Sheet #${saved.id} saved!`);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <div className="page" style={{ paddingTop: '8px' }}>
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
            value={liveCostSheet.id || ''}
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
          <button type="button" className="btn" style={{ height: '30px', padding: '0 8px', fontSize: '12px' }} onClick={handlePrint}>
            <Icon name="print" /> Print
          </button>
          <button type="button" className="btn pri" style={{ height: '30px', padding: '0 10px', fontSize: '12px' }} onClick={handleSave}>
            <Icon name="ok" /> Save
          </button>
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
  );
}
