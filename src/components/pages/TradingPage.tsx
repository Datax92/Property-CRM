'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, Tag, Fig } from '../Shared';
import { Icon } from '../Icons';
import { PAGE_META } from '../../lib/constants';
import * as M from '../../lib/re-data';
import type { CostSheet, FilerStatus } from '../../lib/types';

export function TradingPage() {
  const {
    tab,
    effectiveFilters: f,
    numbers,
    activeCostSheetId,
    setActiveCostSheetId,
    openCostSheet,
  } = useApp();

  const meta = PAGE_META[`trading/${tab}`] || { t: 'ERP Cost Sheets' };

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
    const totalTaxes = rows.reduce((a, s) => a + s.totalTaxesToPay, 0);
    const blendedMargin = totalRev > 0 ? (totalNetMargin / totalRev) * 100 : 0;

    const summaryPairs: [string, string][] = [
      ['Total trade deals', M.fmtNum(rows.length)],
      ['Net buy cost (base)', M.fmt(totalNetBuy, numbers)],
      ['Landed purchase price', M.fmt(totalPurchasePrice, numbers)],
      ['Exit value / current value', M.fmt(totalRev, numbers)],
      ['Gross trading profit', M.fmt(totalGrossProfit, numbers)],
      ['Net cash margin', M.fmt(totalNetMargin, numbers)],
      ['Blended net margin', `${blendedMargin.toFixed(1)}%`],
      ['Total commissions (buy+sell)', M.fmt(totalCommissions, numbers)],
      ['Total statutory taxes', M.fmt(totalTaxes, numbers)],
    ];

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
            <div style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
              {cs.size} · {cs.project} ({cs.city})
            </div>
          </div>
        ),
      },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status', render: (cs: CostSheet) => <Tag text={cs.status} /> },
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
        label: 'Agent Comm.',
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
        key: 'purchasePrice',
        label: 'Landed Price',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => M.fmt(cs.purchasePrice, numbers),
      },
      {
        key: 'grossProfit',
        label: 'Gross Profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => (
          <span className={cs.grossProfit >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 600 }}>
            {M.fmt(cs.grossProfit, numbers)}
            <span style={{ fontSize: '10.5px', color: 'var(--ink-2)', marginLeft: '4px' }}>
              ({cs.grossProfitPct ? cs.grossProfitPct.toFixed(1) : (cs.grossMarginPct || 0).toFixed(1)}%)
            </span>
          </span>
        ),
      },
      {
        key: 'netMargin',
        label: 'Net Margin',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => (
          <span
            className={(cs.netMargin ?? cs.netProfit) >= 0 ? 'pos' : 'neg'}
            style={{ fontWeight: 700 }}
          >
            {M.fmt(cs.netMargin ?? cs.netProfit, numbers)}
            <span style={{ fontSize: '10.5px', marginLeft: '4px' }}>
              ({(cs.netMarginPct || 0).toFixed(1)}%)
            </span>
          </span>
        ),
      },
      {
        key: 'totalTaxesToPay',
        label: 'Taxes',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => (
          <span className="neg">{M.fmt(cs.totalTaxesToPay, numbers)}</span>
        ),
      },
      {
        key: 'actions',
        label: 'Action',
        render: (cs: CostSheet) => (
          <button
            type="button"
            className="btn"
            style={{ padding: '3px 9px', fontSize: '11.5px', height: '26px' }}
            onClick={() => openCostSheet(cs.id)}
            title="Open ERP cost sheet and trade calculator"
          >
            <Icon name="calculator" size={13} /> View Sheet
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
          <button
            type="button"
            className="btn pri"
            onClick={() => {
              setActiveCostSheetId('10002');
              openCostSheet('10002');
            }}
          >
            <Icon name="calculator" /> Open Excel ERP Cost Sheet
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <div className="note" style={{ marginBottom: '14px' }} data-noprint="1">
          <span className="ic">
            <Icon name="info" />
          </span>
          <div>
            <b>Client ERP Cost Sheet Register:</b> Formatted in exact alignment with the client's Excel ERP workbook (Rows 2–4). Every deal tracks <b>Net Buy Cost</b>, <b>Agent Commission</b>, <b>Current Value (Gross Sale)</b>, <b>Gross Profit</b>, and <b>Net Margin</b> after statutory deductions (CGT, Zakat, Charity). Click <b>View Sheet</b> on any deal (such as <b>Plot # 940 A Block Faisal Hills</b>) to inspect or modify the full itemized ledger.
          </div>
        </div>
        <DataTable cols={cols} rows={rows} totals={true} />
      </PageShell>
    );
  }

  // =========================================================================
  // TAB 3: TRADING ANALYTICS (Excel Row 1: Reporting Dashboard & Comparisons)
  // =========================================================================
  if (tab === 'analytics') {
    const costSheets: CostSheet[] = (M.DATA as any).costSheets || [];
    const stats = M.computeTradingKPIs(costSheets);

    const summaryPairs: [string, string][] = [
      ['Total properties traded', M.fmtNum(stats.totalDeals)],
      ['Closed trade deals', M.fmtNum(stats.closedDeals)],
      ['Active trading pipeline', M.fmtNum(stats.activeDeals)],
      ['Total capital deployed', M.fmt(stats.totalCapitalInvested, numbers)],
      ['Realized / target revenue', M.fmt(stats.totalRevenue, numbers)],
      ['Realized net trading gain', M.fmt(stats.realizedNetProfit, numbers)],
      ['Blended net margin', `${stats.blendedNetMargin.toFixed(1)}%`],
      ['Total taxes paid (FBR+Prov.)', M.fmt(stats.totalTaxesPaid, numbers)],
      ['Average trade duration', `${stats.avgHoldingDays || 45} days`],
    ];

    // Project breakdown
    const prjMap: Record<
      string,
      { count: number; buyCost: number; invested: number; rev: number; gross: number; net: number; taxes: number; comm: number }
    > = {};
    costSheets.forEach((cs) => {
      if (!prjMap[cs.project]) {
        prjMap[cs.project] = { count: 0, buyCost: 0, invested: 0, rev: 0, gross: 0, net: 0, taxes: 0, comm: 0 };
      }
      prjMap[cs.project].count++;
      prjMap[cs.project].buyCost += cs.netBuyCost || cs.purchasePrice;
      prjMap[cs.project].invested += cs.purchasePrice;
      prjMap[cs.project].rev += cs.grossSalePrice || cs.sellingPrice;
      prjMap[cs.project].gross += cs.grossProfit;
      prjMap[cs.project].net += cs.netMargin ?? cs.netProfit;
      prjMap[cs.project].taxes += cs.totalTaxesToPay;
      prjMap[cs.project].comm += cs.totalCommissions;
    });

    const prjRows = Object.keys(prjMap)
      .map((prj) => {
        const d = prjMap[prj];
        const margin = d.rev > 0 ? (d.net / d.rev) * 100 : 0;
        const grossMargin = d.rev > 0 ? (d.gross / d.rev) * 100 : 0;
        const roi = d.invested > 0 ? (d.net / d.invested) * 100 : 0;
        return {
          id: prj,
          project: prj,
          count: d.count,
          buyCost: d.buyCost,
          invested: d.invested,
          rev: d.rev,
          gross: d.gross,
          net: d.net,
          taxes: d.taxes,
          comm: d.comm,
          grossMargin,
          margin,
          roi,
        };
      })
      .sort((a, b) => b.net - a.net);

    const prjCols = [
      { key: 'project', label: 'Society / Project' },
      { key: 'count', label: 'Deals', a: 'r' as const, cls: 'mono', render: (r: any) => M.fmtNum(r.count) },
      { key: 'buyCost', label: 'Net Buy Capital', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.buyCost, numbers) },
      { key: 'invested', label: 'Landed Cost', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.invested, numbers) },
      { key: 'rev', label: 'Exit Value', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.rev, numbers) },
      { key: 'comm', label: 'Agent Comm.', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.comm, numbers) },
      { key: 'taxes', label: 'Total Taxes', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => <span className="neg">{M.fmt(r.taxes, numbers)}</span> },
      {
        key: 'gross',
        label: 'Gross Profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (r: any) => (
          <span className={r.gross >= 0 ? 'pos' : 'neg'}>
            {M.fmt(r.gross, numbers)} ({r.grossMargin.toFixed(1)}%)
          </span>
        ),
      },
      {
        key: 'net',
        label: 'Net Margin',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (r: any) => (
          <span className={r.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>
            {M.fmt(r.net, numbers)}
          </span>
        ),
      },
      {
        key: 'margin',
        label: 'Net %',
        a: 'r' as const,
        cls: 'mono',
        render: (r: any) => (
          <span className={r.margin >= 10 ? 'pos' : ''} style={{ fontWeight: 600 }}>
            {r.margin.toFixed(1)}%
          </span>
        ),
      },
    ];

    // Property Type Breakdown
    const typeMap: Record<string, { count: number; invested: number; rev: number; net: number }> = {};
    costSheets.forEach((cs) => {
      if (!typeMap[cs.type]) {
        typeMap[cs.type] = { count: 0, invested: 0, rev: 0, net: 0 };
      }
      typeMap[cs.type].count++;
      typeMap[cs.type].invested += cs.purchasePrice;
      typeMap[cs.type].rev += cs.grossSalePrice || cs.sellingPrice;
      typeMap[cs.type].net += cs.netMargin ?? cs.netProfit;
    });

    const typeRows = Object.keys(typeMap)
      .map((tp) => {
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
      })
      .sort((a, b) => b.net - a.net);

    const typeCols = [
      { key: 'type', label: 'Property Category' },
      { key: 'count', label: 'Deals', a: 'r' as const, cls: 'mono', render: (r: any) => M.fmtNum(r.count) },
      { key: 'invested', label: 'Capital Invested', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.invested, numbers) },
      { key: 'rev', label: 'Trading Revenue', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.rev, numbers) },
      {
        key: 'net',
        label: 'Net Trading Profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (r: any) => (
          <span className={r.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>
            {M.fmt(r.net, numbers)}
          </span>
        ),
      },
      {
        key: 'margin',
        label: 'Net Margin',
        a: 'r' as const,
        cls: 'mono',
        render: (r: any) => (
          <span className={r.margin >= 10 ? 'pos' : ''} style={{ fontWeight: 600 }}>
            {r.margin.toFixed(1)}%
          </span>
        ),
      },
    ];

    return (
      <PageShell title={meta.t} u={meta.u} p={meta.p}>
        <SummaryKpis pairs={summaryPairs} />
        <div className="grid c2" style={{ marginBottom: '14px' }}>
          <div className="panel">
            <div className="panel-h">
              <h3>Trading Profitability by Society / Project</h3>
              <span className="sub">Direct Cross-Project Comparison</span>
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
  // TAB 2: INTERACTIVE DEAL COST SHEET (Matching Client Excel Rows 6–31)
  // =========================================================================
  return <ClientErpCostSheetView activeCostSheetId={activeCostSheetId} />;
}

