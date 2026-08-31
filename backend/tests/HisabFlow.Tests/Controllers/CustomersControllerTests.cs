using FluentAssertions;
using HisabFlow.Api.Controllers;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace HisabFlow.Tests.Controllers;

public class CustomersControllerTests
{
    private readonly Mock<ICustomerRepository> _mockRepo;
    private readonly CustomersController _controller;

    public CustomersControllerTests()
    {
        _mockRepo = new Mock<ICustomerRepository>();
        _controller = new CustomersController(_mockRepo.Object);
    }

    [Fact]
    public async Task GetById_Should_Return_Customer_When_Exists()
    {
        // Arrange
        var id = Guid.NewGuid();
        var expectedCustomer = new CustomerDto(id, "Sita Giri", "9800000000", "Pokhara", 10000, 0, true, DateTime.UtcNow, DateTime.UtcNow);
        _mockRepo.Setup(r => r.GetCustomerByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(expectedCustomer);

        // Act
        var result = await _controller.GetById(id, CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var customer = okResult.Value.Should().BeOfType<CustomerDto>().Subject;
        customer.Name.Should().Be("Sita Giri");
    }

    [Fact]
    public async Task GetById_Should_Throw_KeyNotFoundException_When_Not_Found()
    {
        // Arrange
        var id = Guid.NewGuid();
        _mockRepo.Setup(r => r.GetCustomerByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync((CustomerDto?)null);

        // Act
        Func<Task> act = async () => await _controller.GetById(id, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetPaged_Should_Return_PagedResult()
    {
        // Arrange
        var pagedResult = new PagedResult<CustomerDto>(new List<CustomerDto>(), 1, 20, 0, 0);
        _mockRepo.Setup(r => r.GetPagedCustomersAsync(1, 20, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(pagedResult);

        // Act
        var result = await _controller.GetPaged(1, 20, CancellationToken.None);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(pagedResult);
    }
}
