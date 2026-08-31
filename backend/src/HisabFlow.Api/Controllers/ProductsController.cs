using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Models;
using HisabFlow.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Manages store inventory products, stock levels, categories, pricing, and image uploads.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductRepository _productRepo;
    private readonly IWebHostEnvironment _env;

    public ProductsController(IProductRepository productRepo, IWebHostEnvironment env)
    {
        _productRepo = productRepo;
        _env = env;
    }

    /// <summary>
    /// Retrieves active products with optional pagination and category/search filtering.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll(
        [FromQuery] bool paged = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        if (paged)
        {
            var pagedResult = await _productRepo.GetPagedAsync(page, pageSize, category, search, cancellationToken);
            return Ok(pagedResult);
        }

        var products = await _productRepo.GetAllAsync(cancellationToken);
        return Ok(products);
    }

    /// <summary>
    /// Retrieves paginated product catalogue entries.
    /// </summary>
    [HttpGet("paged")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<Product>>> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var pagedResult = await _productRepo.GetPagedAsync(page, pageSize, category, search, cancellationToken);
        return Ok(pagedResult);
    }

    /// <summary>
    /// Retrieves a single product by its unique Identifier.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Product>> GetById(string id, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(id, out var guidId))
        {
            return NotFound(new { message = $"Invalid product ID format '{id}'." });
        }

        var product = await _productRepo.GetByIdAsync(guidId, cancellationToken);
        if (product == null)
        {
            return NotFound(new { message = $"Product with ID '{id}' was not found." });
        }
        return Ok(product);
    }

    /// <summary>
    /// Creates a new inventory product in the database.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Product>> Create([FromBody] Product product, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(product.Name))
        {
            return BadRequest(new { message = "Product name is required." });
        }

        var created = await _productRepo.CreateAsync(product, cancellationToken);
        return Ok(created);
    }

    /// <summary>
    /// Uploads a product image file to the backend server wwwroot/uploads directory.
    /// </summary>
    [HttpPost("upload-image")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<object>> UploadImage(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No image file provided." });
        }

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(ext))
        {
            return BadRequest(new { message = "Invalid image file format. Supported: JPG, PNG, WEBP, GIF." });
        }

        var webRoot = _env.WebRootPath;
        if (string.IsNullOrEmpty(webRoot))
        {
            webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        var uploadsFolder = Path.Combine(webRoot, "uploads", "products");
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var uniqueFileName = $"prod_{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var relativeUrl = $"/uploads/products/{uniqueFileName}";
        return Ok(new { imageUrl = relativeUrl });
    }

    /// <summary>
    /// Updates an existing product's pricing, category, stock alerts, or image URL with optimistic concurrency control.
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> Update(
        string id,
        [FromBody] Product product,
        [FromQuery] DateTime? expectedUpdatedAt = null,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(id, out var guidId))
        {
            return NotFound(new { message = $"Invalid product ID format '{id}'." });
        }

        product.Id = guidId;
        var success = await _productRepo.UpdateAsync(product, expectedUpdatedAt, cancellationToken);
        if (!success)
        {
            return NotFound(new { message = $"Product with ID '{id}' was not found or was modified by another user." });
        }
        return Ok(new { message = "Product updated successfully." });
    }

    /// <summary>
    /// Adjusts the stock quantity of a product (+ to add stock, - for sales/adjustments).
    /// </summary>
    [HttpPost("{id}/adjust-stock")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> AdjustStock(string id, [FromBody] StockAdjustmentPayload payload, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(id, out var guidId))
        {
            return NotFound(new { message = $"Invalid product ID format '{id}'." });
        }

        var success = await _productRepo.AdjustStockAsync(guidId, payload.QuantityChange, cancellationToken);
        if (!success)
        {
            return NotFound(new { message = $"Product with ID '{id}' was not found." });
        }
        return Ok(new { message = "Stock quantity adjusted successfully." });
    }

    /// <summary>
    /// Soft deletes a product from the inventory catalogue.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<object>> Delete(string id, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(id, out var guidId))
        {
            return NotFound(new { message = $"Invalid product ID format '{id}'." });
        }

        var success = await _productRepo.DeleteAsync(guidId, cancellationToken);
        if (!success)
        {
            return NotFound(new { message = $"Product with ID '{id}' was not found." });
        }
        return Ok(new { message = "Product removed from inventory." });
    }
}

public class StockAdjustmentPayload
{
    public decimal QuantityChange { get; set; }
}
