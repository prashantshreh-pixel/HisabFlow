using System.Data;
using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using HisabFlow.Domain.Entities;
using HisabFlow.Domain.Enums;
using Microsoft.Data.SqlClient;

namespace HisabFlow.Infrastructure.Repositories;

public class CustomerRepository : ICustomerRepository
{
    private readonly IDbConnectionFactory _db;

    private readonly record struct CustomerLockRecord(string Name, string Phone, decimal CurrentBalance);

    public CustomerRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<PagedResult<CustomerDto>> GetPagedCustomersAsync(int page = 1, int pageSize = 20, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT COUNT(1) FROM customers WHERE is_active = 1;

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
            ORDER BY updated_at DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        using var multi = await conn.QueryMultipleAsync(new CommandDefinition(sql, new { Offset = offset, PageSize = pageSize }, cancellationToken: cancellationToken));
        var totalCount = await multi.ReadSingleAsync<int>();
        var items = (await multi.ReadAsync<CustomerDto>()).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<CustomerDto>(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<IReadOnlyList<CustomerDto>> GetAllCustomersAsync(CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
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

        var result = await conn.QueryAsync<CustomerDto>(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return result.ToList();
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
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
            WHERE id = @Id AND is_active = 1;";

        return await conn.QuerySingleOrDefaultAsync<CustomerDto>(new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));
    }

    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync(cancellationToken);
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync(cancellationToken);

        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;

        try
        {
            const string sql = @"
                INSERT INTO customers (id, name, phone, address, credit_limit, current_balance, is_active, created_at, updated_at)
                VALUES (@Id, @Name, @Phone, @Address, @CreditLimit, @CurrentBalance, 1, @CreatedAt, @UpdatedAt);";

            await conn.ExecuteAsync(new CommandDefinition(sql, new
            {
                Id = id,
                request.Name,
                request.Phone,
                request.Address,
                request.CreditLimit,
                CurrentBalance = request.InitialBalance,
                CreatedAt = now,
                UpdatedAt = now
            }, tx, cancellationToken: cancellationToken));

            if (request.InitialBalance > 0)
            {
                const string ledgerSql = @"
                    INSERT INTO customer_ledger_entries (id, customer_id, type, amount, balance_after, payment_method, particulars, transaction_date, created_at)
                    VALUES (@Id, @CustomerId, @Type, @Amount, @BalanceAfter, @PaymentMethod, @Particulars, @TransactionDate, @CreatedAt);";

                await conn.ExecuteAsync(new CommandDefinition(ledgerSql, new
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
                }, tx, cancellationToken: cancellationToken));
            }

            await tx.CommitAsync(cancellationToken);

            return new CustomerDto(
                id,
                request.Name,
                request.Phone,
                request.Address,
                request.CreditLimit,
                request.InitialBalance,
                true,
                now,
                now
            );
        }
        catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)
        {
            await tx.RollbackAsync(cancellationToken);
            throw new InvalidOperationException($"Phone number '{request.Phone}' is already registered to another customer.");
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<CustomerStatementDto?> GetCustomerStatementAsync(
        Guid customerId,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        using var conn = await _db.CreateConnectionAsync(cancellationToken);
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
            WHERE id = @CustomerId AND is_active = 1;

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
            ORDER BY le.transaction_date DESC, le.created_at DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        using var multi = await conn.QueryMultipleAsync(new CommandDefinition(sql, new { CustomerId = customerId, Offset = offset, PageSize = pageSize }, cancellationToken: cancellationToken));
        var customer = await multi.ReadSingleOrDefaultAsync<CustomerDto>();
        if (customer == null) return null;

        var entries = (await multi.ReadAsync<CustomerLedgerEntryDto>()).ToList();
        return new CustomerStatementDto(customer, entries);
    }

    public async Task<CustomerLedgerEntryDto> RecordTransactionAsync(RecordTransactionRequest request, CancellationToken cancellationToken = default)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync(cancellationToken);
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            const string lockSql = "SELECT name AS Name, phone AS Phone, current_balance AS CurrentBalance FROM customers WITH (UPDLOCK, ROWLOCK) WHERE id = @CustomerId AND is_active = 1;";
            var customer = await conn.QuerySingleOrDefaultAsync<CustomerLockRecord>(new CommandDefinition(lockSql, new { request.CustomerId }, tx, cancellationToken: cancellationToken));

            if (customer == default)
            {
                throw new KeyNotFoundException($"Customer with ID {request.CustomerId} not found or inactive.");
            }

            string customerName = customer.Name;
            string customerPhone = customer.Phone;
            decimal currentBalance = customer.CurrentBalance;

            var delta = request.Type == TransactionType.Debit ? request.Amount : -request.Amount;
            var newBalance = currentBalance + delta;
            var entryId = Guid.NewGuid();
            var now = DateTime.UtcNow;
            var txDate = request.TransactionDate ?? now;

            const string insertLedgerSql = @"
                INSERT INTO customer_ledger_entries (id, customer_id, type, amount, balance_after, payment_method, particulars, bill_number, transaction_date, created_at)
                VALUES (@Id, @CustomerId, @Type, @Amount, @BalanceAfter, @PaymentMethod, @Particulars, @BillNumber, @TransactionDate, @CreatedAt);";

            await conn.ExecuteAsync(new CommandDefinition(insertLedgerSql, new
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
            }, tx, cancellationToken: cancellationToken));

