using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Manages store expenses, operational costs, category tracking, and financial summary.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseRepository _expenseRepo;

    public ExpensesController(IExpenseRepository expenseRepo)
    {
        _expenseRepo = expenseRepo;
    }

    /// <summary>
    /// Retrieves paginated and filtered store expenses with page, pageSize, category, and date range filters.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<object>> GetExpenses(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? limit = null,
        [FromQuery] string? category = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        CancellationToken cancellationToken = default)
    {
        var effectivePageSize = limit.HasValue ? Math.Clamp(limit.Value, 1, 100) : Math.Clamp(pageSize, 1, 100);
        var pagedExpenses = await _expenseRepo.GetPagedAsync(
            Math.Max(1, page),
            effectivePageSize,
            category,
            startDate,
            endDate,
            cancellationToken
        );

        if (limit.HasValue)
        {
            return Ok(pagedExpenses.Items);
        }

        return Ok(pagedExpenses);
    }

    /// <summary>
    /// Retrieves an expense by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExpenseDto>> GetById(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var expense = await _expenseRepo.GetByIdAsync(id, cancellationToken);
        if (expense == null) throw new KeyNotFoundException($"Expense '{id}' not found.");
        return Ok(expense);
    }

    /// <summary>
    /// Records a new store expense transaction.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExpenseDto>> Create(
        [FromBody] CreateExpenseRequest request,
        CancellationToken cancellationToken = default)
    {
        var created = await _expenseRepo.CreateAsync(request, cancellationToken);
        return Ok(created);
    }

    /// <summary>
    /// Deletes an expense record.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> Delete(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var success = await _expenseRepo.DeleteAsync(id, cancellationToken);
        if (!success) throw new KeyNotFoundException($"Expense '{id}' not found.");
        return Ok(new { message = "Expense record deleted." });
    }

    /// <summary>
    /// Returns expense summary statistics with optional date range and category filtering.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<ExpenseSummaryDto>> GetSummary(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? category = null,
        CancellationToken cancellationToken = default)
    {
        var summary = await _expenseRepo.GetSummaryAsync(startDate, endDate, category, cancellationToken);
        return Ok(summary);
    }
}
