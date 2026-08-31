using FluentAssertions;
using HisabFlow.Application.DTOs;
using HisabFlow.Application.Validators;
using HisabFlow.Domain.Enums;
using Xunit;

namespace HisabFlow.Tests.Validators;

public class SupplierValidatorsTests
{
    private readonly RecordSupplierTransactionRequestValidator _validator = new();

    [Fact]
    public void RecordSupplierTransactionRequestValidator_Should_Fail_When_SupplierId_Is_Empty()
    {
        // Arrange
        var request = new RecordSupplierTransactionRequest(
            Guid.Empty, 1, 5000m, PaymentMethod.Cash, "Stock Purchase", "INV-1001", DateTime.UtcNow
        );

        // Act
        var result = _validator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "SupplierId" && e.ErrorMessage == "Supplier ID is required.");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-500)]
    [InlineData(-0.01)]
    public void RecordSupplierTransactionRequestValidator_Should_Fail_When_Amount_Is_Not_Positive(decimal amount)
    {
        // Arrange
        var request = new RecordSupplierTransactionRequest(
            Guid.NewGuid(), 1, amount, PaymentMethod.Cash, "Wholesale Payment", null, DateTime.UtcNow
        );

        // Act
        var result = _validator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "Amount" && e.ErrorMessage == "Transaction amount must be greater than zero.");
    }

    [Fact]
    public void RecordSupplierTransactionRequestValidator_Should_Pass_When_Valid()
    {
        // Arrange
        var request = new RecordSupplierTransactionRequest(
            Guid.NewGuid(), 1, 12500m, PaymentMethod.Cash, "Wholesale Purchase Batch #44", "INV-890", DateTime.UtcNow
        );

        // Act
        var result = _validator.Validate(request);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }
}
