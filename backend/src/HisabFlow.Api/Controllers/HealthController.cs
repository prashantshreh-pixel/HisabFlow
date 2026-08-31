using HisabFlow.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Health check controller for monitoring service availability and database readiness.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public HealthController(IDbConnectionFactory db)
    {
        _db = db;
    }

    /// <summary>
    /// Liveness probe checking API process health status.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<object> Ping()
    {
        return Ok(new
        {
            status = "Healthy",
            service = "HisabFlow Backend API",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }

    /// <summary>
    /// Readiness probe verifying active database connection and migration status.
    /// </summary>
    [HttpGet("ready")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<object>> Readiness(CancellationToken cancellationToken = default)
    {
        try
        {
            using var conn = await _db.CreateConnectionAsync(cancellationToken);
            return Ok(new
            {
                status = "Ready",
                database = "Connected",
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                status = "Unhealthy",
                database = "Disconnected",
                message = "Database service is unavailable.",
                timestamp = DateTime.UtcNow
            });
        }
    }
}
