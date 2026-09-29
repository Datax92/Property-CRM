import type { NavSection } from './types';

export const NAV: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    u: 'ڈیش بورڈ',
    icon: 'home',
    group: 'Main',
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'alerts', label: 'Alerts' },
    ],
  },
  {
    id: 'properties',
    label: 'Properties',
    u: 'جائیدادیں',
    icon: 'grid',
    group: 'Operations',
    tabs: [
      { id: 'inventory', label: 'Inventory' },
      { id: 'purchases', label: 'Purchase register', need: 'purchases' },
      { id: 'performance', label: 'Performance' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    u: 'فروخت',
    icon: 'tag',
    group: 'Operations',
    tabs: [
      { id: 'register', label: 'Sales register' },
      { id: 'receivables', label: 'Receivables', need: 'receivables' },
    ],
  },
  {
    id: 'agents',
    label: 'Agents',
    u: 'ایجنٹ',
    icon: 'users',
    group: 'Operations',
    tabs: [
      { id: 'directory', label: 'Agent directory', need: 'agents' },
      { id: 'commissions', label: 'Commissions' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    u: 'مالیات',
    icon: 'chart',
    group: 'Finance',
    tabs: [
      { id: 'pnl', label: 'Profit & loss', need: 'pnl' },
      { id: 'profit', label: 'Profit tracking', need: 'profit' },
      { id: 'cashflow', label: 'Cash flow', need: 'cashflow' },
      { id: 'payables', label: 'Payables', need: 'payables' },
    ],
  },
  {
    id: 'costs',
    label: 'Costs',
    u: 'اخراجات',
    icon: 'wallet',
    group: 'Finance',
    tabs: [
      { id: 'expenses', label: 'Expenses', need: 'expenses' },
      { id: 'salaries', label: 'Salaries', need: 'salaries' },
      { id: 'bills', label: 'Bills', need: 'bills' },
      { id: 'tax', label: 'Tax', need: 'tax' },
      { id: 'zakat', label: 'Zakat', need: 'zakat' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    u: 'انتظام',
    icon: 'shield',
    group: 'System',
    tabs: [
      { id: 'transactions', label: 'Transactions', need: 'transactions' },
      { id: 'audit', label: 'Audit trail', need: 'audit' },
      { id: 'users', label: 'Users & roles' },
    ],
  },
];

export const PAGE_META: Record<string, { t: string; u?: string; p?: string }> = {
  'dashboard/overview': { t: 'Dashboard', u: 'ڈیش بورڈ' },
  'dashboard/alerts': { t: 'Alerts & notifications', u: 'اطلاعات', p: 'Everything that needs a decision, most urgent first.' },
  'properties/inventory': { t: 'Property inventory', u: 'اسٹاک و مالیت', p: 'Unsold stock: what it cost, what it is worth today, and the difference.' },
  'properties/purchases': { t: 'Purchase register', u: 'خرید رجسٹر', p: 'Every property bought, with acquisition costs and what is still owed to the seller.' },
  'properties/performance': { t: 'Property performance', u: 'جائیداد کارکردگی', p: 'Profit on each property sold, after acquisition costs, commission, tax and selling costs.' },
  'sales/register': { t: 'Sales register', u: 'فروخت رجسٹر', p: 'Every sale with buyer, agent, amount received and amount outstanding.' },
  'sales/receivables': { t: 'Accounts receivable', u: 'واجب الوصول', p: 'What customers still owe, and how far past due each balance is.' },
  'agents/directory': { t: 'Agent directory', u: 'ایجنٹ', p: 'Sales, profit generated and commission for every agent in the period.' },
  'agents/commissions': { t: 'Commission ledger', u: 'کمیشن کھاتہ', p: 'What each agent earned, what has been paid, and what is still owed.' },
  'finance/pnl': { t: 'Profit & loss', u: 'نفع و نقصان', p: 'The full statement for the selected period, revenue down to net profit.' },
  'finance/profit': { t: 'Profit tracking', u: 'منافع', p: 'Purchases, sales, gross profit, expenses and net profit by week, month or year.' },
  'finance/cashflow': { t: 'Cash flow', u: 'نقدی بہاؤ', p: 'Money received and paid, with opening and closing balance.' },
  'finance/payables': { t: 'Accounts payable', u: 'واجب الادا', p: 'What the company owes sellers, agents, staff, vendors and the tax authority.' },
  'costs/expenses': { t: 'Expenses', u: 'اخراجات', p: 'Operating expenses by category and vendor, with anything still unpaid.' },
  'costs/salaries': { t: 'Employee salaries', u: 'تنخواہیں', p: 'Basic, bonus, allowance and deductions per employee.' },
  'costs/bills': { t: 'Bills', u: 'بل', p: 'Recurring and one-off bills, their due dates and anything overdue.' },
  'costs/tax': { t: 'Tax', u: 'ٹیکس', p: 'All tax obligations, split between transaction withholding tax and corporate income tax.' },
  'costs/zakat': { t: 'Zakat', u: 'زکوٰۃ', p: 'Zakat calculated, paid and remaining — reported separately from operating expenses.' },
  'admin/transactions': { t: 'Transaction ledger', u: 'لین دین کھاتہ', p: 'Every financial transaction with reference, method, account and approver.' },
  'admin/audit': { t: 'Audit trail', u: 'آڈٹ', p: 'Who did what, and when. Records are voided or reversed, never deleted.' },
  'admin/users': { t: 'Users & roles', u: 'اجازتیں', p: 'Who can see what. Sign in as any user to view the system through their eyes.' },
  'account': { t: 'My account', u: 'میرا اکاؤنٹ' },
  'search': { t: 'Search results', u: 'تلاش' },
};

export const SC = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];
export const OC = ['var(--o1)', 'var(--o2)', 'var(--o3)', 'var(--o4)'];
