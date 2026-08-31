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
}
