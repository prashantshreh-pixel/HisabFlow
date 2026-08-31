using FluentAssertions;
using HisabFlow.Application.DTOs;
using HisabFlow.Application.Validators;
using Xunit;

namespace HisabFlow.Tests.Validators;

public class SaleValidatorsTests
{
    private readonly CreateSaleRequestValidator _validator = new();

    [Fact]
    public void CreateSaleRequestValidator_Should_Fail_When_Items_List_Is_Empty()
    {
        // Arrange
        var request = new CreateSaleRequest(
            null, null, null,
            0m, 0m, 0m, 0m, 0m, 0m,
            1, 0m, 0m, 0m, "No items", DateTime.UtcNow,
            new List<CreateSaleItemRequest>()
        );

        // Act
        var result = _validator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "Items" && e.ErrorMessage == "Sale must contain at least one item.");
    }

    [Fact]
    public void CreateSaleRequestValidator_Should_Fail_When_TotalAmount_Is_Negative()
    {
        // Arrange
        var items = new List<CreateSaleItemRequest>
        {
            new(Guid.NewGuid(), "Rice 25kg", "bag", 2500m, 2200m, 1, 2500m)
        };

        var request = new CreateSaleRequest(
            null, null, null,
            2500m, 0m, 0m, -500m, 2500m, 0m,
            1, 2500m, 0m, 0m, null, DateTime.UtcNow,
            items
        );

        // Act
        var result = _validator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "TotalAmount" && e.ErrorMessage == "Total amount cannot be negative.");
    }

    [Fact]
    public void CreateSaleRequestValidator_Should_Pass_When_Valid()
    {
        // Arrange
        var items = new List<CreateSaleItemRequest>
        {
            new(Guid.NewGuid(), "Sunflower Oil 1L", "pkt", 220m, 190m, 2, 440m)
        };

        var request = new CreateSaleRequest(
            Guid.NewGuid(), "Ram Thapa", "9841234567",
            440m, 0m, 0m, 440m, 440m, 0m,
            1, 440m, 0m, 0m, "POS Receipt", DateTime.UtcNow,
            items
        );

        // Act
        var result = _validator.Validate(request);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }
}
