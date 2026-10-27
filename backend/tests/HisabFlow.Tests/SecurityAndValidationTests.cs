using System.Security.Claims;
using FluentAssertions;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.DTOs;
using HisabFlow.Application.Validators;
using HisabFlow.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace HisabFlow.Tests;

public class SecurityAndValidationTests
{
    [Fact]
    public void PasswordHasher_ShouldHashAndVerifyCorrectPassword()
    {
        var hash1 = PasswordHasher.HashPassword("StrongSecret!123");
        var hash2 = PasswordHasher.HashPassword("StrongSecret!123");

        hash1.Should().StartWith("PBKDF2-SHA256$100000$");
        hash1.Should().NotBe(hash2, "each hash should use a unique cryptographic random salt");

        PasswordHasher.VerifyPassword("StrongSecret!123", hash1).Should().BeTrue();
        PasswordHasher.VerifyPassword("WrongPassword", hash1).Should().BeFalse();
        PasswordHasher.VerifyPassword("StrongSecret!123", "MalformedHash").Should().BeFalse();
        PasswordHasher.VerifyPassword("", hash1).Should().BeFalse();
    }

    [Fact]
    public void AuthService_ShouldIssueAndValidateSignedJwtToken_AndRejectTamperedToken()
    {
        var dbFactoryMock = new Mock<IDbConnectionFactory>();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "UnitTest_HMAC_SHA256_Signing_Secret_Key_2026_32BytesMin!"
            })
            .Build();

        var authService = new AuthService(
            dbFactoryMock.Object,
            config,
            NullLogger<AuthService>.Instance);

        var token = authService.GenerateToken("usr_admin", "admin", "Store Owner", "ADMIN", DateTime.UtcNow);
        token.Should().NotBeNullOrWhiteSpace();

        var principal = authService.ValidateToken(token);
        principal.Should().NotBeNull();
        principal!.FindFirst("sub")?.Value.Should().Be("usr_admin");
        principal.FindFirst(ClaimTypes.Name)?.Value.Should().Be("admin");
        principal.FindFirst(ClaimTypes.Role)?.Value.Should().Be("ADMIN");

        // Tamper with the signature
        var parts = token.Split('.');
        var tamperedToken = $"{parts[0]}.{parts[1]}.tamperedSignature";
        authService.ValidateToken(tamperedToken).Should().BeNull();
    }

    [Theory]
    [InlineData("", "admin", false)]
    [InlineData("admin", "", false)]
    [InlineData("admin", "admin", true)]
    public void LoginRequestValidator_ShouldValidateCredentials(string username, string password, bool expectedValid)
    {
        var validator = new LoginRequestValidator();
        var result = validator.Validate(new LoginRequest(username, password));
        result.IsValid.Should().Be(expectedValid);
    }

    [Fact]
    public void CreateProductRequestValidator_ShouldRejectNegativePricesAndEmptyFields()
    {
        var validator = new CreateProductRequestValidator();

        var invalid = new CreateProductRequest("", "", "", -10m, -5m, -1, -1, null, null);
        validator.Validate(invalid).IsValid.Should().BeFalse();

        var valid = new CreateProductRequest("Basmati Rice 20kg", "Grains", "Sack", 2200m, 2500m, 15, 5, "890123456", null);
        validator.Validate(valid).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(2_000_000, false)]
    [InlineData(10, true)]
    [InlineData(-5, true)]
    public void StockAdjustmentPayloadValidator_ShouldEnforceNonZeroBoundedDelta(decimal delta, bool expectedValid)
    {
        var validator = new StockAdjustmentPayloadValidator();
        var result = validator.Validate(new StockAdjustmentPayload { QuantityChange = delta, Notes = "Manual count" });
        result.IsValid.Should().Be(expectedValid);
    }

    [Fact]
    public void CashDrawerValidators_ShouldValidateShiftRequests()
    {
        var openValidator = new OpenCashDrawerShiftRequestValidator();
        openValidator.Validate(new OpenCashDrawerShiftRequest(-100m)).IsValid.Should().BeFalse();
        openValidator.Validate(new OpenCashDrawerShiftRequest(5000m)).IsValid.Should().BeTrue();

        var closeValidator = new CloseCashDrawerShiftRequestValidator();
        closeValidator.Validate(new CloseCashDrawerShiftRequest(-1m)).IsValid.Should().BeFalse();
        closeValidator.Validate(new CloseCashDrawerShiftRequest(12500m)).IsValid.Should().BeTrue();
    }

    [Fact]
    public void RefundSaleApiRequestValidator_ShouldEnforceReasonMaxLength()
    {
        var validator = new RefundSaleApiRequestValidator();
        validator.Validate(new RefundSaleApiRequest(new string('A', 501))).IsValid.Should().BeFalse();
        validator.Validate(new RefundSaleApiRequest("Damaged packaging returned by customer")).IsValid.Should().BeTrue();
    }
}
