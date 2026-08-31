using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace HisabFlow.Api.Filters;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class IdempotentAttribute : Attribute, IAsyncActionFilter
{
    private const string IdempotencyHeaderName = "Idempotency-Key";
    private const string AlternateHeaderName = "X-Idempotency-Key";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;
        var idempotencyKey = httpContext.Request.Headers[IdempotencyHeaderName].FirstOrDefault()
            ?? httpContext.Request.Headers[AlternateHeaderName].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            await next();
            return;
        }

        // Calculate SHA-256 hash of request path + body
        httpContext.Request.EnableBuffering();
        using var reader = new StreamReader(httpContext.Request.Body, Encoding.UTF8, leaveOpen: true);
        var bodyText = await reader.ReadToEndAsync(httpContext.RequestAborted);
        httpContext.Request.Body.Position = 0;

        var rawContentToHash = $"{httpContext.Request.Path}:{bodyText}";
        var requestHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawContentToHash)));

        var idempotencyService = httpContext.RequestServices.GetRequiredService<IIdempotencyService>();
        var (state, existingRecord) = await idempotencyService.TryReserveKeyAsync(idempotencyKey, requestHash, httpContext.RequestAborted);

        if (state == IdempotencyResultState.PayloadMismatch)
        {
            context.Result = new BadRequestObjectResult(new { message = "Idempotency key reused with a different request payload." });
            return;
        }

        if (state == IdempotencyResultState.Processing)
        {
            context.Result = new ConflictObjectResult(new { message = "A transaction with this idempotency key is currently processing. Please try again shortly." });
            return;
        }

        if (state == IdempotencyResultState.Completed && existingRecord != null)
        {
            context.Result = new ContentResult
            {
                StatusCode = existingRecord.StatusCode ?? 200,
                Content = existingRecord.ResponseBody ?? string.Empty,
                ContentType = "application/json; charset=utf-8"
            };
            return;
        }

        var executedContext = await next();

        if (executedContext.Result is ObjectResult objectResult && objectResult.StatusCode >= 200 && objectResult.StatusCode < 300)
        {
            var responseJson = JsonSerializer.Serialize(objectResult.Value);
            var statusCode = objectResult.StatusCode ?? 200;
            await idempotencyService.CompleteReservationAsync(
                idempotencyKey,
                statusCode,
                responseJson,
                httpContext.RequestAborted
            );
        }
    }
}
