using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Infrastructure.Repositories;

public class CashDrawerRepository : ICashDrawerRepository
{
    private readonly IDbConnectionFactory _db;

    public CashDrawerRepository(IDbConnectionFactory db)
    {
        _db = db;
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
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        var openShift = await GetCurrentOpenShiftAsync(cancellationToken);
        if (openShift != null)
        {
            return openShift;
        }

        var shiftId = Guid.NewGuid();
        const string sql = @"
            INSERT INTO cash_drawers (id, opening_cash, cash_sales, cash_expenses, supplier_cash_payments, expected_cash, status, opened_at)
            VALUES (@Id, @OpeningCash, 0, 0, 0, @OpeningCash, 'OPEN', SYSUTCDATETIME());";

        await conn.ExecuteAsync(new CommandDefinition(sql, new { Id = shiftId, request.OpeningCash }, cancellationToken: cancellationToken));
        return (await GetCurrentOpenShiftAsync(cancellationToken))!;
    }

    public async Task<CashDrawerShiftDto> CloseShiftAsync(CloseCashDrawerShiftRequest request, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        var openShift = await GetCurrentOpenShiftAsync(cancellationToken);
        if (openShift == null)
        {
            throw new InvalidOperationException("No active cash drawer shift is currently open.");
        }

        // Calculate today's cash sales, cash expenses, and supplier cash payments during shift window
        const string calcSql = @"
            SELECT 
                (SELECT COALESCE(SUM(cash_paid), 0) FROM sales WHERE sale_date >= @OpenedAt) AS TodayCashSales,
                (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE payment_method = 1 AND expense_date >= @OpenedAt) AS TodayCashExpenses,
                (SELECT COALESCE(SUM(amount), 0) FROM supplier_ledger_entries WHERE type = 2 AND payment_method = 1 AND transaction_date >= @OpenedAt) AS TodaySupplierCash;";

        var totals = await conn.QuerySingleAsync<dynamic>(new CommandDefinition(calcSql, new { openShift.OpenedAt }, cancellationToken: cancellationToken));

        decimal cashSales = (decimal)totals.TodayCashSales;
        decimal cashExpenses = (decimal)totals.TodayCashExpenses;
        decimal supplierCash = (decimal)totals.TodaySupplierCash;
        decimal expectedCash = openShift.OpeningCash + cashSales - cashExpenses - supplierCash;
        decimal variance = request.ActualCash - expectedCash;

        const string updateSql = @"
            UPDATE cash_drawers
            SET cash_sales = @CashSales,
                cash_expenses = @CashExpenses,
                supplier_cash_payments = @SupplierCash,
                expected_cash = @ExpectedCash,
                actual_cash = @ActualCash,
                variance = @Variance,
                status = 'CLOSED',
                closed_at = SYSUTCDATETIME()
            WHERE id = @ShiftId;";

        await conn.ExecuteAsync(new CommandDefinition(updateSql, new
        {
            ShiftId = openShift.Id,
            CashSales = cashSales,
            CashExpenses = cashExpenses,
            SupplierCash = supplierCash,
            ExpectedCash = expectedCash,
            ActualCash = request.ActualCash,
            Variance = variance
        }, cancellationToken: cancellationToken));

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

        return await conn.QuerySingleAsync<CashDrawerShiftDto>(new CommandDefinition(selectClosedSql, new { ShiftId = openShift.Id }, cancellationToken: cancellationToken));
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
