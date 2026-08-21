using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Domain.Entities;
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
    /// Retrieves recent store expenses.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Expense>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] int limit = 100)
    {
        var expenses = await _expenseRepo.GetAllAsync(limit);
        return Ok(expenses);
    }

    /// <summary>
    /// Retrieves an expense by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(Expense), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var expense = await _expenseRepo.GetByIdAsync(id);
        if (expense == null) return NotFound(new { message = $"Expense '{id}' not found." });
        return Ok(expense);
    }

    /// <summary>
    /// Records a new store expense transaction.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(Expense), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] Expense expense)
    {
        if (string.IsNullOrWhiteSpace(expense.Title))
        {
            return BadRequest(new { message = "Expense title is required." });
        }
        if (string.IsNullOrWhiteSpace(expense.Category))
        {
            expense.Category = "General Operational";
        }
        if (expense.Amount <= 0)
        {
            return BadRequest(new { message = "Valid positive expense amount is required." });
        }

        var created = await _expenseRepo.CreateAsync(expense);
        return Ok(created);
    }

    /// <summary>
    /// Deletes an expense record.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _expenseRepo.DeleteAsync(id);
        if (!success) return NotFound(new { message = $"Expense '{id}' not found." });
        return Ok(new { message = "Expense record deleted." });
    }

    /// <summary>
    /// Returns expense summary statistics (Today's, Month's, Total).
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ExpenseSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary()
    {
        var summary = await _expenseRepo.GetSummaryAsync();
        return Ok(summary);
    }
}
