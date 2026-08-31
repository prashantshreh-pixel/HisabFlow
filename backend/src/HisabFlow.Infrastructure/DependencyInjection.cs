using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Infrastructure.Data;
using HisabFlow.Infrastructure.Repositories;
using HisabFlow.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HisabFlow.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddSingleton<IDbConnectionFactory, SqlDbConnectionFactory>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IExpenseRepository, ExpenseRepository>();
        services.AddScoped<ISupplierRepository, SupplierRepository>();
        services.AddScoped<ReportRepository>();
        services.AddScoped<IReportRepository>(sp => new CachedReportRepository(
            sp.GetRequiredService<ReportRepository>(),
            sp.GetRequiredService<Microsoft.Extensions.Caching.Memory.IMemoryCache>()
        ));
        services.AddScoped<ISaleRepository, SaleRepository>();
        services.AddScoped<IIdempotencyService, IdempotencyService>();
        services.AddScoped<IAuditRepository, AuditRepository>();
        services.AddScoped<IStockMovementRepository, StockMovementRepository>();
        services.AddScoped<ICashDrawerRepository, CashDrawerRepository>();
        services.AddScoped<IBackupService, BackupService>();
        return services;
    }
}
