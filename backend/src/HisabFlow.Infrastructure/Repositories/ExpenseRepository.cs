using System.Data;
using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Domain.Entities;

namespace HisabFlow.Infrastructure.Repositories;

public class ExpenseRepository : IExpenseRepository
{
    private readonly IDbConnectionFactory _db;

    public ExpenseRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<IEnumerable<Expense>> GetAllAsync(int limit = 100)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            SELECT TOP (@Limit)
                id AS Id,
                category AS Category,
                title AS Title,
                amount AS Amount,
                payment_method AS PaymentMethod,
                particulars AS Particulars,
                expense_date AS ExpenseDate,
                created_at AS CreatedAt
            FROM expenses
            ORDER BY expense_date DESC, created_at DESC;";

        return await conn.QueryAsync<Expense>(sql, new { Limit = limit });
    }

    public async Task<Expense?> GetByIdAsync(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                id AS Id,
                category AS Category,
                title AS Title,
                amount AS Amount,
                payment_method AS PaymentMethod,
                particulars AS Particulars,
                expense_date AS ExpenseDate,
                created_at AS CreatedAt
            FROM expenses
            WHERE id = @Id;";

        return await conn.QuerySingleOrDefaultAsync<Expense>(sql, new { Id = id });
    }

    public async Task<Expense> CreateAsync(Expense expense)
    {
        if (expense.Id == Guid.Empty)
        {
            expense.Id = Guid.NewGuid();
        }
        if (expense.CreatedAt == default)
        {
            expense.CreatedAt = DateTime.UtcNow;
        }
        if (expense.ExpenseDate == default)
        {
            expense.ExpenseDate = DateTime.UtcNow;
        }

        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO expenses (id, category, title, amount, payment_method, particulars, expense_date, created_at)
            VALUES (@Id, @Category, @Title, @Amount, @PaymentMethod, @Particulars, @ExpenseDate, @CreatedAt);";

        await conn.ExecuteAsync(sql, new
        {
            expense.Id,
            expense.Category,
            expense.Title,
            expense.Amount,
            PaymentMethod = (int)expense.PaymentMethod,
            expense.Particulars,
            expense.ExpenseDate,
            expense.CreatedAt
        });

        return expense;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = "DELETE FROM expenses WHERE id = @Id;";
        var rows = await conn.ExecuteAsync(sql, new { Id = id });
        return rows > 0;
    }

    public async Task<ExpenseSummaryDto> GetSummaryAsync()
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            SELECT 
                ISNULL(SUM(amount), 0) AS TotalExpenses,
                ISNULL(SUM(CASE WHEN CAST(expense_date AS DATE) = CAST(SYSUTCDATETIME() AS DATE) THEN amount ELSE 0 END), 0) AS TodayExpenses,
                ISNULL(SUM(CASE WHEN MONTH(expense_date) = MONTH(SYSUTCDATETIME()) AND YEAR(expense_date) = YEAR(SYSUTCDATETIME()) THEN amount ELSE 0 END), 0) AS MonthExpenses,
                COUNT(1) AS TotalCount
            FROM expenses;";

        return await conn.QuerySingleAsync<ExpenseSummaryDto>(sql);
    }
}
