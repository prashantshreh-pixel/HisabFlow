using FluentValidation;
using HisabFlow.Application.Customers.DTOs;
using HisabFlow.Infrastructure.Repositories;
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
    private readonly IValidator<CreateCustomerRequest> _createValidator;
    private readonly IValidator<RecordTransactionRequest> _transactionValidator;

    public CustomersController(
        ICustomerRepository customerRepository,
        IValidator<CreateCustomerRequest> createValidator,
        IValidator<RecordTransactionRequest> transactionValidator)
    {
        _customerRepository = customerRepository;
        _createValidator = createValidator;
        _transactionValidator = transactionValidator;
    }

    /// <summary>
    /// Retrieves all active customers from the database.
    /// </summary>
    /// <remarks>
    /// Fetches all active customer profiles sorted by most recently updated.
    /// </remarks>
    /// <returns>
    /// HTTP 200 OK with a list of <see cref="CustomerDto"/> objects representing active customers.
    /// </returns>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CustomerDto>>> GetAll()
    {
        var customers = await _customerRepository.GetAllCustomersAsync();
        return Ok(customers);
    }

    /// <summary>
    /// Retrieves a single customer profile by their unique ID.
    /// </summary>
    /// <param name="id">The unique identifier (GUID) of the customer.</param>
    /// <remarks>
    /// Looks up customer details by ID in the database.
    /// </remarks>
    /// <returns>
    /// HTTP 200 OK with <see cref="CustomerDto"/> if found; otherwise, HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> GetById(Guid id)
    {
        var customer = await _customerRepository.GetCustomerByIdAsync(id);
        if (customer == null) return NotFound(new { message = $"Customer with ID {id} not found." });
        return Ok(customer);
    }

    /// <summary>
    /// Creates a new customer record in the database.
    /// </summary>
    /// <param name="request">The customer details including name, phone, address, credit limit, and optional opening balance.</param>
    /// <remarks>
    /// Validates customer details and inserts the customer into SQL Server. If an initial balance is specified, an opening ledger entry is created atomically.
    /// </remarks>
    /// <returns>
    /// HTTP 201 Created with the created <see cref="CustomerDto"/> and Location header, or HTTP 400 Bad Request with validation errors.
    /// </returns>
    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create([FromBody] CreateCustomerRequest request)
    {
        var validation = await _createValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return BadRequest(validation.Errors.Select(e => new { property = e.PropertyName, error = e.ErrorMessage }));
        }

        var created = await _customerRepository.CreateCustomerAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>
    /// Retrieves a customer's detailed statement and transaction history.
    /// </summary>
    /// <param name="id">The unique identifier (GUID) of the customer.</param>
    /// <remarks>
    /// Returns the customer profile alongside all recorded credit purchases (Udhaar) and repayment entries (Jama) ordered chronologically.
    /// </remarks>
    /// <returns>
    /// HTTP 200 OK with <see cref="CustomerStatementDto"/> if found; otherwise, HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpGet("{id:guid}/statement")]
    public async Task<ActionResult<CustomerStatementDto>> GetStatement(Guid id)
    {
        var statement = await _customerRepository.GetCustomerStatementAsync(id);
        if (statement == null) return NotFound(new { message = $"Customer with ID {id} not found." });
        return Ok(statement);
    }

    /// <summary>
    /// Records a new Khata transaction (Udhaar credit sale or Jama repayment) for a customer.
    /// </summary>
    /// <param name="request">The transaction payload containing CustomerId, Type (Debit=1, Credit=2), Amount, PaymentMethod, Notes, and BillNumber.</param>
    /// <remarks>
    /// Performs an atomic database transaction with row locks to calculate new balances and append a ledger entry securely.
    /// </remarks>
    /// <returns>
    /// HTTP 200 OK with created <see cref="CustomerLedgerEntryDto"/>, HTTP 400 Bad Request on invalid input, or HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpPost("transactions")]
    public async Task<ActionResult<CustomerLedgerEntryDto>> RecordTransaction([FromBody] RecordTransactionRequest request)
    {
        var validation = await _transactionValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return BadRequest(validation.Errors.Select(e => new { property = e.PropertyName, error = e.ErrorMessage }));
        }

        try
        {
            var entry = await _customerRepository.RecordTransactionAsync(request);
            return Ok(entry);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Fetches a global feed of recent transactions across all customers.
    /// </summary>
    /// <param name="limit">Maximum number of recent transactions to return (default is 50).</param>
    /// <remarks>
    /// Used by the dashboard to show recent shop activity across all customer ledgers.
    /// </remarks>
    /// <returns>
    /// HTTP 200 OK with a list of <see cref="CustomerLedgerEntryDto"/> items.
    /// </returns>
    [HttpGet("transactions")]
    public async Task<ActionResult<IReadOnlyList<CustomerLedgerEntryDto>>> GetRecentTransactions([FromQuery] int limit = 50)
    {
        var entries = await _customerRepository.GetRecentTransactionsAsync(limit);
        return Ok(entries);
    }

    /// <summary>
    /// Updates an existing customer's profile information.
    /// </summary>
    /// <param name="id">The unique identifier (GUID) of the customer to update.</param>
    /// <param name="request">The updated customer profile fields (Name, Phone, Address, CreditLimit).</param>
    /// <remarks>
    /// Validates input and updates customer details in the database.
    /// </remarks>
    /// <returns>
    /// HTTP 204 No Content on successful update, HTTP 400 Bad Request on invalid input, or HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateCustomerRequest request)
    {
        var validation = await _createValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            return BadRequest(validation.Errors.Select(e => new { property = e.PropertyName, error = e.ErrorMessage }));
        }

        var updated = await _customerRepository.UpdateCustomerAsync(id, request);
        if (!updated) return NotFound(new { message = $"Customer with ID {id} not found." });

        return NoContent();
    }

    /// <summary>
    /// Deletes a customer profile and all their associated ledger entries.
    /// </summary>
    /// <param name="id">The unique identifier (GUID) of the customer to delete.</param>
    /// <remarks>
    /// Permanently removes the customer record and cascading ledger entries from SQL Server.
    /// </remarks>
    /// <returns>
    /// HTTP 204 No Content on successful deletion, or HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _customerRepository.DeleteCustomerAsync(id);
        if (!deleted) return NotFound(new { message = $"Customer with ID {id} not found." });

        return NoContent();
    }
}
