using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.DTOs;
using Microsoft.Data.SqlClient;
using System.Text.Json;

namespace HisabFlow.Infrastructure.Repositories;

public class CashDrawerRepository : ICashDrawerRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly IAuditRepository _auditRepo;

    public CashDrawerRepository(IDbConnectionFactory db, IAuditRepository auditRepo)
    {
        _db = db;
        _auditRepo = auditRepo;
    }

    public async Task<CashDrawerShiftDto?> GetCurrentOpenShiftAsync(CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT TOP (1)
                id AS Id,
                opening_cash AS OpeningCash,
                cash_sales AS CashSales,
                cash_expenses AS CashExpenses,
                supplier_cash_payments AS SupplierCashPayments,
                expected_cash AS ExpectedCash,
                actual_cash AS ActualCash,
                variance AS Variance,
                status AS Status,
                opened_at AS OpenedAt,
                closed_at AS ClosedAt
            FROM cash_drawers
            WHERE status = 'OPEN'
            ORDER BY opened_at DESC;";

        return await conn.QuerySingleOrDefaultAsync<CashDrawerShiftDto>(new CommandDefinition(sql, cancellationToken: cancellationToken));
    }

    public async Task<CashDrawerShiftDto> OpenShiftAsync(OpenCashDrawerShiftRequest request, CancellationToken cancellationToken = default)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync(cancellationToken);
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            const string lockSql = @"
                SELECT id AS Id, opening_cash AS OpeningCash, cash_sales AS CashSales, cash_expenses AS CashExpenses,
                       supplier_cash_payments AS SupplierCashPayments, expected_cash AS ExpectedCash, actual_cash AS ActualCash,
                       variance AS Variance, status AS Status, opened_at AS OpenedAt, closed_at AS ClosedAt
                FROM cash_drawers WITH (UPDLOCK, ROWLOCK)
                WHERE status = 'OPEN';";

            var existingOpen = await conn.QuerySingleOrDefaultAsync<CashDrawerShiftDto>(
                new CommandDefinition(lockSql, transaction: tx, cancellationToken: cancellationToken));

            if (existingOpen != null)
            {
                await tx.CommitAsync(cancellationToken);
                return existingOpen;
            }

            var shiftId = Guid.NewGuid();
            var now = DateTime.UtcNow;
            const string insertSql = @"
                INSERT INTO cash_drawers (id, opening_cash, cash_sales, cash_expenses, supplier_cash_payments, expected_cash, status, opened_at)
                VALUES (@Id, @OpeningCash, 0, 0, 0, @OpeningCash, 'OPEN', @Now);";

            await conn.ExecuteAsync(new CommandDefinition(insertSql, new { Id = shiftId, request.OpeningCash, Now = now }, tx, cancellationToken: cancellationToken));
            await tx.CommitAsync(cancellationToken);

            await _auditRepo.LogAsync(new CreateAuditLogRequest(
                "CashDrawer",
                shiftId.ToString(),
                "OPEN_SHIFT",
                JsonSerializer.Serialize(new { request.OpeningCash, OpenedAt = now }),
                "System"
            ), cancellationToken);

            return (await GetCurrentOpenShiftAsync(cancellationToken))!;
        }
        catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601) // Unique index violation on open shift
        {
            await tx.RollbackAsync(cancellationToken);
            var recheck = await GetCurrentOpenShiftAsync(cancellationToken);
            if (recheck != null) return recheck;
            throw;
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<CashDrawerShiftDto> CloseShiftAsync(CloseCashDrawerShiftRequest request, CancellationToken cancellationToken = default)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync(cancellationToken);
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            const string lockSql = @"
                SELECT id AS Id, opening_cash AS OpeningCash, status AS Status, opened_at AS OpenedAt
                FROM cash_drawers WITH (UPDLOCK, ROWLOCK)
                WHERE status = 'OPEN';";

            var openShift = await conn.QuerySingleOrDefaultAsync<dynamic>(
                new CommandDefinition(lockSql, transaction: tx, cancellationToken: cancellationToken));

            if (openShift == null)
            {
                throw new InvalidOperationException("No active cash drawer shift is currently open.");
            }

            Guid shiftId = (Guid)openShift.Id;
            decimal openingCash = (decimal)openShift.OpeningCash;
            DateTime openedAt = (DateTime)openShift.OpenedAt;

            // Calculate shift cash sales, cash expenses, and supplier cash payments by shift ID (with time fallback)
            const string calcSql = @"
                SELECT 
                    (SELECT COALESCE(SUM(cash_paid), 0) FROM sales WHERE (cash_drawer_shift_id = @ShiftId OR sale_date >= @OpenedAt) AND is_refunded = 0) AS ShiftCashSales,
                    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE payment_method = 1 AND (cash_drawer_shift_id = @ShiftId OR expense_date >= @OpenedAt)) AS ShiftCashExpenses,
                    (SELECT COALESCE(SUM(amount), 0) FROM supplier_ledger_entries WHERE type = 2 AND payment_method = 1 AND (cash_drawer_shift_id = @ShiftId OR transaction_date >= @OpenedAt)) AS ShiftSupplierCash;";

            var totals = await conn.QuerySingleAsync<dynamic>(new CommandDefinition(calcSql, new { ShiftId = shiftId, OpenedAt = openedAt }, tx, cancellationToken: cancellationToken));

            decimal cashSales = (decimal)totals.ShiftCashSales;
            decimal cashExpenses = (decimal)totals.ShiftCashExpenses;
            decimal supplierCash = (decimal)totals.ShiftSupplierCash;
            decimal expectedCash = openingCash + cashSales - cashExpenses - supplierCash;
            decimal variance = request.ActualCash - expectedCash;
            var now = DateTime.UtcNow;

            const string updateSql = @"
                UPDATE cash_drawers
                SET cash_sales = @CashSales,
                    cash_expenses = @CashExpenses,
                    supplier_cash_payments = @SupplierCash,
                    expected_cash = @ExpectedCash,
                    actual_cash = @ActualCash,
                    variance = @Variance,
                    status = 'CLOSED',
                    closed_at = @Now
                WHERE id = @ShiftId;";

            await conn.ExecuteAsync(new CommandDefinition(updateSql, new
            {
                ShiftId = shiftId,
                CashSales = cashSales,
                CashExpenses = cashExpenses,
                SupplierCash = supplierCash,
                ExpectedCash = expectedCash,
                ActualCash = request.ActualCash,
                Variance = variance,
                Now = now
            }, tx, cancellationToken: cancellationToken));

            await tx.CommitAsync(cancellationToken);

            await _auditRepo.LogAsync(new CreateAuditLogRequest(
                "CashDrawer",
                shiftId.ToString(),
                "CLOSE_SHIFT",
                JsonSerializer.Serialize(new { OpeningCash = openingCash, CashSales = cashSales, CashExpenses = cashExpenses, SupplierCash = supplierCash, ExpectedCash = expectedCash, ActualCash = request.ActualCash, Variance = variance }),
                "System"
            ), cancellationToken);

            const string selectClosedSql = @"
                SELECT 
                    id AS Id,
                    opening_cash AS OpeningCash,
                    cash_sales AS CashSales,
                    cash_expenses AS CashExpenses,
                    supplier_cash_payments AS SupplierCashPayments,
                    expected_cash AS ExpectedCash,
                    actual_cash AS ActualCash,
                    variance AS Variance,
                    status AS Status,
                    opened_at AS OpenedAt,
                    closed_at AS ClosedAt
                FROM cash_drawers
                WHERE id = @ShiftId;";

            using var readConn = await _db.CreateConnectionAsync(cancellationToken);
            return await readConn.QuerySingleAsync<CashDrawerShiftDto>(new CommandDefinition(selectClosedSql, new { ShiftId = shiftId }, cancellationToken: cancellationToken));
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<IEnumerable<CashDrawerShiftDto>> GetShiftHistoryAsync(int limit = 30, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT TOP (@Limit)
                id AS Id,
                opening_cash AS OpeningCash,
                cash_sales AS CashSales,
                cash_expenses AS CashExpenses,
                supplier_cash_payments AS SupplierCashPayments,
                expected_cash AS ExpectedCash,
                actual_cash AS ActualCash,
                variance AS Variance,
                status AS Status,
                opened_at AS OpenedAt,
                closed_at AS ClosedAt
            FROM cash_drawers
            ORDER BY opened_at DESC;";

        return await conn.QueryAsync<CashDrawerShiftDto>(new CommandDefinition(sql, new { Limit = limit }, cancellationToken: cancellationToken));
    }
}
