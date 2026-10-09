'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PageShell, SummaryKpis, DataTable, MirrorChanges } from '../Shared';
import { ledgersReady, ledgerError } from '../../lib/firestore-service';
import { Icon } from '../Icons';
import { BrandBanner, BrandFooter } from '../Brand';
import { PrintNow } from '../PrintNow';
import * as M from '../../lib/re-data';
import { AttachmentsField } from '../Attachments';
import type { CostSheet } from '../../lib/types';

/* ---------------------------------------------------------------------------
   The lines of a cost sheet, in order. The screen and the printout both read
   this list, so the two can never disagree about what a sheet contains.
   --------------------------------------------------------------------------- */
type LineKind = 'base' | 'section' | 'item' | 'total' | 'result';
interface Line {
  kind: LineKind;
  label: string;
  no?: string;
  basis?: string;
  /** The amount field this line edits. */
  k?: string;
  /** A computed line. */
  value?: (cs: CostSheet) => number;
  /** A quick-fill rate offered beside the input: [label, amount for this sheet]. */
  rate?: (cs: CostSheet) => [string, number];
}

const LINES: Line[] = [
  { kind: 'base', label: 'Net buy cost', basis: 'Price paid for the property', k: 'netBuyCost' },
  { kind: 'section', no: '1', label: 'Society / govt transfer cost' },
  { kind: 'item', no: '1.1', label: 'NDC & verification fee', k: 'ndcFee' },
  { kind: 'item', no: '1.2', label: 'Provincial stamp duty', basis: '1% of buy cost', k: 'stampDuty', rate: (cs) => ['1%', Math.round(cs.netBuyCost * 0.01)] },
  { kind: 'item', no: '1.3', label: 'Capital value tax (CVT)', basis: '1% of buy cost', k: 'cvt', rate: (cs) => ['1%', Math.round(cs.netBuyCost * 0.01)] },
  { kind: 'item', no: '1.4', label: 'CDA / RDA transfer fee', k: 'cdaRdaTransferFee' },
  { kind: 'item', no: '1.5', label: 'Society transfer & society expenses', k: 'societyTransferFee' },
  { kind: 'item', no: '1.6', label: 'Legal charges', k: 'legalCharges' },
  { kind: 'item', no: '1.7', label: 'Development charges', k: 'developmentCharges' },
  { kind: 'item', no: '1.8', label: 'Other purchase costs', k: 'otherAcquisition' },
  { kind: 'section', no: '2', label: 'Govt taxes (buy side)' },
  { kind: 'item', no: '2.1', label: 'FBR §236K advance tax on purchase', basis: 'Filer 3%', k: 'tax236K', rate: (cs) => ['3%', Math.round(cs.netBuyCost * 0.03)] },
  { kind: 'section', no: '3', label: 'Handling & expenses' },
  { kind: 'item', no: '3.1', label: 'Renovation & repairs', k: 'renovationRepairs' },
  { kind: 'item', no: '3.2', label: 'Maintenance & bills', k: 'maintenanceBills' },
  { kind: 'item', no: '3.3', label: 'Marketing', k: 'marketingExpenses' },
  { kind: 'item', no: '3.4', label: 'Fuel & travelling', k: 'fuelTravelling' },
  { kind: 'item', no: '3.5', label: 'Salary', k: 'salaryExpenses' },
  { kind: 'item', no: '3.6', label: 'Other handling expenses', k: 'handlingExpenses' },
  { kind: 'section', no: '4', label: 'Real estate agent fee' },
  { kind: 'item', no: '4.1', label: 'Agent fee — buy side', k: 'buySideAgentFee' },
  { kind: 'total', label: 'Purchase price (landed cost)', basis: '= Net buy cost + 1 + 2 + 3 + 4', value: (cs) => cs.purchasePrice },
  { kind: 'base', label: 'Gross sale price', basis: 'Sale price, or current value if unsold', k: 'grossSalePrice' },
  { kind: 'section', no: '5', label: 'Selling costs' },
  { kind: 'item', no: '5.1', label: 'FBR §236C advance tax on sale', basis: 'Filer 3%', k: 'tax236C', rate: (cs) => ['3%', Math.round(cs.grossSalePrice * 0.03)] },
  { kind: 'item', no: '5.2', label: 'Agent fee — sell side', k: 'sellSideAgentFee' },
  { kind: 'item', no: '5.3', label: 'Other selling expenses', k: 'otherSellingExpenses' },
  { kind: 'total', label: 'Gross profit', basis: '= Sale price − selling costs − purchase price', value: (cs) => cs.grossProfit },
  { kind: 'section', no: '6', label: 'Deductions from profit' },
  {
    kind: 'item',
    no: '6.1',
    label: 'Capital gains tax (CGT)',
    basis: '15% of gross profit, if payable',
    k: 'cgtAmount',
    rate: (cs) => ['15%', Math.max(0, Math.round(cs.grossProfit * 0.15))],
  },
  { kind: 'item', no: '6.2', label: 'Zakat', k: 'zakat' },
  { kind: 'item', no: '6.3', label: 'Charity', k: 'charity' },
  { kind: 'item', no: '6.4', label: 'Office expense share', basis: 'Optional', k: 'officeExpenseDeduction' },
  { kind: 'result', label: 'Net margin (clean profit)', basis: '= Gross profit − 6', value: (cs) => cs.netMargin },
];

