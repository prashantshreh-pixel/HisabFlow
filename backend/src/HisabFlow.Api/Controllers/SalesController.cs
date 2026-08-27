using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Sales.DTOs;
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
    /// Processes and creates a new POS sale checkout, generating invoice, deducting stock, and updating customer ledger if on credit.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SaleDto>> CreateSale([FromBody] CreateSaleRequest request)
    {
        try
        {
            if (request.Items == null || !request.Items.Any())
            {
                return BadRequest(new { message = "Sale must contain at least one item." });
            }

            var created = await _saleRepository.CreateSaleAsync(request);
            return CreatedAtAction(nameof(GetSaleById), new { id = created.Id }, created);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves recent sales invoices (default: top 50).
    /// </summary>
    [HttpGet("recent")]
    public async Task<ActionResult<IReadOnlyList<SaleDto>>> GetRecentSales([FromQuery] int count = 50)
    {
        try
        {
            var sales = await _saleRepository.GetRecentSalesAsync(count);
            return Ok(sales);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves a single sale invoice with all line items by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SaleDto>> GetSaleById(Guid id)
    {
        try
        {
            var sale = await _saleRepository.GetSaleByIdAsync(id);
            if (sale == null)
            {
                return NotFound(new { message = $"Sale with ID '{id}' was not found." });
            }

            return Ok(sale);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves a single sale invoice by its invoice number (e.g. INV-260828-1001).
    /// </summary>
    [HttpGet("invoice/{invoiceNumber}")]
    public async Task<ActionResult<SaleDto>> GetSaleByInvoiceNumber(string invoiceNumber)
    {
        try
        {
            var sale = await _saleRepository.GetSaleByInvoiceNumberAsync(invoiceNumber);
            if (sale == null)
            {
                return NotFound(new { message = $"Invoice '{invoiceNumber}' was not found." });
            }

            return Ok(sale);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves daily POS sales performance metrics and summary.
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<SalesSummaryDto>> GetSalesSummary([FromQuery] DateTime? date = null)
    {
        try
        {
            var summary = await _saleRepository.GetSalesSummaryAsync(date);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
