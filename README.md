# Meridian Estates — Real Estate Management System (RMS)

A production-ready React / Next.js implementation of the **Meridian Estates Real Estate Management System**, featuring an accounting-ledger editorial design, multi-role executive portals, dynamic financial calculations, and live transaction management.

## 🚀 Features

- **Exact Design & UI/UX**: Built with the signature warm ivory paper palette (`#FAF6EC`), deep emerald ink (`#0B5C46`), saffron accents (`#E0951B`), and typography (`Sora`, `Poppins`, `JetBrains Mono`, `Noto Nastaliq Urdu`).
- **Deterministic Transaction & Aggregation Engine**: Every metric (revenue, gross profit, net profit, aging buckets, cash ledger, Zakat) is computed dynamically from the underlying transaction records.
- **Role-Based Portals**:
  - **CEO**: Full macro overview, sales vs. purchases bar charts, expense breakdown donut, portfolio upside, and alert center.
  - **Accountant**: Quick-entry workflows for expenses/payments/sales, bills aging, and tax/Zakat tracking.
  - **Manager**: Inventory upside metrics, top agent rankings, and property performance.
  - **Agent**: Personal commission ledger, assigned properties, and personal receivables.
- **Interactive Multi-Page Navigation**:
  - **Dashboard**: Overview & Alerts
  - **Properties**: Inventory, Purchases Register, Performance
  - **Sales**: Sales Register, Accounts Receivable (with 30/60/90+ day aging breakdown)
  - **Agents**: Directory, Commission Ledger
  - **Finance**: P&L (with Waterfall Profit Bridge and cost basis toggles), Profit Tracking (weekly/monthly/yearly), Cash Flow, Payables
  - **Costs**: Operating Expenses, Salaries, Bills, Taxes, Zakat
  - **Admin**: Transaction Ledger (with transaction voiding and immutable audit log), Audit Trail, Users & Roles
  - **Account & Global Search**: Universal search across properties, buyers, agents, and transaction references.
- **Data Entry & Mutations**:
  - Add Property (with automatic acquisition cost tracking and cash ledger posting)
  - Record Sale (with automatic agent commission and receipt generation)
  - Add Operating Expense
  - Record Cash/Bank Payment
  - Void Payment (immutable audit trail preservation)
- **Reporting & Exports**:
  - One-click CSV export with metadata header
  - Excel (.xls) table export
  - Print-optimized stylesheet for PDF export
  - Number format toggle (Crores/Lakhs vs Millions vs Full PKR)

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (Turbopack) & React 19
- **Language**: TypeScript
- **Styling**: Pure Ledger Editorial CSS design system with CSS custom properties
- **Icons & Graphics**: Custom SVG icons and procedural property artwork

## 💻 Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To create a static production build:

```bash
npm run build
```
