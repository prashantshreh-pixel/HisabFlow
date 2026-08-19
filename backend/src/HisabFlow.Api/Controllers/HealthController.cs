using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class HealthController : ControllerBase
{
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
