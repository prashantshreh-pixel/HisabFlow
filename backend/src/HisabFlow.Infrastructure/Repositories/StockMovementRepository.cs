using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Infrastructure.Repositories;

public class StockMovementRepository : IStockMovementRepository
{
    private readonly IDbConnectionFactory _db;

    public StockMovementRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task RecordMovementAsync(CreateStockMovementRequest request, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            INSERT INTO stock_movements (id, product_id, movement_type, quantity_change, stock_after, reference_id, notes, created_at)
            VALUES (@Id, @ProductId, @MovementType, @QuantityChange, @StockAfter, @ReferenceId, @Notes, SYSUTCDATETIME());";

        await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = Guid.NewGuid(),
            request.ProductId,
            request.MovementType,
            request.QuantityChange,
            request.StockAfter,
            request.ReferenceId,
            request.Notes
        }, cancellationToken: cancellationToken));
    }

    public async Task<IEnumerable<StockMovementDto>> GetMovementsByProductAsync(Guid productId, int limit = 50, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT TOP (@Limit)
                sm.id AS Id,
                sm.product_id AS ProductId,
                p.name AS ProductName,
                sm.movement_type AS MovementType,
                sm.quantity_change AS QuantityChange,
                sm.stock_after AS StockAfter,
                sm.reference_id AS ReferenceId,
                sm.notes AS Notes,
                sm.created_at AS CreatedAt
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            WHERE sm.product_id = @ProductId
            ORDER BY sm.created_at DESC;";

        return await conn.QueryAsync<StockMovementDto>(new CommandDefinition(sql, new { ProductId = productId, Limit = limit }, cancellationToken: cancellationToken));
    }

    public async Task<IEnumerable<StockMovementDto>> GetRecentMovementsAsync(int limit = 100, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT TOP (@Limit)
                sm.id AS Id,
                sm.product_id AS ProductId,
                p.name AS ProductName,
                sm.movement_type AS MovementType,
                sm.quantity_change AS QuantityChange,
                sm.stock_after AS StockAfter,
                sm.reference_id AS ReferenceId,
                sm.notes AS Notes,
                sm.created_at AS CreatedAt
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            ORDER BY sm.created_at DESC;";

        return await conn.QueryAsync<StockMovementDto>(new CommandDefinition(sql, new { Limit = limit }, cancellationToken: cancellationToken));
    }
}
