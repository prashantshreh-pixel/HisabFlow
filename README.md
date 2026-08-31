# HisabFlow 🛒📋

> **A real-world, high-reliability retail and grocery management system designed to completely replace paper registers.**  
> Track daily POS sales, Customer Khata (*Udhaar*), Wholesaler statements, inventory stock, operating expenses, cash drawer shifts, audit logs, and net profit with zero friction.

---

## 🎯 Key Features

- 🇳🇵 **Bikram Sambat (B.S.) Date Toggle & Nepali UI (नेपाली)**: Seamless toggle between Gregorian (A.D.) and Nepali (B.S.) calendars with multi-language UI support.
- 📖 **Customer Khata (Udhaar) Credit Ledger**: Atomic credit transactions, row-locked balance tracking, and paged customer statements.
- 🏬 **Wholesaler & Supplier Ledger**: Track stock purchases, payments given, and outstanding supplier payables.
- 🛒 **Point of Sale (POS) Checkout**: High-speed billing with barcode scanner support, receipt generation, and real-time inventory stock deductions.
- 📦 **Inventory & Stock Movements**: Catalogue management, low stock alerts, image uploads, search filtering, and atomic stock movement logs (`stock_movements`).
- 💸 **Operating Expenses & Financial Reports**: Categorized expense tracking with half-open date-range filters (`>= startOfDay AND < nextDay`), gross profit margin analysis, and net profit calculations.
- 🏦 **Cash Drawer Shift Reconciliation**: Transaction-scoped register shifts (`cash_drawer_shift_id`), open shift uniqueness enforcement, cash sales/expenses tracking, and variance reporting.
- 🕵️ **Active Audit Trail**: Real-time logging of customer, product, sale, supplier, expense, and cash drawer mutations into `audit_logs`.
- 💾 **Restorable Data Snapshots**: Automatic fallback dataset exports (`.json`) containing complete database records across all tables.
- 🛡️ **Idempotent Transaction Protection**: Prevents duplicate credit billing during network retries via `Idempotency-Key` headers with automatic failure release.

---

## 🏗️ Architecture & Technology Stack

HisabFlow is built following **Clean Architecture** principles to deliver enterprise reliability and performance:

```
┌─────────────────────────────────────────────────────────────┐
│               Unified Host Application                     │
│      ASP.NET Core 9 Web Host (http://localhost:5200)        │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   Next.js Frontend    │       │   ASP.NET Core API    │  │
│  │ (Served from wwwroot) │       │      (/api/v1/...)    │  │
│  └───────────────────────┘       └───────────┬───────────┘  │
└──────────────────────────────────────────────┼──────────────┘
                                               │ Dapper Micro-ORM
                                 ┌─────────────▼──────────────┐
                                 │   SQL Server Database      │
                                 │       (HisabFlowDB)        │
                                 └────────────────────────────┘
```

### 💻 Technology Stack

| Layer | Technology | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 15 + React 19** | Modern App Router UI, Modular Domain Hooks (`useCustomerDomain`, `useProductDomain`, `useExpenseDomain`, `useSupplierDomain`), Tailwind CSS, Lucide Icons, Bikram Sambat Date Converter |
| **API Layer** | **ASP.NET Core 9** | Global Exception Handler (RFC 7807 `ProblemDetails`), `AutoValidationFilter`, `IdempotencyFilter` with release on exception |
| **Core Layer** | **Clean Architecture** | Centralized `DTOs/`, Centralized `Validators/` (FluentValidation), Pure Interfaces |
| **Data Layer** | **Dapper Micro-ORM** | Direct SQL queries, `BeginTransactionAsync`, `UPDLOCK, ROWLOCK`, Composite Indexes, Versioned Migrations (`__DbMigrationsHistory`) |
| **Database** | **SQL Server 2022** | Relational integrity, ACID compliance, soft-deletes, unique filtered indexes, optimistic concurrency |
| **Testing** | **xUnit + Moq** | Automated unit & integration test suite (`backend/tests/HisabFlow.Tests`) |
| **CI/CD & Bundle** | **GitHub Actions + Build Script** | Monorepo production bundle script (`npm run bundle`) wrapping static frontend inside ASP.NET Core `wwwroot` |

---

## 📁 Repository Directory Structure

