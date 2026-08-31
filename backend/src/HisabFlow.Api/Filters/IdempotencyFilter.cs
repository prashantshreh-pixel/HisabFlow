using System.Text;
using System.Text.Json;
using HisabFlow.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HisabFlow.Api.Filters;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class IdempotentAttribute : Attribute, IAsyncActionFilter
{
    private const string IdempotencyHeaderName = "X-Idempotency-Key";
    private const string AlternateHeaderName = "Idempotency-Key";

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

        var idempotencyService = httpContext.RequestServices.GetRequiredService<IIdempotencyService>();
        var existingRecord = await idempotencyService.GetRecordAsync(idempotencyKey, httpContext.RequestAborted);

        if (existingRecord != null)
        {
            context.Result = new ContentResult
            {
                StatusCode = existingRecord.StatusCode,
                Content = existingRecord.ResponseBody,
                ContentType = "application/json; charset=utf-8"
            };
            return;
        }

        var executedContext = await next();

        if (executedContext.Result is ObjectResult objectResult && objectResult.StatusCode >= 200 && objectResult.StatusCode < 300)
        {
            var responseJson = JsonSerializer.Serialize(objectResult.Value);
            var statusCode = objectResult.StatusCode ?? 200;
            await idempotencyService.SaveRecordAsync(
                idempotencyKey,
                httpContext.Request.Path,
                statusCode,
                responseJson,
                httpContext.RequestAborted
            );
        }
    }
}
