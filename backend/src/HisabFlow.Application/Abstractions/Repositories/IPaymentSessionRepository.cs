using HisabFlow.Domain.Entities;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface IPaymentSessionRepository
{
    Task<PaymentSession> CreateAsync(PaymentSession session, CancellationToken cancellationToken = default);

    /// <summary>Returns the session; a Pending session past its expiry is flipped to Expired first.</summary>
    Task<PaymentSession?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<PaymentSession?> GetByPrnAsync(string prn, CancellationToken cancellationToken = default);

    /// <summary>
    /// Atomically moves a Pending, unexpired session to Paid. Returns false if it was already
    /// paid/expired/cancelled, so repeated callbacks are harmless (idempotent).
    /// </summary>
    Task<bool> MarkPaidAsync(Guid id, string paidVia, string? providerTxnId, CancellationToken cancellationToken = default);

    Task<bool> CancelAsync(Guid id, CancellationToken cancellationToken = default);
}
