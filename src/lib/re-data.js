import { saveRecordToFirestore, deleteRecordFromFirestore } from './firestore-service';

// Real Estate Management System — Reporting Module
// In-memory ledgers (mirrored to Firestore) + all financial aggregation logic.
// Every figure below is computed from the underlying transaction records
// (per requirements §37).

const _now = new Date();
export const TODAY = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());
export const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || 'A & SONS TRADEWAY ASSOCIATE (SMC) PVT LTD';
export const COMPANY_SHORT = 'A & Sons Tradeway';
export const COMPANY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
  'Office No. 3, First Floor, Islamabad Shopping Centre, Near Petrol Pump, Fateh Jang Road, Tarnol, Islamabad';
export const COMPANY_PHONE = process.env.NEXT_PUBLIC_COMPANY_PHONE || '+92 314 5530782';
export const COMPANY_EMAIL = process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'a_sonstradeway@hotmail.com';

// Who is making entries — stamped on the cash ledger and the audit trail.
let ACTOR = 'Admin';
export const setActor = (name) => { ACTOR = name || 'Admin'; };

let _s = 20260901;
const rnd = () => ((_s = (_s * 1664525 + 1013904223) >>> 0), _s / 4294967296);
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a) => a[Math.floor(rnd() * a.length)];
const day = 864e5;
const addDays = (d, n) => new Date(d.getTime() + n * day);
const dstr = (d) => d.toISOString().slice(0, 10);
const cap = (d) => (d && d > TODAY ? TODAY : d);
const round = (n) => Math.round(n);

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// The starting list of societies. Projects added in the app are stored in the database
// and joined on to it, so PROJECTS is always the full list.
const BUILTIN_PROJECTS = [
  { id: 'PRJ-01', name: 'DHA Phase 6', city: 'Lahore' },
  { id: 'PRJ-02', name: 'Bahria Orchard', city: 'Lahore' },
  { id: 'PRJ-03', name: 'Gulberg Greens', city: 'Islamabad' },
  { id: 'PRJ-04', name: 'Crescent Bay', city: 'Karachi' },
  { id: 'PRJ-05', name: 'Askari XI', city: 'Lahore' },
  { id: 'PRJ-06', name: 'Blue World City', city: 'Islamabad' },
];
export const PROJECTS = BUILTIN_PROJECTS.slice();
export const OFFICES = ['Head Office — Lahore','DHA Branch — Lahore','Islamabad Branch','Karachi Branch','Multan Branch'];
export const TYPES = ['Residential Plot','Commercial Plot','House','Apartment','Farmhouse','Shop'];
export const STATUSES = ['Available','Reserved','Under Process','Sold'];
export const PAY_STATUS = ['Paid','Partially Paid','Unpaid','Overdue'];
export const METHODS = ['Cash','Bank Transfer','Cheque','Online Payment','Other'];
/** No built-in accounts: the business adds its own. A payment saved without one is listed under this name. */
export const ACCOUNTS = [];
export const NO_ACCOUNT = 'No account';
/** Money in that is earned outside property trading. It counts as revenue in profit and loss. */
const BUILTIN_INCOME = ['Rental Income', 'Profit on Deposit', 'Commission Earned', 'Dividend', 'Other Income'];
/** The built-in kinds and the ones added under Income → Categories (rebuilt in place when those load). */
export const INCOME_CATEGORIES = BUILTIN_INCOME.slice();
/** Money in that is not earned: the owner putting money in, or what an account held to begin with. */
export const CAPITAL_CATEGORIES = ['Owner Capital', 'Opening Balance'];
/** Money moved from one of the company's own accounts to another: neither money in nor money out. */
export const TRANSFER_CATEGORY = 'Transfer between accounts';
export const isTransfer = (p) => p.category === TRANSFER_CATEGORY;
/** A receipt against an entry in the income ledger: the income itself is counted from that entry. */
const isIncomeReceipt = (p) => String(p.settleKey || '').startsWith('inc:');
/** Cash in hand or a bank account. An account named for cash ("Cash in hand", "Petty Cash") is cash. */
export const ACCOUNT_KINDS = ['Cash', 'Bank'];
export const accountKind = (name) => (/cash|petty|in hand|\bhand\b|tijori|locker/i.test(String(name || '')) ? 'Cash' : 'Bank');

const AGENT_NAMES = ['Ahmed Khan','Sana Malik','Bilal Raza','Hina Qureshi','Usman Sheikh','Farah Iqbal','Zain Abbas','Nida Aslam'];
const BUYERS = ['Kamran Aziz','Ayesha Tariq','Rehan Dar','Mahnoor Sethi','Junaid Butt','Saira Hameed','Adnan Yousaf','Tania Rafiq','Waleed Chaudhry','Noor Fatima','Imran Sial','Beenish Anwar','Shahid Mahmood','Rabia Zafar','Danish Alvi','Komal Nadeem','Tariq Jameel','Sundas Ali','Haris Baig','Mehreen Shah'];
const SELLERS = ['Estate Trust Holdings','Nawaz & Sons Builders','Mirza Land Developers','Private Seller — A. Rasheed','Falcon Developers','Private Seller — S. Bukhari','Crescent Property Group','Private Seller — M. Yaqoob'];
const EMP = [
  ['Faisal Nadeem','Finance',280000],['Ayesha Siddiqui','Finance',190000],['Hamza Tariq','Sales',220000],
  ['Sadia Rehman','Sales',180000],['Omar Farooq','Operations',210000],['Zara Sheikh','Marketing',175000],
  ['Ali Hassan','Legal',260000],['Maria Javed','HR',165000],['Bilal Ahmed','IT',195000],
  ['Nashit Raza','Operations',150000],['Iqra Waseem','Admin',120000],['Shoaib Akhtar','Admin',95000],
  ['Tahira Bano','Front Desk',85000],['Kashif Mehmood','Security',70000],
];

const EXPENSE_TREE = {
  'Office Expenses': ['Office Rent','Cleaning','Security Services','Stationery','Furniture','Repairs','Maintenance','Office Supplies','Software Subscriptions'],
  'Employee Expenses': ['Bonuses','Allowances','Overtime','Travel','Staff Welfare'],
  'Marketing Expenses': ['Facebook / Instagram Ads','Google Ads','Property Portals','Printing','Billboards','Promotional Material','Events'],
  'Property Expenses': ['Property Maintenance','Transfer Charges','Legal Fees','Documentation','Development Charges','Renovation'],
  'Other Expenses': ['Bank Charges','Donations','Charity','Miscellaneous'],
  // Not business costs: the owner's own spending (drawings) and things bought to keep (assets).
  // Both leave the cash ledger but neither is charged against profit.
  'Personal Expenses': ['Household','Family','Medical','Education','Personal Travel','Other Personal'],
  'Assets': ['Gold','Stocks & Shares (PSX)','Mutual Funds','Savings / Deposits','Land & Building','Vehicles','Furniture & Fixtures','Computers & IT','Office Equipment','Other Assets'],
};
/** The built-in categories and the ones added under Costs → Categories (rebuilt in place when those load). */
export const EXPENSE_GROUPS = Object.keys(EXPENSE_TREE);
/** Sub-categories added to a category under Costs → Categories, by category. */
let CUSTOM_SUBS = {};
export const expenseSubcats = (group) => Array.from(new Set([...(EXPENSE_TREE[group] || []), ...(CUSTOM_SUBS[group] || [])]));
/** True for a category that came with the portal rather than being added. */
export const isBuiltinCategory = (kind, name) => (kind === 'income' ? BUILTIN_INCOME : Object.keys(EXPENSE_TREE)).indexOf(name) >= 0;
/** Groups on the expense ledger that are not expenses of the business. */
export const NON_EXPENSE_GROUPS = ['Personal Expenses', 'Assets'];
/** Words in an expense's sub-category or note that place it on a line of a deal cost sheet. */
export const DEAL_COST_LINES = [
  ['Society / transfer expenses', 'societyTransferFee', /societ|transfer|ndc|verif|stamp|cvt|registr/i],
  ['Legal fees', 'legalCharges', /legal|lawyer|documentation/i],
  ['Development charges', 'developmentCharges', /develop/i],
  ['Salary', 'salaryExpenses', /salar|staff|wage/i],
  ['Travelling / fuel', 'fuelTravelling', /travel|fuel|petrol|visit|transport/i],
  ['Marketing', 'marketingExpenses', /market|advert|\bads?\b|portal|print|billboard/i],
  ['Renovation & repairs', 'renovationRepairs', /renovat|repair/i],
  ['Maintenance & bills', 'maintenanceBills', /mainten|bill|electric|gas|water/i],
  ['Charity', 'charity', /charit|donat|sadaq|sadq|khairat/i],
];
export const DEAL_COST_SUGGESTIONS = DEAL_COST_LINES.map((x) => x[0]);

const BILL_TYPES = [
  ['Electricity','LESCO',420000],['Gas','SNGPL',85000],['Water','WASA',35000],['Internet','Nayatel',120000],
  ['Telephone','PTCL',48000],['Office Rent','Gulberg Trust',1400000],['Software','Zoho / MS 365',180000],
  ['Hosting','Cloudways',60000],['Security','Wackenhut',260000],['Maintenance','FM Services',150000],
];

function propertyName(type, project, i) {
  if (type === 'House' || type === 'Farmhouse') return `${type} ${String.fromCharCode(65 + (i % 26))}-${100 + i} · ${project.name}`;
  if (type === 'Apartment') return `Apt ${int(2, 18)}0${int(1, 9)} · ${project.name}`;
  if (type === 'Shop') return `Shop ${int(1, 40)} · ${project.name}`;
  return `${type} ${int(1, 900)} · ${project.name}`;
}

function buildData() {
  const agents = [];
  const employees = [];
  const properties = [];
  const sales = [];
  const commissions = [];
  const payments = [];
  const taxes = [];
  const expenses = [];
  const salaries = [];
  const bills = [];
  const zakat = [];
  const zakatSummary = { calculated: 0, paid: 0, remaining: 0, zakatable: 0, eligibleAssets: 0, rate: 2.5 };
  const audit = [];
  const costSheets = [];
  const invoices = [];
  const projects = [];

  const tasks = [];
  const taskProjects = [];
  const income = [];
  const categories = [];
  return { categories, projects, agents, employees, properties, sales, commissions, expenses, salaries, bills, taxes, zakat, zakatSummary, payments, audit, costSheets, invoices, tasks, taskProjects, income };
}


export const DATA = buildData();

/* ============================ formatting ============================ */
export function fmt(n, mode) {
  const p = fmtParts(n, mode);
  return p.sign + "PKR " + p.num + (p.unit ? " " + p.unit : "");
}

/* Pakistani reporting convention: crore (1 Cr = 10,000,000) and lakh (1 Lakh = 100,000).
   This is how Pakistani real estate, the State Bank and the Bureau of Statistics report
   money, so a Pakistani reader needs no mental conversion. mode: "cr" | "m" | "full". */
const trimZeros = (t) => { if (t.indexOf(".") < 0) return t; let e = t.length; while (e > 0 && t[e - 1] === "0") e--; if (e > 0 && t[e - 1] === ".") e--; return t.slice(0, e); };

export function fmtParts(n, mode) {
  const neg = n < 0, a = Math.abs(n);
  const sign = neg ? "−" : "";
  if (mode === "full") return { sign, num: Math.round(a).toLocaleString("en-US"), unit: "" };
  if (mode === "m") {
    if (a >= 1e9) return { sign, num: trimZeros((a / 1e9).toFixed(2)), unit: "B" };
    if (a >= 1e6) return { sign, num: trimZeros((a / 1e6).toFixed(a >= 1e8 ? 0 : 1)), unit: "M" };
    if (a >= 1e3) return { sign, num: (a / 1e3).toFixed(0), unit: "K" };
    return { sign, num: Math.round(a).toString(), unit: "" };
  }
  // default: crore / lakh
  // 99.5 lakh and above is shown in crore, so it never rounds up to "100 Lakh".
  if (a >= 9.95e6) { const v = a / 1e7; return { sign, num: trimZeros(v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)), unit: "Cr" }; }
  if (a >= 1e5) { const v = a / 1e5; return { sign, num: trimZeros(v >= 10 ? v.toFixed(0) : v.toFixed(1)), unit: "Lakh" }; }
  return { sign, num: Math.round(a).toLocaleString("en-US"), unit: "" };
}
export const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
/** Parse a date-input value as a LOCAL calendar date, never UTC. */
export function parseDate(v) {
  if (v instanceof Date) return v;
  const p = String(v == null ? '' : v).split('-');
  return (p.length === 3 && p[0].length === 4 && p.every((x) => x !== '' && !isNaN(+x)))
    ? new Date(+p[0], +p[1] - 1, +p[2])
    : new Date(v);
}
/** Format a Date as YYYY-MM-DD using local parts, so the day never shifts. */
export const dateInput = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
};
export const fmtDate = (d) => d instanceof Date ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (d || '—');
export const pctOf = (a, b) => (b ? (a / b) * 100 : 0);

/* ============================ date ranges ============================ */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
const startOfWeek = (d) => { const x = startOfDay(d); const w = (x.getDay() + 6) % 7; return addDays(x, -w); };

export const RANGE_KEYS = [
  ['today','Today'],['yesterday','Yesterday'],['thisWeek','This week'],['lastWeek','Last week'],
  ['thisMonth','This month'],['lastMonth','Last month'],['thisQuarter','This quarter'],
  ['thisYear','This year'],['lastYear','Last year'],
  ['thisFiscalYear','This fiscal year (Jul–Jun)'],['lastFiscalYear','Last fiscal year (Jul–Jun)'],
  ['last7','Last 7 days'],['last30','Last 30 days'],['last90','Last 90 days'],
  ['custom','Custom range'],
];

export function rangeFor(key, custom) {
  const t = TODAY, y = t.getFullYear(), m = t.getMonth();
  const wrap = (s, e, label) => ({ start: startOfDay(s), end: endOfDay(e), label, key });
  switch (key) {
    case 'today': return wrap(t, t, fmtDate(t));
    case 'yesterday': return wrap(addDays(t, -1), addDays(t, -1), fmtDate(addDays(t, -1)));
    case 'thisWeek': return wrap(startOfWeek(t), t, 'Week of ' + fmtDate(startOfWeek(t)));
    case 'lastWeek': { const s = addDays(startOfWeek(t), -7); return wrap(s, addDays(s, 6), 'Week of ' + fmtDate(s)); }
    case 'thisMonth': return wrap(new Date(y, m, 1), t, MONTHS[m] + ' ' + y);
    case 'lastMonth': { const s = new Date(y, m - 1, 1); return wrap(s, new Date(y, m, 0), MONTHS[s.getMonth()] + ' ' + s.getFullYear()); }
    case 'thisFiscalYear': {
      // Pakistan fiscal year: July 1 to June 30
      const fyStart = m >= 6 ? new Date(y, 6, 1) : new Date(y - 1, 6, 1); // July 1
      const fyEnd = m >= 6 ? new Date(y + 1, 5, 30) : new Date(y, 5, 30); // June 30
      const label = 'FY ' + fyStart.getFullYear() + '–' + fyEnd.getFullYear();
      return wrap(fyStart, cap(fyEnd) || t, label);
    }
    case 'lastFiscalYear': {
      const fyStart = m >= 6 ? new Date(y - 1, 6, 1) : new Date(y - 2, 6, 1);
      const fyEnd = m >= 6 ? new Date(y, 5, 30) : new Date(y - 1, 5, 30);
      return wrap(fyStart, fyEnd, 'FY ' + fyStart.getFullYear() + '–' + fyEnd.getFullYear());
    }
    case 'last7': return wrap(addDays(t, -6), t, 'Last 7 days');
    case 'last30': return wrap(addDays(t, -29), t, 'Last 30 days');
    case 'last90': return wrap(addDays(t, -89), t, 'Last 90 days');
    case 'thisQuarter': { const q = Math.floor(m / 3); return wrap(new Date(y, q * 3, 1), t, 'Q' + (q + 1) + ' ' + y); }
    case 'thisYear': return wrap(new Date(y, 0, 1), t, 'FY ' + y);
    case 'lastYear': return wrap(new Date(y - 1, 0, 1), new Date(y - 1, 11, 31), 'FY ' + (y - 1));
    case 'custom': {
      const s = custom && custom.start ? parseDate(custom.start) : new Date(y, 0, 1);
      const e = custom && custom.end ? parseDate(custom.end) : t;
      return wrap(s, e, fmtDate(s) + ' → ' + fmtDate(e));
    }
    default: return wrap(new Date(y, 0, 1), t, 'FY ' + y);
  }
}

export function validateCustom(custom) {
  if (!custom || !custom.start || !custom.end) return 'Pick both a start and an end date.';
  const s = parseDate(custom.start), e = parseDate(custom.end);
  if (isNaN(s) || isNaN(e)) return 'Invalid date.';
  if (s > e) return 'Start date must be on or before the end date.';
  if (e > endOfDay(TODAY)) return 'End date cannot be in the future (today is ' + fmtDate(TODAY) + ').';
  return null;
}

const inR = (d, r) => d instanceof Date && d >= r.start && d <= r.end;
export { inR as inRange, addDays, dstr, day };

/* ============================ filtering ============================ */
export const EMPTY_FILTERS = { project: 'all', agent: 'all', type: 'all', status: 'all', payStatus: 'all', office: 'all', property: 'all' };

export function propMatch(p, f) {
  if (f.propIds && f.propIds.indexOf(p.id) < 0) return false; // role-assigned subset
  if (f.project !== 'all' && p.projectId !== f.project) return false;
  if (f.type !== 'all' && p.type !== f.type) return false;
  if (f.status !== 'all' && p.status !== f.status) return false;
  if (f.office !== 'all' && p.office !== f.office) return false;
  if (f.property !== 'all' && p.id !== f.property) return false;
  if (f.payStatus !== 'all' && p.payStatus !== f.payStatus) return false;
  return true;
}
export function saleMatch(s, f, propIds) {
  if (!propIds.has(s.propertyId)) return false;
  if (f.agent !== 'all' && s.agentId !== f.agent) return false;
  if (f.payStatus !== 'all' && s.payStatus !== f.payStatus) return false;
  if (f.office !== 'all' && s.office !== f.office) return false;
  return true;
}
const overheadMatch = (x, f) => f.office === 'all' || x.office === f.office;
export const scopedToProperty = (f) => f.project !== 'all' || f.agent !== 'all' || f.type !== 'all' || f.property !== 'all' || !!f.propIds;

/* ============================ core aggregation ============================ */
/** §31 — a voided transaction stays on the ledger but no longer moves cash. */
export const livePayments = () => DATA.payments.filter((p) => p.status !== 'Voided');

/** When an expense, tax or Zakat entry counts in profit. One picked for a plot is a cost of that
    deal, as on its cost sheet: it counts when the plot is sold, on the sale date, and until then
    it is held in what the plot cost (null). Anything else counts on its own date. Assets and
    personal spending are never a cost of a deal. */
export function profitDate(x) {
  if (!x.propertyId || NON_EXPENSE_GROUPS.indexOf(x.group) >= 0) return x.date;
  if (!DATA.properties.some((p) => p.id === x.propertyId)) return x.date;
  const sale = DATA.sales.find((s) => s.propertyId === x.propertyId);
  return sale ? sale.date : null;
}

