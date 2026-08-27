using HisabFlow.Domain.Common;

namespace HisabFlow.Domain.Entities;

public class Sale : BaseEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public int PaymentMethod { get; set; } = 1;
    public decimal CashPaid { get; set; }
    public decimal DigitalPaid { get; set; }
    public decimal CreditPaid { get; set; }
    public string? Notes { get; set; }
    public DateTime SaleDate { get; set; } = DateTime.UtcNow;
    public List<SaleItem> Items { get; set; } = new();
}
