using HisabFlow.Application.Common.Models;

namespace HisabFlow.Application.Common.Interfaces;

public interface IIdempotencyService
{
    Task<(IdempotencyResultState State, IdempotencyRecord? Record)> TryReserveKeyAsync(string key, string requestHash, CancellationToken cancellationToken = default);
    Task CompleteReservationAsync(string key, int statusCode, string responseBody, CancellationToken cancellationToken = default);
}
