namespace HisabFlow.Application.DTOs;

public record ProductDto(
    Guid Id,
    string Name,
    string Category,
    string Unit,
    decimal CostPrice,
    decimal SellingPrice,
    decimal StockQuantity,
    decimal MinStockAlert,
    string? Barcode,
    string? ImageUrl,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateProductRequest(
    string Name,
    string Category,
    string Unit,
    decimal CostPrice,
    decimal SellingPrice,
    decimal StockQuantity,
    decimal MinStockAlert,
    string? Barcode,
    string? ImageUrl
);

public record UpdateProductRequest(
    string Name,
    string Category,
    string Unit,
    decimal CostPrice,
    decimal SellingPrice,
    decimal StockQuantity,
    decimal MinStockAlert,
    string? Barcode,
    string? ImageUrl
);
