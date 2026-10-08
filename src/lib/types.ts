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
  id: string;
  values: Record<string, any>;
  errors: Record<string, string>;
  /** Set when the form is correcting a saved record rather than creating one. */
  editId?: string;
}

export interface MenuState {
  id: string;
  x: number;
  y: number;
}

export type FilerStatus = 'Filer' | 'Late Filer' | 'Non-Filer';

export interface CostSheet {
  /** On a mirror: the fields changed on it. Every other field follows the original. */
  mirrorEdits?: string[];
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
  
  // NET BUY COST
  netBuyCost: number; // Base purchase price from seller

  // 1. SOCIETY / GOVT TRANSFER COST
  ndcFee: number; // 1.0 NDC & Verification Fee
  stampDuty: number; // 1.1 Provincial Stamp Duty (1%)
  stampDutyPct?: number;
  cvt: number; // 1.1 Capital Value Tax CVT (1%)
  cvtPct?: number;
  cdaRdaTransferFee: number; // 1.2 Govt Authority CDA/RDA Transfer Fee (0.5%)
  cdaRdaTransferFeePct?: number;
  societyTransferFee: number;
  legalCharges?: number;
  developmentCharges?: number;
  otherAcquisition?: number;
  totalSocietyGovtTransfer: number;
  totalAcquisitionExtras: number;

  // 2. GOVT TAXES (BUY SIDE)
  tax236K: number; // 2.1 FBR Section 236K (Advance Tax on Purchase)
  tax236KPct?: number;
  buyerFilerStatus: FilerStatus;

  // 3. HANDLING / EXPENSES
  handlingExpenses: number; // 3. Base handling expenses
  renovationRepairs: number; // 3.1 Renovation & Repairs
  maintenanceHolding: number; // 3.2 Maintenance & Bills
  maintenanceBills?: number;
  marketingExpenses: number; // 3.3 Marketing
  fuelTravelling: number; // 3.4 Fuel & Travelling
  salaryExpenses: number; // 3.5 Salary & other Expenses
  totalHandlingExpenses: number;
  totalCarryingCosts: number;

  // 4. REAL ESTATE AGENT FEE (BUY SIDE)
  buySideAgentFee: number;
  purchaseBrokeragePct: number;
  purchaseBrokerage: number;
  purchaseAgentName?: string;

  // PURCHASE PRICE (Total Landed / Acquisition Basis = SUM(F6:F20))
  purchasePrice: number;
  totalLandedCost: number;

  // SALE SIDE & EXIT
  grossSalePrice: number; // Current value / Gross sale price
  sellingPrice: number; // alias
  tax236C: number; // 2.2 FBR Section 236C (Advance Tax on Sale)
  tax236CPct?: number;
  sellerFilerStatus: FilerStatus;
  sellSideAgentFee: number; // Real Estate Agent Fee Sell Side
  saleBrokeragePct: number;
  saleBrokerage: number;
  saleAgentName?: string;
  municipalTax?: number;
  otherSellingExpenses?: number;
  totalSellingExpenses?: number;
  totalCommissions: number; // Buy + Sell Agent Commission

  // PROFIT & LOSS WATERFALL
  grossProfit: number; // Gross Sale Price - Purchase Price
  grossProfitPct: number;
  grossMarginPct: number;
  cgtRatePct: number; // Capital Gains Tax (CGT 15%)
  cgtAmount: number;
  zakat: number; // ZAQAT
  charity: number; // CHARITY
  officeExpenseDeduction?: number; // Staff / office overhead deduction from deal profit
  netMargin: number; // NET MARGIN = Gross Profit - CGT - Zakat - Charity - overhead
  netProfit: number; // alias
  netMarginPct: number;
  roiPct: number;
  annualizedRoiPct: number;
  totalTaxesToPay: number;
  breakEvenPrice: number;

  // Counterparties & Details
  seller: string;
  buyer?: string;
  notes?: string;
  manual?: boolean;
  /** Extra lines carried by the engine (sale-side costs, record sources, flags). */
  [key: string]: any;
}

export interface Invoice {
  id: string;
  srNo: number;
  type: 'sale' | 'purchase' | 'proforma'; // sale = given to buyer, purchase = kept by company, proforma = quotation
  receiptDate: Date | string;
  propertyId?: string;
  propertyName?: string;
  saleId?: string;

  // Buyer info
  buyerName: string;
  buyerCompany?: string;
  buyerCnic?: string;

  // Seller info
  sellerName?: string;
  sellerCompany?: string;
  sellerCnic?: string;

  // Payment info
  paymentDate?: Date | string;
  paymentMode?: string;
  paymentRef?: string;
  paymentTerms?: string;
  bankDetailsBuyer?: string;
  bankDetailsSeller?: string;

  // Amounts
  totalAmount: number;
  balanceAmount: number;
  tokenAmount: number;
  tokenDate?: Date | string;
  transferDate?: Date | string;

  // Received by (seller side)
  receivedByName: string;
  receivedByCnic?: string;

  // Received from (buyer side)
  receivedFromName: string;
  receivedFromCnic?: string;

  approvedByName?: string;

  notes?: string;
  manual?: boolean;
  /** Set when this invoice was created as a copy of another one. */
  mirrorOf?: string | null;
  /** On a mirror: the fields changed on it. Every other field follows the original. */
  mirrorEdits?: string[];
}
