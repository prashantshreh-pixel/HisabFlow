using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Infrastructure.Data;
using HisabFlow.Infrastructure.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace HisabFlow.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IDbConnectionFactory, SqlDbConnectionFactory>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IExpenseRepository, ExpenseRepository>();
        services.AddScoped<ISupplierRepository, SupplierRepository>();
        services.AddScoped<IReportRepository, ReportRepository>();
        services.AddScoped<ISaleRepository, SaleRepository>();
        return services;
    }
}