// ---------------------------------------------------------------------------
// CLIENT ERP COST SHEET VIEW COMPONENT
// ---------------------------------------------------------------------------
function ClientErpCostSheetView({ activeCostSheetId }: { activeCostSheetId: string | null }) {
  const { numbers, toast, goto } = useApp();
  const allSheets: CostSheet[] = (M.DATA as any).costSheets || [];

  // Default to Excel sample if activeId is 10002 or unset
  const defaultSheet = useMemo(() => {
    if (activeCostSheetId === 'new') {
      return M.calculateCostSheet({
        id: '10003',
        propertyId: 'PROP-CUSTOM-NEW',
        name: 'New Custom Trade Deal',
        project: 'Faisal Hills',
        city: 'Islamabad',
        type: 'Residential Plot',
        size: '30x60 (5 Marla)',
        block: 'Block B',
        unit: '201',
        status: 'Active Deal',
        office: 'Islamabad Branch — Blue Area',
        purchaseDate: M.TODAY,
        saleDate: null,
        heldDays: 60,
        netBuyCost: 5000000,
        ndcFee: 10000,
        stampDutyPct: 1.0,
        cvtPct: 1.0,
        cdaRdaTransferFeePct: 0.5,
        societyTransferFee: 0,
        tax236KPct: 3.0,
        buyerFilerStatus: 'Filer' as FilerStatus,
        handlingExpenses: 10000,
        renovationRepairs: 0,
        maintenanceBills: 0,
        marketingExpenses: 1000,
        fuelTravelling: 1000,
        salaryExpenses: 5000,
        buySideAgentFee: 10000,
        grossSalePrice: 5600000,
        sellerFilerStatus: 'Filer' as FilerStatus,
        tax236CPct: 3.0,
        sellSideAgentFee: 10000,
        cgtRatePct: 15.0,
        zakat: 10000,
        charity: 5000,
        officeExpenseDeduction: 5000,
        seller: 'Private Seller',
        buyer: 'Prospective Buyer',
        notes: 'Simulated trade deal with client ERP cost sheet structure',
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

  // Real-time recalculation with deterministic formulas
  const liveCostSheet: CostSheet = useMemo(() => {
    return M.calculateCostSheet(form);
  }, [form]);

  // Sensitivity scenarios
  const sensitivity = useMemo(() => {
    return M.computeSensitivityMatrix(liveCostSheet);
  }, [liveCostSheet]);

  // Field updater
  const updateField = (key: string, val: any) => {
    setForm((prev: any) => {
      const next = { ...prev, [key]: val };

      // Auto-update taxes if filer status changes
      if (key === 'buyerFilerStatus' || key === 'netBuyCost') {
        const p = key === 'netBuyCost' ? +val : +(next.netBuyCost || next.purchasePrice || 0);
        const status = key === 'buyerFilerStatus' ? val : next.buyerFilerStatus;
        const kRate = status === 'Non-Filer' ? 0.12 : status === 'Late Filer' ? 0.06 : 0.03;
        next.tax236K = Math.round(p * kRate);
      }
      if (key === 'sellerFilerStatus' || key === 'grossSalePrice') {
        const sp = key === 'grossSalePrice' ? +val : +(next.grossSalePrice || next.sellingPrice || 0);
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
      setForm(
        M.calculateCostSheet({
          id: 'NEW-SIM',
          propertyId: '',
          name: 'New Custom Trade Deal',
          project: 'Faisal Hills',
          city: 'Islamabad',
          type: 'Residential Plot',
          size: '30x60 (5 Marla)',
          block: 'Block A',
          unit: '100',
          status: 'Active Deal',
          office: 'Islamabad Branch — Blue Area',
          purchaseDate: M.TODAY,
          saleDate: null,
          heldDays: 60,
          netBuyCost: 5000000,
          ndcFee: 10000,
          stampDuty: 0,
          stampDutyPct: 1.0,
          cvt: 0,
          cvtPct: 1.0,
          cdaRdaTransferFee: 0,
          cdaRdaTransferFeePct: 0.5,
          societyTransferFee: 0,
          tax236K: 150000,
          tax236KPct: 3.0,
          buyerFilerStatus: 'Filer',
          handlingExpenses: 10000,
          renovationRepairs: 0,
          maintenanceBills: 0,
          marketingExpenses: 1000,
          fuelTravelling: 1000,
          salaryExpenses: 5000,
          buySideAgentFee: 10000,
          grossSalePrice: 5600000,
          tax236C: 150000,
          sellerFilerStatus: 'Filer',
          sellSideAgentFee: 10000,
          cgtRatePct: 15.0,
          cgtAmount: 61950,
          zakat: 10000,
          charity: 5000,
          officeExpenseDeduction: 5000,
          seller: 'Private Seller',
          buyer: 'Prospective Investor',
          notes: 'Blank ERP Cost Sheet Template',
        })
      );
      return;
    }
    const target = allSheets.find((s) => s.id === propId || s.propertyId === propId);
    if (target) {
      setForm(target);
    }
  };

  const handleResetToExcelExample = () => {
    const excelSheet = allSheets.find((s) => s.id === '10002') || allSheets[0];
    if (excelSheet) {
      setForm(excelSheet);
      toast('Loaded client Excel template values: Plot # 940 A Block (Faisal Hills)');
    }
  };

  const applyTargetMargin = (marginPct: number) => {
    const solvedPrice = M.solveSellingPriceForTargetMargin(liveCostSheet, marginPct);
    updateField('grossSalePrice', solvedPrice);
    updateField('sellingPrice', solvedPrice);
    toast(`Target Exit solved at ${M.fmt(solvedPrice, numbers)} for ${marginPct}% Net Margin`);
  };

  const handleSave = () => {
    const saved = M.saveCostSheet(liveCostSheet);
    setForm(saved);
    toast(`Cost Sheet #${saved.id} (${saved.name}) saved and linked to property ledger!`);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <PageShell
      title={`ERP Cost Sheet · ${liveCostSheet.name || 'Deal Calculation'}`}
      u="مکمل لاگت شیٹ و منافع حساب (کلائنٹ ایکسل ماڈل)"
      p="Clean, itemized real estate trade calculation: Net Buy Cost, Society & Govt Transfer, FBR 236K, Handling & Expenses, Agent Fees, All-In Purchase Price, 236C, Gross Profit, CGT, Zakat, Charity, and Net Margin."
      toolProps={{ search: false, period: false, filters: false }}
      acts={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn" onClick={handleResetToExcelExample} title="Reset to Plot 940 A Block from Excel">
            <Icon name="history" /> Load Excel Template (Plot 940)
          </button>
          <button type="button" className="btn" onClick={handlePrint}>
            <Icon name="print" /> Print Voucher
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
            Selected Property Deal:
          </span>
          <select
            className="fldsel"
            style={{ minWidth: '320px', fontWeight: 600 }}
            value={liveCostSheet.id || (activeCostSheetId === 'new' ? 'new' : '')}
            onChange={(e) => handleSelectProperty(e.target.value)}
          >
            <option value="new">➕ Simulate New Custom Trade Deal (Blank)</option>
            <optgroup label="Available Properties / Deals">
              {allSheets.map((s) => (
                <option key={s.id} value={s.id}>
                  ID: {s.id} · {s.name} ({s.project}) · Net: {M.fmt(s.netMargin ?? s.netProfit, numbers)} ({(s.netMarginPct || 0).toFixed(1)}%)
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
            {[5, 10, 15, 20].map((pct) => (
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

      {/* TOP SCORECARD: SUMMARY ROW MATCHING EXCEL ROWS 2-4 */}
      <div className="kpis" style={{ marginBottom: '16px' }}>
        <div className="kpi lead">
          <i className="strip" />
          <span className="k">NET MARGIN (Cash Profit)</span>
          <span className={`v ${(liveCostSheet.netMargin ?? liveCostSheet.netProfit) >= 0 ? 'pos' : 'neg'}`}>
            <Fig n={liveCostSheet.netMargin ?? liveCostSheet.netProfit} />
          </span>
          <span className="f">
            <span style={{ fontWeight: 700, color: 'var(--good)' }}>
              {(liveCostSheet.netMarginPct || 0).toFixed(1)}% Net Margin
            </span>
            <span className="vs">on {M.fmt(liveCostSheet.grossSalePrice || liveCostSheet.sellingPrice, numbers)} exit</span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">NET BUY COST (Base)</span>
          <span className="v">
            <Fig n={liveCostSheet.netBuyCost || liveCostSheet.purchasePrice} />
          </span>
          <span className="f">
            <span className="vs">Initial purchase price from seller</span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">PURCHASE PRICE (Landed)</span>
          <span className="v" style={{ color: 'var(--brand)', fontWeight: 700 }}>
            <Fig n={liveCostSheet.purchasePrice} />
          </span>
          <span className="f">
            <span className="vs">= Net Buy + Transfer + Taxes + Expenses + Fee</span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">CURRENT VALUE / EXIT</span>
          <span className="v" style={{ fontWeight: 700 }}>
            <Fig n={liveCostSheet.grossSalePrice || liveCostSheet.sellingPrice} />
          </span>
          <span className="f">
            <span className="vs">Gross Sale Price (incl. CGT)</span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">GROSS PROFIT</span>
          <span className={`v ${liveCostSheet.grossProfit >= 0 ? 'pos' : 'neg'}`}>
            <Fig n={liveCostSheet.grossProfit} />
          </span>
          <span className="f">
            <span style={{ fontWeight: 600 }}>
              {(liveCostSheet.grossProfitPct || liveCostSheet.grossMarginPct || 0).toFixed(1)}% Gross Margin
            </span>
          </span>
        </div>

        <div className="kpi">
          <span className="k">TOTAL AGENT COMMISSION</span>
          <span className="v">
            <Fig n={liveCostSheet.totalCommissions} />
          </span>
          <span className="f">
            <span className="vs">
              Buy ({M.fmt(liveCostSheet.buySideAgentFee || liveCostSheet.purchaseBrokerage, numbers)}) + Sell ({M.fmt(liveCostSheet.sellSideAgentFee || liveCostSheet.saleBrokerage, numbers)})
            </span>
          </span>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: LEFT = CLEAN ERP LEDGER INPUTS, RIGHT = VISUAL WATERFALL & VOUCHER */}
      <div className="costsheet-grid">
        
        {/* ================================================================= */}
        {/* LEFT COLUMN: THE CLEAN ERP COST SHEET (Matching Excel Rows 6–31) */}
        {/* ================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* MASTER SPREADSHEET CARD */}
          <div className="panel" style={{ border: '2px solid var(--rule-2)', background: 'var(--card)' }}>
            
            {/* SPREADSHEET TOP BANNER */}
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
                <span className="kicker" style={{ color: 'var(--brand)', fontWeight: 700 }}>
                  Property Business ERP Software
                </span>
                <h2 style={{ fontSize: '17px', margin: '2px 0 0', color: 'var(--ink)' }}>
                  Detailed Cost Sheet &amp; Trade Settlement Ledger
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
                  <b>{liveCostSheet.name}</b> · {liveCostSheet.size} · {liveCostSheet.project} ({liveCostSheet.city})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="tag ok" style={{ fontSize: '12px' }}>
                  Deal ID: {liveCostSheet.id}
                </span>
                <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '3px' }}>
                  Type: {liveCostSheet.type}
                </div>
              </div>
            </div>

            <div className="panel-b" style={{ padding: '16px' }}>

              {/* SPREADSHEET SECTION A: BASE ACQUISITION */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--paper-2)',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    borderLeft: '4px solid var(--brand)',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                    NET BUY COST (Property Base Purchase)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>PKR:</span>
                    <input
                      type="number"
                      step="50000"
                      style={{
                        width: '180px',
                        padding: '4px 8px',
                        fontWeight: 700,
                        fontSize: '14px',
                        textAlign: 'right',
                        fontFamily: 'var(--mono)',
                        border: '1px solid var(--rule-2)',
                        borderRadius: '4px',
                      }}
                      value={form.netBuyCost ?? form.purchasePrice ?? ''}
                      onChange={(e) => updateField('netBuyCost', +e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SPREADSHEET SECTION 1: SOCIETY / GOVT TRANSFER COST */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'var(--paper)',
                    borderBottom: '1px solid var(--rule)',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink)' }}>
                    1. SOCIETY / GOVT TRANSFER COST
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)' }}>
                    Subtotal: {M.fmt(liveCostSheet.totalSocietyGovtTransfer, numbers)}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', padding: '0 8px' }}>
                  
                  {/* 1.0 NDC & Verification Fee */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      1.0 NDC &amp; Verification Fee
                    </span>
                    <input
                      type="number"
                      step="1000"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.ndcFee ?? 10000}
                      onChange={(e) => updateField('ndcFee', +e.target.value)}
                    />
                  </div>

                  {/* 1.1 Stamp Duty */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      1.1 Provincial Stamp Duty (1%)
                    </span>
                    <input
                      type="number"
                      step="1000"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.stampDuty ?? 0}
                      onChange={(e) => updateField('stampDuty', +e.target.value)}
                    />
                  </div>

                  {/* 1.1 CVT */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      1.1 Capital Value Tax (CVT 1%)
                    </span>
                    <input
                      type="number"
                      step="1000"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.cvt ?? 0}
                      onChange={(e) => updateField('cvt', +e.target.value)}
                    />
                  </div>

                  {/* 1.2 CDA / RDA Transfer Fee */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      1.2 Authority CDA/RDA Transfer Fee (0.5%)
                    </span>
                    <input
                      type="number"
                      step="1000"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.cdaRdaTransferFee ?? 0}
                      onChange={(e) => updateField('cdaRdaTransferFee', +e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SPREADSHEET SECTION 2: GOVT TAXES (BUY SIDE) */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'var(--paper)',
                    borderBottom: '1px solid var(--rule)',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink)' }}>
                    2. GOVT TAXES (BUY SIDE)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>Taxpayer:</span>
                    <select
                      style={{ padding: '2px 6px', fontSize: '11.5px', fontWeight: 600 }}
                      value={liveCostSheet.buyerFilerStatus}
                      onChange={(e) => updateField('buyerFilerStatus', e.target.value)}
                    >
                      <option value="Filer">Filer (Sec 236K: 3%)</option>
                      <option value="Late Filer">Late Filer (Sec 236K: 6%)</option>
                      <option value="Non-Filer">Non-Filer (Sec 236K: 12%)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', padding: '0 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gridColumn: 'span 2' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                        2.1 FBR Section 236K (Advance Tax on Purchase)
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                        {liveCostSheet.buyerFilerStatus} rate ({liveCostSheet.buyerFilerStatus === 'Non-Filer' ? '12%' : liveCostSheet.buyerFilerStatus === 'Late Filer' ? '6%' : '3%'} on Net Buy Cost)
                      </div>
                    </div>
                    <input
                      type="number"
                      step="5000"
                      style={{ width: '150px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 600 }}
                      value={form.tax236K ?? 150000}
                      onChange={(e) => updateField('tax236K', +e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SPREADSHEET SECTION 3: HANDLING / EXPENSES */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'var(--paper)',
                    borderBottom: '1px solid var(--rule)',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink)' }}>
                    3. HANDLING \ EXPENSES
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)' }}>
                    Total: {M.fmt(liveCostSheet.totalHandlingExpenses, numbers)}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', padding: '0 8px' }}>
                  
                  {/* 3.1 Renovation & Repairs */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      3.1 Renovation &amp; Repairs
                    </span>
                    <input
                      type="number"
                      step="1000"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.renovationRepairs ?? 0}
                      onChange={(e) => updateField('renovationRepairs', +e.target.value)}
                    />
                  </div>

                  {/* 3.2 Maintenance & Bills */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      3.2 Maintenance &amp; Bills
                    </span>
                    <input
                      type="number"
                      step="1000"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.maintenanceBills ?? form.maintenanceHolding ?? 0}
                      onChange={(e) => updateField('maintenanceBills', +e.target.value)}
                    />
                  </div>

                  {/* 3.3 Marketing */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      3.3 Marketing
                    </span>
                    <input
                      type="number"
                      step="500"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.marketingExpenses ?? 1000}
                      onChange={(e) => updateField('marketingExpenses', +e.target.value)}
                    />
                  </div>

                  {/* 3.4 Fuel & Travelling */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      3.4 Fuel &amp; Travelling
                    </span>
                    <input
                      type="number"
                      step="500"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.fuelTravelling ?? 1000}
                      onChange={(e) => updateField('fuelTravelling', +e.target.value)}
                    />
                  </div>

                  {/* 3.5 Salary & other Expenses */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      3.5 Salary &amp; other Expenses (Deal allocation)
                    </span>
                    <input
                      type="number"
                      step="1000"
                      style={{ width: '150px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.salaryExpenses ?? 5000}
                      onChange={(e) => updateField('salaryExpenses', +e.target.value)}
                    />
                  </div>

                </div>
              </div>

              {/* SPREADSHEET SECTION 4: REAL ESTATE AGENT FEE (BUY SIDE) */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'var(--paper)',
                    borderBottom: '1px solid var(--rule)',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--ink)' }}>
                    4. REAL ESTATE AGENT FEE (BUY SIDE)
                  </span>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '150px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 600 }}
                    value={form.buySideAgentFee ?? form.purchaseBrokerage ?? 10000}
                    onChange={(e) => updateField('buySideAgentFee', +e.target.value)}
                  />
                </div>
              </div>

              {/* TOTAL PURCHASE PRICE (All-in Landed Cost Basis) */}
              <div
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.9 }}>
                    All-in Landed Acquisition Basis (= SUM F6:F20)
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>
                    PURCHASE PRICE
                  </div>
                </div>
                <div style={{ fontSize: '20px', fontFamily: 'var(--mono)', fontWeight: 800 }}>
                  {M.fmt(liveCostSheet.purchasePrice, numbers)}
                </div>
              </div>

              {/* SPREADSHEET SECTION B: SALE REALIZATION */}
              <div style={{ borderTop: '2px dashed var(--rule-2)', paddingTop: '16px', marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(18, 166, 124, 0.08)',
                    borderRadius: '6px',
                    marginBottom: '12px',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--good)' }}>
                    GROSS SALE PRICE (incl. CGT / Current Value)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>PKR:</span>
                    <input
                      type="number"
                      step="50000"
                      style={{
                        width: '180px',
                        padding: '4px 8px',
                        fontWeight: 700,
                        fontSize: '14px',
                        textAlign: 'right',
                        fontFamily: 'var(--mono)',
                        border: '1px solid var(--rule-2)',
                        borderRadius: '4px',
                      }}
                      value={form.grossSalePrice ?? form.sellingPrice ?? ''}
                      onChange={(e) => updateField('grossSalePrice', +e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', padding: '0 8px' }}>
                  
                  {/* 2.2 FBR Section 236C (Advance Tax on Sale) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                        2.2 FBR Section 236C (Sale Tax · {liveCostSheet.sellerFilerStatus})
                      </span>
                    </div>
                    <input
                      type="number"
                      step="5000"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.tax236C ?? 150000}
                      onChange={(e) => updateField('tax236C', +e.target.value)}
                    />
                  </div>

                  {/* Real Estate Agent Fee (Sell Side) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      Agent Fee (Sell Side)
                    </span>
                    <input
                      type="number"
                      step="1000"
                      style={{ width: '130px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                      value={form.sellSideAgentFee ?? form.saleBrokerage ?? 10000}
                      onChange={(e) => updateField('sellSideAgentFee', +e.target.value)}
                    />
                  </div>

                </div>
              </div>

              {/* SPREADSHEET ROW 26: GROSS PROFIT */}
              <div
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--rule-2)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>
                    GROSS PROFIT (= Sale Price − Purchase Price)
                  </span>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-2)' }}>
                    Gross Margin: {(liveCostSheet.grossProfitPct || liveCostSheet.grossMarginPct || 0).toFixed(1)}%
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontFamily: 'var(--mono)',
                    fontWeight: 800,
                  }}
                  className={liveCostSheet.grossProfit >= 0 ? 'pos' : 'neg'}
                >
                  {M.fmt(liveCostSheet.grossProfit, numbers)}
                </div>
              </div>

              {/* SPREADSHEET ROWS 27–30: PROFIT PURIFICATION & STATUTORY DEDUCTIONS */}
              <div style={{ padding: '0 8px', marginBottom: '16px' }}>
                
                {/* Capital Gain Tax (CGT 15%) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--ink-2)' }}>
                    Less: Capital Gain Tax (CGT · 15% of Gross Profit)
                  </span>
                  <input
                    type="number"
                    step="500"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                    value={form.cgtAmount ?? Math.max(0, Math.round(liveCostSheet.grossProfit * 0.15))}
                    onChange={(e) => updateField('cgtAmount', +e.target.value)}
                  />
                </div>

                {/* ZAQAT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--ink-2)' }}>
                    Less: ZAQAT (Zakat Fund)
                  </span>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                    value={form.zakat ?? 10000}
                    onChange={(e) => updateField('zakat', +e.target.value)}
                  />
                </div>

                {/* CHARITY */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--ink-2)' }}>
                    Less: CHARITY (Sadaqah / Welfare)
                  </span>
                  <input
                    type="number"
                    step="500"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                    value={form.charity ?? 5000}
                    onChange={(e) => updateField('charity', +e.target.value)}
                  />
                </div>

                {/* Office / Salary overhead deduction */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--ink-2)' }}>
                    Less: Operational Overhead / Staff Deduction
                  </span>
                  <input
                    type="number"
                    step="1000"
                    style={{ width: '140px', padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}
                    value={form.officeExpenseDeduction ?? form.salaryExpenses ?? 5000}
                    onChange={(e) => updateField('officeExpenseDeduction', +e.target.value)}
                  />
                </div>

              </div>

              {/* SPREADSHEET ROW 31: NET MARGIN (CASH PROFIT) */}
              <div
                style={{
                  background: (liveCostSheet.netMargin ?? liveCostSheet.netProfit) >= 0 ? 'var(--good-wash)' : 'var(--bad-wash)',
                  border: '2px solid var(--ink)',
                  padding: '14px 18px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    Final Realized Cash (= Gross Profit − CGT − Zakat − Charity − Overhead)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--ink)' }}>
                    NET MARGIN
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: (liveCostSheet.netMargin ?? liveCostSheet.netProfit) >= 0 ? 'var(--good)' : 'var(--bad)', marginTop: '2px' }}>
                    Net Margin: {(liveCostSheet.netMarginPct || 0).toFixed(1)}% · Cash ROI: {(liveCostSheet.roiPct || 0).toFixed(1)}%
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontFamily: 'var(--display)',
                    fontWeight: 900,
                  }}
                  className={(liveCostSheet.netMargin ?? liveCostSheet.netProfit) >= 0 ? 'pos' : 'neg'}
                >
                  {M.fmt(liveCostSheet.netMargin ?? liveCostSheet.netProfit, numbers)}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: VISUAL WATERFALL, OFFICIAL VOUCHER & SENSITIVITY   */}
        {/* ================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* CARD 1: VISUAL WATERFALL & CAPITAL DISTRIBUTION (Excel Row 1 Requirement) */}
          <div className="panel">
            <div className="panel-h">
              <h3>Exit Value Allocation &amp; Visual Breakdown</h3>
              <span className="sub">Reporting &amp; Graph Visualization</span>
            </div>
            <div className="panel-b" style={{ padding: '16px' }}>
              
              {/* Stacked Percentage Bar */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  <span>Exit Realization Distribution ({M.fmt(liveCostSheet.grossSalePrice || liveCostSheet.sellingPrice, numbers)})</span>
                  <span>100%</span>
                </div>
                
                {(() => {
                  const saleP = liveCostSheet.grossSalePrice || liveCostSheet.sellingPrice || 1;
                  const buyPct = Math.min(100, Math.max(0, ((liveCostSheet.netBuyCost || liveCostSheet.purchasePrice) / saleP) * 100));
                  const taxPct = Math.min(100, Math.max(0, (liveCostSheet.totalTaxesToPay / saleP) * 100));
                  const expPct = Math.min(100, Math.max(0, (liveCostSheet.totalHandlingExpenses / saleP) * 100));
                  const commPct = Math.min(100, Math.max(0, (liveCostSheet.totalCommissions / saleP) * 100));
                  const netPct = Math.min(100, Math.max(0, ((liveCostSheet.netMargin ?? liveCostSheet.netProfit) / saleP) * 100));

                  return (
                    <div>
                      <div
                        style={{
                          height: '24px',
                          display: 'flex',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          background: 'var(--paper-2)',
                        }}
                      >
                        <div style={{ width: `${buyPct}%`, background: 'var(--brand)' }} title={`Base Buy: ${buyPct.toFixed(1)}%`} />
                        <div style={{ width: `${expPct}%`, background: 'var(--accent)' }} title={`Expenses: ${expPct.toFixed(1)}%`} />
                        <div style={{ width: `${commPct}%`, background: '#f59e0b' }} title={`Commissions: ${commPct.toFixed(1)}%`} />
                        <div style={{ width: `${taxPct}%`, background: 'var(--bad)' }} title={`Govt Taxes: ${taxPct.toFixed(1)}%`} />
                        <div style={{ width: `${netPct}%`, background: 'var(--good)' }} title={`Net Margin: ${netPct.toFixed(1)}%`} />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginTop: '10px', fontSize: '11px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '10px', height: '10px', background: 'var(--brand)', borderRadius: '2px' }} />
                          Net Buy: {buyPct.toFixed(1)}%
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '10px', height: '10px', background: 'var(--accent)', borderRadius: '2px' }} />
                          Handling: {expPct.toFixed(1)}%
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }} />
                          Comm.: {commPct.toFixed(1)}%
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '10px', height: '10px', background: 'var(--bad)', borderRadius: '2px' }} />
                          Govt Taxes: {taxPct.toFixed(1)}%
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '10px', height: '10px', background: 'var(--good)', borderRadius: '2px' }} />
                          Net Margin: {netPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Itemized Waterfall Key Points */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '6px 0' }}>Base Net Buy Cost</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                      {M.fmt(liveCostSheet.netBuyCost || liveCostSheet.purchasePrice, numbers)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--rule)', color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 0' }}>Society Transfer &amp; NDC</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                      +{M.fmt(liveCostSheet.totalSocietyGovtTransfer, numbers)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--rule)', color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 0' }}>FBR 236K (Advance Tax)</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                      +{M.fmt(liveCostSheet.tax236K, numbers)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--rule)', color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 0' }}>Handling, Fuel &amp; Expenses</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                      +{M.fmt(liveCostSheet.totalHandlingExpenses, numbers)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--rule)', color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 0' }}>Buy Agent Commission</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                      +{M.fmt(liveCostSheet.buySideAgentFee || liveCostSheet.purchaseBrokerage, numbers)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '2px solid var(--rule-2)', background: 'var(--paper-2)', fontWeight: 700 }}>
                    <td style={{ padding: '8px 4px' }}>All-In Landed Purchase Price</td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'var(--mono)', color: 'var(--brand)' }}>
                      {M.fmt(liveCostSheet.purchasePrice, numbers)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--rule)', fontWeight: 700 }}>
                    <td style={{ padding: '8px 4px' }}>Gross Exit Realization</td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'var(--mono)' }}>
                      {M.fmt(liveCostSheet.grossSalePrice || liveCostSheet.sellingPrice, numbers)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--rule)', background: 'rgba(18, 166, 124, 0.06)', fontWeight: 700 }}>
                    <td style={{ padding: '8px 4px' }}>= Gross Trading Profit</td>
                    <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'var(--mono)' }} className={liveCostSheet.grossProfit >= 0 ? 'pos' : 'neg'}>
                      {M.fmt(liveCostSheet.grossProfit, numbers)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--rule)', color: 'var(--ink-2)' }}>
                    <td style={{ padding: '6px 0' }}>Less: CGT (15%) + Zakat + Charity</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--mono)' }}>
                      −{M.fmt((liveCostSheet.cgtAmount || 0) + (liveCostSheet.zakat || 0) + (liveCostSheet.charity || 0) + (liveCostSheet.officeExpenseDeduction || 0), numbers)}
                    </td>
                  </tr>
                  <tr style={{ background: 'var(--good-wash)', fontWeight: 800 }}>
                    <td style={{ padding: '10px 4px', fontSize: '13px' }}>= NET MARGIN (Cash in Hand)</td>
                    <td style={{ textAlign: 'right', padding: '10px 4px', fontSize: '15px', fontFamily: 'var(--mono)' }} className="pos">
                      {M.fmt(liveCostSheet.netMargin ?? liveCostSheet.netProfit, numbers)}
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>
          </div>

          {/* CARD 2: OFFICIAL SETTLEMENT CERTIFICATE & STAMP */}
          <div className="panel">
            <div className="panel-h">
              <h3>Official Deal Settlement Voucher</h3>
              <span className="sub">Pakistani Real Estate Ledger Deed</span>
            </div>
            <div className="panel-b" style={{ padding: '16px', fontSize: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <span style={{ color: 'var(--ink-3)', fontSize: '11px' }}>Seller:</span>
                  <div style={{ fontWeight: 600 }}>{liveCostSheet.seller || 'Private Seller'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-3)', fontSize: '11px' }}>Buyer / Prospect:</span>
                  <div style={{ fontWeight: 600 }}>{liveCostSheet.buyer || 'Direct Investor'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-3)', fontSize: '11px' }}>Branch Office:</span>
                  <div>{liveCostSheet.office}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--ink-3)', fontSize: '11px' }}>Holding Period:</span>
                  <div>{liveCostSheet.heldDays} days ({(liveCostSheet.heldDays / 365).toFixed(1)} yrs)</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Verified &amp; Reconciled by:</div>
                  <div style={{ fontWeight: 700 }}>Meridian RMS Audit Engine</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button type="button" className="btn" onClick={handlePrint} style={{ fontSize: '11px', padding: '3px 8px' }}>
                    <Icon name="print" size={13} /> Print Certificate
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: MARKET STRESS-TEST SCENARIOS */}
          <div className="panel" data-noprint="1">
            <div className="panel-h">
              <h3>Market Exit Price Scenarios</h3>
              <span className="sub">Stress-test Net Margin vs Price Shifts</span>
            </div>
            <div className="panel-b" style={{ padding: 0 }}>
              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--rule-2)' }}>
                    <th style={{ padding: '6px 8px' }}>Scenario</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Exit Price</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Gross Profit</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Net Margin</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Net %</th>
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
                      <td style={{ padding: '6px 8px' }}>
                        {sc.label} {sc.factor === 1 ? '🎯' : ''}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        {M.fmt(sc.sellingPrice, numbers)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        <span className={sc.grossProfit >= 0 ? 'pos' : 'neg'}>{M.fmt(sc.grossProfit, numbers)}</span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        <span className={sc.netProfit >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>
                          {M.fmt(sc.netProfit, numbers)}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
                        <span className={sc.netMarginPct >= 10 ? 'pos' : sc.netMarginPct > 0 ? '' : 'neg'}>
                          {sc.netMarginPct.toFixed(1)}%
                        </span>
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
