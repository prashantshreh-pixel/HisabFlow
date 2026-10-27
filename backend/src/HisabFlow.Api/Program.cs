using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using HisabFlow.Api.Authentication;
using HisabFlow.Api.Filters;
using HisabFlow.Api.Middleware;
using HisabFlow.Application;
using HisabFlow.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Add ProblemDetails & Global Exception Handler
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Add Health Checks
builder.Services.AddHealthChecks();

// Add Rate Limiting Protection (Generous limit for local POS responsiveness)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5000,
                Window = TimeSpan.FromMinutes(1)
            }));

    options.AddPolicy("AuthPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// Add Authentication & Role-Based Authorization
builder.Services
    .AddAuthentication("Bearer")
    .AddScheme<AuthenticationSchemeOptions, HisabFlowAuthHandler>("Bearer", null);

builder.Services.AddAuthorization();

// Add controllers with AutoValidationFilter and JSON Enum Converter
builder.Services.AddControllers(options =>
    {
        options.Filters.Add<AutoValidationFilter>();
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Clean Architecture Layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure();

// Configure CORS to allow frontend requests
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Enable Global Exception Handling
app.UseExceptionHandler();

// Global HTTP Security Headers Middleware
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers.TryAdd("X-Content-Type-Options", "nosniff");
    headers.TryAdd("X-Frame-Options", "SAMEORIGIN");
    headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.TryAdd("X-Permitted-Cross-Domain-Policies", "none");
    headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (!app.Environment.IsDevelopment())
    {
        headers.TryAdd("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    await next();
});

// Initialize Database Tables ONCE at startup asynchronously
using (var scope = app.Services.CreateScope())
{
    var dbFactory = scope.ServiceProvider.GetRequiredService<HisabFlow.Application.Common.Interfaces.IDbConnectionFactory>();
    if (dbFactory is HisabFlow.Infrastructure.Data.SqlDbConnectionFactory sqlFactory)
    {
        await sqlFactory.EnsureTablesCreatedAsync();
    }
}

// Configure HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseRateLimiter();

// Map Health Checks
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready");

// 1. Enable default files (index.html)
app.UseDefaultFiles();

// 2. Enable static files from wwwroot with no-cache headers on HTML files
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        if (ctx.File.Name.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers.TryAdd("Cache-Control", "no-cache, no-store, must-revalidate");
            ctx.Context.Response.Headers.TryAdd("Pragma", "no-cache");
            ctx.Context.Response.Headers.TryAdd("Expires", "0");
        }
    }
});

app.UseAuthentication();
app.UseAuthorization();

// 3. Map API Controller routes first (/api/v1/...)
app.MapControllers();

// 4. Fallback to index.html for SPA client-side routes
app.MapFallbackToFile("index.html", new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.TryAdd("Cache-Control", "no-cache, no-store, must-revalidate");
        ctx.Context.Response.Headers.TryAdd("Pragma", "no-cache");
        ctx.Context.Response.Headers.TryAdd("Expires", "0");
    }
});

app.Run();
