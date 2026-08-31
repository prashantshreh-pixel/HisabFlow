namespace HisabFlow.Application.DTOs;

public record StockMovementDto(
    Guid Id,
    Guid ProductId,
    string? ProductName,
    string MovementType, // "SALE", "REFUND", "ADJUSTMENT", "SUPPLIER_PURCHASE"
    decimal QuantityChange,
    decimal StockAfter,
    string? ReferenceId,
    string? Notes,
    DateTime CreatedAt
);

public record CreateStockMovementRequest(
    Guid ProductId,
    string MovementType,
    decimal QuantityChange,
    decimal StockAfter,
    string? ReferenceId = null,
    string? Notes = null
);
