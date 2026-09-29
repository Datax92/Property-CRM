'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag, Fig, FigText } from '../Shared';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';
import type { CostSheet, FilerStatus } from '../../lib/types';

export function TradingPage() {
  const {
    tab,
    effectiveFilters: f,
    range: r,
    numbers,
    activeCostSheetId,
    setActiveCostSheetId,
    openCostSheet,
    toast,
  } = useApp();

  const meta = PAGE_META[`trading/${tab}`] || { t: 'Cost Sheets' };

  // =========================================================================
  // TAB 1: COST SHEET REGISTER
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

    const totalLanded = rows.reduce((a, s) => a + s.totalLandedCost, 0);
    const totalRev = rows.reduce((a, s) => a + s.sellingPrice, 0);
    const totalNetProfit = rows.reduce((a, s) => a + s.netProfit, 0);
    const totalTaxes = rows.reduce((a, s) => a + s.totalTaxesToPay, 0);
    const blendedMargin = totalRev > 0 ? (totalNetProfit / totalRev) * 100 : 0;

    const summaryPairs: [string, string][] = [
      ['Total trade deals', M.fmtNum(rows.length)],
      ['Landed capital outlay', M.fmt(totalLanded, numbers)],
      ['Exit revenue (realized/projected)', M.fmt(totalRev, numbers)],
      ['Total net profit', M.fmt(totalNetProfit, numbers)],
      ['Blended net margin', `${blendedMargin.toFixed(1)}%`],
      ['Total tax obligations', M.fmt(totalTaxes, numbers)],
    ];

    const cols = [
      { key: 'id', label: 'Sheet ID', cls: 'mono' },
      { key: 'name', label: 'Property & Society', render: (cs: CostSheet) => (
        <div>
          <b>{cs.name}</b>
          <div style={{ fontSize: '11px', color: 'var(--ink-2)' }}>{cs.size} · {cs.project} ({cs.city})</div>
        </div>
      )},
      { key: 'status', label: 'Status', render: (cs: CostSheet) => <Tag text={cs.status} /> },
      { key: 'purchasePrice', label: 'Purchase price', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.purchasePrice, numbers) },
      { key: 'totalAcquisitionExtras', label: 'Acq. extras', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.totalAcquisitionExtras, numbers) },
      { key: 'totalCarryingCosts', label: 'Carrying costs', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.totalCarryingCosts, numbers) },
      { key: 'totalLandedCost', label: 'Total landed cost', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => <b>{M.fmt(cs.totalLandedCost, numbers)}</b> },
      { key: 'sellingPrice', label: 'Exit price', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.sellingPrice, numbers) },
      { key: 'totalCommissions', label: 'Commissions', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.totalCommissions, numbers) },
      { key: 'totalTaxesToPay', label: 'Taxes to pay', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => <span className="neg">{M.fmt(cs.totalTaxesToPay, numbers)}</span> },
      { key: 'grossProfit', label: 'Gross profit', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => (
        <span className={cs.grossProfit >= 0 ? 'pos' : 'neg'}>{M.fmt(cs.grossProfit, numbers)}</span>
      )},
      { key: 'netProfit', label: 'Net profit', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => (
        <span className={cs.netProfit >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>
          {M.fmt(cs.netProfit, numbers)}
        </span>
      )},
      { key: 'netMarginPct', label: 'Net margin', a: 'r' as const, cls: 'mono', render: (cs: CostSheet) => (
        <span className={cs.netMarginPct >= 15 ? 'pos' : cs.netMarginPct > 0 ? '' : 'neg'} style={{ fontWeight: 600 }}>
          {cs.netMarginPct.toFixed(1)}%
        </span>
      )},
      { key: 'breakEvenPrice', label: 'Break-even', a: 'r' as const, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.breakEvenPrice, numbers) },
      { key: 'actions', label: 'Action', render: (cs: CostSheet) => (
        <button
          type="button"
          className="btn"
          style={{ padding: '3px 8px', fontSize: '11.5px', height: '26px' }}
          onClick={() => openCostSheet(cs.id)}
          title="Open complete interactive cost sheet"
        >
          <Icon name="calculator" size={13} /> View Sheet
        </button>
      )},
    ];

    return (
      <PageShell
        title={meta.t}
        u={meta.u}
        p={meta.p}
        acts={
          <button
            type="button"
            className="btn pri"
            onClick={() => {
              setActiveCostSheetId('new');
              openCostSheet('new');
            }}
          >
            <Icon name="plus" /> New Trade Calculator
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <div className="note" style={{ marginBottom: '14px' }} data-noprint="1">
          <span className="ic">
            <Icon name="info" />
          </span>
          <div>
            <b>Real Estate Trading Cost Sheet Register:</b> Every deal is structured with full landed cost basis (purchase price + stamp duty + CVT + 236K advance tax + society transfer + NDC + renovations + carrying costs) linked to sale realization, dual commissions, 236C, CGT slabs, and net margins. Click <b>View Sheet</b> on any row to open the live calculator.
          </div>
        </div>
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  // =========================================================================
  // TAB 3: TRADING ANALYTICS
  // =========================================================================
  if (tab === 'analytics') {
    const costSheets: CostSheet[] = (M.DATA as any).costSheets || [];
    const stats = M.computeTradingKPIs(costSheets);

    const summaryPairs: [string, string][] = [
      ['Total properties traded', M.fmtNum(stats.totalDeals)],
      ['Closed deals', M.fmtNum(stats.closedDeals)],
      ['Active pipeline deals', M.fmtNum(stats.activeDeals)],
      ['Total capital deployed', M.fmt(stats.totalCapitalInvested, numbers)],
      ['Realized trading revenue', M.fmt(stats.totalRevenue, numbers)],
      ['Realized net gain', M.fmt(stats.realizedNetProfit, numbers)],
      ['Blended net margin', `${stats.blendedNetMargin.toFixed(1)}%`],
      ['Total deal taxes paid', M.fmt(stats.totalTaxesPaid, numbers)],
      ['Average trade duration', `${stats.avgHoldingDays} days`],
    ];

    // Project breakdown
    const prjMap: Record<string, { count: number; invested: number; rev: number; net: number; taxes: number }> = {};
    costSheets.forEach((cs) => {
      if (!prjMap[cs.project]) {
        prjMap[cs.project] = { count: 0, invested: 0, rev: 0, net: 0, taxes: 0 };
      }
      prjMap[cs.project].count++;
      prjMap[cs.project].invested += cs.totalLandedCost;
      prjMap[cs.project].rev += cs.sellingPrice;
      prjMap[cs.project].net += cs.netProfit;
      prjMap[cs.project].taxes += cs.totalTaxesToPay;
    });

    const prjRows = Object.keys(prjMap).map((prj) => {
      const d = prjMap[prj];
      const margin = d.rev > 0 ? (d.net / d.rev) * 100 : 0;
      const roi = d.invested > 0 ? (d.net / d.invested) * 100 : 0;
      return {
        id: prj,
        project: prj,
        count: d.count,
        invested: d.invested,
        rev: d.rev,
        net: d.net,
        taxes: d.taxes,
        margin,
        roi,
      };
    }).sort((a, b) => b.net - a.net);

    const prjCols = [
      { key: 'project', label: 'Society / Project' },
      { key: 'count', label: 'Deals', a: 'r' as const, cls: 'mono', render: (r: any) => M.fmtNum(r.count) },
      { key: 'invested', label: 'Capital invested', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.invested, numbers) },
      { key: 'rev', label: 'Trading revenue', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.rev, numbers) },
      { key: 'taxes', label: 'Total taxes paid', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => <span className="neg">{M.fmt(r.taxes, numbers)}</span> },
      { key: 'net', label: 'Net trading profit', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => (
        <span className={r.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>{M.fmt(r.net, numbers)}</span>
      )},
      { key: 'margin', label: 'Net margin', a: 'r' as const, cls: 'mono', render: (r: any) => (
        <span className={r.margin >= 15 ? 'pos' : ''} style={{ fontWeight: 600 }}>{r.margin.toFixed(1)}%</span>
      )},
      { key: 'roi', label: 'Cash ROI', a: 'r' as const, cls: 'mono', render: (r: any) => (
        <span className={r.roi >= 20 ? 'pos' : ''}>{r.roi.toFixed(1)}%</span>
      )},
    ];

    // Property Type Breakdown
    const typeMap: Record<string, { count: number; invested: number; rev: number; net: number }> = {};
    costSheets.forEach((cs) => {
      if (!typeMap[cs.type]) {
        typeMap[cs.type] = { count: 0, invested: 0, rev: 0, net: 0 };
      }
      typeMap[cs.type].count++;
      typeMap[cs.type].invested += cs.totalLandedCost;
      typeMap[cs.type].rev += cs.sellingPrice;
      typeMap[cs.type].net += cs.netProfit;
    });

    const typeRows = Object.keys(typeMap).map((tp) => {
      const d = typeMap[tp];
      return {
        id: tp,
        type: tp,
        count: d.count,
        invested: d.invested,
        rev: d.rev,
        net: d.net,
        margin: d.rev > 0 ? (d.net / d.rev) * 100 : 0,
      };
    }).sort((a, b) => b.net - a.net);

    const typeCols = [
      { key: 'type', label: 'Property Category' },
      { key: 'count', label: 'Deals', a: 'r' as const, cls: 'mono', render: (r: any) => M.fmtNum(r.count) },
      { key: 'invested', label: 'Capital invested', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.invested, numbers) },
      { key: 'rev', label: 'Revenue', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.rev, numbers) },
      { key: 'net', label: 'Net trading profit', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => (
        <span className={r.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>{M.fmt(r.net, numbers)}</span>
      )},
      { key: 'margin', label: 'Net margin', a: 'r' as const, cls: 'mono', render: (r: any) => (
        <span className={r.margin >= 15 ? 'pos' : ''} style={{ fontWeight: 600 }}>{r.margin.toFixed(1)}%</span>
      )},
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p}>
        <SummaryKpis pairs={summaryPairs} />
        <div className="grid c2" style={{ marginBottom: '14px' }}>
          <div className="panel">
            <div className="panel-h">
              <h3>Trading Profitability by Society / Project</h3>
              <span className="sub">Ranked by Net Realized Profit</span>
            </div>
            <div className="panel-b" style={{ padding: 0 }}>
              <DataTable cols={prjCols} rows={prjRows} totals={true} />
            </div>
          </div>
          <div className="panel">
            <div className="panel-h">
              <h3>Performance by Property Category</h3>
              <span className="sub">Plots vs Houses vs Commercial</span>
            </div>
            <div className="panel-b" style={{ padding: 0 }}>
              <DataTable cols={typeCols} rows={typeRows} totals={true} />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // =========================================================================
  // TAB 2: INTERACTIVE DEAL COST SHEET & CALCULATOR
  // =========================================================================
  return <DealCalculatorView activeCostSheetId={activeCostSheetId} />;
}

