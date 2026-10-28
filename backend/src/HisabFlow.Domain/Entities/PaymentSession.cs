namespace HisabFlow.Domain.Entities;

public enum PaymentSessionStatus
{
    Pending = 0,
    Paid = 1,
    Expired = 2,
    Cancelled = 3
}

/// <summary>
/// A single customer-facing QR payment attempt. The server is the source of truth for whether it was paid.
/// </summary>
public class PaymentSession
{
    public Guid Id { get; set; }

    /// <summary>Payment reference number embedded in the QR; unique per attempt.</summary>
    public string Prn { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;
    public string? InvoiceRef { get; set; }
    public decimal Amount { get; set; }
    public PaymentSessionStatus Status { get; set; } = PaymentSessionStatus.Pending;
    public string? ProviderTxnId { get; set; }
    public string? PaidVia { get; set; }
    public string CreatedBy { get; set; } = "System";
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? PaidAt { get; set; }
}
