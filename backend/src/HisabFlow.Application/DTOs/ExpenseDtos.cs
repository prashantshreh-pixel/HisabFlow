namespace HisabFlow.Application.DTOs;

public record ExpenseDto(
    Guid Id,
    string Category,
    string Title,
    decimal Amount,
    string PaymentMethod,
    string? Particulars,
    DateTime ExpenseDate,
    DateTime CreatedAt
);

public record CreateExpenseRequest(
    string Category,
    string Title,
    decimal Amount,
    string? PaymentMethod,
    string? Particulars,
    DateTime? ExpenseDate
);

public record ExpenseSummaryDto(
    decimal TotalExpenses,
    decimal TodayExpenses,
    decimal MonthExpenses,
    int TotalCount
);
