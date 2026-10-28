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
    DateTime UpdatedAt,
    string? Brand = null,
    string? Description = null
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
    string? ImageUrl,
    string? Brand = null,
    string? Description = null
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
    string? ImageUrl,
    string? Brand = null,
    string? Description = null
);

public record BarcodeEnrichmentData(
    string? Name,
    string? Brand,
    string? Barcode,
    string? Category,
    string? Unit,
    string? ImageUrl,
    string? NetWeight,
    string? Description
);

public record BarcodeLookupResponse(
    bool Found,
    string Source, // "LOCAL_INVENTORY" | "OPEN_CATALOG" | "NONE"
    ProductDto? Product,
    BarcodeEnrichmentData? Data,
    string Message
);

public class StockAdjustmentPayload
{
    public decimal QuantityChange { get; set; }
    public string? Notes { get; set; }
}
