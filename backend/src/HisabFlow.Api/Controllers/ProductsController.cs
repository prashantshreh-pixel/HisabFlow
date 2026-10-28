using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using HisabFlow.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HisabFlow.Api.Controllers;

/// <summary>
/// Manages store inventory products, stock levels, categories, pricing, stock movement ledgers, and image uploads.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "ADMIN,MANAGER,CASHIER")]
public class ProductsController : ControllerBase
{
    private readonly IProductRepository _productRepo;
    private readonly IStockMovementRepository _stockMovementRepo;
    private readonly IWebHostEnvironment _env;
    private readonly IHttpClientFactory _httpClientFactory;

    private const long MaxImageFileSizeBytes = 5 * 1024 * 1024; // 5 MB ceiling

    public ProductsController(
        IProductRepository productRepo,
        IStockMovementRepository stockMovementRepo,
        IWebHostEnvironment env,
        IHttpClientFactory httpClientFactory)
    {
        _productRepo = productRepo;
        _stockMovementRepo = stockMovementRepo;
        _env = env;
        _httpClientFactory = httpClientFactory;
    }

    private ProductDto MapToDto(Product p)
    {
        var isCashier = User?.IsInRole("CASHIER") == true;
        return new(
            p.Id,
            p.Name,
            p.Category,
            p.Unit,
            isCashier ? 0m : p.CostPrice,
            p.SellingPrice,
            p.StockQuantity,
            p.MinStockAlert,
            p.Barcode,
            p.ImageUrl,
            p.IsActive,
            p.CreatedAt,
            p.UpdatedAt,
            p.Brand,
            p.Description
        );
    }

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
    /// Looks up a product by barcode in local store inventory first; if not found, queries open international catalogs (OpenFoodFacts) to auto-fill metadata.
    /// </summary>
    [HttpGet("lookup-barcode/{barcode}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BarcodeLookupResponse>> LookupBarcode(string barcode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(barcode))
        {
            return BadRequest(new { message = "Barcode cannot be empty." });
        }

        var cleanBarcode = barcode.Trim();

        // 1. Check local store database
        var localProduct = await _productRepo.GetByBarcodeAsync(cleanBarcode, cancellationToken);
        if (localProduct != null)
        {
            return Ok(new BarcodeLookupResponse(
                Found: true,
                Source: "LOCAL_INVENTORY",
                Product: MapToDto(localProduct),
                Data: null,
                Message: $"Product '{localProduct.Name}' is already registered in your inventory."
            ));
        }

        // 2. Query open catalog (OpenFoodFacts)
        try
        {
            var client = _httpClientFactory.CreateClient("ProductCatalog");
            var response = await client.GetAsync($"https://world.openfoodfacts.org/api/v2/product/{Uri.EscapeDataString(cleanBarcode)}.json", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                using var doc = await System.Text.Json.JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                var root = doc.RootElement;
                if (root.TryGetProperty("status", out var statusProp) && statusProp.GetInt32() == 1 && root.TryGetProperty("product", out var prodObj))
                {
                    string name = "";
                    if (prodObj.TryGetProperty("product_name", out var nameProp) && !string.IsNullOrWhiteSpace(nameProp.GetString()))
                        name = nameProp.GetString()!;
                    else if (prodObj.TryGetProperty("product_name_en", out var nameEnProp) && !string.IsNullOrWhiteSpace(nameEnProp.GetString()))
                        name = nameEnProp.GetString()!;

                    string brand = "";
                    if (prodObj.TryGetProperty("brands", out var brandProp) && !string.IsNullOrWhiteSpace(brandProp.GetString()))
                    {
                        brand = brandProp.GetString()!.Split(',')[0].Trim();
                    }

                    string quantity = "";
                    if (prodObj.TryGetProperty("quantity", out var qtyProp) && !string.IsNullOrWhiteSpace(qtyProp.GetString()))
                    {
                        quantity = qtyProp.GetString()!.Trim();
                    }

                    string imageUrl = "";
                    if (prodObj.TryGetProperty("image_front_url", out var imgFront) && !string.IsNullOrWhiteSpace(imgFront.GetString()))
                        imageUrl = imgFront.GetString()!;
                    else if (prodObj.TryGetProperty("image_url", out var imgUrl) && !string.IsNullOrWhiteSpace(imgUrl.GetString()))
                        imageUrl = imgUrl.GetString()!;

                    string categories = "";
                    if (prodObj.TryGetProperty("categories", out var catProp) && !string.IsNullOrWhiteSpace(catProp.GetString()))
                        categories = catProp.GetString()!;

                    string description = "";
                    if (prodObj.TryGetProperty("ingredients_text", out var ingProp) && !string.IsNullOrWhiteSpace(ingProp.GetString()))
                        description = ingProp.GetString()!;

                    // Capitalize / format name cleanly
                    if (!string.IsNullOrWhiteSpace(name))
                    {
                        name = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(name.ToLowerInvariant());
                    }
                    else if (!string.IsNullOrWhiteSpace(brand))
                    {
                        name = $"{brand} Item {quantity}".Trim();
                    }

                    // Map category to standard HisabFlow categories
                    var catLower = (categories + " " + name).ToLowerInvariant();
                    string mappedCategory = "Packaged Foods & Snacks";
                    if (catLower.Contains("rice") || catLower.Contains("grain") || catLower.Contains("wheat") || catLower.Contains("flour") || catLower.Contains("dal") || catLower.Contains("pulse") || catLower.Contains("bean"))
                        mappedCategory = "Grains & Rice";
                    else if (catLower.Contains("oil") || catLower.Contains("ghee") || catLower.Contains("mustard"))
                        mappedCategory = "Oils & Ghee";
                    else if (catLower.Contains("spice") || catLower.Contains("masala") || catLower.Contains("salt") || catLower.Contains("sugar") || catLower.Contains("staple"))
                        mappedCategory = "Staples & Spices";
                    else if (catLower.Contains("milk") || catLower.Contains("cheese") || catLower.Contains("butter") || catLower.Contains("yogurt") || catLower.Contains("paneer") || catLower.Contains("dairy"))
                        mappedCategory = "Dairy";
                    else if (catLower.Contains("beverage") || catLower.Contains("drink") || catLower.Contains("juice") || catLower.Contains("soda") || catLower.Contains("tea") || catLower.Contains("coffee") || catLower.Contains("water"))
                        mappedCategory = "Beverages";
                    else if (catLower.Contains("clean") || catLower.Contains("soap") || catLower.Contains("detergent") || catLower.Contains("shampoo") || catLower.Contains("wash") || catLower.Contains("tissue"))
                        mappedCategory = "Household & Cleaning";

                    var enrichment = new BarcodeEnrichmentData(
                        Name: name,
                        Brand: string.IsNullOrWhiteSpace(brand) ? null : brand,
                        Barcode: cleanBarcode,
                        Category: mappedCategory,
                        Unit: "pcs",
                        ImageUrl: string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl,
                        NetWeight: string.IsNullOrWhiteSpace(quantity) ? null : quantity,
                        Description: string.IsNullOrWhiteSpace(description) ? null : description
                    );

                    return Ok(new BarcodeLookupResponse(
                        Found: true,
                        Source: "OPEN_CATALOG",
                        Product: null,
                        Data: enrichment,
                        Message: "Product recognized from global database."
                    ));
                }
            }
        }
        catch (Exception)
        {
            // If internet lookup fails or times out, proceed to empty state gracefully
        }

        // 3. Fallback: Unrecognized barcode
        return Ok(new BarcodeLookupResponse(
            Found: false,
            Source: "NONE",
            Product: null,
            Data: new BarcodeEnrichmentData(
                Name: null,
                Brand: null,
                Barcode: cleanBarcode,
                Category: "Packaged Foods & Snacks",
                Unit: "pcs",
                ImageUrl: null,
                NetWeight: null,
                Description: null
            ),
            Message: "Barcode scanned. Enter product details to save."
        ));
    }

    /// <summary>
    /// Retrieves stock movement audit trail ledger entries for a product.
    /// </summary>
    [HttpGet("{id:guid}/stock-movements")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<StockMovementDto>>> GetStockMovements(Guid id, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var cappedLimit = Math.Clamp(limit, 1, 200);
        var movements = await _stockMovementRepo.GetMovementsByProductAsync(id, cappedLimit, cancellationToken);
        return Ok(movements);
    }

    /// <summary>
    /// Creates a new inventory product in the database.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "ADMIN,MANAGER")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductRequest request, CancellationToken cancellationToken = default)
    {
        var productEntity = new Product
        {
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Unit = request.Unit.Trim(),
            CostPrice = request.CostPrice,
            SellingPrice = request.SellingPrice,
            StockQuantity = request.StockQuantity,
            MinStockAlert = request.MinStockAlert,
            Barcode = request.Barcode?.Trim(),
            ImageUrl = request.ImageUrl?.Trim(),
            Brand = request.Brand?.Trim(),
            Description = request.Description?.Trim(),
        };

        var created = await _productRepo.CreateAsync(productEntity, cancellationToken);
        return Ok(MapToDto(created));
    }

    /// <summary>
    /// Uploads a product image file with strict size ceiling (5MB), MIME type check, and binary magic-byte verification.
    /// </summary>
    [HttpPost("upload-image")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    [RequestSizeLimit(MaxImageFileSizeBytes)]
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

        await using var inputStream = file.OpenReadStream();
        if (!await IsValidImageSignatureAsync(inputStream, ext, cancellationToken))
        {
            return BadRequest(new { message = "File binary header signature does not match a valid image file." });
        }

        inputStream.Position = 0;

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

        await using (var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await inputStream.CopyToAsync(fileStream, cancellationToken);
        }

        var relativeUrl = $"/uploads/products/{uniqueFileName}";
        return Ok(new { imageUrl = relativeUrl });
    }

    private static async Task<bool> IsValidImageSignatureAsync(Stream stream, string ext, CancellationToken cancellationToken)
    {
        var header = new byte[12];
        var bytesRead = await stream.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);
        if (bytesRead < 4) return false;

        return ext switch
        {
            ".jpg" or ".jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            ".png" => bytesRead >= 8 &&
                      header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                      header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
            ".gif" => bytesRead >= 6 &&
                      header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38 &&
                      (header[4] == 0x37 || header[4] == 0x39) && header[5] == 0x61,
            ".webp" => bytesRead >= 12 &&
                       header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                       header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
            _ => false
        };
    }

    /// <summary>
    /// Updates an existing product's pricing, category, stock alerts, or image URL with optimistic concurrency control.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
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
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Unit = request.Unit.Trim(),
            CostPrice = request.CostPrice,
            SellingPrice = request.SellingPrice,
            StockQuantity = request.StockQuantity,
            MinStockAlert = request.MinStockAlert,
            Barcode = request.Barcode?.Trim(),
            ImageUrl = request.ImageUrl?.Trim(),
            Brand = request.Brand?.Trim(),
            Description = request.Description?.Trim(),
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
    [Authorize(Roles = "ADMIN,MANAGER")]
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
    [Authorize(Roles = "ADMIN,MANAGER")]
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
