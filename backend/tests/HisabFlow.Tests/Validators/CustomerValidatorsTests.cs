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
    [InlineData("", "9841000000", 1000, false, "Customer name is required.")]
    [InlineData("   ", "9841000000", 1000, false, "Customer name is required.")]
    [InlineData("Ram Sharma", "", 1000, false, "Phone number is required.")]
    [InlineData("Ram Sharma", "123", 1000, false, "Invalid phone number format.")]
    [InlineData("Ram Sharma", "INVALID-PHONE-NUMBER-FORMAT-EXCEEDS", 1000, false, "Invalid phone number format.")]
    [InlineData("Ram Sharma", "9841000000", -500, false, "Credit limit cannot be negative.")]
    [InlineData("Ram Sharma", "9841000000", 50000, true, "")]
    [InlineData("Hari Thapa", "+977-9801234567", 0, true, "")]
    public void CreateCustomerRequestValidator_Should_Validate_Inputs(
        string name, string phone, decimal creditLimit, bool expectedIsValid, string expectedError)
    {
        // Arrange
        var request = new CreateCustomerRequest(name, phone, "Kathmandu", creditLimit);

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().Be(expectedIsValid);
        if (!expectedIsValid && !string.IsNullOrEmpty(expectedError))
        {
            result.Errors.Should().Contain(e => e.ErrorMessage == expectedError);
        }
    }

    [Fact]
    public void CreateCustomerRequestValidator_Should_Fail_When_Name_Exceeds_100_Characters()
    {
        // Arrange
        var longName = new string('A', 101);
        var request = new CreateCustomerRequest(longName, "9841000000", "Kathmandu", 5000);

        // Act
        var result = _createValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "Name" && e.ErrorMessage == "Customer name cannot exceed 100 characters.");
    }

    [Fact]
    public void RecordTransactionRequestValidator_Should_Fail_When_CustomerId_Is_Empty()
    {
        // Arrange
        var request = new RecordTransactionRequest(Guid.Empty, TransactionType.Debit, 500m, PaymentMethod.Cash, "Payment", null, null);

        // Act
        var result = _txValidator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "CustomerId" && e.ErrorMessage == "Customer ID is required.");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    [InlineData(-0.01)]
    public void RecordTransactionRequestValidator_Should_Fail_When_Amount_Is_Not_Positive(decimal amount)
    {
        // Arrange
        var invalidRequest = new RecordTransactionRequest(Guid.NewGuid(), TransactionType.Debit, amount, PaymentMethod.Cash, "Note", null, null);

        // Act
        var result = _txValidator.Validate(invalidRequest);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "Amount" && e.ErrorMessage == "Amount must be greater than zero.");
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
        result.Errors.Should().BeEmpty();
    }
}
