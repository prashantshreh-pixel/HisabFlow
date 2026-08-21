using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Manages Wholesalers & Suppliers, purchase ledger entries, payments given, and statement records.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierRepository _supplierRepo;

    public SuppliersController(ISupplierRepository supplierRepo)
    {
        _supplierRepo = supplierRepo;
    }

    /// <summary>
    /// Gets all active suppliers / wholesalers.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Supplier>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var suppliers = await _supplierRepo.GetAllAsync();
        return Ok(suppliers);
    }

    /// <summary>
    /// Gets a supplier by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(Supplier), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var supplier = await _supplierRepo.GetByIdAsync(id);
        if (supplier == null) return NotFound(new { message = $"Supplier '{id}' not found." });
        return Ok(supplier);
    }

    /// <summary>
    /// Creates a new supplier record.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(Supplier), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateSupplierApiRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Supplier name is required." });
        }
        if (string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { message = "Supplier phone number is required." });
        }

        var supplier = new Supplier
        {
            Name = request.Name.Trim(),
            CompanyName = request.CompanyName?.Trim(),
            Phone = request.Phone.Trim(),
            Address = request.Address?.Trim()
        };

        try
        {
            var created = await _supplierRepo.CreateAsync(supplier, request.InitialBalance, request.InitialNote);
            return Ok(created);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing supplier.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(Supplier), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSupplierApiRequest request)
    {
        var updated = await _supplierRepo.UpdateAsync(id, request.Name, request.Phone, request.CompanyName, request.Address);
        if (updated == null) return NotFound(new { message = $"Supplier '{id}' not found." });
        return Ok(updated);
    }

    /// <summary>
    /// Deletes (soft deactivates) a supplier.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _supplierRepo.DeleteAsync(id);
        if (!success) return NotFound(new { message = $"Supplier '{id}' not found." });
        return Ok(new { message = "Supplier deleted successfully." });
    }

    /// <summary>
    /// Records a transaction (1 = Stock Purchase/Payable Increase, 2 = Payment Given/Payable Decrease).
    /// </summary>
    [HttpPost("transactions")]
    [ProducesResponseType(typeof(SupplierLedgerEntry), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordTransaction([FromBody] RecordSupplierTransactionRequest request)
    {
        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Transaction amount must be greater than zero." });
        }

        try
        {
            var entry = await _supplierRepo.RecordTransactionAsync(request);
            return Ok(entry);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Gets statement ledger entries for a supplier.
    /// </summary>
    [HttpGet("{id:guid}/statement")]
    [ProducesResponseType(typeof(SupplierStatementDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatement(Guid id)
    {
        var statement = await _supplierRepo.GetStatementAsync(id);
        if (statement == null) return NotFound(new { message = $"Supplier '{id}' not found." });
        return Ok(statement);
    }

    /// <summary>
    /// Gets summary statistics for suppliers (Total Payables, Today Purchases, Today Payments).
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(SupplierSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary()
    {
        var summary = await _supplierRepo.GetSummaryAsync();
        return Ok(summary);
    }
}

public record CreateSupplierApiRequest(
    string Name,
    string Phone,
    string? CompanyName,
    string? Address,
    decimal InitialBalance = 0,
    string? InitialNote = null
);

public record UpdateSupplierApiRequest(
    string Name,
    string Phone,
    string? CompanyName,
    string? Address
);
