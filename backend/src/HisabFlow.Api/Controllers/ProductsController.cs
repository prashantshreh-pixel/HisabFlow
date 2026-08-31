using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using HisabFlow.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Manages store inventory products, stock levels, categories, pricing, stock movement ledgers, and image uploads.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductRepository _productRepo;
    private readonly IStockMovementRepository _stockMovementRepo;
    private readonly IWebHostEnvironment _env;

    private const long MaxImageFileSizeBytes = 5 * 1024 * 1024; // 5 MB ceiling

    public ProductsController(IProductRepository productRepo, IStockMovementRepository stockMovementRepo, IWebHostEnvironment env)
    {
        _productRepo = productRepo;
        _stockMovementRepo = stockMovementRepo;
        _env = env;
    }

    private static ProductDto MapToDto(Product p) => new(
        p.Id,
        p.Name,
        p.Category,
        p.Unit,
        p.CostPrice,
        p.SellingPrice,
        p.StockQuantity,
        p.MinStockAlert,
        p.Barcode,
        p.ImageUrl,
        p.IsActive,
        p.CreatedAt,
        p.UpdatedAt
    );

    /// <summary>
    /// Retrieves active products with optional pagination and category/search filtering.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll(
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
            var pagedDtos = new PagedResult<ProductDto>(
                pagedResult.Items.Select(MapToDto).ToList(),
                pagedResult.Page,
                pagedResult.PageSize,
                pagedResult.TotalCount,
                pagedResult.TotalPages
            );
            return Ok(pagedDtos);
        }

        var products = await _productRepo.GetAllAsync(cancellationToken);
        return Ok(products.Select(MapToDto));
    }

    /// <summary>
    /// Retrieves paginated product catalogue entries.
    /// </summary>
    [HttpGet("paged")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ProductDto>>> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var pagedResult = await _productRepo.GetPagedAsync(page, pageSize, category, search, cancellationToken);
        var pagedDtos = new PagedResult<ProductDto>(
            pagedResult.Items.Select(MapToDto).ToList(),
            pagedResult.Page,
            pagedResult.PageSize,
            pagedResult.TotalCount,
            pagedResult.TotalPages
        );
        return Ok(pagedDtos);
    }

    /// <summary>
    /// Retrieves a single product by its unique Identifier.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> GetById(string id, CancellationToken cancellationToken = default)
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
        return Ok(MapToDto(product));
    }

    /// <summary>
    /// Retrieves stock movement audit trail ledger entries for a product.
    /// </summary>
    [HttpGet("{id:guid}/stock-movements")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<StockMovementDto>>> GetStockMovements(Guid id, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var movements = await _stockMovementRepo.GetMovementsByProductAsync(id, limit, cancellationToken);
        return Ok(movements);
    }

    /// <summary>
    /// Creates a new inventory product in the database.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductRequest request, CancellationToken cancellationToken = default)
    {
        var productEntity = new Product
        {
            Name = request.Name,
            Category = request.Category,
            Unit = request.Unit,
            CostPrice = request.CostPrice,
            SellingPrice = request.SellingPrice,
            StockQuantity = request.StockQuantity,
            MinStockAlert = request.MinStockAlert,
            Barcode = request.Barcode,
            ImageUrl = request.ImageUrl,
        };

        var created = await _productRepo.CreateAsync(productEntity, cancellationToken);
        return Ok(MapToDto(created));
    }

    /// <summary>
    /// Uploads a product image file with strict size ceiling (5MB) and MIME type validation.
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

        if (file.Length > MaxImageFileSizeBytes)
        {
            return BadRequest(new { message = $"File size exceeds maximum allowed limit of {MaxImageFileSizeBytes / (1024 * 1024)}MB." });
        }

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(ext))
        {
            return BadRequest(new { message = "Invalid image file format. Supported: JPG, PNG, WEBP, GIF." });
        }

        var allowedContentTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedContentTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return BadRequest(new { message = "Invalid file MIME content type." });
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
        [FromBody] UpdateProductRequest request,
        [FromQuery] DateTime? expectedUpdatedAt = null,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(id, out var guidId))
        {
            return NotFound(new { message = $"Invalid product ID format '{id}'." });
        }

        var productEntity = new Product
        {
            Id = guidId,
            Name = request.Name,
            Category = request.Category,
            Unit = request.Unit,
            CostPrice = request.CostPrice,
            SellingPrice = request.SellingPrice,
            StockQuantity = request.StockQuantity,
            MinStockAlert = request.MinStockAlert,
            Barcode = request.Barcode,
            ImageUrl = request.ImageUrl,
        };

        var success = await _productRepo.UpdateAsync(productEntity, expectedUpdatedAt, cancellationToken);
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

        var success = await _productRepo.AdjustStockAsync(guidId, payload.QuantityChange, payload.Notes ?? "Manual stock adjustment", cancellationToken);
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
    public string? Notes { get; set; }
}
