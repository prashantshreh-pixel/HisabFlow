using HisabFlow.Application.Abstractions.Repositories;
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

    /// <summary>
    /// Initializes a new instance of the ProductsController.
    /// </summary>
    /// <param name="productRepo">The product data repository.</param>
    /// <param name="env">The web host environment for static file paths.</param>
    public ProductsController(IProductRepository productRepo, IWebHostEnvironment env)
    {
        _productRepo = productRepo;
        _env = env;
    }

    /// <summary>
    /// Retrieves all active products in the store inventory.
    /// </summary>
    /// <returns>A list of active product items.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Product>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var products = await _productRepo.GetAllAsync();
        return Ok(products);
    }

    /// <summary>
    /// Retrieves a single product by its unique Identifier.
    /// </summary>
    /// <param name="id">The Guid or string identifier of the product.</param>
    /// <returns>The product object if found; otherwise 404 Not Found.</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id)
    {
        if (!Guid.TryParse(id, out var guidId))
        {
            return NotFound(new { message = $"Invalid product ID format '{id}'." });
        }

        var product = await _productRepo.GetByIdAsync(guidId);
        if (product == null)
        {
            return NotFound(new { message = $"Product with ID '{id}' was not found." });
        }
        return Ok(product);
    }

    /// <summary>
    /// Creates a new inventory product in the database.
    /// </summary>
    /// <param name="product">The product details to create.</param>
    /// <returns>The created product object with assigned Guid.</returns>
    [HttpPost]
    [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] Product product)
    {
        if (string.IsNullOrWhiteSpace(product.Name))
        {
            return BadRequest(new { message = "Product name is required." });
        }

        var created = await _productRepo.CreateAsync(product);
        return Ok(created);
    }

    /// <summary>
    /// Uploads a product image file to the backend server wwwroot/uploads directory.
    /// </summary>
    /// <param name="file">The uploaded image file.</param>
    /// <returns>The relative public URL path to the saved image file.</returns>
    [HttpPost("upload-image")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadImage(IFormFile file)
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
            await file.CopyToAsync(stream);
        }

        var relativeUrl = $"/uploads/products/{uniqueFileName}";
        return Ok(new { imageUrl = relativeUrl });
    }

    /// <summary>
    /// Updates an existing product's pricing, category, stock alerts, or image URL.
    /// </summary>
    /// <param name="id">The product identifier to update.</param>
    /// <param name="product">The updated product details.</param>
    /// <returns>200 OK if successful; otherwise 400 Bad Request or 404 Not Found.</returns>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(string id, [FromBody] Product product)
    {
        if (!Guid.TryParse(id, out var guidId))
        {
            return NotFound(new { message = $"Invalid product ID format '{id}'." });
        }

        product.Id = guidId;
        var success = await _productRepo.UpdateAsync(product);
        if (!success)
        {
            return NotFound(new { message = $"Product with ID '{id}' was not found." });
        }
        return Ok(new { message = "Product updated successfully." });
    }

    /// <summary>
    /// Adjusts the stock quantity of a product (+ to add stock, - for sales/adjustments).
    /// </summary>
    /// <param name="id">The product identifier.</param>
    /// <param name="payload">The quantity change payload.</param>
    /// <returns>200 OK with success status.</returns>
    [HttpPost("{id}/adjust-stock")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AdjustStock(string id, [FromBody] StockAdjustmentPayload payload)
    {
        if (!Guid.TryParse(id, out var guidId))
        {
            return NotFound(new { message = $"Invalid product ID format '{id}'." });
        }

        var success = await _productRepo.AdjustStockAsync(guidId, payload.QuantityChange);
        if (!success)
        {
            return NotFound(new { message = $"Product with ID '{id}' was not found." });
        }
        return Ok(new { message = "Stock quantity adjusted successfully." });
    }

    /// <summary>
    /// Soft deletes a product from the inventory catalogue.
    /// </summary>
    /// <param name="id">The product identifier to delete.</param>
    /// <returns>200 OK if successful.</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id)
    {
        if (!Guid.TryParse(id, out var guidId))
        {
            return NotFound(new { message = $"Invalid product ID format '{id}'." });
        }

        var success = await _productRepo.DeleteAsync(guidId);
        if (!success)
        {
            return NotFound(new { message = $"Product with ID '{id}' was not found." });
        }
        return Ok(new { message = "Product removed from inventory." });
    }
}

/// <summary>
/// Stock adjustment request payload.
/// </summary>
public class StockAdjustmentPayload
{
    /// <summary>
    /// Positive quantity to add stock, negative to reduce stock.
    /// </summary>
    public decimal QuantityChange { get; set; }
}
