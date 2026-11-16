using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using HisabFlow.Api.Authentication;
using HisabFlow.Api.Converters;
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

// Add HTTP Client Factory for Barcode Catalog Lookup
builder.Services.AddHttpClient("ProductCatalog", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.Add("User-Agent", "HisabFlow/1.0 (Inventory-App)");
});

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
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableUtcDateTimeJsonConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Clean Architecture Layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure();

// Configure CORS with strict origin validation (configured origins + local/LAN POS terminals)
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ??
[
    "http://localhost:3000",
    "http://localhost:5000",
    "https://localhost:5001",
    "https://hisabflow.app"
];
var allowedOriginsSet = new HashSet<string>(configuredOrigins, StringComparer.OrdinalIgnoreCase);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
              {
                  if (string.IsNullOrWhiteSpace(origin)) return false;
                  if (allowedOriginsSet.Contains(origin)) return true;
                  if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
                  if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return false;

                  var host = uri.Host;
                  if (string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
                      || host == "127.0.0.1"
                      || host == "::1")
                  {
                      return true;
                  }

                  // Allow RFC1918 private LAN origins for local network POS tablet/scanner access
                  if (System.Net.IPAddress.TryParse(host, out var ip) && ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                  {
                      var bytes = ip.GetAddressBytes();
                      if (bytes[0] == 10) return true;
                      if (bytes[0] == 192 && bytes[1] == 168) return true;
                      if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
                  }

                  return false;
              })
              .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
              .WithHeaders(
                  "Content-Type",
                  "Authorization",
                  "Accept",
                  "X-Requested-With",
                  "X-User-Role",
                  "X-User-Name",
                  "X-User-Id",
                  "X-Signature");
    });
});

var app = builder.Build();

// Enable Global Exception Handling
app.UseExceptionHandler();

// Global HTTP Security Headers & Exposed File Protection Middleware
var blockedExtensions = new[] { ".env", ".bak", ".sql", ".config", ".pdb", ".key", ".pem" };
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers.Remove("Server");
    headers.Remove("X-Powered-By");
    headers.TryAdd("X-Content-Type-Options", "nosniff");
    headers.TryAdd("X-Frame-Options", "SAMEORIGIN");
    headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.TryAdd("X-Permitted-Cross-Domain-Policies", "none");
    headers.TryAdd("Cross-Origin-Opener-Policy", "same-origin");
    headers.TryAdd("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
    headers.TryAdd(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' http://localhost:* https://localhost:* https://world.openfoodfacts.org https://api.upcitemdb.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");

    if (!app.Environment.IsDevelopment())
    {
        headers.TryAdd("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    var reqPath = context.Request.Path.Value ?? string.Empty;
    if (reqPath.StartsWith("/.", StringComparison.OrdinalIgnoreCase)
        || reqPath.StartsWith("/appsettings", StringComparison.OrdinalIgnoreCase)
        || blockedExtensions.Any(ext => reqPath.EndsWith(ext, StringComparison.OrdinalIgnoreCase)))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
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

// Ensure wwwroot and uploads directories exist
var rootDir = app.Environment.WebRootPath;
if (string.IsNullOrEmpty(rootDir))
{
    rootDir = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
}
var uploadsFolder = Path.Combine(rootDir, "uploads", "products");
if (!Directory.Exists(uploadsFolder))
{
    Directory.CreateDirectory(uploadsFolder);
}

// 1. Enable default files (index.html)
app.UseDefaultFiles();

// 2. Enable static files from wwwroot with no-cache headers on HTML files and caching on uploads
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
        else if (ctx.Context.Request.Path.StartsWithSegments("/uploads", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers.TryAdd("Cache-Control", "public, max-age=2592000, immutable");
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
