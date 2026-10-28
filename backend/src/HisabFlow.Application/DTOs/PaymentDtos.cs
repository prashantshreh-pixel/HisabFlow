using HisabFlow.Domain.Entities;

namespace HisabFlow.Application.DTOs;

public record CreatePaymentSessionRequest(
    decimal Amount,
    string? InvoiceRef,
    string Provider = "FONEPAY"
);

public record PaymentSessionDto(
    Guid Id,
    string Prn,
    string Provider,
    string? InvoiceRef,
    decimal Amount,
    PaymentSessionStatus Status,
    string? PaidVia,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    DateTime? PaidAt
);

/// <summary>Normalised body that a provider callback must carry (after signature verification).</summary>
public record PaymentCallbackRequest(
    string Prn,
    decimal Amount,
    string? TransactionId,
    string Status
);
