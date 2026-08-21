using HisabFlow.Domain.Common;
using HisabFlow.Domain.Enums;

namespace HisabFlow.Domain.Entities;

public class SupplierLedgerEntry : BaseEntity
{
    public Guid SupplierId { get; set; }
    public int Type { get; set; } // 1: Purchase (Debt Increase / Bill), 2: Payment Given (Debt Reduce / Jama)
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? Particulars { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
}
