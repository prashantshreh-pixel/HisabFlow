using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Text.Json;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Manages terminal authentication, session token issuance, and lock-screen verification.
/// </summary>
[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUser;
    private readonly IAuditRepository _auditRepo;

    public AuthController(
        IAuthService authService,
        ICurrentUserService currentUser,
        IAuditRepository auditRepo)
    {
        _authService = authService;
        _currentUser = currentUser;
        _auditRepo = auditRepo;
    }

    /// <summary>
    /// Authenticates store operator credentials and issues a signed HMAC-SHA256 Bearer token.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthPolicy")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken = default)
    {
        var result = await _authService.AuthenticateAsync(request.Username, request.Password, cancellationToken);
        if (result == null)
        {
            return Unauthorized(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Invalid Credentials",
                Detail = "Invalid username or password. Please verify your terminal credentials.",
                Instance = HttpContext.Request.Path
            });
        }

        try
        {
            await _auditRepo.LogAsync(new CreateAuditLogRequest(
                "Auth",
                result.User.Id,
                "LOGIN",
                JsonSerializer.Serialize(new { result.User.Username, result.User.Role }),
                result.User.Username
            ), cancellationToken);
        }
        catch
        {
            // Non-blocking if database is offline in unit/dev environment
        }

        return Ok(result);
    }

    /// <summary>
    /// Verifies the active operator's password to unlock an idle POS terminal.
    /// </summary>
    [HttpPost("verify-unlock")]
    [Authorize]
    [EnableRateLimiting("AuthPolicy")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<object>> VerifyUnlock([FromBody] VerifyUnlockRequest request, CancellationToken cancellationToken = default)
    {
        var username = _currentUser.Username;
        var isValid = await _authService.VerifyPasswordAsync(username, request.Password, cancellationToken);
        if (!isValid)
        {
            return Unauthorized(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Unlock Failed",
                Detail = "Incorrect password or PIN. Please try again.",
                Instance = HttpContext.Request.Path
            });
        }

        return Ok(new { verified = true, username });
    }

    /// <summary>
    /// Returns the authenticated user's identity and role claims.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<object> GetCurrentUser()
    {
        return Ok(new
        {
            id = _currentUser.UserId,
            username = _currentUser.Username,
            role = _currentUser.Role
        });
    }
}
