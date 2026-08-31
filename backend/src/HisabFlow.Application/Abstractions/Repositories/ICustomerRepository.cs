using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface ICustomerRepository
{
    Task<PagedResult<CustomerDto>> GetPagedCustomersAsync(int page, int pageSize, CancellationToken cancellationToken);
    Task<IReadOnlyList<CustomerDto>> GetAllCustomersAsync(CancellationToken cancellationToken);
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken cancellationToken);
    Task<CustomerStatementDto?> GetCustomerStatementAsync(Guid customerId, int page, int pageSize, CancellationToken cancellationToken);
    Task<CustomerLedgerEntryDto> RecordTransactionAsync(RecordTransactionRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<CustomerLedgerEntryDto>> GetRecentTransactionsAsync(int limit, CancellationToken cancellationToken);
    Task<bool> UpdateCustomerAsync(Guid id, CreateCustomerRequest request, DateTime? expectedUpdatedAt, CancellationToken cancellationToken);
    Task<bool> DeleteCustomerAsync(Guid id, CancellationToken cancellationToken);
}
