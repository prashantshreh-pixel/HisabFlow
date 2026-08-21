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
        EnsureTablesCreated(connection);
        return connection;
    }

    public async Task<IDbConnection> CreateConnectionAsync(CancellationToken cancellationToken = default)
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        EnsureTablesCreated(connection);
        return connection;
    }

    private static void EnsureTablesCreated(SqlConnection connection)
    {
        if (_tablesInitialized) return;
        lock (_initLock)
        {
            if (_tablesInitialized) return;
            try
            {
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
                    END";

                connection.Execute(sql);
                _tablesInitialized = true;
            }
            catch
            {
                // Fallback gracefully if permissions or table exists
            }
        }
    }
}
