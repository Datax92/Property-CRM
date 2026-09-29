export interface User {
  id: string;
  name: string;
  role: 'CEO' | 'Accountant' | 'Manager' | 'Agent';
  title: string;
  initials: string;
  office: string;
  agentId?: string;
}

export interface NavTab {
  id: string;
  label: string;
  need?: string;
}

export interface NavSection {
  id: string;
  label: string;
  u: string;
  icon: string;
  group: string;
  tabs: NavTab[];
}

export interface DateRange {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

export interface Filters {
  project: string;
  agent: string;
  office: string;
  type: string;
  status: string;
  payStatus: string;
  propIds?: string[];
}

export interface TableColumn<T = any> {
  key: string;
  label: string;
  a?: 'r';
  cls?: string;
  sum?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface ModalState {
  id: 'property' | 'sale' | 'expense' | 'payment';
  values: Record<string, any>;
  errors: Record<string, string>;
}

export interface MenuState {
  id: string;
  x: number;
  y: number;
}

export type FilerStatus = 'Filer' | 'Late Filer' | 'Non-Filer';

export interface CostSheet {
  id: string;
  propertyId: string;
  name: string;
  project: string;
  city: string;
  type: string;
  size: string;
  block?: string;
  unit?: string;
  status: 'Sold' | 'Active Deal' | 'Draft' | 'Reserved';
  office: string;
  
  // Dates
  purchaseDate: Date | string;
  saleDate: Date | string | null;
  heldDays: number;
  
  // 1. Purchase Side
  purchasePrice: number;
  purchaseBrokeragePct: number;
  purchaseBrokerage: number;
  purchaseAgentName?: string;
  
  // Acquisition Extra Costs & Levies
  stampDuty: number;
  cvt: number;
  tax236K: number;
  buyerFilerStatus: FilerStatus;
  societyTransferFee: number;
  ndcFee: number;
  legalCharges: number;
  developmentCharges: number;
  otherAcquisition: number;
  totalAcquisitionExtras: number;
  
  // 2. Carrying / Improvements
  renovationRepairs: number;
  maintenanceHolding: number;
  marketingExpenses: number;
  totalCarryingCosts: number;
  
  // Total Landed Cost Basis
  totalLandedCost: number;
  
  // 3. Sale Side
  sellingPrice: number;
  saleBrokeragePct: number;
  saleBrokerage: number;
  saleAgentName?: string;
  
  // Taxes on Sale
  tax236C: number;
  sellerFilerStatus: FilerStatus;
  cgtRatePct: number;
  cgtAmount: number;
  municipalTax: number;
  otherSellingExpenses: number;
  totalSellingExpenses: number;
  
  // 4. Linked Metrics & Bottom Line
  totalTaxesToPay: number;
  totalCommissions: number;
  grossProfit: number;
  grossMarginPct: number;
  netProfit: number;
  netMarginPct: number;
  roiPct: number;
  annualizedRoiPct: number;
  breakEvenPrice: number;
  
  // Counterparties
  seller: string;
  buyer?: string;
  notes?: string;
  manual?: boolean;
}

