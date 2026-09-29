// Real Estate Management System — Reporting Module
// Deterministic in-memory dataset + all financial aggregation logic.
// Frontend-only: no network, no backend. Every figure below is computed
// from the underlying transaction records (per requirements §37).

export const TODAY = new Date(2026, 8, 1); // 01 Sep 2026
export const COMPANY = 'Meridian Estates (Pvt) Ltd';

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

export const PROJECTS = [
  { id: 'PRJ-01', name: 'DHA Phase 6', city: 'Lahore' },
  { id: 'PRJ-02', name: 'Bahria Orchard', city: 'Lahore' },
  { id: 'PRJ-03', name: 'Gulberg Greens', city: 'Islamabad' },
  { id: 'PRJ-04', name: 'Crescent Bay', city: 'Karachi' },
  { id: 'PRJ-05', name: 'Askari XI', city: 'Lahore' },
  { id: 'PRJ-06', name: 'Blue World City', city: 'Islamabad' },
];
export const OFFICES = ['Head Office — Lahore','DHA Branch — Lahore','Islamabad Branch','Karachi Branch','Multan Branch'];
export const TYPES = ['Residential Plot','Commercial Plot','House','Apartment','Farmhouse','Shop'];
export const STATUSES = ['Available','Reserved','Under Process','Sold'];
export const PAY_STATUS = ['Paid','Partially Paid','Unpaid','Overdue'];
export const METHODS = ['Cash','Bank Transfer','Cheque','Online Payment','Other'];
export const ACCOUNTS = ['HBL Current — 0912','Meezan Business — 4471','Petty Cash — Head Office','Alfalah Escrow — 8830'];

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
  'Other Expenses': ['Bank Charges','Donations','Miscellaneous'],
};
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
  const agents = AGENT_NAMES.map((n, i) => ({
    id: 'AG-' + String(i + 1).padStart(3, '0'), name: n,
    office: OFFICES[i % OFFICES.length], joined: dstr(new Date(2022 + (i % 3), i % 12, 5)),
    rate: [1.5, 2, 2.5][i % 3],
  }));

  const employees = EMP.map((e, i) => ({
    id: 'EMP-' + String(i + 1).padStart(3, '0'), name: e[0], dept: e[1], basic: e[2],
    office: OFFICES[i % OFFICES.length],
  }));

  const statusPlan = [].concat(
    Array(34).fill('Sold'), Array(14).fill('Available'),
    Array(6).fill('Reserved'), Array(5).fill('Under Process')
  );

  const properties = [], sales = [], commissions = [], payments = [], taxes = [];
  let txn = 41000;
  const tx = (date, dir, category, amount, o = {}) => {
    payments.push({
      id: 'TXN-' + ++txn, date: cap(date), dir, category, amount: round(amount),
      method: o.method || pick(METHODS), account: o.account || pick(ACCOUNTS),
      party: o.party || '—', propertyId: o.propertyId || null, agentId: o.agentId || null,
      ref: o.ref || 'REF-' + int(100000, 999999), note: o.note || category,
      office: o.office || pick(OFFICES), createdBy: o.createdBy || pick(['Faisal Nadeem','Ayesha Siddiqui','Omar Farooq']),
      approvedBy: o.approvedBy || pick(['Faisal Nadeem','CEO — M. Salman']),
      status: 'Posted',
    });
    return payments[payments.length - 1];
  };

  statusPlan.forEach((status, i) => {
    const project = PROJECTS[i % PROJECTS.length];
    const type = TYPES[int(0, TYPES.length - 1)];
    const size = pick([3, 5, 5, 7, 10, 10, 20]);
    const base = { 'Residential Plot': 1.5e6, 'Commercial Plot': 3.2e6, House: 2.4e6, Apartment: 1.9e6, Farmhouse: 1.2e6, Shop: 4.1e6 }[type];
    const price = round((base * size * (0.85 + rnd() * 0.5)) / 1e5) * 1e5;
    // Sold stock is mostly acquired in the prior year; current holdings are acquired this year,
    // so period purchase cost stays below period sales revenue (as in the requirement examples).
    const purchaseDate = status === 'Sold'
      ? (rnd() < 0.78 ? addDays(new Date(2025, 0, 10), int(0, 330)) : addDays(new Date(2026, 0, 5), int(0, 105)))
      : (rnd() < 0.25 ? addDays(new Date(2025, 3, 1), int(0, 260)) : addDays(new Date(2026, 0, 5), int(0, 215)));
    const extras = {
      registration: round(price * 0.02 / 1000) * 1000,
      legal: round((30000 + rnd() * 90000) / 1000) * 1000,
      development: round(price * (rnd() < 0.4 ? 0.015 : 0) / 1000) * 1000,
      other: round((10000 + rnd() * 60000) / 1000) * 1000,
    };
    const totalCost = price + extras.registration + extras.legal + extras.development + extras.other;
    const paidRatio = pick([1, 1, 1, 0.85, 0.7, 0.55]);
    const paid = round(totalCost * paidRatio);
    const p = {
      id: 'P-' + String(i + 1).padStart(4, '0'),
      name: propertyName(type, project, i), type, projectId: project.id, project: project.name,
      location: project.city, block: 'Block ' + pick(['A','B','C','D','E','J','K']),
      unit: String(int(1, 480)), size: size + ' Marla',
      seller: pick(SELLERS), purchaseDate, price, extras, totalCost,
      paid, remaining: Math.max(0, totalCost - paid),
      payStatus: paidRatio === 1 ? 'Paid' : 'Partially Paid',
      status, office: OFFICES[i % OFFICES.length],
      currentValue: round(totalCost * (1.08 + rnd() * 0.3) / 1e5) * 1e5,
      heldDays: Math.round((TODAY - purchaseDate) / day),
    };
    properties.push(p);

    tx(purchaseDate, 'out', 'Property Purchase', paid, { party: p.seller, propertyId: p.id, office: p.office, note: 'Purchase payment — ' + p.name });
    if (extras.registration + extras.legal + extras.development + extras.other > 0)
      tx(addDays(purchaseDate, int(1, 20)), 'out', 'Property Expenses', extras.registration + extras.legal + extras.development + extras.other,
        { party: 'Registrar / Legal', propertyId: p.id, office: p.office, note: 'Acquisition costs — ' + p.id });

    if (status === 'Sold') {
      let lo = addDays(purchaseDate, int(45, 120));
      if (lo < new Date(2026, 0, 8)) lo = addDays(new Date(2026, 0, 8), int(0, 60));
      const span = Math.max(0, Math.floor((TODAY - lo) / day));
      let saleDate = span > 0 ? addDays(lo, int(0, span)) : addDays(TODAY, -int(0, 25));
      if (saleDate < purchaseDate) saleDate = addDays(purchaseDate, 30);
      const sellingPrice = round(p.totalCost * (1.28 + rnd() * 0.32) / 1e5) * 1e5;
      const agent = agents[int(0, agents.length - 1)];
      const recvRatio = pick([1, 1, 1, 0.9, 0.75, 0.6, 0.45]);
      const received = round(sellingPrice * recvRatio);
      const cPct = agent.rate;
      const cAmt = round(sellingPrice * cPct / 100);
      const cDate = addDays(saleDate, int(5, 45));
      const cPaidRatio = cDate > TODAY ? 0 : pick([1, 1, 0.8, 0.5, 0]);
      const cPaid = round(cAmt * cPaidRatio);
      const saleTax = round(sellingPrice * 0.01);
      const otherSell = round((25000 + rnd() * 120000) / 1000) * 1000;
      const s = {
        id: 'S-' + String(sales.length + 1).padStart(4, '0'), propertyId: p.id, property: p.name,
        buyer: pick(BUYERS), agentId: agent.id, agent: agent.name, date: saleDate,
        sellingPrice, received, outstanding: Math.max(0, sellingPrice - received),
        dueDate: addDays(saleDate, 60), method: pick(METHODS),
        commissionPct: cPct, commission: cAmt, tax: saleTax, otherExpenses: otherSell,
        netRevenue: sellingPrice - cAmt - saleTax - otherSell,
        propertyCost: p.totalCost, grossProfit: sellingPrice - p.totalCost,
        netProfit: sellingPrice - p.totalCost - cAmt - saleTax - otherSell,
        payStatus: recvRatio === 1 ? 'Paid' : (addDays(saleDate, 60) < TODAY ? 'Overdue' : 'Partially Paid'),
        saleStatus: recvRatio === 1 ? 'Completed' : 'In Payment',
        office: p.office,
      };
      sales.push(s);
      commissions.push({
        id: 'CM-' + String(commissions.length + 1).padStart(4, '0'), agentId: agent.id, agent: agent.name,
        propertyId: p.id, property: p.name, counterparty: s.buyer, txnType: 'Sale', date: saleDate,
        pct: cPct, amount: cAmt, paid: cPaid, outstanding: Math.max(0, cAmt - cPaid),
        paidDate: cPaid > 0 ? dstr(cDate) : '—',
        status: cPaid === cAmt ? 'Paid' : cPaid === 0 ? (addDays(saleDate, 30) < TODAY ? 'Overdue' : 'Unpaid') : 'Partially Paid',
        office: p.office,
      });
      tx(saleDate, 'in', 'Property Sale', received, { party: s.buyer, propertyId: p.id, agentId: agent.id, office: p.office, note: 'Sale receipt — ' + p.name });
      if (cPaid > 0) tx(cDate, 'out', 'Agent Commission', cPaid, { party: agent.name, agentId: agent.id, propertyId: p.id, office: p.office, note: 'Commission — ' + s.id });
      taxes.push({
        id: 'TX-' + String(taxes.length + 1).padStart(4, '0'), type: 'Withholding Tax (Sale)',
        ref: s.id, property: p.name, taxpayer: COMPANY, authority: 'FBR',
        amount: saleTax, dueDate: addDays(saleDate, 30),
        paidDate: rnd() < 0.82 ? cap(addDays(saleDate, int(3, 28))) : null, date: saleDate, office: p.office,
      });
      if (rnd() < 0.4) tx(addDays(saleDate, int(2, 25)), 'out', 'Property Expenses', otherSell, { party: 'Sale processing', propertyId: p.id, office: p.office, note: 'Selling expenses — ' + s.id });
    }
  });

  // ---- Operating expenses (Jan 2026 → current month) ----
  const expenses = [];
  const monthsElapsed = TODAY.getMonth();
  for (let m = 0; m <= monthsElapsed; m++) {
    Object.keys(EXPENSE_TREE).forEach((group) => {
      EXPENSE_TREE[group].forEach((cat, ci) => {
        if (rnd() < 0.12) return;
        const scale = { 'Office Expenses': 1, 'Employee Expenses': 0.7, 'Marketing Expenses': 1.4, 'Property Expenses': 1.1, 'Other Expenses': 0.4 }[group];
        const amt = round(((40000 + rnd() * 520000) * scale) / 1000) * 1000;
        const date = new Date(2026, m, Math.min(int(2, 27), 27));
        if (date > TODAY) return;
        const paidFull = rnd() < 0.86;
        expenses.push({
          id: 'EX-' + String(expenses.length + 1).padStart(4, '0'), group, category: cat, date,
          amount: amt, paid: paidFull ? amt : round(amt * pick([0, 0.5, 0.7])),
          vendor: pick(['City Traders','Mega Supplies','Al-Noor Services','Prime Media','Zenith Solutions','Rapid Logistics']),
          office: OFFICES[(m + ci) % OFFICES.length],
          method: pick(METHODS), note: cat + ' — ' + MONTHS[m] + ' 2026',
        });
        const e = expenses[expenses.length - 1];
        e.outstanding = Math.max(0, e.amount - e.paid);
        e.status = e.paid === e.amount ? 'Paid' : e.paid === 0 ? 'Unpaid' : 'Partially Paid';
        if (e.paid > 0) tx(date, 'out', group, e.paid, { party: e.vendor, office: e.office, note: e.note, method: e.method });
      });
    });
  }

  // ---- Salaries ----
  const salaries = [];
  for (let m = 0; m <= monthsElapsed; m++) {
    employees.forEach((e) => {
      const bonus = rnd() < 0.3 ? round(e.basic * 0.1 / 1000) * 1000 : 0;
      const allowance = round(e.basic * 0.06 / 1000) * 1000;
      const deduction = rnd() < 0.2 ? round(e.basic * 0.03 / 1000) * 1000 : 0;
      const net = e.basic + bonus + allowance - deduction;
      const payDate = new Date(2026, m, 28);
      const paid = payDate <= TODAY;
      salaries.push({
        id: 'SL-' + String(salaries.length + 1).padStart(4, '0'), employeeId: e.id, employee: e.name,
        dept: e.dept, month: m, monthLabel: MONTHS[m] + ' 2026', basic: e.basic, bonus, allowance,
        deduction, net, date: payDate, status: paid ? 'Paid' : 'Pending', office: e.office,
      });
      if (paid) tx(payDate, 'out', 'Employee Salaries', net, { party: e.name, office: e.office, note: 'Salary ' + MONTHS[m] + ' 2026', method: 'Bank Transfer' });
    });
  }

  // ---- Bills ----
  const bills = [];
  for (let m = 0; m <= monthsElapsed; m++) {
    BILL_TYPES.forEach((b, bi) => {
      const amount = round((b[2] * (0.8 + rnd() * 0.5)) / 1000) * 1000;
      const dueDate = new Date(2026, m, 15);
      let paidAmt = amount, status = 'Paid', paidDate = new Date(2026, m, int(8, 14));
      const roll = rnd();
      if (dueDate > TODAY) { paidAmt = 0; status = 'Pending'; paidDate = null; }
      else if (roll < 0.08) { paidAmt = 0; status = 'Overdue'; paidDate = null; }
      else if (roll < 0.14) { paidAmt = round(amount * 0.5); status = 'Partially Paid'; paidDate = new Date(2026, m, 16); }
      bills.push({
        id: 'BL-' + String(bills.length + 1).padStart(4, '0'), type: b[0], vendor: b[1],
        number: 'INV-' + (2026000 + m * 50 + bi), period: MONTHS[m] + ' 2026', dueDate, date: new Date(2026, m, 3),
        amount, paid: paidAmt, outstanding: Math.max(0, amount - paidAmt), paidDate, status,
        office: OFFICES[bi % OFFICES.length], attachment: 'invoice-' + (2026000 + m * 50 + bi) + '.pdf',
      });
      if (paidAmt > 0) tx(paidDate, 'out', 'Bills', paidAmt, { party: b[1], office: bills[bills.length - 1].office, note: b[0] + ' — ' + MONTHS[m] + ' 2026' });
    });
  }

  // ---- Corporate tax (quarterly) + Zakat ----
  [0, 3, 6].forEach((m, qi) => {
    const amount = round((800000 + rnd() * 900000) / 1000) * 1000;
    const dueDate = new Date(2026, m + 2, 20);
    const paidDate = dueDate < TODAY ? (rnd() < 0.85 ? addDays(dueDate, -int(1, 12)) : null) : null;
    taxes.push({
      id: 'TX-' + String(taxes.length + 1).padStart(4, '0'), type: 'Advance Income Tax — Q' + (qi + 1),
      ref: 'Q' + (qi + 1) + '-2026', property: '—', taxpayer: COMPANY, authority: 'FBR',
      amount, dueDate, paidDate, date: new Date(2026, m, 5), office: OFFICES[0],
    });
  });
  taxes.forEach((t) => {
    t.paid = t.paidDate ? t.amount : 0;
    t.outstanding = t.amount - t.paid;
    t.status = t.paid ? 'Paid' : t.dueDate < TODAY ? 'Overdue' : 'Pending';
    t.attachment = 'tax-' + t.id.toLowerCase() + '.pdf';
    if (t.paid) tx(t.paidDate, 'out', 'Taxes', t.paid, { party: 'FBR', office: t.office, note: t.type, method: 'Bank Transfer' });
  });

  const zakatAssets = 2.6e8;
  const zakat = [];
  const zakatable = round(zakatAssets * 0.19);
  const zakatDue = round(zakatable * 0.025);
  let zPaidTotal = 0;
  [1, 4, 7].forEach((m, i) => {
    const amt = round(zakatDue / 4 / 1000) * 1000;
    const d = new Date(2026, m, 12);
    if (d > TODAY) return;
    zPaidTotal += amt;
    zakat.push({
      id: 'ZK-' + String(i + 1).padStart(3, '0'), period: 'FY 2026 · Installment ' + (i + 1),
      eligibleAssets: zakatAssets, zakatable, rate: '2.5%', calculated: zakatDue,
      amount: amt, date: d, ref: 'ZK-REF-' + int(10000, 99999), office: OFFICES[0], status: 'Paid',
    });
    tx(d, 'out', 'Zakat', amt, { party: 'Zakat Disbursement Fund', office: OFFICES[0], note: 'Zakat installment ' + (i + 1), method: 'Bank Transfer' });
  });
  const zakatSummary = { calculated: zakatDue, paid: zPaidTotal, remaining: Math.max(0, zakatDue - zPaidTotal), zakatable, eligibleAssets: zakatAssets, rate: 2.5 };

  // Other income
  [1, 3, 5, 7].forEach((m) => {
    const d = new Date(2026, m, int(5, 24));
    if (d > TODAY) return;
    tx(d, 'in', 'Other Income', round((900000 + rnd() * 2.4e6) / 1000) * 1000, { party: 'Consultancy / Rental income', office: OFFICES[0], note: 'Other operating income' });
  });
  [2, 6].forEach((m) => {
    const d = new Date(2026, m, 10);
    if (d > TODAY) return;
    tx(d, 'in', 'Investment', round((15e6 + rnd() * 20e6) / 1e5) * 1e5, { party: 'Director capital injection', office: OFFICES[0], note: 'Investment received' });
  });

  payments.sort((a, b) => b.date - a.date);

  // ---- Audit trail ----
  const AUDIT_ACTIONS = ['Created','Edited','Approved','Voided','Reversed','Adjustment'];
  const audit = payments.slice(0, 60).map((p, i) => {
    const action = i % 7 === 6 ? pick(['Voided','Reversed','Adjustment']) : AUDIT_ACTIONS[i % 3];
    const changed = action === 'Edited' || action === 'Adjustment';
    return {
      id: 'AU-' + String(i + 1).padStart(4, '0'), date: cap(addDays(p.date, int(0, 3))),
      txnId: p.id, action, user: action === 'Approved' ? 'CEO — M. Salman' : p.createdBy,
      entity: p.category, prevAmount: changed ? round(p.amount * 0.94) : null,
      newAmount: changed ? p.amount : p.amount,
      note: changed ? 'Amount corrected after vendor reconciliation' : action + ' ' + p.category.toLowerCase() + ' entry',
    };
  }).sort((a, b) => b.date - a.date);

  // ---- Trading Cost Sheets ----
  const costSheets = properties.map((p, i) => {
    const sale = sales.find((s) => s.propertyId === p.id);
    const isSold = !!sale;
    const saleDate = isSold ? sale.date : null;
    const heldDays = isSold
      ? Math.max(1, Math.round((sale.date - p.purchaseDate) / day))
      : Math.max(1, Math.round((TODAY - p.purchaseDate) / day));
    
    // Purchase side
    const purchasePrice = p.price;
    const purchaseBrokeragePct = 1.0;
    const purchaseBrokerage = round(purchasePrice * 0.01);
    const stampDuty = round(purchasePrice * 0.01);
    const cvt = round(purchasePrice * 0.01);
    const buyerFilerStatus = 'Filer';
    const tax236K = round(purchasePrice * 0.03); // Filer 3%
    const societyTransferFee = p.extras.registration || round(purchasePrice * 0.015);
    const ndcFee = 25000;
    const legalCharges = p.extras.legal || 35000;
    const developmentCharges = p.extras.development || 0;
    const otherAcquisition = p.extras.other || 20000;
    const totalAcquisitionExtras = stampDuty + cvt + tax236K + societyTransferFee + ndcFee + legalCharges + developmentCharges + otherAcquisition;

    // Carrying / improvements
    const renovationRepairs = isSold ? round(p.price * 0.015) : round(p.price * 0.01);
    const maintenanceHolding = round(p.price * 0.005);
    const marketingExpenses = isSold ? 35000 : 20000;
    const totalCarryingCosts = renovationRepairs + maintenanceHolding + marketingExpenses;

    const totalLandedCost = purchasePrice + purchaseBrokerage + totalAcquisitionExtras + totalCarryingCosts;

    // Sale side
    const sellingPrice = isSold ? sale.sellingPrice : p.currentValue;
    const saleBrokeragePct = isSold ? sale.commissionPct : 2.0;
    const saleBrokerage = isSold ? sale.commission : round(sellingPrice * 0.02);
    const sellerFilerStatus = 'Filer';
    const tax236C = round(sellingPrice * 0.03); // Filer 3%
    
    // CGT rate based on holding days (years)
    const years = heldDays / 365;
    let cgtRatePct = 15;
    if (years >= 6) cgtRatePct = 0;
    else if (years >= 5) cgtRatePct = 2.5;
    else if (years >= 4) cgtRatePct = 5.0;
    else if (years >= 3) cgtRatePct = 7.5;
    else if (years >= 2) cgtRatePct = 10.0;
    else if (years >= 1) cgtRatePct = 12.5;
    else cgtRatePct = 15.0;

    const capitalGain = Math.max(0, sellingPrice - totalLandedCost);
    const cgtAmount = round(capitalGain * (cgtRatePct / 100));
    const municipalTax = round(sellingPrice * 0.005);
    const otherSellingExpenses = isSold ? sale.otherExpenses : 30000;
    const totalSellingExpenses = otherSellingExpenses + municipalTax;

    const totalTaxesToPay = tax236K + tax236C + cgtAmount + stampDuty + cvt + municipalTax;
    const totalCommissions = purchaseBrokerage + saleBrokerage;

    const grossProfit = sellingPrice - totalLandedCost;
    const grossMarginPct = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
    const netProfit = sellingPrice - totalLandedCost - saleBrokerage - tax236C - cgtAmount - municipalTax - otherSellingExpenses;
    const netMarginPct = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
    const roiPct = totalLandedCost > 0 ? (netProfit / totalLandedCost) * 100 : 0;
    const annualizedRoiPct = heldDays > 0 ? (roiPct / heldDays) * 365 : roiPct;

    // Break-even selling price
    const variableSellRate = (saleBrokeragePct + 3.0 + 0.5) / 100;
    const breakEvenPrice = round((totalLandedCost + otherSellingExpenses) / Math.max(0.01, 1 - variableSellRate));

    return {
      id: 'CS-' + String(i + 1).padStart(4, '0'),
      propertyId: p.id,
      name: p.name,
      project: p.project,
      city: p.location,
      type: p.type,
      size: p.size,
      block: p.block,
      unit: p.unit,
      status: isSold ? 'Sold' : 'Active Deal',
      office: p.office,
      purchaseDate: p.purchaseDate,
      saleDate,
      heldDays,
      purchasePrice,
      purchaseBrokeragePct,
      purchaseBrokerage,
      purchaseAgentName: 'Ahmed Khan',
      stampDuty,
      cvt,
      tax236K,
      buyerFilerStatus,
      societyTransferFee,
      ndcFee,
      legalCharges,
      developmentCharges,
      otherAcquisition,
      totalAcquisitionExtras,
      renovationRepairs,
      maintenanceHolding,
      marketingExpenses,
      totalCarryingCosts,
      totalLandedCost,
      sellingPrice,
      saleBrokeragePct,
      saleBrokerage,
      saleAgentName: isSold ? sale.agent : 'Sana Malik',
      tax236C,
      sellerFilerStatus,
      cgtRatePct,
      cgtAmount,
      municipalTax,
      otherSellingExpenses,
      totalSellingExpenses,
      totalTaxesToPay,
      totalCommissions,
      grossProfit,
      grossMarginPct,
      netProfit,
      netMarginPct,
      roiPct,
      annualizedRoiPct,
      breakEvenPrice,
      seller: p.seller,
      buyer: isSold ? sale.buyer : 'Prospective Buyer',
      notes: `Trading cost sheet for ${p.name} · ${p.size} in ${p.project}`,
    };
  });

  return { agents, employees, properties, sales, commissions, expenses, salaries, bills, taxes, zakat, zakatSummary, payments, audit, costSheets };
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
  if (a >= 1e7) { const v = a / 1e7; return { sign, num: trimZeros(v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)), unit: "Cr" }; }
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
    case 'last7': return wrap(addDays(t, -6), t, 'Last 7 days');
    case 'last30': return wrap(addDays(t, -29), t, 'Last 30 days');
    case 'last90': return wrap(addDays(t, -89), t, 'Last 90 days');
    case 'thisQuarter': { const q = Math.floor(m / 3); return wrap(new Date(y, q * 3, 1), t, 'Q' + (q + 1) + ' ' + y); }
    case 'thisYear': return wrap(new Date(y, 0, 1), t, 'FY ' + y);
    case 'lastYear': return wrap(new Date(y - 1, 0, 1), new Date(y - 1, 11, 31), 'FY ' + (y - 1));
    case 'custom': {
      const s = custom && custom.start ? new Date(custom.start) : new Date(y, 0, 1);
      const e = custom && custom.end ? new Date(custom.end) : t;
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
export function computeKPIs(r, f) {
  const D = DATA;
  const props = D.properties.filter((p) => propMatch(p, f));
  const propIds = new Set(props.map((p) => p.id));

  const purchased = props.filter((p) => inR(p.purchaseDate, r));
  const purchaseCost = purchased.reduce((a, p) => a + p.totalCost, 0);
  const purchasePrice = purchased.reduce((a, p) => a + p.price, 0);
  const acquisitionCosts = purchaseCost - purchasePrice;

  const soldInRange = D.sales.filter((s) => saleMatch(s, f, propIds) && inR(s.date, r));
  const salesRevenue = soldInRange.reduce((a, s) => a + s.sellingPrice, 0);
  const cashReceived = soldInRange.reduce((a, s) => a + s.received, 0);
  // Company scope: gross profit follows the document definition (revenue − period purchase cost).
  // Narrowed scope (a single agent, project, type or property): the period purchase cost belongs to
  // the whole company, so matching it against a slice of revenue would be meaningless — the cost of
  // the properties actually sold in scope is used instead.
  const scoped = scopedToProperty(f);
  const costOfSales = soldInRange.reduce((a, s) => a + s.propertyCost, 0);
  const grossProfit = salesRevenue - (scoped ? costOfSales : purchaseCost);
  const directCosts = soldInRange.reduce((a, s) => a + s.tax + s.otherExpenses, 0);

  const comms = D.commissions.filter((c) => propIds.has(c.propertyId) && inR(c.date, r) && (f.agent === 'all' || c.agentId === f.agent));
  const commission = comms.reduce((a, c) => a + c.amount, 0);
  const commissionPaid = comms.reduce((a, c) => a + c.paid, 0);
  const commissionOut = comms.reduce((a, c) => a + c.outstanding, 0);

  const exp = D.expenses.filter((e) => inR(e.date, r) && overheadMatch(e, f));
  const byGroup = {};
  Object.keys(EXPENSE_TREE).forEach((g) => (byGroup[g] = 0));
  exp.forEach((e) => (byGroup[e.group] += e.amount));

  const sal = D.salaries.filter((s) => inR(s.date, r) && overheadMatch(s, f));
  const salaries = sal.reduce((a, s) => a + s.net, 0);
  const salariesPaid = sal.filter((s) => s.status === 'Paid').reduce((a, s) => a + s.net, 0);

  const bl = D.bills.filter((b) => inR(b.dueDate, r) && overheadMatch(b, f));
  const bills = bl.reduce((a, b) => a + b.amount, 0);
  const billsPaid = bl.reduce((a, b) => a + b.paid, 0);
  const billsOut = bl.reduce((a, b) => a + b.outstanding, 0);
  const billsOverdue = bl.filter((b) => b.status === 'Overdue');

  const txs = D.taxes.filter((t) => inR(t.date, r) && overheadMatch(t, f));
  const tax = txs.reduce((a, t) => a + t.amount, 0);
  const taxPaid = txs.reduce((a, t) => a + t.paid, 0);
  const taxOut = txs.reduce((a, t) => a + t.outstanding, 0);
  const taxDueSoon = D.taxes.filter((t) => !t.paid && t.dueDate >= TODAY && t.dueDate <= addDays(TODAY, 30)).reduce((a, t) => a + t.amount, 0);

  const zk = D.zakat.filter((z) => inR(z.date, r));
  const zakatPaid = zk.reduce((a, z) => a + z.amount, 0);
  const zakat = zakatPaid;

  const officeExp = byGroup['Office Expenses'], marketing = byGroup['Marketing Expenses'],
    propertyExp = byGroup['Property Expenses'], employeeExp = byGroup['Employee Expenses'],
    other = byGroup['Other Expenses'];

  // Operating costs exclude tax and Zakat: tax is a statutory charge and Zakat (§17) is an
  // appropriation of profit, not an operating expense. Keeping the three stages apart is what
  // lets the waterfall show Gross → Operating → Net without double counting.
  const operatingCosts = commission + salaries + officeExp + marketing + propertyExp + employeeExp + bills + other;
  const totalExpenses = operatingCosts + tax + zakat;
  // In a narrowed scope only directly attributable costs are subtracted (a scope-level contribution);
  // company overheads are not allocated to a single agent or project.
  const netProfit = scoped ? grossProfit - commission - directCosts : grossProfit - totalExpenses;

  const pay = D.payments.filter((p) => inR(p.date, r) && overheadMatch(p, f) && (!scopedToProperty(f) || !p.propertyId || propIds.has(p.propertyId)));
  const cashIn = pay.filter((p) => p.dir === 'in').reduce((a, p) => a + p.amount, 0);
  const cashOut = pay.filter((p) => p.dir === 'out').reduce((a, p) => a + p.amount, 0);

  const unsold = props.filter((p) => p.status !== 'Sold');
  const portfolioCost = unsold.reduce((a, p) => a + p.totalCost, 0);
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
    purchaseCost, purchasePrice, acquisitionCosts, salesRevenue, cashReceived, grossProfit,
    costOfSales, directCosts,
    // Two bases for gross profit. grossProfitDoc follows the requirement document literally
    // (period sales − period purchase spend); grossProfitCOGS matches the cost of the properties
    // actually sold, which is the accounting-correct figure. See AUDIT.md finding A3.
    grossProfitDoc: salesRevenue - purchaseCost,
    grossProfitCOGS: salesRevenue - costOfSales,
    costBasis: scoped ? costOfSales : purchaseCost,
    operatingCosts, operatingProfit: grossProfit - operatingCosts,
    profitBeforeZakat: grossProfit - operatingCosts - tax,
    commission, commissionPaid, commissionOut,
    officeExp, marketing, propertyExp, employeeExp, other, salaries, salariesPaid,
    bills, billsPaid, billsOut, billsOverdueCount: billsOverdue.length,
    tax, taxPaid, taxOut, taxDueSoon, zakat, zakatPaid,
    zakatCalculated: DATA.zakatSummary.calculated, zakatRemaining: DATA.zakatSummary.remaining,
    totalExpenses, netProfit, cashIn, cashOut, netCash: cashIn - cashOut,
    portfolioCost, portfolioValue, potentialProfit: portfolioValue - portfolioCost,
    receivable, payable,
    payableBreakdown: [
      ['Property Sellers', payableProps], ['Agent Commission', payableComm], ['Salaries', payableSal],
      ['Bills', payableBills], ['Tax Authority', payableTax], ['Other Vendors', payableVendors],
    ],
    grossMargin: pctOf(grossProfit, salesRevenue), netMargin: pctOf(netProfit, salesRevenue),
    scoped,
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
export function monthlySeries(year, f) {
  const out = [];
  const last = year === TODAY.getFullYear() ? TODAY.getMonth() : 11;
  for (let m = 0; m <= last; m++) {
    const r = { start: new Date(year, m, 1), end: endOfDay(new Date(year, m + 1, 0)), label: MONTHS[m] + ' ' + year, key: 'custom' };
    out.push({ label: MONTHS[m], full: r.label, month: m, k: computeKPIs(r, f) });
  }
  return out;
}

export function expenseBreakdown(k) {
  return [
    ['Employee Salaries', k.salaries, 160], ['Office Expenses', k.officeExp, 250],
    ['Agent Commission', k.commission, 300], ['Marketing', k.marketing, 45],
    ['Bills', k.bills, 100], ['Property Expenses', k.propertyExp, 200],
    ['Tax', k.tax, 20], ['Zakat', k.zakat, 130], ['Other', k.other + k.employeeExp, 340],
  ].filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
}

export function agentSummary(r, f) {
  return DATA.agents.map((a) => {
    const comms = DATA.commissions.filter((c) => c.agentId === a.id && inR(c.date, r));
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
  DATA.properties.filter((p) => p.status !== 'Sold' && p.heldDays > 300).slice(0, 3)
    .forEach((p) => push('med', 'Property held too long', p.name + ' — held ' + p.heldDays + ' days, cost ' + fmt(p.totalCost), 'inventory'));
  DATA.properties.filter((p) => p.status !== 'Sold' && p.currentValue < p.totalCost * 1.1).slice(0, 3)
    .forEach((p) => push('low', 'Low potential profit', p.name + ' — upside only ' + fmt(p.currentValue - p.totalCost) + ' (' + pctOf(p.currentValue - p.totalCost, p.totalCost).toFixed(1) + '%)', 'inventory'));
  DATA.properties.filter((p) => p.status !== 'Sold' && p.currentValue > p.totalCost * 1.3).slice(0, 2)
    .forEach((p) => push('good', 'High potential profit', p.name + ' — upside ' + fmt(p.currentValue - p.totalCost) + ', consider listing', 'inventory'));
  return A;
}

/* ============================ permissions (§30) ============================ */
export const ROLES = {
  CEO: { label: 'CEO', deny: [] },
  Accountant: { label: 'Accountant', deny: ['salaries'] },
  Manager: { label: 'Manager', deny: ['salaries', 'tax', 'zakat', 'pnl', 'cashflow', 'payables', 'audit'] },
  Agent: { label: 'Agent', deny: ['salaries', 'tax', 'zakat', 'pnl', 'cashflow', 'payables', 'audit', 'expenses', 'bills', 'purchases', 'profit', 'agents', 'receivables', 'transactions'] },
};
export const AGENT_SELF = DATA.agents[0];

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
const FY_START = new Date(2026, 0, 1);
const PRE_FY_NET = DATA.payments.filter((p) => p.date < FY_START)
  .reduce((a, p) => a + (p.dir === 'in' ? p.amount : -p.amount), 0);
// Cash held on 1 Jan 2026, back-solved so the ledger opens the financial year at PKR 6.5 Cr.
export const OPENING_BALANCE = Math.round(65e6 - PRE_FY_NET);
export function cashLedger(r, f) {
  const before = DATA.payments.filter((p) => p.date < r.start && overheadMatch(p, f));
  const opening = before.reduce((a, p) => a + (p.dir === 'in' ? p.amount : -p.amount), OPENING_BALANCE);
  const within = DATA.payments.filter((p) => inR(p.date, r) && overheadMatch(p, f));
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
export function propertyPerf(r, f) {
  const sold = DATA.sales.filter((s) => inR(s.date, r));
  const byId = {};
  DATA.properties.forEach((p) => { if (propMatch(p, f)) byId[p.id] = p; });
  return sold.filter((s) => byId[s.propertyId] && (f.agent === 'all' || s.agentId === f.agent)).map((s) => {
    const p = byId[s.propertyId];
    return {
      id: p.id, name: p.name, project: p.project, agent: s.agent, saleDate: s.date,
      price: p.price, extras: p.totalCost - p.price, totalCost: p.totalCost,
      sellingPrice: s.sellingPrice, commission: s.commission, tax: s.tax, other: s.otherExpenses,
      grossProfit: s.grossProfit, netProfit: s.netProfit,
      margin: pctOf(s.netProfit, s.sellingPrice), heldDays: p.heldDays,
    };
  }).sort((a, b) => b.netProfit - a.netProfit);
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
    cashflow: () => cashLedger(r, f).count,
    audit: () => DATA.audit.length,
    sheets: () => DATA.costSheets.length,
    calculator: () => DATA.costSheets.length,
    analytics: () => DATA.costSheets.length,
  }[view];
  return n ? n() : 0;
}

/* ====================================================================
   MUTATIONS — manual data entry.
   A demo that cannot take input is a picture, not a prototype. These
   insert real records into the same arrays every report reads from, so
   anything entered immediately shows up in the KPIs, charts and ledgers.
   ==================================================================== */
const nextId = (arr, prefix, pad) =>
  prefix + String(arr.reduce((m, x) => Math.max(m, +String(x.id).replace(/\D/g, '') || 0), 0) + 1).padStart(pad, '0');

export const USERS = [
  { id: 'U-01', name: 'M. Salman', role: 'CEO', title: 'Chief Executive', initials: 'MS', office: OFFICES[0] },
  { id: 'U-02', name: 'Faisal Nadeem', role: 'Accountant', title: 'Head of Accounts', initials: 'FN', office: OFFICES[0] },
  { id: 'U-03', name: 'Omar Farooq', role: 'Manager', title: 'Sales Manager', initials: 'OF', office: OFFICES[1] },
  { id: 'U-04', name: AGENT_SELF.name, role: 'Agent', title: 'Property Consultant', initials: AGENT_SELF.name.split(' ').map((x) => x[0]).join(''), office: AGENT_SELF.office, agentId: AGENT_SELF.id },
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
    manual: true,
  });
  DATA.properties.push(p);
  if (p.paid > 0) addPayment({
    date: v.purchaseDate, dir: 'out', category: 'Property Purchase', amount: p.paid,
    party: p.seller, propertyId: p.id, office: p.office, method: v.method || 'Bank Transfer',
    note: 'Purchase payment — ' + p.name,
  });
  return p;
}

export function addSale(v) {
  const p = DATA.properties.find((x) => x.id === v.propertyId);
  if (!p) throw new Error('Unknown property');
  const agent = DATA.agents.find((a) => a.id === v.agentId) || DATA.agents[0];
  const price = +v.sellingPrice, received = Math.min(+v.received || 0, price);
  const pctRate = v.commissionPct === '' || v.commissionPct == null ? agent.rate : +v.commissionPct;
  const commission = Math.round((price * pctRate) / 100);
  const saleTax = Math.round(+v.tax || price * 0.01);
  const other = +v.otherExpenses || 0;
  const dueDate = addDays(parseDate(v.date), 60);
  const s = {
    id: nextId(DATA.sales, 'S-', 4), propertyId: p.id, property: p.name,
    buyer: v.buyer, agentId: agent.id, agent: agent.name, date: parseDate(v.date),
    sellingPrice: price, received, outstanding: Math.max(0, price - received), dueDate,
    method: v.method, commissionPct: pctRate, commission, tax: saleTax, otherExpenses: other,
    netRevenue: price - commission - saleTax - other,
    propertyCost: p.totalCost, grossProfit: price - p.totalCost,
    netProfit: price - p.totalCost - commission - saleTax - other,
    payStatus: received >= price ? 'Paid' : dueDate < TODAY ? 'Overdue' : 'Partially Paid',
    saleStatus: received >= price ? 'Completed' : 'In Payment',
    office: p.office, manual: true,
  };
  DATA.sales.push(s);
  p.status = 'Sold';
  DATA.commissions.push({
    id: nextId(DATA.commissions, 'CM-', 4), agentId: agent.id, agent: agent.name,
    propertyId: p.id, property: p.name, counterparty: s.buyer, txnType: 'Sale', date: s.date,
    pct: pctRate, amount: commission, paid: 0, outstanding: commission, paidDate: '—',
    status: 'Unpaid', office: p.office, manual: true,
  });
  if (received > 0) addPayment({
    date: v.date, dir: 'in', category: 'Property Sale', amount: received,
    party: s.buyer, propertyId: p.id, agentId: agent.id, office: p.office,
    method: v.method, note: 'Sale receipt — ' + p.name,
  });
  return s;
}

export function addExpense(v) {
  const amount = +v.amount, paid = Math.min(+v.paid || 0, amount);
  const e = {
    id: nextId(DATA.expenses, 'EX-', 4), group: v.group, category: v.category,
    date: parseDate(v.date), amount, paid, outstanding: Math.max(0, amount - paid),
    vendor: v.vendor, office: v.office, method: v.method,
    note: v.note || v.category, manual: true,
    status: paid >= amount ? 'Paid' : paid === 0 ? 'Unpaid' : 'Partially Paid',
  };
  DATA.expenses.push(e);
  if (paid > 0) addPayment({
    date: v.date, dir: 'out', category: v.group, amount: paid, party: v.vendor,
    office: v.office, method: v.method, note: e.note,
  });
  return e;
}

export function addPayment(v) {
  const t = {
    id: nextId(DATA.payments, 'TXN-', 5), date: parseDate(v.date), dir: v.dir,
    category: v.category, amount: Math.round(+v.amount), method: v.method || 'Bank Transfer',
    account: v.account || ACCOUNTS[0], party: v.party || '—',
    propertyId: v.propertyId || null, agentId: v.agentId || null,
    ref: v.ref || 'REF-' + Math.floor(100000 + Math.random() * 899999),
    note: v.note || v.category, office: v.office || OFFICES[0],
    createdBy: v.createdBy || 'Manual entry', approvedBy: v.approvedBy || 'Pending approval',
    status: 'Posted', manual: true,
  };
  DATA.payments.push(t);
  DATA.payments.sort((a, b) => b.date - a.date);
  DATA.audit.unshift({
    id: nextId(DATA.audit, 'AU-', 4), date: t.date, txnId: t.id, action: 'Created',
    user: v.createdBy || 'Manual entry', entity: t.category, prevAmount: null,
    newAmount: t.amount, note: 'Created through manual entry form', manual: true,
  });
  return t;
}

/** §31 — records are never deleted. A void keeps the original and reverses it. */
export function voidPayment(id, user) {
  const t = DATA.payments.find((p) => p.id === id);
  if (!t || t.status === 'Voided') return null;
  t.status = 'Voided';
  DATA.audit.unshift({
    id: nextId(DATA.audit, 'AU-', 4), date: TODAY, txnId: t.id, action: 'Voided',
    user: user || 'Manual entry', entity: t.category, prevAmount: t.amount, newAmount: 0,
    note: 'Voided — original record retained', manual: true,
  });
  return t;
}

/* ====================================================================
   TRADING COST SHEET & DEAL CALCULATOR ENGINE
   ==================================================================== */

export function calculateCostSheet(v) {
  const purchasePrice = Math.max(0, +v.purchasePrice || 0);
  const purchaseBrokeragePct = v.purchaseBrokeragePct !== undefined && v.purchaseBrokeragePct !== '' ? +v.purchaseBrokeragePct : 1.0;
  const purchaseBrokerage = v.purchaseBrokerage !== undefined && v.purchaseBrokerage !== '' ? +v.purchaseBrokerage : Math.round(purchasePrice * (purchaseBrokeragePct / 100));

  const stampDuty = v.stampDuty !== undefined && v.stampDuty !== '' ? +v.stampDuty : Math.round(purchasePrice * 0.01);
  const cvt = v.cvt !== undefined && v.cvt !== '' ? +v.cvt : Math.round(purchasePrice * 0.01);

  const buyerFilerStatus = v.buyerFilerStatus || 'Filer';
  const kRate = buyerFilerStatus === 'Non-Filer' ? 0.12 : buyerFilerStatus === 'Late Filer' ? 0.06 : 0.03;
  const tax236K = v.tax236K !== undefined && v.tax236K !== '' ? +v.tax236K : Math.round(purchasePrice * kRate);

  const societyTransferFee = Math.max(0, +v.societyTransferFee || 0);
  const ndcFee = Math.max(0, +v.ndcFee || 0);
  const legalCharges = Math.max(0, +v.legalCharges || 0);
  const developmentCharges = Math.max(0, +v.developmentCharges || 0);
  const otherAcquisition = Math.max(0, +v.otherAcquisition || 0);

  const totalAcquisitionExtras = stampDuty + cvt + tax236K + societyTransferFee + ndcFee + legalCharges + developmentCharges + otherAcquisition;

  const renovationRepairs = Math.max(0, +v.renovationRepairs || 0);
  const maintenanceHolding = Math.max(0, +v.maintenanceHolding || 0);
  const marketingExpenses = Math.max(0, +v.marketingExpenses || 0);
  const totalCarryingCosts = renovationRepairs + maintenanceHolding + marketingExpenses;

  const totalLandedCost = purchasePrice + purchaseBrokerage + totalAcquisitionExtras + totalCarryingCosts;

  // Sale side
  const sellingPrice = Math.max(0, +v.sellingPrice || 0);
  const saleBrokeragePct = v.saleBrokeragePct !== undefined && v.saleBrokeragePct !== '' ? +v.saleBrokeragePct : 2.0;
  const saleBrokerage = v.saleBrokerage !== undefined && v.saleBrokerage !== '' ? +v.saleBrokerage : Math.round(sellingPrice * (saleBrokeragePct / 100));

  const sellerFilerStatus = v.sellerFilerStatus || 'Filer';
  const cRate = sellerFilerStatus === 'Non-Filer' ? 0.10 : sellerFilerStatus === 'Late Filer' ? 0.06 : 0.03;
  const tax236C = v.tax236C !== undefined && v.tax236C !== '' ? +v.tax236C : Math.round(sellingPrice * cRate);

  const pDate = parseDate(v.purchaseDate || TODAY);
  const sDate = v.saleDate ? parseDate(v.saleDate) : null;
  const heldDays = sDate ? Math.max(1, Math.round((sDate - pDate) / day)) : (v.heldDays || Math.max(1, Math.round((TODAY - pDate) / day)));
  const years = heldDays / 365;

  let cgtRatePct = 15;
  if (v.cgtRatePct !== undefined && v.cgtRatePct !== '') {
    cgtRatePct = +v.cgtRatePct;
  } else if (sellerFilerStatus === 'Non-Filer') {
    cgtRatePct = 15.0;
  } else {
    if (years >= 6) cgtRatePct = 0;
    else if (years >= 5) cgtRatePct = 2.5;
    else if (years >= 4) cgtRatePct = 5.0;
    else if (years >= 3) cgtRatePct = 7.5;
    else if (years >= 2) cgtRatePct = 10.0;
    else if (years >= 1) cgtRatePct = 12.5;
    else cgtRatePct = 15.0;
  }

  const capitalGain = Math.max(0, sellingPrice - totalLandedCost);
  const cgtAmount = v.cgtAmount !== undefined && v.cgtAmount !== '' ? +v.cgtAmount : Math.round(capitalGain * (cgtRatePct / 100));

  const municipalTax = v.municipalTax !== undefined && v.municipalTax !== '' ? +v.municipalTax : Math.round(sellingPrice * 0.005);
  const otherSellingExpenses = Math.max(0, +v.otherSellingExpenses || 0);
  const totalSellingExpenses = otherSellingExpenses + municipalTax;

  const totalTaxesToPay = tax236K + tax236C + cgtAmount + stampDuty + cvt + municipalTax;
  const totalCommissions = purchaseBrokerage + saleBrokerage;

  const grossProfit = sellingPrice - totalLandedCost;
  const grossMarginPct = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
  const netProfit = sellingPrice - totalLandedCost - saleBrokerage - tax236C - cgtAmount - municipalTax - otherSellingExpenses;
  const netMarginPct = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  const roiPct = totalLandedCost > 0 ? (netProfit / totalLandedCost) * 100 : 0;
  const annualizedRoiPct = heldDays > 0 ? (roiPct / heldDays) * 365 : roiPct;

  const variableSellRate = (saleBrokeragePct + (cRate * 100) + 0.5) / 100;
  const breakEvenPrice = Math.round((totalLandedCost + otherSellingExpenses) / Math.max(0.01, 1 - variableSellRate));

  return {
    ...v,
    purchasePrice,
    purchaseBrokeragePct,
    purchaseBrokerage,
    stampDuty,
    cvt,
    buyerFilerStatus,
    tax236K,
    societyTransferFee,
    ndcFee,
    legalCharges,
    developmentCharges,
    otherAcquisition,
    totalAcquisitionExtras,
    renovationRepairs,
    maintenanceHolding,
    marketingExpenses,
    totalCarryingCosts,
    totalLandedCost,
    sellingPrice,
    saleBrokeragePct,
    saleBrokerage,
    sellerFilerStatus,
    tax236C,
    purchaseDate: pDate,
    saleDate: sDate,
    heldDays,
    cgtRatePct,
    cgtAmount,
    municipalTax,
    otherSellingExpenses,
    totalSellingExpenses,
    totalTaxesToPay,
    totalCommissions,
    grossProfit,
    grossMarginPct,
    netProfit,
    netMarginPct,
    roiPct,
    annualizedRoiPct,
    breakEvenPrice,
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
    const updated = calculateCostSheet({ ...cs, sellingPrice: sPrice });
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
  if (!cs.id) {
    cs.id = nextId(DATA.costSheets, 'CS-', 4);
  }
  const idx = DATA.costSheets.findIndex((x) => x.id === cs.id);
  if (idx >= 0) {
    DATA.costSheets[idx] = cs;
  } else {
    DATA.costSheets.unshift(cs);
  }

  // Synchronize with property if matched
  const p = DATA.properties.find((x) => x.id === cs.propertyId);
  if (p) {
    p.price = cs.purchasePrice;
    p.extras = {
      registration: cs.societyTransferFee,
      legal: cs.legalCharges,
      development: cs.developmentCharges,
      other: cs.otherAcquisition,
    };
    p.totalCost = cs.totalLandedCost;
    p.currentValue = cs.sellingPrice;
    if (cs.status === 'Sold') {
      const sale = DATA.sales.find((s) => s.propertyId === p.id);
      if (sale) {
        sale.sellingPrice = cs.sellingPrice;
        sale.commission = cs.saleBrokerage;
        sale.grossProfit = cs.grossProfit;
        sale.netProfit = cs.netProfit;
        sale.tax = cs.tax236C;
      }
    }
  }

  DATA.audit.unshift({
    id: nextId(DATA.audit, 'AU-', 4),
    date: TODAY,
    txnId: cs.id,
    action: idx >= 0 ? 'Edited' : 'Created',
    user: user || 'Manual entry',
    entity: 'Trading Cost Sheet',
    prevAmount: null,
    newAmount: cs.netProfit,
    note: `Cost Sheet ${cs.id} (${cs.name}) ${idx >= 0 ? 'updated' : 'created'} with net margin ${cs.netMarginPct.toFixed(1)}%`,
    manual: true,
  });

  return cs;
}

