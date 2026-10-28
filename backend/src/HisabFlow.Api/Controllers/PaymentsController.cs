using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.DTOs;
using HisabFlow.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Customer-facing QR payment sessions. The server decides when a session is "Paid"; the browser only polls.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class PaymentsController : ControllerBase
{
    private static readonly HashSet<string> AllowedProviders = new(StringComparer.OrdinalIgnoreCase)
    {
        "FONEPAY", "KHALTI", "ESEWA"
    };

    private static readonly HashSet<string> SuccessStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "SUCCESS", "PAID", "COMPLETE", "COMPLETED"
    };

    private const decimal MaxAmount = 10_000_000m;
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromMinutes(5);

    private readonly IPaymentSessionRepository _sessions;
    private readonly IAuditRepository _audit;
    private readonly ICurrentUserService _currentUser;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        IPaymentSessionRepository sessions,
        IAuditRepository audit,
        ICurrentUserService currentUser,
        IConfiguration config,
        IWebHostEnvironment env,
        ILogger<PaymentsController> logger)
    {
        _sessions = sessions;
        _audit = audit;
        _currentUser = currentUser;
        _config = config;
        _env = env;
        _logger = logger;
    }

    private static PaymentSessionDto ToDto(PaymentSession s) => new(
        s.Id, s.Prn, s.Provider, s.InvoiceRef, s.Amount, s.Status, s.PaidVia, s.CreatedAt, s.ExpiresAt, s.PaidAt);

    /// <summary>Starts a new payment attempt and returns the PRN to embed in the QR.</summary>
    [HttpPost("sessions")]
    [Authorize(Roles = "ADMIN,MANAGER,CASHIER")]
    public async Task<ActionResult<PaymentSessionDto>> CreateSession(
        [FromBody] CreatePaymentSessionRequest request, CancellationToken cancellationToken)
    {
        if (request.Amount <= 0 || request.Amount > MaxAmount)
            return BadRequest(new { message = "Amount must be greater than 0 and within the allowed limit." });

        var provider = (request.Provider ?? "").Trim().ToUpperInvariant();
        if (!AllowedProviders.Contains(provider))
            return BadRequest(new { message = "Unsupported payment provider." });

        var invoiceRef = request.InvoiceRef?.Trim();
        if (invoiceRef is { Length: > 50 })
            return BadRequest(new { message = "Invoice reference is too long." });

        var now = DateTime.UtcNow;
        var session = new PaymentSession
        {
            Id = Guid.NewGuid(),
            // Random, non-guessable reference (providers typically cap PRN length)
            Prn = "HF" + Convert.ToHexString(RandomNumberGenerator.GetBytes(8)),
            Provider = provider,
            InvoiceRef = invoiceRef,
            Amount = Math.Round(request.Amount, 2),
            Status = PaymentSessionStatus.Pending,
            CreatedBy = _currentUser.Username,
            CreatedAt = now,
            ExpiresAt = now.Add(SessionLifetime)
        };

        await _sessions.CreateAsync(session, cancellationToken);
        return Ok(ToDto(session));
    }

    /// <summary>Polled by the POS screen to learn the current status.</summary>
    [HttpGet("sessions/{id:guid}")]
    [Authorize(Roles = "ADMIN,MANAGER,CASHIER")]
    public async Task<ActionResult<PaymentSessionDto>> GetSession(Guid id, CancellationToken cancellationToken)
    {
        var session = await _sessions.GetByIdAsync(id, cancellationToken);
        return session is null ? NotFound() : Ok(ToDto(session));
    }

    /// <summary>Cashier-verified fallback (e.g. shop owner checked the merchant app). Audited.</summary>
    [HttpPost("sessions/{id:guid}/confirm-manual")]
    [Authorize(Roles = "ADMIN,MANAGER,CASHIER")]
    public async Task<ActionResult<PaymentSessionDto>> ConfirmManual(Guid id, CancellationToken cancellationToken)
    {
        var session = await _sessions.GetByIdAsync(id, cancellationToken);
        if (session is null) return NotFound();

        var changed = await _sessions.MarkPaidAsync(id, "MANUAL", null, cancellationToken);
        if (changed)
        {
            await _audit.LogAsync(new CreateAuditLogRequest(
                "PaymentSession", id.ToString(), "MANUAL_CONFIRM",
                JsonSerializer.Serialize(new { session.Prn, session.Amount, session.Provider }),
                _currentUser.Username), cancellationToken);
        }

        var fresh = await _sessions.GetByIdAsync(id, cancellationToken);
        return Ok(ToDto(fresh!));
    }

    /// <summary>Cancels a pending session (customer left / cashier closed the dialog).</summary>
    [HttpPost("sessions/{id:guid}/cancel")]
    [Authorize(Roles = "ADMIN,MANAGER,CASHIER")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken cancellationToken)
    {
        await _sessions.CancelAsync(id, cancellationToken);
        return NoContent();
    }

    /// <summary>Development-only: pretend the customer paid, to test the success animation end to end.</summary>
    [HttpPost("sessions/{id:guid}/simulate")]
    [Authorize(Roles = "ADMIN,MANAGER,CASHIER")]
    public async Task<ActionResult<PaymentSessionDto>> Simulate(Guid id, CancellationToken cancellationToken)
    {
        if (!_env.IsDevelopment()) return NotFound();

        var session = await _sessions.GetByIdAsync(id, cancellationToken);
        if (session is null) return NotFound();

        await _sessions.MarkPaidAsync(id, "SIMULATED", "SIM-" + session.Prn, cancellationToken);
        var fresh = await _sessions.GetByIdAsync(id, cancellationToken);
        return Ok(ToDto(fresh!));
    }

    /// <summary>
    /// Provider webhook. Unauthenticated by design, so it is protected by an HMAC-SHA256 signature of the
    /// raw body (header X-Signature, hex) using the per-provider secret in configuration
    /// (Payments:Providers:{PROVIDER}:CallbackSecret). Unconfigured providers are rejected.
    /// </summary>
    [HttpPost("callback/{provider}")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback(string provider, CancellationToken cancellationToken)
    {
        provider = provider.Trim().ToUpperInvariant();
        if (!AllowedProviders.Contains(provider)) return NotFound();

        var secret = _config[$"Payments:Providers:{provider}:CallbackSecret"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            _logger.LogWarning("Payment callback received for {Provider} but no secret is configured.", provider);
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        // Cap body size before reading
        if (Request.ContentLength is null or > 8 * 1024)
            return StatusCode(StatusCodes.Status413PayloadTooLarge);

        string rawBody;
        using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
        {
            rawBody = await reader.ReadToEndAsync(cancellationToken);
        }

        var signatureHex = Request.Headers["X-Signature"].FirstOrDefault();
        if (!IsValidSignature(rawBody, signatureHex, secret))
        {
            _logger.LogWarning("Rejected {Provider} payment callback with invalid signature.", provider);
            return Unauthorized();
        }

        PaymentCallbackRequest? payload;
        try
        {
            payload = JsonSerializer.Deserialize<PaymentCallbackRequest>(
                rawBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException)
        {
            return BadRequest();
        }

        if (payload is null || string.IsNullOrWhiteSpace(payload.Prn)) return BadRequest();

        var session = await _sessions.GetByPrnAsync(payload.Prn, cancellationToken);
        if (session is null) return NotFound();

        // Provider and amount must match what we issued — never trust the callback amount blindly.
        if (!string.Equals(session.Provider, provider, StringComparison.OrdinalIgnoreCase)
            || Math.Round(payload.Amount, 2) != session.Amount)
        {
            _logger.LogWarning("Callback mismatch for PRN {Prn}: provider/amount did not match.", session.Prn);
            return BadRequest(new { message = "Provider or amount mismatch." });
        }

        if (!SuccessStatuses.Contains(payload.Status ?? string.Empty))
            return Ok(new { received = true });

        var changed = await _sessions.MarkPaidAsync(session.Id, provider, payload.TransactionId, cancellationToken);
        if (changed)
        {
            await _audit.LogAsync(new CreateAuditLogRequest(
                "PaymentSession", session.Id.ToString(), "PAID",
                JsonSerializer.Serialize(new { session.Prn, session.Amount, provider, payload.TransactionId }),
                provider), cancellationToken);
        }

        // Always 200 so the provider stops retrying; repeated callbacks are idempotent.
        return Ok(new { received = true });
    }

    private static bool IsValidSignature(string body, string? signatureHex, string secret)
    {
        if (string.IsNullOrWhiteSpace(signatureHex)) return false;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expected = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));

        byte[] provided;
        try
        {
            provided = Convert.FromHexString(signatureHex.Trim());
        }
        catch (FormatException)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(expected, provided);
    }
}
