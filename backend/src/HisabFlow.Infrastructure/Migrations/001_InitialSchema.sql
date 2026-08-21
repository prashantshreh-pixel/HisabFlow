-- =======================================================
-- HisabFlow SQL Server Initial Schema Migration (Phase 1: Khata)
-- Target Server: SHINIGAMI | Database: HisabFlowDB
-- =======================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'HisabFlowDB')
BEGIN
    CREATE DATABASE [HisabFlowDB];
END
GO

USE [HisabFlowDB];
GO

-- 1. Customers Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'customers')
BEGIN
    CREATE TABLE customers (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        phone NVARCHAR(20) NOT NULL UNIQUE,
        address NVARCHAR(MAX),
        credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 5000.00,
        current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX idx_customers_phone ON customers(phone);
    CREATE INDEX idx_customers_updated_at ON customers(updated_at DESC);
END
GO

-- 2. Customer Ledger Entries Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'customer_ledger_entries')
BEGIN
    CREATE TABLE customer_ledger_entries (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        customer_id UNIQUEIDENTIFIER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        type INT NOT NULL, -- 1: Debit (Udhaar/Given), 2: Credit (Jama/Received)
        amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
        balance_after DECIMAL(12, 2) NOT NULL,
        payment_method INT NOT NULL DEFAULT 1, -- 1: Cash, 2: QR, 3: BankTransfer, 4: CreditNote
        particulars NVARCHAR(MAX),
        bill_number NVARCHAR(50),
        transaction_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX idx_ledger_customer_date ON customer_ledger_entries(customer_id, transaction_date DESC);
END
GO

-- 3. Products Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'products')
BEGIN
    CREATE TABLE products (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        category NVARCHAR(100) NOT NULL,
        unit NVARCHAR(20) NOT NULL,
        cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        stock_quantity DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        min_stock_alert DECIMAL(12, 2) NOT NULL DEFAULT 5.00,
        barcode NVARCHAR(100),
        image_url NVARCHAR(MAX),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX idx_products_category ON products(category);
    CREATE INDEX idx_products_barcode ON products(barcode);
END
GO
