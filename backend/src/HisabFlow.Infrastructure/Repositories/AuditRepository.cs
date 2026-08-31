using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Infrastructure.Repositories;

public class AuditRepository : IAuditRepository
{
    private readonly IDbConnectionFactory _db;

    public AuditRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task LogAsync(CreateAuditLogRequest request, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            INSERT INTO audit_logs (id, entity_name, entity_id, action, changes_json, performed_by, created_at)
            VALUES (@Id, @EntityName, @EntityId, @Action, @ChangesJson, @PerformedBy, SYSUTCDATETIME());";

        await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = Guid.NewGuid(),
            request.EntityName,
            request.EntityId,
            request.Action,
            request.ChangesJson,
            request.PerformedBy
        }, cancellationToken: cancellationToken));
    }

    public async Task<IEnumerable<AuditLogDto>> GetLogsAsync(string? entityName = null, int limit = 100, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        var sql = @"
            SELECT TOP (@Limit)
                id AS Id,
                entity_name AS EntityName,
                entity_id AS EntityId,
                action AS Action,
                changes_json AS ChangesJson,
                performed_by AS PerformedBy,
                created_at AS CreatedAt
            FROM audit_logs
            " + (!string.IsNullOrWhiteSpace(entityName) ? "WHERE entity_name = @EntityName " : "") + @"
            ORDER BY created_at DESC;";

        return await conn.QueryAsync<AuditLogDto>(new CommandDefinition(sql, new { EntityName = entityName, Limit = limit }, cancellationToken: cancellationToken));
    }
}
