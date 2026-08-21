using HisabFlow.Domain.Common;

namespace HisabFlow.Domain.Entities;

public class Supplier : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public decimal CurrentBalance { get; set; } // Positive = Shop owes supplier (Payable)
    public bool IsActive { get; set; } = true;
}
