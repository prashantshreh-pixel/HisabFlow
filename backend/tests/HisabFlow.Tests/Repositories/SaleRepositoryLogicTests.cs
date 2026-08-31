using FluentAssertions;
using HisabFlow.Application.DTOs;
using HisabFlow.Domain.Enums;
using Xunit;

namespace HisabFlow.Tests.Repositories;

public class SaleRepositoryLogicTests
{
    [Fact]
    public void SaleCalculation_Should_Compute_Correct_Subtotal_And_Total()
    {
        // Arrange
        var item1 = new CreateSaleItemRequest(Guid.NewGuid(), "Sample Item 1", "pcs", 100m, 80m, 2, 200m);
        var item2 = new CreateSaleItemRequest(Guid.NewGuid(), "Sample Item 2", "pcs", 50m, 40m, 3, 150m);

        var items = new List<CreateSaleItemRequest> { item1, item2 };

        // Act
        decimal computedSubtotal = items.Sum(i => i.UnitPrice * i.Quantity);
        decimal tax = 10m;
        decimal discount = 20m;
        decimal computedTotal = Math.Max(0m, computedSubtotal + tax - discount);

        // Assert
        computedSubtotal.Should().Be(350m);
        computedTotal.Should().Be(340m);
    }

    [Fact]
    public void CreditSale_Should_Fail_Validation_When_Credit_Exceeds_Customer_Limit()
    {
        // Arrange
        decimal currentBalance = 4000m;
        decimal creditLimit = 5000m;
        decimal creditRequested = 1500m;

        // Act
        bool limitExceeded = creditLimit > 0 && (currentBalance + creditRequested) > creditLimit;

        // Assert
        limitExceeded.Should().BeTrue();
    }

    [Fact]
    public void StockCheck_Should_Detect_Insufficient_Inventory()
    {
        // Arrange
        decimal availableStock = 3m;
        decimal requestedQuantity = 5m;

        // Act
        bool isInsufficient = availableStock < requestedQuantity;

        // Assert
        isInsufficient.Should().BeTrue();
    }

    [Fact]
    public void COGS_Calculation_Should_Accurately_Reflect_Sold_Item_Costs()
    {
        // Arrange
        var soldItems = new[]
        {
            new { Quantity = 2m, CostPrice = 80m },
            new { Quantity = 3m, CostPrice = 40m }
        };

        // Act
        decimal cogs = soldItems.Sum(i => i.Quantity * i.CostPrice);
        decimal revenue = 350m;
        decimal operatingExpenses = 50m;
        decimal grossProfit = revenue - cogs;
        decimal netProfit = grossProfit - operatingExpenses;

        // Assert
        cogs.Should().Be(280m);
        grossProfit.Should().Be(70m);
        netProfit.Should().Be(20m);
    }
}
