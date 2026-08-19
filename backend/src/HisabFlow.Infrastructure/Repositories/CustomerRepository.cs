using System.Data;
using Dapper;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Customers.DTOs;
using HisabFlow.Domain.Entities;
using HisabFlow.Domain.Enums;
using Microsoft.Data.SqlClient;

namespace HisabFlow.Infrastructure.Repositories;

public class CustomerRepository : ICustomerRepository
{
    private readonly IDbConnectionFactory _db;

    public CustomerRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<CustomerDto>> GetAllCustomersAsync()
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                id AS Id,
                name AS Name,
                phone AS Phone,
                address AS Address,
                credit_limit AS CreditLimit,
                current_balance AS CurrentBalance,
                is_active AS IsActive,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM customers
            WHERE is_active = 1
            ORDER BY updated_at DESC;";

        var result = await conn.QueryAsync<CustomerDto>(sql);
        return result.ToList();
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                id AS Id,
                name AS Name,
                phone AS Phone,
                address AS Address,
                credit_limit AS CreditLimit,
                current_balance AS CurrentBalance,
                is_active AS IsActive,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM customers
            WHERE id = @Id;";

        return await conn.QuerySingleOrDefaultAsync<CustomerDto>(sql, new { Id = id });
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request)
    {
        using var conn = await _db.CreateConnectionAsync();
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;

        const string sql = @"
            INSERT INTO customers (id, name, phone, address, credit_limit, current_balance, is_active, created_at, updated_at)
            VALUES (@Id, @Name, @Phone, @Address, @CreditLimit, @CurrentBalance, 1, @CreatedAt, @UpdatedAt);";

        await conn.ExecuteAsync(sql, new
        {
            Id = id,
            request.Name,
            request.Phone,
            request.Address,
            request.CreditLimit,
            CurrentBalance = request.InitialBalance,
            CreatedAt = now,
            UpdatedAt = now
        });

        if (request.InitialBalance > 0)
        {
            const string ledgerSql = @"
                INSERT INTO customer_ledger_entries (id, customer_id, type, amount, balance_after, payment_method, particulars, transaction_date, created_at)
                VALUES (@Id, @CustomerId, @Type, @Amount, @BalanceAfter, @PaymentMethod, @Particulars, @TransactionDate, @CreatedAt);";

            await conn.ExecuteAsync(ledgerSql, new
            {
                Id = Guid.NewGuid(),
                CustomerId = id,
                Type = (int)TransactionType.Debit,
                Amount = request.InitialBalance,
                BalanceAfter = request.InitialBalance,
                PaymentMethod = (int)PaymentMethod.Cash,
                Particulars = request.InitialNote ?? "Opening Credit Balance",
                TransactionDate = now,
                CreatedAt = now
            });
        }

        return await GetCustomerByIdAsync(id) ?? throw new InvalidOperationException("Failed to retrieve created customer.");
    }

    public async Task<CustomerStatementDto?> GetCustomerStatementAsync(Guid customerId)
    {
        var customer = await GetCustomerByIdAsync(customerId);
        if (customer == null) return null;

        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                le.id AS Id,
                le.customer_id AS CustomerId,
                c.name AS CustomerName,
                c.phone AS CustomerPhone,
                le.type AS Type,
                le.amount AS Amount,
                le.balance_after AS BalanceAfter,
                le.payment_method AS PaymentMethod,
                le.particulars AS Particulars,
                le.bill_number AS BillNumber,
                le.transaction_date AS TransactionDate,
                le.created_at AS CreatedAt
            FROM customer_ledger_entries le
            INNER JOIN customers c ON le.customer_id = c.id
            WHERE le.customer_id = @CustomerId
            ORDER BY le.transaction_date DESC, le.created_at DESC;";

        var entries = (await conn.QueryAsync<CustomerLedgerEntryDto>(sql, new { CustomerId = customerId })).ToList();
        return new CustomerStatementDto(customer, entries);
    }

    public async Task<CustomerLedgerEntryDto> RecordTransactionAsync(RecordTransactionRequest request)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync();
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync();

        try
        {
            // 1. Fetch and Lock Customer for Update (SQL Server specific: WITH (UPDLOCK, ROWLOCK))
            const string lockSql = "SELECT name, phone, current_balance AS CurrentBalance FROM customers WITH (UPDLOCK, ROWLOCK) WHERE id = @CustomerId;";
            var customer = await conn.QuerySingleOrDefaultAsync<dynamic>(lockSql, new { request.CustomerId }, tx);

            if (customer == null)
            {
                throw new KeyNotFoundException($"Customer with ID {request.CustomerId} not found.");
            }

            string customerName = customer.name;
            string customerPhone = customer.phone;
            decimal currentBalance = customer.CurrentBalance;

            // 2. Compute new balance
            var delta = request.Type == TransactionType.Debit ? request.Amount : -request.Amount;
            var newBalance = currentBalance + delta;
            var entryId = Guid.NewGuid();
            var now = DateTime.UtcNow;
            var txDate = request.TransactionDate ?? now;

            // 3. Insert Ledger Entry
            const string insertLedgerSql = @"
                INSERT INTO customer_ledger_entries (id, customer_id, type, amount, balance_after, payment_method, particulars, bill_number, transaction_date, created_at)
                VALUES (@Id, @CustomerId, @Type, @Amount, @BalanceAfter, @PaymentMethod, @Particulars, @BillNumber, @TransactionDate, @CreatedAt);";

            await conn.ExecuteAsync(insertLedgerSql, new
            {
                Id = entryId,
                request.CustomerId,
                Type = (int)request.Type,
                request.Amount,
                BalanceAfter = newBalance,
                PaymentMethod = (int)request.PaymentMethod,
                request.Particulars,
                request.BillNumber,
                TransactionDate = txDate,
                CreatedAt = now
            }, tx);

            // 4. Update Customer Current Balance & Timestamp
            const string updateCustomerSql = @"
                UPDATE customers 
                SET current_balance = @NewBalance, updated_at = @UpdatedAt
                WHERE id = @CustomerId;";

            await conn.ExecuteAsync(updateCustomerSql, new
            {
                NewBalance = newBalance,
                UpdatedAt = now,
                request.CustomerId
            }, tx);

            await tx.CommitAsync();

            return new CustomerLedgerEntryDto(
                entryId, request.CustomerId, customerName, customerPhone, request.Type, request.Amount, newBalance, request.PaymentMethod, request.Particulars, request.BillNumber, txDate, now
            );
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<IReadOnlyList<CustomerLedgerEntryDto>> GetRecentTransactionsAsync(int limit = 50)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            SELECT TOP (@Limit)
                le.id AS Id,
                le.customer_id AS CustomerId,
                c.name AS CustomerName,
                c.phone AS CustomerPhone,
                le.type AS Type,
                le.amount AS Amount,
                le.balance_after AS BalanceAfter,
                le.payment_method AS PaymentMethod,
                le.particulars AS Particulars,
                le.bill_number AS BillNumber,
                le.transaction_date AS TransactionDate,
                le.created_at AS CreatedAt
            FROM customer_ledger_entries le
            INNER JOIN customers c ON le.customer_id = c.id
            ORDER BY le.transaction_date DESC, le.created_at DESC;";

        var result = await conn.QueryAsync<CustomerLedgerEntryDto>(sql, new { Limit = limit });
        return result.ToList();
    }

    public async Task<bool> UpdateCustomerAsync(Guid id, CreateCustomerRequest request)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            UPDATE customers
            SET name = @Name,
                phone = @Phone,
                address = @Address,
                credit_limit = @CreditLimit,
                updated_at = @UpdatedAt
            WHERE id = @Id;";

        var rows = await conn.ExecuteAsync(sql, new
        {
            Id = id,
            request.Name,
            request.Phone,
            request.Address,
            request.CreditLimit,
            UpdatedAt = DateTime.UtcNow
        });

        return rows > 0;
    }

    public async Task<bool> DeleteCustomerAsync(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = "DELETE FROM customers WHERE id = @Id;";
        var rows = await conn.ExecuteAsync(sql, new { Id = id });
        return rows > 0;
    }
}