export function computeKPIs(r, f) {
  const D = DATA;
  refreshZakatSummary();
  const props = D.properties.filter((p) => propMatch(p, f));
  const propIds = new Set(props.map((p) => p.id));

  const purchased = props.filter((p) => inR(p.purchaseDate, r));
  const purchaseCost = purchased.reduce((a, p) => a + p.totalCost, 0);
  const purchasePrice = purchased.reduce((a, p) => a + p.price, 0);
  const acquisitionCosts = purchaseCost - purchasePrice;

  const soldInRange = D.sales.filter((s) => saleMatch(s, f, propIds) && inR(s.date, r));
  const salesRevenue = soldInRange.reduce((a, s) => a + s.sellingPrice, 0);
  // Income earned outside property trading (rent, profit on deposits ...): the income ledger, on
  // the date each entry was earned, plus income received straight on the cash ledger.
  // In a narrowed scope only income picked for a property in it counts.
  const otherIncome = incomeEntries(r, f, propIds).reduce((a, x) => a + x.amount, 0);
  const incomeDue = (D.income || []).filter((x) => overheadMatch(x, f)).reduce((a, x) => a + (x.outstanding || 0), 0);
  const totalRevenue = salesRevenue + otherIncome;
  const cashReceived = soldInRange.reduce((a, s) => a + s.received, 0);
  // Company scope: gross profit follows the document definition (revenue − period purchase cost).
  // Narrowed scope (a single agent, project, type or property): the period purchase cost belongs to
  // the whole company, so matching it against a slice of revenue would be meaningless — the cost of
  // the properties actually sold in scope is used instead.
  const scoped = scopedToProperty(f);

  // Each plot sold in the period counts whole, exactly as its cost sheet adds it up from the
  // records: price, transfer costs, buy-side tax, handling and agent fee (the landed cost), then
  // the selling costs, then CGT, Zakat and charity. So the profit of a deal here and on its cost
  // sheet is the same figure, and each tax is counted once, on its own line.
  const deal = {
    count: 0, buyPrice: 0, transfer: 0, buyTax: 0, handling: 0, buyAgent: 0,
    saleTax: 0, sellAgent: 0, otherSelling: 0, cgt: 0, zakat: 0, charity: 0,
    landed: 0, selling: 0, gross: 0, deductions: 0, net: 0, propertyIds: /** @type {string[]} */ ([]),
  };
  soldInRange.forEach((s) => {
    deal.count++;
    const rec = s.propertyId && D.properties.some((p) => p.id === s.propertyId) ? sheetFromRecords(s.propertyId) : null;
    if (!rec) {
      // A sale whose plot is gone: only what is on the sale itself is known.
      deal.buyPrice += s.propertyCost || 0; deal.saleTax += saleTaxCounted(s);
      deal.sellAgent += s.commission || 0; deal.otherSelling += s.otherExpenses || 0;
      return;
    }
    deal.propertyIds.push(s.propertyId);
    deal.buyPrice += rec.netBuyCost; deal.transfer += rec.totalSocietyGovtTransfer; deal.buyTax += rec.tax236K;
    deal.handling += rec.totalHandlingExpenses; deal.buyAgent += rec.buySideAgentFee;
    deal.saleTax += rec.tax236C; deal.sellAgent += rec.sellSideAgentFee; deal.otherSelling += rec.otherSellingExpenses;
    deal.cgt += rec.cgtAmount; deal.zakat += rec.zakat; deal.charity += rec.charity;
  });
  deal.landed = deal.buyPrice + deal.transfer + deal.buyTax + deal.handling + deal.buyAgent;
  deal.selling = deal.saleTax + deal.sellAgent + deal.otherSelling;
  deal.gross = salesRevenue - deal.landed - deal.selling;
  deal.deductions = deal.cgt + deal.zakat + deal.charity;
  deal.net = deal.gross - deal.deductions;

  const costOfSales = deal.landed;
  const saleTaxes = deal.saleTax;
  const sellingCosts = deal.otherSelling;
  const directCosts = deal.selling;
  const grossProfit = totalRevenue - costOfSales - directCosts;

  // A record picked for a plot belongs to that deal (above, once it is sold); anything else is
  // a company overhead, counted on its own date.
  const plotIds = new Set(D.properties.map((p) => p.id));
  const ofDeal = (x) => !!x.propertyId && plotIds.has(x.propertyId) && NON_EXPENSE_GROUPS.indexOf(x.group) < 0;

  const agentOk = (c) => propIds.has(c.propertyId) && (f.agent === 'all' || c.agentId === f.agent);
  const comms = D.commissions.filter((c) => agentOk(c) && inR(c.date, r));
  // Agent fees of the deals closed in the period, both sides.
  const commission = deal.buyAgent + deal.sellAgent;
  const commissionPaid = comms.reduce((a, c) => a + c.paid, 0);
  const commissionOut = comms.reduce((a, c) => a + c.outstanding, 0);

  const exp = D.expenses.filter((e) => !ofDeal(e) && inR(e.date, r) && overheadMatch(e, f));
  const byGroup = {};
  EXPENSE_GROUPS.forEach((g) => (byGroup[g] = 0));
  exp.forEach((e) => (byGroup[e.group] = (byGroup[e.group] || 0) + e.amount));
  // Categories added in the portal are company expenses, each on its own line.
  const customGroups = Object.keys(byGroup).filter((g) => g && !EXPENSE_TREE[g]).map((g) => [g, byGroup[g]]);
  const customExp = customGroups.reduce((a, x) => a + x[1], 0);

  const sal = D.salaries.filter((s) => inR(s.date, r) && overheadMatch(s, f));
  const salaries = sal.reduce((a, s) => a + s.net, 0);
  const salariesPaid = sal.filter((s) => s.status === 'Paid').reduce((a, s) => a + s.net, 0);

  const bl = D.bills.filter((b) => inR(b.dueDate, r) && overheadMatch(b, f));
  const bills = bl.reduce((a, b) => a + b.amount, 0);
  const billsPaid = bl.reduce((a, b) => a + b.paid, 0);
  const billsOut = bl.reduce((a, b) => a + b.outstanding, 0);
  const billsOverdue = bl.filter((b) => b.status === 'Overdue');

  // What is owed and paid follows each entry's own date; only the profit side waits for a sale.
  const txs = D.taxes.filter((t) => inR(t.date, r) && overheadMatch(t, f));
  const taxBooked = txs.reduce((a, t) => a + t.amount, 0);
  const taxPaid = txs.reduce((a, t) => a + t.paid, 0);
  const taxOut = txs.reduce((a, t) => a + t.outstanding, 0);
  // Tax below the operating line: CGT on the deals closed, and tax not picked for any plot.
  // Stamp duty, CVT and §236K are in the landed cost and §236C in the selling costs, as on the sheet.
  const overheadTax = D.taxes.filter((t) => !ofDeal(t) && inR(t.date, r) && overheadMatch(t, f)).reduce((a, t) => a + t.amount, 0);
  const tax = deal.cgt + (scoped ? 0 : overheadTax);
  const taxDueSoon = D.taxes.filter((t) => !t.paid && t.dueDate >= TODAY && t.dueDate <= addDays(TODAY, 30)).reduce((a, t) => a + t.amount, 0);

  const zk = D.zakat.filter((z) => inR(z.date, r));
  const zakatPaid = zk.reduce((a, z) => a + z.amount, 0);
  const zakat = deal.zakat + (scoped ? 0 : D.zakat.filter((z) => !ofDeal(z) && inR(z.date, r)).reduce((a, z) => a + (z.amount || 0), 0));
  const charity = deal.charity;

  const officeExp = byGroup['Office Expenses'], marketing = byGroup['Marketing Expenses'],
    propertyExp = byGroup['Property Expenses'], employeeExp = byGroup['Employee Expenses'],
    other = byGroup['Other Expenses'];
  const personal = byGroup['Personal Expenses'], assetsBought = byGroup['Assets'];

  // Operating costs exclude tax and Zakat: tax is a statutory charge and Zakat (§17) is an
  // appropriation of profit, not an operating expense. Keeping the three stages apart is what
  // lets the waterfall show Gross → Operating → Net without double counting.
  // Company overheads: costs not picked for any plot. In a narrowed scope (one agent, project,
  // type or property) they are not allocated, so only the deals' own costs count there.
  const operatingCosts = scoped ? 0 : salaries + officeExp + marketing + propertyExp + employeeExp + bills + other + customExp;
  // Everything spent besides the price paid for the plots sold.
  const totalExpenses = (costOfSales - deal.buyPrice) + directCosts + operatingCosts + tax + zakat + charity;
  const netProfit = grossProfit - operatingCosts - tax - zakat - charity;

  // Money moved between the company's own accounts is neither in nor out.
  const pay = livePayments().filter((p) => !isTransfer(p) && inR(p.date, r) && overheadMatch(p, f) && (!scopedToProperty(f) || !p.propertyId || propIds.has(p.propertyId)));
  const cashIn = pay.filter((p) => p.dir === 'in').reduce((a, p) => a + p.amount, 0);
  const cashOut = pay.filter((p) => p.dir === 'out').reduce((a, p) => a + p.amount, 0);

  const unsold = props.filter((p) => p.status !== 'Sold');
  const portfolioCost = unsold.reduce((a, p) => a + landedCost(p.id), 0);
  const portfolioValue = unsold.reduce((a, p) => a + p.currentValue, 0);

  const receivable = D.sales.filter((s) => saleMatch(s, f, propIds)).reduce((a, s) => a + s.outstanding, 0);
  const payableProps = props.reduce((a, p) => a + p.remaining, 0);
  const payableComm = D.commissions.filter((c) => propIds.has(c.propertyId) && (f.agent === 'all' || c.agentId === f.agent)).reduce((a, c) => a + c.outstanding, 0);
  const payableSal = D.salaries.filter((s) => s.status !== 'Paid' && overheadMatch(s, f)).reduce((a, s) => a + s.net, 0);
  const payableBills = D.bills.filter((b) => overheadMatch(b, f)).reduce((a, b) => a + b.outstanding, 0);
  const payableTax = D.taxes.filter((t) => overheadMatch(t, f)).reduce((a, t) => a + t.outstanding, 0);
  const payableVendors = D.expenses.filter((e) => overheadMatch(e, f)).reduce((a, e) => a + e.outstanding, 0);
  const payable = payableProps + payableComm + payableSal + payableBills + payableTax + payableVendors;

  return {
    range: r, filters: f,
    counts: {
      total: props.length, sold: props.filter((p) => p.status === 'Sold').length,
      available: props.filter((p) => p.status === 'Available').length,
      reserved: props.filter((p) => p.status === 'Reserved').length,
      underProcess: props.filter((p) => p.status === 'Under Process').length,
      unsold: unsold.length, purchasedInRange: purchased.length, soldInRange: soldInRange.length,
    },
    purchaseCost, purchasePrice, acquisitionCosts, salesRevenue, otherIncome, incomeDue, totalRevenue, cashReceived, grossProfit,
    costOfSales, directCosts, saleTaxes, sellingCosts, deal, charity, overheadTax,
    // Two bases for gross profit. grossProfitDoc follows the requirement document literally
    // (period sales − period purchase spend); grossProfitCOGS matches the cost of the properties
    // actually sold, which is the accounting-correct figure. See AUDIT.md finding A3.
    grossProfitDoc: totalRevenue - (purchasePrice + costOfSales - deal.buyPrice) - directCosts,
    grossProfitCOGS: grossProfit,
    costBasis: costOfSales,
    operatingCosts, operatingProfit: grossProfit - operatingCosts,
    profitBeforeZakat: grossProfit - operatingCosts - tax,
    commission, commissionPaid, commissionOut,
    officeExp, marketing, propertyExp, employeeExp, other, customGroups, customExp, salaries, salariesPaid,
    personal, assetsBought, retainedAfterPersonal: netProfit - personal,
    bills, billsPaid, billsOut, billsOverdueCount: billsOverdue.length,
    tax, taxBooked, taxPaid, taxOut, taxDueSoon, zakat, zakatPaid,
    zakatCalculated: DATA.zakatSummary.calculated, zakatRemaining: DATA.zakatSummary.remaining,
    totalExpenses, netProfit, cashIn, cashOut, netCash: cashIn - cashOut,
    portfolioCost, portfolioValue, potentialProfit: portfolioValue - portfolioCost,
    receivable, payable,
    payableBreakdown: [
      ['Property Sellers', payableProps], ['Agent Commission', payableComm], ['Salaries', payableSal],
      ['Bills', payableBills], ['Tax Authority', payableTax], ['Other Vendors', payableVendors],
    ],
    grossMargin: pctOf(grossProfit, totalRevenue), netMargin: pctOf(netProfit, totalRevenue),
    scoped,
  };
}

/* One profit ladder for every screen. "cogs" matches revenue with the cost of the properties
   actually sold; "doc" follows the requirement document (revenue − purchases made in the period).
   A narrowed scope (one agent, project, type or property) is always on the cost-of-units-sold
   basis and carries only its own direct costs, never company overheads. */
export function basisView(k, basis) {
  const doc = !k.scoped && basis === 'doc';
  // Document wording: the price of the plots bought in the period stands in for the price of the
  // plots sold; their other costs stay as on their cost sheets.
  const cost = doc ? k.purchasePrice + k.costOfSales - k.deal.buyPrice : k.costOfSales;
  const gross = k.totalRevenue - cost - k.directCosts;
  const op = gross - k.operatingCosts;
  const net = op - k.tax - k.zakat - k.charity;
  return {
    cost, gross, op, net, doc,
    grossMargin: pctOf(gross, k.totalRevenue), netMargin: pctOf(net, k.totalRevenue),
    costLabel: doc ? 'period purchase spend' : 'cost of the units sold',
  };
}

/* ============================ period series ============================ */
export function weeklySeries(n, f) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const s = addDays(startOfWeek(TODAY), -7 * i);
    const r = { start: startOfDay(s), end: endOfDay(addDays(s, 6)), label: 'Week of ' + fmtDate(s), key: 'custom' };
    const k = computeKPIs(r, f);
    out.push({ label: 'W' + (n - i) + ' · ' + fmtDate(s).slice(0, 6), full: r.label, k });
  }
  return out;
}
/* Pakistan's financial year runs July to June: FY 2025-26 starts on 1 July 2025. */
export const fyStartYear = (d) => (d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1);
export const fyLabel = (y) => 'FY ' + y + '–' + String(y + 1).slice(2);
export const fyRange = (y) => ({ start: new Date(y, 6, 1), end: endOfDay(new Date(y + 1, 5, 30)), label: fyLabel(y), key: 'custom' });

/** Every financial year that has records in it, newest first, always including the current one. */
export function fiscalYears() {
  const dates = [...DATA.sales.map((s) => s.date), ...DATA.properties.map((p) => p.purchaseDate), ...DATA.payments.map((p) => p.date)]
    .filter((d) => d instanceof Date && d <= TODAY);
  const now = fyStartYear(TODAY);
  const first = dates.length ? Math.min(now, ...dates.map(fyStartYear)) : now;
  const out = [];
  for (let y = now; y >= first; y--) out.push(y);
  return out;
}

/** The months of one financial year, July to June, up to the current month. */
export function fyMonthlySeries(y, f) {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const m = (6 + i) % 12, yr = i < 6 ? y : y + 1;
    const start = new Date(yr, m, 1);
    if (start > TODAY) break;
    const r = { start, end: endOfDay(new Date(yr, m + 1, 0)), label: MONTHS[m] + ' ' + yr, key: 'custom' };
    out.push({ label: MONTHS[m], full: r.label, k: computeKPIs(r, f) });
  }
  return out;
}

export function monthlySeries(year, f) {
  const out = [];
  const last = year === TODAY.getFullYear() ? TODAY.getMonth() : 11;
  for (let m = 0; m <= last; m++) {
    const r = { start: new Date(year, m, 1), end: endOfDay(new Date(year, m + 1, 0)), label: MONTHS[m] + ' ' + year, key: 'custom' };
    out.push({ label: MONTHS[m], full: r.label, month: m, k: computeKPIs(r, f) });
  }
  return out;
}

/** The monthly target as the owner sets it: a share of the capital each month for inflation,
    growth, profit and Zakat (the "Monthly comparison report" workbook). */
export const DEFAULT_MONTHLY_TARGET = { capital: 0, inflation: 0.83, growth: 0.3, profit: 0.5, zakat: 0.2083 };
export const monthlyTargetPct = (t) => (+t.inflation || 0) + (+t.growth || 0) + (+t.profit || 0) + (+t.zakat || 0);

/** What the business holds at the end of a day: unsold plots at landed cost, assets at cost,
    bank and cash, and what buyers still owe. */
export function holdingsAt(asOf, f) {
  const sold = (p) => DATA.sales.some((s) => s.propertyId === p.id && s.date <= asOf);
  // A plot at what it had cost by that day: its landed cost less what was recorded for it later.
  const costBy = (p) => {
    const rec = sheetFromRecords(p.id);
    if (!rec) return 0;
    const later = rec.sources.filter((x) => x.date && x.date > asOf && SALE_SIDE_LINES.indexOf(x.key) < 0).reduce((a, x) => a + x.amount, 0);
    return rec.purchasePrice - later;
  };
  const property = DATA.properties
    .filter((p) => (!f || propMatch(p, f)) && p.purchaseDate <= asOf && !sold(p))
    .reduce((a, p) => a + costBy(p), 0);
  const byType = {};
  DATA.expenses.filter((e) => e.group === 'Assets' && e.date <= asOf && (!f || overheadMatch(e, f))).forEach((e) => {
    const t = investmentType(e);
    byType[t] = (byType[t] || 0) + e.amount;
  });
  const cash = accountBalances(asOf, f).reduce((a, b) => a + b.balance, 0);
  const owed = (total, key) => Math.max(0, total - livePayments().filter((p) => p.settleKey === key && p.date <= asOf).reduce((x, p) => x + p.amount, 0));
  // What buyers still owe, and income earned but not yet received.
  const receivable = DATA.sales.filter((s) => s.date <= asOf).reduce((a, s) => a + owed(s.sellingPrice, 'sale:' + s.id), 0)
    + (DATA.income || []).filter((x) => x.date <= asOf && (!f || overheadMatch(x, f))).reduce((a, x) => a + owed(x.amount, 'inc:' + x.id), 0);
  const assets = Object.keys(byType).reduce((a, k) => a + byType[k], 0);
  return { property, byType, assets, cash, receivable, total: property + assets + cash + receivable };
}

/** Month by month for one calendar year, up to the current month: profit as the P&L counts it,
    against the monthly target, and what the business holds at each month end. */
export function monthlyComparison(year, f, target = DEFAULT_MONTHLY_TARGET) {
  const targetPct = monthlyTargetPct(target);
  const targetProfit = Math.round(((+target.capital || 0) * targetPct) / 100);
  const last = year === TODAY.getFullYear() ? TODAY.getMonth() : year < TODAY.getFullYear() ? 11 : -1;
  const before = holdingsAt(endOfDay(new Date(year, 0, 0)), f);
  const months = [];
  let prev = before;
  for (let m = 0; m <= last; m++) {
    const r = { start: new Date(year, m, 1), end: endOfDay(new Date(year, m + 1, 0)), label: MONTHS[m] + ' ' + year, key: 'custom' };
    const k = computeKPIs(r, f);
    const bv = basisView(k, 'cogs');
    const asOf = r.end > TODAY ? endOfDay(TODAY) : r.end;
    const h = holdingsAt(asOf, f);
    months.push({
      month: m, label: MONTHS[m], full: r.label,
      revenue: k.totalRevenue, sold: k.counts.soldInRange, landed: bv.cost, selling: k.directCosts, gross: bv.gross,
      expenses: k.operatingCosts, deductions: k.tax + k.zakat + k.charity, net: bv.net, margin: pctOf(bv.net, k.totalRevenue),
      otherIncome: k.otherIncome, personal: k.personal, afterPersonal: bv.net - k.personal,
      target: targetProfit, vsTarget: bv.net - targetProfit,
      holdings: h, growth: h.total - prev.total, growthPct: pctOf(h.total - prev.total, prev.total),
    });
    prev = h;
  }
  const types = INVESTMENT_TYPES.filter((t) => months.some((x) => x.holdings.byType[t]));
  return { year, months, types, targetPct, targetProfit, opening: before };
}

export function expenseBreakdown(k) {
  return [
    ['Transfer costs, stamp duty & CVT', k.deal.transfer, 200], ['§236K tax on purchase', k.deal.buyTax, 20],
    ['Handling expenses on plots', k.deal.handling, 230], ['Agent Commission', k.commission, 300],
    ['§236C tax on sale', k.saleTaxes, 10], ['Other selling costs', k.sellingCosts, 280],
    ['Employee Salaries', k.salaries, 160], ['Office Expenses', k.officeExp, 250],
    ['Marketing', k.marketing, 45], ['Bills', k.bills, 100], ['Property Expenses', k.propertyExp, 190],
    ['Other', k.other + k.employeeExp, 340], ['CGT & other tax', k.tax, 30], ['Zakat', k.zakat, 130],
    ['Charity', k.charity, 150],
    ...(k.customGroups || []).map((x) => [x[0], x[1], 260]),
  ].filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
}

/* An agent's name as typed on a commission ("Husnain", "husnain ali ") matched to the directory:
   the same name, or a name that is the start of only one agent's full name. */
const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9؀-ۿ ]/g, ' ').replace(/\s+/g, ' ').trim();
export function agentForName(name) {
  const n = normName(name);
  if (!n) return null;
  const same = DATA.agents.filter((a) => normName(a.name) === n);
  if (same.length === 1) return same[0];
  if (same.length > 1) return null;
  const close = DATA.agents.filter((a) => {
    const an = normName(a.name);
    return an.startsWith(n + ' ') || n.startsWith(an + ' ');
  });
  return close.length === 1 ? close[0] : null;
}
/** The directory agent a commission belongs to: the one picked on it, else the one its name matches. */
export const commissionAgentId = (c) => c.agentId || (agentForName(c.agent) || {}).id || null;

/** Commissions that look entered twice: the same plot, side, amount and date, for the same agent. */
export function duplicateCommissions() {
  const by = {};
  DATA.commissions.forEach((c) => {
    const who = commissionAgentId(c) || normName(c.agent);
    const k = [c.propertyId, c.txnType, Math.round(c.amount || 0), c.date instanceof Date ? dstr(c.date) : '', who].join('|');
    (by[k] = by[k] || []).push(c);
  });
  return Object.keys(by).map((k) => by[k]).filter((g) => g.length > 1);
}

export function agentSummary(r, f) {
  return DATA.agents.map((a) => {
    const comms = DATA.commissions.filter((c) => commissionAgentId(c) === a.id && inR(c.date, r));
    const sales = DATA.sales.filter((s) => s.agentId === a.id && inR(s.date, r));
    return {
      ...a, transactions: sales.length,
      salesValue: sales.reduce((x, s) => x + s.sellingPrice, 0),
      profit: sales.reduce((x, s) => x + s.grossProfit, 0),
      commission: comms.reduce((x, c) => x + c.amount, 0),
      paid: comms.reduce((x, c) => x + c.paid, 0),
      outstanding: comms.reduce((x, c) => x + c.outstanding, 0),
    };
  }).sort((x, y) => y.salesValue - x.salesValue);
}

export function receivables(f) {
  return DATA.sales.filter((s) => s.outstanding > 0 && (f.agent === 'all' || s.agentId === f.agent) && (f.office === 'all' || s.office === f.office))
    .map((s) => ({ ...s, daysOverdue: Math.max(0, Math.round((TODAY - s.dueDate) / day)) }))
    .sort((a, b) => b.outstanding - a.outstanding);
}

export function alerts() {
  const A = [];
  const push = (sev, title, detail, view, ctx) => A.push({ id: 'AL-' + (A.length + 1), sev, title, detail, view, ctx });
  receivables(EMPTY_FILTERS).filter((s) => s.daysOverdue > 0).slice(0, 4)
    .forEach((s) => push('high', 'Overdue customer balance', s.buyer + ' — ' + fmt(s.outstanding) + ' outstanding, ' + s.daysOverdue + ' days past due on ' + s.property, 'receivables'));
  DATA.commissions.filter((c) => c.status === 'Overdue').slice(0, 3)
    .forEach((c) => push('med', 'Overdue agent commission', c.agent + ' — ' + fmt(c.outstanding) + ' unpaid since ' + fmtDate(c.date), 'commissions'));
  DATA.taxes.filter((t) => t.status === 'Overdue').slice(0, 2)
    .forEach((t) => push('high', 'Overdue tax payment', t.type + ' — ' + fmt(t.outstanding) + ', due ' + fmtDate(t.dueDate), 'tax'));
  DATA.bills.filter((b) => b.status === 'Overdue').slice(0, 4)
    .forEach((b) => push('med', 'Overdue bill', b.type + ' (' + b.vendor + ') — ' + fmt(b.outstanding) + ', due ' + fmtDate(b.dueDate), 'bills'));
  const pendSal = DATA.salaries.filter((s) => s.status === 'Pending');
  if (pendSal.length) push('med', 'Salary payment due', pendSal.length + ' employees pending for ' + pendSal[0].monthLabel + ' — ' + fmt(pendSal.reduce((a, s) => a + s.net, 0)), 'salaries');
  DATA.properties.filter((p) => p.remaining > 0 && p.status !== 'Sold').slice(0, 3)
    .forEach((p) => push('low', 'Property payment due', p.name + ' — ' + fmt(p.remaining) + ' still payable to ' + p.seller, 'purchases'));
  // Stock is judged on what it cost all in, as its cost sheet adds it up.
  const held = DATA.properties.filter((p) => p.status !== 'Sold').map((p) => ({ p, cost: landedCost(p.id) }));
  held.filter((x) => x.p.heldDays > 300).slice(0, 3)
    .forEach(({ p, cost }) => push('med', 'Property held too long', p.name + ' — held ' + p.heldDays + ' days, cost ' + fmt(cost), 'inventory'));
  held.filter((x) => x.p.currentValue < x.cost * 1.1).slice(0, 3)
    .forEach(({ p, cost }) => push('low', 'Low potential profit', p.name + ' — upside only ' + fmt(p.currentValue - cost) + ' (' + pctOf(p.currentValue - cost, cost).toFixed(1) + '%)', 'inventory'));
  held.filter((x) => x.p.currentValue > x.cost * 1.3).slice(0, 2)
    .forEach(({ p, cost }) => push('good', 'High potential profit', p.name + ' — upside ' + fmt(p.currentValue - cost) + ', consider listing', 'inventory'));
  // Task deadlines: overdue work first, then anything due in the next two days.
  const pending = DATA.tasks.filter((t) => ['Completed', 'Cancelled'].indexOf(taskStatus(t)) < 0 && t.date instanceof Date)
    .sort((a, b) => a.date - b.date);
  const who = (t) => (t.assignee ? ' · ' + t.assignee : '');
  pending.filter((t) => taskStatus(t) === 'Overdue').slice(0, 3)
    .forEach((t) => push('high', 'Task overdue', t.text + ' — was due ' + fmtDate(t.date) + ' (' + dueIn(t.date) + ')' + who(t), 'tasks'));
  pending.filter((t) => t.date >= TODAY && t.date <= addDays(TODAY, 2)).slice(0, 3)
    .forEach((t) => push('med', 'Task deadline', t.text + ' — ' + dueIn(t.date) + who(t), 'tasks'));
  return A;
}

