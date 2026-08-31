using HisabFlow.Api.Filters;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Manages Customer records, Khata credit ledgers, and transaction history.
/// </summary>
[ApiController]
[Route("api/v1/customers")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerRepository _customerRepository;

    public CustomersController(ICustomerRepository customerRepository)
    {
        _customerRepository = customerRepository;
    }

    /// <summary>
    /// Retrieves active customers with optional pagination or full listing.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<object>> GetAll(
        [FromQuery] bool all = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (!all)
        {
            var paged = await _customerRepository.GetPagedCustomersAsync(page, pageSize, cancellationToken);
            return Ok(paged);
        }

        var customers = await _customerRepository.GetAllCustomersAsync(cancellationToken);
        return Ok(customers);
    }

    /// <summary>
    /// Retrieves paginated customer profiles.
    /// </summary>
    [HttpGet("paged")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CustomerDto>>> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var paged = await _customerRepository.GetPagedCustomersAsync(page, pageSize, cancellationToken);
        return Ok(paged);
    }

    /// <summary>
    /// Retrieves a single customer profile by their unique ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerDto>> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var customer = await _customerRepository.GetCustomerByIdAsync(id, cancellationToken);
        if (customer == null) throw new KeyNotFoundException($"Customer with ID '{id}' was not found.");
        return Ok(customer);
    }

    /// <summary>
    /// Creates a new customer record in the database atomically within a transaction.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CustomerDto>> Create([FromBody] CreateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        var created = await _customerRepository.CreateCustomerAsync(request, cancellationToken);
        return Ok(created);
    }

    /// <summary>
    /// Retrieves a customer's detailed statement and transaction history with optional pagination.
    /// </summary>
    [HttpGet("{id:guid}/statement")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerStatementDto>> GetStatement(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var statement = await _customerRepository.GetCustomerStatementAsync(id, page, pageSize, cancellationToken);
        if (statement == null) throw new KeyNotFoundException($"Customer with ID '{id}' was not found.");
        return Ok(statement);
    }

    /// <summary>
    /// Records a new Khata transaction with strict Idempotency protection and row-level locking.
    /// </summary>
    [HttpPost("transactions")]
    [Idempotent]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerLedgerEntryDto>> RecordTransaction([FromBody] RecordTransactionRequest request, CancellationToken cancellationToken = default)
    {
        var entry = await _customerRepository.RecordTransactionAsync(request, cancellationToken);
        return Ok(entry);
    }

    /// <summary>
    /// Fetches a global feed of recent transactions across all customers with capped limit parameter.
    /// </summary>
    [HttpGet("transactions")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CustomerLedgerEntryDto>>> GetRecentTransactions(
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var cappedLimit = Math.Clamp(limit, 1, 100);
        var entries = await _customerRepository.GetRecentTransactionsAsync(cappedLimit, cancellationToken);
        return Ok(entries);
    }

    /// <summary>
    /// Updates an existing customer's profile information with optimistic concurrency control.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Update(
        Guid id,
        [FromBody] CreateCustomerRequest request,
        [FromQuery] DateTime? expectedUpdatedAt = null,
        CancellationToken cancellationToken = default)
    {
        var updated = await _customerRepository.UpdateCustomerAsync(id, request, expectedUpdatedAt, cancellationToken);
        if (!updated) throw new KeyNotFoundException($"Customer with ID '{id}' was not found or was modified by another user.");
        return NoContent();
    }

    /// <summary>
    /// Soft deletes a customer profile preserving audit trail and FK integrity.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await _customerRepository.DeleteCustomerAsync(id, cancellationToken);
        if (!deleted) throw new KeyNotFoundException($"Customer with ID '{id}' was not found.");
        return NoContent();
    }
}
