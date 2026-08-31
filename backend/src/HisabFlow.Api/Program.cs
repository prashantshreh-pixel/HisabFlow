using System.Text.Json.Serialization;
using HisabFlow.Api.Filters;
using HisabFlow.Api.Middleware;
using HisabFlow.Application;
using HisabFlow.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add ProblemDetails support
builder.Services.AddProblemDetails();

// Add Health Checks
builder.Services.AddHealthChecks();

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

// Configure CORS for standalone frontend development
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

// Enable Global Exception Handling Middleware
app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

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

// Map Health Checks
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready");

// 1. Enable default files (index.html)
app.UseDefaultFiles();

// 2. Enable static files from wwwroot with no-cache on HTML files
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        if (ctx.File.Name.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
            ctx.Context.Response.Headers.Append("Pragma", "no-cache");
            ctx.Context.Response.Headers.Append("Expires", "0");
        }
    }
});

app.UseAuthorization();

// 3. Map API Controller routes first (/api/v1/...)
app.MapControllers();

// 4. Fallback to index.html for SPA client-side routes
app.MapFallbackToFile("index.html", new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
        ctx.Context.Response.Headers.Append("Pragma", "no-cache");
        ctx.Context.Response.Headers.Append("Expires", "0");
    }
});

app.Run();
