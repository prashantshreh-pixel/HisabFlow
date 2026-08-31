using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.DTOs;
using HisabFlow.Domain.Entities;
using HisabFlow.Infrastructure.Data;
using HisabFlow.Infrastructure.Repositories;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace HisabFlow.Tests.Integration;

public class DatabaseIntegrationTests
{
    private static SqlDbConnectionFactory CreateTestFactory()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=(localdb)\\mssqllocaldb;Database=HisabFlow_TestDb;Trusted_Connection=True;MultipleActiveResultSets=true;Encrypt=False"
            })
            .Build();

        return new SqlDbConnectionFactory(config, NullLogger<SqlDbConnectionFactory>.Instance);
    }

    private static bool TryConnectSqlServer(SqlDbConnectionFactory factory)
    {
        try
        {
            using var conn = factory.CreateConnection();
            return true;
        }
        catch
        {
            return false;
        }
    }

    [Fact]
    public async Task EnsureTablesCreatedAsync_AppliesAllVersionedMigrations()
    {
        var factory = CreateTestFactory();
        if (!TryConnectSqlServer(factory))
        {
            // LocalDB / SQL Server not available in this test runner environment (e.g. GitHub Actions Linux CI runner)
            return;
        }

        await factory.EnsureTablesCreatedAsync();

        using var conn = factory.CreateConnection();
        var tables = (await Dapper.SqlMapper.QueryAsync<string>(conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")).ToList();

        Assert.Contains("customers", tables);
        Assert.Contains("products", tables);
        Assert.Contains("sales", tables);
        Assert.Contains("sale_items", tables);
        Assert.Contains("expenses", tables);
        Assert.Contains("suppliers", tables);
        Assert.Contains("__DbMigrationsHistory", tables);
        Assert.Contains("__IdempotencyKeys", tables);
        Assert.Contains("audit_logs", tables);
        Assert.Contains("stock_movements", tables);
        Assert.Contains("cash_drawers", tables);
    }

    [Fact]
    public async Task SaleRefund_RestoresInventoryStock_AndAdjustsCustomerBalance()
    {
        var factory = CreateTestFactory();
        if (!TryConnectSqlServer(factory))
        {
            // LocalDB / SQL Server not available in this test runner environment (e.g. GitHub Actions Linux CI runner)
            return;
        }

        await factory.EnsureTablesCreatedAsync();

        var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var auditRepo = new AuditRepository(factory);
        var reportRepo = new CachedReportRepository(new ReportRepository(factory), memoryCache);
        var productRepo = new ProductRepository(factory, auditRepo, reportRepo);
        var customerRepo = new CustomerRepository(factory, auditRepo, reportRepo);
        var saleRepo = new SaleRepository(factory, reportRepo, auditRepo);

        // 1. Create test product
        var product = await productRepo.CreateAsync(new Product
        {
            Name = "Test Refund Item",
            Category = "General",
            Unit = "Pcs",
            CostPrice = 10,
            SellingPrice = 20,
            StockQuantity = 50,
            MinStockAlert = 5
        });

        // 2. Create test customer
        var customer = await customerRepo.CreateCustomerAsync(new CreateCustomerRequest(
            Name: "Test Customer",
            Phone: "9800000000",
            Address: "Ktm",
            CreditLimit: 5000,
            InitialBalance: 0,
            InitialNote: null
        ));

        // 3. Create sale of 5 items using 50 Cash and 50 Credit
        var sale = await saleRepo.CreateSaleAsync(new CreateSaleRequest(
            CustomerId: customer.Id,
            CustomerName: customer.Name,
            CustomerPhone: customer.Phone,
            Subtotal: 100,
            DiscountAmount: 0,
            TaxAmount: 0,
            TotalAmount: 100,
            PaidAmount: 50,
            ChangeAmount: 0,
            PaymentMethod: 1, // Cash
            CashPaid: 50,
            DigitalPaid: 0,
            CreditPaid: 50,
            Notes: "Test Sale For Refund",
            SaleDate: DateTime.UtcNow,
            Items: new List<CreateSaleItemRequest>
            {
                new CreateSaleItemRequest(
                    ProductId: product.Id,
                    ProductName: product.Name,
                    Unit: product.Unit,
                    UnitPrice: 20,
                    CostPrice: 10,
                    Quantity: 5,
                    Subtotal: 100
                )
            }
        ));

        // Verify stock decreased to 45
        var stockAfterSale = (await productRepo.GetByIdAsync(product.Id))!.StockQuantity;
        Assert.Equal(45, stockAfterSale);

        // 4. Perform Refund
        var refundedSale = await saleRepo.RefundSaleAsync(sale.Id, "Defective product return");

        Assert.True(refundedSale.IsRefunded);
        Assert.NotNull(refundedSale.RefundedAt);
        Assert.Contains("[REFUNDED]", refundedSale.Notes);

        // Verify duplicate refund attempt throws InvalidOperationException
        await Assert.ThrowsAsync<InvalidOperationException>(() => saleRepo.RefundSaleAsync(sale.Id, "Duplicate refund attempt"));

        // Verify stock restored to 50
        var stockAfterRefund = (await productRepo.GetByIdAsync(product.Id))!.StockQuantity;
        Assert.Equal(50, stockAfterRefund);

        // Verify customer credit balance returned to 0
        var custAfterRefund = (await customerRepo.GetCustomerByIdAsync(customer.Id))!.CurrentBalance;
        Assert.Equal(0, custAfterRefund);
    }
}