            const string updateCustomerSql = @"
                UPDATE customers 
                SET current_balance = @NewBalance, updated_at = @UpdatedAt
                WHERE id = @CustomerId AND is_active = 1;";

            await conn.ExecuteAsync(new CommandDefinition(updateCustomerSql, new
            {
                NewBalance = newBalance,
                UpdatedAt = now,
                request.CustomerId
            }, tx, cancellationToken: cancellationToken));

            await tx.CommitAsync(cancellationToken);

            return new CustomerLedgerEntryDto(
                entryId, request.CustomerId, customerName, customerPhone, request.Type, request.Amount, newBalance, request.PaymentMethod, request.Particulars, request.BillNumber, txDate, now
            );
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<IReadOnlyList<CustomerLedgerEntryDto>> GetRecentTransactionsAsync(int limit = 50, CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 100);

        using var conn = await _db.CreateConnectionAsync(cancellationToken);
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

        var result = await conn.QueryAsync<CustomerLedgerEntryDto>(new CommandDefinition(sql, new { Limit = limit }, cancellationToken: cancellationToken));
        return result.ToList();
    }

    public async Task<bool> UpdateCustomerAsync(
        Guid id,
        CreateCustomerRequest request,
        DateTime? expectedUpdatedAt = null,
        CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            UPDATE customers
            SET name = @Name,
                phone = @Phone,
                address = @Address,
                credit_limit = @CreditLimit,
                updated_at = @UpdatedAt
            WHERE id = @Id 
              AND is_active = 1
              AND (@ExpectedUpdatedAt IS NULL OR updated_at = @ExpectedUpdatedAt);";

        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = id,
            request.Name,
            request.Phone,
            request.Address,
            request.CreditLimit,
            ExpectedUpdatedAt = expectedUpdatedAt,
            UpdatedAt = DateTime.UtcNow
        }, cancellationToken: cancellationToken));

        return rows > 0;
    }

    public async Task<bool> DeleteCustomerAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            UPDATE customers 
            SET is_active = 0, 
                phone = CASE 
                    WHEN CHARINDEX('_del_', phone) = 0 THEN CONCAT(phone, '_del_', LEFT(CAST(id AS NVARCHAR(36)), 8))
                    ELSE phone
                END,
                updated_at = SYSUTCDATETIME() 
            WHERE id = @Id AND is_active = 1;";

        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));
        return rows > 0;
    }
}
