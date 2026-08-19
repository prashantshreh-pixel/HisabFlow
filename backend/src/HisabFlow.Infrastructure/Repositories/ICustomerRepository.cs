using HisabFlow.Application.Customers.DTOs;
using HisabFlow.Domain.Entities;

namespace HisabFlow.Infrastructure.Repositories;

public interface ICustomerRepository
{
    Task<IReadOnlyList<CustomerDto>> GetAllCustomersAsync();
    Task<CustomerDto?> GetCustomerByIdAsync(Guid id);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request);
    Task<CustomerStatementDto?> GetCustomerStatementAsync(Guid customerId);
    Task<CustomerLedgerEntryDto> RecordTransactionAsync(RecordTransactionRequest request);
    Task<IReadOnlyList<CustomerLedgerEntryDto>> GetRecentTransactionsAsync(int limit = 50);
    Task<bool> UpdateCustomerAsync(Guid id, CreateCustomerRequest request);
    Task<bool> DeleteCustomerAsync(Guid id);
}
