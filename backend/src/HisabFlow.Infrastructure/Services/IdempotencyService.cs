using Dapper;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Common.Models;
using Microsoft.Data.SqlClient;

namespace HisabFlow.Infrastructure.Services;

public class IdempotencyService : IIdempotencyService
{
    private readonly IDbConnectionFactory _db;

    public IdempotencyService(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<(IdempotencyResultState State, IdempotencyRecord? Record)> TryReserveKeyAsync(string key, string requestHash, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key)) return (IdempotencyResultState.Reserved, null);

        var trimmedKey = key.Trim();
        using var conn = await _db.CreateConnectionAsync(cancellationToken);

        const string selectSql = @"
            SELECT 
                idempotency_key AS Key,
                request_hash AS RequestHash,
                status AS Status,
                response_code AS StatusCode,
                response_body AS ResponseBody,
                created_at AS CreatedAt
            FROM __IdempotencyKeys
            WHERE idempotency_key = @Key;";

        var existing = await conn.QuerySingleOrDefaultAsync<IdempotencyRecord>(
            new CommandDefinition(selectSql, new { Key = trimmedKey }, cancellationToken: cancellationToken));

        if (existing != null)
        {
            if (!string.Equals(existing.RequestHash, requestHash, StringComparison.OrdinalIgnoreCase))
            {
                return (IdempotencyResultState.PayloadMismatch, existing);
            }
            if (string.Equals(existing.Status, "Processing", StringComparison.OrdinalIgnoreCase))
            {
                return (IdempotencyResultState.Processing, existing);
            }
            return (IdempotencyResultState.Completed, existing);
        }

        const string insertSql = @"
            INSERT INTO __IdempotencyKeys (idempotency_key, request_hash, status, created_at)
            VALUES (@Key, @RequestHash, 'Processing', SYSUTCDATETIME());";

        try
        {
            await conn.ExecuteAsync(new CommandDefinition(insertSql, new { Key = trimmedKey, RequestHash = requestHash }, cancellationToken: cancellationToken));
            return (IdempotencyResultState.Reserved, null);
        }
        catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601) // Primary key constraint violation
        {
            var recheck = await conn.QuerySingleOrDefaultAsync<IdempotencyRecord>(
                new CommandDefinition(selectSql, new { Key = trimmedKey }, cancellationToken: cancellationToken));

            if (recheck != null)
            {
                if (!string.Equals(recheck.RequestHash, requestHash, StringComparison.OrdinalIgnoreCase))
                {
                    return (IdempotencyResultState.PayloadMismatch, recheck);
                }
                if (string.Equals(recheck.Status, "Processing", StringComparison.OrdinalIgnoreCase))
                {
                    return (IdempotencyResultState.Processing, recheck);
                }
                return (IdempotencyResultState.Completed, recheck);
            }
            return (IdempotencyResultState.Processing, null);
        }
    }

    public async Task CompleteReservationAsync(string key, int statusCode, string responseBody, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key)) return;

        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string updateSql = @"
            UPDATE __IdempotencyKeys
            SET status = 'Completed',
                response_code = @StatusCode,
                response_body = @ResponseBody
            WHERE idempotency_key = @Key;";

        await conn.ExecuteAsync(new CommandDefinition(updateSql, new
        {
            Key = key.Trim(),
            StatusCode = statusCode,
            ResponseBody = responseBody
        }, cancellationToken: cancellationToken));
    }
}
