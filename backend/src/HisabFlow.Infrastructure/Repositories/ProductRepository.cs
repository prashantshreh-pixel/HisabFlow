using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using HisabFlow.Domain.Entities;
using Microsoft.Data.SqlClient;
using System.Text.Json;

namespace HisabFlow.Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly IAuditRepository _auditRepo;
    private readonly IReportRepository _reportRepo;

    public ProductRepository(IDbConnectionFactory db, IAuditRepository auditRepo, IReportRepository reportRepo)
    {
        _db = db;
        _auditRepo = auditRepo;
        _reportRepo = reportRepo;
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

        await _auditRepo.LogAsync(new CreateAuditLogRequest(
            "Product",
            product.Id.ToString(),
            "CREATE",
            JsonSerializer.Serialize(new { product.Name, product.SellingPrice, product.StockQuantity }),
            "System"
        ), cancellationToken);

        _reportRepo.InvalidateCache();
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

        if (rows > 0)
        {
            await _auditRepo.LogAsync(new CreateAuditLogRequest(
                "Product",
                product.Id.ToString(),
                "UPDATE",
                JsonSerializer.Serialize(new { product.Name, product.SellingPrice, product.StockQuantity }),
                "System"
            ), cancellationToken);

            _reportRepo.InvalidateCache();
        }

        return rows > 0;
    }

    public async Task<bool> AdjustStockAsync(Guid id, decimal quantityChange, string? notes = null, CancellationToken cancellationToken = default)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync(cancellationToken);
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            const string lockSql = @"
                SELECT name AS Name, stock_quantity AS StockQuantity
                FROM products WITH (UPDLOCK, ROWLOCK)
                WHERE id = @Id AND is_active = 1;";

            var product = await conn.QuerySingleOrDefaultAsync<dynamic>(new CommandDefinition(lockSql, new { Id = id }, tx, cancellationToken: cancellationToken));
            if (product == null)
            {
                return false;
            }

            decimal currentStock = (decimal)product.StockQuantity;
            string productName = (string)product.Name;
            decimal newStock = currentStock + quantityChange;

            if (newStock < 0)
            {
                throw new InvalidOperationException($"Stock adjustment of {quantityChange} would result in negative stock for product '{productName}'. Current stock: {currentStock}.");
            }

            const string updateSql = @"
                UPDATE products SET
                    stock_quantity = @NewStock,
                    updated_at = SYSUTCDATETIME()
                WHERE id = @Id AND is_active = 1;";

            await conn.ExecuteAsync(new CommandDefinition(updateSql, new { Id = id, NewStock = newStock }, tx, cancellationToken: cancellationToken));

            var now = DateTime.UtcNow;
            const string insertMovementSql = @"
                INSERT INTO stock_movements (id, product_id, movement_type, quantity_change, stock_after, reference_id, notes, created_at)
                VALUES (@Id, @ProductId, @MovementType, @QuantityChange, @StockAfter, @ReferenceId, @Notes, @CreatedAt);";

            await conn.ExecuteAsync(new CommandDefinition(insertMovementSql, new
            {
                Id = Guid.NewGuid(),
                ProductId = id,
                MovementType = quantityChange >= 0 ? "MANUAL_ADD" : "MANUAL_DEDUCT",
                QuantityChange = quantityChange,
                StockAfter = newStock,
                ReferenceId = (string?)null,
                Notes = notes ?? "Manual stock adjustment",
                CreatedAt = now
            }, tx, cancellationToken: cancellationToken));

            await tx.CommitAsync(cancellationToken);

            await _auditRepo.LogAsync(new CreateAuditLogRequest(
                "Product",
                id.ToString(),
                "ADJUST_STOCK",
                JsonSerializer.Serialize(new { ProductName = productName, QuantityChange = quantityChange, StockAfter = newStock, Notes = notes }),
                "System"
            ), cancellationToken);

            _reportRepo.InvalidateCache();
            return true;
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
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
        if (rows > 0)
        {
            await _auditRepo.LogAsync(new CreateAuditLogRequest(
                "Product",
                id.ToString(),
                "DELETE",
                "Product soft-deleted from inventory.",
                "System"
            ), cancellationToken);

            _reportRepo.InvalidateCache();
        }

        return rows > 0;
    }
}
