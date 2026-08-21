using HisabFlow.Domain.Entities;
using HisabFlow.Domain.Enums;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface ISupplierRepository
{
    Task<IEnumerable<Supplier>> GetAllAsync();
    Task<Supplier?> GetByIdAsync(Guid id);
    Task<Supplier> CreateAsync(Supplier supplier, decimal initialBalance = 0, string? initialNote = null);
    Task<Supplier?> UpdateAsync(Guid id, string name, string phone, string? companyName, string? address);
    Task<bool> DeleteAsync(Guid id);
    Task<SupplierLedgerEntry> RecordTransactionAsync(RecordSupplierTransactionRequest request);
    Task<SupplierStatementDto?> GetStatementAsync(Guid supplierId);
    Task<SupplierSummaryDto> GetSummaryAsync();
}

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
