namespace HisabFlow.Application.Common.Models;

public enum IdempotencyResultState
{
    Reserved,
    Processing,
    PayloadMismatch,
    Completed
}

public record IdempotencyRecord(
    string Key,
    string RequestHash,
    string Status,
    int? StatusCode,
    string? ResponseBody,
    DateTime CreatedAt
);
