'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as M from '../lib/re-data';
import { NAV, PAGE_META } from '../lib/constants';
import type { User, Filters, ModalState, MenuState, DateRange } from '../lib/types';

interface AppContextType {
  user: User;
  role: string;
  page: string;
  tab: string | null;
  rangeKey: string;
  custom: { start: string; end: string };
  filters: Filters;
  numbers: 'cr' | 'm' | 'full';
  query: string;
  navQuery: string;
  sort: { key: string; dir: 'asc' | 'desc' } | null;
  showAll: boolean;
  period: 'weekly' | 'monthly' | 'yearly';
  grossBasis: 'cogs' | 'doc';
  menu: MenuState | null;
  modal: ModalState | null;
  fresh: string[];
  dataVersion: number;
  tip: { html: string; x: number; y: number; visible: boolean };
  toastMsg: { text: string; visible: boolean };
  
  // Helpers
  range: DateRange;
  effectiveFilters: Filters;
  denied: (key?: string) => boolean;
  visibleTabs: (sec: any) => any[];
  visibleSections: () => any[];

  // Actions
  goto: (path: string) => void;
  setUser: (u: User) => void;
  setRangeKey: (k: string) => void;
  setCustom: (c: { start: string; end: string }) => void;
  setFilter: (k: string, v: string) => void;
  clearFilters: () => void;
  setNumbers: (fmt: 'cr' | 'm' | 'full') => void;
  setQuery: (q: string) => void;
  setNavQuery: (q: string) => void;
  setSort: (key: string) => void;
  toggleShowAll: () => void;
  setShowAll: (v: boolean) => void;
  setPeriod: (p: 'weekly' | 'monthly' | 'yearly') => void;
  setGrossBasis: (b: 'cogs' | 'doc') => void;
  openMenu: (id: string, x: number, y: number) => void;
  closeMenu: () => void;
  openModal: (id: 'property' | 'sale' | 'expense' | 'payment' | 'saleInvoice' | 'purchaseInvoice') => void;
  closeModal: () => void;
  setModalField: (key: string, value: any) => void;
  submitModal: () => void;
  voidPayment: (id: string) => void;
  showTip: (html: string, x: number, y: number) => void;
  hideTip: () => void;
  toast: (msg: string) => void;
  activeCostSheetId: string | null;
  setActiveCostSheetId: (id: string | null) => void;
  openCostSheet: (id: string) => void;
  exportCsv: () => void;
  exportXls: () => void;
  print: () => void;
}


const AppContext = createContext<AppContextType | null>(null);

const n = (v: any) => (v === '' || v == null || isNaN(+v) ? 0 : +v);
const dstr = (d: Date | string) => (d instanceof Date ? M.dateInput(d) : d);

