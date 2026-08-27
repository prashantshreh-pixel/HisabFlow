namespace HisabFlow.Domain.Entities;

public class SaleItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SaleId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Unit { get; set; } = "pcs";
    public decimal UnitPrice { get; set; }
    public decimal CostPrice { get; set; }
    public decimal Quantity { get; set; } = 1.0m;
    public decimal Subtotal { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
