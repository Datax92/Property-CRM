'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as M from '../lib/re-data';
import { NAV, PAGE_META } from '../lib/constants';
import { ledgersReady, ledgerError } from '../lib/firestore-service';
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
  attach: { coll: string; id: string } | null;
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
  openModal: (id: string, preset?: Record<string, any>) => void;
  openEdit: (coll: string, id: string) => void;
  closeModal: () => void;
  openAttachments: (coll: string, id: string) => void;
  closeAttachments: () => void;
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
  refreshData: () => void;
}


const AppContext = createContext<AppContextType | null>(null);

const n = (v: any) => (v === '' || v == null || isNaN(+v) ? 0 : +v);
const dstr = (d: Date | string) => (d instanceof Date ? M.dateInput(d) : d);

/* Sale invoice: the company sells, the customer buys. Purchase invoice: the company buys
   from a seller. Both carry the same blocks so the printed voucher can show buyer and
   seller side by side. */
function invoiceFields(kind: 'sale' | 'purchase' | 'proforma') {
  // A proforma is a quotation to a buyer before the sale, so it is laid out like a sale invoice.
  const sale = kind !== 'purchase';
  return [
    { g: 'Invoice' },
    { k: 'receiptDate', l: 'Receipt date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
    { k: 'estampNo', l: 'e-Stamp no.', ph: 'Number on the e-Stamp paper' },
    {
      k: 'propertyId',
      l: 'Property',
      type: 'select',
      opts: () => [['', '— Select —'], ...M.DATA.properties.map((p: any) => [p.id, p.name + ' · ' + p.project])],
    },
    { g: sale ? 'Buyer (customer)' : 'Buyer (company)' },
    { k: 'buyerName', l: 'Buyer name', req: true, ph: 'Kamran Aziz', def: sale ? undefined : () => M.COMPANY },
    { k: 'buyerCompany', l: 'Company', ph: 'Company name (optional)' },
    { k: 'buyerCnic', l: sale ? 'Buyer CNIC' : 'Buyer CNIC / NTN', ph: '00000-0000000-0' },
    { k: 'bankDetailsBuyer', l: 'Buyer bank details', ph: 'Bank name & account' },
    { g: sale ? 'Seller (company)' : 'Seller (vendor)' },
    { k: 'sellerName', l: 'Seller name', req: true, ph: 'Falcon Developers', def: sale ? () => M.COMPANY : undefined },
    { k: 'sellerCompany', l: 'Company', ph: 'Company name (optional)' },
    { k: 'sellerCnic', l: sale ? 'Seller CNIC / NTN' : 'Seller CNIC', ph: '00000-0000000-0' },
    { k: 'bankDetailsSeller', l: 'Seller bank details', ph: 'Bank name & account' },
    { g: 'Payment' },
    { k: 'paymentMode', l: 'Payment mode', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', req: true },
    { k: 'paymentRef', l: 'Cheque / transfer reference', ph: 'Cheque no. or transaction ID' },
    {
      k: 'paymentMode2',
      l: 'Second payment mode',
      type: 'select',
      opts: () => [['', '— None, paid one way —'], ...M.METHODS.map((m: string) => [m, m])],
      hint: 'For a payment split two ways, e.g. part cash and part bank transfer.',
    },
    { k: 'paymentAmount2', l: 'Paid by the second mode (PKR)', type: 'money', hint: 'The rest of the token is paid by the first mode.' },
    { k: 'paymentRef2', l: 'Second mode reference', ph: 'Cheque no. or transaction ID' },
    { k: 'paymentDate', l: 'Payment date', type: 'date' },
    { k: 'paymentTerms', l: 'Payment terms', ph: 'e.g. Balance within 30 days of token', full: true },
    { g: 'Amounts' },
    { k: 'totalAmount', l: 'Total amount (PKR)', type: 'money', req: true, min: 1 },
    { k: 'tokenAmount', l: 'Token / advance (PKR)', type: 'money' },
    { k: 'tokenDate', l: 'Token date', type: 'date' },
    { k: 'balanceAmount', l: 'Balance amount (PKR)', compute: (v: any) => invoiceBalance(v), hint: 'Worked out automatically: total less token.' },
    { k: 'transferDate', l: 'Transfer date', type: 'date' },
    { g: 'Signatories' },
    { k: 'receivedByName', l: 'Received by — name', req: true, ph: sale ? 'Company representative' : 'Seller / vendor name' },
    { k: 'receivedByCnic', l: 'Received by — CNIC', ph: '00000-0000000-0' },
    { k: 'receivedFromName', l: 'Received from — name', req: true, ph: sale ? 'Buyer / payer name' : 'Company representative' },
    { k: 'receivedFromCnic', l: 'Received from — CNIC', ph: '00000-0000000-0' },
    { k: 'approvedByName', l: 'Approved by', ph: 'Authorised signatory' },
    { k: 'notes', l: 'Notes', ph: 'Optional notes', full: true },
    { k: 'attachments', l: 'Attachments', type: 'files', full: true },
  ];
}
/** Withholding tax on a sale: what was typed, else 1% of the selling price. */
const saleTax = (v: any) => (v.tax === '' || v.tax == null ? Math.round(n(v.sellingPrice) * 0.01) : n(v.tax));

/** The balance is always the total less the token, worked out as either is typed. */
const invoiceBalance = (v: any) => Math.max(0, n(v.totalAmount) - n(v.tokenAmount));
const invoiceCalc = (v: any) => [
  ['Total amount', n(v.totalAmount)],
  ['Token / advance', n(v.tokenAmount)],
  // A split payment: what each mode carried.
  ...(v.paymentMode2
    ? [
        ['  by ' + (v.paymentMode || 'first mode'), Math.max(0, n(v.tokenAmount) - n(v.paymentAmount2))],
        ['  by ' + v.paymentMode2, n(v.paymentAmount2)],
      ]
    : []),
  ['Balance remaining', invoiceBalance(v), true],
];
const invoiceValidate = (v: any) => {
  const e: Record<string, string> = {};
  if (n(v.tokenAmount) > n(v.totalAmount)) e.tokenAmount = 'Token cannot exceed total amount.';
  if (v.paymentMode2) {
    if (v.paymentMode2 === v.paymentMode) e.paymentMode2 = 'Pick a different mode from the first one.';
    else if (n(v.paymentAmount2) <= 0) e.paymentAmount2 = 'Enter how much was paid by the second mode.';
    else if (n(v.paymentAmount2) > n(v.tokenAmount)) e.paymentAmount2 = 'Cannot be more than the token / advance.';
  }
  return e;
};

/** Which bank or cash account the money moved through: one already in use, or a new one typed in. */
const accountField = (addOnly = true) => ({
  k: 'account',
  l: 'Bank / cash account',
  list: () => M.accountNames(),
  def: () => M.accountNames()[0],
  ph: 'e.g. Bank Islami — 1234',
  addOnly,
});

export const FORMS_DEF: Record<string, any> = {
  property: {
    title: 'Add a property',
    editTitle: 'Edit property',
    coll: 'properties',
    load: (p: any) => ({
      registration: p.extras.registration,
      legal: p.extras.legal,
      development: p.extras.development,
      otherCost: p.extras.other,
      // Still at the purchase price: open blank, so it follows the price if that is changed.
      currentValue: p.currentValue === p.price ? '' : p.currentValue,
    }),
    update: (id: string, v: any) => M.updateProperty(id, v),
    sub: 'Records a purchase. Acquisition costs are added to the price to give total cost (§6).',
    fields: [
      { g: 'Property' },
      { k: 'name', l: 'Property name / title', req: true, ph: 'House A-126' },
      { k: 'type', l: 'Property type', type: 'select', opts: () => M.TYPES, req: true },
      { k: 'projectId', l: 'Project / society', type: 'select', opts: () => M.PROJECTS.map((p: any) => [p.id, p.name]), req: true, hint: 'Add a society under Properties → Projects.' },
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
      { k: 'paid', l: 'Amount paid to seller', type: 'money', hint: 'Cannot exceed total cost.', addOnly: true },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', addOnly: true },
      accountField(),
      {
        k: 'currentValue',
        l: 'Current market value',
        type: 'money',
        auto: (v: any) => `Auto: ${M.fmt(n(v.price), 'full')} (purchase price)`,
        hint: 'Leave blank to use the purchase price.',
      },
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
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
    editTitle: 'Edit sale',
    coll: 'sales',
    // Amounts still at their automatic figure open blank, so they keep following the price.
    load: (s: any) => {
      const ag = M.DATA.agents.find((a: any) => a.id === s.agentId);
      return {
        tax: s.tax === Math.round(s.sellingPrice * 0.01) ? '' : s.tax,
        commissionPct: !ag || s.commissionPct === ag.rate ? '' : s.commissionPct,
      };
    },
    update: (id: string, v: any) => M.updateSale(id, v),
    sub: 'Creates the sale, the agent commission entry and the receipt (§7, §10, §26).',
    fields: [
      { g: 'Sale' },
      {
        k: 'propertyId',
        l: 'Property',
        type: 'select',
        req: true,
        addOnly: true,
        opts: () => M.DATA.properties.filter((p: any) => p.status !== 'Sold').map((p: any) => [p.id, p.name + ' · ' + p.project]),
      },
      { k: 'buyer', l: 'Buyer', req: true, ph: 'Kamran Aziz' },
      {
        k: 'agentId',
        l: 'Agent',
        type: 'select',
        opts: () => [['', 'Direct sale — no agent'], ...M.DATA.agents.map((a: any) => [a.id, a.name + ' (' + a.rate + '%)'])],
        hint: 'Add agents under Agents → Agent directory.',
      },
      { k: 'date', l: 'Sale date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { g: 'Money' },
      { k: 'sellingPrice', l: 'Selling price (PKR)', type: 'money', req: true, min: 1 },
      { k: 'received', l: 'Amount received', type: 'money', hint: 'Cannot exceed the selling price.', addOnly: true },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', req: true, addOnly: true },
      accountField(),
      {
        k: 'commissionPct',
        l: 'Commission %',
        type: 'number',
        auto: (v: any) => {
          const ag = M.DATA.agents.find((a: any) => a.id === v.agentId);
          return ag ? `Auto: ${ag.rate}% (agent’s rate)` : 'Direct sale — no commission';
        },
        hint: 'Leave blank to use the agent’s standard rate.',
      },
      {
        k: 'tax',
        l: 'Withholding tax',
        type: 'money',
        auto: (v: any) => `Auto: ${M.fmt(saleTax(v), 'full')} (1%)`,
        hint: 'Leave blank for 1% of the selling price.',
      },
      { k: 'otherExpenses', l: 'Other selling expenses', type: 'money' },
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
    ],
    calc: (v: any) => {
      const p = M.DATA.properties.find((x: any) => x.id === v.propertyId);
      const price = n(v.sellingPrice);
      const ag = M.DATA.agents.find((a: any) => a.id === v.agentId);
      const rate = !ag ? 0 : v.commissionPct === '' || v.commissionPct == null ? ag.rate : n(v.commissionPct);
      const comm = Math.round((price * rate) / 100);
      const tax = saleTax(v);
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
    validate: (v: any, editId?: string) => {
      const e: Record<string, string> = {};
      if (!editId && !M.DATA.properties.some((p: any) => p.status !== 'Sold'))
        e.propertyId = 'No unsold property in the register — add the property purchase first.';
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
    editTitle: 'Edit expense',
    coll: 'expenses',
    update: (id: string, v: any) => M.updateExpense(id, v),
    sub: 'Posts to the expense ledger and, if paid, to the cash ledger (§13).',
    fields: [
      { g: 'Expense' },
      {
        k: 'group',
        l: 'Category',
        type: 'select',
        req: true,
        opts: () =>
          M.EXPENSE_GROUPS.map((g: string) => [
            g,
            g === 'Assets' ? 'Assets (kept as an asset, not an expense)' : g === 'Personal Expenses' ? 'Personal Expenses (owner, not business)' : g,
          ]),
      },
      {
        k: 'category',
        l: 'Sub-category',
        req: true,
        ph: 'Type or pick one',
        // Sub-categories of the chosen category; for a deal, the cost sheet lines as well.
        list: (v: any) => Array.from(new Set([...(v.propertyId ? M.DEAL_COST_SUGGESTIONS : []), ...M.expenseSubcats(v.group)])),
      },
      {
        k: 'propertyId',
        l: 'Property / deal (optional)',
        type: 'select',
        opts: () => [['', '— General, not for one property —'], ...M.DATA.properties.map((p: any) => [p.id, p.name + ' · ' + p.project])],
        hint: 'Pick the property this was spent on and it appears on that deal’s cost sheet.',
      },
      { k: 'vendor', l: 'Vendor', req: true, ph: 'City Traders' },
      { k: 'date', l: 'Date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { g: 'Amount' },
      { k: 'amount', l: 'Amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'paid', l: 'Amount paid', type: 'money', hint: 'Cannot exceed the amount.', addOnly: true },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', addOnly: true },
      accountField(),
      { k: 'note', l: 'Note', ph: 'Optional description', full: true },
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
    ],
    calc: (v: any) => [
      ['Amount', n(v.amount)],
      ['Paid', n(v.paid)],
      ['Outstanding', Math.max(0, n(v.amount) - n(v.paid)), true],
    ],
    validate: (v: any) => {
      const e: Record<string, string> = {};
      if (n(v.paid) > n(v.amount)) e.paid = 'Paid cannot exceed the amount.';
      if (v.propertyId && M.NON_EXPENSE_GROUPS.indexOf(v.group) >= 0)
        e.propertyId = v.group + ' are not costs of a deal — leave the property blank.';
      return e;
    },
    submit: (v: any) => {
      const e = M.addExpense(v);
      const asset = e.group === 'Assets';
      return {
        id: e.id,
        msg: (asset ? 'Asset ' : 'Expense ') + e.id + ' recorded',
        go: asset ? 'finance/assets' : 'costs/expenses',
      };
    },
  },
  payment: {
    title: 'Record a payment',
    sub: 'A single money-in or money-out entry on the cash ledger (§26, §27).',
    fields: [
      { g: 'What is this payment for?' },
      {
        k: 'settle',
        l: 'Settle an open balance',
        type: 'select',
        full: true,
        opts: () => [['', 'Not linked — general ledger entry'], ...M.openItems().map((o: any) => [o.key, o.label])],
        hint: 'Pick a customer, seller, agent, bill or tax balance and it is reduced by this payment.',
      },
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
          ...M.INCOME_CATEGORIES,
          ...M.CAPITAL_CATEGORIES,
          'Property Purchase',
          'Agent Commission',
          'Employee Salaries',
          'Office Expenses',
          'Employee Expenses',
          'Property Expenses',
          'Bills',
          'Taxes',
          'Zakat',
          'Charity',
          'Marketing Expenses',
          'Other Expenses',
          'Personal Expenses',
          'Assets',
        ],
      },
      { k: 'party', l: 'Customer / vendor', req: true, ph: 'Kamran Aziz' },
      { k: 'date', l: 'Date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { g: 'Amount' },
      { k: 'amount', l: 'Amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'method', l: 'Method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', req: true },
      { ...accountField(false), req: true, hint: 'Opening Balance: what an account held to begin with. Owner Capital: money the owner put in.' },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { k: 'ref', l: 'Reference number', ph: 'Cheque or transfer reference' },
      { k: 'note', l: 'Description', ph: 'What this payment is for', full: true },
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
    ],
    onChange: (key: string, value: any) => {
      if (key !== 'settle') return null;
      const item = M.openItems().find((o: any) => o.key === value);
      // Linking a balance fills in who, which way and how much.
      return item
        ? { dir: item.dir, category: item.category, party: item.party, amount: String(item.outstanding), office: item.office || M.OFFICES[0] }
        : null;
    },
    calc: (v: any) => {
      const item = v.settle ? M.openItems().find((o: any) => o.key === v.settle) : null;
      const rows: any[] = [[v.dir === 'out' ? 'Money out' : 'Money in', n(v.amount), !item]];
      if (item) rows.push(['Balance left after this payment', Math.max(0, item.outstanding - n(v.amount)), true]);
      return rows;
    },
    validate: (v: any) => {
      const item = v.settle ? M.openItems().find((o: any) => o.key === v.settle) : null;
      return item && n(v.amount) > item.outstanding
        ? { amount: 'Only ' + M.fmt(item.outstanding, 'full') + ' is still open on this balance.' }
        : {};
    },
    submit: (v: any) => {
      const t = M.recordPayment(v);
      return { id: t.id, msg: 'Transaction ' + t.id + ' posted', go: 'admin/transactions' };
    },
  },
  income: {
    title: 'Add income',
    sub: 'Money earned outside property trading: rent, profit on deposits, commission earned and the like. It counts as revenue in profit and loss.',
    fields: [
      { g: 'Income' },
      { k: 'category', l: 'Kind of income', type: 'select', opts: () => M.INCOME_CATEGORIES, req: true },
      { k: 'party', l: 'Received from', req: true, ph: 'Tenant, bank or payer' },
      { k: 'date', l: 'Date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      {
        k: 'propertyId',
        l: 'Property (optional)',
        type: 'select',
        opts: () => [['', '— Not for one property —'], ...M.DATA.properties.map((p: any) => [p.id, p.name + ' · ' + p.project])],
        hint: 'For rent from a plot or house, pick it here.',
      },
      { g: 'Amount' },
      { k: 'amount', l: 'Amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'method', l: 'Method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', req: true },
      { ...accountField(false), req: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { k: 'ref', l: 'Reference number', ph: 'Receipt or transfer reference' },
      { k: 'note', l: 'Description', ph: 'What this income is for', full: true },
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
    ],
    validate: () => ({}),
    submit: (v: any) => {
      const t = M.recordPayment({ ...v, dir: 'in', settle: '' });
      return { id: t.id, msg: 'Income ' + t.id + ' recorded', go: 'finance/income' };
    },
  },
  saleInvoice: {
    title: 'Create sale invoice',
    editTitle: 'Edit sale invoice',
    coll: 'invoices',
    update: (id: string, v: any) => M.updateInvoice(id, v),
    sub: 'Invoice/receipt given to the buyer with all transaction details.',
    fields: invoiceFields('sale'),
    calc: invoiceCalc,
    validate: invoiceValidate,
    submit: (v: any) => {
      const inv = M.addInvoice({ ...v, type: 'sale' });
      return { id: inv.id, msg: 'Sale invoice ' + inv.id + ' created', go: 'sales/saleInvoices' };
    },
  },
  proformaInvoice: {
    title: 'Create proforma invoice',
    editTitle: 'Edit proforma invoice',
    coll: 'invoices',
    update: (id: string, v: any) => M.updateInvoice(id, v),
    sub: 'A quotation given to the buyer before the sale. It is not a receipt and moves no money.',
    fields: invoiceFields('proforma'),
    calc: invoiceCalc,
    validate: invoiceValidate,
    submit: (v: any) => {
      const inv = M.addInvoice({ ...v, type: 'proforma' });
      return { id: inv.id, msg: 'Proforma invoice ' + inv.id + ' created', go: 'sales/proformaInvoices' };
    },
  },
  purchaseInvoice: {
    title: 'Create purchase invoice',
    editTitle: 'Edit purchase invoice',
    coll: 'invoices',
    update: (id: string, v: any) => M.updateInvoice(id, v),
    sub: 'Invoice/receipt kept by the company for internal records.',
    fields: invoiceFields('purchase'),
    calc: invoiceCalc,
    validate: invoiceValidate,
    submit: (v: any) => {
      const inv = M.addInvoice({ ...v, type: 'purchase' });
      return { id: inv.id, msg: 'Purchase invoice ' + inv.id + ' created', go: 'sales/purchaseInvoices' };
    },
  },
  task: {
    title: 'Add a task',
    editTitle: 'Edit task',
    coll: 'tasks',
    update: (id: string, v: any) => M.updateTask(id, v),
    sub: 'Something that needs doing. Pick a project to group it, and a due date to be reminded when it is late.',
    fields: [
      { g: 'Task' },
      { k: 'text', l: 'Subject', req: true, ph: 'Sell FHA 1122', full: true },
      {
        k: 'projectId',
        l: 'Project',
        type: 'select',
        opts: () => [['', '— No project —'], ...M.DATA.taskProjects.map((p: any) => [p.id, p.name])],
        hint: 'Add projects under Tasks → Projects.',
      },
      { k: 'status', l: 'Status', type: 'select', opts: () => M.TASK_STATUSES, def: 'Open', req: true },
      { k: 'priority', l: 'Priority', type: 'select', opts: () => M.TASK_PRIORITIES, def: 'Low', req: true },
      { k: 'date', l: 'Due date', type: 'date' },
      { k: 'description', l: 'Details', ph: 'Optional notes', full: true },
    ],
    validate: () => ({}),
    submit: (v: any) => {
      const t = M.addTask(v);
      return { id: t.id, msg: 'Task ' + t.id + ' added', go: 'tasks/list' };
    },
  },
  taskProject: {
    title: 'Add a project',
    editTitle: 'Edit project',
    coll: 'taskProjects',
    update: (id: string, v: any) => M.updateTaskProject(id, v),
    sub: 'A group of tasks, such as Personal, A&Sons Work or Property Business.',
    fields: [
      { g: 'Project' },
      { k: 'name', l: 'Project name', req: true, ph: 'PROPERTY BUSINESS', full: true },
      { k: 'status', l: 'Status', type: 'select', opts: () => M.PROJECT_STATUSES, def: 'Open', req: true },
      { k: 'type', l: 'Project type', type: 'select', opts: () => [['', '— None —'], ...M.PROJECT_TYPES.map((t: string) => [t, t])] },
      { k: 'priority', l: 'Priority', type: 'select', opts: () => M.PROJECT_PRIORITIES, def: 'Medium', req: true },
      { g: 'Dates' },
      { k: 'expectedStart', l: 'Expected start date', type: 'date' },
      { k: 'expectedEnd', l: 'Expected end date', type: 'date' },
      { k: 'notes', l: 'Notes', ph: 'Optional', full: true },
    ],
    validate: (v: any, editId?: string) => {
      const e: Record<string, string> = {};
      if (M.DATA.taskProjects.some((p: any) => p.id !== editId && p.name.toLowerCase() === String(v.name || '').trim().toLowerCase()))
        e.name = 'A project with this name already exists.';
      if (v.expectedStart && v.expectedEnd && M.parseDate(v.expectedEnd) < M.parseDate(v.expectedStart))
        e.expectedEnd = 'The end date is before the start date.';
      return e;
    },
    submit: (v: any) => {
      const p = M.addTaskProject(v);
      return { id: p.id, msg: 'Project ' + p.name + ' added', go: 'tasks/projects' };
    },
  },
  project: {
    title: 'Add a project',
    sub: 'A project or society. It can then be picked on a property, in the filters and on a cost sheet.',
    fields: [
      { g: 'Project' },
      { k: 'name', l: 'Project / society name', req: true, ph: 'Faisal Hills' },
      { k: 'city', l: 'City', req: true, ph: 'Islamabad' },
    ],
    validate: (v: any) =>
      M.PROJECTS.some((p: any) => p.name.toLowerCase() === String(v.name || '').trim().toLowerCase())
        ? { name: 'A project with this name already exists.' }
        : {},
    submit: (v: any) => {
      const p = M.addProject(v);
      // Rows of the projects page are keyed by name, so that is what gets highlighted.
      return { id: p.name, msg: 'Project ' + p.name + ' added', go: 'properties/projects' };
    },
  },
  agent: {
    title: 'Add an agent',
    editTitle: 'Edit agent',
    coll: 'agents',
    update: (id: string, v: any) => M.updateAgent(id, v),
    sub: 'Agents can then be picked when recording a sale, and earn commission at their standard rate.',
    fields: [
      { g: 'Agent' },
      { k: 'name', l: 'Full name', req: true, ph: 'Ahmed Khan' },
      { k: 'phone', l: 'Phone', ph: '03xx-xxxxxxx' },
      { k: 'cnic', l: 'CNIC', ph: '00000-0000000-0' },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { k: 'rate', l: 'Standard commission %', type: 'number', def: '2', req: true },
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
    ],
    validate: (v: any) => (n(v.rate) < 0 || n(v.rate) > 20 ? { rate: 'Commission must be between 0 and 20%.' } : {}),
    submit: (v: any) => {
      const a = M.addAgent(v);
      return { id: a.id, msg: 'Agent ' + a.name + ' added', go: 'agents/directory' };
    },
  },
  commission: {
    title: 'Add a commission',
    editTitle: 'Edit commission',
    coll: 'commissions',
    load: (c: any) => ({ side: c.txnType, agentName: c.agentId ? '' : c.agent }),
    update: (id: string, v: any) => M.updateCommission(id, v),
    sub: 'Commission on buying or selling a plot. It shows on that deal’s cost sheet and counts in profit when the plot is sold.',
    fields: [
      { g: 'Commission' },
      { k: 'side', l: 'Commission on', type: 'select', opts: () => [['Sale', 'Sale of the plot'], ['Purchase', 'Purchase of the plot']], req: true },
      {
        k: 'propertyId',
        l: 'Property',
        type: 'select',
        req: true,
        opts: () => [['', '— Select —'], ...M.DATA.properties.map((p: any) => [p.id, p.name + ' · ' + p.project])],
      },
      {
        k: 'agentId',
        l: 'Agent',
        type: 'select',
        opts: () => [['', '— Not in the directory, type the name —'], ...M.DATA.agents.map((a: any) => [a.id, a.name])],
      },
      { k: 'agentName', l: 'Agent / dealer name', ph: 'Name, if not in the directory' },
      { k: 'date', l: 'Date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { g: 'Amount' },
      { k: 'amount', l: 'Commission (PKR)', type: 'money', req: true, min: 1 },
      { k: 'paid', l: 'Amount paid', type: 'money', hint: 'Cannot exceed the commission.', addOnly: true },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', addOnly: true },
      accountField(),
      { k: 'note', l: 'Note', ph: 'Optional', full: true },
    ],
    calc: (v: any) => [
      ['Commission', n(v.amount)],
      ['Paid', n(v.paid)],
      ['Still to pay', Math.max(0, n(v.amount) - n(v.paid)), true],
    ],
    validate: (v: any) => {
      const e: Record<string, string> = {};
      if (!v.agentId && !String(v.agentName || '').trim()) e.agentName = 'Pick an agent above, or type the name here.';
      if (n(v.paid) > n(v.amount)) e.paid = 'Paid cannot exceed the commission.';
      return e;
    },
    submit: (v: any) => {
      const c = M.addCommission(v);
      return { id: c.id, msg: 'Commission ' + c.id + ' recorded', go: 'agents/commissions' };
    },
  },
  tax: {
    title: 'Add a tax entry',
    editTitle: 'Edit tax entry',
    coll: 'taxes',
    update: (id: string, v: any) => M.updateTax(id, v),
    sub: 'Advance tax, capital gains tax and other statutory charges. Anything paid posts to the cash ledger.',
    fields: [
      { g: 'Tax' },
      { k: 'type', l: 'Tax type', type: 'select', opts: () => M.TAX_TYPES, req: true },
      { k: 'authority', l: 'Authority', def: 'FBR', req: true },
      {
        k: 'propertyId',
        l: 'Property (optional)',
        type: 'select',
        opts: () => [['', '— Not property specific —'], ...M.DATA.properties.map((p: any) => [p.id, p.name + ' · ' + p.project])],
      },
      { k: 'ref', l: 'Challan / reference', ph: 'CPR or challan number' },
      { k: 'date', l: 'Tax date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { k: 'dueDate', l: 'Due date', type: 'date', def: () => dstr(M.TODAY), req: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { g: 'Amount' },
      { k: 'amount', l: 'Tax amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'paid', l: 'Amount paid', type: 'money', hint: 'Cannot exceed the tax amount.', addOnly: true },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', addOnly: true },
      accountField(),
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
    ],
    calc: (v: any) => [
      ['Tax amount', n(v.amount)],
      ['Paid', n(v.paid)],
      ['Outstanding', Math.max(0, n(v.amount) - n(v.paid)), true],
    ],
    validate: (v: any) => (n(v.paid) > n(v.amount) ? { paid: 'Paid cannot exceed the tax amount.' } : {}),
    submit: (v: any) => {
      const t = M.addTax(v);
      return { id: t.id, msg: 'Tax entry ' + t.id + ' recorded', go: 'costs/tax' };
    },
  },
  zakat: {
    title: 'Record Zakat',
    editTitle: 'Edit Zakat entry',
    coll: 'zakat',
    load: (z: any) => ({ liabilities: Math.max(0, (z.eligibleAssets || 0) - (z.zakatable || 0)) }),
    update: (id: string, v: any) => M.updateZakat(id, v),
    sub: 'Zakat is 2.5% of zakatable assets. Record the assessment for a period and any amount paid.',
    fields: [
      { g: 'Assessment' },
      { k: 'period', l: 'Period', req: true, def: () => 'FY ' + M.TODAY.getFullYear(), ph: 'FY 2026 or 1448 AH' },
      {
        k: 'propertyId',
        l: 'For one deal (optional)',
        type: 'select',
        opts: () => [['', '— Company Zakat for the period —'], ...M.DATA.properties.map((p: any) => [p.id, p.name + ' · ' + p.project])],
        hint: 'Pick a property to show this Zakat on that deal’s cost sheet.',
      },
      { k: 'eligibleAssets', l: 'Eligible assets (PKR)', type: 'money', hint: 'Stock held for resale, cash and receivables. Leave blank for Zakat on one deal.' },
      { k: 'liabilities', l: 'Less: liabilities due', type: 'money' },
      { k: 'rate', l: 'Rate %', type: 'number', def: '2.5', req: true },
      { g: 'Payment' },
      { k: 'amount', l: 'Zakat paid now (PKR)', type: 'money', addOnly: true },
      { k: 'date', l: 'Date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { k: 'paidTo', l: 'Paid to', ph: 'Recipient or organisation', addOnly: true },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', addOnly: true },
      accountField(),
      { k: 'ref', l: 'Reference', ph: 'Receipt or transfer reference' },
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
    ],
    calc: (v: any) => {
      const base = Math.max(0, n(v.eligibleAssets) - n(v.liabilities));
      const due = Math.round((base * (v.rate === '' ? 2.5 : n(v.rate))) / 100);
      return [
        ['Zakatable amount', base],
        ['Zakat due for the period', due],
        ['Paid now', n(v.amount)],
        ['Remaining on this assessment', Math.max(0, due - n(v.amount)), true],
      ];
    },
    validate: (v: any) => (n(v.liabilities) > n(v.eligibleAssets) ? { liabilities: 'Liabilities cannot exceed eligible assets.' } : {}),
    submit: (v: any) => {
      const z = M.addZakat(v);
      return { id: z.id, msg: 'Zakat entry ' + z.id + ' recorded', go: 'costs/zakat' };
    },
  },
  bill: {
    title: 'Add a bill',
    editTitle: 'Edit bill',
    coll: 'bills',
    update: (id: string, v: any) => M.updateBill(id, v),
    sub: 'Utility, rent and service bills with their due date. Anything paid posts to the cash ledger.',
    fields: [
      { g: 'Bill' },
      { k: 'type', l: 'Bill type', type: 'select', opts: () => M.BILL_KINDS, req: true },
      { k: 'vendor', l: 'Vendor', req: true, ph: 'LESCO' },
      { k: 'number', l: 'Bill number', ph: 'Reference on the bill' },
      { k: 'period', l: 'Billing period', ph: 'Sep 2026' },
      { k: 'dueDate', l: 'Due date', type: 'date', def: () => dstr(M.TODAY), req: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { g: 'Amount' },
      { k: 'amount', l: 'Bill amount (PKR)', type: 'money', req: true, min: 1 },
      { k: 'paid', l: 'Amount paid', type: 'money', hint: 'Cannot exceed the bill amount.', addOnly: true },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', addOnly: true },
      accountField(),
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
    ],
    calc: (v: any) => [
      ['Bill amount', n(v.amount)],
      ['Paid', n(v.paid)],
      ['Outstanding', Math.max(0, n(v.amount) - n(v.paid)), true],
    ],
    validate: (v: any) => (n(v.paid) > n(v.amount) ? { paid: 'Paid cannot exceed the bill amount.' } : {}),
    submit: (v: any) => {
      const b = M.addBill(v);
      return { id: b.id, msg: 'Bill ' + b.id + ' recorded', go: 'costs/bills' };
    },
  },
  salary: {
    title: 'Add a salary payslip',
    editTitle: 'Edit payslip',
    coll: 'salaries',
    update: (id: string, v: any) => M.updateSalary(id, v),
    sub: 'One payslip per employee per month. A paid payslip posts to the cash ledger.',
    fields: [
      { g: 'Employee' },
      { k: 'employee', l: 'Employee name', req: true, ph: 'Faisal Nadeem' },
      { k: 'dept', l: 'Department', ph: 'Sales' },
      { k: 'date', l: 'Pay date', type: 'date', def: () => dstr(M.TODAY), req: true, maxToday: true },
      { k: 'office', l: 'Office / branch', type: 'select', opts: () => M.OFFICES, req: true },
      { g: 'Pay' },
      { k: 'basic', l: 'Basic salary (PKR)', type: 'money', req: true, min: 1 },
      { k: 'bonus', l: 'Bonus', type: 'money' },
      { k: 'allowance', l: 'Allowance', type: 'money' },
      { k: 'deduction', l: 'Deduction', type: 'money' },
      { k: 'status', l: 'Status', type: 'select', opts: () => ['Paid', 'Pending'], def: 'Paid', req: true, addOnly: true },
      { k: 'method', l: 'Payment method', type: 'select', opts: () => M.METHODS, def: 'Bank Transfer', addOnly: true },
      accountField(),
      { k: 'attachments', l: 'Attachments', type: 'files', full: true },
    ],
    calc: (v: any) => [
      ['Basic + bonus + allowance', n(v.basic) + n(v.bonus) + n(v.allowance)],
      ['Deduction', -n(v.deduction)],
      ['Net pay', n(v.basic) + n(v.bonus) + n(v.allowance) - n(v.deduction), true],
    ],
    validate: (v: any) =>
      n(v.deduction) > n(v.basic) + n(v.bonus) + n(v.allowance) ? { deduction: 'Deduction cannot exceed gross pay.' } : {},
    submit: (v: any) => {
      const s = M.addSalary(v);
      return { id: s.id, msg: 'Payslip ' + s.id + ' recorded', go: 'costs/salaries' };
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
    } else if (fd.type === 'files') {
      v[fd.k] = [];
    } else if (fd.type === 'select') {
      const opts = fd.opts();
      const first = Array.isArray(opts[0]) ? opts[0][0] : opts[0];
      v[fd.k] = first == null ? '' : String(first);
    } else {
      v[fd.k] = '';
    }
  });
  return v;
}

/** The form that edits a saved record of this ledger, if it has one. */
export function editFormFor(coll: string, rec?: any): string | null {
  if (coll === 'invoices') return rec && rec.type === 'purchase' ? 'purchaseInvoice' : rec && rec.type === 'proforma' ? 'proformaInvoice' : 'saleInvoice';
  return Object.keys(FORMS_DEF).find((k) => FORMS_DEF[k].coll === coll && FORMS_DEF[k].update) || null;
}

/** Form values for a saved record: each field takes the stored value of the same name. */
function editValues(id: string, rec: any) {
  const F = FORMS_DEF[id];
  const v = formDefaults(id);
  F.fields.forEach((fd: any) => {
    if (fd.g) return;
    const x = rec[fd.k];
    if (x != null) v[fd.k] = x instanceof Date ? M.dateInput(x) : x;
  });
  return { ...v, ...(F.load ? F.load(rec) : {}) };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User>(M.USERS[0] as unknown as User);
  const [page, setPage] = useState<string>('dashboard');
  const [tab, setTab] = useState<string | null>('home');
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
  const [attach, setAttach] = useState<{ coll: string; id: string } | null>(null);
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

  // One timer for the toast: a later message (e.g. "Not saved") must get its full time on
  // screen, not be hidden by the timer of the message it replaced.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((msg: string) => {
    setToastMsg({ text: msg, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
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
        targetTab = 'home';
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
      if (p === 'account' || p === 'search' || p === 'appearance') {
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
        setTab('home');
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

  // Syncing the signed-in user must not navigate: a reload or a shared link keeps its page.
  const setUser = useCallback((u: User) => {
    setUserState(u);
    M.setActor(u.name);
  }, []);

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

  const openModal = useCallback((id: string, preset?: Record<string, any>) => {
    let values = formDefaults(id);
    if (preset) {
      const F = FORMS_DEF[id];
      Object.keys(preset).forEach((key) => {
        values = { ...values, [key]: preset[key], ...((F && F.onChange && F.onChange(key, preset[key], values)) || {}) };
      });
    }
    setModal({ id, values, errors: {} });
    setMenu(null);
  }, []);

  const openEdit = useCallback((coll: string, recId: string) => {
    const rec = ((M.DATA as any)[coll] || []).find((x: any) => x.id === recId);
    const id = rec ? editFormFor(coll, rec) : null;
    if (!id) return;
    setModal({ id, values: editValues(id, rec), errors: {}, editId: recId });
    setMenu(null);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const openAttachments = useCallback((coll: string, id: string) => {
    setAttach({ coll, id });
    setMenu(null);
  }, []);
  const closeAttachments = useCallback(() => setAttach(null), []);

  const setModalField = useCallback((key: string, value: any) => {
    setModal((prev) => {
      if (!prev) return null;
      const nextErrors = { ...prev.errors };
      delete nextErrors[key];
      delete nextErrors._form;
      // A form may fill in related fields when one changes (e.g. picking a balance to settle).
      const F = FORMS_DEF[prev.id];
      const patch = (F && F.onChange && F.onChange(key, value, prev.values)) || {};
      Object.keys(patch).forEach((k) => delete nextErrors[k]);
      return {
        ...prev,
        values: { ...prev.values, [key]: value, ...patch },
        errors: nextErrors,
      };
    });
  }, []);

  const submitModal = useCallback(() => {
    if (!modal) return;
    const { id, values, editId } = modal;
    const F = FORMS_DEF[id];
    if (!F) return;

    // Fields that only apply when the record is first created are not shown on an edit.
    const hidden = (fd: any) => !!editId && fd.addOnly;
    const errors: Record<string, string> = {};
    F.fields.forEach((fd: any) => {
      if (fd.g || hidden(fd)) return;
      const v = values[fd.k];
      if (fd.req && (v === '' || v == null)) errors[fd.k] = 'Required.';
      else if (fd.min != null && v !== '' && n(v) < fd.min) errors[fd.k] = 'Must be at least ' + fd.min + '.';
      else if (fd.maxToday && v && M.parseDate(v) > M.TODAY)
        errors[fd.k] = 'Cannot be a future date (today is ' + M.fmtDate(M.TODAY) + ').';
    });
    Object.assign(errors, F.validate(values, editId));
    // An error on a field that is not on screen would otherwise block the save silently.
    F.fields.forEach((fd: any) => {
      if (fd.g || !hidden(fd) || !errors[fd.k]) return;
      errors._form = (errors._form ? errors._form + ' ' : '') + errors[fd.k] + ' That amount is already on the cash ledger — void the payment to change it.';
      delete errors[fd.k];
    });

    if (Object.keys(errors).length) {
      setModal((prev) => (prev ? { ...prev, errors } : null));
      return;
    }

    if (!ledgersReady()) {
      setModal((prev) =>
        prev ? { ...prev, errors: { _form: 'Your records are still loading from the server. Please try again in a moment.' } } : null
      );
      return;
    }

    // An entry made while the database is unreachable would show on screen and vanish on reload.
    const dbDown = ledgerError();
    if (dbDown) {
      setModal((prev) => (prev ? { ...prev, errors: { _form: dbDown } } : null));
      return;
    }

    const LEDGERS = ['properties', 'sales', 'commissions', 'expenses', 'payments', 'audit', 'invoices', 'agents', 'taxes', 'zakat', 'bills', 'salaries', 'tasks', 'taskProjects'];
    const before: Record<string, number> = {};
    LEDGERS.forEach((key) => {
      before[key] = (M.DATA as any)[key].length;
    });

    try {
      if (editId) {
        // An edit stays on the page it was made from.
        F.update(editId, values);
        setFresh((prev) => [editId, ...prev.filter((x) => x !== editId)].slice(0, 24));
        setModal(null);
        setDataVersion((v) => v + 1);
        toast(editId + ' updated');
        return;
      }
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
      cols = Array.from(tbl.querySelectorAll('thead th:not([data-noexport])')).map((th) => th.textContent?.replace(/[↑↓]/g, '').trim() || '');
      rows = Array.from(tbl.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.children).filter((td) => !td.hasAttribute('data-noexport')).map((td) => td.textContent?.trim() || '')
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
      cols = Array.from(tbl.querySelectorAll('thead th:not([data-noexport])')).map((th) => th.textContent?.replace(/[↑↓]/g, '').trim() || '');
      rows = Array.from(tbl.querySelectorAll('tbody tr')).map((tr) =>
        Array.from(tr.children).filter((td) => !td.hasAttribute('data-noexport')).map((td) => td.textContent?.trim() || '')
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

  const refreshData = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

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
        attach,
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
        openEdit,
        closeModal,
        openAttachments,
        closeAttachments,
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
        refreshData,
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
