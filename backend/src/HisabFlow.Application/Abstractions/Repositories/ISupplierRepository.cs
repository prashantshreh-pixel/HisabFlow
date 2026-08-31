using HisabFlow.Application.DTOs;
using HisabFlow.Domain.Entities;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface ISupplierRepository
{
    Task<IEnumerable<Supplier>> GetAllAsync(CancellationToken cancellationToken);
    Task<Supplier?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Supplier> CreateAsync(Supplier supplier, decimal initialBalance, string? initialNote, CancellationToken cancellationToken);
    Task<Supplier?> UpdateAsync(Guid id, string name, string phone, string? companyName, string? address, DateTime? expectedUpdatedAt, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<SupplierLedgerEntry> RecordTransactionAsync(RecordSupplierTransactionRequest request, CancellationToken cancellationToken);
    Task<SupplierStatementDto?> GetStatementAsync(Guid supplierId, int page, int pageSize, CancellationToken cancellationToken);
    Task<SupplierSummaryDto> GetSummaryAsync(CancellationToken cancellationToken);
}
