using System.Data;
using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Domain.Entities;
using HisabFlow.Domain.Enums;

namespace HisabFlow.Infrastructure.Repositories;

public class SupplierRepository : ISupplierRepository
{
    private readonly IDbConnectionFactory _db;

    public SupplierRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<IEnumerable<Supplier>> GetAllAsync()
    {
        using var conn = await _db.CreateConnectionAsync();
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

        return await conn.QueryAsync<Supplier>(sql);
    }

    public async Task<Supplier?> GetByIdAsync(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
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

        return await conn.QuerySingleOrDefaultAsync<Supplier>(sql, new { Id = id });
    }

    public async Task<Supplier> CreateAsync(Supplier supplier, decimal initialBalance = 0, string? initialNote = null)
    {
        if (supplier.Id == Guid.Empty)
        {
            supplier.Id = Guid.NewGuid();
        }

        var now = DateTime.UtcNow;
        supplier.CreatedAt = now;
        supplier.UpdatedAt = now;
        supplier.CurrentBalance = initialBalance;

        using var conn = await _db.CreateConnectionAsync();
        using var tx = conn.BeginTransaction();

        try
        {
            // Check if phone already exists
            const string checkPhoneSql = "SELECT id, is_active FROM suppliers WHERE phone = @Phone;";
            var existing = await conn.QueryFirstOrDefaultAsync<(Guid Id, bool IsActive)?>(checkPhoneSql, new { Phone = supplier.Phone }, tx);

            if (existing.HasValue)
            {
                if (existing.Value.IsActive)
                {
                    throw new InvalidOperationException($"A wholesaler with phone number '{supplier.Phone}' already exists.");
                }
                else
                {
                    // Re-activate soft-deleted supplier
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

                    await conn.ExecuteAsync(reactivateSql, new
                    {
                        supplier.Id,
                        supplier.Name,
                        supplier.CompanyName,
                        supplier.Address,
                        supplier.CurrentBalance,
                        supplier.UpdatedAt
                    }, tx);
                }
            }
            else
            {
                const string insertSupplierSql = @"
                    INSERT INTO suppliers (id, name, company_name, phone, address, current_balance, is_active, created_at, updated_at)
                    VALUES (@Id, @Name, @CompanyName, @Phone, @Address, @CurrentBalance, 1, @CreatedAt, @UpdatedAt);";

                await conn.ExecuteAsync(insertSupplierSql, new
                {
                    supplier.Id,
                    supplier.Name,
                    supplier.CompanyName,
                    supplier.Phone,
                    supplier.Address,
                    supplier.CurrentBalance,
                    supplier.CreatedAt,
                    supplier.UpdatedAt
                }, tx);
            }

            if (initialBalance != 0)
            {
                var entryId = Guid.NewGuid();
                int type = initialBalance > 0 ? 1 : 2; // 1 = Purchase/Debt, 2 = Payment Given
                decimal absAmount = Math.Abs(initialBalance);

                const string insertLedgerSql = @"
                    INSERT INTO supplier_ledger_entries (id, supplier_id, type, amount, balance_after, payment_method, particulars, transaction_date, created_at)
                    VALUES (@Id, @SupplierId, @Type, @Amount, @BalanceAfter, @PaymentMethod, @Particulars, @TransactionDate, @CreatedAt);";

                await conn.ExecuteAsync(insertLedgerSql, new
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
                }, tx);
            }

            tx.Commit();
            return supplier;
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<Supplier?> UpdateAsync(Guid id, string name, string phone, string? companyName, string? address)
    {
        var now = DateTime.UtcNow;
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            UPDATE suppliers
            SET name = @Name,
                phone = @Phone,
                company_name = @CompanyName,
                address = @Address,
                updated_at = @UpdatedAt
            WHERE id = @Id AND is_active = 1;";

        var rows = await conn.ExecuteAsync(sql, new { Id = id, Name = name, Phone = phone, CompanyName = companyName, Address = address, UpdatedAt = now });
        if (rows == 0) return null;

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            UPDATE suppliers 
            SET is_active = 0, 
                phone = CASE 
                    WHEN CHARINDEX('_del_', phone) = 0 THEN CONCAT(phone, '_del_', LEFT(CAST(id AS NVARCHAR(36)), 8))
                    ELSE phone
                END,
                updated_at = SYSUTCDATETIME() 
            WHERE id = @Id;";
        var rows = await conn.ExecuteAsync(sql, new { Id = id });
        return rows > 0;
    }

    public async Task<SupplierLedgerEntry> RecordTransactionAsync(RecordSupplierTransactionRequest request)
    {
        using var conn = await _db.CreateConnectionAsync();
        using var tx = conn.BeginTransaction();

        try
        {
            const string getSupplierSql = "SELECT current_balance FROM suppliers WHERE id = @SupplierId AND is_active = 1;";
            var currentBalanceObj = await conn.ExecuteScalarAsync<decimal?>(getSupplierSql, new { request.SupplierId }, tx);

            if (!currentBalanceObj.HasValue)
            {
                throw new InvalidOperationException($"Supplier with ID '{request.SupplierId}' not found.");
            }

            decimal currentBalance = currentBalanceObj.Value;
            decimal newBalance = request.Type == 1
                ? currentBalance + request.Amount // 1: Purchase (Shop owes more)
                : currentBalance - request.Amount; // 2: Payment Given (Shop owes less)

            var entryId = Guid.NewGuid();
            var txDate = request.TransactionDate ?? DateTime.UtcNow;
            var now = DateTime.UtcNow;

            const string updateSupplierSql = @"
                UPDATE suppliers
                SET current_balance = @NewBalance,
                    updated_at = @UpdatedAt
                WHERE id = @SupplierId;";

            await conn.ExecuteAsync(updateSupplierSql, new { NewBalance = newBalance, UpdatedAt = now, request.SupplierId }, tx);

            const string insertLedgerSql = @"
                INSERT INTO supplier_ledger_entries (id, supplier_id, type, amount, balance_after, payment_method, particulars, invoice_number, transaction_date, created_at)
                VALUES (@Id, @SupplierId, @Type, @Amount, @BalanceAfter, @PaymentMethod, @Particulars, @InvoiceNumber, @TransactionDate, @CreatedAt);";

            await conn.ExecuteAsync(insertLedgerSql, new
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
            }, tx);

            tx.Commit();

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
            tx.Rollback();
            throw;
        }
    }

