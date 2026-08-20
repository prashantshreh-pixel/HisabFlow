# HisabFlow 🛒📋

> **A real-world, high-reliability grocery shop management system designed to completely replace the traditional paper notebook.**  
> Track daily sales, customer Khata (Udhaar), inventory, purchases, expenses, and net profit with zero friction.

---

## 🎯 Project Goal

Small retail and grocery shop owners rely heavily on paper registers to track credit sales (*Udhaar*), stock, and daily cash flow. Paper records are prone to damage, miscalculations, lost balances, and lack business insights.

**HisabFlow** is built from the ground up for real retail operations: fast, reliable, offline-tolerant, and simple enough for everyday store counter use.

---

## 🏗️ Architecture & Technology Stack

The project follows a clean, pragmatic architecture designed for speed, type safety, and maintainability without over-engineering:

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
| **Frontend** | **Next.js 15 + TypeScript** | Modern SPA UI, strict type safety, statically exported to `out/` |
| **UI Components** | **Tailwind CSS + Lucide Icons** | Fast, accessible, dark-themed retail interface |
| **State & API Client** | **React Context + `lib/api.ts`** | Relative same-origin API calls with async loading states |
| **Backend API** | **ASP.NET Core 9** | Clean Architecture (Api ➔ Application ➔ Domain ➔ Infrastructure) |
| **Data Access** | **Dapper (Micro-ORM)** | High-performance SQL queries and atomic row-level transaction locks |
| **Database** | **SQL Server 2022 (`SHINIGAMI`)** | ACID compliance, transactional integrity for financial ledgers |

---

## 🚫 Pragmatic Engineering Principles (What We Avoid Initially)

- ❌ **No Microservices** (Monolithic unified server by design)
- ❌ **No Message Brokers** (No Kafka / RabbitMQ)
- ❌ **No Kubernetes** (Direct hosting via ASP.NET Core)
- ❌ **No Event Sourcing** (Direct relational ledger tables with audit trails)
- ❌ **No Overly Generic Repositories** (Explicit Dapper query handlers)

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

### 2. Build & Bundle Everything
Run the one-command bundle script to export the Next.js frontend into ASP.NET Core `wwwroot` and compile the .NET solution:

```bash
# Export frontend to wwwroot + compile solution
npm run bundle
```

### 3. Run the Unified Backend Server
```bash
dotnet run --project backend/src/HisabFlow.Api
```

Open your browser at **[http://localhost:5200](http://localhost:5200)**:
- 🌐 **Frontend App:** `http://localhost:5200/`
- 🩺 **Health Check:** `http://localhost:5200/api/v1/health`
- 📑 **Swagger Docs:** `http://localhost:5200/swagger/index.html`
- 👥 **Customer API:** `http://localhost:5200/api/v1/customers`

---

## 📁 Repository Structure

```plaintext
hisabflow/
├── app/                      # Next.js App Router pages and layouts
├── components/               # React UI components, modals, and views
├── context/                  # KhataContext state manager (database connected)
├── lib/                      # Typed API client wrapper (lib/api.ts)
├── scripts/                  # Build and deployment scripts (build-and-deploy.ps1)
├── backend/src/
│   ├── HisabFlow.Api/        # Controllers, Program.cs, wwwroot static host
│   ├── HisabFlow.Application/# Commands, Queries, Validators, DTOs
│   ├── HisabFlow.Domain/     # Core Entities, Enums, Business Rules
│   └── HisabFlow.Infrastructure/ # Dapper Repositories, Migrations, DB Connection
```
