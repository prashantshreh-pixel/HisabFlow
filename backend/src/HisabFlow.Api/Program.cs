using HisabFlow.Application;
using HisabFlow.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Clean Architecture Layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure();

// Configure CORS for Next.js Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

// Serve the Single Page Application (SPA)
app.UseSpa(spa =>
{
    // The path to Next.js root directory containing package.json
    spa.Options.SourcePath = "../../../";

    if (app.Environment.IsDevelopment())
    {
        // Check if Windows
        if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
        {
            var startInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c npm run dev",
                WorkingDirectory = "../../../",
                UseShellExecute = true,
                CreateNoWindow = false
            };
            System.Diagnostics.Process.Start(startInfo);
        }
        else
        {
            var startInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "npm",
                Arguments = "run dev",
                WorkingDirectory = "../../../",
                UseShellExecute = false,
                CreateNoWindow = true
            };
            System.Diagnostics.Process.Start(startInfo);
        }

        // Proxy all SPA requests to Next.js dev server
        spa.UseProxyToSpaDevelopmentServer("http://localhost:3000");
    }
});

app.Run();
