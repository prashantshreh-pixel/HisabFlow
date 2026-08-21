-- =======================================================
-- HisabFlow SQL Server Schema Migration (Phase 2: Expenses)
-- Target Server: SHINIGAMI | Database: HisabFlowDB
-- =======================================================

USE [HisabFlowDB];
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'expenses')
BEGIN
    CREATE TABLE expenses (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        category NVARCHAR(100) NOT NULL,
        title NVARCHAR(200) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
        payment_method INT NOT NULL DEFAULT 1, -- 1: Cash, 2: QR, 3: BankTransfer
        particulars NVARCHAR(MAX),
        expense_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX idx_expenses_category ON expenses(category);
    CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
END
GO
