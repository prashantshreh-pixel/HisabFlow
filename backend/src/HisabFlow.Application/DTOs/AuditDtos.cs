namespace HisabFlow.Application.DTOs;

public record AuditLogDto(
    Guid Id,
    string EntityName,
    string EntityId,
    string Action,
    string? ChangesJson,
    string PerformedBy,
    DateTime CreatedAt
);

public record CreateAuditLogRequest(
    string EntityName,
    string EntityId,
    string Action,
    string? ChangesJson,
    string PerformedBy = "System"
);
