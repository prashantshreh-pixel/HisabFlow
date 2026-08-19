# HisabFlow 🛒📋

> **A real-world, high-reliability grocery shop management system designed to completely replace the traditional paper notebook.**  
> Track daily sales, customer Khata (Udhaar), inventory, purchases, expenses, and net profit with zero friction.

---

## 🎯 Project Goal

Small retail and grocery shop owners rely heavily on paper registers to track credit sales (*Udhaar*), stock, and daily cash flow. Paper records are prone to damage, miscalculations, lost balances, and lack business insights.

**HisabFlow** is built from the ground up for real retail operations: fast, reliable, offline-tolerant, and simple enough for everyday store counter use.

---

## 🏗️ Architecture & Technology Stack

The project follows a clean, pragmatic architecture designed for speed, type safety, and maintainability without over-engineering.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│      Next.js (App Router) + TypeScript + Tailwind CSS       │
│               shadcn/ui + TanStack Query                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON
┌──────────────────────────────▼──────────────────────────────┐
│                  Backend (ASP.NET Core)                     │
│    Clean Architecture (API → Application → Domain → Infra)  │
│                Lightweight CQRS Pattern                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Queries & Commands
┌──────────────────────────────▼──────────────────────────────┐
│                    Data Access & Storage                    │
│                     Dapper (Micro-ORM)                      │
│                    PostgreSQL Database                      │
└─────────────────────────────────────────────────────────────┘
```

### 💻 Stack Overview

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | **Next.js + TypeScript** | Modern SSR/SPA hybrid UI, strict type safety, fast page loads |
| **UI Components** | **Tailwind CSS + shadcn/ui** | Clean, accessible, customizable component system |
| **State & Fetching** | **TanStack Query** | Server state caching, optimistic UI updates, background revalidation |
| **Backend** | **ASP.NET Core** | High performance, robust type system, enterprise-grade reliability |
| **Architecture** | **Clean Architecture + CQRS** | Clear separation of concerns (Commands for writes, Queries for reads) |
| **Data Access** | **Dapper** | Raw SQL performance, maximum query control, zero ORM overhead |
| **Database** | **PostgreSQL** | ACID compliance, transactional integrity for financial ledgers |

---

## 🚫 Pragmatic Engineering Principles (What We Avoid Initially)

To maintain rapid development and focus on business value, the system deliberately avoids unnecessary complexity:
- ❌ **No Microservices** (Monolithic by design)
- ❌ **No Message Brokers** (No Kafka / RabbitMQ)
- ❌ **No Kubernetes** (Simple Docker / direct hosting)
- ❌ **No Event Sourcing** (Direct relational ledger tables with audit trails)
- ❌ **No Redis Everywhere** (Rely on PostgreSQL and TanStack Query caching first)
- ❌ **No Overly Generic Repositories** (Explicit Dapper query handlers)

---

## 🗺️ Feature-by-Feature Development Roadmap

Development is structured strictly feature-by-feature to ensure end-to-end reliability:

```
[1] Database Schema & Business Rules
 └── [2] UI Design System Foundation (Tailwind + shadcn/ui)
      └── [3] 🎯 Feature 1: Customer / Khata End-to-End
           └── [4] Feature 2: Sales & Payments (Cash + Credit Counter)
                └── [5] Feature 3: Inventory & Low Stock Tracking
                     └── [6] Feature 4: Purchases & Supplier Khata
                          └── [7] Feature 5: Daily Expenses & Cash Drawer
                               └── [8] Feature 6: Reports & Profit / Loss
                                    └── [9] Feature 7: Auth, Backups, Barcode Scanner
```

---

## 🎯 First Milestone: Customer & Khata (Udhaar) Flow

The primary focus is delivering the full credit lifecycle end-to-end:

$$\text{Customer} \longrightarrow \text{Credit Sale} \longrightarrow \text{Ledger Entry} \longrightarrow \text{Partial Payment} \longrightarrow \text{Full Settlement}$$

1. **Customer Management**: Profile, phone number, credit limit, and current balance.
2. **Credit Sale (Udhaar)**: Record debit entries with item particulars and bill references.
3. **Ledger Integrity**: Running balances calculated strictly inside database transactions.
4. **Payments (Jama)**: Partial payments (Cash / QR / Transfer) and automated balance reduction.
5. **Customer Statements**: Printable/shareable transaction statements for customers.

---

## 📁 Repository Structure

```plaintext
hisabflow/
├── apps/ or web/             # Next.js Frontend Application
│   ├── app/                  # App Router pages and layouts
│   ├── components/           # UI components, modals, and views
│   ├── hooks/                # Custom React hooks (TanStack queries/mutations)
│   ├── lib/                  # Utilities and API client
│   └── types/                # Shared TypeScript models
├── src/ or backend/          # ASP.NET Core Backend Solution
│   ├── HisabFlow.Api/        # Controllers / Minimal API Endpoints
│   ├── HisabFlow.Application/# Commands, Queries, Validators, DTOs
│   ├── HisabFlow.Domain/     # Core Entities, Enums, Business Rules
│   └── HisabFlow.Infrastructure/ # Dapper Repositories, DB Connections, Migrations
└── database/                 # PostgreSQL SQL schema migrations and seed scripts
```

---

## 🚀 Getting Started (Frontend Prototype)

### Prerequisites
- Node.js (v18+)
- npm / pnpm

```bash
# Clone the repository
git clone https://github.com/your-username/hisabflow.git
cd hisabflow

# Install dependencies
npm install

# Start frontend development server
npm run dev
```

Visit `http://localhost:3000` to interact with the UI prototype.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

