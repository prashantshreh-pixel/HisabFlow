using Dapper;
using HisabFlow.Application.Common.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Data;

namespace HisabFlow.Infrastructure.Data;

public class SqlDbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;
    private readonly ILogger<SqlDbConnectionFactory> _logger;
    private static bool _tablesInitialized = false;
    private static readonly SemaphoreSlim _semaphore = new(1, 1);

    public SqlDbConnectionFactory(IConfiguration configuration, ILogger<SqlDbConnectionFactory> logger)
    {
        _logger = logger;
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

        await _semaphore.WaitAsync(cancellationToken);
        try
        {
            if (_tablesInitialized) return;

            using var connection = (SqlConnection)await CreateConnectionAsync(cancellationToken);

            const string ensureHistoryTableSql = @"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'__DbMigrationsHistory')
                BEGIN
                    CREATE TABLE __DbMigrationsHistory (
                        migration_id NVARCHAR(150) NOT NULL PRIMARY KEY,
                        applied_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                    );
                END";
            await connection.ExecuteAsync(new CommandDefinition(ensureHistoryTableSql, cancellationToken: cancellationToken));

            var migrations = new (string Id, string SqlScript)[]
            {
                ("001_InitialTables", @"
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'customers')
                    BEGIN
                        CREATE TABLE customers (
                            id UNIQUEIDENTIFIER PRIMARY KEY,
                            name NVARCHAR(100) NOT NULL,
                            phone NVARCHAR(20) NOT NULL UNIQUE,
                            address NVARCHAR(MAX),
                            credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 5000.00 CHECK (credit_limit >= 0),
                            current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                            is_active BIT NOT NULL DEFAULT 1,
                            created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                            updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                        );
                    END

                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'customer_ledger_entries')
                    BEGIN
                        CREATE TABLE customer_ledger_entries (
                            id UNIQUEIDENTIFIER PRIMARY KEY,
                            customer_id UNIQUEIDENTIFIER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                            type INT NOT NULL,
                            amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
                            balance_after DECIMAL(12, 2) NOT NULL,
                            payment_method INT NOT NULL DEFAULT 1,
                            particulars NVARCHAR(MAX),
                            bill_number NVARCHAR(50),
                            transaction_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                            created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                        );
                    END

                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'products')
                    BEGIN
                        CREATE TABLE products (
                            id UNIQUEIDENTIFIER PRIMARY KEY,
                            name NVARCHAR(200) NOT NULL,
                            sku NVARCHAR(50) NULL,
                            barcode NVARCHAR(50) NULL,
                            category NVARCHAR(100) NOT NULL DEFAULT N'General',
                            unit NVARCHAR(20) NOT NULL DEFAULT N'pcs',
                            selling_price DECIMAL(12, 2) NOT NULL CHECK (selling_price >= 0),
                            cost_price DECIMAL(12, 2) NOT NULL CHECK (cost_price >= 0),
                            stock_quantity DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                            min_stock_alert DECIMAL(12, 2) NOT NULL DEFAULT 5.00,
                            image_url NVARCHAR(500) NULL,
                            is_active BIT NOT NULL DEFAULT 1,
                            created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                            updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                        );
                    END

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
                            is_refunded BIT NOT NULL DEFAULT 0,
                            refunded_at DATETIME2 NULL,
                            sale_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                            created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                            updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                        );
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
                    END

                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'__IdempotencyKeys')
                    BEGIN
                        CREATE TABLE __IdempotencyKeys (
                            idempotency_key VARCHAR(64) NOT NULL PRIMARY KEY,
                            request_hash VARCHAR(64) NOT NULL,
                            status VARCHAR(20) NOT NULL,
                            response_code INT NULL,
                            response_body NVARCHAR(MAX) NULL,
                            created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                        );
                    END"),

                ("002_CreateIndexes", @"
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_expenses_category')
                        CREATE INDEX idx_expenses_category ON expenses(category);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_expenses_date')
                        CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_suppliers_phone')
                        CREATE INDEX idx_suppliers_phone ON suppliers(phone);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_suppliers_updated_at')
                        CREATE INDEX idx_suppliers_updated_at ON suppliers(updated_at DESC);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_supplier_ledger_date')
                        CREATE INDEX idx_supplier_ledger_date ON supplier_ledger_entries(supplier_id, transaction_date DESC);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_sales_invoice')
                        CREATE INDEX idx_sales_invoice ON sales(invoice_number);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_sales_date')
                        CREATE INDEX idx_sales_date ON sales(sale_date DESC);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_sales_customer')
                        CREATE INDEX idx_sales_customer ON sales(customer_id);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_sale_items_sale')
                        CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_sale_items_product')
                        CREATE INDEX idx_sale_items_product ON sale_items(product_id);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_idempotency_created')
                        CREATE INDEX idx_idempotency_created ON __IdempotencyKeys(created_at DESC);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_customer_ledger_date')
                        CREATE INDEX idx_customer_ledger_date ON customer_ledger_entries(customer_id, transaction_date DESC, created_at DESC);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_customers_active_updated')
                        CREATE INDEX idx_customers_active_updated ON customers(is_active, updated_at DESC);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_sales_customer_date')
                        CREATE INDEX idx_sales_customer_date ON sales(customer_id, sale_date DESC);
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_expenses_filter')
                        CREATE INDEX idx_expenses_filter ON expenses(category, expense_date DESC);"),

                ("003_CreateAuditAndInventoryTables", @"
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'audit_logs')
                    BEGIN
                        CREATE TABLE audit_logs (
                            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            entity_name VARCHAR(50) NOT NULL,
                            entity_id VARCHAR(64) NOT NULL,
                            action VARCHAR(20) NOT NULL,
                            changes_json NVARCHAR(MAX) NULL,
                            performed_by VARCHAR(100) NOT NULL,
                            created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                        );
                    END

                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'stock_movements')
                    BEGIN
                        CREATE TABLE stock_movements (
                            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            product_id UNIQUEIDENTIFIER NOT NULL,
                            movement_type VARCHAR(30) NOT NULL,
                            quantity_change DECIMAL(18, 4) NOT NULL,
                            stock_after DECIMAL(18, 4) NOT NULL,
                            reference_id VARCHAR(64) NULL,
                            notes NVARCHAR(256) NULL,
                            created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
                        );
                    END

                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'cash_drawers')
                    BEGIN
                        CREATE TABLE cash_drawers (
                            id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                            opening_cash DECIMAL(18, 2) NOT NULL,
                            cash_sales DECIMAL(18, 2) NOT NULL DEFAULT 0,
                            cash_expenses DECIMAL(18, 2) NOT NULL DEFAULT 0,
                            supplier_cash_payments DECIMAL(18, 2) NOT NULL DEFAULT 0,
                            expected_cash DECIMAL(18, 2) NOT NULL DEFAULT 0,
                            actual_cash DECIMAL(18, 2) NULL,
                            variance DECIMAL(18, 2) NULL,
                            status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
                            opened_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
                            closed_at DATETIME2 NULL
                        );
                    END"),

                ("004_SchemaSelfHealingPills", @"
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'products') AND name = N'selling_price')
                    BEGIN
                        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'products') AND name = N'unit_price')
                            EXEC sp_rename 'products.unit_price', 'selling_price', 'COLUMN';
                        ELSE
                            ALTER TABLE products ADD selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0);
                    END

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'products') AND name = N'image_url')
                    BEGIN
                        ALTER TABLE products ADD image_url NVARCHAR(500) NULL;
                    END

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'sales') AND name = N'is_refunded')
                    BEGIN
                        ALTER TABLE sales ADD is_refunded BIT NOT NULL DEFAULT 0;
                    END

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'sales') AND name = N'refunded_at')
                    BEGIN
                        ALTER TABLE sales ADD refunded_at DATETIME2 NULL;
                    END

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'sales') AND name = N'updated_at')
                    BEGIN
                        ALTER TABLE sales ADD updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
                    END"),

                ("005_CashDrawerUniquenessAndShiftLinkage", @"
                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'uq_cash_drawers_open_shift')
                    BEGIN
                        CREATE UNIQUE INDEX uq_cash_drawers_open_shift ON cash_drawers(status) WHERE status = 'OPEN';
                    END

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'sales') AND name = N'cash_drawer_shift_id')
                    BEGIN
                        ALTER TABLE sales ADD cash_drawer_shift_id UNIQUEIDENTIFIER NULL REFERENCES cash_drawers(id);
                    END

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'expenses') AND name = N'cash_drawer_shift_id')
                    BEGIN
                        ALTER TABLE expenses ADD cash_drawer_shift_id UNIQUEIDENTIFIER NULL REFERENCES cash_drawers(id);
                    END

                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'supplier_ledger_entries') AND name = N'cash_drawer_shift_id')
                    BEGIN
                        ALTER TABLE supplier_ledger_entries ADD cash_drawer_shift_id UNIQUEIDENTIFIER NULL REFERENCES cash_drawers(id);
                    END")
            };

            foreach (var (id, sqlScript) in migrations)
            {
                const string checkMigrationSql = "SELECT COUNT(1) FROM __DbMigrationsHistory WHERE migration_id = @Id;";
                var alreadyApplied = await connection.ExecuteScalarAsync<int>(new CommandDefinition(checkMigrationSql, new { Id = id }, cancellationToken: cancellationToken)) > 0;

                if (!alreadyApplied)
                {
                    _logger.LogInformation("Applying database migration script: {MigrationId}", id);
                    using var tx = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);
                    try
                    {
                        await connection.ExecuteAsync(new CommandDefinition(sqlScript, transaction: tx, cancellationToken: cancellationToken));
                        const string recordMigrationSql = "INSERT INTO __DbMigrationsHistory (migration_id) VALUES (@Id);";
                        await connection.ExecuteAsync(new CommandDefinition(recordMigrationSql, new { Id = id }, transaction: tx, cancellationToken: cancellationToken));
                        await tx.CommitAsync(cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        await tx.RollbackAsync(cancellationToken);
                        _logger.LogError(ex, "Fatal error executing database migration: {MigrationId}", id);
                        throw new InvalidOperationException($"Database schema migration '{id}' failed.", ex);
                    }
                }
            }

            _tablesInitialized = true;
            _logger.LogInformation("Database tables and versioned migrations verified successfully.");
        }
        finally
        {
            _semaphore.Release();
        }
    }
}
