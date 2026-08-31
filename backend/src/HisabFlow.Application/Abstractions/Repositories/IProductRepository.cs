using HisabFlow.Application.Common.Models;
using HisabFlow.Domain.Entities;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface IProductRepository
{
    Task<PagedResult<Product>> GetPagedAsync(int page, int pageSize, string? category, string? search, CancellationToken cancellationToken);
    Task<IEnumerable<Product>> GetAllAsync(CancellationToken cancellationToken);
    Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Product> CreateAsync(Product product, CancellationToken cancellationToken);
    Task<bool> UpdateAsync(Product product, DateTime? expectedUpdatedAt, CancellationToken cancellationToken);
    Task<bool> AdjustStockAsync(Guid id, decimal quantityChange, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
