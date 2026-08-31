using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Manages cash drawer register shifts and end-of-day reconciliation.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class CashDrawerController : ControllerBase
{
    private readonly ICashDrawerRepository _cashDrawerRepo;

    public CashDrawerController(ICashDrawerRepository cashDrawerRepo)
    {
        _cashDrawerRepo = cashDrawerRepo;
    }

    /// <summary>
    /// Gets current active open cash drawer shift.
    /// </summary>
    [HttpGet("shift")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<CashDrawerShiftDto?>> GetCurrentOpenShift(CancellationToken cancellationToken = default)
    {
        var shift = await _cashDrawerRepo.GetCurrentOpenShiftAsync(cancellationToken);
        return Ok(shift);
    }

    /// <summary>
    /// Opens a new cash drawer shift with opening cash balance.
    /// </summary>
    [HttpPost("shift/open")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CashDrawerShiftDto>> OpenShift([FromBody] OpenCashDrawerShiftRequest request, CancellationToken cancellationToken = default)
    {
        var shift = await _cashDrawerRepo.OpenShiftAsync(request, cancellationToken);
        return Ok(shift);
    }

    /// <summary>
    /// Closes active cash drawer shift and calculates expected vs actual cash variance.
    /// </summary>
    [HttpPost("shift/close")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CashDrawerShiftDto>> CloseShift([FromBody] CloseCashDrawerShiftRequest request, CancellationToken cancellationToken = default)
    {
        var shift = await _cashDrawerRepo.CloseShiftAsync(request, cancellationToken);
        return Ok(shift);
    }

    /// <summary>
    /// Gets cash drawer register shift history.
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<CashDrawerShiftDto>>> GetHistory([FromQuery] int limit = 30, CancellationToken cancellationToken = default)
    {
        var history = await _cashDrawerRepo.GetShiftHistoryAsync(limit, cancellationToken);
        return Ok(history);
    }
}
