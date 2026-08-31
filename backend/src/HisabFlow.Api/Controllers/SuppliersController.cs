using HisabFlow.Api.Filters;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.DTOs;
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

    private static SupplierDto MapToDto(Supplier s) => new(
        s.Id,
        s.Name,
        s.CompanyName,
        s.Phone,
        s.Address,
        s.CurrentBalance,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    );

    /// <summary>
    /// Gets all active suppliers / wholesalers.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<SupplierDto>>> GetAll(CancellationToken cancellationToken = default)
    {
        var suppliers = await _supplierRepo.GetAllAsync(cancellationToken);
        return Ok(suppliers.Select(MapToDto));
    }

    /// <summary>
    /// Gets a supplier by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierDto>> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var supplier = await _supplierRepo.GetByIdAsync(id, cancellationToken);
        if (supplier == null) throw new KeyNotFoundException($"Supplier '{id}' was not found.");
        return Ok(MapToDto(supplier));
    }

    /// <summary>
    /// Creates a new supplier record.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SupplierDto>> Create([FromBody] CreateSupplierApiRequest request, CancellationToken cancellationToken = default)
    {
        var supplier = new Supplier
        {
            Name = request.Name.Trim(),
            CompanyName = request.CompanyName?.Trim(),
            Phone = request.Phone.Trim(),
            Address = request.Address?.Trim()
        };

        var created = await _supplierRepo.CreateAsync(supplier, request.InitialBalance, request.InitialNote, cancellationToken);
        return Ok(MapToDto(created));
    }

    /// <summary>
    /// Updates an existing supplier with optimistic concurrency check.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierDto>> Update(
        Guid id,
        [FromBody] UpdateSupplierApiRequest request,
        [FromQuery] DateTime? expectedUpdatedAt = null,
        CancellationToken cancellationToken = default)
    {
        var updated = await _supplierRepo.UpdateAsync(id, request.Name, request.Phone, request.CompanyName, request.Address, expectedUpdatedAt, cancellationToken);
        if (updated == null) throw new KeyNotFoundException($"Supplier '{id}' was not found or was modified by another user.");
        return Ok(MapToDto(updated));
    }

    /// <summary>
    /// Deletes (soft deactivates) a supplier.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var success = await _supplierRepo.DeleteAsync(id, cancellationToken);
        if (!success) throw new KeyNotFoundException($"Supplier '{id}' was not found.");
        return Ok(new { message = "Supplier deleted successfully." });
    }

    /// <summary>
    /// Records a supplier transaction with idempotency protection.
    /// </summary>
    [HttpPost("transactions")]
    [Idempotent]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SupplierLedgerEntryDto>> RecordTransaction([FromBody] RecordSupplierTransactionRequest request, CancellationToken cancellationToken = default)
    {
        var entry = await _supplierRepo.RecordTransactionAsync(request, cancellationToken);
        return Ok(entry);
    }

    /// <summary>
    /// Gets statement ledger entries for a supplier with optional pagination.
    /// </summary>
    [HttpGet("{id:guid}/statement")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierStatementDto>> GetStatement(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var statement = await _supplierRepo.GetStatementAsync(id, page, pageSize, cancellationToken);
        if (statement == null) throw new KeyNotFoundException($"Supplier '{id}' was not found.");
        return Ok(statement);
    }

    /// <summary>
    /// Gets summary statistics for suppliers (Total Payables, Today Purchases, Today Payments).
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<SupplierSummaryDto>> GetSummary(CancellationToken cancellationToken = default)
    {
        var summary = await _supplierRepo.GetSummaryAsync(cancellationToken);
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
