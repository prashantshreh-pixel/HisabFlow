using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using System.Text;
using System.Text.Json;

namespace HisabFlow.Infrastructure.Repositories;

public class ExpenseRepository : IExpenseRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly IAuditRepository _auditRepo;
    private readonly IReportRepository _reportRepo;

    public ExpenseRepository(IDbConnectionFactory db, IAuditRepository auditRepo, IReportRepository reportRepo)
    {
        _db = db;
        _auditRepo = auditRepo;
        _reportRepo = reportRepo;
    }

    public async Task<PagedResult<ExpenseDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? category,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken cancellationToken)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        var whereClause = new StringBuilder(" WHERE 1=1 ");
        var parameters = new DynamicParameters();
        parameters.Add("Offset", offset);
        parameters.Add("PageSize", pageSize);

        if (!string.IsNullOrWhiteSpace(category))
        {
            whereClause.Append(" AND category = @Category ");
            parameters.Add("Category", category.Trim());
        }
        if (startDate.HasValue)
        {
            whereClause.Append(" AND expense_date >= @StartDate ");
            parameters.Add("StartDate", startDate.Value.Date);
        }
        if (endDate.HasValue)
        {
            whereClause.Append(" AND expense_date < @NextDay ");
            parameters.Add("NextDay", endDate.Value.Date.AddDays(1));
        }

        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        var sql = $@"
            SELECT COUNT(1) FROM expenses {whereClause};

            SELECT 
                id AS Id,
                category AS Category,
                title AS Title,
                amount AS Amount,
                CASE payment_method
                    WHEN 1 THEN 'CASH'
                    WHEN 2 THEN 'QR_PAYMENT'
                    WHEN 3 THEN 'BANK_TRANSFER'
                    ELSE 'CASH'
                END AS PaymentMethod,
                particulars AS Particulars,
                expense_date AS ExpenseDate,
                created_at AS CreatedAt
            FROM expenses
            {whereClause}
            ORDER BY expense_date DESC, created_at DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        using var multi = await conn.QueryMultipleAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var totalCount = await multi.ReadSingleAsync<int>();
        var items = (await multi.ReadAsync<ExpenseDto>()).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<ExpenseDto>(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<ExpenseDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT 
                id AS Id,
                category AS Category,
                title AS Title,
                amount AS Amount,
                CASE payment_method
                    WHEN 1 THEN 'CASH'
                    WHEN 2 THEN 'QR_PAYMENT'
                    WHEN 3 THEN 'BANK_TRANSFER'
                    ELSE 'CASH'
                END AS PaymentMethod,
                particulars AS Particulars,
                expense_date AS ExpenseDate,
                created_at AS CreatedAt
            FROM expenses
            WHERE id = @Id;";

        return await conn.QuerySingleOrDefaultAsync<ExpenseDto>(new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));
    }

    public async Task<ExpenseDto> CreateAsync(CreateExpenseRequest request, CancellationToken cancellationToken)
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var expenseDate = request.ExpenseDate ?? now;
        var category = string.IsNullOrWhiteSpace(request.Category) ? "General Operational" : request.Category.Trim();

        var paymentMethodCode = request.PaymentMethod?.ToUpperInvariant() switch
        {
            "QR_PAYMENT" => 2,
            "BANK_TRANSFER" => 3,
            _ => 1
        };

        using var conn = await _db.CreateConnectionAsync(cancellationToken);

        const string shiftSql = "SELECT TOP (1) id FROM cash_drawers WHERE status = 'OPEN' ORDER BY opened_at DESC;";
        var activeShiftId = await conn.QuerySingleOrDefaultAsync<Guid?>(new CommandDefinition(shiftSql, cancellationToken: cancellationToken));

        const string sql = @"
            INSERT INTO expenses (id, category, title, amount, payment_method, particulars, expense_date, cash_drawer_shift_id, created_at)
            VALUES (@Id, @Category, @Title, @Amount, @PaymentMethod, @Particulars, @ExpenseDate, @ShiftId, @CreatedAt);";

        await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = id,
            Category = category,
            Title = request.Title,
            Amount = request.Amount,
            PaymentMethod = paymentMethodCode,
            Particulars = request.Particulars,
            ExpenseDate = expenseDate,
            ShiftId = activeShiftId,
            CreatedAt = now
        }, cancellationToken: cancellationToken));

        await _auditRepo.LogAsync(new CreateAuditLogRequest(
            "Expense",
            id.ToString(),
            "CREATE",
            JsonSerializer.Serialize(new { request.Title, Category = category, request.Amount, PaymentMethod = request.PaymentMethod }),
            "System"
        ), cancellationToken);

        _reportRepo.InvalidateCache();

        var paymentMethodStr = paymentMethodCode switch
        {
            2 => "QR_PAYMENT",
            3 => "BANK_TRANSFER",
            _ => "CASH"
        };

        return new ExpenseDto(
            id,
            category,
            request.Title,
            request.Amount,
            paymentMethodStr,
            request.Particulars,
            expenseDate,
            now
        );
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = "DELETE FROM expenses WHERE id = @Id;";
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));

        if (rows > 0)
        {
            await _auditRepo.LogAsync(new CreateAuditLogRequest(
                "Expense",
                id.ToString(),
                "DELETE",
                "Expense record deleted.",
                "System"
            ), cancellationToken);

            _reportRepo.InvalidateCache();
        }

        return rows > 0;
    }

    public async Task<ExpenseSummaryDto> GetSummaryAsync(
        DateTime? startDate,
        DateTime? endDate,
        string? category,
        CancellationToken cancellationToken)
    {
        var whereClause = new StringBuilder(" WHERE 1=1 ");
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(category))
        {
            whereClause.Append(" AND category = @Category ");
            parameters.Add("Category", category.Trim());
        }
        if (startDate.HasValue)
        {
            whereClause.Append(" AND expense_date >= @StartDate ");
            parameters.Add("StartDate", startDate.Value.Date);
        }
        if (endDate.HasValue)
        {
            whereClause.Append(" AND expense_date < @NextDay ");
            parameters.Add("NextDay", endDate.Value.Date.AddDays(1));
        }

        var todayUtc = DateTime.UtcNow.Date;
        var nextDayUtc = todayUtc.AddDays(1);
        var firstDayOfMonthUtc = new DateTime(todayUtc.Year, todayUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        parameters.Add("TodayUtc", todayUtc);
        parameters.Add("NextDayUtc", nextDayUtc);
        parameters.Add("FirstDayOfMonthUtc", firstDayOfMonthUtc);

        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        var sql = $@"
            SELECT 
                ISNULL(SUM(amount), 0) AS TotalExpenses,
                ISNULL(SUM(CASE WHEN expense_date >= @TodayUtc AND expense_date < @NextDayUtc THEN amount ELSE 0 END), 0) AS TodayExpenses,
                ISNULL(SUM(CASE WHEN expense_date >= @FirstDayOfMonthUtc THEN amount ELSE 0 END), 0) AS MonthExpenses,
                COUNT(1) AS TotalCount
            FROM expenses
            {whereClause};";

        return await conn.QuerySingleAsync<ExpenseSummaryDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }
}
