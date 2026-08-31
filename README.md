# HisabFlow 🛒📋

> **A real-world, high-reliability retail and grocery management system designed to completely replace paper registers.**  
> Track daily POS sales, Customer Khata (*Udhaar*), Wholesaler statements, inventory stock, operating expenses, and net profit with zero friction.

---

## 🎯 Key Features

- 🇳🇵 **Bikram Sambat (B.S.) Date Toggle & Nepali UI (नेपाली)**: Seamless toggle between Gregorian (A.D.) and Nepali (B.S.) calendars with multi-language UI support.
- 📖 **Customer Khata (Udhaar) Credit Ledger**: Atomic credit transactions, row-locked balance tracking, and paged customer statements.
- 🏬 **Wholesaler & Supplier Ledger**: Track stock purchases, payments given, and outstanding supplier payables.
- 🛒 **Point of Sale (POS) Checkout**: High-speed billing with barcode scanner support, receipt generation, and real-time inventory stock deductions.
- 📦 **Inventory & Barcode Management**: Catalogue management, low stock alerts, image uploads, search filtering, and paged catalogue browsing.
- 💸 **Operating Expenses & Financial Reports**: Categorized expense tracking with date-range filters, gross profit margin analysis, and net profit calculations.
- 🛡️ **Idempotent Transaction Protection**: Prevents duplicate credit billing during network retries via `X-Idempotency-Key` headers.

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
| **Frontend** | **Next.js 15 + React 19** | Modern App Router UI, Tailwind CSS, Lucide Icons, Bikram Sambat Date Converter |
| **API Layer** | **ASP.NET Core 9** | Global Exception Handler (RFC 7807 `ProblemDetails`), `AutoValidationFilter`, `IdempotencyFilter` |
| **Core Layer** | **Clean Architecture** | Centralized `DTOs/`, Centralized `Validators/` (FluentValidation), Pure Interfaces |
| **Data Layer** | **Dapper Micro-ORM** | Direct SQL queries, `BeginTransactionAsync`, `UPDLOCK, ROWLOCK`, Composite Indexes |
| **Database** | **SQL Server 2022** | Relational integrity, ACID compliance, soft-deletes, optimistic concurrency |
| **Testing** | **xUnit + Moq** | Automated unit & integration tests (`backend/tests/HisabFlow.Tests`) |
| **CI/CD** | **GitHub Actions** | Automated build, typecheck, and test pipeline (`.github/workflows/ci-cd.yml`) |

---

## 📁 Repository Directory Structure

```text
hisabflow/
├── 📁 .github/workflows/             # ⚙️ CI/CD GitHub Actions Pipeline (ci-cd.yml)
├── 📁 backend/                       # ⚡ .NET 9 Clean Architecture Solution
│   ├── 📁 src/
│   │   ├── 📁 HisabFlow.Api/         # Controllers, Middlewares, Action Filters, wwwroot host
│   │   ├── 📁 HisabFlow.Application/ # Centralized DTOs, Centralized Validators, Core Interfaces
│   │   ├── 📁 HisabFlow.Domain/      # Entities (Customer, Supplier, Sale, Expense, Product) & Enums
│   │   └── 📁 HisabFlow.Infrastructure/# Dapper Repositories, SQL Connection Factory, Migrations
│   └── 📁 tests/
│       └── 📁 HisabFlow.Tests/       # xUnit Unit & Integration Test Suite
├── 📁 frontend/                      # 🎨 Next.js 15 / React 19 Frontend Web Application
│   ├── 📁 src/
│   │   ├── 📁 app/                   # App Router Pages (customers, pos, suppliers, expenses, etc.)
│   │   ├── 📁 components/            # UI Components, Modals, BsDatePicker, LanguageToggle
│   │   ├── 📁 lib/                   # Typed API Client (api.ts), BS Date Converter, i18n
│   │   └── 📁 types/                 # TypeScript API & Domain Typings
│   └── 📄 package.json               # Node.js dependencies
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
Database tables and indexes are automatically created at application startup asynchronously.

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

---

## 🧪 Running Unit Tests & Verification

Run the full xUnit test suite across all application modules:

```bash
dotnet test backend/HisabFlow.sln
```

Run frontend TypeScript typecheck:

```bash
cd frontend
npx tsc --noEmit
```

---

## 🛡️ Reliability & Security Highlights

- 🔒 **Transaction Idempotency**: Transactions carrying an `X-Idempotency-Key` or `Idempotency-Key` header prevent duplicate billing during network timeouts.
- 🛑 **Global Exception Handling**: Unhandled exceptions automatically map to RFC 7807 `ProblemDetails` / `ValidationProblemDetails` responses.
- ⚡ **Row-Level Concurrency Locking**: Ledger entries use SQL Server `WITH (UPDLOCK, ROWLOCK)` to prevent race conditions during simultaneous credit writes.
- ♻️ **Soft Deletes**: Customer and supplier profiles use soft deletion (`is_active = 0`) to preserve historical invoice audit integrity.
- 🩺 **Health Monitoring**: Integrated health endpoints available at `/health` and `/health/ready`.
