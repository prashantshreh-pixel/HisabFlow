using HisabFlow.Application.Common.Models;

namespace HisabFlow.Application.Common.Interfaces;

public interface IIdempotencyService
{
    Task<IdempotencyRecord?> GetRecordAsync(string key, CancellationToken cancellationToken);
    Task SaveRecordAsync(string key, string requestPath, int statusCode, string responseBody, CancellationToken cancellationToken);
}