export const FORMS_DEF: Record<string, any> = {
  property: {
    title: 'Add a property',
    sub: 'Records a purchase. Acquisition costs are added to the price to give total cost (§6).',
    fields: [
      { g: 'Property' },
      { k: 'name', l: 'Property name / title', req: true, ph: 'House A-126' },
      { k: 'type', l: 'Property type', type: 'select', opts: () => M.TYPES, req: true },
      { k: 'projectId', l: 'Project / society', type: 'select', opts: () => M.PROJECTS.map((p: any) => [p.id, p.name]), req: true },
      { k: 'size', l: 'Size', ph: '10 Marla', req: true },
      { k: 'block', l: 'Block', ph: 'Block C' },
      { k: 'unit', l: 'Plot / unit number', ph: '126' },
      { k: 'status', l: 'Current status', type: 'select', opts: () => M.STATUSES, def: 'Available', req: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { g: 'Purchase' },
      { k: 'seller', l: 'Seller / vendor', req: true, ph: 'Falcon Developers' },
      { k: 'purchaseDate', l: 'Purchase date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { k: 'price', l: 'Purchase price (PKR)', type: 'money', req: true, min: 1 },
      { k: 'registration', l: 'Registration / transfer', type: 'money' },
      { k: 'legal', l: 'Legal charges', type: 'money' },
      { k: 'development', l: 'Development charges', type: 'money' },
      { k: 'otherCost', l: 'Other purchase costs', type: 'money' },
      { g: 'Payment & valuation' },
      { k: 'paid', l: 'Amount paid to seller', type: 'money', hint: 'Cannot exceed total cost.' },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer' },
      { k: 'currentValue', l: 'Current market value', type: 'money', hint: 'Defaults to the purchase price.' },
    ],
    calc: (v: any) => {
      const total = n(v.price) + n(v.registration) + n(v.legal) + n(v.development) + n(v.otherCost);
      return [
        ['Purchase price', n(v.price)],
        ['Acquisition costs', total - n(v.price)],
        ['Total property cost', total, true],
        ['Paid', n(v.paid)],
        ['Remaining to seller', Math.max(0, total - n(v.paid))],
      ];
    },
    validate: (v: any) => {
      const e: Record<string, string> = {};
      const total = n(v.price) + n(v.registration) + n(v.legal) + n(v.development) + n(v.otherCost);
      if (n(v.paid) > total) e.paid = 'Paid cannot exceed the total cost of ' + M.fmt(total, 'cr') + '.';
      return e;
    },
    submit: (v: any) => {
      const p = M.addProperty(v);
      return { id: p.id, msg: 'Property ' + p.id + ' added', go: 'properties/inventory' };
    },
  },
  sale: {
    title: 'Record a sale',
    sub: 'Creates the sale, the agent commission entry and the receipt (§7, §10, §26).',
    fields: [
      { g: 'Sale' },
      {
        k: 'propertyId',
        l: 'Property',
        type: 'select',
        req: true,
        opts: () => M.DATA.properties.filter((p: any) => p.status !== 'Sold').map((p: any) => [p.id, p.name + ' · ' + p.project]),
      },
      { k: 'buyer', l: 'Buyer', req: true, ph: 'Kamran Aziz' },
      {
        k: 'agentId',
        l: 'Agent',
        type: 'select',
        req: true,
        opts: () => M.DATA.agents.map((a: any) => [a.id, a.name + ' (' + a.rate + '%)']),
      },
      { k: 'date', l: 'Sale date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { g: 'Money' },
      { k: 'sellingPrice', l: 'Selling price (PKR)', type: 'money', req: true, min: 1 },
      { k: 'received', l: 'Amount received', type: 'money', hint: 'Cannot exceed the selling price.' },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', req: true },
      { k: 'commissionPct', l: 'Commission %', type: 'number', hint: 'Blank uses the agent’s standard rate.' },
      { k: 'tax', l: 'Withholding tax', type: 'money', hint: 'Blank uses 1% of the selling price.' },
      { k: 'otherExpenses', l: 'Other selling expenses', type: 'money' },
    ],
    calc: (v: any) => {
      const p = M.DATA.properties.find((x: any) => x.id === v.propertyId);
      const price = n(v.sellingPrice);
      const ag = M.DATA.agents.find((a: any) => a.id === v.agentId);
      const rate = v.commissionPct === '' || v.commissionPct == null ? (ag ? ag.rate : 0) : n(v.commissionPct);
      const comm = Math.round((price * rate) / 100);
      const tax = v.tax === '' || v.tax == null ? Math.round(price * 0.01) : n(v.tax);
      const cost = p ? p.totalCost : 0;
      return [
        ['Property cost', cost],
        ['Selling price', price],
        ['Gross profit', price - cost, false, true],
        ['Commission (' + rate + '%)', -comm],
        ['Withholding tax', -tax],
        ['Other selling costs', -n(v.otherExpenses)],
        ['Net profit on this sale', price - cost - comm - tax - n(v.otherExpenses), true],
      ];
    },
    validate: (v: any) => {
      const e: Record<string, string> = {};
      if (n(v.received) > n(v.sellingPrice)) e.received = 'Received cannot exceed the selling price.';
      const p = M.DATA.properties.find((x: any) => x.id === v.propertyId);
      if (p && v.date && M.parseDate(v.date) < p.purchaseDate)
        e.date = 'Sale date is before the property was purchased (' + M.fmtDate(p.purchaseDate) + ').';
      if (v.commissionPct !== '' && (n(v.commissionPct) < 0 || n(v.commissionPct) > 20))
        e.commissionPct = 'Commission must be between 0 and 20%.';
      return e;
    },
    submit: (v: any) => {
      const s = M.addSale(v);
      return { id: s.id, msg: 'Sale ' + s.id + ' recorded', go: 'sales/register' };
    },
  },
  expense: {
    title: 'Add an expense',
    sub: 'Posts to the expense ledger and, if paid, to the cash ledger (§13).',
    fields: [
      { g: 'Expense' },
      {
        k: 'group',
        l: 'Category',
        type: 'select',
        req: true,
        opts: () => ['Office Expenses', 'Employee Expenses', 'Marketing Expenses', 'Property Expenses', 'Other Expenses'],
      },
      { k: 'category', l: 'Sub-category', req: true, ph: 'Electricity' },
      { k: 'vendor', l: 'Vendor', req: true, ph: 'City Traders' },
      { k: 'date', l: 'Date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { g: 'Amount' },
      { k: 'amount', l: 'Amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'paid', l: 'Amount paid', type: 'money', hint: 'Cannot exceed the amount.' },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer' },
      { k: 'note', l: 'Note', ph: 'Optional description', full: true },
    ],
    calc: (v: any) => [
      ['Amount', n(v.amount)],
      ['Paid', n(v.paid)],
      ['Outstanding', Math.max(0, n(v.amount) - n(v.paid)), true],
    ],
    validate: (v: any) => (n(v.paid) > n(v.amount) ? { paid: 'Paid cannot exceed the amount.' } : {}),
    submit: (v: any) => {
      const e = M.addExpense(v);
      return { id: e.id, msg: 'Expense ' + e.id + ' recorded', go: 'costs/expenses' };
    },
  },
  payment: {
    title: 'Record a payment',
    sub: 'A single money-in or money-out entry on the cash ledger (§26, §27).',
    fields: [
      { g: 'Payment' },
      {
        k: 'dir',
        l: 'Direction',
        type: 'select',
        req: true,
        opts: () => [
          ['in', 'Money in (received)'],
          ['out', 'Money out (paid)'],
        ],
        def: 'in',
      },
      {
        k: 'category',
        l: 'Category',
        type: 'select',
        req: true,
        opts: () => [
          'Property Sale',
          'Customer Payment',
          'Other Income',
          'Investment',
          'Property Purchase',
          'Agent Commission',
          'Employee Salaries',
          'Office Expenses',
          'Bills',
          'Taxes',
          'Zakat',
          'Marketing Expenses',
          'Other Expenses',
        ],
      },
      { k: 'party', l: 'Customer / vendor', req: true, ph: 'Kamran Aziz' },
      { k: 'date', l: 'Date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { g: 'Amount' },
      { k: 'amount', l: 'Amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'method', l: 'Method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', req: true },
      { k: 'account', l: 'Bank / cash account', type: 'select', opts: () => M.ACCOUNTS, req: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { k: 'ref', l: 'Reference number', ph: 'Cheque or transfer reference' },
      { k: 'note', l: 'Description', ph: 'What this payment is for', full: true },
    ],
    calc: (v: any) => [[v.dir === 'out' ? 'Money out' : 'Money in', n(v.amount), true]],
    validate: () => ({}),
    submit: (v: any) => {
      const t = M.addPayment(v);
      return { id: t.id, msg: 'Transaction ' + t.id + ' posted', go: 'admin/transactions' };
    },
  },
  saleInvoice: {
    title: 'Create sale invoice',
    sub: 'Invoice/receipt given to the buyer with all transaction details.',
    fields: [
      { g: 'Invoice' },
      { k: 'receiptDate', l: 'Receipt date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      {
        k: 'propertyId',
        l: 'Property',
        type: 'select',
        opts: () => [['', '— Select —'], ...M.DATA.properties.map((p: any) => [p.id, p.name + ' · ' + p.project])],
      },
      { g: 'Buyer details' },
      { k: 'buyerName', l: 'Buyer name', req: true, ph: 'Kamran Aziz' },
      { k: 'buyerCompany', l: 'Company', ph: 'Company name (optional)' },
      { k: 'buyerCnic', l: 'Buyer CNIC', ph: '00000-0000000-0' },
      { g: 'Payment details' },
      { k: 'paymentDate', l: 'Payment date', type: 'date' },
      { k: 'bankDetailsBuyer', l: 'Buyer bank details', ph: 'Bank name & account' },
      { k: 'bankDetailsSeller', l: 'Seller bank details', ph: 'Bank name & account' },
      { g: 'Amounts' },
      { k: 'totalAmount', l: 'Total amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'balanceAmount', l: 'Balance amount (PKR)', type: 'money' },
      { k: 'tokenAmount', l: 'Token amount (PKR)', type: 'money' },
      { k: 'tokenDate', l: 'Token date', type: 'date' },
      { k: 'transferDate', l: 'Transfer date', type: 'date' },
      { g: 'Received by (seller)' },
      { k: 'receivedByName', l: 'Name', req: true, ph: 'Person receiving payment' },
      { k: 'receivedByCnic', l: 'CNIC', ph: '00000-0000000-0' },
      { g: 'Received from (buyer)' },
      { k: 'receivedFromName', l: 'Name', req: true, ph: 'Person making payment' },
      { k: 'receivedFromCnic', l: 'CNIC', ph: '00000-0000000-0' },
      { k: 'notes', l: 'Notes', ph: 'Optional notes', full: true },
    ],
    calc: (v: any) => [
      ['Total amount', n(v.totalAmount)],
      ['Token / advance', n(v.tokenAmount)],
      ['Balance remaining', n(v.balanceAmount) || Math.max(0, n(v.totalAmount) - n(v.tokenAmount)), true],
    ],
    validate: (v: any) => {
      const e: Record<string, string> = {};
      if (n(v.tokenAmount) > n(v.totalAmount)) e.tokenAmount = 'Token cannot exceed total amount.';
      if (n(v.balanceAmount) > n(v.totalAmount)) e.balanceAmount = 'Balance cannot exceed total amount.';
      return e;
    },
    submit: (v: any) => {
      const inv = M.addInvoice({ ...v, type: 'sale' });
      return { id: inv.id, msg: 'Sale invoice ' + inv.id + ' created', go: 'sales/saleInvoices' };
    },
  },
  purchaseInvoice: {
    title: 'Create purchase invoice',
    sub: 'Invoice/receipt kept by the company for internal records.',
    fields: [
      { g: 'Invoice' },
      { k: 'receiptDate', l: 'Receipt date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      {
        k: 'propertyId',
        l: 'Property',
        type: 'select',
        opts: () => [['', '— Select —'], ...M.DATA.properties.map((p: any) => [p.id, p.name + ' · ' + p.project])],
      },
      { g: 'Buyer details' },
      { k: 'buyerName', l: 'Buyer name', req: true, ph: 'Kamran Aziz' },
      { k: 'buyerCompany', l: 'Company', ph: 'Company name (optional)' },
      { k: 'buyerCnic', l: 'Buyer CNIC', ph: '00000-0000000-0' },
      { g: 'Payment details' },
      { k: 'paymentDate', l: 'Payment date', type: 'date' },
      { k: 'bankDetailsBuyer', l: 'Buyer bank details', ph: 'Bank name & account' },
      { k: 'bankDetailsSeller', l: 'Seller bank details', ph: 'Bank name & account' },
      { g: 'Amounts' },
      { k: 'totalAmount', l: 'Total amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'balanceAmount', l: 'Balance amount (PKR)', type: 'money' },
      { k: 'tokenAmount', l: 'Token amount (PKR)', type: 'money' },
      { k: 'tokenDate', l: 'Token date', type: 'date' },
      { k: 'transferDate', l: 'Transfer date', type: 'date' },
      { g: 'Received by (company)' },
      { k: 'receivedByName', l: 'Name', req: true, ph: 'Company representative' },
      { k: 'receivedByCnic', l: 'CNIC', ph: '00000-0000000-0' },
      { g: 'Received from (seller)' },
      { k: 'receivedFromName', l: 'Name', req: true, ph: 'Seller / vendor name' },
      { k: 'receivedFromCnic', l: 'CNIC', ph: '00000-0000000-0' },
      { k: 'notes', l: 'Notes', ph: 'Optional notes', full: true },
    ],
    calc: (v: any) => [
      ['Total amount', n(v.totalAmount)],
      ['Token / advance', n(v.tokenAmount)],
      ['Balance remaining', n(v.balanceAmount) || Math.max(0, n(v.totalAmount) - n(v.tokenAmount)), true],
    ],
    validate: (v: any) => {
      const e: Record<string, string> = {};
      if (n(v.tokenAmount) > n(v.totalAmount)) e.tokenAmount = 'Token cannot exceed total amount.';
      if (n(v.balanceAmount) > n(v.totalAmount)) e.balanceAmount = 'Balance cannot exceed total amount.';
      return e;
    },
    submit: (v: any) => {
      const inv = M.addInvoice({ ...v, type: 'purchase' });
      return { id: inv.id, msg: 'Purchase invoice ' + inv.id + ' created', go: 'sales/purchaseInvoices' };
    },
  },
};

function formDefaults(id: string) {
  const v: Record<string, any> = {};
  const F = FORMS_DEF[id];
  if (!F) return v;
  F.fields.forEach((fd: any) => {
    if (fd.g) return;
    const def = typeof fd.def === 'function' ? fd.def() : fd.def;
    if (def !== undefined) {
      v[fd.k] = def;
    } else if (fd.type === 'select') {
      const opts = fd.opts();
      const first = Array.isArray(opts[0]) ? opts[0][0] : opts[0];
      v[fd.k] = String(first);
    } else {
      v[fd.k] = '';
    }
  });
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User>(M.USERS[0] as unknown as User);
  const [page, setPage] = useState<string>('dashboard');
  const [tab, setTab] = useState<string | null>('overview');
  const [rangeKey, setRangeKey] = useState<string>('thisYear');
  const [custom, setCustomState] = useState<{ start: string; end: string }>({ start: '2026-01-01', end: '2026-09-01' });
  const [filters, setFilters] = useState<Filters>({ ...M.EMPTY_FILTERS });
  const [numbers, setNumbers] = useState<'cr' | 'm' | 'full'>('cr');
  const [query, setQuery] = useState<string>('');
  const [navQuery, setNavQueryState] = useState<string>('');
  const [sort, setSortState] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [grossBasis, setGrossBasis] = useState<'cogs' | 'doc'>('cogs');
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [tip, setTip] = useState<{ html: string; x: number; y: number; visible: boolean }>({
    html: '',
    x: 0,
    y: 0,
    visible: false,
  });
  const [toastMsg, setToastMsg] = useState<{ text: string; visible: boolean }>({ text: '', visible: false });
  const [activeCostSheetId, setActiveCostSheetId] = useState<string | null>(null);

  const role = user.role;

  const denied = useCallback(
    (key?: string) => {
      if (!key) return false;
      const roleConfig = (M.ROLES as any)[role];
      return !!roleConfig && (roleConfig.deny || []).indexOf(key) >= 0;
    },
    [role]
  );

  const sectionOf = useCallback((id: string) => NAV.find((s) => s.id === id), []);
  const visibleTabs = useCallback(
    (sec: any) => (!sec ? [] : sec.tabs.filter((t: any) => !denied(t.need))),
    [denied]
  );
  const visibleSections = useCallback(
    () => NAV.filter((s) => visibleTabs(s).length > 0),
    [visibleTabs]
  );

  const effectiveFilters = useMemo(() => {
    const f: Filters = { ...filters };
    if (role === 'Agent') {
      f.agent = user.agentId || '';
      f.propIds = M.DATA.sales.filter((s: any) => s.agentId === user.agentId).map((s: any) => s.propertyId);
    }
    return f;
  }, [filters, role, user.agentId, dataVersion]);

  const range: DateRange = useMemo(() => M.rangeFor(rangeKey, custom), [rangeKey, custom]);

  const toast = useCallback((msg: string) => {
    setToastMsg({ text: msg, visible: true });
    setTimeout(() => {
      setToastMsg((prev) => ({ ...prev, visible: false }));
    }, 2600);
  }, []);

  const goto = useCallback(
    (path: string) => {
      const [p, t] = String(path).split('/');
      const sec = sectionOf(p);
      let targetPage = p;
      let targetTab: string | null = t || null;

      if (sec && !visibleTabs(sec).length) {
        targetPage = 'dashboard';
        targetTab = 'overview';
      } else if (sec) {
        const tabs = visibleTabs(sec);
        const curTab = tabs.find((x: any) => x.id === targetTab);
        if (!curTab) {
          targetTab = tabs[0]?.id || null;
        }
      }

      setPage(targetPage);
      setTab(targetTab);
      setQuery('');
      setSortState(null);
      setShowAll(false);
      setMenu(null);

      if (typeof window !== 'undefined') {
        const hash = sec ? `${targetPage}/${targetTab}` : targetPage;
        window.location.hash = hash;
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    },
    [sectionOf, visibleTabs]
  );

  const openCostSheet = useCallback((id: string) => {
    setActiveCostSheetId(id);
    setPage('trading');
    setTab('calculator');
    setQuery('');
    setSortState(null);
    setShowAll(false);
    setMenu(null);
    if (typeof window !== 'undefined') {
      window.location.hash = 'trading/calculator';
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);


  // Sync hash on mount and popstate
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHash = () => {
      const h = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!h) return;
      const [p, t] = h.split('/');
      if (p === 'account' || p === 'search') {
        setPage(p);
        setTab(null);
        setQuery('');
        setSortState(null);
        setShowAll(false);
        return;
      }
      const sec = sectionOf(p);
      if (!sec) return;
      const vis = visibleTabs(sec);
      setQuery('');
      setSortState(null);
      setShowAll(false);
      setMenu(null);
      if (!vis.length) {
        setPage('dashboard');
        setTab('overview');
        return;
      }
      setPage(p);
      const curTab = vis.find((x: any) => x.id === t);
      setTab(curTab ? curTab.id : vis[0].id);
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [sectionOf, visibleTabs]);

  const setUser = useCallback(
    (u: User) => {
      setUserState(u);
      setFilters({ ...M.EMPTY_FILTERS });
      setMenu(null);
      goto('dashboard/overview');
      toast(`Signed in as ${u.name} (${u.role})`);
    },
    [goto, toast]
  );

  const setCustom = useCallback((c: { start: string; end: string }) => {
    setCustomState(c);
  }, []);

  const setFilter = useCallback((k: string, v: string) => {
    setFilters((prev) => ({ ...prev, [k]: v }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ ...M.EMPTY_FILTERS });
    setMenu(null);
  }, []);

  const setSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev && prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'desc' };
    });
  }, []);

  const setNavQuery = useCallback((q: string) => {
    setNavQueryState(q);
    setPage('search');
    setTab(null);
    if (typeof window !== 'undefined') {
      window.location.hash = 'search';
    }
  }, []);

  const toggleShowAll = useCallback(() => {
    setShowAll((v) => !v);
  }, []);

  const openMenu = useCallback((id: string, x: number, y: number) => {
    setMenu((prev) => (prev && prev.id === id ? null : { id, x, y }));
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  const openModal = useCallback((id: 'property' | 'sale' | 'expense' | 'payment' | 'saleInvoice' | 'purchaseInvoice') => {
    setModal({ id, values: formDefaults(id), errors: {} });
    setMenu(null);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const setModalField = useCallback((key: string, value: any) => {
    setModal((prev) => {
      if (!prev) return null;
      const nextErrors = { ...prev.errors };
      delete nextErrors[key];
      delete nextErrors._form;
      return {
        ...prev,
        values: { ...prev.values, [key]: value },
        errors: nextErrors,
      };
    });
  }, []);

  const submitModal = useCallback(() => {
    if (!modal) return;
    const { id, values } = modal;
    const F = FORMS_DEF[id];
    if (!F) return;

    const errors: Record<string, string> = {};
    F.fields.forEach((fd: any) => {
      if (fd.g) return;
      const v = values[fd.k];
      if (fd.req && (v === '' || v == null)) errors[fd.k] = 'Required.';
      else if (fd.min != null && v !== '' && n(v) < fd.min) errors[fd.k] = 'Must be at least ' + fd.min + '.';
      else if (fd.maxToday && v && M.parseDate(v) > M.TODAY)
        errors[fd.k] = 'Cannot be a future date (today is ' + M.fmtDate(M.TODAY) + ').';
    });
    Object.assign(errors, F.validate(values));

    if (Object.keys(errors).length) {
      setModal((prev) => (prev ? { ...prev, errors } : null));
      return;
    }

    const LEDGERS = ['properties', 'sales', 'commissions', 'expenses', 'payments', 'audit', 'invoices'];
    const before: Record<string, number> = {};
    LEDGERS.forEach((key) => {
      before[key] = (M.DATA as any)[key].length;
    });

    try {
      const res = F.submit(values);
      const created = LEDGERS.flatMap((key) => (M.DATA as any)[key].slice(before[key]).map((x: any) => x.id));
      setFresh((prev) => [res.id, ...created, ...prev].slice(0, 24));
      setModal(null);
      setDataVersion((v) => v + 1);
      goto(res.go);
      toast(res.msg);
    } catch (err: any) {
      setModal((prev) =>
        prev
          ? {
              ...prev,
              errors: { _form: String(err && err.message ? err.message : err) },
            }
          : null
      );
    }
  }, [modal, goto, toast]);

  const voidPayment = useCallback(
    (id: string) => {
      const t = M.voidPayment(id, user.name);
      setDataVersion((v) => v + 1);
      toast(t ? `Transaction ${id} voided — the original record is kept` : 'Already voided');
    },
    [user.name, toast]
  );

  const showTip = useCallback((html: string, x: number, y: number) => {
    setTip({ html, x, y, visible: true });
  }, []);

  const hideTip = useCallback(() => {
    setTip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  // Export handlers
  const exportCsv = useCallback(() => {
    const pageMeta = PAGE_META[`${page}/${tab}`] || PAGE_META[page] || { t: 'Report' };
    const title = pageMeta.t;
    const meta = [
      ['Company', M.COMPANY],
      ['Report', title],
      ['Period', range.label],
      ['From', M.fmtDate(range.start)],
      ['To', M.fmtDate(range.end)],
      ['Generated', M.fmtDate(M.TODAY)],
      ['User', user.name],
      ['Role', role],
    ];

    const tbl = document.querySelector('#main table.tbl');
    let cols: string[] = [];
    let rows: string[][] = [];
    if (tbl) {
      cols = Array.from(tbl.querySelectorAll('thead th')).map((th) => th.textContent?.replace(/[↑↓]/g, '').trim() || '');
      rows = Array.from(tbl.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.children).map((td) => td.textContent?.trim() || '')
      );
    } else {
      const k = M.computeKPIs(range, effectiveFilters);
      const cash = M.cashLedger(range, effectiveFilters);
      cols = ['KPI', 'Amount'];
      rows = [
        ['Total properties', M.fmtNum(k.counts.total)],
        ['Available', M.fmtNum(k.counts.available)],
        ['Reserved', M.fmtNum(k.counts.reserved)],
        ['Under process', M.fmtNum(k.counts.underProcess)],
        ['Sold', M.fmtNum(k.counts.sold)],
        ['Portfolio cost', M.fmt(k.portfolioCost, numbers)],
        ['Market value', M.fmt(k.portfolioValue, numbers)],
        ['Potential profit (unrealised)', M.fmt(k.potentialProfit, numbers)],
        ['Purchase cost', M.fmt(k.purchaseCost, numbers)],
        ['Selling revenue', M.fmt(k.salesRevenue, numbers)],
        ['Gross profit', M.fmt(k.grossProfit, numbers)],
        ['Operating profit', M.fmt(k.operatingProfit, numbers)],
        ['Agent commission', M.fmt(k.commission, numbers)],
        ['Salaries', M.fmt(k.salaries, numbers)],
        ['Office expenses', M.fmt(k.officeExp, numbers)],
        ['Marketing', M.fmt(k.marketing, numbers)],
        ['Bills', M.fmt(k.bills, numbers)],
        ['Tax', M.fmt(k.tax, numbers)],
        ['Zakat', M.fmt(k.zakat, numbers)],
        ['Net profit', M.fmt(k.netProfit, numbers)],
        ['Opening cash', M.fmt(cash.opening, numbers)],
        ['Cash in', M.fmt(cash.cashIn, numbers)],
        ['Cash out', M.fmt(cash.cashOut, numbers)],
        ['Closing cash', M.fmt(cash.closing, numbers)],
        ['Receivables', M.fmt(k.receivable, numbers)],
        ['Payables', M.fmt(k.payable, numbers)],
      ];
    }

    const csvContent =
      meta.map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`).join('\r\n') +
      '\r\n\r\n' +
      M.csv(cols, rows);

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 400);
    toast('CSV downloaded');
  }, [page, tab, range, user.name, role, effectiveFilters, numbers, toast]);

  const exportXls = useCallback(() => {
    const pageMeta = PAGE_META[`${page}/${tab}`] || PAGE_META[page] || { t: 'Report' };
    const title = pageMeta.t;
    const meta = [
      ['Company', M.COMPANY],
      ['Report', title],
      ['Period', range.label],
      ['From', M.fmtDate(range.start)],
      ['To', M.fmtDate(range.end)],
      ['Generated', M.fmtDate(M.TODAY)],
      ['User', user.name],
      ['Role', role],
    ];

    const tbl = document.querySelector('#main table.tbl');
    let cols: string[] = [];
    let rows: string[][] = [];
    if (tbl) {
      cols = Array.from(tbl.querySelectorAll('thead th')).map((th) => th.textContent?.replace(/[↑↓]/g, '').trim() || '');
      rows = Array.from(tbl.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.children).map((td) => td.textContent?.trim() || '')
      );
    }

    const content = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
      <table>${meta.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`).join('')}</table><br/>
      <table border="1"><thead><tr>${cols.map((c) => `<th style="background:#F3ECDC;text-align:left">${c}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;

    const blob = new Blob(['\uFEFF' + content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.xls`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 400);
    toast('Excel file downloaded');
  }, [page, tab, range, user.name, role, toast]);

  const print = useCallback(() => {
    if (typeof window !== 'undefined') window.print();
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        role,
        page,
        tab,
        rangeKey,
        custom,
        filters,
        numbers,
        query,
        navQuery,
        sort,
        showAll,
        period,
        grossBasis,
        menu,
        modal,
        fresh,
        dataVersion,
        tip,
        toastMsg,
        range,
        effectiveFilters,
        denied,
        visibleTabs,
        visibleSections,
        goto,
        setUser,
        setRangeKey,
        setCustom,
        setFilter,
        clearFilters,
        setNumbers,
        setQuery,
        setNavQuery,
        setSort,
        toggleShowAll,
        setShowAll,
        setPeriod,
        setGrossBasis,
        openMenu,
        closeMenu,
        openModal,
        closeModal,
        setModalField,
        submitModal,
        voidPayment,
        showTip,
        hideTip,
        toast,
        activeCostSheetId,
        setActiveCostSheetId,
        openCostSheet,
        exportCsv,
        exportXls,
        print,
      }}

    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
