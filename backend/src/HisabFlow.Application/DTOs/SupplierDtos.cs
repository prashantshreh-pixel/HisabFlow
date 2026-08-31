using HisabFlow.Domain.Entities;
using HisabFlow.Domain.Enums;

namespace HisabFlow.Application.DTOs;

public record RecordSupplierTransactionRequest(
    Guid SupplierId,
    int Type, // 1: Stock Purchase (Payable Increases), 2: Payment Given (Payable Decreases)
    decimal Amount,
    PaymentMethod PaymentMethod,
    string? Particulars,
    string? InvoiceNumber,
    DateTime? TransactionDate
);

public record SupplierStatementDto(
    Supplier Supplier,
    IEnumerable<SupplierLedgerEntryDto> LedgerEntries
);

public record SupplierLedgerEntryDto(
    Guid Id,
    Guid SupplierId,
    string SupplierName,
    string SupplierPhone,
    DateTime TransactionDate,
    int Type,
    decimal Amount,
    decimal BalanceAfter,
    PaymentMethod PaymentMethod,
    string? Particulars,
    string? InvoiceNumber,
    DateTime CreatedAt
);

public record SupplierSummaryDto(
    decimal TotalOutstandingPayable,
    decimal TodayPurchases,
    decimal TodayPaymentsGiven,
    int ActiveSuppliersCount,
    int TotalSuppliersCount
);