/* ============================ permissions (§30) ============================ */
export const ROLES = {
  CEO: { label: 'CEO', deny: [] },
  Accountant: { label: 'Accountant', deny: ['salaries'] },
  Manager: { label: 'Manager', deny: ['salaries', 'tax', 'zakat', 'pnl', 'cashflow', 'payables', 'audit'] },
  Agent: { label: 'Agent', deny: ['salaries', 'tax', 'zakat', 'pnl', 'cashflow', 'payables', 'audit', 'expenses', 'bills', 'purchases', 'profit', 'agents', 'receivables', 'transactions'] },
};
export const AGENT_SELF = DATA.agents[0] || { id: 'AG-001', name: 'Agent', office: OFFICES[0], rate: 2.0 };

export function csv(columns, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [columns.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
}

/* ====================================================================
   ENHANCED FLOWS - not in the requirements document, but a CEO report
   is not usable without them. Each is justified in AUDIT.md.
   ==================================================================== */

/* E1 - Period-over-period comparison. The document defines every KPI as a bare
   number. A bare number cannot be judged: "PKR 2 Cr profit" is only good or bad
   next to what the previous comparable period did. */
export function prevRange(r) {
  const span = Math.max(1, Math.floor((r.end - r.start) / day) + 1);
  const end = endOfDay(addDays(startOfDay(r.start), -1));
  const start = startOfDay(addDays(end, -(span - 1)));
  return { start, end, label: 'Previous ' + span + ' days', key: 'custom' };
}
export function deltaPct(cur, prev) {
  if (!isFinite(cur) || !isFinite(prev)) return null;
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
export function compare(r, f) {
  const cur = computeKPIs(r, f);
  const prev = computeKPIs(prevRange(r), f);
  return { cur, prev, d: (key) => deltaPct(cur[key], prev[key]) };
}

/* E2 - Receivables ageing buckets. The document asks only for "days overdue" per
   row, which cannot be summed. Buckets are what a CEO acts on. */
export const AGING_BUCKETS = ['Not yet due', '1-30 days', '31-60 days', '61-90 days', 'Over 90 days'];
export function aging(f) {
  const rows = receivables(f);
  const out = AGING_BUCKETS.map((label) => ({ label, amount: 0, count: 0, rows: [] }));
  rows.forEach((s) => {
    const d = s.daysOverdue;
    const i = d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4;
    out[i].amount += s.outstanding; out[i].count++; out[i].rows.push(s);
  });
  return out;
}

/* E3 - Cash balance. The document's cash-flow section reports inflow and outflow
   but never a balance, so the CEO cannot answer "how much money do we actually
   have?". OPENING_BALANCE is the cash position before the dataset starts. */
// Cash balance: starts at 0 for a clean database
export const OPENING_BALANCE = 0;
export const isOpeningEntry = (p) => p.category === 'Opening Balance';
export function cashLedger(r, f) {
  const signed = (p) => (p.dir === 'in' ? p.amount : -p.amount);
  const before = livePayments().filter((p) => p.date < r.start && overheadMatch(p, f));
  // What the accounts held to begin with is the opening balance whatever date it was entered on,
  // and money moved between the company's own accounts is neither in nor out.
  const inPeriod = livePayments().filter((p) => inR(p.date, r) && overheadMatch(p, f));
  const opening = before.reduce((a, p) => a + signed(p), OPENING_BALANCE) + inPeriod.filter(isOpeningEntry).reduce((a, p) => a + signed(p), 0);
  const within = inPeriod.filter((p) => !isOpeningEntry(p) && !isTransfer(p));
  const cashIn = within.filter((p) => p.dir === 'in').reduce((a, p) => a + p.amount, 0);
  const cashOut = within.filter((p) => p.dir === 'out').reduce((a, p) => a + p.amount, 0);
  const byCategory = {};
  within.forEach((p) => {
    const k = p.dir + '|' + p.category;
    byCategory[k] = (byCategory[k] || 0) + p.amount;
  });
  const pickSide = (ch, cut) => Object.keys(byCategory).filter((k) => k[0] === ch)
    .map((k) => [k.slice(cut), byCategory[k]]).sort((a, b) => b[1] - a[1]);
  return {
    opening, cashIn, cashOut, net: cashIn - cashOut, closing: opening + cashIn - cashOut,
    inflows: pickSide('i', 3), outflows: pickSide('o', 4), count: within.length,
  };
}

/** The bank and cash accounts in use, most used first, then the standard ones. */
export function accountNames() {
  const used = {};
  // Voided entries do not count, so an account emptied by voiding drops off the list.
  livePayments().forEach((p) => { if (p.account) used[p.account] = (used[p.account] || 0) + 1; });
  const names = Object.keys(used).sort((a, b) => used[b] - used[a]);
  return names.concat(ACCOUNTS.filter((a) => names.indexOf(a) < 0));
}

/** What each account holds on a date: what it held to begin with, plus everything received into it
    less everything paid from it. Transfers between accounts are shown apart. */
export function accountBalances(asOf, f) {
  const by = {};
  livePayments().filter((p) => p.date <= asOf && (!f || overheadMatch(p, f))).forEach((p) => {
    const a = p.account || NO_ACCOUNT;
    const x = by[a] || (by[a] = { id: a, account: a, kind: accountKind(a), opening: 0, cashIn: 0, cashOut: 0, transferIn: 0, transferOut: 0, count: 0, last: null });
    const amt = p.dir === 'in' ? p.amount : -p.amount;
    if (isOpeningEntry(p)) x.opening += amt;
    else if (isTransfer(p)) { if (p.dir === 'in') x.transferIn += p.amount; else x.transferOut += p.amount; }
    else if (p.dir === 'in') x.cashIn += p.amount; else x.cashOut += p.amount;
    x.count++;
    if (!x.last || p.date > x.last) x.last = p.date;
  });
  return Object.keys(by)
    .map((k) => ({ ...by[k], balance: by[k].opening + by[k].cashIn - by[k].cashOut + by[k].transferIn - by[k].transferOut }))
    .sort((a, b) => (a.kind === b.kind ? b.balance - a.balance : a.kind === 'Cash' ? -1 : 1));
}

/** Cash in hand and cash in bank on a date, each added up from its own accounts. */
export function cashAndBank(asOf, f) {
  const accounts = accountBalances(asOf, f);
  const sum = (kind) => accounts.filter((a) => a.kind === kind).reduce((x, a) => x + a.balance, 0);
  const cash = sum('Cash'), bank = sum('Bank');
  return { accounts, cash, bank, total: cash + bank };
}

/** One account's entries in a period, oldest first, each with the balance after it. */
export function accountStatement(account, r, f) {
  const mine = livePayments().filter((p) => (p.account || NO_ACCOUNT) === account && (!f || overheadMatch(p, f)));
  const signed = (p) => (p.dir === 'in' ? p.amount : -p.amount);
  const opening = mine.filter((p) => p.date < r.start).reduce((a, p) => a + signed(p), 0);
  let run = opening;
  const rows = mine.filter((p) => inR(p.date, r)).slice().sort((a, b) => a.date - b.date || String(a.id).localeCompare(String(b.id))).map((p) => {
    run += signed(p);
    return { ...p, inAmt: p.dir === 'in' ? p.amount : 0, outAmt: p.dir === 'out' ? p.amount : 0, balance: run };
  });
  return { opening, rows, closing: run };
}

/** Money moved between two of the company's own accounts: paid out of one and into the other,
    the two entries tied by the same transfer number. */
export function addTransfer(v) {
  const from = String(v.from || '').trim(), to = String(v.to || '').trim();
  const amount = Math.round(+v.amount || 0);
  if (!from || !to) throw new Error('Pick the account the money leaves and the one it goes into.');
  if (from === to) throw new Error('The two accounts must be different.');
  if (amount <= 0) throw new Error('Enter the amount moved.');
  const base = { date: v.date, category: TRANSFER_CATEGORY, amount, method: v.method || 'Bank Transfer', office: v.office, ref: v.ref, attachments: v.attachments || [] };
  const note = v.note || from + ' → ' + to;
  const out = addPayment({ ...base, dir: 'out', account: from, party: to, note });
  const inn = addPayment({ ...base, dir: 'in', account: to, party: from, note, attachments: [] });
  out.transferId = inn.transferId = out.id;
  saveRecordToFirestore('payments', out.id, out);
  saveRecordToFirestore('payments', inn.id, inn);
  return out;
}

/* ====================================================================
   INVESTMENTS — everything the business has money in and still holds:
   unsold plots (at landed cost) and assets such as gold, shares and
   deposits (at cost), each against what it is worth today.
   ==================================================================== */
/** Kinds of investment, in the order their colours are given. */
export const INVESTMENT_TYPES = ['Real Estate', 'Savings', 'Stocks & Shares', 'Gold', 'Mutual Funds', 'Other'];

/** The kind of investment an asset is, read from its type and description. */
export function investmentType(a) {
  const t = ((a.category || '') + ' ' + (a.note || '')).toLowerCase();
  if (/gold|silver|jewel/.test(t)) return 'Gold';
  if (/psx|share|stock|equit/.test(t)) return 'Stocks & Shares';
  if (/mutual|\bfunds?\b|\bamf\b|\bnit\b/.test(t)) return 'Mutual Funds';
  if (/saving|deposit|\btdr\b|certificate|\bbonds?\b|sukuk|\bbank\b/.test(t)) return 'Savings';
  if (/land|building|plot|house|flat|apartment|shop/.test(t)) return 'Real Estate';
  return 'Other';
}

/** What an asset is worth today: the value last entered for it, else what it cost. */
export const assetWorth = (a) => (a.currentValue == null || a.currentValue === '' ? a.amount : +a.currentValue);

/** Every holding with what went in, what it is worth today and the gain or loss on it. */
export function investments(f) {
  const out = [];
  DATA.properties.filter((p) => p.status !== 'Sold' && (!f || propMatch(p, f))).forEach((p) => {
    const invested = landedCost(p.id);
    out.push({ id: p.id, coll: 'properties', name: p.name, type: 'Real Estate', detail: p.project, started: p.purchaseDate, invested, worth: p.currentValue || invested });
  });
  DATA.expenses.filter((e) => e.group === 'Assets' && (!f || overheadMatch(e, f))).forEach((e) => {
    out.push({
      id: e.id, coll: 'expenses', name: e.note && e.note !== e.category ? e.note : e.category, type: investmentType(e), detail: e.category,
      started: e.date, invested: e.amount, worth: assetWorth(e), valuedOn: e.valueDate || null,
    });
  });
  return out.map((x) => ({ ...x, gain: x.worth - x.invested, gainPct: pctOf(x.worth - x.invested, x.invested) }));
}

/** The holdings added up by kind of investment, in the fixed order of the kinds. */
export function investmentsByType(rows) {
  return INVESTMENT_TYPES.map((type) => {
    const of = rows.filter((x) => x.type === type);
    const invested = of.reduce((a, x) => a + x.invested, 0), worth = of.reduce((a, x) => a + x.worth, 0);
    return { id: type, type, count: of.length, invested, worth, gain: worth - invested, gainPct: pctOf(worth - invested, invested) };
  }).filter((x) => x.count > 0);
}

/* E4 - Overhead run rate and months of cover. Answers "if we sold nothing else
   this year, how long can the company pay its bills?" - the question every
   owner-managed business actually asks. */
export function runRate(f) {
  const months = TODAY.getMonth() + 1;
  const ytd = computeKPIs(rangeFor('thisYear'), f);
  const monthlyOverhead = ytd.operatingCosts / months;
  const closing = cashLedger(rangeFor('thisYear'), f).closing;
  return {
    months, monthlyOverhead,
    monthlyGross: ytd.grossProfit / months,
    cover: monthlyOverhead > 0 ? closing / monthlyOverhead : null,
    closing,
    breakEvenSales: ytd.salesRevenue > 0 && ytd.grossProfit > 0
      ? monthlyOverhead / (ytd.grossProfit / ytd.salesRevenue) : null,
  };
}

/* E5 - Realised vs unrealised profit. The document puts "potential profit" on the
   same dashboard as net profit without marking it as unrealised. Presenting an
   estimate beside banked cash is how a dashboard misleads its owner. */
export function profitSplit(k) {
  return {
    realised: k.netProfit,
    unrealised: k.potentialProfit,
    note: 'Potential profit is an estimate on unsold stock. It is not income and is not part of net profit.',
  };
}

/* E6 - Per-property profitability (section 25 asks for the screen, never the maths). */
/* Each property sold in the period, with the figures of its deal cost sheet: the very sheet the
   cost sheet register lists and opens, so the three never disagree. */
export function propertyPerf(r, f) {
  const sold = DATA.sales.filter((s) => inR(s.date, r));
  const byId = {};
  DATA.properties.forEach((p) => { if (propMatch(p, f)) byId[p.id] = p; });
  return sold.filter((s) => byId[s.propertyId] && (f.agent === 'all' || s.agentId === f.agent)).map((s) => {
    const p = byId[s.propertyId];
    const cs = realSheet(p.id);
    return {
      id: p.id, name: p.name, project: p.project, agent: s.agent, saleDate: s.date,
      sheet: cs.id || '', netBuyCost: cs.netBuyCost, purchasePrice: cs.purchasePrice,
      grossSalePrice: cs.grossSalePrice, sellingCosts: cs.saleSideCosts, grossProfit: cs.grossProfit,
      deductions: cs.grossProfit - cs.netMargin, netMargin: cs.netMargin, netMarginPct: cs.netMarginPct,
      heldDays: p.heldDays,
    };
  }).sort((a, b) => b.netMargin - a.netMargin);
}

/* Per-project roll-up: stock held and what has been sold in the period. Properties carry the
   project name, so societies typed on a cost sheet but missing from PROJECTS still show up. */
export function projectSummary(r, f) {
  const by = {};
  const row = (name, city) => by[name] || (by[name] = {
    id: name, project: name, city: city || '—', total: 0, held: 0, sold: 0,
    heldCost: 0, heldValue: 0, revenue: 0, netProfit: 0,
  });
  PROJECTS.forEach((p) => row(p.name, p.city));
  const props = DATA.properties.filter((p) => propMatch(p, f));
  const ids = new Set(props.map((p) => p.id));
  props.forEach((p) => {
    const x = row(p.project, p.location);
    x.total++;
    if (p.status !== 'Sold') { x.held++; x.heldCost += landedCost(p.id); x.heldValue += p.currentValue; }
  });
  DATA.sales.filter((s) => saleMatch(s, f, ids) && inR(s.date, r)).forEach((s) => {
    const p = props.find((q) => q.id === s.propertyId);
    const x = row(p.project, p.location);
    const cs = realSheet(p.id);
    x.sold++; x.revenue += s.sellingPrice; x.netProfit += cs ? cs.netMargin : s.netProfit;
  });
  return Object.keys(by).map((k) => ({ ...by[k], upside: by[k].heldValue - by[k].heldCost }))
    .sort((a, b) => b.total - a.total || b.revenue - a.revenue);
}

/* Charity given: the charity line of each deal cost sheet, plus expenses booked as charity. */
const CHARITY_RE = /charit|donat|sadaq|sadq|khairat/i;
export function charityRows(r) {
  const rows = [];
  // A sheet's charity line is listed only for the part not already booked as an expense of that
  // property — a charity expense linked to a deal is on its sheet too, and must not show twice.
  DATA.costSheets.filter((cs) => cs.charity > 0 && !cs.mirrorOf).forEach((cs) => {
    const booked = cs.propertyId
      ? DATA.expenses.filter((e) => e.propertyId === cs.propertyId && CHARITY_RE.test(e.category + ' ' + e.note)).reduce((a, e) => a + e.amount, 0)
      : 0;
    const amount = cs.charity - booked;
    const date = cs.saleDate instanceof Date ? cs.saleDate : cs.purchaseDate;
    if (amount > 0 && inR(date, r)) rows.push({ id: cs.id, source: 'Deal cost sheet', detail: cs.name || '—', party: cs.project || '—', date, amount });
  });
  DATA.expenses.filter((e) => CHARITY_RE.test(e.category + ' ' + e.note) && inR(e.date, r))
    .forEach((e) => rows.push({ id: e.id, source: 'Expense ledger', detail: e.note || e.category, party: e.vendor, date: e.date, amount: e.amount }));
  return rows.sort((a, b) => b.date - a.date);
}

/* E7 - Drill-down provenance. Section 35 requires every figure to be clickable; it
   never says the CEO should be told how many records are behind the figure. Showing
   the count is what makes a drill-down trustworthy rather than just a link. */
export function sourceCount(view, r, f) {
  const props = DATA.properties.filter((p) => propMatch(p, f));
  const ids = new Set(props.map((p) => p.id));
  const n = {
    purchases: () => props.filter((p) => inR(p.purchaseDate, r)).length,
    sales: () => DATA.sales.filter((s) => saleMatch(s, f, ids) && inR(s.date, r)).length,
    inventory: () => props.filter((p) => p.status !== 'Sold').length,
    performance: () => propertyPerf(r, f).length,
    commissions: () => DATA.commissions.filter((c) => ids.has(c.propertyId) && inR(c.date, r)).length,
    agents: () => DATA.agents.length,
    expenses: () => DATA.expenses.filter((e) => inR(e.date, r) && overheadMatch(e, f)).length,
    salaries: () => DATA.salaries.filter((s) => inR(s.date, r) && overheadMatch(s, f)).length,
    bills: () => DATA.bills.filter((b) => inR(b.dueDate, r) && overheadMatch(b, f)).length,
    tax: () => DATA.taxes.filter((t) => inR(t.date, r) && overheadMatch(t, f)).length,
    zakat: () => DATA.zakat.filter((z) => inR(z.date, r)).length,
    receivables: () => receivables(f).length,
    transactions: () => DATA.payments.filter((p) => inR(p.date, r) && overheadMatch(p, f)).length,
    agentList: () => DATA.agents.length,
    cashflow: () => cashLedger(r, f).count,
    audit: () => DATA.audit.length,
    sheets: () => dealSheets().length,
    calculator: () => dealSheets().length,
    analytics: () => dealSheets().length,
    mirrors: () => mirrorSheets().length,
    proformaInvoices: () => DATA.invoices.filter((i) => i.type === 'proforma' && !i.mirrorOf).length,
    assets: () => DATA.expenses.filter((e) => e.group === 'Assets').length,
    tasks: () => DATA.tasks.length,
    invoices: () => DATA.invoices.length,
    saleInvoices: () => DATA.invoices.filter((i) => i.type === 'sale' && !i.mirrorOf).length,
    purchaseInvoices: () => DATA.invoices.filter((i) => i.type === 'purchase' && !i.mirrorOf).length,
    mirrorSaleInvoices: () => DATA.invoices.filter((i) => i.mirrorOf && i.type === 'sale').length,
    mirrorPurchaseInvoices: () => DATA.invoices.filter((i) => i.mirrorOf && i.type === 'purchase').length,
  }[view];
  return n ? n() : 0;
}

/* ====================================================================
   MUTATIONS — manual data entry.
   A demo that cannot take input is a picture, not a prototype. These
   insert real records into the same arrays every report reads from, so
   anything entered immediately shows up in the KPIs, charts and ledgers.
   ==================================================================== */
// A number once used is never handed out again, not even after its record was deleted: the audit
// trail remembers every deleted one, so a new record can never pick up an old one's mirror or links.
const deletedIds = (prefix) =>
  prefix === 'AU-' ? [] : DATA.audit.filter((a) => a.action === 'Deleted' && String(a.txnId).startsWith(prefix)).map((a) => ({ id: a.txnId }));
const nextId = (arr, prefix, pad) =>
  prefix + String(arr.concat(deletedIds(prefix)).reduce((m, x) => Math.max(m, +String(x.id).replace(/\D/g, '') || 0), 0) + 1).padStart(pad, '0');

export const USERS = [
  { id: 'U-01', name: 'Admin', role: 'CEO', title: 'Administrator', initials: 'AD', office: OFFICES[0] },
];

function recomputeProperty(p) {
  p.totalCost = p.price + p.extras.registration + p.extras.legal + p.extras.development + p.extras.other;
  p.paid = Math.min(p.paid, p.totalCost);
  p.remaining = Math.max(0, p.totalCost - p.paid);
  p.payStatus = p.remaining === 0 ? 'Paid' : p.paid === 0 ? 'Unpaid' : 'Partially Paid';
  p.heldDays = Math.max(0, Math.round((TODAY - p.purchaseDate) / day));
  return p;
}

export function addProperty(v) {
  const project = PROJECTS.find((x) => x.id === v.projectId) || PROJECTS[0];
  const p = recomputeProperty({
    id: nextId(DATA.properties, 'P-', 4),
    name: v.name, type: v.type, projectId: project.id, project: project.name,
    location: project.city, block: v.block || '—', unit: v.unit || '—', size: v.size,
    seller: v.seller, purchaseDate: parseDate(v.purchaseDate), price: +v.price,
    extras: { registration: +v.registration || 0, legal: +v.legal || 0, development: +v.development || 0, other: +v.otherCost || 0 },
    paid: +v.paid || 0, status: v.status, office: v.office,
    currentValue: +v.currentValue || +v.price,
    method: v.method || 'Bank Transfer', ...splitOf(v, +v.paid || 0),
    manual: true, attachments: v.attachments || [],
  });
  DATA.properties.push(p);
  saveRecordToFirestore('properties', p.id, p);
  postSplit({
    date: v.purchaseDate, dir: 'out', category: 'Property Purchase', amount: p.paid,
    party: p.seller, propertyId: p.id, office: p.office, method: v.method || 'Bank Transfer', account: v.account,
    note: 'Purchase payment — ' + p.name, settleKey: 'prop:' + p.id,
  }, v);
  return p;
}

/** A payment made two ways (e.g. part cash, part bank transfer): the second mode's part is
    posted on its own, from its own account, and the rest by the first mode. One way when no
    second mode is given. */
function postSplit(base, v) {
  const second = v.method2 ? Math.min(Math.max(0, Math.round(+v.amount2 || 0)), base.amount) : 0;
  const first = base.amount - second;
  const made = [];
  if (first > 0) made.push(addPayment({ ...base, amount: first }));
  if (second > 0) {
    made.push(addPayment({ ...base, amount: second, method: v.method2, account: v.account2 || base.account }));
  }
  return made;
}
/** The payment modes of a purchase or sale paid two ways, as the register shows them. */
export function splitOf(v, total) {
  const second = v.method2 ? Math.min(Math.max(0, Math.round(+v.amount2 || 0)), total) : 0;
  return second > 0 ? { method2: v.method2, amount2: second, account2: v.account2 || '' } : {};
}

/** The §236C advance tax rate on a plot's sale: the rate on its cost sheet (3% for a filer,
    6% late filer, 10% non-filer), so the sale form and the cost sheet always agree. */
export function saleTaxPct(propertyId) {
  const cs = propertyId ? realSheet(propertyId) : null;
  return cs && cs.tax236CPct !== undefined && cs.tax236CPct !== '' && cs.tax236CPct != null ? +cs.tax236CPct : 3;
}
export const defaultSaleTax = (propertyId, price) => Math.round(((+price || 0) * saleTaxPct(propertyId)) / 100);

/** Withholding tax on a sale as profit counts it: none when the same tax has its own tax entry
    for the plot (the cost sheet then reads the entry instead), so it is never counted twice. */
export function saleTaxCounted(s) {
  const own = DATA.taxes.some((t) => t.propertyId === s.propertyId && (t.type === 'Advance Tax §236C' || t.type === 'Withholding Tax'));
  return own ? 0 : s.tax || 0;
}

export function addSale(v) {
  const p = DATA.properties.find((x) => x.id === v.propertyId);
  if (!p) throw new Error('Unknown property');
  // No agent selected = a direct sale: no commission is earned or owed.
  const agent = DATA.agents.find((a) => a.id === v.agentId) || null;
  const price = +v.sellingPrice, received = Math.min(+v.received || 0, price);
  const pctRate = !agent ? 0 : v.commissionPct === '' || v.commissionPct == null ? agent.rate : +v.commissionPct;
  const commission = Math.round((price * pctRate) / 100);
  const saleTax = v.tax === '' || v.tax == null ? defaultSaleTax(p.id, price) : Math.round(+v.tax);
  const other = +v.otherExpenses || 0;
  const dueDate = addDays(parseDate(v.date), 60);
  const s = {
    id: nextId(DATA.sales, 'S-', 4), propertyId: p.id, property: p.name,
    buyer: v.buyer, agentId: agent ? agent.id : null, agent: agent ? agent.name : 'Direct sale', date: parseDate(v.date),
    sellingPrice: price, received, outstanding: Math.max(0, price - received), dueDate,
    method: v.method, ...splitOf(v, received), commissionPct: pctRate, commission, tax: saleTax, otherExpenses: other,
    netRevenue: price - commission - saleTax - other,
    propertyCost: p.totalCost, grossProfit: price - p.totalCost,
    netProfit: price - p.totalCost - commission - saleTax - other,
    payStatus: received >= price ? 'Paid' : dueDate < TODAY ? 'Overdue' : received > 0 ? 'Partially Paid' : 'Unpaid',
    saleStatus: received >= price ? 'Completed' : 'In Payment',
    office: p.office, manual: true, attachments: v.attachments || [],
  };
  DATA.sales.push(s);
  p.status = 'Sold';
  saveRecordToFirestore('sales', s.id, s);
  saveRecordToFirestore('properties', p.id, p);

  if (agent && commission > 0) {
    const cm = {
      id: nextId(DATA.commissions, 'CM-', 4), agentId: agent.id, agent: agent.name,
      propertyId: p.id, property: p.name, counterparty: s.buyer, txnType: 'Sale', date: s.date,
      pct: pctRate, amount: commission, paid: 0, outstanding: commission, paidDate: '—',
      status: 'Unpaid', office: p.office, manual: true,
    };
    DATA.commissions.push(cm);
    saveRecordToFirestore('commissions', cm.id, cm);
  }
  postSplit({
    date: v.date, dir: 'in', category: 'Property Sale', amount: received,
    party: s.buyer, propertyId: p.id, agentId: agent ? agent.id : null, office: p.office,
    method: v.method, account: v.account, note: 'Sale receipt — ' + p.name, settleKey: 'sale:' + s.id,
  }, v);
  return s;
}

/** The property / deal a cost was spent on (optional), stored with its name for the registers. */
function dealLink(propertyId) {
  const p = propertyId ? DATA.properties.find((x) => x.id === propertyId) : null;
  return { propertyId: p ? p.id : null, property: p ? p.name : '' };
}

export function addExpense(v) {
  const amount = +v.amount, paid = Math.min(+v.paid || 0, amount);
  const e = {
    id: nextId(DATA.expenses, 'EX-', 4), group: v.group, category: v.category,
    ...dealLink(v.propertyId),
    date: parseDate(v.date), amount, paid, outstanding: Math.max(0, amount - paid),
    vendor: v.vendor, office: v.office, method: v.method,
    note: v.note || v.category, manual: true, attachments: v.attachments || [],
    status: paid >= amount ? 'Paid' : paid === 0 ? 'Unpaid' : 'Partially Paid',
    ...(v.sheetLine ? { sheetLine: v.sheetLine } : {}),
  };
  DATA.expenses.push(e);
  saveRecordToFirestore('expenses', e.id, e);
  if (paid > 0) addPayment({
    date: v.date, dir: 'out', category: v.group, amount: paid, party: v.vendor, propertyId: e.propertyId,
    office: v.office, method: v.method, account: v.account, note: e.note, settleKey: 'exp:' + e.id,
  });
  return e;
}

export function addPayment(v) {
  const t = {
    id: nextId(DATA.payments, 'TXN-', 5), date: parseDate(v.date), dir: v.dir,
    category: v.category, amount: Math.round(+v.amount), method: v.method || 'Bank Transfer',
    account: v.account || '', party: v.party || '—',
    propertyId: v.propertyId || null, agentId: v.agentId || null,
    ref: v.ref || 'REF-' + Math.floor(100000 + Math.random() * 899999),
    note: v.note || v.category, office: v.office || OFFICES[0],
    createdBy: v.createdBy || ACTOR, approvedBy: v.approvedBy || ACTOR,
    settleKey: v.settleKey || null,
    status: 'Posted', manual: true, attachments: v.attachments || [],
  };
  DATA.payments.push(t);
  DATA.payments.sort((a, b) => b.date - a.date);
  saveRecordToFirestore('payments', t.id, t);
  const au = {
    id: nextId(DATA.audit, 'AU-', 4), date: t.date, txnId: t.id, action: 'Created',
    user: v.createdBy || ACTOR, entity: t.category, prevAmount: null,
    newAmount: t.amount, note: t.note || 'Created through manual entry form', manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);
  return t;
}

/** §31 — records are never deleted. A void keeps the original and reverses it. */
export function voidPayment(id, user) {
  const t = DATA.payments.find((p) => p.id === id);
  if (!t || t.status === 'Voided') return null;
  t.status = 'Voided';
  saveRecordToFirestore('payments', t.id, t);
  // Put the balance back on whatever this payment had settled.
  if (t.settleKey) applySettlement(t.settleKey, -t.amount, t.date);
  // A transfer is two entries: voiding either takes back both.
  if (t.transferId) DATA.payments.filter((p) => p.transferId === t.transferId && p.status !== 'Voided').forEach((p) => voidPayment(p.id, user));
  const au = {
    id: nextId(DATA.audit, 'AU-', 4), date: TODAY, txnId: t.id, action: 'Voided',
    user: user || ACTOR, entity: t.category, prevAmount: t.amount, newAmount: 0,
    note: 'Voided — original record retained', manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);
  return t;
}

/** Moves a payment to another bank or cash account: the amount and everything it settled stay. */
export function changePaymentAccount(id, account, user) {
  const t = DATA.payments.find((p) => p.id === id);
  const to = String(account || '').trim();
  if (!t) throw new Error(id + ' was not found.');
  if (!to) throw new Error('Pick the account to move it to.');
  if (t.status === 'Voided') throw new Error(id + ' is voided — it no longer moves money.');
  const from = t.account || NO_ACCOUNT;
  if (from === to) return null;
  t.account = to;
  saveRecordToFirestore('payments', t.id, t);
  const au = {
    id: nextId(DATA.audit, 'AU-', 4), date: TODAY, txnId: t.id, action: 'Edited',
    user: user || ACTOR, entity: t.category, prevAmount: t.amount, newAmount: t.amount,
    note: 'Account changed from ' + from + ' to ' + to, manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);
  return t;
}

/* ====================================================================
   INVOICES — Sale Invoice (given to buyer) & Purchase Invoice (kept by company)
   ==================================================================== */

/** The fields of an invoice that come straight from its form (shared by create and edit). */
function invoiceBody(v) {
  const total = Math.round(+v.totalAmount || 0);
  const token = Math.round(+v.tokenAmount || 0);
  return {
    receiptDate: parseDate(v.receiptDate || TODAY),
    propertyId: v.propertyId || null,
    estampNo: v.estampNo || '',

    buyerName: v.buyerName || '',
    buyerCompany: v.buyerCompany || '',
    buyerCnic: v.buyerCnic || '',
    sellerName: v.sellerName || '',
    sellerCompany: v.sellerCompany || '',
    sellerCnic: v.sellerCnic || '',

    paymentDate: v.paymentDate ? parseDate(v.paymentDate) : null,
    paymentMode: v.paymentMode || '',
    paymentRef: v.paymentRef || '',
    // A payment split over two modes: the second mode's part; the rest of the token is by the first.
    paymentMode2: v.paymentMode2 || '',
    paymentAmount2: v.paymentMode2 ? Math.min(token, Math.round(+v.paymentAmount2 || 0)) : 0,
    paymentRef2: v.paymentMode2 ? v.paymentRef2 || '' : '',
    paymentTerms: v.paymentTerms || '',
    bankDetailsBuyer: v.bankDetailsBuyer || '',
    bankDetailsSeller: v.bankDetailsSeller || '',

    totalAmount: total,
    // The balance is always whatever the token did not cover.
    balanceAmount: Math.max(0, total - token),
    tokenAmount: token,
    tokenDate: v.tokenDate ? parseDate(v.tokenDate) : null,
    transferDate: v.transferDate ? parseDate(v.transferDate) : null,

    receivedByName: v.receivedByName || '',
    receivedByCnic: v.receivedByCnic || '',
    receivedFromName: v.receivedFromName || '',
    receivedFromCnic: v.receivedFromCnic || '',
    approvedByName: v.approvedByName || '',

    notes: v.notes || '',
    attachments: v.attachments || [],
  };
}

export const INVOICE_LABEL = { sale: 'Sale Invoice', purchase: 'Purchase Invoice', proforma: 'Proforma Invoice' };

export function addInvoice(v) {
  const prop = v.propertyId ? DATA.properties.find((p) => p.id === v.propertyId) : null;
  // Mirrors are named after their original (M-INV-…), so only real invoices count towards the
  // next number. (An older mirror carries an INV- number, so the series still counts past it.)
  const inv = {
    id: nextId(DATA.invoices.filter((i) => String(i.id).startsWith('INV-')), 'INV-', 5),
    srNo: DATA.invoices.filter((i) => !i.mirrorOf && i.type === v.type).reduce((m, i) => Math.max(m, +i.srNo || 0), 0) + 1,
    type: v.type, // 'sale' or 'purchase'
    ...invoiceBody(v),
    propertyName: v.propertyName || (prop ? prop.name + ' · ' + prop.project : ''),
    saleId: v.saleId || null,
    manual: true,
  };
  DATA.invoices.push(inv);
  saveRecordToFirestore('invoices', inv.id, inv);

  const au = {
    id: nextId(DATA.audit, 'AU-', 4),
    date: inv.receiptDate,
    txnId: inv.id,
    action: 'Created',
    user: ACTOR,
    entity: INVOICE_LABEL[inv.type] || 'Invoice',
    prevAmount: null,
    newAmount: inv.totalAmount,
    note: `${INVOICE_LABEL[inv.type] || 'Invoice'} ${inv.id} created for ${inv.type === 'purchase' ? inv.sellerName || inv.buyerName : inv.buyerName}`,
    manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);
  return inv;
}

/** Sale receipt for an existing sale: the company is the seller and receives from the buyer. */
export function generateInvoiceFromSale(saleId) {
  const sale = DATA.sales.find((s) => s.id === saleId);
  if (!sale) throw new Error('Sale not found');
  return addInvoice({
    type: 'sale',
    receiptDate: sale.date,
    propertyId: sale.propertyId,
    propertyName: sale.property,
    saleId: sale.id,
    buyerName: sale.buyer,
    sellerName: COMPANY,
    paymentMode: sale.method || '',
    totalAmount: sale.sellingPrice,
    balanceAmount: sale.outstanding,
    tokenAmount: sale.received,
    tokenDate: sale.date,
    receivedByName: ACTOR,
    receivedFromName: sale.buyer,
  });
}

/* ====================================================================
   MIRRORS — a mirror invoice or cost sheet follows its original. Only the
   fields changed on the mirror itself (listed in mirrorEdits) differ; every
   other field is read from the original, so a change made there shows on
   the mirror too. Nothing on a mirror is ever written back to the original.
   ==================================================================== */

/** A field value in one comparable form: dates as YYYY-MM-DD, numbers rounded, blank and 0 alike. */
const valueKey = (x) => {
  if (x instanceof Date) return dateInput(x);
  if (x == null || x === '') return '';
  const s = String(x).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return +s === 0 ? '' : String(Math.round(+s));
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
};
export const sameValue = (a, b) => valueKey(a) === valueKey(b);

/** The fields of an invoice a mirror follows. Its number, attachments and balance are its own. */
export const INVOICE_MIRROR_KEYS = [
  'receiptDate', 'propertyId', 'buyerName', 'buyerCompany', 'buyerCnic', 'bankDetailsBuyer',
  'sellerName', 'sellerCompany', 'sellerCnic', 'bankDetailsSeller',
  'paymentMode', 'paymentRef', 'paymentMode2', 'paymentAmount2', 'paymentRef2', 'paymentDate', 'paymentTerms', 'estampNo',
  'totalAmount', 'tokenAmount', 'tokenDate', 'transferDate',
  'receivedByName', 'receivedByCnic', 'receivedFromName', 'receivedFromCnic', 'approvedByName', 'notes',
];

/** The original a mirror invoice was copied from. */
export const invoiceSource = (m, list = DATA.invoices) =>
  m && m.mirrorOf ? list.find((i) => i.id === m.mirrorOf && !i.mirrorOf) || null : null;

/** The fields of a mirror invoice that differ from its original. */
const invoiceEdits = (m, src) => INVOICE_MIRROR_KEYS.filter((k) => !sameValue(m[k], src[k]));

/** Bring a mirror invoice up to date with its original, keeping the fields changed on the mirror.
    A mirror saved before changes were tracked has none, so it matches its original again. */
function syncInvoiceMirror(m, list = DATA.invoices) {
  const src = invoiceSource(m, list);
  if (!src) return m;
  const edits = m.mirrorEdits || [];
  INVOICE_MIRROR_KEYS.forEach((k) => { if (edits.indexOf(k) < 0) m[k] = src[k]; });
  if (edits.indexOf('propertyId') < 0) m.propertyName = src.propertyName;
  // A mirror prints its original's serial, marked as a mirror (MSI-0003 for SI-0003).
  m.srNo = src.srNo;
  m.balanceAmount = Math.max(0, (m.totalAmount || 0) - (m.tokenAmount || 0));
  return m;
}
export function syncInvoiceMirrors(list = DATA.invoices) {
  list.forEach((i) => { if (i.mirrorOf) syncInvoiceMirror(i, list); });
  return list;
}

/** Drop every change made on a mirror invoice, so it matches its original again. */
export function resetInvoiceMirror(id) {
  const m = mustFind(DATA.invoices, id, 'Invoice');
  const dropped = (m.mirrorEdits || []).length;
  m.mirrorEdits = [];
  syncInvoiceMirror(m);
  saveRecordToFirestore('invoices', m.id, m);
  const au = {
    id: nextId(DATA.audit, 'AU-', 4), date: TODAY, txnId: m.id, action: 'Edited', user: ACTOR,
    entity: INVOICE_LABEL[m.type] || 'Invoice', prevAmount: null, newAmount: m.totalAmount,
    note: `Mirror ${m.id} reset to match ${m.mirrorOf} (${dropped} change${dropped === 1 ? '' : 's'} dropped)`, manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);
  return m;
}

/* ====================================================================
   AGENTS, TAX, ZAKAT, BILLS, SALARIES — registers that need manual entry
   ==================================================================== */
const settled = (amount, paid) => (paid >= amount ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid');
const dueState = (amount, paid, dueDate) =>
  paid >= amount ? 'Paid' : dueDate instanceof Date && dueDate < TODAY ? 'Overdue' : paid > 0 ? 'Partially Paid' : 'Pending';

/* Commission on a plot, bought or sold, entered straight in the commission ledger: an agent or
   dealer from the directory or just a name. A sale with an agent picked still makes its own entry. */
function commissionBody(v) {
  const p = DATA.properties.find((x) => x.id === v.propertyId);
  if (!p) throw new Error('Pick the property the commission is for.');
  const side = v.side === 'Purchase' ? 'Purchase' : 'Sale';
  // A typed name that is an agent in the directory ("Husnain" for Husnain Ali) is that agent.
  const agent = v.agentId ? DATA.agents.find((a) => a.id === v.agentId) : agentForName(v.agentName);
  const name = agent ? agent.name : String(v.agentName || '').trim();
  if (!name) throw new Error('Pick the agent, or type the agent or dealer name.');
  const sale = DATA.sales.find((x) => x.propertyId === p.id);
  const base = side === 'Purchase' ? p.price : sale ? sale.sellingPrice : p.currentValue;
  const amount = Math.round(+v.amount || 0);
  return {
    propertyId: p.id, property: p.name, txnType: side, agentId: agent ? agent.id : null, agent: name,
    counterparty: side === 'Purchase' ? p.seller : sale ? sale.buyer : '—',
    date: parseDate(v.date), amount, pct: base > 0 ? (amount / base) * 100 : 0,
    office: p.office, note: v.note || '', source: 'ledger',
  };
}

export function addCommission(v) {
  const body = commissionBody(v);
  const paid = Math.min(Math.round(+v.paid || 0), body.amount);
  const c = {
    id: nextId(DATA.commissions, 'CM-', 4), ...body, paid, outstanding: body.amount - paid,
    status: settled(body.amount, paid), paidDate: paid > 0 ? fmtDate(body.date) : '—', manual: true,
  };
  DATA.commissions.push(c);
  saveRecordToFirestore('commissions', c.id, c);
  if (paid > 0) addPayment({
    date: v.date, dir: 'out', category: 'Agent Commission', amount: paid, party: c.agent, propertyId: c.propertyId,
    agentId: c.agentId, office: c.office, method: v.method, account: v.account, note: 'Commission on ' + c.txnType.toLowerCase() + ' — ' + c.property,
    settleKey: 'comm:' + c.id,
  });
  return c;
}

export function updateCommission(id, v) {
  const c = mustFind(DATA.commissions, id, 'Commission');
  if (c.source !== 'ledger') {
    const sale = DATA.sales.find((s) => s.propertyId === c.propertyId);
    throw new Error('This commission comes from ' + (sale ? 'sale ' + sale.id : 'a sale') + ' — change it by editing that sale.');
  }
  const body = commissionBody(v);
  if (c.paid > body.amount) throw alreadyPaid(c.paid, 'the commission');
  const prev = c.amount;
  Object.assign(c, body, { outstanding: body.amount - c.paid, status: settled(body.amount, c.paid) });
  saveRecordToFirestore('commissions', c.id, c);
  logEdit(c.id, 'Agent Commission', prev, c.amount);
  return c;
}

/** Agent fees typed on a cost sheet that the commission ledger does not hold yet, deal by deal. */
export function unrecordedAgentFees() {
  const out = [];
  dealSheets().forEach((cs) => {
    if (!cs.propertyId) return;
    const recorded = (side) => DATA.commissions.filter((c) => c.propertyId === cs.propertyId && c.txnType === side).reduce((a, c) => a + c.amount, 0);
    [['Purchase', cs.buySideAgentFee], ['Sale', cs.sellSideAgentFee]].forEach(([side, onSheet]) => {
      const missing = Math.round((onSheet || 0) - recorded(side));
      if (missing > 0) out.push({ id: cs.propertyId + ':' + side, propertyId: cs.propertyId, property: cs.name, sheet: cs.fromRecords ? '' : cs.id, side, onSheet, recorded: recorded(side), missing });
    });
  });
  return out;
}

/** The tax lines of a cost sheet: what a deal owes in tax. */
export const DEAL_TAX_LINES = [
  ['stampDuty', 'Stamp duty', 'Stamp Duty'], ['cvt', 'CVT', 'Capital Value Tax (CVT)'], ['tax236K', '§236K', 'Advance Tax §236K'],
  ['tax236C', '§236C', 'Advance Tax §236C'], ['cgtAmount', 'CGT', 'Capital Gains Tax'],
];

/** Tax on each deal: what its cost sheet says is due, what has been entered (tax entries, tax
    taken on the sale, expenses on those lines), what of that is paid, and what is left to pay. */
export function dealTaxes() {
  const keys = DEAL_TAX_LINES.map((l) => l[0]);
  return dealSheets().filter((cs) => cs.propertyId).map((cs) => {
    const fresh = sheetFromRecords(cs.propertyId);
    const recs = fresh ? fresh.sources.filter((x) => keys.indexOf(x.key) >= 0) : [];
    // Each line is due as on the sheet, or as recorded when more was recorded (tax taken on the
    // sale is a fact), so what is paid is never counted against a smaller, older figure.
    const rec = (k) => recs.filter((x) => x.key === k).reduce((a, x) => a + x.amount, 0);
    const line = (k) => Math.max(cs[k] || 0, rec(k));
    const due = keys.reduce((a, k) => a + line(k), 0);
    const recorded = recs.reduce((a, x) => a + x.amount, 0);
    const paid = recs.reduce((a, x) => a + x.paid, 0);
    // Each line's tax that is only on the sheet, entered one line at a time with its own tax type.
    const missing = DEAL_TAX_LINES.map(([k, label, type]) => ({
      key: k, label, type, amount: Math.round((cs[k] || 0) - rec(k)),
    })).filter((x) => x.amount > 0);
    return {
      id: cs.propertyId, propertyId: cs.propertyId, property: cs.name, sheet: cs.fromRecords ? '' : cs.id, status: cs.status,
      stampCvt: line('stampDuty') + line('cvt'), tax236K: line('tax236K'), tax236C: line('tax236C'), cgt: line('cgtAmount'),
      due, recorded, paid, remaining: Math.max(0, due - paid), notRecorded: missing.reduce((a, x) => a + x.amount, 0), missing,
    };
  }).filter((x) => x.due > 0 || x.paid > 0);
}

export function addAgent(v) {
  const a = {
    id: nextId(DATA.agents, 'AG-', 3), name: v.name, phone: v.phone || '', cnic: v.cnic || '',
    office: v.office || OFFICES[0], rate: v.rate === '' || v.rate == null ? 2 : +v.rate, manual: true, attachments: v.attachments || [],
  };
  DATA.agents.push(a);
  saveRecordToFirestore('agents', a.id, a);
  return a;
}

/** Rebuild PROJECTS in place (every screen holds the same array) from the saved projects. */
function syncProjects(rows) {
  const added = rows.filter((p) => p && p.name && !BUILTIN_PROJECTS.some((b) => b.id === p.id));
  added.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  PROJECTS.length = 0;
  PROJECTS.push(...BUILTIN_PROJECTS, ...added);
}

export function addProject(v) {
  const name = String(v.name || '').trim();
  if (!name) throw new Error('Enter the project name.');
  if (PROJECTS.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new Error('A project named “' + name + '” already exists.');
  const p = { id: nextId(PROJECTS, 'PRJ-', 2), name, city: String(v.city || '').trim() || '—', manual: true };
  DATA.projects.push(p);
  syncProjects(DATA.projects);
  saveRecordToFirestore('projects', p.id, p);
  return p;
}

/* Expense and income categories added in the portal. An expense record names a category and,
   optionally, a sub-category under it (a new category with a sub-category is one record). */
function syncCategories(rows) {
  const live = rows.filter((c) => c && (c.group || c.name));
  CUSTOM_SUBS = {};
  const groups = [];
  live.filter((c) => c.kind === 'expense' && c.group).forEach((c) => {
    if (!EXPENSE_TREE[c.group] && groups.indexOf(c.group) < 0) groups.push(c.group);
    if (c.name) (CUSTOM_SUBS[c.group] = CUSTOM_SUBS[c.group] || []).push(c.name);
  });
  // Added categories sit with the business ones, before personal spending and assets.
  const business = Object.keys(EXPENSE_TREE).filter((g) => NON_EXPENSE_GROUPS.indexOf(g) < 0);
  EXPENSE_GROUPS.length = 0;
  EXPENSE_GROUPS.push(...business, ...groups, ...NON_EXPENSE_GROUPS);
  const kinds = live.filter((c) => c.kind === 'income' && c.name).map((c) => c.name).filter((n) => BUILTIN_INCOME.indexOf(n) < 0);
  INCOME_CATEGORIES.length = 0;
  INCOME_CATEGORIES.push(...BUILTIN_INCOME.slice(0, -1), ...Array.from(new Set(kinds)), BUILTIN_INCOME[BUILTIN_INCOME.length - 1]);
}

const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/** Adds an expense category (with or without a sub-category under it) or an income category. */
export function addCategory(v) {
  const kind = v.kind === 'income' ? 'income' : 'expense';
  const name = String(v.name || '').trim();
  let rec;
  if (kind === 'income') {
    if (!name) throw new Error('Enter the name of the income category.');
    const have = INCOME_CATEGORIES.concat(CAPITAL_CATEGORIES).find((x) => sameName(x, name));
    if (have) throw new Error('“' + have + '” is already a category.');
    rec = { kind, group: '', name };
  } else {
    const typed = String(v.group || '').trim();
    if (!typed) throw new Error('Enter or pick a category.');
    // A category picked from the list keeps its spelling.
    const group = EXPENSE_GROUPS.find((g) => sameName(g, typed)) || typed;
    const known = EXPENSE_GROUPS.indexOf(group) >= 0;
    if (group === 'Assets') throw new Error('Kinds of asset are added under Finance → Assets.');
    if (known && !name) throw new Error('“' + group + '” is already a category. Type a sub-category to add under it, or a new category name.');
    if (name && expenseSubcats(group).some((x) => sameName(x, name))) throw new Error('“' + name + '” is already under ' + group + '.');
    rec = { kind, group, name };
  }
  const c = { id: nextId(DATA.categories, 'CAT-', 3), ...rec, createdAt: new Date() };
  DATA.categories.push(c);
  syncCategories(DATA.categories);
  saveRecordToFirestore('categories', c.id, c);
  return c;
}

/** Takes an added category off the lists. Entries already made under it keep its name. */
export function removeCategory(id) {
  const c = mustFind(DATA.categories, id, 'Category');
  DATA.categories = DATA.categories.filter((x) => x.id !== id);
  syncCategories(DATA.categories);
  deleteRecordFromFirestore('categories', c.id);
  return c;
}

/** Every expense category with its sub-categories, what was spent under each in the range and how many entries. */
export function expenseCategoryStats(r, f) {
  const exp = DATA.expenses.filter((e) => e.group !== 'Assets' && inR(e.date, r) && (!f || f.office === 'all' || e.office === f.office));
  const groups = Array.from(new Set([...EXPENSE_GROUPS.filter((g) => g !== 'Assets'), ...exp.map((e) => e.group).filter(Boolean)]));
  const added = DATA.categories || [];
  return groups.map((g) => {
    const of = exp.filter((e) => e.group === g);
    const subs = Array.from(new Set([...expenseSubcats(g), ...of.map((e) => e.category).filter(Boolean)])).map((s) => ({
      name: s,
      amount: of.filter((e) => e.category === s).reduce((a, e) => a + e.amount, 0),
      count: of.filter((e) => e.category === s).length,
      added: added.find((c) => c.kind === 'expense' && c.group === g && c.name === s) || null,
    }));
    return {
      name: g,
      builtin: !!EXPENSE_TREE[g],
      business: NON_EXPENSE_GROUPS.indexOf(g) < 0,
      amount: of.reduce((a, e) => a + e.amount, 0),
      count: of.length,
      subs,
      added: added.filter((c) => c.kind === 'expense' && c.group === g),
    };
  });
}

/** Every income category, what was earned under it in the range and how many entries. */
export function incomeCategoryStats(r, f) {
  const rows = incomeEntries(r, f);
  const kinds = Array.from(new Set([...INCOME_CATEGORIES, ...rows.map((x) => x.category).filter(Boolean)]));
  return kinds.map((k) => ({
    name: k,
    builtin: BUILTIN_INCOME.indexOf(k) >= 0,
    amount: rows.filter((x) => x.category === k).reduce((a, x) => a + x.amount, 0),
    count: rows.filter((x) => x.category === k).length,
    added: (DATA.categories || []).find((c) => c.kind === 'income' && c.name === k) || null,
  }));
}

export const TAX_TYPES = ['Advance Tax §236K', 'Advance Tax §236C', 'Capital Gains Tax', 'Stamp Duty', 'Capital Value Tax (CVT)', 'Withholding Tax', 'Income Tax', 'Property Tax', 'Other'];

export function addTax(v) {
  const amount = Math.round(+v.amount || 0), paid = Math.min(Math.round(+v.paid || 0), amount);
  const prop = v.propertyId ? DATA.properties.find((p) => p.id === v.propertyId) : null;
  const dueDate = v.dueDate ? parseDate(v.dueDate) : parseDate(v.date);
  const t = {
    id: nextId(DATA.taxes, 'TX-', 4), type: v.type, ref: v.ref || '—',
    propertyId: prop ? prop.id : null, property: prop ? prop.name : '—',
    authority: v.authority || 'FBR', date: parseDate(v.date), dueDate,
    amount, paid, outstanding: amount - paid, status: dueState(amount, paid, dueDate),
    office: v.office || OFFICES[0], manual: true, attachments: v.attachments || [],
  };
  DATA.taxes.push(t);
  saveRecordToFirestore('taxes', t.id, t);
  if (paid > 0) addPayment({
    date: v.date, dir: 'out', category: 'Taxes', amount: paid, party: t.authority,
    propertyId: t.propertyId, office: t.office, method: v.method, account: v.account, note: t.type + (t.ref !== '—' ? ' — ' + t.ref : ''),
    settleKey: 'tax:' + t.id,
  });
  return t;
}

export function addZakat(v) {
  const eligibleAssets = Math.round(+v.eligibleAssets || 0);
  const zakatable = Math.max(0, eligibleAssets - Math.round(+v.liabilities || 0));
  const rate = v.rate === '' || v.rate == null ? 2.5 : +v.rate;
  const z = {
    id: nextId(DATA.zakat, 'ZK-', 4), period: v.period, eligibleAssets, zakatable, rate,
    calculated: Math.round((zakatable * rate) / 100), amount: Math.round(+v.amount || 0),
    ...dealLink(v.propertyId),
    date: parseDate(v.date), ref: v.ref || '—', manual: true, attachments: v.attachments || [],
  };
  DATA.zakat.push(z);
  saveRecordToFirestore('zakat', z.id, z);
  if (z.amount > 0) addPayment({
    date: v.date, dir: 'out', category: 'Zakat', amount: z.amount, party: v.paidTo || 'Zakat recipients', propertyId: z.propertyId,
    method: v.method, account: v.account, note: 'Zakat — ' + z.period, settleKey: 'zakat:' + z.id,
  });
  refreshZakatSummary();
  return z;
}

/** Zakat due is the latest assessment of each period; every entry's payment counts toward it. */
export function refreshZakatSummary() {
  const byPeriod = {};
  let latest = null;
  DATA.zakat.forEach((z) => {
    // Zakat paid on one deal (from its cost sheet) is a payment, not an assessment of the period.
    if (z.propertyId && !z.eligibleAssets) return;
    if (!byPeriod[z.period] || z.date >= byPeriod[z.period].date) byPeriod[z.period] = z;
    if (!latest || z.date >= latest.date) latest = z;
  });
  const calculated = Object.keys(byPeriod).reduce((a, k) => a + (byPeriod[k].calculated || 0), 0);
  const paid = DATA.zakat.reduce((a, z) => a + (z.amount || 0), 0);
  DATA.zakatSummary = {
    calculated, paid, remaining: Math.max(0, calculated - paid),
    zakatable: latest ? latest.zakatable : 0, eligibleAssets: latest ? latest.eligibleAssets : 0,
    rate: latest ? latest.rate : 2.5,
  };
  return DATA.zakatSummary;
}

export const BILL_KINDS = BILL_TYPES.map((b) => b[0]).concat(['Other']);

export function addBill(v) {
  const amount = Math.round(+v.amount || 0), paid = Math.min(Math.round(+v.paid || 0), amount);
  const dueDate = parseDate(v.dueDate);
  const b = {
    id: nextId(DATA.bills, 'BL-', 4), type: v.type, vendor: v.vendor, number: v.number || '—',
    period: v.period || MONTHS[dueDate.getMonth()] + ' ' + dueDate.getFullYear(), dueDate,
    amount, paid, outstanding: amount - paid, status: dueState(amount, paid, dueDate),
    office: v.office || OFFICES[0], manual: true, attachments: v.attachments || [],
  };
  DATA.bills.push(b);
  saveRecordToFirestore('bills', b.id, b);
  if (paid > 0) addPayment({
    date: dateInput(dueDate > TODAY ? TODAY : dueDate), dir: 'out', category: 'Bills', amount: paid, party: b.vendor,
    office: b.office, method: v.method, account: v.account, note: b.type + ' bill — ' + b.period, settleKey: 'bill:' + b.id,
  });
  return b;
}

export function addSalary(v) {
  const basic = Math.round(+v.basic || 0), bonus = Math.round(+v.bonus || 0);
  const allowance = Math.round(+v.allowance || 0), deduction = Math.round(+v.deduction || 0);
  const date = parseDate(v.date);
  const sl = {
    id: nextId(DATA.salaries, 'SL-', 4), employee: v.employee, dept: v.dept || '—',
    monthLabel: v.monthLabel || MONTHS[date.getMonth()] + ' ' + date.getFullYear(),
    basic, bonus, allowance, deduction, net: basic + bonus + allowance - deduction,
    date, status: v.status === 'Pending' ? 'Pending' : 'Paid', office: v.office || OFFICES[0], manual: true, attachments: v.attachments || [],
  };
  DATA.salaries.push(sl);
  saveRecordToFirestore('salaries', sl.id, sl);
  if (sl.status === 'Paid' && sl.net > 0) addPayment({
    date: v.date, dir: 'out', category: 'Employee Salaries', amount: sl.net, party: sl.employee,
    office: sl.office, method: v.method, account: v.account, note: 'Salary — ' + sl.monthLabel, settleKey: 'sal:' + sl.id,
  });
  return sl;
}

/** Replace the image attachments of a saved record (any ledger). */
export function setAttachments(coll, id, list) {
  const x = (DATA[coll] || []).find((r) => r.id === id);
  if (!x) return null;
  x.attachments = list;
  saveRecordToFirestore(coll, id, x);
  return x;
}

/* ====================================================================
   SETTLEMENT — a payment can be applied to an open balance (a customer
   receivable, a seller, an agent's commission, a bill, a tax, an unpaid
   expense or a pending salary), so "outstanding" figures actually come
   down when money moves.
   ==================================================================== */
export function openItems() {
  const out = [];
  const add = (key, label, o) => out.push({ key, label: label + ' — ' + fmt(o.outstanding, 'full') + ' open', ...o });
  DATA.sales.filter((s) => s.outstanding > 0).forEach((s) => add('sale:' + s.id, 'Receive · ' + s.buyer + ' · ' + s.property,
    { dir: 'in', category: 'Customer Payment', party: s.buyer, outstanding: s.outstanding, propertyId: s.propertyId, agentId: s.agentId, office: s.office }));
  DATA.properties.filter((p) => p.remaining > 0).forEach((p) => add('prop:' + p.id, 'Pay seller · ' + p.seller + ' · ' + p.name,
    { dir: 'out', category: 'Property Purchase', party: p.seller, outstanding: p.remaining, propertyId: p.id, office: p.office }));
  DATA.commissions.filter((c) => c.outstanding > 0).forEach((c) => add('comm:' + c.id, 'Pay commission · ' + c.agent + ' · ' + c.property,
    { dir: 'out', category: 'Agent Commission', party: c.agent, outstanding: c.outstanding, propertyId: c.propertyId, agentId: c.agentId, office: c.office }));
  DATA.bills.filter((b) => b.outstanding > 0).forEach((b) => add('bill:' + b.id, 'Pay bill · ' + b.type + ' · ' + b.vendor,
    { dir: 'out', category: 'Bills', party: b.vendor, outstanding: b.outstanding, office: b.office }));
  DATA.taxes.filter((t) => t.outstanding > 0).forEach((t) => add('tax:' + t.id, 'Pay tax · ' + t.type,
    { dir: 'out', category: 'Taxes', party: t.authority, outstanding: t.outstanding, propertyId: t.propertyId, office: t.office }));
  DATA.expenses.filter((e) => e.outstanding > 0).forEach((e) => add('exp:' + e.id, 'Pay expense · ' + e.category + ' · ' + e.vendor,
    { dir: 'out', category: e.group, party: e.vendor, outstanding: e.outstanding, office: e.office }));
  DATA.salaries.filter((s) => s.status === 'Pending').forEach((s) => add('sal:' + s.id, 'Pay salary · ' + s.employee + ' · ' + s.monthLabel,
    { dir: 'out', category: 'Employee Salaries', party: s.employee, outstanding: s.net, office: s.office }));
  (DATA.income || []).filter((x) => x.outstanding > 0).forEach((x) => add('inc:' + x.id, 'Receive income · ' + x.category + ' · ' + x.party,
    { dir: 'in', category: x.category, party: x.party, outstanding: x.outstanding, propertyId: x.propertyId, office: x.office }));
  return out;
}

/** Move `amount` (negative to reverse) onto the record behind a settle key. */
export function applySettlement(key, amount, date) {
  const [kind, id] = String(key).split(':');
  const find = (arr) => arr.find((x) => x.id === id);
  if (kind === 'sale') {
    const s = find(DATA.sales); if (!s) return null;
    s.received = Math.max(0, Math.min(s.sellingPrice, s.received + amount));
    s.outstanding = s.sellingPrice - s.received;
    s.payStatus = s.outstanding === 0 ? 'Paid' : s.dueDate < TODAY ? 'Overdue' : s.received > 0 ? 'Partially Paid' : 'Unpaid';
    s.saleStatus = s.outstanding === 0 ? 'Completed' : 'In Payment';
    saveRecordToFirestore('sales', s.id, s); return s;
  }
  if (kind === 'prop') {
    const p = find(DATA.properties); if (!p) return null;
    p.paid = Math.max(0, p.paid + amount); recomputeProperty(p);
    saveRecordToFirestore('properties', p.id, p); return p;
  }
  if (kind === 'sal') {
    const s = find(DATA.salaries); if (!s) return null;
    s.status = amount > 0 ? 'Paid' : 'Pending';
    saveRecordToFirestore('salaries', s.id, s); return s;
  }
  if (kind === 'inc') {
    const x = find(DATA.income || []); if (!x) return null;
    x.received = Math.max(0, Math.min(x.amount, (x.received || 0) + amount));
    x.outstanding = x.amount - x.received;
    x.status = incomeStatus(x);
    saveRecordToFirestore('income', x.id, x); return x;
  }
  if (kind === 'zakat') {
    // Only reached when a Zakat payment is voided: the amount comes back off the entry.
    const z = find(DATA.zakat); if (!z) return null;
    z.amount = Math.max(0, (z.amount || 0) + amount);
    saveRecordToFirestore('zakat', z.id, z); refreshZakatSummary(); return z;
  }
  const map = { comm: ['commissions', DATA.commissions], bill: ['bills', DATA.bills], tax: ['taxes', DATA.taxes], exp: ['expenses', DATA.expenses] }[kind];
  if (!map) return null;
  const x = find(map[1]); if (!x) return null;
  x.paid = Math.max(0, Math.min(x.amount, x.paid + amount));
  x.outstanding = x.amount - x.paid;
  if (kind === 'comm') { x.status = settled(x.amount, x.paid); x.paidDate = x.paid > 0 ? fmtDate(parseDate(date || TODAY)) : '—'; }
  else if (kind === 'exp') x.status = settled(x.amount, x.paid);
  else x.status = dueState(x.amount, x.paid, x.dueDate);
  saveRecordToFirestore(map[0], x.id, x);
  return x;
}

/** Record a payment and, when it is linked to an open balance, settle that balance. */
export function recordPayment(v) {
  const item = v.settle ? openItems().find((o) => o.key === v.settle) : null;
  if (v.settle && !item) throw new Error('That balance is no longer open.');
  if (item && +v.amount > item.outstanding) throw new Error('Amount is more than the ' + fmt(item.outstanding, 'full') + ' still open.');
  const t = addPayment(item
    ? { ...v, dir: item.dir, category: item.category, party: v.party || item.party, propertyId: item.propertyId, agentId: item.agentId, office: v.office || item.office, settleKey: item.key }
    : v);
  if (item) applySettlement(item.key, t.amount, t.date);
  return t;
}

/* ====================================================================
   INCOME — money earned outside property trading: rent, profit on
   deposits, commission earned, dividends. An entry counts as revenue on
   the date it was earned; what has been received of it is on the cash
   ledger, and the rest is still to receive.
   ==================================================================== */
/** Kinds of income: the standard ones, then any other kind already used. */
export function incomeKinds() {
  return Array.from(new Set(INCOME_CATEGORIES.concat((DATA.income || []).map((x) => x.category)).filter(Boolean)));
}

export function incomeStatus(x) {
  if ((x.received || 0) >= x.amount) return 'Received';
  if (x.dueDate instanceof Date && x.dueDate < startOfDay(TODAY)) return 'Overdue';
  return (x.received || 0) > 0 ? 'Partly received' : 'To receive';
}

function incomeBody(v) {
  const category = String(v.category || '').trim();
  if (!category) throw new Error('Pick or type the kind of income.');
  const party = String(v.party || '').trim();
  if (!party) throw new Error('Enter who the income is from.');
  const amount = Math.round(+v.amount || 0);
  if (amount <= 0) throw new Error('Enter the amount earned.');
  const date = parseDate(v.date);
  return {
    category, party, amount, date, dueDate: v.dueDate ? parseDate(v.dueDate) : date,
    propertyId: v.propertyId || null, office: v.office || OFFICES[0],
    ref: v.ref || '', note: v.note || '',
  };
}

export function addIncome(v) {
  const body = incomeBody(v);
  const x = {
    id: nextId(DATA.income, 'INC-', 4), ...body, received: 0, outstanding: body.amount,
    method: v.method || 'Bank Transfer', account: v.account || '', attachments: v.attachments || [],
    createdBy: ACTOR, createdAt: new Date(), manual: true,
  };
  x.status = incomeStatus(x);
  DATA.income.push(x);
  saveRecordToFirestore('income', x.id, x);
  const got = Math.min(Math.round(+v.received || 0), body.amount);
  if (got > 0) {
    // Received two ways (part cash, part bank): one receipt for each, into its own account.
    Object.assign(x, splitOf(v, got));
    postSplit({
      date: v.date, dir: 'in', category: x.category, amount: got, method: x.method, account: v.account, party: x.party,
      propertyId: x.propertyId, office: x.office, ref: v.ref, note: 'Income ' + x.id + ' — ' + x.category, settleKey: 'inc:' + x.id,
    }, v);
    applySettlement('inc:' + x.id, got, v.date);
  }
  return x;
}

export function updateIncome(id, v) {
  const x = mustFind(DATA.income, id, 'Income');
  const body = incomeBody(v);
  if ((x.received || 0) > body.amount) throw new Error(fmt(x.received, 'full') + ' has already been received — the income cannot be less. Void the receipt first.');
  const prev = x.amount;
  Object.assign(x, body);
  x.outstanding = x.amount - (x.received || 0);
  x.status = incomeStatus(x);
  saveRecordToFirestore('income', x.id, x);
  logEdit(x.id, 'Income', prev, x.amount);
  return x;
}

/** Income in a period: the income ledger by the date earned, and income received straight on the
    cash ledger (an older way of entering it). Voided receipts are left out. */
export function incomeEntries(r, f, propIds) {
  const scoped = f && scopedToProperty(f);
  const inScope = (x) => (!f || overheadMatch(x, f)) && (!scoped || (x.propertyId && (!propIds || propIds.has(x.propertyId))));
  const ledger = (DATA.income || []).filter((x) => inR(x.date, r) && inScope(x)).map((x) => ({ ...x, source: 'income' }));
  const direct = livePayments().filter((p) => p.dir === 'in' && INCOME_CATEGORIES.indexOf(p.category) >= 0 && !isIncomeReceipt(p) && inR(p.date, r) && inScope(p))
    .map((p) => ({ ...p, source: 'payment', received: p.amount, outstanding: 0, status: 'Received', dueDate: p.date }));
  return ledger.concat(direct).sort((a, b) => b.date - a.date);
}

/* ====================================================================
   EDITING — correct a saved record. Money that has already moved is not
   edited here: it sits on the cash ledger and is changed by recording or
   voiding a payment (§31), so an edit may never leave a record showing
   less than what has been paid against it. Every edit is logged.
   ==================================================================== */
const mustFind = (arr, id, what) => {
  const x = arr.find((r) => r.id === id);
  if (!x) throw new Error(what + ' ' + id + ' was not found.');
  return x;
};
const alreadyPaid = (paid, what) =>
  new Error(fmt(paid, 'full') + ' has already been paid — ' + what + ' cannot be less. Void the payment first.');

function logEdit(id, entity, prevAmount, newAmount) {
  const au = {
    id: nextId(DATA.audit, 'AU-', 4), date: TODAY, txnId: id, action: 'Edited',
    user: ACTOR, entity, prevAmount, newAmount, note: entity + ' ' + id + ' edited', manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);
}

function recomputeSale(s) {
  s.outstanding = Math.max(0, s.sellingPrice - s.received);
  s.netRevenue = s.sellingPrice - s.commission - s.tax - s.otherExpenses;
  s.grossProfit = s.sellingPrice - s.propertyCost;
  s.netProfit = s.grossProfit - s.commission - s.tax - s.otherExpenses;
  s.payStatus = s.received >= s.sellingPrice ? 'Paid' : s.dueDate < TODAY ? 'Overdue' : s.received > 0 ? 'Partially Paid' : 'Unpaid';
  s.saleStatus = s.received >= s.sellingPrice ? 'Completed' : 'In Payment';
  return s;
}

/** A renamed property or agent is shown by name on other ledgers; carry the new name over. */
function rename(coll, match, field, name) {
  DATA[coll].filter((x) => match(x) && x[field] !== name).forEach((x) => {
    x[field] = name;
    saveRecordToFirestore(coll, x.id, x);
  });
}

export function updateProperty(id, v) {
  const p = mustFind(DATA.properties, id, 'Property');
  const extras = { registration: +v.registration || 0, legal: +v.legal || 0, development: +v.development || 0, other: +v.otherCost || 0 };
  const total = +v.price + extras.registration + extras.legal + extras.development + extras.other;
  if (p.paid > total) throw alreadyPaid(p.paid, 'the total cost');
  const sale = DATA.sales.find((s) => s.propertyId === id);
  const purchaseDate = parseDate(v.purchaseDate);
  if (sale && purchaseDate > sale.date) throw new Error('Purchase date is after the property was sold (' + fmtDate(sale.date) + ').');
  const project = PROJECTS.find((x) => x.id === v.projectId);
  const prev = p.totalCost;
  Object.assign(p, {
    name: v.name, type: v.type, size: v.size, block: v.block || '—', unit: v.unit || '—',
    seller: v.seller, purchaseDate, price: +v.price, extras, office: v.office,
    currentValue: +v.currentValue || +v.price, attachments: v.attachments || p.attachments || [],
    // A property with a sale on the register stays sold whatever the form says.
    status: sale ? 'Sold' : v.status,
  });
  if (project) Object.assign(p, { projectId: project.id, project: project.name, location: project.city });
  recomputeProperty(p);
  saveRecordToFirestore('properties', p.id, p);
  if (sale) {
    sale.property = p.name;
    sale.propertyCost = p.totalCost;
    saveRecordToFirestore('sales', sale.id, recomputeSale(sale));
  }
  rename('commissions', (c) => c.propertyId === id, 'property', p.name);
  rename('taxes', (t) => t.propertyId === id, 'property', p.name);
  logEdit(p.id, 'Property', prev, p.totalCost);
  return p;
}

export function updateSale(id, v) {
  const s = mustFind(DATA.sales, id, 'Sale');
  const p = DATA.properties.find((x) => x.id === s.propertyId);
  const agent = DATA.agents.find((a) => a.id === v.agentId) || null;
  const price = +v.sellingPrice;
  if (s.received > price) throw new Error(fmt(s.received, 'full') + ' has already been received — the selling price cannot be less. Void the receipt first.');
  const pctRate = !agent ? 0 : v.commissionPct === '' || v.commissionPct == null ? agent.rate : +v.commissionPct;
  const commission = Math.round((price * pctRate) / 100);
  // The sale's own commission entry; one entered in the commission ledger is left alone.
  const cm = DATA.commissions.find((c) => c.propertyId === s.propertyId && c.txnType === 'Sale' && c.source !== 'ledger');
  if (cm && cm.paid > 0 && (!agent || agent.id !== cm.agentId))
    throw new Error(fmt(cm.paid, 'full') + ' commission has already been paid to ' + cm.agent + ' — void that payment before changing the agent.');
  if (cm && cm.paid > commission) throw alreadyPaid(cm.paid, 'the commission');
  const date = parseDate(v.date);
  const prev = s.sellingPrice;
  Object.assign(s, {
    buyer: v.buyer, agentId: agent ? agent.id : null, agent: agent ? agent.name : 'Direct sale', date,
    sellingPrice: price, dueDate: addDays(date, 60), commissionPct: pctRate, commission,
    tax: v.tax === '' || v.tax == null ? defaultSaleTax(s.propertyId, price) : Math.round(+v.tax),
    otherExpenses: +v.otherExpenses || 0, attachments: v.attachments || s.attachments || [],
  });
  if (p) s.propertyCost = p.totalCost;
  recomputeSale(s);
  saveRecordToFirestore('sales', s.id, s);

  // The commission entry follows the sale: changed, created, or removed for a direct sale.
  if (agent && commission > 0) {
    const paid = cm ? cm.paid : 0;
    const next = {
      agentId: agent.id, agent: agent.name, counterparty: s.buyer, date, pct: pctRate,
      amount: commission, paid, outstanding: commission - paid, status: settled(commission, paid),
    };
    const entry = cm ? Object.assign(cm, next) : {
      id: nextId(DATA.commissions, 'CM-', 4), propertyId: s.propertyId, property: s.property,
      txnType: 'Sale', paidDate: '—', office: s.office, manual: true, ...next,
    };
    if (!cm) DATA.commissions.push(entry);
    saveRecordToFirestore('commissions', entry.id, entry);
  } else if (cm) {
    DATA.commissions.splice(DATA.commissions.indexOf(cm), 1);
    deleteRecordFromFirestore('commissions', cm.id);
  }
  logEdit(s.id, 'Sale', prev, s.sellingPrice);
  return s;
}

export function updateExpense(id, v) {
  const e = mustFind(DATA.expenses, id, 'Expense');
  const amount = +v.amount;
  if (e.paid > amount) throw alreadyPaid(e.paid, 'the amount');
  const prev = e.amount;
  Object.assign(e, {
    group: v.group, category: v.category, ...dealLink(v.propertyId), date: parseDate(v.date), amount, outstanding: amount - e.paid,
    vendor: v.vendor, office: v.office, note: v.note || v.category, status: settled(amount, e.paid),
    attachments: v.attachments || e.attachments || [],
  });
  saveRecordToFirestore('expenses', e.id, e);
  logEdit(e.id, 'Expense', prev, e.amount);
  return e;
}

/* An asset is kept on the expense ledger under Assets, with what it is worth today beside its cost. */
const assetValue = (v) => ({
  currentValue: v.currentValue === '' || v.currentValue == null ? null : Math.max(0, Math.round(+v.currentValue || 0)),
  valueDate: v.currentValue === '' || v.currentValue == null ? null : parseDate(v.valueDate || TODAY),
});

export function addAsset(v) {
  const e = addExpense({ ...v, group: 'Assets', propertyId: '' });
  Object.assign(e, assetValue(v));
  saveRecordToFirestore('expenses', e.id, e);
  return e;
}

export function updateAsset(id, v) {
  const e = updateExpense(id, { ...v, group: 'Assets', propertyId: '' });
  Object.assign(e, assetValue(v));
  saveRecordToFirestore('expenses', e.id, e);
  return e;
}

export function updateAgent(id, v) {
  const a = mustFind(DATA.agents, id, 'Agent');
  const prev = a.rate;
  Object.assign(a, {
    name: v.name, phone: v.phone || '', cnic: v.cnic || '', office: v.office || a.office,
    rate: v.rate === '' || v.rate == null ? 2 : +v.rate, attachments: v.attachments || a.attachments || [],
  });
  saveRecordToFirestore('agents', a.id, a);
  // The standard rate applies to future sales; sales already recorded keep the rate they were made at.
  rename('sales', (s) => s.agentId === id, 'agent', a.name);
  rename('commissions', (c) => c.agentId === id, 'agent', a.name);
  logEdit(a.id, 'Agent', prev, a.rate);
  return a;
}

export function updateTax(id, v) {
  const t = mustFind(DATA.taxes, id, 'Tax entry');
  const amount = Math.round(+v.amount || 0);
  if (t.paid > amount) throw alreadyPaid(t.paid, 'the tax amount');
  const prop = v.propertyId ? DATA.properties.find((p) => p.id === v.propertyId) : null;
  const dueDate = v.dueDate ? parseDate(v.dueDate) : parseDate(v.date);
  const prev = t.amount;
  Object.assign(t, {
    type: v.type, ref: v.ref || '—', propertyId: prop ? prop.id : null, property: prop ? prop.name : '—',
    authority: v.authority || 'FBR', date: parseDate(v.date), dueDate, amount, outstanding: amount - t.paid,
    status: dueState(amount, t.paid, dueDate), office: v.office || t.office, attachments: v.attachments || t.attachments || [],
  });
  saveRecordToFirestore('taxes', t.id, t);
  logEdit(t.id, 'Tax entry', prev, t.amount);
  return t;
}

export function updateZakat(id, v) {
  const z = mustFind(DATA.zakat, id, 'Zakat entry');
  const eligibleAssets = Math.round(+v.eligibleAssets || 0);
  const zakatable = Math.max(0, eligibleAssets - Math.round(+v.liabilities || 0));
  const rate = v.rate === '' || v.rate == null ? 2.5 : +v.rate;
  const prev = z.calculated;
  Object.assign(z, {
    period: v.period, eligibleAssets, zakatable, rate, calculated: Math.round((zakatable * rate) / 100), ...dealLink(v.propertyId),
    date: parseDate(v.date), ref: v.ref || '—', attachments: v.attachments || z.attachments || [],
  });
  saveRecordToFirestore('zakat', z.id, z);
  refreshZakatSummary();
  logEdit(z.id, 'Zakat', prev, z.calculated);
  return z;
}

export function updateBill(id, v) {
  const b = mustFind(DATA.bills, id, 'Bill');
  const amount = Math.round(+v.amount || 0);
  if (b.paid > amount) throw alreadyPaid(b.paid, 'the bill amount');
  const dueDate = parseDate(v.dueDate);
  const prev = b.amount;
  Object.assign(b, {
    type: v.type, vendor: v.vendor, number: v.number || '—',
    period: v.period || MONTHS[dueDate.getMonth()] + ' ' + dueDate.getFullYear(), dueDate,
    amount, outstanding: amount - b.paid, status: dueState(amount, b.paid, dueDate),
    office: v.office || b.office, attachments: v.attachments || b.attachments || [],
  });
  saveRecordToFirestore('bills', b.id, b);
  logEdit(b.id, 'Bill', prev, b.amount);
  return b;
}

export function updateSalary(id, v) {
  const sl = mustFind(DATA.salaries, id, 'Payslip');
  const basic = Math.round(+v.basic || 0), bonus = Math.round(+v.bonus || 0);
  const allowance = Math.round(+v.allowance || 0), deduction = Math.round(+v.deduction || 0);
  const net = basic + bonus + allowance - deduction;
  // A paid payslip has its net pay on the cash ledger; the two must not drift apart.
  if (sl.status === 'Paid' && net !== sl.net)
    throw new Error('This payslip is already paid (' + fmt(sl.net, 'full') + '). Void its payment before changing the pay.');
  const date = parseDate(v.date);
  const prev = sl.net;
  Object.assign(sl, {
    employee: v.employee, dept: v.dept || '—', monthLabel: MONTHS[date.getMonth()] + ' ' + date.getFullYear(),
    basic, bonus, allowance, deduction, net, date, office: v.office || sl.office,
    attachments: v.attachments || sl.attachments || [],
  });
  saveRecordToFirestore('salaries', sl.id, sl);
  logEdit(sl.id, 'Payslip', prev, sl.net);
  return sl;
}

export function updateInvoice(id, v) {
  const inv = mustFind(DATA.invoices, id, 'Invoice');
  const prev = inv.totalAmount;
  const moved = (v.propertyId || null) !== (inv.propertyId || null);
  Object.assign(inv, invoiceBody({ ...v, attachments: v.attachments || inv.attachments }));
  if (moved) {
    const prop = inv.propertyId ? DATA.properties.find((p) => p.id === inv.propertyId) : null;
    inv.propertyName = prop ? prop.name + ' · ' + prop.project : '';
  }
  // An edited mirror remembers which fields now differ from its original.
  const src = invoiceSource(inv);
  if (src) {
    inv.mirrorEdits = invoiceEdits(inv, src);
    syncInvoiceMirror(inv);
  }
  saveRecordToFirestore('invoices', inv.id, inv);
  logEdit(inv.id, INVOICE_LABEL[inv.type] || 'Invoice', prev, inv.totalAmount);
  // An edited original shows straight away on its mirrors.
  if (!inv.mirrorOf) syncInvoiceMirrors();
  return inv;
}

/* Statuses that depend on today's date ("Overdue") and day counts go stale in
   storage, so they are re-derived every time a ledger is loaded. */
export function normalizeLedger(name, rows) {
  const isDate = (d) => d instanceof Date;
  if (name === 'properties') rows.forEach((p) => { if (isDate(p.purchaseDate)) p.heldDays = Math.max(0, Math.round((TODAY - p.purchaseDate) / day)); });
  if (name === 'sales') rows.forEach((s) => { if (s.outstanding > 0 && isDate(s.dueDate)) s.payStatus = s.dueDate < TODAY ? 'Overdue' : s.received > 0 ? 'Partially Paid' : 'Unpaid'; });
  if (name === 'bills' || name === 'taxes') rows.forEach((x) => { x.status = dueState(x.amount, x.paid, x.dueDate); });
  if (name === 'income') rows.forEach((x) => { x.outstanding = Math.max(0, (x.amount || 0) - (x.received || 0)); x.status = incomeStatus(x); });
  if (name === 'commissions') rows.forEach((c) => { if (c.outstanding > 0 && isDate(c.date) && c.date < addDays(TODAY, -30)) c.status = 'Overdue'; });
  if (name === 'projects') syncProjects(rows);
  if (name === 'categories') syncCategories(rows);
  if (name === 'payments') rows.sort((a, b) => b.date - a.date);
  // A balance saved before it was worked out automatically may not match its total and token.
  if (name === 'invoices') {
    rows.forEach((i) => { i.balanceAmount = Math.max(0, (i.totalAmount || 0) - (i.tokenAmount || 0)); });
    syncInvoiceMirrors(rows);
  }
  // A sheet's totals are worked out again, not read as stored: a sheet saved under older
  // arithmetic then adds up in the register exactly as it does when opened.
  if (name === 'costSheets') rows = rows.map(calculateCostSheet);
  if (name === 'audit' || name === 'costSheets') rows.sort((a, b) => String(b.id).localeCompare(String(a.id)));
  return rows;
}

export function fiscalYearTaxSummary(f) {
  // Get current fiscal year (Jul-Jun)
  const m = TODAY.getMonth(), y = TODAY.getFullYear();
  const fyStart = m >= 6 ? new Date(y, 6, 1) : new Date(y - 1, 6, 1);
  const fyEnd = m >= 6 ? new Date(y + 1, 5, 30) : new Date(y, 5, 30);
  const fyRange = { start: fyStart, end: endOfDay(fyEnd > TODAY ? TODAY : fyEnd), label: 'FY', key: 'custom' };

  const taxes = DATA.taxes.filter((t) => inR(t.date, fyRange) && (f.office === 'all' || t.office === f.office));
  const sales = DATA.sales.filter((s) => inR(s.date, fyRange));

  const of = (...types) => taxes.filter((t) => types.indexOf(t.type) >= 0).reduce((a, t) => a + t.amount, 0);
  const advanceTax236K = of('Advance Tax §236K');
  const stampCvt = of('Stamp Duty', 'Capital Value Tax (CVT)');
  const cgt = of('Capital Gains Tax');
  // Withholding tax taken on a sale whose plot has no §236C entry of its own: the same tax as a
  // §236C entry, so the two are one figure, and it is paid at the sale.
  const withholdingTax = sales.reduce((a, s) => a + saleTaxCounted(s), 0);
  const advanceTax236C = of('Advance Tax §236C', 'Withholding Tax') + withholdingTax;
  const totalTax = taxes.reduce((a, t) => a + t.amount, 0) + withholdingTax;
  const otherTax = totalTax - advanceTax236K - stampCvt - cgt - advanceTax236C;
  const totalPaid = taxes.reduce((a, t) => a + t.paid, 0) + withholdingTax;
  const totalPending = taxes.reduce((a, t) => a + t.outstanding, 0);

  return {
    fyLabel: 'FY ' + fyStart.getFullYear() + '–' + fyEnd.getFullYear(),
    fyStart, fyEnd,
    advanceTax236K, advanceTax236C, cgt, withholdingTax, stampCvt, otherTax,
    totalTax, totalPaid, totalPending,
    taxEntries: taxes,
    salesCount: sales.length,
    totalRevenue: sales.reduce((a, s) => a + s.sellingPrice, 0),
  };
}

/* ====================================================================
   TRADING COST SHEET & DEAL CALCULATOR ENGINE
   ==================================================================== */

export function calculateCostSheet(v) {
  // Base Net Buy Cost
  const netBuyCost = Math.max(0, +(v.netBuyCost !== undefined ? v.netBuyCost : v.purchasePrice) || 0);

  // 1. Society / Govt Transfer Cost
  const ndcFee = Math.max(0, +(v.ndcFee !== undefined ? v.ndcFee : 10000));
  const stampDutyPct = v.stampDutyPct !== undefined && v.stampDutyPct !== '' ? +v.stampDutyPct : 1.0;
  const stampDuty = Math.max(0, +(v.stampDuty !== undefined ? v.stampDuty : Math.round(netBuyCost * (stampDutyPct / 100))));
  const cvtPct = v.cvtPct !== undefined && v.cvtPct !== '' ? +v.cvtPct : 1.0;
  const cvt = Math.max(0, +(v.cvt !== undefined ? v.cvt : Math.round(netBuyCost * (cvtPct / 100))));
  const cdaRdaTransferFeePct = v.cdaRdaTransferFeePct !== undefined && v.cdaRdaTransferFeePct !== '' ? +v.cdaRdaTransferFeePct : 0.5;
  const cdaRdaTransferFee = Math.max(0, +(v.cdaRdaTransferFee !== undefined ? v.cdaRdaTransferFee : 0));
  const societyTransferFee = Math.max(0, +(v.societyTransferFee || 0));
  const legalCharges = Math.max(0, +(v.legalCharges || 0));
  const developmentCharges = Math.max(0, +(v.developmentCharges || 0));
  const otherAcquisition = Math.max(0, +(v.otherAcquisition || 0));
  const totalSocietyGovtTransfer = ndcFee + stampDuty + cvt + cdaRdaTransferFee + societyTransferFee + legalCharges + developmentCharges + otherAcquisition;

  // 2. Govt Taxes (Buy Side)
  const buyerFilerStatus = v.buyerFilerStatus || 'Filer';
  const tax236KPct = v.tax236KPct !== undefined && v.tax236KPct !== '' ? +v.tax236KPct : (buyerFilerStatus === 'Non-Filer' ? 12.0 : buyerFilerStatus === 'Late Filer' ? 6.0 : 3.0);
  const tax236K = Math.max(0, +(v.tax236K !== undefined ? v.tax236K : Math.round(netBuyCost * (tax236KPct / 100))));

  // 3. Handling / Expenses
  const handlingExpenses = Math.max(0, +(v.handlingExpenses || 0));
  const renovationRepairs = Math.max(0, +(v.renovationRepairs || 0));
  const maintenanceBills = Math.max(0, +(v.maintenanceBills !== undefined ? v.maintenanceBills : (v.maintenanceHolding || 0)));
  const marketingExpenses = Math.max(0, +(v.marketingExpenses || 0));
  const fuelTravelling = Math.max(0, +(v.fuelTravelling || 0));
  const salaryExpenses = Math.max(0, +(v.salaryExpenses || 0));
  const totalHandlingExpenses = handlingExpenses + renovationRepairs + maintenanceBills + marketingExpenses + fuelTravelling + salaryExpenses;
  const totalCarryingCosts = totalHandlingExpenses;

  // 4. Real Estate Agent Fee (Buy Side)
  const buySideAgentFee = Math.max(0, +(v.buySideAgentFee !== undefined ? v.buySideAgentFee : (v.purchaseBrokerage !== undefined ? v.purchaseBrokerage : Math.round(netBuyCost * 0.01))));
  const purchaseBrokerage = buySideAgentFee;
  const purchaseBrokeragePct = netBuyCost > 0 ? (purchaseBrokerage / netBuyCost) * 100 : (v.purchaseBrokeragePct || 1.0);

  // PURCHASE PRICE (Total Landed / Acquisition Basis = SUM(F6:F20))
  const calculatedPurchasePrice = netBuyCost + totalSocietyGovtTransfer + tax236K + totalHandlingExpenses + buySideAgentFee;
  const purchasePrice = calculatedPurchasePrice;
  const totalLandedCost = purchasePrice;
  const totalAcquisitionExtras = totalSocietyGovtTransfer + tax236K;

  // SALE SIDE & REALIZATION
  const grossSalePrice = Math.max(0, +(v.grossSalePrice !== undefined ? v.grossSalePrice : (v.sellingPrice || 0)));
  const sellingPrice = grossSalePrice;

  const sellerFilerStatus = v.sellerFilerStatus || 'Filer';
  const tax236CPct = v.tax236CPct !== undefined && v.tax236CPct !== '' ? +v.tax236CPct : (sellerFilerStatus === 'Non-Filer' ? 10.0 : sellerFilerStatus === 'Late Filer' ? 6.0 : 3.0);
  const tax236C = Math.max(0, +(v.tax236C !== undefined ? v.tax236C : Math.round(grossSalePrice * (tax236CPct / 100))));

  const sellSideAgentFee = Math.max(0, +(v.sellSideAgentFee !== undefined ? v.sellSideAgentFee : (v.saleBrokerage !== undefined ? v.saleBrokerage : Math.round(grossSalePrice * 0.01))));
  const saleBrokerage = sellSideAgentFee;
  const saleBrokeragePct = grossSalePrice > 0 ? (saleBrokerage / grossSalePrice) * 100 : (v.saleBrokeragePct || 1.0);
  const totalCommissions = buySideAgentFee + sellSideAgentFee;

  // PROFIT & LOSS WATERFALL
  // What it costs to sell (advance tax on sale, the sell-side agent and any other selling cost)
  // comes off the sale price: these are real outflows of the deal, not just figures on the sheet.
  const otherSellingExpenses = Math.max(0, +(v.otherSellingExpenses || 0));
  const saleSideCosts = tax236C + sellSideAgentFee + otherSellingExpenses;
  const netSaleProceeds = grossSalePrice - saleSideCosts;
  const grossProfit = netSaleProceeds - purchasePrice;
  const grossProfitPct = grossSalePrice > 0 ? (grossProfit / grossSalePrice) * 100 : 0;
  const grossMarginPct = grossProfitPct;

  // Capital Gains Tax (CGT - default 15% on Gross Profit)
  const cgtRatePct = v.cgtRatePct !== undefined && v.cgtRatePct !== '' ? +v.cgtRatePct : 15.0;
  const cgtAmount = v.cgtAmount !== undefined && v.cgtAmount !== '' ? +v.cgtAmount : Math.max(0, Math.round(grossProfit * (cgtRatePct / 100)));

  // Zakat & Charity
  const zakat = Math.max(0, +(v.zakat || 0));
  const charity = Math.max(0, +(v.charity || 0));
  // An extra share of office overheads charged to this deal. It is separate from the salary line
  // above (already inside the purchase price), so it defaults to nothing rather than repeating it.
  const officeExpenseDeduction = Math.max(0, +(v.officeExpenseDeduction || 0));

  // NET MARGIN = Gross Profit - CGT - Zakat - Charity - office allocation
  const netMargin = grossProfit - cgtAmount - zakat - charity - officeExpenseDeduction;
  const netProfit = netMargin;
  const netMarginPct = grossSalePrice > 0 ? (netMargin / grossSalePrice) * 100 : 0;
  const roiPct = purchasePrice > 0 ? (netMargin / purchasePrice) * 100 : 0;

  const pDate = parseDate(v.purchaseDate || TODAY);
  const sDate = v.saleDate ? parseDate(v.saleDate) : null;
  const heldDays = sDate ? Math.max(1, Math.round((sDate - pDate) / day)) : (v.heldDays || Math.max(1, Math.round((TODAY - pDate) / day)));
  const annualizedRoiPct = heldDays > 0 ? (roiPct / heldDays) * 365 : roiPct;

  const municipalTax = v.municipalTax !== undefined ? +v.municipalTax : Math.round(grossSalePrice * 0.005);
  const totalSellingExpenses = otherSellingExpenses + municipalTax;
  const totalTaxesToPay = tax236K + tax236C + cgtAmount + stampDuty + cvt + cdaRdaTransferFee;
  const breakEvenPrice = Math.round(purchasePrice + saleSideCosts + cgtAmount + zakat + charity + officeExpenseDeduction);

  return {
    ...v,
    netBuyCost,
    ndcFee,
    stampDuty,
    stampDutyPct,
    cvt,
    cvtPct,
    cdaRdaTransferFee,
    cdaRdaTransferFeePct,
    societyTransferFee,
    legalCharges,
    developmentCharges,
    otherAcquisition,
    totalSocietyGovtTransfer,
    totalAcquisitionExtras,
    buyerFilerStatus,
    tax236K,
    tax236KPct,
    handlingExpenses,
    renovationRepairs,
    maintenanceBills,
    maintenanceHolding: maintenanceBills,
    marketingExpenses,
    fuelTravelling,
    salaryExpenses,
    totalHandlingExpenses,
    totalCarryingCosts,
    buySideAgentFee,
    purchaseBrokerage,
    purchaseBrokeragePct,
    purchasePrice,
    totalLandedCost,
    grossSalePrice,
    sellingPrice,
    sellerFilerStatus,
    tax236C,
    tax236CPct,
    sellSideAgentFee,
    saleBrokerage,
    saleBrokeragePct,
    totalCommissions,
    saleSideCosts,
    netSaleProceeds,
    grossProfit,
    grossProfitPct,
    grossMarginPct,
    cgtRatePct,
    cgtAmount,
    zakat,
    charity,
    officeExpenseDeduction,
    netMargin,
    netProfit,
    netMarginPct,
    roiPct,
    annualizedRoiPct,
    totalTaxesToPay,
    municipalTax,
    otherSellingExpenses,
    totalSellingExpenses,
    breakEvenPrice,
    purchaseDate: pDate,
    saleDate: sDate,
    heldDays,
  };
}

export function computeSensitivityMatrix(cs) {
  const basePrice = cs.sellingPrice;
  const multipliers = [
    { label: '-10% Bear Drop', factor: 0.90 },
    { label: '-5% Buyer Negotiation', factor: 0.95 },
    { label: 'Current Target (Base)', factor: 1.00 },
    { label: '+5% Market Uptick', factor: 1.05 },
    { label: '+10% Bull Peak', factor: 1.10 },
  ];
  return multipliers.map((m) => {
    const sPrice = Math.round(basePrice * m.factor);
    // A computed sheet carries grossSalePrice, which wins over sellingPrice — set both.
    const updated = calculateCostSheet({ ...cs, grossSalePrice: sPrice, sellingPrice: sPrice });
    return {
      label: m.label,
      factor: m.factor,
      sellingPrice: sPrice,
      grossProfit: updated.grossProfit,
      grossMarginPct: updated.grossMarginPct,
      totalTaxesToPay: updated.totalTaxesToPay,
      totalCommissions: updated.totalCommissions,
      netProfit: updated.netProfit,
      netMarginPct: updated.netMarginPct,
      roiPct: updated.roiPct,
    };
  });
}

export function solveSellingPriceForTargetMargin(cs, targetMarginPct) {
  const targetM = targetMarginPct / 100;
  const cRate = cs.sellerFilerStatus === 'Non-Filer' ? 0.10 : cs.sellerFilerStatus === 'Late Filer' ? 0.06 : 0.03;
  const v = (cs.saleBrokeragePct + (cRate * 100) + 0.5) / 100;
  const cgtRate = (cs.cgtRatePct || 0) / 100;
  const denom = 1 - v - cgtRate - targetM;
  if (denom <= 0.05) {
    return Math.round(cs.totalLandedCost * (1 + targetM * 1.5));
  }
  const price = (cs.otherSellingExpenses + cs.totalLandedCost * (1 - cgtRate)) / denom;
  return Math.round(price);
}

export function computeTradingKPIs(sheets) {
  const total = sheets.length;
  const closed = sheets.filter((s) => s.status === 'Sold');
  const active = sheets.filter((s) => s.status === 'Active Deal');

  const totalCapitalInvested = sheets.reduce((a, s) => a + s.totalLandedCost, 0);
  const totalRevenue = closed.reduce((a, s) => a + s.sellingPrice, 0);
  const realizedGrossProfit = closed.reduce((a, s) => a + s.grossProfit, 0);
  const realizedNetProfit = closed.reduce((a, s) => a + s.netProfit, 0);
  const projectedRevenue = active.reduce((a, s) => a + s.sellingPrice, 0);
  const projectedNetProfit = active.reduce((a, s) => a + s.netProfit, 0);

  const totalTaxesPaid = sheets.reduce((a, s) => a + s.totalTaxesToPay, 0);
  const totalCommissionsPaid = sheets.reduce((a, s) => a + s.totalCommissions, 0);

  const blendedGrossMargin = totalRevenue > 0 ? (realizedGrossProfit / totalRevenue) * 100 : 0;
  const blendedNetMargin = totalRevenue > 0 ? (realizedNetProfit / totalRevenue) * 100 : 0;
  const blendedRoi = closed.reduce((a, s) => a + s.totalLandedCost, 0) > 0
    ? (realizedNetProfit / closed.reduce((a, s) => a + s.totalLandedCost, 0)) * 100
    : 0;

  const avgHoldingDays = closed.length > 0
    ? Math.round(closed.reduce((a, s) => a + s.heldDays, 0) / closed.length)
    : 0;

  return {
    totalDeals: total,
    closedDeals: closed.length,
    activeDeals: active.length,
    totalCapitalInvested,
    totalRevenue,
    realizedGrossProfit,
    realizedNetProfit,
    projectedRevenue,
    projectedNetProfit,
    totalTaxesPaid,
    totalCommissionsPaid,
    blendedGrossMargin,
    blendedNetMargin,
    blendedRoi,
    avgHoldingDays,
  };
}

export function saveCostSheet(raw, user) {
  const cs = calculateCostSheet(raw);
  // A mirror remembers which of its lines differ from the original; the rest follow it.
  const src = cs.mirrorOf ? realSheet(cs.mirrorOf) : null;
  if (src) cs.mirrorEdits = sheetEdits(cs, src);
  if (!cs.id) {
    // Mirrors are named after their deal (M-P-0001), so only CS- numbers count here.
    cs.id = nextId(DATA.costSheets.filter((s) => String(s.id).startsWith('CS-')), 'CS-', 4);
  }
  const idx = DATA.costSheets.findIndex((x) => x.id === cs.id);

  // A linked property takes the sheet's base price and, while unsold, its expected sale value.
  // Nothing else is written back: the other lines of a linked sheet are read from the expense,
  // tax and sale records, so copying them onto the property would count them twice.
  // A mirror is only a copy, so it never writes anything back to the property.
  const p = cs.mirrorOf ? null : DATA.properties.find((x) => x.id === cs.propertyId);
  if (p) {
    p.price = cs.netBuyCost;
    recomputeProperty(p);
    if (p.status !== 'Sold' && cs.grossSalePrice > 0) p.currentValue = cs.grossSalePrice;
    saveRecordToFirestore('properties', p.id, p);
    // What the records say as it is saved: from here on the sheet takes in only what they change.
    cs.recorded = sheetFromRecords(p.id).recorded;
  }

  if (idx >= 0) {
    DATA.costSheets[idx] = cs;
  } else {
    DATA.costSheets.unshift(cs);
  }
  saveRecordToFirestore('costSheets', cs.id, cs);

  const au = {
    id: nextId(DATA.audit, 'AU-', 4),
    date: TODAY,
    txnId: cs.id,
    action: idx >= 0 ? 'Edited' : 'Created',
    user: user || ACTOR,
    entity: 'Trading Cost Sheet',
    prevAmount: null,
    newAmount: cs.netProfit,
    note: `Cost Sheet ${cs.id} (${cs.name}) ${idx >= 0 ? 'updated' : 'created'} with net margin ${cs.netMarginPct.toFixed(1)}%` +
      (cs.mirrorOf ? ` (mirror of ${cs.mirrorOf})` : ''),
    manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);

  return cs;
}


/* ====================================================================
   COST SHEETS FROM THE RECORDS
   A property's cost sheet is read from what has actually been recorded:
   its purchase, its sale, and every expense, tax and Zakat entry linked
   to it. A saved sheet follows those records: whatever they change, it
   takes in by itself.
   ==================================================================== */
const ZERO_LINES = {
  ndcFee: 0, stampDuty: 0, cvt: 0, cdaRdaTransferFee: 0, societyTransferFee: 0, legalCharges: 0,
  developmentCharges: 0, otherAcquisition: 0, tax236K: 0, handlingExpenses: 0, renovationRepairs: 0,
  maintenanceBills: 0, marketingExpenses: 0, fuelTravelling: 0, salaryExpenses: 0, buySideAgentFee: 0,
  tax236C: 0, sellSideAgentFee: 0, otherSellingExpenses: 0, cgtAmount: 0, zakat: 0, charity: 0,
  officeExpenseDeduction: 0,
};
export const SHEET_AMOUNT_KEYS = Object.keys(ZERO_LINES).concat(['netBuyCost', 'grossSalePrice']);
/** The deal details a sheet reads from its property and its sale. */
export const SHEET_DETAIL_KEYS = ['name', 'project', 'city', 'type', 'size', 'status', 'office', 'seller', 'buyer', 'purchaseDate', 'saleDate'];

export function sheetFromRecords(propertyId) {
  const p = DATA.properties.find((x) => x.id === propertyId);
  if (!p) return null;
  const sale = DATA.sales.find((s) => s.propertyId === p.id);
  const ex = p.extras || {};
  const v = {
    ...ZERO_LINES,
    id: '', propertyId: p.id, name: p.name, project: p.project, city: p.location, type: p.type,
    size: p.size, office: p.office, seller: p.seller, purchaseDate: p.purchaseDate,
    netBuyCost: p.price,
    societyTransferFee: ex.registration || 0, legalCharges: ex.legal || 0,
    developmentCharges: ex.development || 0, otherAcquisition: ex.other || 0,
    grossSalePrice: sale ? sale.sellingPrice : p.currentValue || 0,
    saleDate: sale ? sale.date : null, buyer: sale ? sale.buyer : '',
    status: p.status === 'Sold' ? 'Sold' : 'Active Deal',
    sources: [],
  };
  // Each record behind the sheet: which line it fills, and how much of it has been paid.
  const src = (id, what, amount, key, paid = amount, date = null) => v.sources.push({ id, what, amount, key, paid, date });

  DATA.expenses.filter((e) => e.propertyId === p.id && NON_EXPENSE_GROUPS.indexOf(e.group) < 0).forEach((e) => {
    // An expense entered from a cost sheet goes back on the very line it came from.
    if (e.sheetLine && ZERO_LINES[e.sheetLine] !== undefined) {
      v[e.sheetLine] += e.amount;
      src(e.id, e.category, e.amount, e.sheetLine, e.paid || 0, e.date);
      return;
    }
    const text = (e.category || '') + ' ' + (e.note || '');
    const line = DEAL_COST_LINES.find((l) => l[2].test(text));
    const key = line ? line[1] : 'handlingExpenses';
    v[key] += e.amount;
    src(e.id, (line ? line[0] : 'Other handling') + ' · ' + e.category, e.amount, key, e.paid || 0, e.date);
  });
  let saleTaxRecorded = false;
  DATA.taxes.filter((t) => t.propertyId === p.id).forEach((t) => {
    const key = t.type === 'Advance Tax §236K' ? 'tax236K'
      : t.type === 'Advance Tax §236C' || t.type === 'Withholding Tax' ? 'tax236C'
      : t.type === 'Capital Gains Tax' ? 'cgtAmount'
      : t.type === 'Stamp Duty' ? 'stampDuty' : t.type === 'Capital Value Tax (CVT)' ? 'cvt' : 'otherAcquisition';
    if (key === 'tax236C') saleTaxRecorded = true;
    v[key] += t.amount;
    src(t.id, t.type, t.amount, key, t.paid || 0, t.date);
  });
  DATA.zakat.filter((z) => z.propertyId === p.id).forEach((z) => {
    v.zakat += z.amount || 0;
    src(z.id, 'Zakat', z.amount || 0, 'zakat', z.amount || 0, z.date);
  });
  // Agent fees come from the commission ledger, both sides of the deal. A sale's commission
  // with no ledger entry of its own still counts.
  const comms = DATA.commissions.filter((c) => c.propertyId === p.id);
  comms.forEach((c) => {
    const key = c.txnType === 'Purchase' ? 'buySideAgentFee' : 'sellSideAgentFee';
    v[key] += c.amount || 0;
    src(c.id, 'Agent commission on ' + (c.txnType === 'Purchase' ? 'purchase' : 'sale') + ' · ' + c.agent, c.amount || 0, key, c.paid || 0, c.date);
  });
  if (sale) {
    if (sale.commission && !comms.some((c) => c.txnType === 'Sale' && c.source !== 'ledger')) {
      v.sellSideAgentFee += sale.commission;
      src(sale.id, 'Agent commission on sale', sale.commission, 'sellSideAgentFee');
    }
    // Tax typed on the sale form, unless the same tax has its own tax entry.
    // Withholding tax is taken at the sale itself, so it counts as paid.
    if (!saleTaxRecorded && sale.tax) { v.tax236C += sale.tax; src(sale.id, 'Withholding tax on sale', sale.tax, 'tax236C'); }
    if (sale.otherExpenses) { v.otherSellingExpenses += sale.otherExpenses; src(sale.id, 'Other selling expenses', sale.otherExpenses, 'otherSellingExpenses'); }
  }
  const cs = calculateCostSheet(v);
  // What the records say, kept on a sheet so it can tell later which of it they changed.
  // Details are kept as recorded (an unknown purchase date is not today's date), and a blank one
  // as null: the database keeps a field left undefined at its old value.
  cs.recorded = {};
  SHEET_AMOUNT_KEYS.forEach((k) => { cs.recorded[k] = Math.round(cs[k] || 0); });
  SHEET_DETAIL_KEYS.forEach((k) => { cs.recorded[k] = v[k] == null ? null : v[k]; });
  return cs;
}

/** A linked sheet brought up to date with its property's records: each line or detail whose
    recorded value has changed since the sheet last took it in takes the new value, while one
    typed over on the sheet keeps what was typed until its own records change. So linking another
    property brings in that property's details and amounts. A sheet saved before it kept what the
    records said takes every value the records have. Mirrors follow their original instead.
    Returns the very same sheet when there is nothing to change. */
export function syncSheetWithRecords(cs) {
  if (!cs || !cs.propertyId || cs.mirrorOf) return cs;
  const fresh = sheetFromRecords(cs.propertyId);
  if (!fresh) return cs;
  const was = cs.recorded || {};
  const moved = Object.keys(fresh.recorded).filter((k) => !sameValue(fresh.recorded[k], was[k]));
  if (!moved.length) return cs;
  const next = { ...cs, recorded: fresh.recorded };
  moved.forEach((k) => { next[k] = fresh[k] == null ? null : fresh[k]; });
  // CGT left at its rate keeps following it, so a different sale price or sale tax moves it too.
  const cgtAtRate = (cs.cgtAmount || 0) > 0
    && Math.abs((cs.cgtAmount || 0) - Math.max(0, Math.round(((cs.grossProfit || 0) * (cs.cgtRatePct || 0)) / 100))) <= 1;
  if (cgtAtRate && moved.indexOf('cgtAmount') < 0) next.cgtAmount = '';
  return calculateCostSheet(next);
}

/** Every saved cost sheet brought up to date with its property's records, and stored.
    Run only once every ledger has loaded: records still on their way would read as deleted.
    Returns how many sheets changed. */
export function syncSheetsWithRecords() {
  let changed = 0;
  DATA.costSheets.forEach((cs, i) => {
    const next = syncSheetWithRecords(cs);
    if (next === cs) return;
    DATA.costSheets[i] = next;
    saveRecordToFirestore('costSheets', next.id, next);
    changed++;
  });
  return changed;
}

/** Every deal: the saved cost sheets, plus a sheet read from the records for each property
    that has none saved yet. Mirrors are copies, not deals, so they are left out. */
export function dealSheets() {
  const real = DATA.costSheets.filter((s) => !s.mirrorOf);
  const out = real.slice();
  const covered = new Set(real.map((s) => s.propertyId).filter(Boolean));
  DATA.properties.forEach((p) => {
    if (covered.has(p.id)) return;
    const cs = sheetFromRecords(p.id);
    if (cs) out.push({ ...cs, id: p.id, fromRecords: true });
  });
  return out;
}

/** The saved mirrors: cost sheets started as a copy of another one, each brought up to date
    with its original. */
export function mirrorSheets() {
  return DATA.costSheets.filter((s) => s.mirrorOf).map(syncSheetMirror);
}

/** The fields of a cost sheet a mirror follows. Its number and attachments are its own. */
export const SHEET_MIRROR_KEYS = SHEET_AMOUNT_KEYS.concat(['propertyId'], SHEET_DETAIL_KEYS);

/** The real sheet of a deal: saved under its own number, else the one saved for that property,
    else read from the property's records. */
export function realSheet(key) {
  return DATA.costSheets.find((s) => s.id === key && !s.mirrorOf)
    || DATA.costSheets.find((s) => s.propertyId === key && !s.mirrorOf)
    || sheetFromRecords(key);
}

/** What a plot cost all in, as its cost sheet adds it up: the price with its fees, taxes,
    expenses and buy-side agent fee. Every page that shows what stock cost uses this. */
export function landedCost(propertyId) {
  const cs = realSheet(propertyId);
  return cs ? cs.purchasePrice : 0;
}

/* ====================================================================
   AMOUNTS ONLY ON A COST SHEET
   A line typed on a sheet that no record holds counts on the sheet but
   not in profit, tax or cash. Each such line can be entered on its own
   ledger in one go, after which the sheet and the reports agree.
   ==================================================================== */
/** The ledger each line of a cost sheet goes on. */
export const SHEET_LINE_RECORDS = {
  ndcFee: ['expense', 'Property Expenses', 'Transfer Charges'],
  stampDuty: ['tax', 'Stamp Duty'],
  cvt: ['tax', 'Capital Value Tax (CVT)'],
  cdaRdaTransferFee: ['expense', 'Property Expenses', 'Transfer Charges'],
  societyTransferFee: ['expense', 'Property Expenses', 'Transfer Charges'],
  legalCharges: ['expense', 'Property Expenses', 'Legal Fees'],
  developmentCharges: ['expense', 'Property Expenses', 'Development Charges'],
  otherAcquisition: ['expense', 'Property Expenses', 'Documentation'],
  tax236K: ['tax', 'Advance Tax §236K'],
  renovationRepairs: ['expense', 'Property Expenses', 'Renovation'],
  maintenanceBills: ['expense', 'Property Expenses', 'Property Maintenance'],
  marketingExpenses: ['expense', 'Marketing Expenses', 'Property Portals'],
  fuelTravelling: ['expense', 'Employee Expenses', 'Travel'],
  salaryExpenses: ['expense', 'Employee Expenses', 'Allowances'],
  handlingExpenses: ['expense', 'Property Expenses', 'Property Maintenance'],
  buySideAgentFee: ['commission', 'Purchase'],
  tax236C: ['saleTax'],
  sellSideAgentFee: ['commission', 'Sale'],
  otherSellingExpenses: ['expense', 'Property Expenses', 'Selling Costs'],
  cgtAmount: ['tax', 'Capital Gains Tax'],
  zakat: ['zakat'],
  charity: ['expense', 'Other Expenses', 'Charity'],
};
/** Lines about the sale: on an unsold plot they are estimates, so they wait for the sale. */
const SALE_SIDE_LINES = ['tax236C', 'sellSideAgentFee', 'otherSellingExpenses', 'cgtAmount', 'zakat', 'charity'];

/** Where a linked cost sheet and its property's records disagree, line by line: a positive
    difference is typed on the sheet only, a negative one is recorded but not on the sheet.
    A sold plot's sale price comes from its sale. */
export function sheetGaps(cs) {
  if (!cs || !cs.propertyId || cs.mirrorOf) return [];
  const fresh = sheetFromRecords(cs.propertyId);
  if (!fresh) return [];
  const sale = DATA.sales.find((s) => s.propertyId === cs.propertyId);
  const out = Object.keys(SHEET_LINE_RECORDS)
    .filter((k) => sale || SALE_SIDE_LINES.indexOf(k) < 0)
    .map((k) => ({ key: k, how: SHEET_LINE_RECORDS[k][0], onSheet: Math.round(cs[k] || 0), recorded: Math.round(fresh[k] || 0) }));
  if (sale) out.push({ key: 'grossSalePrice', how: 'sheet', onSheet: Math.round(cs.grossSalePrice || 0), recorded: Math.round(sale.sellingPrice) });
  return out.map((x) => ({ ...x, diff: x.onSheet - x.recorded })).filter((x) => x.diff !== 0);
}

/** Bring a saved cost sheet and the ledgers into line: every amount typed only on the sheet is
    entered on its ledger (tax, expense, commission or Zakat), paid from the account given or left to pay; a line the records hold
    more of takes the recorded amount. Returns the sheet and what was entered. */
export function recordSheetGaps(sheetId, opts = {}) {
  const idx = DATA.costSheets.findIndex((s) => s.id === sheetId && !s.mirrorOf);
  if (idx < 0) throw new Error('Save the cost sheet first.');
  const cs = DATA.costSheets[idx];
  const p = DATA.properties.find((x) => x.id === cs.propertyId);
  if (!p) throw new Error('Link the cost sheet to its property first.');
  const sale = DATA.sales.find((s) => s.propertyId === p.id);
  const made = [];
  const back = {};
  sheetGaps(cs).forEach((g) => {
    if (g.diff < 0 || g.how === 'sheet') { back[g.key] = g.recorded; return; }
    const [how, a, b] = SHEET_LINE_RECORDS[g.key];
    const date = SALE_SIDE_LINES.indexOf(g.key) >= 0 && sale ? sale.date : p.purchaseDate;
    // Withholding tax gets a tax entry of its own, paid like the rest. The plot's tax entries then
    // stand for it in place of the figure on the sale, so the entry carries the whole amount.
    const ownSaleTax = DATA.taxes.some((t) => t.propertyId === p.id && (t.type === 'Advance Tax §236C' || t.type === 'Withholding Tax'));
    const amount = how === 'saleTax' && !ownSaleTax ? g.onSheet : g.diff, paid = opts.paid ? amount : 0;
    const pay = { date, method: opts.method || 'Bank Transfer', account: opts.account, office: p.office };
    const note = 'From cost sheet ' + cs.id;
    if (how === 'tax' || how === 'saleTax') {
      const t = addTax({ ...pay, type: how === 'tax' ? a : 'Advance Tax §236C', propertyId: p.id, amount, paid, dueDate: date, ref: cs.id });
      made.push(t.id);
    } else if (how === 'expense') {
      const e = addExpense({ ...pay, group: a, category: b, propertyId: p.id, amount, paid, vendor: 'As per cost sheet', note, sheetLine: g.key });
      made.push(e.id);
    } else if (how === 'commission') {
      const agent = a === 'Sale' && sale && sale.agentId ? sale.agentId : '';
      const c = addCommission({ ...pay, side: a, propertyId: p.id, agentId: agent, agentName: agent ? '' : 'Agent / dealer', amount, paid, note });
      made.push(c.id);
    } else if (how === 'zakat') {
      const z = addZakat({ ...pay, period: fyLabel(fyStartYear(date)), eligibleAssets: 0, liabilities: 0, rate: '', amount, propertyId: p.id, ref: cs.id });
      made.push(z.id);
    }
  });
  // The sheet now agrees with its records, and remembers them as they stand.
  const fresh = sheetFromRecords(p.id);
  const next = calculateCostSheet({ ...cs, ...back, recorded: fresh.recorded });
  DATA.costSheets[idx] = next;
  saveRecordToFirestore('costSheets', next.id, next);
  const au = {
    id: nextId(DATA.audit, 'AU-', 4), date: TODAY, txnId: next.id, action: 'Edited', user: ACTOR,
    entity: 'Trading Cost Sheet', prevAmount: cs.netMargin, newAmount: next.netMargin,
    note: 'Cost sheet ' + next.id + ' matched to its records' + (made.length ? ': entered ' + made.join(', ') : ''), manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);
  return { sheet: next, made, fromRecords: Object.keys(back) };
}

/** What a plot's saved cost sheet holds that is not recorded yet, besides the withholding tax a
    sale brings: what a sale entered in the sales register can enter on the ledgers with it. */
export function sheetCostsToRecord(propertyId) {
  const cs = DATA.costSheets.find((s) => s.propertyId === propertyId && !s.mirrorOf);
  const fresh = cs ? sheetFromRecords(propertyId) : null;
  if (!fresh) return null;
  const amount = Object.keys(SHEET_LINE_RECORDS).filter((k) => k !== 'tax236C')
    .reduce((a, k) => a + Math.max(0, Math.round((cs[k] || 0) - (fresh[k] || 0))), 0);
  return { sheet: cs.id, amount };
}

/** The fields of a mirror cost sheet that differ from its original. */
const sheetEdits = (cs, src) => SHEET_MIRROR_KEYS.filter((k) => !sameValue(cs[k], src[k]));

/** A mirror cost sheet brought up to date with its original, keeping the lines changed on it.
    A mirror saved before changes were tracked has none, so it matches its original again. */
export function syncSheetMirror(m) {
  const src = realSheet(m.mirrorOf);
  if (!src) return m;
  const edits = m.mirrorEdits || [];
  const next = { ...m };
  SHEET_MIRROR_KEYS.forEach((k) => { if (edits.indexOf(k) < 0) next[k] = src[k]; });
  return calculateCostSheet(next);
}

/** Every sale and purchase invoice, and every deal's cost sheet, has a mirror. Missing ones are
    made here, named after their original (M-INV-00003, M-P-0001), so the same mirror can never
    be made twice — not even by two devices at once. Run only once every ledger has loaded.
    Returns how many mirrors were made. */
export function ensureMirrors() {
  let made = 0;
  // A mirror whose original is gone (its plot, sheet or invoice was deleted) is cleared away, so
  // it neither lingers in the lists nor attaches itself to a new record that reuses the number.
  const orphanSheets = DATA.costSheets.filter((s) => s.mirrorOf
    && !DATA.costSheets.some((x) => x.id === s.mirrorOf && !x.mirrorOf)
    && !DATA.properties.some((p) => p.id === s.mirrorOf)).map((s) => s.id);
  orphanSheets.forEach((id) => removeFrom('costSheets', id));
  const orphanInvoices = DATA.invoices.filter((i) => i.mirrorOf && !DATA.invoices.some((x) => x.id === i.mirrorOf)).map((i) => i.id);
  orphanInvoices.forEach((id) => removeFrom('invoices', id));
  const mirroredInvoices = new Set(DATA.invoices.filter((i) => i.mirrorOf).map((i) => i.mirrorOf));
  DATA.invoices
    .filter((i) => !i.mirrorOf && (i.type === 'sale' || i.type === 'purchase') && !mirroredInvoices.has(i.id))
    .forEach((src) => {
      const id = 'M-' + src.id;
      if (DATA.invoices.some((i) => i.id === id)) return;
      const m = { ...src, id, mirrorOf: src.id, mirrorEdits: [], saleId: null, attachments: [], manual: true };
      DATA.invoices.push(m);
      saveRecordToFirestore('invoices', id, m);
      made++;
    });

  // A deal is known by its saved sheet's number, else by its property (a sheet read from records).
  const dealKey = (s) => (s ? s.id || s.propertyId : null);
  const mirroredDeals = new Set(DATA.costSheets.filter((s) => s.mirrorOf).map((m) => dealKey(realSheet(m.mirrorOf))));
  dealSheets().forEach((deal) => {
    const key = deal.fromRecords ? deal.propertyId : deal.id;
    if (!key || mirroredDeals.has(key)) return;
    const id = 'M-' + key;
    const src = realSheet(key);
    if (!src || DATA.costSheets.some((s) => s.id === id)) return;
    const { sources, fromRecords, recorded, ...rest } = src;
    const m = calculateCostSheet({ ...rest, id, mirrorOf: key, mirrorEdits: [], attachments: [] });
    DATA.costSheets.unshift(m);
    saveRecordToFirestore('costSheets', id, m);
    made++;
  });
  return made;
}

/** Drop every change made on a mirror cost sheet, so it matches its original again. */
export function resetSheetMirror(id) {
  const idx = DATA.costSheets.findIndex((s) => s.id === id && s.mirrorOf);
  if (idx < 0) throw new Error('Mirror cost sheet ' + id + ' not found');
  const dropped = (DATA.costSheets[idx].mirrorEdits || []).length;
  const cs = syncSheetMirror({ ...DATA.costSheets[idx], mirrorEdits: [] });
  DATA.costSheets[idx] = cs;
  saveRecordToFirestore('costSheets', cs.id, cs);
  const au = {
    id: nextId(DATA.audit, 'AU-', 4), date: TODAY, txnId: cs.id, action: 'Edited', user: ACTOR,
    entity: 'Trading Cost Sheet', prevAmount: null, newAmount: cs.netProfit,
    note: `Mirror ${cs.id} reset to match ${cs.mirrorOf} (${dropped} change${dropped === 1 ? '' : 's'} dropped)`, manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);
  return cs;
}

/* ====================================================================
   TASKS & TASK PROJECTS — a to-do list grouped into projects
   (Personal, A&Sons work, Property business ...). A project's progress is
   the share of its tasks that are completed.
   ==================================================================== */
export const TASK_STATUSES = ['Open', 'Working', 'Pending Review', 'Completed', 'Cancelled'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const PROJECT_TYPES = ['Internal', 'External', 'Personal', 'Other'];

/** People tasks have been given to, then the agents and the signed-in user, for picking an assignee. */
export function taskAssignees() {
  const names = DATA.tasks.map((t) => t.assignee).concat(DATA.agents.map((a) => a.name), [ACTOR]).filter(Boolean);
  return Array.from(new Set(names));
}

/** How far a due date is: "today", "in 3 days" or "2 days late". */
export function dueIn(d) {
  if (!(d instanceof Date)) return '';
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - TODAY) / day);
  if (days === 0) return 'due today';
  return days > 0 ? 'in ' + days + (days === 1 ? ' day' : ' days') : -days + (days === -1 ? ' day' : ' days') + ' late';
}

/** A task's status as shown: an unfinished task past its due date is Overdue. */
export function taskStatus(t) {
  const st = t.status || (t.done ? 'Completed' : 'Open');
  if (st !== 'Completed' && st !== 'Cancelled' && t.date instanceof Date && t.date < TODAY) return 'Overdue';
  return st;
}

function taskBody(v) {
  const text = String(v.text || '').trim();
  if (!text) throw new Error('Write the task subject first.');
  const status = TASK_STATUSES.indexOf(v.status) >= 0 ? v.status : 'Open';
  const proj = v.projectId ? DATA.taskProjects.find((p) => p.id === v.projectId) : null;
  return {
    text, status, done: status === 'Completed',
    priority: TASK_PRIORITIES.indexOf(v.priority) >= 0 ? v.priority : 'Low',
    projectId: proj ? proj.id : null, project: proj ? proj.name : '',
    assignee: String(v.assignee || '').trim(),
    startDate: v.startDate ? parseDate(v.startDate) : null,
    date: v.date ? parseDate(v.date) : null,
    // The plan: hours of work and what it is worth or will cost; then the hours spent so far and
    // how far along it is, as the person doing it declares it.
    plannedHours: num(v.plannedHours), planWorth: num(v.planWorth), planCost: num(v.planCost),
    timeSpent: num(v.timeSpent), progress: status === 'Completed' ? 100 : Math.max(0, Math.min(100, num(v.progress))),
    description: v.description || '',
  };
}
const num = (x) => (x === '' || x == null || isNaN(+x) ? 0 : +x);

/** How far along a task is: completed is 100%, else what was declared, else hours spent of hours planned. */
export function taskProgress(t) {
  if (taskStatus(t) === 'Completed') return 100;
  if (t.progress > 0) return Math.min(100, t.progress);
  return t.plannedHours > 0 ? Math.min(100, Math.round(((t.timeSpent || 0) / t.plannedHours) * 100)) : 0;
}

/** Whether a task falls in a period: its span, from its start (or when it was made) to its deadline, touches it. */
export function taskInRange(t, r) {
  const from = t.startDate || t.createdAt || t.date;
  const to = t.date || t.startDate || t.createdAt;
  if (!(from instanceof Date) && !(to instanceof Date)) return false;
  const a = from instanceof Date ? from : to, b = to instanceof Date ? to : from;
  return Math.min(a, b) <= r.end && Math.max(a, b) >= r.start;
}

/** Total tasks, how many were achieved (completed), and the success ratio; cancelled ones count neither way. */
export function taskTotals(list) {
  const live = list.filter((t) => taskStatus(t) !== 'Cancelled');
  const achieved = live.filter((t) => taskStatus(t) === 'Completed').length;
  const sum = (k) => live.reduce((a, t) => a + (t[k] || 0), 0);
  return {
    total: live.length, achieved, ratio: live.length ? (achieved / live.length) * 100 : 0,
    overdue: live.filter((t) => taskStatus(t) === 'Overdue').length,
    plannedHours: sum('plannedHours'), planWorth: sum('planWorth'), planCost: sum('planCost'), timeSpent: sum('timeSpent'),
  };
}

export function addTask(v) {
  const t = {
    id: nextId(DATA.tasks, 'TK-', 5), ...taskBody(v),
    doneAt: null, createdBy: ACTOR, createdAt: new Date(),
  };
  if (t.done) t.doneAt = new Date();
  DATA.tasks.push(t);
  saveRecordToFirestore('tasks', t.id, t);
  return t;
}

export function updateTask(id, patch) {
  const t = mustFind(DATA.tasks, id, 'Task');
  const wasDone = t.status === 'Completed' || t.done;
  // A quick tick sends only { done }; the form sends every field.
  const next = patch.done !== undefined && patch.status === undefined
    ? { ...t, status: patch.done ? 'Completed' : (t.status === 'Completed' ? 'Open' : t.status || 'Open') }
    : { ...t, ...patch };
  Object.assign(t, taskBody({ ...next, date: next.date === undefined ? t.date : next.date }));
  if (t.done && !wasDone) t.doneAt = new Date();
  if (!t.done) t.doneAt = null;
  saveRecordToFirestore('tasks', t.id, t);
  return t;
}

/* ====================================================================
   DELETING — a record entered by mistake can be removed. Money it moved
   is voided on the cash ledger first (the payments stay on record as
   voided, so cash in hand is right again), anything that exists only
   because of it goes with it, and the deletion is logged in the audit
   trail. A delete that would leave other records pointing at nothing is
   refused with what to do first.
   ==================================================================== */
const voidLinked = (key) =>
  DATA.payments.filter((p) => p.settleKey === key && p.status !== 'Voided').forEach((p) => voidPayment(p.id));

function removeFrom(coll, id) {
  const i = DATA[coll].findIndex((x) => x.id === id);
  if (i >= 0) DATA[coll].splice(i, 1);
  deleteRecordFromFirestore(coll, id);
}

function logDelete(id, entity, amount, note) {
  const au = {
    id: nextId(DATA.audit, 'AU-', 4), date: TODAY, txnId: id, action: 'Deleted', user: ACTOR,
    entity, prevAmount: amount == null ? null : amount, newAmount: 0, note, manual: true,
  };
  DATA.audit.unshift(au);
  saveRecordToFirestore('audit', au.id, au);
}

/** The ledgers whose records can be deleted from their register. */
export const DELETABLE = ['properties', 'sales', 'expenses', 'taxes', 'zakat', 'bills', 'salaries', 'commissions', 'invoices', 'agents', 'costSheets', 'income'];

export function deleteRecord(coll, id) {
  const rec = (DATA[coll] || []).find((x) => x.id === id);
  if (!rec) throw new Error(id + ' was not found.');
  if (coll === 'properties') {
    const sale = DATA.sales.find((s) => s.propertyId === id);
    if (sale) throw new Error(rec.name + ' has sale ' + sale.id + ' — delete the sale first.');
    const linked = [DATA.expenses, DATA.taxes, DATA.zakat, DATA.commissions].flatMap((arr) => arr.filter((x) => x.propertyId === id));
    if (linked.length)
      throw new Error(rec.name + ' still has ' + linked.map((x) => x.id).join(', ') + ' picked for it — delete those first, or pick another property on them.');
    voidLinked('prop:' + id);
    // Its cost sheets and their mirrors are about this property only.
    const sheets = DATA.costSheets.filter((s) => s.propertyId === id || s.mirrorOf === id).map((s) => s.id);
    DATA.costSheets.filter((s) => sheets.indexOf(s.mirrorOf) >= 0).forEach((s) => sheets.push(s.id));
    Array.from(new Set(sheets)).forEach((sid) => removeFrom('costSheets', sid));
    removeFrom('properties', id);
    logDelete(id, 'Property', rec.totalCost, 'Property ' + id + ' (' + rec.name + ') deleted; payments to the seller voided');
    return rec;
  }
  if (coll === 'sales') {
    voidLinked('sale:' + id);
    // The sale's own commission entry goes with it; one entered in the commission ledger stays.
    DATA.commissions.filter((c) => c.propertyId === rec.propertyId && c.txnType === 'Sale' && c.source !== 'ledger').forEach((c) => {
      voidLinked('comm:' + c.id);
      removeFrom('commissions', c.id);
    });
    const p = DATA.properties.find((x) => x.id === rec.propertyId);
    if (p) {
      p.status = 'Available';
      saveRecordToFirestore('properties', p.id, p);
    }
    removeFrom('sales', id);
    logDelete(id, 'Sale', rec.sellingPrice, 'Sale ' + id + ' of ' + rec.property + ' deleted; its receipts voided and the property is available again');
    return rec;
  }
  if (coll === 'commissions' && rec.source !== 'ledger') {
    const sale = DATA.sales.find((s) => s.propertyId === rec.propertyId);
    throw new Error('This commission comes from ' + (sale ? 'sale ' + sale.id : 'a sale') + ' — edit that sale (no agent) or delete it.');
  }
  if ((coll === 'invoices' || coll === 'costSheets') && rec.mirrorOf)
    throw new Error('A mirror goes with its original — delete ' + rec.mirrorOf + ' instead, or reset the mirror to match it.');
  if (coll === 'agents') {
    const used = DATA.sales.filter((s) => s.agentId === id).length + DATA.commissions.filter((c) => c.agentId === id).length;
    if (used) throw new Error(rec.name + ' has sales or commission on record — those keep the agent, so the agent cannot be deleted.');
  }
  const settle = { expenses: 'exp:', taxes: 'tax:', zakat: 'zakat:', bills: 'bill:', salaries: 'sal:', commissions: 'comm:', income: 'inc:' }[coll];
  if (settle) voidLinked(settle + id);
  // An invoice or a saved cost sheet takes its mirrors with it.
  if (coll === 'invoices' || coll === 'costSheets') DATA[coll].filter((x) => x.mirrorOf === id).map((x) => x.id).forEach((mid) => removeFrom(coll, mid));
  removeFrom(coll, id);
  if (coll === 'zakat') refreshZakatSummary();
  const entity = { income: 'Income', expenses: rec.group === 'Assets' ? 'Asset' : 'Expense', taxes: 'Tax', zakat: 'Zakat', bills: 'Bill', salaries: 'Salary', commissions: 'Agent Commission', invoices: 'Invoice', agents: 'Agent', costSheets: 'Trading Cost Sheet' }[coll] || coll;
  const amount = rec.amount != null ? rec.amount : rec.net != null ? rec.net : rec.totalAmount != null ? rec.totalAmount : rec.netMargin != null ? rec.netMargin : null;
  logDelete(id, entity, amount, entity + ' ' + id + ' deleted' + (settle ? '; its payments voided' : ''));
  return rec;
}

export function deleteTask(id) {
  const i = DATA.tasks.findIndex((x) => x.id === id);
  if (i < 0) return false;
  DATA.tasks.splice(i, 1);
  deleteRecordFromFirestore('tasks', id);
  return true;
}

export const PROJECT_STATUSES = ['Open', 'Completed', 'Cancelled'];
export const PROJECT_PRIORITIES = ['Low', 'Medium', 'High'];

/** The fields of a project that come straight from its form. */
const taskProjectBody = (v) => ({
  type: v.type || '',
  status: PROJECT_STATUSES.indexOf(v.status) >= 0 ? v.status : 'Open',
  priority: PROJECT_PRIORITIES.indexOf(v.priority) >= 0 ? v.priority : 'Medium',
  expectedStart: v.expectedStart ? parseDate(v.expectedStart) : null,
  expectedEnd: v.expectedEnd ? parseDate(v.expectedEnd) : null,
  notes: v.notes || '',
});

export function addTaskProject(v) {
  const name = String(v.name || '').trim();
  if (!name) throw new Error('Enter the project name.');
  if (DATA.taskProjects.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new Error('A project named “' + name + '” already exists.');
  const p = { id: nextId(DATA.taskProjects, 'TP-', 3), name, ...taskProjectBody(v), liked: false, createdAt: new Date() };
  DATA.taskProjects.push(p);
  saveRecordToFirestore('taskProjects', p.id, p);
  return p;
}

/** A favourite project is kept at the top of the list. */
export function toggleTaskProjectLike(id) {
  const p = mustFind(DATA.taskProjects, id, 'Project');
  p.liked = !p.liked;
  saveRecordToFirestore('taskProjects', p.id, p);
  return p;
}

export function setTaskProjectStatus(id, status) {
  const p = mustFind(DATA.taskProjects, id, 'Project');
  p.status = PROJECT_STATUSES.indexOf(status) >= 0 ? status : 'Open';
  saveRecordToFirestore('taskProjects', p.id, p);
  return p;
}

export function updateTaskProject(id, v) {
  const p = mustFind(DATA.taskProjects, id, 'Project');
  const name = String(v.name || '').trim();
  if (!name) throw new Error('Enter the project name.');
  if (DATA.taskProjects.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) throw new Error('A project named “' + name + '” already exists.');
  Object.assign(p, { name, ...taskProjectBody(v) });
  saveRecordToFirestore('taskProjects', p.id, p);
  // Tasks carry the project's name for their list.
  DATA.tasks.filter((t) => t.projectId === id).forEach((t) => { t.project = name; saveRecordToFirestore('tasks', t.id, t); });
  return p;
}

/** Deleting a project keeps its tasks; they are simply no longer in a project. */
export function deleteTaskProject(id) {
  const i = DATA.taskProjects.findIndex((x) => x.id === id);
  if (i < 0) return false;
  DATA.taskProjects.splice(i, 1);
  deleteRecordFromFirestore('taskProjects', id);
  DATA.tasks.filter((t) => t.projectId === id).forEach((t) => { t.projectId = null; t.project = ''; saveRecordToFirestore('tasks', t.id, t); });
  return true;
}

/** Progress of each project: cancelled tasks do not count either way. */
export function taskProjectStats(who = '') {
  return DATA.taskProjects.map((p) => {
    const ts = DATA.tasks.filter((t) => t.projectId === p.id && taskStatus(t) !== 'Cancelled' && (!who || (t.assignee || '') === who));
    const completed = ts.filter((t) => taskStatus(t) === 'Completed').length;
    const overdue = ts.filter((t) => taskStatus(t) === 'Overdue').length;
    return {
      ...p, status: p.status || 'Open', priority: p.priority || 'Medium',
      total: ts.length, completed, overdue, open: ts.length - completed - overdue, pct: ts.length ? (completed / ts.length) * 100 : 0,
    };
  });
}

/** Tasks not in any project, counted the same way as a project's. */
export function looseTaskStats(who = '') {
  const ts = DATA.tasks.filter((t) => !t.projectId && taskStatus(t) !== 'Cancelled' && (!who || (t.assignee || '') === who));
  const completed = ts.filter((t) => taskStatus(t) === 'Completed').length;
  const overdue = ts.filter((t) => taskStatus(t) === 'Overdue').length;
  return { total: ts.length, completed, overdue, open: ts.length - completed - overdue, pct: ts.length ? (completed / ts.length) * 100 : 0 };
}
