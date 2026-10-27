using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Provides system audit trail logs for data mutations (Admin only).
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "ADMIN")]
public class AuditController : ControllerBase
{
    private readonly IAuditRepository _auditRepo;

    public AuditController(IAuditRepository auditRepo)
    {
        _auditRepo = auditRepo;
    }

    /// <summary>
    /// Retrieves recent system mutation audit logs.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<AuditLogDto>>> GetLogs(
        [FromQuery] string? entityName = null,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var cappedLimit = Math.Clamp(limit, 1, 500);
        var logs = await _auditRepo.GetLogsAsync(entityName, cappedLimit, cancellationToken);
        return Ok(logs);
    }
}
