using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Health check controller for monitoring service availability.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// Checks the health status of the backend API service.
    /// </summary>
    /// <remarks>
    /// This endpoint performs a quick status check to verify that the HisabFlow API server is up and running.
    /// </remarks>
    /// <returns>
    /// An HTTP 200 OK result containing:
    /// - status: "Healthy"
    /// - service: "HisabFlow Backend API"
    /// - timestamp: Current UTC timestamp
    /// - version: Service version string
    /// </returns>
    [HttpGet]
    public IActionResult Ping()
    {
        return Ok(new
        {
            status = "Healthy",
            service = "HisabFlow Backend API",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }
}
