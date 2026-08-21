using HisabFlow.Domain.Common;

namespace HisabFlow.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Unit { get; set; } = "pcs";
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal StockQuantity { get; set; }
    public decimal MinStockAlert { get; set; } = 5m;
    public string? Barcode { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
}
