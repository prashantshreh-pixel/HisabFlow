using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Abstractions.Repositories;

public interface IAuditRepository
{
    Task LogAsync(CreateAuditLogRequest request, CancellationToken cancellationToken = default);
    Task<IEnumerable<AuditLogDto>> GetLogsAsync(string? entityName = null, int limit = 100, CancellationToken cancellationToken = default);
}
