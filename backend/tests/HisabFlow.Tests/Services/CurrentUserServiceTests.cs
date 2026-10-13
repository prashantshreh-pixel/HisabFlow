using System.Security.Claims;
using FluentAssertions;
using HisabFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace HisabFlow.Tests.Services;

public class CurrentUserServiceTests
{
    [Fact]
    public void Properties_Should_Return_Defaults_When_HttpContext_Is_Null()
    {
        var mockAccessor = new Mock<IHttpContextAccessor>();
        mockAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);
        var service = new CurrentUserService(mockAccessor.Object);

        service.UserId.Should().BeNull();
        service.Username.Should().Be("Operator");
        service.Role.Should().Be("Admin");
    }

    [Fact]
    public void Properties_Should_Extract_From_User_Claims_When_Authenticated()
    {
        var mockAccessor = new Mock<IHttpContextAccessor>();
        var context = new DefaultHttpContext();
        var claims = new[]
        {
            new Claim("sub", "user-uuid-123"),
            new Claim(ClaimTypes.Name, "CashierSita"),
            new Claim("role", "Cashier")
        };
        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        mockAccessor.Setup(x => x.HttpContext).Returns(context);

        var service = new CurrentUserService(mockAccessor.Object);

        service.UserId.Should().Be("user-uuid-123");
        service.Username.Should().Be("CashierSita");
        service.Role.Should().Be("Cashier");
    }

    [Fact]
    public void Properties_Should_Extract_From_Request_Headers_When_Claims_Absent()
    {
        var mockAccessor = new Mock<IHttpContextAccessor>();
        var context = new DefaultHttpContext();
        context.Request.Headers["X-User-Id"] = "hdr-uuid-999";
        context.Request.Headers["X-User-Name"] = "ManagerHari";
        context.Request.Headers["X-User-Role"] = "Manager";
        mockAccessor.Setup(x => x.HttpContext).Returns(context);

        var service = new CurrentUserService(mockAccessor.Object);

        service.UserId.Should().Be("hdr-uuid-999");
        service.Username.Should().Be("ManagerHari");
        service.Role.Should().Be("Manager");
    }

    [Fact]
    public void Properties_Should_Fallback_To_Defaults_When_Headers_And_Claims_Empty()
    {
        var mockAccessor = new Mock<IHttpContextAccessor>();
        var context = new DefaultHttpContext();
        mockAccessor.Setup(x => x.HttpContext).Returns(context);

        var service = new CurrentUserService(mockAccessor.Object);

        service.UserId.Should().BeNull();
        service.Username.Should().Be("Operator");
        service.Role.Should().Be("Admin");
    }
}
