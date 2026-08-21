using FluentValidation;
using HisabFlow.Application.Customers.DTOs;
using HisabFlow.Application.Abstractions.Repositories;
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
    /// <returns>
    /// HTTP 200 OK with a list of <see cref="CustomerDto"/> objects representing active customers.
    /// </returns>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CustomerDto>>> GetAll()
    {
        try
        {
            var customers = await _customerRepository.GetAllCustomersAsync();
            return Ok(customers);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves a single customer profile by their unique ID.
    /// </summary>
    /// <param name="id">The unique identifier (GUID) of the customer.</param>
    /// <returns>
    /// HTTP 200 OK with <see cref="CustomerDto"/> if found; otherwise, HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> GetById(Guid id)
    {
        try
        {
            var customer = await _customerRepository.GetCustomerByIdAsync(id);
            if (customer == null) return NotFound(new { message = $"Customer with ID {id} not found." });
            return Ok(customer);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Creates a new customer record in the database.
    /// </summary>
    /// <param name="request">The customer details including name, phone, address, credit limit, and optional opening balance.</param>
    /// <returns>
    /// HTTP 200 OK with created <see cref="CustomerDto"/>, HTTP 400 Bad Request on validation error, or HTTP 500 on server error.
    /// </returns>
    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Create([FromBody] CreateCustomerRequest request)
    {
        var validation = await _createValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            var errorMsg = string.Join(", ", validation.Errors.Select(e => e.ErrorMessage));
            return BadRequest(new { message = errorMsg });
        }

        try
        {
            var created = await _customerRepository.CreateCustomerAsync(request);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves a customer's detailed statement and transaction history.
    /// </summary>
    /// <param name="id">The unique identifier (GUID) of the customer.</param>
    /// <returns>
    /// HTTP 200 OK with <see cref="CustomerStatementDto"/> if found; otherwise, HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpGet("{id:guid}/statement")]
    public async Task<ActionResult<CustomerStatementDto>> GetStatement(Guid id)
    {
        try
        {
            var statement = await _customerRepository.GetCustomerStatementAsync(id);
            if (statement == null) return NotFound(new { message = $"Customer with ID {id} not found." });
            return Ok(statement);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Records a new Khata transaction (Udhaar credit sale or Jama repayment) for a customer.
    /// </summary>
    /// <param name="request">The transaction payload containing CustomerId, Type (Debit=1, Credit=2), Amount, PaymentMethod, Notes, and BillNumber.</param>
    /// <returns>
    /// HTTP 200 OK with created <see cref="CustomerLedgerEntryDto"/>, HTTP 400 Bad Request on invalid input, or HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpPost("transactions")]
    public async Task<ActionResult<CustomerLedgerEntryDto>> RecordTransaction([FromBody] RecordTransactionRequest request)
    {
        var validation = await _transactionValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            var errorMsg = string.Join(", ", validation.Errors.Select(e => e.ErrorMessage));
            return BadRequest(new { message = errorMsg });
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Fetches a global feed of recent transactions across all customers.
    /// </summary>
    /// <param name="limit">Maximum number of recent transactions to return (default is 50).</param>
    /// <returns>
    /// HTTP 200 OK with a list of <see cref="CustomerLedgerEntryDto"/> items.
    /// </returns>
    [HttpGet("transactions")]
    public async Task<ActionResult<IReadOnlyList<CustomerLedgerEntryDto>>> GetRecentTransactions([FromQuery] int limit = 50)
    {
        try
        {
            var entries = await _customerRepository.GetRecentTransactionsAsync(limit);
            return Ok(entries);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing customer's profile information.
    /// </summary>
    /// <param name="id">The unique identifier (GUID) of the customer to update.</param>
    /// <param name="request">The updated customer profile fields (Name, Phone, Address, CreditLimit).</param>
    /// <returns>
    /// HTTP 204 No Content on successful update, HTTP 400 Bad Request on invalid input, or HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateCustomerRequest request)
    {
        var validation = await _createValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            var errorMsg = string.Join(", ", validation.Errors.Select(e => e.ErrorMessage));
            return BadRequest(new { message = errorMsg });
        }

        try
        {
            var updated = await _customerRepository.UpdateCustomerAsync(id, request);
            if (!updated) return NotFound(new { message = $"Customer with ID {id} not found." });

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Deletes a customer profile and all their associated ledger entries.
    /// </summary>
    /// <param name="id">The unique identifier (GUID) of the customer to delete.</param>
    /// <returns>
    /// HTTP 204 No Content on successful deletion, or HTTP 404 Not Found if customer does not exist.
    /// </returns>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var deleted = await _customerRepository.DeleteCustomerAsync(id);
            if (!deleted) return NotFound(new { message = $"Customer with ID {id} not found." });

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
