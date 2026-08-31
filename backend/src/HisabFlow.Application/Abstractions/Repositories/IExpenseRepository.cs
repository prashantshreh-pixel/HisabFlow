using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface IExpenseRepository
{
    Task<PagedResult<ExpenseDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? category,
        DateTime? startDate,
        DateTime? endDate,
        CancellationToken cancellationToken);

    Task<ExpenseDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<ExpenseDto> CreateAsync(
        CreateExpenseRequest request,
        CancellationToken cancellationToken);

    Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken);

    Task<ExpenseSummaryDto> GetSummaryAsync(
        DateTime? startDate,
        DateTime? endDate,
        string? category,
        CancellationToken cancellationToken);
}
