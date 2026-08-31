namespace HisabFlow.Application.DTOs;

public record CashDrawerShiftDto(
    Guid Id,
    decimal OpeningCash,
    decimal CashSales,
    decimal CashExpenses,
    decimal SupplierCashPayments,
    decimal ExpectedCash,
    decimal? ActualCash,
    decimal? Variance,
    string Status, // "OPEN", "CLOSED"
    DateTime OpenedAt,
    DateTime? ClosedAt
);

public record OpenCashDrawerShiftRequest(
    decimal OpeningCash
);

public record CloseCashDrawerShiftRequest(
    decimal ActualCash
);
