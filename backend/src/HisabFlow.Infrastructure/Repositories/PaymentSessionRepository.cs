using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Domain.Entities;

namespace HisabFlow.Infrastructure.Repositories;

public class PaymentSessionRepository : IPaymentSessionRepository
{
    private readonly IDbConnectionFactory _db;

    private const string SelectColumns = @"
        id AS Id, prn AS Prn, provider AS Provider, invoice_ref AS InvoiceRef, amount AS Amount,
        status AS Status, provider_txn_id AS ProviderTxnId, paid_via AS PaidVia, created_by AS CreatedBy,
        created_at AS CreatedAt, expires_at AS ExpiresAt, paid_at AS PaidAt";

    public PaymentSessionRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<PaymentSession> CreateAsync(PaymentSession session, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            INSERT INTO payment_sessions (id, prn, provider, invoice_ref, amount, status, created_by, created_at, expires_at)
            VALUES (@Id, @Prn, @Provider, @InvoiceRef, @Amount, @Status, @CreatedBy, @CreatedAt, @ExpiresAt);";

        await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            session.Id,
            session.Prn,
            session.Provider,
            session.InvoiceRef,
            session.Amount,
            Status = (int)session.Status,
            session.CreatedBy,
            session.CreatedAt,
            session.ExpiresAt
        }, cancellationToken: cancellationToken));

        return session;
    }

    public async Task<PaymentSession?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        await ExpireStaleAsync(conn, cancellationToken);

        var sql = $"SELECT {SelectColumns} FROM payment_sessions WHERE id = @Id;";
        return await conn.QuerySingleOrDefaultAsync<PaymentSession>(
            new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));
    }

    public async Task<PaymentSession?> GetByPrnAsync(string prn, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        await ExpireStaleAsync(conn, cancellationToken);

        var sql = $"SELECT {SelectColumns} FROM payment_sessions WHERE prn = @Prn;";
        return await conn.QuerySingleOrDefaultAsync<PaymentSession>(
            new CommandDefinition(sql, new { Prn = prn }, cancellationToken: cancellationToken));
    }

    public async Task<bool> MarkPaidAsync(Guid id, string paidVia, string? providerTxnId, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            UPDATE payment_sessions
            SET status = @Paid, paid_via = @PaidVia, provider_txn_id = @ProviderTxnId, paid_at = SYSUTCDATETIME()
            WHERE id = @Id AND status = @Pending AND expires_at > SYSUTCDATETIME();";

        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = id,
            PaidVia = paidVia,
            ProviderTxnId = providerTxnId,
            Paid = (int)PaymentSessionStatus.Paid,
            Pending = (int)PaymentSessionStatus.Pending
        }, cancellationToken: cancellationToken));

        return rows == 1;
    }

    public async Task<bool> CancelAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            UPDATE payment_sessions SET status = @Cancelled
            WHERE id = @Id AND status = @Pending;";

        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = id,
            Cancelled = (int)PaymentSessionStatus.Cancelled,
            Pending = (int)PaymentSessionStatus.Pending
        }, cancellationToken: cancellationToken));

        return rows == 1;
    }

    private static Task ExpireStaleAsync(System.Data.IDbConnection conn, CancellationToken cancellationToken)
    {
        const string sql = @"
            UPDATE payment_sessions SET status = @Expired
            WHERE status = @Pending AND expires_at <= SYSUTCDATETIME();";

        return conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Expired = (int)PaymentSessionStatus.Expired,
            Pending = (int)PaymentSessionStatus.Pending
        }, cancellationToken: cancellationToken));
    }
}
