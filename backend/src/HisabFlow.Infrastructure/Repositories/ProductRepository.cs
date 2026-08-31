using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Common.Models;
using HisabFlow.Domain.Entities;

namespace HisabFlow.Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly IDbConnectionFactory _db;

    public ProductRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<PagedResult<Product>> GetPagedAsync(
        int page = 1,
        int pageSize = 20,
        string? category = null,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        using var conn = await _db.CreateConnectionAsync(cancellationToken);

        var whereClause = "WHERE is_active = 1";
        var p = new DynamicParameters();
        p.Add("Offset", offset);
        p.Add("PageSize", pageSize);

        if (!string.IsNullOrWhiteSpace(category))
        {
            whereClause += " AND category = @Category";
            p.Add("Category", category);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            whereClause += " AND (name LIKE @Search OR barcode = @BarcodeSearch)";
            p.Add("Search", $"%{search}%");
            p.Add("BarcodeSearch", search);
        }

        string sql = $@"
            SELECT COUNT(1) FROM products {whereClause};

            SELECT 
                id AS Id,
                name AS Name,
                category AS Category,
                unit AS Unit,
                cost_price AS CostPrice,
                selling_price AS SellingPrice,
                stock_quantity AS StockQuantity,
                min_stock_alert AS MinStockAlert,
                barcode AS Barcode,
                image_url AS ImageUrl,
                is_active AS IsActive,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM products
            {whereClause}
            ORDER BY name ASC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        using var multi = await conn.QueryMultipleAsync(new CommandDefinition(sql, p, cancellationToken: cancellationToken));
        var totalCount = await multi.ReadSingleAsync<int>();
        var items = (await multi.ReadAsync<Product>()).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<Product>(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<IEnumerable<Product>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT 
                id AS Id,
                name AS Name,
                category AS Category,
                unit AS Unit,
                cost_price AS CostPrice,
                selling_price AS SellingPrice,
                stock_quantity AS StockQuantity,
                min_stock_alert AS MinStockAlert,
                barcode AS Barcode,
                image_url AS ImageUrl,
                is_active AS IsActive,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM products
            WHERE is_active = 1
            ORDER BY name ASC;";

        return await conn.QueryAsync<Product>(new CommandDefinition(sql, cancellationToken: cancellationToken));
    }

    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            SELECT 
                id AS Id,
                name AS Name,
                category AS Category,
                unit AS Unit,
                cost_price AS CostPrice,
                selling_price AS SellingPrice,
                stock_quantity AS StockQuantity,
                min_stock_alert AS MinStockAlert,
                barcode AS Barcode,
                image_url AS ImageUrl,
                is_active AS IsActive,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM products
            WHERE id = @Id AND is_active = 1;";

        return await conn.QuerySingleOrDefaultAsync<Product>(new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));
    }

    public async Task<Product> CreateAsync(Product product, CancellationToken cancellationToken = default)
    {
        if (product.Id == Guid.Empty)
        {
            product.Id = Guid.NewGuid();
        }
        product.CreatedAt = DateTime.UtcNow;
        product.UpdatedAt = DateTime.UtcNow;

        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            INSERT INTO products (
                id, name, category, unit, cost_price, selling_price,
                stock_quantity, min_stock_alert, barcode, image_url, is_active, created_at, updated_at
            ) VALUES (
                @Id, @Name, @Category, @Unit, @CostPrice, @SellingPrice,
                @StockQuantity, @MinStockAlert, @Barcode, @ImageUrl, @IsActive, @CreatedAt, @UpdatedAt
            );";

        await conn.ExecuteAsync(new CommandDefinition(sql, product, cancellationToken: cancellationToken));
        return product;
    }

    public async Task<bool> UpdateAsync(Product product, DateTime? expectedUpdatedAt = null, CancellationToken cancellationToken = default)
    {
        product.UpdatedAt = DateTime.UtcNow;
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            UPDATE products SET
                name = @Name,
                category = @Category,
                unit = @Unit,
                cost_price = @CostPrice,
                selling_price = @SellingPrice,
                stock_quantity = @StockQuantity,
                min_stock_alert = @MinStockAlert,
                barcode = @Barcode,
                image_url = @ImageUrl,
                updated_at = @UpdatedAt
            WHERE id = @Id 
              AND is_active = 1
              AND (@ExpectedUpdatedAt IS NULL OR updated_at = @ExpectedUpdatedAt);";

        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            product.Id,
            product.Name,
            product.Category,
            product.Unit,
            product.CostPrice,
            product.SellingPrice,
            product.StockQuantity,
            product.MinStockAlert,
            product.Barcode,
            product.ImageUrl,
            product.UpdatedAt,
            ExpectedUpdatedAt = expectedUpdatedAt
        }, cancellationToken: cancellationToken));

        return rows > 0;
    }

    public async Task<bool> AdjustStockAsync(Guid id, decimal quantityChange, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            UPDATE products SET
                stock_quantity = stock_quantity + @Change,
                updated_at = SYSUTCDATETIME()
            WHERE id = @Id AND is_active = 1;";

        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { Id = id, Change = quantityChange }, cancellationToken: cancellationToken));
        return rows > 0;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        const string sql = @"
            UPDATE products SET
                is_active = 0,
                updated_at = SYSUTCDATETIME()
            WHERE id = @Id AND is_active = 1;";

        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { Id = id }, cancellationToken: cancellationToken));
        return rows > 0;
    }
}
