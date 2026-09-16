using HisabFlow.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace HisabFlow.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? UserId =>
        _httpContextAccessor.HttpContext?.User?.FindFirst("sub")?.Value 
        ?? _httpContextAccessor.HttpContext?.Request.Headers["X-User-Id"].FirstOrDefault();

    public string Username =>
        _httpContextAccessor.HttpContext?.User?.Identity?.Name
        ?? _httpContextAccessor.HttpContext?.Request.Headers["X-User-Name"].FirstOrDefault()
        ?? "Operator";

    public string Role =>
        _httpContextAccessor.HttpContext?.User?.FindFirst("role")?.Value
        ?? _httpContextAccessor.HttpContext?.Request.Headers["X-User-Role"].FirstOrDefault()
        ?? "Admin";
}
