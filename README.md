# HisabFlow 🛒📋

> **A real-world, high-reliability grocery shop management system designed to completely replace the traditional paper notebook.**  
> Track daily sales, customer Khata (Udhaar), inventory, purchases, expenses, and net profit with zero friction.

---

## 🎯 Project Goal

Small retail and grocery shop owners rely heavily on paper registers to track credit sales (*Udhaar*), stock, and daily cash flow. Paper records are prone to damage, miscalculations, lost balances, and lack business insights.

**HisabFlow** is built from the ground up for real retail operations: fast, reliable, offline-tolerant, and simple enough for everyday store counter use.

---

## 🏗️ Architecture & Technology Stack

The project follows a clean, pragmatic monorepo architecture designed for speed, type safety, and maintainability without over-engineering:

```
┌─────────────────────────────────────────────────────────────┐
│               Unified Application Server                    │
│      ASP.NET Core 9 Web Host (http://localhost:5200)        │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   Next.js Frontend    │       │   ASP.NET Core API    │  │
│  │ (Served from wwwroot) │       │      (/api/v1/...)    │  │
│  └───────────────────────┘       └───────────┬───────────┘  │
└──────────────────────────────────────────────┼──────────────┘
                                               │ Dapper / SQL Queries
                                 ┌─────────────▼──────────────┐
                                 │   SQL Server (SHINIGAMI)   │
                                 │       Database:            │
                                 │      HisabFlowDB           │
                                 └────────────────────────────┘
```

### 💻 Stack Overview

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 15 + TypeScript** | Modern SPA UI in `frontend/`, statically exported to `frontend/out` |
| **UI Components** | **Tailwind CSS + Lucide Icons** | Fast, accessible, dark-themed retail interface |
| **State & API Client** | **React Context + `lib/api.ts`** | Relative same-origin API calls with async loading states |
| **Backend API** | **ASP.NET Core 9** | Clean Architecture in `backend/` (`Api` ➔ `Application` ➔ `Domain` ➔ `Infrastructure`) |
| **Data Access** | **Dapper (Micro-ORM)** | High-performance SQL queries and atomic row-level transaction locks |
| **Database** | **SQL Server 2022 (`SHINIGAMI`)** | ACID compliance, transactional integrity for financial ledgers |

---

## 📁 Monorepo Directory Structure

```plaintext
hisabflow/
├── frontend/                  # Next.js 15 / TypeScript Application
│   ├── app/                   # App Router pages and layouts
│   ├── components/            # React UI components, modals, and views
│   ├── context/               # KhataContext state manager (database-connected)
│   ├── lib/                   # Typed API client wrapper (lib/api.ts)
│   ├── package.json           # Frontend dependencies
│   └── next.config.ts         # Static export configuration
├── backend/                   # ASP.NET Core 9 Clean Architecture Solution
│   ├── HisabFlow.sln          # Solution file
│   └── src/
│       ├── HisabFlow.Api/     # Controllers, Program.cs, wwwroot static host
│       ├── HisabFlow.Application/   # Commands, Queries, DTOs
│       ├── HisabFlow.Domain/        # Entities, Enums, Business Rules
│       └── HisabFlow.Infrastructure/# Dapper Repositories, Migrations
├── scripts/                   # Build & deployment automation (build-and-deploy.ps1)
├── package.json               # Monorepo root script runner
└── README.md
```

---

## 🚀 Quick Start & How to Run

### 1. Database Setup (SQL Server: `SHINIGAMI`)
The SQL migration script automatically creates `HisabFlowDB` and sets up table schemas and indexes:

```powershell
sqlcmd -S SHINIGAMI -E -C -i backend/src/HisabFlow.Infrastructure/Migrations/001_InitialSchema.sql
```

The connection string in `backend/src/HisabFlow.Api/appsettings.json` is configured as:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=SHINIGAMI;Database=HisabFlowDB;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

### 2. Build & Bundle Everything (Production Mode)
Run the one-command bundle script to export the Next.js frontend into ASP.NET Core `wwwroot` and compile the .NET solution:

```bash
# Export frontend to wwwroot + compile solution
npm run bundle
```

### 3. Run the Unified Backend Server
```bash
# Run backend server directly from root
npm run dev:backend
# OR
dotnet run --project backend/src/HisabFlow.Api
```

Open your browser at **[http://localhost:5200](http://localhost:5200)**:
- 🌐 **Frontend App:** `http://localhost:5200/`
- 🩺 **Health Check:** `http://localhost:5200/api/v1/health`
- 📑 **Swagger Docs:** `http://localhost:5200/swagger/index.html`
- 👥 **Customer API:** `http://localhost:5200/api/v1/customers`

---

## 🛠️ Development Workflow Scripts

From the root directory, you can run:

- `npm run bundle` — Builds static export inside `frontend/out`, syncs to `backend/src/HisabFlow.Api/wwwroot`, and compiles ASP.NET Core solution.
- `npm run dev:frontend` — Runs Next.js development server inside `frontend/` (port 3000).
- `npm run dev:backend` — Runs ASP.NET Core backend server (port 5200).
- `npm run build:backend` — Compiles the ASP.NET Core solution in Release mode.

---

## 🚫 Pragmatic Engineering Principles

- ❌ **No Microservices** (Monolithic unified server by design)
- ❌ **No Message Brokers** (No Kafka / RabbitMQ)
- ❌ **No Kubernetes** (Direct hosting via ASP.NET Core)
- ❌ **No Event Sourcing** (Direct relational ledger tables with audit trails)
- ❌ **No Overly Generic Repositories** (Explicit Dapper query handlers)
