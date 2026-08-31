using Dapper;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Common.Models;

namespace HisabFlow.Infrastructure.Services;

public class IdempotencyService : IIdempotencyService
{
    private readonly IDbConnectionFactory _db;

    public IdempotencyService(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<IdempotencyRecord?> GetRecordAsync(string key, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key)) return null;

        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT 
                idempotency_key AS Key,
                request_path AS RequestPath,
                response_status_code AS StatusCode,
                response_body AS ResponseBody,
                created_at AS CreatedAt
            FROM idempotency_records
            WHERE idempotency_key = @Key;";

        return await conn.QuerySingleOrDefaultAsync<IdempotencyRecord>(new CommandDefinition(sql, new { Key = key.Trim() }, cancellationToken: cancellationToken));
    }

    public async Task SaveRecordAsync(string key, string requestPath, int statusCode, string responseBody, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key)) return;

        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            IF NOT EXISTS (SELECT 1 FROM idempotency_records WHERE idempotency_key = @Key)
            BEGIN
                INSERT INTO idempotency_records (idempotency_key, request_path, response_status_code, response_body, created_at)
                VALUES (@Key, @RequestPath, @StatusCode, @ResponseBody, SYSUTCDATETIME());
            END;";

        await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Key = key.Trim(),
            RequestPath = requestPath,
            StatusCode = statusCode,
            ResponseBody = responseBody
        }, cancellationToken: cancellationToken));
    }
}
