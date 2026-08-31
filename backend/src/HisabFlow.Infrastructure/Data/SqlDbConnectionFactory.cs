using System.Data;
using Dapper;
using HisabFlow.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.SqlClient;

namespace HisabFlow.Infrastructure.Data;

public class SqlDbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;
    private static bool _tablesInitialized = false;
    private static readonly object _initLock = new();

    public SqlDbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection connection string is not configured.");
    }

    public IDbConnection CreateConnection()
    {
        var connection = new SqlConnection(_connectionString);
        connection.Open();
        return connection;
    }

    public async Task<IDbConnection> CreateConnectionAsync(CancellationToken cancellationToken = default)
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    public async Task EnsureTablesCreatedAsync(CancellationToken cancellationToken = default)
    {
        if (_tablesInitialized) return;

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        const string sql = @"
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'expenses')
            BEGIN
                CREATE TABLE expenses (
                    id UNIQUEIDENTIFIER PRIMARY KEY,
                    category NVARCHAR(100) NOT NULL,
                    title NVARCHAR(200) NOT NULL,
                    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
                    payment_method INT NOT NULL DEFAULT 1,
                    particulars NVARCHAR(MAX),
                    expense_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                );
                CREATE INDEX idx_expenses_category ON expenses(category);
                CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
            END

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

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'supplier_ledger_entries')
            BEGIN
                CREATE TABLE supplier_ledger_entries (
                    id UNIQUEIDENTIFIER PRIMARY KEY,
                    supplier_id UNIQUEIDENTIFIER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
                    type INT NOT NULL,
                    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
                    balance_after DECIMAL(12, 2) NOT NULL,
                    payment_method INT NOT NULL DEFAULT 1,
                    particulars NVARCHAR(MAX),
                    invoice_number NVARCHAR(50),
                    transaction_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                );
                CREATE INDEX idx_supplier_ledger_date ON supplier_ledger_entries(supplier_id, transaction_date DESC);
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'sales')
            BEGIN
                CREATE TABLE sales (
                    id UNIQUEIDENTIFIER PRIMARY KEY,
                    invoice_number NVARCHAR(50) NOT NULL UNIQUE,
                    customer_id UNIQUEIDENTIFIER NULL REFERENCES customers(id) ON DELETE SET NULL,
                    customer_name NVARCHAR(100) NULL,
                    customer_phone NVARCHAR(20) NULL,
                    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    change_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    payment_method INT NOT NULL DEFAULT 1,
                    cash_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    digital_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    credit_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    notes NVARCHAR(MAX) NULL,
                    sale_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                );
                CREATE INDEX idx_sales_invoice ON sales(invoice_number);
                CREATE INDEX idx_sales_date ON sales(sale_date DESC);
                CREATE INDEX idx_sales_customer ON sales(customer_id);
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'sale_items')
            BEGIN
                CREATE TABLE sale_items (
                    id UNIQUEIDENTIFIER PRIMARY KEY,
                    sale_id UNIQUEIDENTIFIER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
                    product_id UNIQUEIDENTIFIER NOT NULL REFERENCES products(id),
                    product_name NVARCHAR(200) NOT NULL,
                    unit NVARCHAR(20) NOT NULL,
                    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    quantity DECIMAL(12, 2) NOT NULL DEFAULT 1.00,
                    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                );
                CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
                CREATE INDEX idx_sale_items_product ON sale_items(product_id);
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'idempotency_records')
            BEGIN
                CREATE TABLE idempotency_records (
                    idempotency_key NVARCHAR(128) NOT NULL PRIMARY KEY,
                    request_path NVARCHAR(256) NOT NULL,
                    response_status_code INT NOT NULL,
                    response_body NVARCHAR(MAX) NOT NULL,
                    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                );
                CREATE INDEX idx_idempotency_created ON idempotency_records(created_at DESC);
            END

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_customer_ledger_date')
            BEGIN
                CREATE INDEX idx_customer_ledger_date ON customer_ledger_entries(customer_id, transaction_date DESC, created_at DESC);
            END

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_customers_active_updated')
            BEGIN
                CREATE INDEX idx_customers_active_updated ON customers(is_active, updated_at DESC);
            END

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_sales_customer_date')
            BEGIN
                CREATE INDEX idx_sales_customer_date ON sales(customer_id, sale_date DESC);
            END

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_expenses_filter')
            BEGIN
                CREATE INDEX idx_expenses_filter ON expenses(category, expense_date DESC);
            END";

        try
        {
            await connection.ExecuteAsync(new CommandDefinition(sql, cancellationToken: cancellationToken));
            _tablesInitialized = true;
        }
        catch
        {
            // Fallback gracefully if permissions or table exists
        }
    }
}
