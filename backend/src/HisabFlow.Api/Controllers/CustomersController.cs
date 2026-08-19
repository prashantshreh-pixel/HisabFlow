using FluentValidation;
using HisabFlow.Application.Customers.DTOs;
using HisabFlow.Infrastructure.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

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

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CustomerDto>>> GetAll()
    {
        var customers = await _customerRepository.GetAllCustomersAsync();
        return Ok(customers);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerDto>> GetById(Guid id)
    {
        var customer = await _customerRepository.GetCustomerByIdAsync(id);
        if (customer == null) return NotFound(new { message = $"Customer with ID {id} not found." });
        return Ok(customer);
    }

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

    [HttpGet("{id:guid}/statement")]
    public async Task<ActionResult<CustomerStatementDto>> GetStatement(Guid id)
    {
        var statement = await _customerRepository.GetCustomerStatementAsync(id);
        if (statement == null) return NotFound(new { message = $"Customer with ID {id} not found." });
        return Ok(statement);
    }

    [HttpPost("transactions")]
    public async Task<ActionResult<CustomerLedgerEntryDto>> RecordTransaction([FromBody] RecordTransactionRequest request)
    {
        var validation = await _transactionValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            // Format to match validation response
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

    [HttpGet("transactions")]
    public async Task<ActionResult<IReadOnlyList<CustomerLedgerEntryDto>>> GetRecentTransactions([FromQuery] int limit = 50)
    {
        var entries = await _customerRepository.GetRecentTransactionsAsync(limit);
        return Ok(entries);
    }

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

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _customerRepository.DeleteCustomerAsync(id);
        if (!deleted) return NotFound(new { message = $"Customer with ID {id} not found." });

        return NoContent();
    }
}
