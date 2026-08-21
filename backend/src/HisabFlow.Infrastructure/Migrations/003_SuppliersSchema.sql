-- =======================================================
-- HisabFlow SQL Server Schema Migration (Phase 3: Suppliers & Wholesale)
-- Target Server: SHINIGAMI | Database: HisabFlowDB
-- =======================================================

USE [HisabFlowDB];
GO

-- 1. Suppliers Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'suppliers')
BEGIN
    CREATE TABLE suppliers (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        company_name NVARCHAR(150),
        phone NVARCHAR(20) NOT NULL UNIQUE,
        address NVARCHAR(MAX),
        current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX idx_suppliers_phone ON suppliers(phone);
    CREATE INDEX idx_suppliers_updated_at ON suppliers(updated_at DESC);
END
GO

-- 2. Supplier Ledger Entries Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'supplier_ledger_entries')
BEGIN
    CREATE TABLE supplier_ledger_entries (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        supplier_id UNIQUEIDENTIFIER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        type INT NOT NULL, -- 1: Purchase (Debt Increase), 2: Payment Given (Debt Reduce)
        amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
        balance_after DECIMAL(12, 2) NOT NULL,
        payment_method INT NOT NULL DEFAULT 1, -- 1: Cash, 2: QR, 3: BankTransfer
        particulars NVARCHAR(MAX),
        invoice_number NVARCHAR(50),
        transaction_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX idx_supplier_ledger_date ON supplier_ledger_entries(supplier_id, transaction_date DESC);
END
GO
