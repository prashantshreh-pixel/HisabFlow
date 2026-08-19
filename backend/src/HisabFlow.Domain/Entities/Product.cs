using HisabFlow.Domain.Common;

namespace HisabFlow.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal CurrentStock { get; set; }
    public string Unit { get; set; } = "pcs";
    public decimal MinStockThreshold { get; set; } = 5m;
}
