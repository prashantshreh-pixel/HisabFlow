-- =======================================================
-- HisabFlow SQL Server Initial Schema (Phase 1: Khata)
-- =======================================================

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
