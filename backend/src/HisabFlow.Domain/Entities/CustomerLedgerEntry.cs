using HisabFlow.Domain.Common;
using HisabFlow.Domain.Enums;

namespace HisabFlow.Domain.Entities;

public class CustomerLedgerEntry : BaseEntity
{
    public Guid CustomerId { get; set; }
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? Particulars { get; set; }
    public string? BillNumber { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
}
