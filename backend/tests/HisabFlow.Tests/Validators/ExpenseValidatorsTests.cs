using FluentAssertions;
using HisabFlow.Application.DTOs;
using HisabFlow.Application.Validators;
using Xunit;

namespace HisabFlow.Tests.Validators;

public class ExpenseValidatorsTests
{
    private readonly CreateExpenseRequestValidator _validator = new();

    [Theory]
    [InlineData("", 500, false, "Expense title is required.")]
    [InlineData("   ", 500, false, "Expense title is required.")]
    [InlineData("Rent", 0, false, "Valid positive expense amount is required.")]
    [InlineData("Electricity Bill", -150, false, "Valid positive expense amount is required.")]
    [InlineData("Shop Rent", 25000, true, "")]
    [InlineData("Tea Snacks", 150.50, true, "")]
    public void CreateExpenseRequestValidator_Should_Validate_Inputs(
        string title, decimal amount, bool expectedIsValid, string expectedError)
    {
        // Arrange
        var request = new CreateExpenseRequest("Utilities", title, amount, "Cash", "Monthly bill", DateTime.UtcNow);

        // Act
        var result = _validator.Validate(request);

        // Assert
        result.IsValid.Should().Be(expectedIsValid);
        if (!expectedIsValid && !string.IsNullOrEmpty(expectedError))
        {
            result.Errors.Should().Contain(e => e.ErrorMessage == expectedError);
        }
    }

    [Fact]
    public void CreateExpenseRequestValidator_Should_Fail_When_Title_Exceeds_200_Characters()
    {
        // Arrange
        var longTitle = new string('E', 201);
        var request = new CreateExpenseRequest("Utilities", longTitle, 1000m, "Cash", null, DateTime.UtcNow);

        // Act
        var result = _validator.Validate(request);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == "Title" && e.ErrorMessage == "Expense title cannot exceed 200 characters.");
    }
}
