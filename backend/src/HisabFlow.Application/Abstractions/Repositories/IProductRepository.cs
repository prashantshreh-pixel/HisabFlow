using HisabFlow.Domain.Entities;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface IProductRepository
{
    Task<IEnumerable<Product>> GetAllAsync();
    Task<Product?> GetByIdAsync(Guid id);
    Task<Product> CreateAsync(Product product);
    Task<bool> UpdateAsync(Product product);
    Task<bool> AdjustStockAsync(Guid id, decimal quantityChange);
    Task<bool> DeleteAsync(Guid id);
}
