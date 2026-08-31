namespace HisabFlow.Application.Common.Models;

public record IdempotencyRecord(
    string Key,
    string RequestPath,
    int StatusCode,
    string ResponseBody,
    DateTime CreatedAt
);