// ---------------------------------------------------------------------------
// DEAL CALCULATOR VIEW COMPONENT
// ---------------------------------------------------------------------------
function DealCalculatorView({ activeCostSheetId }: { activeCostSheetId: string | null }) {
  const { numbers, toast, goto } = useApp();
  const allSheets: CostSheet[] = (M.DATA as any).costSheets || [];

  // Active sheet selection or default to first
  const defaultSheet = useMemo(() => {
    if (activeCostSheetId === 'new') {
      return M.calculateCostSheet({
        id: '',
        propertyId: '',
        name: 'New Plot / Unit Deal',
        project: 'DHA Phase 6',
        city: 'Lahore',
        type: 'Residential Plot',
        size: '10 Marla',
        block: 'Block A',
        unit: '101',
        status: 'Active Deal',
        office: 'DHA Branch — Lahore',
        purchaseDate: M.TODAY,
        saleDate: null,
        heldDays: 60,
        purchasePrice: 25000000,
        purchaseBrokeragePct: 1.0,
        buyerFilerStatus: 'Filer' as FilerStatus,
        stampDuty: 250000,
        cvt: 250000,
        tax236K: 750000,
        societyTransferFee: 350000,
        ndcFee: 25000,
        legalCharges: 40000,
        developmentCharges: 0,
        otherAcquisition: 15000,
        renovationRepairs: 100000,
        maintenanceHolding: 50000,
        marketingExpenses: 40000,
        sellingPrice: 32000000,
        saleBrokeragePct: 2.0,
        sellerFilerStatus: 'Filer' as FilerStatus,
        tax236C: 960000,
        cgtRatePct: 15.0,
        cgtAmount: 650000,
        municipalTax: 160000,
        otherSellingExpenses: 35000,
        seller: 'Private Seller — A. Rasheed',
        buyer: 'Prospective Investor',
        notes: 'Pre-deal feasibility simulation for flipping 10 Marla in DHA Phase 6',
      });
    }

    if (activeCostSheetId) {
      const found = allSheets.find((s) => s.id === activeCostSheetId || s.propertyId === activeCostSheetId);
      if (found) return found;
    }

    return allSheets[0] || ({} as CostSheet);
  }, [activeCostSheetId, allSheets]);

  // Form state
  const [form, setForm] = useState<any>(defaultSheet);

  useEffect(() => {
    setForm(defaultSheet);
  }, [defaultSheet]);

  // Real-time recalculation
  const liveCostSheet: CostSheet = useMemo(() => {
    return M.calculateCostSheet(form);
  }, [form]);

  // Real-time sensitivity scenarios
  const sensitivity = useMemo(() => {
    return M.computeSensitivityMatrix(liveCostSheet);
  }, [liveCostSheet]);

  const updateField = (key: string, val: any) => {
    setForm((prev: any) => {
      const next = { ...prev, [key]: val };
      
      // Auto-update taxes if filer status changed
      if (key === 'buyerFilerStatus' || key === 'purchasePrice') {
        const p = key === 'purchasePrice' ? +val : +next.purchasePrice;
        const status = key === 'buyerFilerStatus' ? val : next.buyerFilerStatus;
        const kRate = status === 'Non-Filer' ? 0.12 : status === 'Late Filer' ? 0.06 : 0.03;
        next.tax236K = Math.round(p * kRate);
        next.stampDuty = Math.round(p * 0.01);
        next.cvt = Math.round(p * 0.01);
      }
      if (key === 'sellerFilerStatus' || key === 'sellingPrice') {
        const sp = key === 'sellingPrice' ? +val : +next.sellingPrice;
        const status = key === 'sellerFilerStatus' ? val : next.sellerFilerStatus;
        const cRate = status === 'Non-Filer' ? 0.10 : status === 'Late Filer' ? 0.06 : 0.03;
        next.tax236C = Math.round(sp * cRate);
      }
      return next;
    });
  };

  const handleSelectProperty = (propId: string) => {
    if (propId === 'new') {
      goto('trading/calculator');
      setForm(M.calculateCostSheet({
        id: '',
        propertyId: '',
        name: 'New Custom Trade Deal',
        project: 'DHA Phase 6',
        city: 'Lahore',
        type: 'Residential Plot',
        size: '1 Kanal',
        block: 'Block C',
        unit: '24',
        status: 'Active Deal',
        office: 'DHA Branch — Lahore',
        purchaseDate: M.TODAY,
        saleDate: null,
        heldDays: 45,
        purchasePrice: 45000000,
        purchaseBrokeragePct: 1.0,
        buyerFilerStatus: 'Filer',
        societyTransferFee: 450000,
        ndcFee: 25000,
        legalCharges: 50000,
        renovationRepairs: 150000,
        maintenanceHolding: 60000,
        marketingExpenses: 50000,
        sellingPrice: 56000000,
        saleBrokeragePct: 2.0,
        sellerFilerStatus: 'Filer',
        seller: 'Estate Trust Holdings',
        buyer: 'High Net Worth Buyer',
        notes: 'Simulated 1 Kanal flip in DHA Phase 6 Block C',
      }));
      return;
    }
    const target = allSheets.find((s) => s.propertyId === propId || s.id === propId);
    if (target) {
      setForm(target);
    }
  };

  const applyTargetMargin = (marginPct: number) => {
    const solvedPrice = M.solveSellingPriceForTargetMargin(liveCostSheet, marginPct);
    updateField('sellingPrice', solvedPrice);
    toast(`Selling price solved at ${M.fmt(solvedPrice, numbers)} for target ${marginPct}% Net Margin`);
  };

  const handleSave = () => {
    const saved = M.saveCostSheet(liveCostSheet);
    setForm(saved);
    toast(`Cost sheet ${saved.id} saved & linked to property ledger!`);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <PageShell
      title={`Cost Sheet · ${liveCostSheet.name || 'Deal Calculator'}`}
      u="مکمل لاگت شیٹ و منافع حساب"
      p="Deterministic trade cost calculation: acquisition cost basis, holding carrying expenses, buy/sell commissions, FBR taxes (236K, 236C, CGT Sec 37), gross & net margins, and break-even price."
      toolProps={{ search: false, period: false, filters: false }}
      acts={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn" onClick={handlePrint}>
            <Icon name="print" /> Print Cost Sheet
          </button>
          <button type="button" className="btn pri" onClick={handleSave}>
            <Icon name="ok" /> Save &amp; Link
          </button>
        </div>
      }
    >
      {/* PROPERTY SELECTION BAR */}
      <div className="panel" style={{ marginBottom: '14px', padding: '12px 16px' }} data-noprint="1">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
            Select Property Deal to Calculate:
          </span>
          <select
            className="fldsel"
            style={{ minWidth: '320px', fontWeight: 600 }}
            value={liveCostSheet.id || (activeCostSheetId === 'new' ? 'new' : '')}
            onChange={(e) => handleSelectProperty(e.target.value)}
          >
            <option value="new">➕ Simulate New Trade Deal (Blank Calculator)</option>
            <optgroup label="Properties in System">
              {allSheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.name} · {s.status} · Net: {M.fmt(s.netProfit, numbers)} ({s.netMarginPct.toFixed(1)}%)
                </option>
              ))}
            </optgroup>
          </select>

          <span className="spacer" />

          {/* Quick Solver buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--ink-2)', fontWeight: 600 }}>
              Solve Exit for Net Margin:
            </span>
            {[10, 15, 20, 25].map((pct) => (
              <button
                key={pct}
                type="button"
                className="btn"
                style={{ padding: '2px 8px', fontSize: '11px', height: '26px' }}
                onClick={() => applyTargetMargin(pct)}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TOP HUD SCORECARD */}
      <div className="kpis" style={{ marginBottom: '16px' }}>
        <div className="kpi lead">
          <i className="strip" />
          <span className="k">Net Trading Profit</span>
          <span className={`v ${liveCostSheet.netProfit >= 0 ? 'pos' : 'neg'}`}>
            <Fig n={liveCostSheet.netProfit} />
          </span>
          <span className="f">
            <span style={{ fontWeight: 700, color: liveCostSheet.netMarginPct >= 15 ? 'var(--good)' : 'var(--ink)' }}>
              {liveCostSheet.netMarginPct.toFixed(1)}% Net Margin
            </span>
            <span className="vs">on {M.fmt(liveCostSheet.sellingPrice, numbers)} exit</span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">Gross Trading Profit</span>
          <span className={`v ${liveCostSheet.grossProfit >= 0 ? 'pos' : 'neg'}`}>
            <Fig n={liveCostSheet.grossProfit} />
          </span>
          <span className="f">
            <span style={{ fontWeight: 600 }}>{liveCostSheet.grossMarginPct.toFixed(1)}% Gross Margin</span>
            <span className="vs">after acquisition &amp; improvements</span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">Total Taxes to Pay</span>
          <span className="v neg">
            <Fig n={liveCostSheet.totalTaxesToPay} />
          </span>
          <span className="f">
            <span className="vs">
              236K ({liveCostSheet.buyerFilerStatus}) + 236C + CGT ({liveCostSheet.cgtRatePct}%) + Stamp/CVT
            </span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">Total Commissions</span>
          <span className="v">
            <Fig n={liveCostSheet.totalCommissions} />
          </span>
          <span className="f">
            <span className="vs">
              Buy ({liveCostSheet.purchaseBrokeragePct}%) + Sell ({liveCostSheet.saleBrokeragePct}%)
            </span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">Break-Even Selling Price</span>
          <span className="v" style={{ color: 'var(--accent-ink)' }}>
            <Fig n={liveCostSheet.breakEvenPrice} />
          </span>
          <span className="f">
            <span className="vs">Covers all costs, taxes &amp; commissions</span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">Cash ROI / Annualized</span>
          <span className="v pos">
            {liveCostSheet.roiPct.toFixed(1)}%
          </span>
          <span className="f">
            <span style={{ fontWeight: 600 }}>{liveCostSheet.annualizedRoiPct.toFixed(1)}% p.a.</span>
            <span className="vs">({liveCostSheet.heldDays} days held)</span>
          </span>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: LEFT = EDITABLE INPUTS, RIGHT = OFFICIAL LEDGER & ANALYSIS */}
      <div className="costsheet-grid">
        
        {/* ================================================================= */}
        {/* LEFT COLUMN: INPUT CONTROLS */}
        {/* ================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} data-noprint="1">
          
          {/* SECTION 1: DEAL TIMELINE & RESIDENCY */}
          <div className="panel">
            <div className="panel-h">
              <h3>1. Timeline &amp; Tax Status</h3>
              <span className="sub">Determines FBR 236K, 236C and CGT holding slab</span>
            </div>
            <div className="panel-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="fld">
                <label>Purchase Date</label>
                <input
                  type="date"
                  value={M.dstr(liveCostSheet.purchaseDate)}
                  onChange={(e) => updateField('purchaseDate', e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Exit / Sale Date</label>
                <input
                  type="date"
                  value={liveCostSheet.saleDate ? M.dstr(liveCostSheet.saleDate) : ''}
                  placeholder="Leave empty for holding"
                  onChange={(e) => updateField('saleDate', e.target.value || null)}
                />
              </div>

              <div className="fld">
                <label>Buyer Filer Status (Purchase Tax)</label>
                <select
                  value={liveCostSheet.buyerFilerStatus}
                  onChange={(e) => updateField('buyerFilerStatus', e.target.value)}
                >
                  <option value="Filer">Filer (Sec 236K: 3%)</option>
                  <option value="Late Filer">Late Filer (Sec 236K: 6%)</option>
                  <option value="Non-Filer">Non-Filer (Sec 236K: 12%)</option>
                </select>
              </div>

              <div className="fld">
                <label>Seller Filer Status (Sale Tax)</label>
                <select
                  value={liveCostSheet.sellerFilerStatus}
                  onChange={(e) => updateField('sellerFilerStatus', e.target.value)}
                >
                  <option value="Filer">Filer (Sec 236C: 3%)</option>
                  <option value="Late Filer">Late Filer (Sec 236C: 6%)</option>
                  <option value="Non-Filer">Non-Filer (Sec 236C: 10%)</option>
                </select>
              </div>

              <div className="fld full" style={{ background: 'var(--paper-2)', padding: '8px 12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--ink)' }}>
                  <b>Holding Duration:</b> {liveCostSheet.heldDays} days ({(liveCostSheet.heldDays / 365).toFixed(1)} years).
                  <br />
                  <b>Capital Gains Tax Slab:</b> Sec 37 applicable rate is <b>{liveCostSheet.cgtRatePct}%</b>.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PURCHASE & ACQUISITION COSTS */}
          <div className="panel">
            <div className="panel-h">
              <h3>2. Acquisition &amp; Transfer Costs</h3>
              <span className="sub">All direct costs added to purchase price</span>
            </div>
            <div className="panel-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="fld full">
                <label>Agreed Purchase Price (PKR) *</label>
                <input
                  type="number"
                  step="50000"
                  value={form.purchasePrice || ''}
                  onChange={(e) => updateField('purchasePrice', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Purchase Commission %</label>
                <input
                  type="number"
                  step="0.25"
                  value={form.purchaseBrokeragePct || ''}
                  onChange={(e) => updateField('purchaseBrokeragePct', +e.target.value)}
                />
                <span className="hint">= {M.fmt(liveCostSheet.purchaseBrokerage, numbers)}</span>
              </div>

              <div className="fld">
                <label>FBR Advance Tax 236K</label>
                <input
                  type="number"
                  step="1000"
                  value={form.tax236K || ''}
                  onChange={(e) => updateField('tax236K', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Stamp Duty (1%)</label>
                <input
                  type="number"
                  step="1000"
                  value={form.stampDuty || ''}
                  onChange={(e) => updateField('stampDuty', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Capital Value Tax (CVT)</label>
                <input
                  type="number"
                  step="1000"
                  value={form.cvt || ''}
                  onChange={(e) => updateField('cvt', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Society Transfer Fee</label>
                <input
                  type="number"
                  step="1000"
                  placeholder="DHA / Bahria fee"
                  value={form.societyTransferFee || ''}
                  onChange={(e) => updateField('societyTransferFee', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>NDC &amp; Verification Fee</label>
                <input
                  type="number"
                  step="1000"
                  value={form.ndcFee || ''}
                  onChange={(e) => updateField('ndcFee', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Legal &amp; Documentation</label>
                <input
                  type="number"
                  step="1000"
                  value={form.legalCharges || ''}
                  onChange={(e) => updateField('legalCharges', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Development Charges</label>
                <input
                  type="number"
                  step="1000"
                  value={form.developmentCharges || ''}
                  onChange={(e) => updateField('developmentCharges', +e.target.value)}
                />
              </div>

              <div className="fld full" style={{ borderTop: '1px solid var(--rule)', paddingTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600 }}>
                  <span>Total Acquisition Extra Costs:</span>
                  <span>{M.fmt(liveCostSheet.totalAcquisitionExtras, numbers)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: CARRYING & IMPROVEMENT COSTS */}
          <div className="panel">
            <div className="panel-h">
              <h3>3. Carrying &amp; Value-Add Costs</h3>
              <span className="sub">Expenses incurred while holding property for trade</span>
            </div>
            <div className="panel-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="fld">
                <label>Renovation &amp; Repairs</label>
                <input
                  type="number"
                  step="1000"
                  value={form.renovationRepairs || ''}
                  onChange={(e) => updateField('renovationRepairs', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Holding Maintenance &amp; Bills</label>
                <input
                  type="number"
                  step="1000"
                  value={form.maintenanceHolding || ''}
                  onChange={(e) => updateField('maintenanceHolding', +e.target.value)}
                />
              </div>

              <div className="fld full">
                <label>Marketing &amp; Listing Portals</label>
                <input
                  type="number"
                  step="1000"
                  value={form.marketingExpenses || ''}
                  onChange={(e) => updateField('marketingExpenses', +e.target.value)}
                />
              </div>

              <div className="fld full" style={{ borderTop: '1px solid var(--rule)', paddingTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: 'var(--brand)' }}>
                  <span>Total Landed Cost Basis:</span>
                  <span>{M.fmt(liveCostSheet.totalLandedCost, numbers)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: SALE & EXIT VARIABLES */}
          <div className="panel">
            <div className="panel-h">
              <h3>4. Sale Realization &amp; Exit Costs</h3>
              <span className="sub">Selling price, sales tax, commission, CGT</span>
            </div>
            <div className="panel-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="fld full">
                <label>Selling / Exit Price (PKR) *</label>
                <input
                  type="number"
                  step="50000"
                  value={form.sellingPrice || ''}
                  onChange={(e) => updateField('sellingPrice', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Sale Brokerage %</label>
                <input
                  type="number"
                  step="0.25"
                  value={form.saleBrokeragePct || ''}
                  onChange={(e) => updateField('saleBrokeragePct', +e.target.value)}
                />
                <span className="hint">= {M.fmt(liveCostSheet.saleBrokerage, numbers)}</span>
              </div>

              <div className="fld">
                <label>FBR Advance Tax 236C</label>
                <input
                  type="number"
                  step="1000"
                  value={form.tax236C || ''}
                  onChange={(e) => updateField('tax236C', +e.target.value)}
                />
              </div>

              <div className="fld">
                <label>Capital Gains Tax (CGT)</label>
                <input
                  type="number"
                  step="1000"
                  value={form.cgtAmount || ''}
                  onChange={(e) => updateField('cgtAmount', +e.target.value)}
                />
                <span className="hint">Slab {liveCostSheet.cgtRatePct}% on gain</span>
              </div>

              <div className="fld">
                <label>Municipal / TMA Transfer Tax</label>
                <input
                  type="number"
                  step="1000"
                  value={form.municipalTax || ''}
                  onChange={(e) => updateField('municipalTax', +e.target.value)}
                />
              </div>

              <div className="fld full">
                <label>Closing &amp; Other Selling Costs</label>
                <input
                  type="number"
                  step="1000"
                  value={form.otherSellingExpenses || ''}
                  onChange={(e) => updateField('otherSellingExpenses', +e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: OFFICIAL COST SHEET DEED / LEDGER */}
        {/* ================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* THE MASTER COST SHEET LEDGER STATEMENT */}
          <div className="panel" style={{ border: '2px solid var(--rule-2)', background: 'var(--card)' }}>
            <div className="panel-h" style={{ borderBottom: '2px solid var(--brand)', background: 'var(--paper-2)' }}>
              <div>
                <span className="kicker">Official Trade Accounting</span>
                <h2 style={{ fontSize: '18px', color: 'var(--brand)' }}>
                  Cost Sheet &amp; Deal Settlement Statement
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
                  Property: <b>{liveCostSheet.name}</b> · {liveCostSheet.size} ({liveCostSheet.project})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="tag ok" style={{ fontSize: '12px' }}>
                  {liveCostSheet.status}
                </span>
                <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px' }}>
                  Sheet Ref: {liveCostSheet.id || 'DRAFT'}
                </div>
              </div>
            </div>

            <div className="panel-b" style={{ padding: '16px' }}>
              
              {/* STEP-BY-STEP WATERFALL COST BRIDGE */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  {/* Revenue */}
                  <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 600 }}>1. Gross Exit / Selling Price</td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                      {M.fmt(liveCostSheet.sellingPrice, numbers)}
                    </td>
                  </tr>

                  {/* Base Purchase */}
                  <tr style={{ color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 4px 6px 16px' }}>Less: Base Purchase Price</td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--mono)' }}>
                      −{M.fmt(liveCostSheet.purchasePrice, numbers)}
                    </td>
                  </tr>

                  {/* Direct Acquisition */}
                  <tr style={{ color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 4px 6px 16px' }}>
                      Less: Acquisition Levies &amp; Transfer Extras
                      <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                        Stamp Duty ({M.fmt(liveCostSheet.stampDuty, numbers)}) + CVT ({M.fmt(liveCostSheet.cvt, numbers)}) + Sec 236K ({M.fmt(liveCostSheet.tax236K, numbers)}) + Society &amp; Legal ({M.fmt(liveCostSheet.societyTransferFee + liveCostSheet.legalCharges + liveCostSheet.ndcFee, numbers)})
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--mono)' }}>
                      −{M.fmt(liveCostSheet.totalAcquisitionExtras, numbers)}
                    </td>
                  </tr>

                  {/* Carrying Costs */}
                  <tr style={{ color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 4px 6px 16px' }}>
                      Less: Carrying Costs &amp; Improvements
                      <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                        Renovation ({M.fmt(liveCostSheet.renovationRepairs, numbers)}) + Maintenance &amp; Bills ({M.fmt(liveCostSheet.maintenanceHolding, numbers)}) + Marketing ({M.fmt(liveCostSheet.marketingExpenses, numbers)})
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--mono)' }}>
                      −{M.fmt(liveCostSheet.totalCarryingCosts, numbers)}
                    </td>
                  </tr>

                  {/* Purchase Brokerage */}
                  <tr style={{ color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 4px 6px 16px' }}>Less: Purchase Side Brokerage ({liveCostSheet.purchaseBrokeragePct}%)</td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--mono)' }}>
                      −{M.fmt(liveCostSheet.purchaseBrokerage, numbers)}
                    </td>
                  </tr>

                  {/* Subtotal Landed Cost */}
                  <tr style={{ borderTop: '1px solid var(--rule-2)', borderBottom: '1px solid var(--rule-2)', background: 'var(--paper-2)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 700, color: 'var(--brand)' }}>
                      Total Landed Cost Basis
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--brand)' }}>
                      {M.fmt(liveCostSheet.totalLandedCost, numbers)}
                    </td>
                  </tr>

                  {/* Gross Profit */}
                  <tr style={{ borderBottom: '1px solid var(--rule)', background: 'rgba(18,166,124,.06)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 700 }}>
                      = Gross Trading Profit
                      <span style={{ fontSize: '11.5px', marginLeft: '8px', color: 'var(--ink-2)', fontWeight: 500 }}>
                        (Gross Margin: {liveCostSheet.grossMarginPct.toFixed(1)}%)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'var(--mono)', fontWeight: 700 }} className={liveCostSheet.grossProfit >= 0 ? 'pos' : 'neg'}>
                      {M.fmt(liveCostSheet.grossProfit, numbers)}
                    </td>
                  </tr>

                  {/* Sale Brokerage */}
                  <tr style={{ color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 4px 6px 16px' }}>Less: Sale Brokerage Commission ({liveCostSheet.saleBrokeragePct}%)</td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--mono)' }}>
                      −{M.fmt(liveCostSheet.saleBrokerage, numbers)}
                    </td>
                  </tr>

                  {/* Sale Taxes */}
                  <tr style={{ color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 4px 6px 16px' }}>
                      Less: Sale Advance Tax (FBR Sec 236C · {liveCostSheet.sellerFilerStatus})
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--mono)' }}>
                      −{M.fmt(liveCostSheet.tax236C, numbers)}
                    </td>
                  </tr>

                  {/* CGT */}
                  <tr style={{ color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 4px 6px 16px' }}>
                      Less: Capital Gains Tax (Sec 37 · {liveCostSheet.cgtRatePct}% on realized gain)
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--mono)' }}>
                      −{M.fmt(liveCostSheet.cgtAmount, numbers)}
                    </td>
                  </tr>

                  {/* Municipal & Closing */}
                  <tr style={{ color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 4px 6px 16px' }}>
                      Less: Municipal / TMA Tax + Other Closing Expenses
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'var(--mono)' }}>
                      −{M.fmt(liveCostSheet.totalSellingExpenses, numbers)}
                    </td>
                  </tr>

                  {/* NET TRADING PROFIT SEAL */}
                  <tr style={{ borderTop: '2px solid var(--ink)', background: liveCostSheet.netProfit >= 0 ? 'var(--brand-wash)' : 'var(--bad-wash)' }}>
                    <td style={{ padding: '12px 8px', fontSize: '15px', fontWeight: 800 }}>
                      NET TRADING CASH PROFIT
                      <div style={{ fontSize: '12px', fontWeight: 600, color: liveCostSheet.netProfit >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                        Net Margin: {liveCostSheet.netMarginPct.toFixed(1)}% · Cash ROI: {liveCostSheet.roiPct.toFixed(1)}% ({liveCostSheet.annualizedRoiPct.toFixed(1)}% p.a.)
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: '18px', fontFamily: 'var(--display)', fontWeight: 800 }} className={liveCostSheet.netProfit >= 0 ? 'pos' : 'neg'}>
                      {M.fmt(liveCostSheet.netProfit, numbers)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TAX SCHEDULE TABLE */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--rule)' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--ink)' }}>
                  Statutory Tax Breakdown &amp; Payment Schedule
                </h4>
                <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--rule-2)' }}>
                      <th style={{ padding: '5px 8px' }}>Tax Law / Levy</th>
                      <th style={{ padding: '5px 8px' }}>Taxpayer</th>
                      <th style={{ padding: '5px 8px' }}>Applicable Rate</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right' }}>Amount to Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '5px 8px' }}>FBR Section 236K (Advance Tax on Purchase)</td>
                      <td style={{ padding: '5px 8px' }}>Buyer ({liveCostSheet.buyerFilerStatus})</td>
                      <td style={{ padding: '5px 8px' }}>{liveCostSheet.buyerFilerStatus === 'Non-Filer' ? '12%' : liveCostSheet.buyerFilerStatus === 'Late Filer' ? '6%' : '3%'} on purchase</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(liveCostSheet.tax236K, numbers)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '5px 8px' }}>FBR Section 236C (Advance Tax on Sale)</td>
                      <td style={{ padding: '5px 8px' }}>Seller ({liveCostSheet.sellerFilerStatus})</td>
                      <td style={{ padding: '5px 8px' }}>{liveCostSheet.sellerFilerStatus === 'Non-Filer' ? '10%' : liveCostSheet.sellerFilerStatus === 'Late Filer' ? '6%' : '3%'} on sale</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(liveCostSheet.tax236C, numbers)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '5px 8px' }}>Section 37 Capital Gains Tax (CGT)</td>
                      <td style={{ padding: '5px 8px' }}>Seller</td>
                      <td style={{ padding: '5px 8px' }}>{liveCostSheet.cgtRatePct}% on capital gain</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(liveCostSheet.cgtAmount, numbers)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '5px 8px' }}>Provincial Stamp Duty + CVT</td>
                      <td style={{ padding: '5px 8px' }}>Buyer / Registrar</td>
                      <td style={{ padding: '5px 8px' }}>1% Stamp + 1% CVT</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(liveCostSheet.stampDuty + liveCostSheet.cvt, numbers)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '5px 8px' }}>TMA / Cantonment Transfer Tax</td>
                      <td style={{ padding: '5px 8px' }}>Local Authority</td>
                      <td style={{ padding: '5px 8px' }}>0.5% of sale value</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{M.fmt(liveCostSheet.municipalTax, numbers)}</td>
                    </tr>
                    <tr style={{ fontWeight: 700, background: 'var(--paper-2)' }}>
                      <td style={{ padding: '6px 8px' }} colSpan={3}>Total Taxes Payable on Deal</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--bad)' }}>
                        {M.fmt(liveCostSheet.totalTaxesToPay, numbers)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>

          {/* SENSITIVITY MATRIX (STRESS TEST) */}
          <div className="panel" data-noprint="1">
            <div className="panel-h">
              <h3>Deal Sensitivity &amp; What-If Scenarios</h3>
              <span className="sub">Stress-test net margin against exit price shifts</span>
            </div>
            <div className="panel-b" style={{ padding: 0 }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--rule-2)' }}>
                    <th style={{ padding: '6px 10px' }}>Market Scenario</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Selling Price</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Gross Profit</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total Taxes</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Net Profit</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Net Margin</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Cash ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivity.map((sc, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--rule)',
                        background: sc.factor === 1 ? 'var(--paper-2)' : 'transparent',
                        fontWeight: sc.factor === 1 ? 700 : 400,
                      }}
                    >
                      <td style={{ padding: '6px 10px' }}>
                        {sc.label} {sc.factor === 1 ? '🎯' : ''}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {M.fmt(sc.sellingPrice, numbers)}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        <span className={sc.grossProfit >= 0 ? 'pos' : 'neg'}>{M.fmt(sc.grossProfit, numbers)}</span>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--bad)' }}>
                        {M.fmt(sc.totalTaxesToPay, numbers)}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        <span className={sc.netProfit >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>
                          {M.fmt(sc.netProfit, numbers)}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        <span className={sc.netMarginPct >= 15 ? 'pos' : sc.netMarginPct > 0 ? '' : 'neg'}>
                          {sc.netMarginPct.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {sc.roiPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </PageShell>
  );
}
