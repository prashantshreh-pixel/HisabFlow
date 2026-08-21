using HisabFlow.Domain.Common;
using HisabFlow.Domain.Enums;

namespace HisabFlow.Domain.Entities;

public class Expense : BaseEntity
{
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? Particulars { get; set; }
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
}
