using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Middleware;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment env)
    {
        _logger = logger;
        _env = env;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Unhandled exception occurred: {Message}", exception.Message);

        var (statusCode, title, detail) = exception switch
        {
            InvalidOperationException invalidOp => (
                StatusCodes.Status400BadRequest,
                "Business Validation Error",
                invalidOp.Message
            ),
            ArgumentException argEx => (
                StatusCodes.Status400BadRequest,
                "Invalid Argument",
                argEx.Message
            ),
            KeyNotFoundException notFound => (
                StatusCodes.Status404NotFound,
                "Resource Not Found",
                notFound.Message
            ),
            _ => (
                StatusCodes.Status500InternalServerError,
                "An unexpected server error occurred",
                _env.IsDevelopment() ? exception.ToString() : "Please contact system administrator or check application logs."
            )
        };

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = httpContext.Request.Path
        };

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }
}
