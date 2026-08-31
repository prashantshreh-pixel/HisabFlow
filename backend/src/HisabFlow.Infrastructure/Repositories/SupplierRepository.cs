using System.Data;
using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.DTOs;
using HisabFlow.Domain.Entities;
using HisabFlow.Domain.Enums;
using Microsoft.Data.SqlClient;

namespace HisabFlow.Infrastructure.Repositories;

public class SupplierRepository : ISupplierRepository
{
    private readonly IDbConnectionFactory _db;

    private readonly record struct SupplierLockRecord(string Name, string Phone, decimal CurrentBalance);

    public SupplierRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<IEnumerable<Supplier>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT 
                id AS Id,
                name AS Name,
                company_name AS CompanyName,
                phone AS Phone,
                address AS Address,
                current_balance AS CurrentBalance,
                is_active AS IsActive,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM suppliers
            WHERE is_active = 1
            ORDER BY updated_at DESC;";

        return await conn.QueryAsync<Supplier>(new CommandDefinition(sql, cancellationToken: cancellationToken));
    }

    public async Task<Supplier?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT 
                id AS Id,
                name AS Name,
                company_name AS CompanyName,
                phone AS Phone,
                address AS Address,
                current_balance AS CurrentBalance,
                is_active AS IsActive,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM suppliers
            WHERE id = @Id AND is_active = 1;";

        return await conn.QuerySingleOrDefaultAsync<Supplier>(new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));
    }

    public async Task<Supplier> CreateAsync(Supplier supplier, decimal initialBalance = 0, string? initialNote = null, CancellationToken cancellationToken = default)
    {
        if (supplier.Id == Guid.Empty)
        {
            supplier.Id = Guid.NewGuid();
        }

        var now = DateTime.UtcNow;
        supplier.CreatedAt = now;
        supplier.UpdatedAt = now;
        supplier.CurrentBalance = initialBalance;

        using var conn = (SqlConnection)await _db.CreateConnectionAsync(cancellationToken);
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            const string checkPhoneSql = "SELECT id, is_active FROM suppliers WHERE phone = @Phone;";
            var existing = await conn.QueryFirstOrDefaultAsync<(Guid Id, bool IsActive)?>(new CommandDefinition(checkPhoneSql, new { Phone = supplier.Phone }, tx, cancellationToken: cancellationToken));

            if (existing.HasValue)
            {
                if (existing.Value.IsActive)
                {
                    throw new InvalidOperationException($"A wholesaler with phone number '{supplier.Phone}' already exists.");
                }
                else
                {
                    supplier.Id = existing.Value.Id;
                    const string reactivateSql = @"
                        UPDATE suppliers
                        SET name = @Name,
                            company_name = @CompanyName,
                            address = @Address,
                            current_balance = @CurrentBalance,
                            is_active = 1,
                            updated_at = @UpdatedAt
                        WHERE id = @Id;";

                    await conn.ExecuteAsync(new CommandDefinition(reactivateSql, new
                    {
                        supplier.Id,
                        supplier.Name,
                        supplier.CompanyName,
                        supplier.Address,
                        supplier.CurrentBalance,
                        supplier.UpdatedAt
                    }, tx, cancellationToken: cancellationToken));
                }
            }
            else
            {
                const string insertSupplierSql = @"
                    INSERT INTO suppliers (id, name, company_name, phone, address, current_balance, is_active, created_at, updated_at)
                    VALUES (@Id, @Name, @CompanyName, @Phone, @Address, @CurrentBalance, 1, @CreatedAt, @UpdatedAt);";

                await conn.ExecuteAsync(new CommandDefinition(insertSupplierSql, new
                {
                    supplier.Id,
                    supplier.Name,
                    supplier.CompanyName,
                    supplier.Phone,
                    supplier.Address,
                    supplier.CurrentBalance,
                    supplier.CreatedAt,
                    supplier.UpdatedAt
                }, tx, cancellationToken: cancellationToken));
            }

            if (initialBalance != 0)
            {
                var entryId = Guid.NewGuid();
                int type = initialBalance > 0 ? 1 : 2;
                decimal absAmount = Math.Abs(initialBalance);

                const string insertLedgerSql = @"
                    INSERT INTO supplier_ledger_entries (id, supplier_id, type, amount, balance_after, payment_method, particulars, transaction_date, created_at)
                    VALUES (@Id, @SupplierId, @Type, @Amount, @BalanceAfter, @PaymentMethod, @Particulars, @TransactionDate, @CreatedAt);";

                await conn.ExecuteAsync(new CommandDefinition(insertLedgerSql, new
                {
                    Id = entryId,
                    SupplierId = supplier.Id,
                    Type = type,
                    Amount = absAmount,
                    BalanceAfter = initialBalance,
                    PaymentMethod = (int)PaymentMethod.Cash,
                    Particulars = initialNote ?? "Opening Supplier Balance",
                    TransactionDate = now,
                    CreatedAt = now
                }, tx, cancellationToken: cancellationToken));
            }

            await tx.CommitAsync(cancellationToken);
            return supplier;
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<Supplier?> UpdateAsync(
        Guid id,
        string name,
        string phone,
        string? companyName,
        string? address,
        DateTime? expectedUpdatedAt = null,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            UPDATE suppliers
            SET name = @Name,
                phone = @Phone,
                company_name = @CompanyName,
                address = @Address,
                updated_at = @UpdatedAt
            WHERE id = @Id 
              AND is_active = 1
              AND (@ExpectedUpdatedAt IS NULL OR updated_at = @ExpectedUpdatedAt);";

        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { Id = id, Name = name, Phone = phone, CompanyName = companyName, Address = address, ExpectedUpdatedAt = expectedUpdatedAt, UpdatedAt = now }, cancellationToken: cancellationToken));
        if (rows == 0) return null;

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            UPDATE suppliers 
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

    public async Task<SupplierLedgerEntry> RecordTransactionAsync(RecordSupplierTransactionRequest request, CancellationToken cancellationToken = default)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync(cancellationToken);
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            const string getSupplierSql = "SELECT name AS Name, phone AS Phone, current_balance AS CurrentBalance FROM suppliers WITH (UPDLOCK, ROWLOCK) WHERE id = @SupplierId AND is_active = 1;";
            var supplier = await conn.QuerySingleOrDefaultAsync<SupplierLockRecord>(new CommandDefinition(getSupplierSql, new { request.SupplierId }, tx, cancellationToken: cancellationToken));

            if (supplier == default)
            {
                throw new InvalidOperationException($"Supplier with ID '{request.SupplierId}' not found or inactive.");
            }

            decimal currentBalance = supplier.CurrentBalance;
            decimal newBalance = request.Type == 1
                ? currentBalance + request.Amount
                : currentBalance - request.Amount;

            var entryId = Guid.NewGuid();
            var txDate = request.TransactionDate ?? DateTime.UtcNow;
            var now = DateTime.UtcNow;

            const string updateSupplierSql = @"
                UPDATE suppliers
                SET current_balance = @NewBalance,
                    updated_at = @UpdatedAt
                WHERE id = @SupplierId AND is_active = 1;";

            await conn.ExecuteAsync(new CommandDefinition(updateSupplierSql, new { NewBalance = newBalance, UpdatedAt = now, request.SupplierId }, tx, cancellationToken: cancellationToken));

            const string insertLedgerSql = @"
                INSERT INTO supplier_ledger_entries (id, supplier_id, type, amount, balance_after, payment_method, particulars, invoice_number, transaction_date, created_at)
                VALUES (@Id, @SupplierId, @Type, @Amount, @BalanceAfter, @PaymentMethod, @Particulars, @InvoiceNumber, @TransactionDate, @CreatedAt);";

            await conn.ExecuteAsync(new CommandDefinition(insertLedgerSql, new
            {
                Id = entryId,
                request.SupplierId,
                request.Type,
                request.Amount,
                BalanceAfter = newBalance,
                PaymentMethod = (int)request.PaymentMethod,
                request.Particulars,
                request.InvoiceNumber,
                TransactionDate = txDate,
                CreatedAt = now
            }, tx, cancellationToken: cancellationToken));

            await tx.CommitAsync(cancellationToken);

            return new SupplierLedgerEntry
            {
                Id = entryId,
                SupplierId = request.SupplierId,
                Type = request.Type,
                Amount = request.Amount,
                BalanceAfter = newBalance,
                PaymentMethod = request.PaymentMethod,
                Particulars = request.Particulars,
                InvoiceNumber = request.InvoiceNumber,
                TransactionDate = txDate,
                CreatedAt = now
            };
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<SupplierStatementDto?> GetStatementAsync(
        Guid supplierId,
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
                company_name AS CompanyName,
                phone AS Phone,
                address AS Address,
                current_balance AS CurrentBalance,
                is_active AS IsActive,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM suppliers
            WHERE id = @SupplierId AND is_active = 1;

            SELECT 
                sle.id AS Id,
                sle.supplier_id AS SupplierId,
                s.name AS SupplierName,
                s.phone AS SupplierPhone,
                sle.transaction_date AS TransactionDate,
                sle.type AS Type,
                sle.amount AS Amount,
                sle.balance_after AS BalanceAfter,
                sle.payment_method AS PaymentMethod,
                sle.particulars AS Particulars,
                sle.invoice_number AS InvoiceNumber,
                sle.created_at AS CreatedAt
            FROM supplier_ledger_entries sle
            INNER JOIN suppliers s ON sle.supplier_id = s.id
            WHERE sle.supplier_id = @SupplierId
            ORDER BY sle.transaction_date DESC, sle.created_at DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        using var multi = await conn.QueryMultipleAsync(new CommandDefinition(sql, new { SupplierId = supplierId, Offset = offset, PageSize = pageSize }, cancellationToken: cancellationToken));
        var supplier = await multi.ReadSingleOrDefaultAsync<Supplier>();
        if (supplier == null) return null;

        var entries = await multi.ReadAsync<SupplierLedgerEntryDto>();
        return new SupplierStatementDto(supplier, entries);
    }

    public async Task<SupplierSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        var todayUtc = DateTime.UtcNow.Date;

        const string sql = @"
            SELECT 
                ISNULL(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) AS TotalOutstandingPayable,
                COUNT(CASE WHEN current_balance > 0 THEN 1 END) AS ActiveSuppliersCount,
                COUNT(1) AS TotalSuppliersCount
            FROM suppliers
            WHERE is_active = 1;

            SELECT 
                ISNULL(SUM(CASE WHEN type = 1 AND CAST(transaction_date AS DATE) = CAST(@TodayUtc AS DATE) THEN amount ELSE 0 END), 0) AS TodayPurchases,
                ISNULL(SUM(CASE WHEN type = 2 AND CAST(transaction_date AS DATE) = CAST(@TodayUtc AS DATE) THEN amount ELSE 0 END), 0) AS TodayPaymentsGiven
            FROM supplier_ledger_entries;";

        using var multi = await conn.QueryMultipleAsync(new CommandDefinition(sql, new { TodayUtc = todayUtc }, cancellationToken: cancellationToken));
        var stats1 = await multi.ReadSingleAsync();
        var stats2 = await multi.ReadSingleAsync();

        return new SupplierSummaryDto(
            (decimal)stats1.TotalOutstandingPayable,
            (decimal)stats2.TodayPurchases,
            (decimal)stats2.TodayPaymentsGiven,
            (int)stats1.ActiveSuppliersCount,
            (int)stats1.TotalSuppliersCount
        );
    }
}
