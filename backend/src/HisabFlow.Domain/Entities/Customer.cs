using HisabFlow.Domain.Common;

namespace HisabFlow.Domain.Entities;

public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public decimal CreditLimit { get; set; } = 5000m;
    public decimal CurrentBalance { get; set; } = 0m;
    public bool IsActive { get; set; } = true;
}
