using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface IStockMovementRepository
{
    Task RecordMovementAsync(CreateStockMovementRequest request, CancellationToken cancellationToken = default);
    Task<IEnumerable<StockMovementDto>> GetMovementsByProductAsync(Guid productId, int limit = 50, CancellationToken cancellationToken = default);
    Task<IEnumerable<StockMovementDto>> GetRecentMovementsAsync(int limit = 100, CancellationToken cancellationToken = default);
}