    public async Task<SupplierStatementDto?> GetStatementAsync(Guid supplierId)
    {
        var supplier = await GetByIdAsync(supplierId);
        if (supplier == null) return null;

        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
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
            ORDER BY sle.transaction_date DESC, sle.created_at DESC;";

        var entries = await conn.QueryAsync<SupplierLedgerEntryDto>(sql, new { SupplierId = supplierId });
        return new SupplierStatementDto(supplier, entries);
    }

    public async Task<SupplierSummaryDto> GetSummaryAsync()
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                ISNULL(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0) AS TotalOutstandingPayable,
                COUNT(CASE WHEN current_balance > 0 THEN 1 END) AS ActiveSuppliersCount,
                COUNT(1) AS TotalSuppliersCount
            FROM suppliers
            WHERE is_active = 1;

            SELECT 
                ISNULL(SUM(CASE WHEN type = 1 AND CAST(transaction_date AS DATE) = CAST(SYSUTCDATETIME() AS DATE) THEN amount ELSE 0 END), 0) AS TodayPurchases,
                ISNULL(SUM(CASE WHEN type = 2 AND CAST(transaction_date AS DATE) = CAST(SYSUTCDATETIME() AS DATE) THEN amount ELSE 0 END), 0) AS TodayPaymentsGiven
            FROM supplier_ledger_entries;";

        using var multi = await conn.QueryMultipleAsync(sql);
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
