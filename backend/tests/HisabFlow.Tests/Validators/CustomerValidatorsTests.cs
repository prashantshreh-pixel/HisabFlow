using FluentAssertions;
using HisabFlow.Application.DTOs;
using HisabFlow.Application.Validators;
using HisabFlow.Domain.Enums;
using Xunit;

namespace HisabFlow.Tests.Validators;

public class CustomerValidatorsTests
{
    private readonly CreateCustomerRequestValidator _createValidator = new();
    private readonly RecordTransactionRequestValidator _txValidator = new();

    [Theory]
    [InlineData("", "9841000000", 1000, false)]
    [InlineData("Ram Sharma", "", 1000, false)]
    [InlineData("Ram Sharma", "123", 1000, false)]
    [InlineData("Ram Sharma", "9841000000", -500, false)]
    [InlineData("Ram Sharma", "9841000000", 50000, true)]
    public void CreateCustomerRequestValidator_Should_Validate_Inputs(string name, string phone, decimal creditLimit, bool expectedIsValid)
    {
        // Arrange
        var request = new CreateCustomerRequest(name, phone, "Kathmandu", creditLimit);

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().Be(expectedIsValid);
    }

    [Fact]
    public void RecordTransactionRequestValidator_Should_Fail_When_Amount_Is_Zero_Or_Negative()
    {
        // Arrange
        var invalidRequest = new RecordTransactionRequest(Guid.NewGuid(), TransactionType.Debit, 0, PaymentMethod.Cash, "Note", null, null);

        // Act
        var result = _txValidator.Validate(invalidRequest);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "Amount");
    }

    [Fact]
    public void RecordTransactionRequestValidator_Should_Pass_When_Valid()
    {
        // Arrange
        var validRequest = new RecordTransactionRequest(Guid.NewGuid(), TransactionType.Debit, 1500.50m, PaymentMethod.Cash, "Payment", "BILL-101", DateTime.UtcNow);

        // Act
        var result = _txValidator.Validate(validRequest);

        // Assert
        result.IsValid.Should().BeTrue();
    }
}