```text
hisabflow/
├── 📁 .github/workflows/             # ⚙️ CI/CD GitHub Actions Pipeline (ci-cd.yml)
├── 📁 backend/                       # ⚡ .NET 9 Clean Architecture Solution
│   ├── 📁 src/
│   │   ├── 📁 HisabFlow.Api/         # Controllers, Middlewares, Action Filters, wwwroot host
│   │   ├── 📁 HisabFlow.Application/ # Centralized DTOs, Centralized Validators, Core Interfaces
│   │   ├── 📁 HisabFlow.Domain/      # Entities (Customer, Supplier, Sale, Expense, Product, CashDrawer) & Enums
│   │   └── 📁 HisabFlow.Infrastructure/# Dapper Repositories, SQL Connection Factory, Migrations, Backup Service
│   └── 📁 tests/
│       └── 📁 HisabFlow.Tests/       # xUnit Unit & Integration Test Suite
├── 📁 frontend/                      # 🎨 Next.js 15 / React 19 Frontend Web Application
│   ├── 📁 app/                       # App Router Pages (customers, pos, suppliers, expenses, reports, etc.)
│   ├── 📁 components/            # UI Components, Modals, BsDatePicker, LanguageToggle
│   ├── 📁 context/               # Facade KhataContext, ToastContext, SettingsContext
│   ├── 📁 hooks/                 # Modular Domain Hooks (useCustomerDomain, useProductDomain, etc.)
│   ├── 📁 lib/                   # Typed API Client (api.ts), BS Date Converter, i18n
│   └── 📄 package.json               # Node.js dependencies & scripts
├── 📁 scripts/                       # 🛠️ Monorepo PowerShell Build & Deployment Scripts
├── 📄 package.json                   # Monorepo bundle script runner
└── 📄 README.md                      # Project Documentation
```

---

## 🚀 Quick Start & How to Run

### 1. Database Setup (SQL Server)
Configure your SQL Server connection string in `backend/src/HisabFlow.Api/appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=HisabFlowDB;Trusted_Connection=True;TrustServerCertificate=True;"
}
```
Database tables, versioned migrations (`__DbMigrationsHistory`), and indexes are automatically verified and executed at application startup asynchronously.

### 2. Run Backend & Frontend (Development)

**Run Backend API Server**:
```bash
dotnet run --project backend/src/HisabFlow.Api
```

**Run Frontend Development Server**:
```bash
cd frontend
npm install
npm run dev
```

Open your browser at **[http://localhost:3000](http://localhost:3000)** (Frontend) or **[http://localhost:5200/swagger](http://localhost:5200/swagger)** (Swagger API Docs).

### 3. Production Monorepo Bundle (Single Deployment Artifact)

To build the optimized Next.js static export (with production ESLint active) and wrap it directly inside ASP.NET Core `wwwroot`:

```bash
npm run bundle
```

Then launch the unified backend host server:

```bash
dotnet run --project backend/src/HisabFlow.Api
```
Access the application at **[http://localhost:5200](http://localhost:5200)**.

---

## 🧪 Running Unit Tests & Verification

Run the full xUnit test suite across all application modules:

```bash
dotnet test backend/HisabFlow.sln
```

Run frontend ESLint and TypeScript checks:

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

---

## 🛡️ Reliability & Security Highlights

- 🔒 **Transaction Idempotency**: Transactions carrying an `Idempotency-Key` or `X-Idempotency-Key` header prevent duplicate billing during network retries with automatic reservation release on failure.
- 🛑 **Global Exception Handling**: Unhandled exceptions automatically map to RFC 7807 `ProblemDetails` / `ValidationProblemDetails` responses.
- ⚡ **Row-Level Concurrency Locking**: Ledger entries, stock adjustments, and sales refunds use SQL Server `WITH (UPDLOCK, ROWLOCK)` to prevent race conditions during simultaneous writes.
- 🏦 **Register Shift Consistency**: Filtered unique index `uq_cash_drawers_open_shift` guarantees only one open shift at any given time per register.
- ♻️ **Soft Deletes**: Customer and supplier profiles use soft deletion (`is_active = 0`) to preserve historical invoice audit integrity.
- 🩺 **Sanitized Health Monitoring**: Integrated health endpoints available at `/health` and `/health/ready` with sanitized error responses.
