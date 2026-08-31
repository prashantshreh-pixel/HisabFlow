using System.Net;
using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Middleware;

public class GlobalExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;

    public GlobalExceptionHandlingMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred during request execution: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/problem+json";

        int statusCode;
        ProblemDetails problemDetails;

        switch (exception)
        {
            case ValidationException valEx:
                statusCode = (int)HttpStatusCode.BadRequest;
                var errors = valEx.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.ErrorMessage).ToArray()
                    );

                problemDetails = new ValidationProblemDetails(errors)
                {
                    Status = statusCode,
                    Title = "One or more validation errors occurred.",
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                    Detail = "Please refer to the errors property for additional details.",
                    Instance = context.Request.Path
                };
                break;

            case KeyNotFoundException knfEx:
                statusCode = (int)HttpStatusCode.NotFound;
                problemDetails = new ProblemDetails
                {
                    Status = statusCode,
                    Title = "Resource Not Found",
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4",
                    Detail = knfEx.Message,
                    Instance = context.Request.Path
                };
                break;

            case InvalidOperationException invEx:
                statusCode = (int)HttpStatusCode.BadRequest;
                problemDetails = new ProblemDetails
                {
                    Status = statusCode,
                    Title = "Invalid Operation",
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                    Detail = invEx.Message,
                    Instance = context.Request.Path
                };
                break;

            case ArgumentException argEx:
                statusCode = (int)HttpStatusCode.BadRequest;
                problemDetails = new ProblemDetails
                {
                    Status = statusCode,
                    Title = "Bad Request",
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                    Detail = argEx.Message,
                    Instance = context.Request.Path
                };
                break;

            default:
                statusCode = (int)HttpStatusCode.InternalServerError;
                problemDetails = new ProblemDetails
                {
                    Status = statusCode,
                    Title = "An unexpected server error occurred.",
                    Type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
                    Detail = exception.Message,
                    Instance = context.Request.Path
                };
                break;
        }

        context.Response.StatusCode = statusCode;
        var json = JsonSerializer.Serialize(problemDetails, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });

        await context.Response.WriteAsync(json);
    }
}
