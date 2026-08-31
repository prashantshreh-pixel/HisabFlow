using HisabFlow.Domain.Enums;

namespace HisabFlow.Application.DTOs;

public record CustomerDto(
    Guid Id,
    string Name,
    string Phone,
    string? Address,
    decimal CreditLimit,
    decimal CurrentBalance,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CustomerLedgerEntryDto(
    Guid Id,
    Guid CustomerId,
    string? CustomerName,
    string? CustomerPhone,
    TransactionType Type,
    decimal Amount,
    decimal BalanceAfter,
    PaymentMethod PaymentMethod,
    string? Particulars,
    string? BillNumber,
    DateTime TransactionDate,
    DateTime CreatedAt
);

public record CustomerStatementDto(
    CustomerDto Customer,
    IReadOnlyList<CustomerLedgerEntryDto> LedgerEntries
);

public record CreateCustomerRequest(
    string Name,
    string Phone,
    string? Address,
    decimal CreditLimit,
    decimal InitialBalance = 0m,
    string? InitialNote = null
);

public record RecordTransactionRequest(
    Guid CustomerId,
    TransactionType Type,
    decimal Amount,
    PaymentMethod PaymentMethod,
    string? Particulars,
    string? BillNumber,
    DateTime? TransactionDate
);
