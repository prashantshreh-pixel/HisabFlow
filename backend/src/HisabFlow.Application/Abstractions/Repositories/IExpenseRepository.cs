using HisabFlow.Domain.Entities;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface IExpenseRepository
{
    Task<IEnumerable<Expense>> GetAllAsync(int limit = 100);
    Task<Expense?> GetByIdAsync(Guid id);
    Task<Expense> CreateAsync(Expense expense);
    Task<bool> DeleteAsync(Guid id);
    Task<ExpenseSummaryDto> GetSummaryAsync();
}

public record ExpenseSummaryDto(
    decimal TotalExpenses,
    decimal TodayExpenses,
    decimal MonthExpenses,
    int TotalCount
);