const amountOf = (cs: CostSheet, l: Line) => (l.value ? l.value(cs) : +cs[l.k as string] || 0);

/** What each field a mirror can change is called on screen. */
const SHEET_FIELD_LABEL: Record<string, string> = {
  ...Object.fromEntries(LINES.filter((l) => l.k).map((l) => [l.k as string, l.label])),
  propertyId: 'Linked property', name: 'Property name', project: 'Project', city: 'City', type: 'Property type',
  size: 'Size', status: 'Deal status', office: 'Office', seller: 'Seller', buyer: 'Buyer',
  purchaseDate: 'Purchase date', saleDate: 'Sale date',
};

/** The rate lines of a sheet that stand exactly at their rate. */
const atRate = (form: any): string[] => {
  const cs = M.calculateCostSheet(form);
  return LINES.filter((l) => l.rate && l.k && (+form[l.k] || 0) > 0 && Math.round(+form[l.k]) === l.rate(cs)[1]).map((l) => l.k as string);
};
const pctText = (n: number) => `${(n || 0).toFixed(1)}%`;

/** The deal a register row or a link points at, as the calculator should open it. */
const openKey = (cs: CostSheet) => (cs.fromRecords ? cs.propertyId : cs.id);

export function TradingPage() {
  const { tab, effectiveFilters: f, numbers, activeCostSheetId, openCostSheet, toast, refreshData } = useApp();
  const [printing, setPrinting] = useState<CostSheet | null>(null);

  const resetMirror = (cs: CostSheet) => {
    if (!ledgersReady() || ledgerError()) {
      toast('Not reset — your records are not reachable right now');
      return;
    }
    M.resetSheetMirror(cs.id);
    refreshData();
    toast(`${cs.id} now matches ${cs.mirrorOf} again`);
  };

  // =========================================================================
  // MIRROR COST SHEETS — editable copies, kept apart from the real deals
  // =========================================================================
  if (tab === 'mirrors') {
    // Listed in the same order as the deals in the register.
    const order = new Map(M.dealSheets().map((d: CostSheet, i: number) => [openKey(d), i]));
    const place = (m: CostSheet) => {
      const s: any = M.realSheet(m.mirrorOf);
      return order.get(s ? s.id || s.propertyId : m.mirrorOf) ?? order.size;
    };
    const rows: CostSheet[] = M.mirrorSheets().sort((a: CostSheet, b: CostSheet) => place(a) - place(b));
    const sum = (fn: (cs: CostSheet) => number) => rows.reduce((a: number, cs: CostSheet) => a + (fn(cs) || 0), 0);

    const summaryPairs: [string, string][] = [
      ['Mirror sheets', M.fmtNum(rows.length)],
      ['Purchase price (landed)', M.fmt(sum((cs) => cs.purchasePrice), numbers)],
      ['Sale / value', M.fmt(sum((cs) => cs.grossSalePrice), numbers)],
      ['Net margin', M.fmt(sum((cs) => cs.netMargin), numbers)],
    ];

    const cols = [
      {
        key: 'id',
        label: 'Sheet',
        render: (cs: CostSheet) => (
          <span className="mono" style={{ fontWeight: 700, color: 'var(--brand)' }}>
            {cs.id}
          </span>
        ),
      },
      {
        key: 'mirrorOf',
        label: 'Copy of',
        render: (cs: CostSheet) => <span className="tag mute">{cs.mirrorOf}</span>,
      },
      {
        key: 'mirrorEdits',
        label: 'Changed on mirror',
        render: (cs: CostSheet) => <MirrorChanges edits={cs.mirrorEdits} label={(k) => SHEET_FIELD_LABEL[k] || k} />,
      },
      { key: 'name', label: 'Property', render: (cs: CostSheet) => <b>{cs.name}</b> },
      { key: 'project', label: 'Project' },
      { key: 'status', label: 'Status' },
      { key: 'purchasePrice', label: 'Purchase price', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.purchasePrice, numbers) },
      { key: 'grossSalePrice', label: 'Sale / value', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.grossSalePrice, numbers) },
      {
        key: 'netMargin',
        label: 'Net margin',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => (
          <span className={cs.netMargin >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 800 }}>
            {M.fmt(cs.netMargin, numbers)}
          </span>
        ),
      },
      {
        key: 'actions',
        label: '',
        render: (cs: CostSheet) => (
          <span className="rowacts">
            <button type="button" className="btn sm pri" onClick={() => openCostSheet(cs.id)}>
              <Icon name="calculator" size={12} /> Open
            </button>
            <button type="button" className="btn sm" onClick={() => setPrinting(cs)} title="Print this cost sheet now">
              <Icon name="print" size={12} /> Print
            </button>
            {(cs.mirrorEdits || []).length > 0 && (
              <button type="button" className="btn sm" onClick={() => resetMirror(cs)} title={`Drop the changes made on this mirror so it matches ${cs.mirrorOf}`}>
                Reset to original
              </button>
            )}
          </span>
        ),
      },
    ];

    return (
      <PageShell
        title="Mirror cost sheets"
        u="نقل لاگت شیٹ"
        p="Every deal's cost sheet has a mirror that follows it: only the lines you change on a mirror differ. A mirror never changes a property or the trading figures."
      >
        <SummaryKpis pairs={summaryPairs} />
        {rows.length === 0 ? (
          <div className="empty">
            <Icon name="empty" />
            <h3>No mirror cost sheets yet</h3>
            <p>Every deal gets a mirror cost sheet automatically.</p>
          </div>
        ) : (
          <div style={{ marginTop: '14px' }}>
            <DataTable cols={cols} rows={rows} totals={true} />
          </div>
        )}
        {printing && (
          <PrintNow onDone={() => setPrinting(null)} margin="8mm">
            <PrintableCostSheetDoc sheet={printing} />
          </PrintNow>
        )}
      </PageShell>
    );
  }

  // =========================================================================
  // COST SHEET REGISTER — one row per deal, read from the records
  // =========================================================================
  if (tab === 'sheets') {
    const rows = M.dealSheets().filter((cs: CostSheet) => {
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

    const sum = (fn: (cs: CostSheet) => number) => rows.reduce((a: number, cs: CostSheet) => a + (fn(cs) || 0), 0);
    const totalSale = sum((cs) => cs.grossSalePrice);
    const totalNet = sum((cs) => cs.netMargin);

    const summaryPairs: [string, string][] = [
      ['Deals', M.fmtNum(rows.length)],
      ['Purchase price (landed)', M.fmt(sum((cs) => cs.purchasePrice), numbers)],
      ['Sale / current value', M.fmt(totalSale, numbers)],
      ['Gross profit', M.fmt(sum((cs) => cs.grossProfit), numbers)],
      ['Net margin', M.fmt(totalNet, numbers)],
      ['Net margin %', pctText(M.pctOf(totalNet, totalSale))],
    ];

    const cols = [
      {
        key: 'id',
        label: 'Sheet',
        render: (cs: CostSheet) => (
          <>
            <span className="mono" style={{ fontWeight: 700, color: 'var(--brand)' }}>
              {cs.fromRecords ? cs.propertyId : cs.id}
            </span>
            {cs.fromRecords && (
              <span className="tag mute" style={{ marginLeft: 6 }} title="Read from the property, sale, expense and tax records. Open and save to keep a copy.">
                From records
              </span>
            )}
          </>
        ),
      },
      { key: 'name', label: 'Property', render: (cs: CostSheet) => <b>{cs.name}</b> },
      { key: 'project', label: 'Project' },
      { key: 'status', label: 'Status' },
      { key: 'netBuyCost', label: 'Net buy cost', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.netBuyCost, numbers) },
      { key: 'purchasePrice', label: 'Purchase price', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => M.fmt(cs.purchasePrice, numbers) },
      { key: 'grossSalePrice', label: 'Sale / value', a: 'r' as const, sum: true, cls: 'mono', render: (cs: CostSheet) => <b>{M.fmt(cs.grossSalePrice, numbers)}</b> },
      {
        key: 'grossProfit',
        label: 'Gross profit',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => <span className={cs.grossProfit >= 0 ? 'pos' : 'neg'}>{M.fmt(cs.grossProfit, numbers)}</span>,
      },
      {
        key: 'netMargin',
        label: 'Net margin',
        a: 'r' as const,
        sum: true,
        cls: 'mono',
        render: (cs: CostSheet) => (
          <span className={cs.netMargin >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 800 }}>
            {M.fmt(cs.netMargin, numbers)}
          </span>
        ),
      },
      { key: 'netMarginPct', label: 'Margin %', a: 'r' as const, cls: 'mono', render: (cs: CostSheet) => pctText(cs.netMarginPct) },
      {
        key: 'actions',
        label: '',
        render: (cs: CostSheet) => (
          <span className="rowacts">
            <button type="button" className="btn sm pri" onClick={() => openCostSheet(openKey(cs))}>
              <Icon name="calculator" size={12} /> Open
            </button>
            <button type="button" className="btn sm" onClick={() => setPrinting(cs)} title="Print this cost sheet now">
              <Icon name="print" size={12} /> Print
            </button>
          </span>
        ),
      },
    ];

    return (
      <PageShell
        title="Cost sheet register"
        u="لاگت رجسٹر"
        p="Every deal with its cost sheet, read from the purchase, sale, expense, tax and Zakat records."
        acts={
          <button type="button" className="btn pri" onClick={() => openCostSheet('new')}>
            <Icon name="calculator" /> New cost sheet
          </button>
        }
      >
        <SummaryKpis pairs={summaryPairs} />
        <div style={{ marginTop: '14px' }}>
          <DataTable cols={cols} rows={rows} totals={true} />
        </div>
        {printing && (
          <PrintNow onDone={() => setPrinting(null)} margin="8mm">
            <PrintableCostSheetDoc sheet={printing} />
          </PrintNow>
        )}
      </PageShell>
    );
  }

  // =========================================================================
  // TRADING ANALYTICS — profitability by society
  // =========================================================================
  if (tab === 'analytics') {
    const prjMap: Record<string, { count: number; buyCost: number; rev: number; gross: number; net: number; comm: number }> = {};
    M.dealSheets().forEach((cs: CostSheet) => {
      const d = prjMap[cs.project] || (prjMap[cs.project] = { count: 0, buyCost: 0, rev: 0, gross: 0, net: 0, comm: 0 });
      d.count++;
      d.buyCost += cs.purchasePrice;
      d.rev += cs.grossSalePrice;
      d.gross += cs.grossProfit;
      d.net += cs.netMargin;
      d.comm += cs.totalCommissions;
    });

    const prjRows = Object.keys(prjMap)
      .map((prj) => {
        const d = prjMap[prj];
        return { id: prj, project: prj, ...d, margin: d.rev > 0 ? (d.net / d.rev) * 100 : 0 };
      })
      .sort((a, b) => b.net - a.net);

    const prjCols = [
      { key: 'project', label: 'Society / project' },
      { key: 'count', label: 'Deals', a: 'r' as const, cls: 'mono', render: (r: any) => M.fmtNum(r.count) },
      { key: 'buyCost', label: 'Purchase price', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.buyCost, numbers) },
      { key: 'rev', label: 'Sale / value', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.rev, numbers) },
      { key: 'comm', label: 'Agent commission', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => M.fmt(r.comm, numbers) },
      { key: 'gross', label: 'Gross profit', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => <span className={r.gross >= 0 ? 'pos' : 'neg'}>{M.fmt(r.gross, numbers)}</span> },
      { key: 'net', label: 'Net margin', a: 'r' as const, sum: true, cls: 'mono', render: (r: any) => <span className={r.net >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>{M.fmt(r.net, numbers)}</span> },
      { key: 'margin', label: 'Margin %', a: 'r' as const, cls: 'mono', render: (r: any) => pctText(r.margin) },
    ];

    return (
      <PageShell title="Trading comparison" u="تجزیہ منافع" p="Profitability of every deal, added up by society.">
        <div className="panel">
          <div className="panel-h">
            <h3>Society comparison</h3>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <DataTable cols={prjCols} rows={prjRows} totals={true} />
          </div>
        </div>
      </PageShell>
    );
  }

  // =========================================================================
  // DEAL COST SHEET
  // =========================================================================
  return <CostSheetView activeCostSheetId={activeCostSheetId} />;
}

