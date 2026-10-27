using System.Security.Claims;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Application.Common.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> AuthenticateAsync(string username, string password, CancellationToken cancellationToken = default);
    Task<bool> VerifyPasswordAsync(string username, string password, CancellationToken cancellationToken = default);
    ClaimsPrincipal? ValidateToken(string token);
}
