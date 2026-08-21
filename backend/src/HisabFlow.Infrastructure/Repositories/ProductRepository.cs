using System.Data;
using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Domain.Entities;

namespace HisabFlow.Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly IDbConnectionFactory _db;

    public ProductRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<IEnumerable<Product>> GetAllAsync()
    {
        using var conn = await _db.CreateConnectionAsync();
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

        return await conn.QueryAsync<Product>(sql);
    }

    public async Task<Product?> GetByIdAsync(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
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

        return await conn.QuerySingleOrDefaultAsync<Product>(sql, new { Id = id });
    }

    public async Task<Product> CreateAsync(Product product)
    {
        if (product.Id == Guid.Empty)
        {
            product.Id = Guid.NewGuid();
        }
        product.CreatedAt = DateTime.UtcNow;
        product.UpdatedAt = DateTime.UtcNow;

        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            INSERT INTO products (
                id, name, category, unit, cost_price, selling_price,
                stock_quantity, min_stock_alert, barcode, image_url, is_active, created_at, updated_at
            ) VALUES (
                @Id, @Name, @Category, @Unit, @CostPrice, @SellingPrice,
                @StockQuantity, @MinStockAlert, @Barcode, @ImageUrl, @IsActive, @CreatedAt, @UpdatedAt
            );";

        await conn.ExecuteAsync(sql, product);
        return product;
    }

    public async Task<bool> UpdateAsync(Product product)
    {
        product.UpdatedAt = DateTime.UtcNow;
        using var conn = await _db.CreateConnectionAsync();
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
            WHERE id = @Id;";

        var rows = await conn.ExecuteAsync(sql, product);
        return rows > 0;
    }

    public async Task<bool> AdjustStockAsync(Guid id, decimal quantityChange)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            UPDATE products SET
                stock_quantity = stock_quantity + @Change,
                updated_at = SYSUTCDATETIME()
            WHERE id = @Id AND is_active = 1;";

        var rows = await conn.ExecuteAsync(sql, new { Id = id, Change = quantityChange });
        return rows > 0;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();
        const string sql = @"
            UPDATE products SET
                is_active = 0,
                updated_at = SYSUTCDATETIME()
            WHERE id = @Id;";

        var rows = await conn.ExecuteAsync(sql, new { Id = id });
        return rows > 0;
    }
}