// ---------------------------------------------------------------------------
// PRINTED COST SHEET — dark text on white, emphasis from rules and weight.
// Browsers drop background colours when printing by default, so nothing here
// relies on a filled background to be readable.
// ---------------------------------------------------------------------------
export function PrintableCostSheetDoc({ sheet }: { sheet: CostSheet }) {
  const full = (n: number) => M.fmt(n || 0, 'full');
  const date = (d: any) => (d ? M.fmtDate(d instanceof Date ? d : M.parseDate(d)) : '—');

  return (
    <div className="cs-doc">
      <div className="cs-doc-banner">
        <BrandBanner />
      </div>
      <div className="cs-doc-title">
        <div>
          <b>Property Cost Sheet</b>
          <span>{sheet.name || 'Untitled deal'}</span>
        </div>
        <div className="cs-doc-ref">
          <span>Sheet no.</span>
          <b>{sheet.fromRecords || !sheet.id ? sheet.propertyId || 'DRAFT' : sheet.id}</b>
          <span>Printed {M.fmtDate(new Date())}</span>
        </div>
      </div>

      <div className="cs-doc-facts">
        <div><span>Project / society</span><b>{sheet.project || '—'}</b></div>
        <div><span>City</span><b>{sheet.city || '—'}</b></div>
        <div><span>Type · size</span><b>{[sheet.type, sheet.size].filter(Boolean).join(' · ') || '—'}</b></div>
        <div><span>Status</span><b>{sheet.status || '—'}</b></div>
        <div><span>Purchased from</span><b>{sheet.seller || '—'}</b></div>
        <div><span>Purchase date</span><b>{date(sheet.purchaseDate)}</b></div>
        <div><span>Sold to</span><b>{sheet.buyer || '—'}</b></div>
        <div><span>Sale date</span><b>{date(sheet.saleDate)}</b></div>
      </div>

      <div className="cs-doc-kpis">
        <div><span>Purchase price</span><b>{full(sheet.purchasePrice)}</b></div>
        <div><span>Sale price</span><b>{full(sheet.grossSalePrice)}</b></div>
        <div><span>Gross profit</span><b>{full(sheet.grossProfit)}</b></div>
        <div className="hi">
          <span>Net margin</span>
          <b>{full(sheet.netMargin)}</b>
          <em>
            {pctText(sheet.netMarginPct)} of sale · ROI {pctText(sheet.roiPct)}
          </em>
        </div>
      </div>

      <table className="cs-doc-table">
        <thead>
          <tr>
            <th className="no">#</th>
            <th>Item</th>
            <th>Basis</th>
            <th className="r">Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>
          {LINES.map((l, i) =>
            l.kind === 'section' ? (
              <tr key={i} className="sec">
                <td className="no">{l.no}</td>
                <td colSpan={3}>{l.label}</td>
              </tr>
            ) : (
              <tr key={i} className={l.kind}>
                <td className="no">{l.no || ''}</td>
                <td>{l.label}</td>
                <td className="basis">{l.basis || ''}</td>
                <td className="r mono">{l.kind === 'item' && !amountOf(sheet, l) ? '—' : full(amountOf(sheet, l))}</td>
              </tr>
            )
          )}
        </tbody>
      </table>

      <div className="cs-doc-signs">
        <div><i />Prepared by</div>
        <div><i />Checked by</div>
        <div><i />Approved by</div>
      </div>
      <div className="cs-doc-foot">
        <BrandFooter />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEAL COST SHEET — opened from a saved sheet, from a property's records, as a
// mirror of another sheet, or blank.
// ---------------------------------------------------------------------------
function blankDeal(over: Record<string, any> = {}) {
  const zero: Record<string, number> = {};
  M.SHEET_AMOUNT_KEYS.forEach((k: string) => (zero[k] = 0));
  return M.calculateCostSheet({
    ...zero,
    id: '',
    name: '',
    project: M.PROJECTS[0].name,
    city: M.PROJECTS[0].city,
    type: 'Residential Plot',
    size: '',
    status: 'Active Deal',
    office: M.OFFICES[0],
    ...over,
  });
}

/** Find a mirror by its own ID (up to date with its original), else a deal's real sheet.
    A mirror shares its property with the real sheet, so it is only ever found by its own ID. */
function findSheet(key: string): CostSheet | null {
  return M.mirrorSheets().find((s: CostSheet) => s.id === key) || M.realSheet(key);
}

function CostSheetView({ activeCostSheetId }: { activeCostSheetId: string | null }) {
  const { toast, setActiveCostSheetId } = useApp();
  const allSheets: CostSheet[] = M.dealSheets();
  const mirrors: CostSheet[] = M.mirrorSheets();
  const [printing, setPrinting] = useState(false);

  const initialSheet = (): CostSheet => {
    const key = activeCostSheetId || '';
    if (key === 'new') return blankDeal();
    if (key) {
      const found = findSheet(key);
      if (found) return found.fromRecords ? { ...found, id: '' } : found;
    }
    const first = allSheets[0];
    if (!first) return blankDeal();
    return first.fromRecords ? (M.sheetFromRecords(first.propertyId) as CostSheet) : first;
  };

  const [form, setForm] = useState<any>(initialSheet);
  // Rate lines (1% stamp duty, 3% advance tax, 15% CGT) that follow their rate: as the amounts
  // they are based on change, so do they. Typing an amount of your own into one stops it.
  const [following, setFollowing] = useState<string[]>(() => atRate(form));
  const load = (next: any) => {
    setForm(next);
    setFollowing(atRate(next));
  };

  // Reload only when a different deal is asked for (or the records it is read from first
  // arrive) — never just because a ledger refreshed, which would wipe unsaved edits.
  const loadKey = `${activeCostSheetId || ''}|${M.DATA.properties.length}|${M.DATA.costSheets.length}`;
  useEffect(() => {
    load(initialSheet());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey]);

  const live: CostSheet = useMemo(() => M.calculateCostSheet(form), [form]);
  // A linked sheet follows its property's records; a mirror follows its original instead.
  const records: any = live.propertyId && !live.mirrorOf ? M.sheetFromRecords(live.propertyId) : null;
  const sources: any[] = records ? records.sources : [];

  // When the records change (here, elsewhere in the app or on another device), the lines they
  // move take the new amounts at once; a line typed over here keeps what was typed.
  const recordsKey = records ? JSON.stringify(records.recorded) : '';
  useEffect(() => {
    const next = M.syncSheetWithRecords(form);
    if (next === form) return;
    load(next);
    toast(`Brought up to date with the records of ${next.propertyId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsKey]);

  const withRates = (next: any, keys: string[]) => {
    let out = next;
    LINES.forEach((l) => {
      if (l.rate && l.k && keys.includes(l.k)) out = { ...out, [l.k]: l.rate(M.calculateCostSheet(out))[1] };
    });
    return out;
  };
  const updateField = (key: string, val: any) => setForm((prev: any) => withRates({ ...prev, [key]: val }, following));
  const setAmount = (key: string, raw: string) => {
    const keys = following.filter((k) => k !== key);
    if (keys.length !== following.length) setFollowing(keys);
    setForm((prev: any) => withRates({ ...prev, [key]: raw === '' ? 0 : Math.max(0, +raw || 0) }, keys));
  };
  const applyRate = (key: string) => {
    const keys = following.filter((k) => k !== key).concat(key);
    setFollowing(keys);
    setForm((prev: any) => withRates(prev, keys));
  };

  const linkProperty = (pid: string) => {
    // A new sheet linked to a property is filled from that property's records straight away.
    if (pid && !form.id) {
      const fromRecords = M.sheetFromRecords(pid);
      if (fromRecords) {
        load({ ...fromRecords, attachments: form.attachments || [], mirrorOf: form.mirrorOf });
        toast('Filled in from the records of ' + fromRecords.name);
        return;
      }
    }
    updateField('propertyId', pid);
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
    if (ledgerError()) {
      toast('Not saved — the database is not reachable (see the notice at the top)');
      return;
    }
    const { fromRecords, sources: _s, ...rest } = live as any;
    const saved = M.saveCostSheet(rest);
    setForm(saved);
    setActiveCostSheetId(saved.id);
    toast(`Cost sheet ${saved.id} saved`);
  };

  // A mirror follows its original; whatever differs from it is a change made on the mirror.
  const mirrorSource: any = live.mirrorOf ? M.realSheet(live.mirrorOf) : null;
  const differs = (k: string) => !!mirrorSource && !M.sameValue(form[k], mirrorSource[k]);
  const mirrorChanges: string[] = mirrorSource ? M.SHEET_MIRROR_KEYS.filter(differs) : [];
  const fldCls = (k: string) => (differs(k) ? 'fld mirror-diff' : 'fld');

  const resetToOriginal = () => {
    if (live.id) {
      if (!ledgersReady() || ledgerError()) {
        toast('Not reset — your records are not reachable right now');
        return;
      }
      load(M.resetSheetMirror(live.id));
    } else {
      load(M.syncSheetMirror({ ...form, mirrorEdits: [] }));
    }
    toast(`Now matches ${live.mirrorOf} again`);
  };

  const dateValue = (d: any) => (d ? M.dateInput(M.parseDate(d)) : '');
  const selectValue = live.id || (live.propertyId && !live.mirrorOf ? live.propertyId : 'new');

  return (
    <div className="page">
      <div className="cost-sheet-screen-only">
        <div className="phead cs-head">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h1 style={{ fontSize: '18px', margin: 0 }}>Property cost sheet</h1>
            <span className="u" style={{ fontSize: '12px' }}>پراپرٹی لاگت شیٹ</span>
          </div>
          <div className="acts" data-noprint="1">
            <label htmlFor="cs-pick" style={{ fontWeight: 600, fontSize: '12.5px' }}>
              Deal:
            </label>
            <select
              id="cs-pick"
              className="fldsel"
              style={{ minWidth: '240px', fontWeight: 600, height: '30px', padding: '2px 8px' }}
              value={selectValue}
              onChange={(e) => setActiveCostSheetId(e.target.value)}
            >
              <option value="new">➕ New blank sheet</option>
              {allSheets.map((s) => (
                <option key={openKey(s)} value={openKey(s)}>
                  {s.fromRecords ? s.propertyId : s.id} — {s.name} ({s.project})
                </option>
              ))}
              {mirrors.length > 0 && (
                <optgroup label="Mirror cost sheets">
                  {mirrors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.name} (copy of {s.mirrorOf})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button type="button" className="btn" onClick={() => setPrinting(true)} title="Print this cost sheet now">
              <Icon name="print" /> Print
            </button>
            <button type="button" className="btn pri" onClick={handleSave}>
              <Icon name="ok" /> Save
            </button>
          </div>
        </div>

        {live.mirrorOf && (
          <div className="note calm" style={{ marginBottom: '8px' }} data-noprint="1">
            <span className="ic"><Icon name="info" /></span>
            <div style={{ flex: 1 }}>
              This is a <b>mirror</b> of {live.mirrorOf} and follows it: a change made to {live.mirrorOf} shows here too
              {mirrorChanges.length ? (
                <>
                  , except the <b>{mirrorChanges.length} {mirrorChanges.length === 1 ? 'line' : 'lines'} changed on this mirror</b> (highlighted)
                </>
              ) : (
                <> — right now it matches exactly</>
              )}
              . Saving never changes {live.mirrorOf}.
            </div>
            {mirrorChanges.length > 0 && (
              <button type="button" className="btn sm" onClick={resetToOriginal} title={`Drop the changes made on this mirror so it matches ${live.mirrorOf}`}>
                Reset to original
              </button>
            )}
          </div>
        )}

        {/* HEADLINE FIGURES */}
        {/* Every digit, so each figure moves the moment an amount is typed. */}
        <div className="kpis cs-kpis">
          <div className="kpi"><span className="k">Purchase price (landed)</span><span className="v">{M.fmt(live.purchasePrice, 'full')}</span></div>
          <div className="kpi"><span className="k">Sale / current value</span><span className="v">{M.fmt(live.grossSalePrice, 'full')}</span></div>
          <div className="kpi"><span className="k">Gross profit</span><span className={`v ${live.grossProfit < 0 ? 'neg' : ''}`}>{M.fmt(live.grossProfit, 'full')}</span></div>
          <div className="kpi hi"><span className="k">Net margin</span><span className={`v ${live.netMargin < 0 ? 'neg' : 'pos'}`}>{M.fmt(live.netMargin, 'full')}</span></div>
          <div className="kpi"><span className="k">Net margin %</span><span className="v">{pctText(live.netMarginPct)}</span></div>
          <div className="kpi"><span className="k">Return on cost</span><span className="v">{pctText(live.roiPct)}</span></div>
        </div>

        <div className="cs-grid">
          {/* THE SHEET */}
          <div className="panel cs-ledger">
            <div className="panel-h">
              <h3>{live.name || 'New deal'}</h3>
              <span className="sub">{live.project}</span>
              <span className="spacer" />
              {live.mirrorOf && <span className="tag mute">Mirror of {live.mirrorOf}</span>}
              <span className="tag ok">{live.id || (live.propertyId ? 'Not saved yet' : 'Draft')}</span>
            </div>
            <table className="cs-table">
              <thead>
                <tr>
                  <th className="no">#</th>
                  <th>Item</th>
                  <th>Basis</th>
                  <th className="r">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {LINES.map((l, i) => {
                  if (l.kind === 'section') {
                    return (
                      <tr key={i} className="sec">
                        <td className="no">{l.no}</td>
                        <td colSpan={3}>{l.label}</td>
                      </tr>
                    );
                  }
                  const rate = l.rate ? l.rate(live) : null;
                  const changed = !!l.k && differs(l.k);
                  return (
                    <tr key={i} className={changed ? `${l.kind} mirror-diff` : l.kind}>
                      <td className="no">{l.no || ''}</td>
                      <td>{l.label}</td>
                      <td className="basis">
                        {l.basis || ''}
                        {rate && rate[1] > 0 && Math.round(+form[l.k as string] || 0) !== rate[1] && (
                          <button
                            type="button"
                            className="ratebtn"
                            onClick={() => applyRate(l.k as string)}
                            title={`Fill in ${rate[0]} = ${M.fmt(rate[1], 'full')}`}
                          >
                            use {rate[0]}
                          </button>
                        )}
                      </td>
                      <td className="r">
                        {l.k ? (
                          <>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              aria-label={l.label}
                              value={form[l.k] === 0 || form[l.k] == null ? '' : form[l.k]}
                              placeholder="0"
                              onChange={(e) => setAmount(l.k as string, e.target.value)}
                            />
                            {changed && <small className="mirror-was">Original {M.fmt(+mirrorSource[l.k] || 0, 'full')}</small>}
                          </>
                        ) : (
                          <b className={`mono ${amountOf(live, l) < 0 ? 'neg' : l.kind === 'result' ? 'pos' : ''}`}>
                            {M.fmt(amountOf(live, l), 'full')}
                          </b>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DEAL DETAILS AND WHERE THE FIGURES CAME FROM */}
          <div className="cs-side">
            <div className="panel" data-noprint="1">
              <div className="panel-h">
                <h3>Deal details</h3>
              </div>
              <div className="panel-b">
                <div className="formgrid one">
                  <div className={fldCls('propertyId')}>
                    <label htmlFor="cs-prop">Linked property</label>
                    <select id="cs-prop" value={form.propertyId || ''} onChange={(e) => linkProperty(e.target.value)}>
                      <option value="">— Not linked —</option>
                      {M.DATA.properties.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.id} — {p.name}
                        </option>
                      ))}
                    </select>
                    <span className="hint">Linking fills the sheet from that property’s purchase, sale, expenses and taxes, and keeps it up to date as they change.</span>
                  </div>
                  <div className={fldCls('name')}>
                    <label htmlFor="cs-name">Property name *</label>
                    <input id="cs-name" value={form.name || ''} placeholder="Plot 1104, Faisal Hills" onChange={(e) => updateField('name', e.target.value)} />
                  </div>
                  <div className={fldCls('project')}>
                    <label htmlFor="cs-project">Project / society</label>
                    <input id="cs-project" list="cs-projects" value={form.project || ''} onChange={(e) => updateField('project', e.target.value)} />
                    <datalist id="cs-projects">
                      {M.PROJECTS.map((p: any) => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className={fldCls('city')}>
                    <label htmlFor="cs-city">City</label>
                    <input id="cs-city" value={form.city || ''} onChange={(e) => updateField('city', e.target.value)} />
                  </div>
                  <div className={fldCls('type')}>
                    <label htmlFor="cs-type">Property type</label>
                    <select id="cs-type" value={form.type || M.TYPES[0]} onChange={(e) => updateField('type', e.target.value)}>
                      {M.TYPES.map((t: string) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className={fldCls('size')}>
                    <label htmlFor="cs-size">Size</label>
                    <input id="cs-size" value={form.size || ''} placeholder="5 Marla" onChange={(e) => updateField('size', e.target.value)} />
                  </div>
                  <div className={fldCls('status')}>
                    <label htmlFor="cs-status">Deal status</label>
                    <select id="cs-status" value={form.status || 'Active Deal'} onChange={(e) => updateField('status', e.target.value)}>
                      {['Draft', 'Active Deal', 'Reserved', 'Sold'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className={fldCls('purchaseDate')}>
                    <label htmlFor="cs-pdate">Purchase date</label>
                    <input id="cs-pdate" type="date" value={dateValue(form.purchaseDate)} onChange={(e) => updateField('purchaseDate', e.target.value || M.TODAY)} />
                  </div>
                  <div className={fldCls('saleDate')}>
                    <label htmlFor="cs-sdate">Sale date</label>
                    <input id="cs-sdate" type="date" value={dateValue(form.saleDate)} onChange={(e) => updateField('saleDate', e.target.value || null)} />
                  </div>
                  <div className="fld">
                    <label>Attachments</label>
                    <AttachmentsField value={form.attachments || []} onChange={(next) => updateField('attachments', next)} />
                  </div>
                </div>
              </div>
            </div>

            {live.propertyId && !live.mirrorOf && (
              <div className="panel" data-noprint="1">
                <div className="panel-h">
                  <h3>From the records</h3>
                  <span className="sub">linked to {live.propertyId}</span>
                </div>
                <div className="panel-b tight">
                  {sources.length === 0 ? (
                    <p className="muted" style={{ margin: 0, fontSize: '12.5px' }}>
                      Only the purchase and sale are recorded for this property. Expenses, taxes and Zakat show here once
                      they are entered with this property picked.
                    </p>
                  ) : (
                    <ul className="cs-sources">
                      {sources.map((s, i) => (
                        <li key={i}>
                          <span className="mono">{s.id}</span>
                          <span>{s.what}</span>
                          <b className="mono">{M.fmt(s.amount, 'full')}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ctrl+P on this page prints the sheet document, not the form. */}
      {!printing && (
        <div className="cost-sheet-print-only">
          <PrintableCostSheetDoc sheet={live} />
        </div>
      )}
      {printing && (
        <PrintNow onDone={() => setPrinting(false)} margin="8mm">
          <PrintableCostSheetDoc sheet={live} />
        </PrintNow>
      )}
    </div>
  );
}
