using HisabFlow.Api.Filters;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

[ApiController]
[Route("api/v1/sales")]
public class SalesController : ControllerBase
{
    private readonly ISaleRepository _saleRepository;

    public SalesController(ISaleRepository saleRepository)
    {
        _saleRepository = saleRepository;
    }

    /// <summary>
    /// Processes and creates a new POS sale checkout with idempotency protection.
    /// </summary>
    [HttpPost]
    [Idempotent]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SaleDto>> CreateSale([FromBody] CreateSaleRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Items == null || !request.Items.Any())
        {
            throw new ArgumentException("Sale must contain at least one item.");
        }

        var created = await _saleRepository.CreateSaleAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetSaleById), new { id = created.Id }, created);
    }

    /// <summary>
    /// Retrieves paginated sales history.
    /// </summary>
    [HttpGet("paged")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<SaleDto>>> GetPagedSales(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var paged = await _saleRepository.GetPagedSalesAsync(page, pageSize, cancellationToken);
        return Ok(paged);
    }

    /// <summary>
    /// Retrieves recent sales invoices with capped count parameter (default: top 50, max: 100).
    /// </summary>
    [HttpGet("recent")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SaleDto>>> GetRecentSales([FromQuery] int count = 50, CancellationToken cancellationToken = default)
    {
        var cappedCount = Math.Clamp(count, 1, 100);
        var sales = await _saleRepository.GetRecentSalesAsync(cappedCount, cancellationToken);
        return Ok(sales);
    }

    /// <summary>
    /// Retrieves a single sale invoice with all line items by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SaleDto>> GetSaleById(Guid id, CancellationToken cancellationToken = default)
    {
        var sale = await _saleRepository.GetSaleByIdAsync(id, cancellationToken);
        if (sale == null)
        {
            throw new KeyNotFoundException($"Sale with ID '{id}' was not found.");
        }

        return Ok(sale);
    }

    /// <summary>
    /// Retrieves a single sale invoice by its invoice number (e.g. INV-260828-1001).
    /// </summary>
    [HttpGet("invoice/{invoiceNumber}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SaleDto>> GetSaleByInvoiceNumber(string invoiceNumber, CancellationToken cancellationToken = default)
    {
        var sale = await _saleRepository.GetSaleByInvoiceNumberAsync(invoiceNumber, cancellationToken);
        if (sale == null)
        {
            throw new KeyNotFoundException($"Invoice '{invoiceNumber}' was not found.");
        }

        return Ok(sale);
    }

    /// <summary>
    /// Retrieves daily POS sales performance metrics and summary.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<SalesSummaryDto>> GetSalesSummary([FromQuery] DateTime? date = null, CancellationToken cancellationToken = default)
    {
        var summary = await _saleRepository.GetSalesSummaryAsync(date, cancellationToken);
        return Ok(summary);
    }

    /// <summary>
    /// Refund/cancels a sale invoice, automatically restoring product stock and reversing credit balances.
    /// </summary>
    [HttpPost("{id:guid}/refund")]
    [Idempotent]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SaleDto>> RefundSale(Guid id, [FromBody] RefundSaleApiRequest request, CancellationToken cancellationToken = default)
    {
        var refunded = await _saleRepository.RefundSaleAsync(id, request.Reason ?? "Customer Return", cancellationToken);
        return Ok(refunded);
    }
}

public record RefundSaleApiRequest(string? Reason);
