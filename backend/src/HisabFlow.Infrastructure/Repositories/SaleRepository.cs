using System.Data;
using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using Microsoft.Data.SqlClient;

namespace HisabFlow.Infrastructure.Repositories;

public class SaleRepository : ISaleRepository
{
    private readonly IDbConnectionFactory _db;

    private readonly record struct CustomerLockRecord(string Name, string Phone, decimal CurrentBalance);

    public SaleRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<SaleDto> CreateSaleAsync(CreateSaleRequest request, CancellationToken cancellationToken = default)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync(cancellationToken);
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            var saleId = Guid.NewGuid();
            var now = DateTime.UtcNow;
            var saleDate = request.SaleDate ?? now;

            string datePrefix = saleDate.ToString("yyMMdd");
            string randomSuffix = Random.Shared.Next(1000, 9999).ToString();
            string invoiceNumber = $"INV-{datePrefix}-{randomSuffix}";

            const string insertSaleSql = @"
                INSERT INTO sales (
                    id, invoice_number, customer_id, customer_name, customer_phone,
                    subtotal, discount_amount, tax_amount, total_amount, paid_amount, change_amount,
                    payment_method, cash_paid, digital_paid, credit_paid, notes, sale_date, created_at
                )
                VALUES (
                    @Id, @InvoiceNumber, @CustomerId, @CustomerName, @CustomerPhone,
                    @Subtotal, @DiscountAmount, @TaxAmount, @TotalAmount, @PaidAmount, @ChangeAmount,
                    @PaymentMethod, @CashPaid, @DigitalPaid, @CreditPaid, @Notes, @SaleDate, @CreatedAt
                );";

            await conn.ExecuteAsync(new CommandDefinition(insertSaleSql, new
            {
                Id = saleId,
                InvoiceNumber = invoiceNumber,
                request.CustomerId,
                request.CustomerName,
                request.CustomerPhone,
                request.Subtotal,
                request.DiscountAmount,
                request.TaxAmount,
                request.TotalAmount,
                request.PaidAmount,
                request.ChangeAmount,
                request.PaymentMethod,
                request.CashPaid,
                request.DigitalPaid,
                request.CreditPaid,
                request.Notes,
                SaleDate = saleDate,
                CreatedAt = now
            }, tx, cancellationToken: cancellationToken));

            var itemDtos = new List<SaleItemDto>();
            var insertItemParams = new List<object>();
            var deductStockParams = new List<object>();

            foreach (var item in request.Items)
            {
                var itemId = Guid.NewGuid();
                insertItemParams.Add(new
                {
                    Id = itemId,
                    SaleId = saleId,
                    item.ProductId,
                    item.ProductName,
                    item.Unit,
                    item.UnitPrice,
                    item.CostPrice,
                    item.Quantity,
                    item.Subtotal,
                    CreatedAt = now
                });

                deductStockParams.Add(new
                {
                    item.Quantity,
                    UpdatedAt = now,
                    item.ProductId
                });

                itemDtos.Add(new SaleItemDto(
                    itemId, saleId, item.ProductId, item.ProductName, item.Unit,
                    item.UnitPrice, item.CostPrice, item.Quantity, item.Subtotal, now
                ));
            }

            const string insertItemSql = @"
                INSERT INTO sale_items (
                    id, sale_id, product_id, product_name, unit, unit_price, cost_price, quantity, subtotal, created_at
                )
                VALUES (
                    @Id, @SaleId, @ProductId, @ProductName, @Unit, @UnitPrice, @CostPrice, @Quantity, @Subtotal, @CreatedAt
                );";

            const string deductStockSql = @"
                UPDATE products
                SET stock_quantity = stock_quantity - @Quantity,
                    updated_at = @UpdatedAt
                WHERE id = @ProductId;";

            if (insertItemParams.Count > 0)
            {
                await conn.ExecuteAsync(new CommandDefinition(insertItemSql, insertItemParams, tx, cancellationToken: cancellationToken));
                await conn.ExecuteAsync(new CommandDefinition(deductStockSql, deductStockParams, tx, cancellationToken: cancellationToken));
            }

            if (request.CreditPaid > 0 && request.CustomerId.HasValue)
            {
                const string lockCustomerSql = @"
                    SELECT name AS Name, phone AS Phone, current_balance AS CurrentBalance 
                    FROM customers WITH (UPDLOCK, ROWLOCK) 
                    WHERE id = @CustomerId AND is_active = 1;";

                var customer = await conn.QuerySingleOrDefaultAsync<CustomerLockRecord>(new CommandDefinition(lockCustomerSql, new { request.CustomerId }, tx, cancellationToken: cancellationToken));
                if (customer != default)
                {
                    decimal currentBalance = customer.CurrentBalance;
                    decimal newBalance = currentBalance + request.CreditPaid;

                    const string insertLedgerSql = @"
                        INSERT INTO customer_ledger_entries (
                            id, customer_id, type, amount, balance_after, payment_method,
                            particulars, bill_number, transaction_date, created_at
                        )
                        VALUES (
                            @Id, @CustomerId, 1, @Amount, @BalanceAfter, 2,
                            @Particulars, @BillNumber, @TransactionDate, @CreatedAt
                        );";

                    await conn.ExecuteAsync(new CommandDefinition(insertLedgerSql, new
                    {
                        Id = Guid.NewGuid(),
                        request.CustomerId,
                        Amount = request.CreditPaid,
                        BalanceAfter = newBalance,
                        Particulars = $"POS Sale - {invoiceNumber}",
                        BillNumber = invoiceNumber,
                        TransactionDate = saleDate,
                        CreatedAt = now
                    }, tx, cancellationToken: cancellationToken));

                    const string updateCustomerBalanceSql = @"
                        UPDATE customers
                        SET current_balance = @NewBalance, updated_at = @UpdatedAt
                        WHERE id = @CustomerId AND is_active = 1;";

                    await conn.ExecuteAsync(new CommandDefinition(updateCustomerBalanceSql, new
                    {
                        NewBalance = newBalance,
                        UpdatedAt = now,
                        request.CustomerId
                    }, tx, cancellationToken: cancellationToken));
                }
            }

            await tx.CommitAsync(cancellationToken);

            return new SaleDto(
                saleId, invoiceNumber, request.CustomerId, request.CustomerName, request.CustomerPhone,
                request.Subtotal, request.DiscountAmount, request.TaxAmount, request.TotalAmount,
                request.PaidAmount, request.ChangeAmount, request.PaymentMethod,
                request.CashPaid, request.DigitalPaid, request.CreditPaid, request.Notes,
                saleDate, now, itemDtos
            );
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<PagedResult<SaleDto>> GetPagedSalesAsync(int page = 1, int pageSize = 20, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        using var conn = await _db.CreateConnectionAsync(cancellationToken);

        const string sql = @"
            SELECT COUNT(1) FROM sales;

            SELECT 
                id AS Id,
                invoice_number AS InvoiceNumber,
                customer_id AS CustomerId,
                customer_name AS CustomerName,
                customer_phone AS CustomerPhone,
                subtotal AS Subtotal,
                discount_amount AS DiscountAmount,
                tax_amount AS TaxAmount,
                total_amount AS TotalAmount,
                paid_amount AS PaidAmount,
                change_amount AS ChangeAmount,
                payment_method AS PaymentMethod,
                cash_paid AS CashPaid,
                digital_paid AS DigitalPaid,
                credit_paid AS CreditPaid,
                notes AS Notes,
                sale_date AS SaleDate,
                created_at AS CreatedAt
            FROM sales
            ORDER BY sale_date DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        using var multi = await conn.QueryMultipleAsync(new CommandDefinition(sql, new { Offset = offset, PageSize = pageSize }, cancellationToken: cancellationToken));
        var totalCount = await multi.ReadSingleAsync<int>();
        var sales = (await multi.ReadAsync<SaleHeaderRecord>()).ToList();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        if (!sales.Any())
        {
            return new PagedResult<SaleDto>(new List<SaleDto>(), page, pageSize, totalCount, totalPages);
        }

        var saleIds = sales.Select(s => s.Id).ToList();

        const string itemsSql = @"
            SELECT 
                id AS Id,
                sale_id AS SaleId,
                product_id AS ProductId,
                product_name AS ProductName,
                unit AS Unit,
                unit_price AS UnitPrice,
                cost_price AS CostPrice,
                quantity AS Quantity,
                subtotal AS Subtotal,
                created_at AS CreatedAt
            FROM sale_items
            WHERE sale_id IN @SaleIds;";

        var items = (await conn.QueryAsync<SaleItemDto>(new CommandDefinition(itemsSql, new { SaleIds = saleIds }, cancellationToken: cancellationToken))).ToList();
        var itemsBySale = items.GroupBy(i => i.SaleId).ToDictionary(g => g.Key, g => (IReadOnlyList<SaleItemDto>)g.ToList());

        var itemsList = sales.Select(s => new SaleDto(
            s.Id,
            s.InvoiceNumber,
            s.CustomerId,
            s.CustomerName,
            s.CustomerPhone,
            s.Subtotal,
            s.DiscountAmount,
            s.TaxAmount,
            s.TotalAmount,
            s.PaidAmount,
            s.ChangeAmount,
            s.PaymentMethod,
            s.CashPaid,
            s.DigitalPaid,
            s.CreditPaid,
            s.Notes,
            s.SaleDate,
            s.CreatedAt,
            itemsBySale.GetValueOrDefault(s.Id, new List<SaleItemDto>())
        )).ToList();

        return new PagedResult<SaleDto>(itemsList, page, pageSize, totalCount, totalPages);
    }

    private class SaleHeaderRecord
    {
        public Guid Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public Guid? CustomerId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal ChangeAmount { get; set; }
        public int PaymentMethod { get; set; }
        public decimal CashPaid { get; set; }
        public decimal DigitalPaid { get; set; }
        public decimal CreditPaid { get; set; }
        public string? Notes { get; set; }
        public DateTime SaleDate { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public async Task<IReadOnlyList<SaleDto>> GetRecentSalesAsync(int count = 50, CancellationToken cancellationToken = default)
    {
        count = Math.Clamp(count, 1, 100);

        using var conn = await _db.CreateConnectionAsync(cancellationToken);

        const string salesSql = @"
            SELECT TOP (@Count)
                id AS Id,
                invoice_number AS InvoiceNumber,
                customer_id AS CustomerId,
                customer_name AS CustomerName,
                customer_phone AS CustomerPhone,
                subtotal AS Subtotal,
                discount_amount AS DiscountAmount,
                tax_amount AS TaxAmount,
                total_amount AS TotalAmount,
                paid_amount AS PaidAmount,
                change_amount AS ChangeAmount,
                payment_method AS PaymentMethod,
                cash_paid AS CashPaid,
                digital_paid AS DigitalPaid,
                credit_paid AS CreditPaid,
                notes AS Notes,
                sale_date AS SaleDate,
                created_at AS CreatedAt
            FROM sales
            ORDER BY sale_date DESC;";

        var sales = (await conn.QueryAsync<SaleHeaderRecord>(new CommandDefinition(salesSql, new { Count = count }, cancellationToken: cancellationToken))).ToList();
        if (!sales.Any()) return new List<SaleDto>();

        var saleIds = sales.Select(s => s.Id).ToList();

        const string itemsSql = @"
            SELECT 
                id AS Id,
                sale_id AS SaleId,
                product_id AS ProductId,
                product_name AS ProductName,
                unit AS Unit,
                unit_price AS UnitPrice,
                cost_price AS CostPrice,
                quantity AS Quantity,
                subtotal AS Subtotal,
                created_at AS CreatedAt
            FROM sale_items
            WHERE sale_id IN @SaleIds;";

        var items = (await conn.QueryAsync<SaleItemDto>(new CommandDefinition(itemsSql, new { SaleIds = saleIds }, cancellationToken: cancellationToken))).ToList();
        var itemsBySale = items.GroupBy(i => i.SaleId).ToDictionary(g => g.Key, g => (IReadOnlyList<SaleItemDto>)g.ToList());

        return sales.Select(s => new SaleDto(
            s.Id,
            s.InvoiceNumber,
            s.CustomerId,
            s.CustomerName,
            s.CustomerPhone,
            s.Subtotal,
            s.DiscountAmount,
            s.TaxAmount,
            s.TotalAmount,
            s.PaidAmount,
            s.ChangeAmount,
            s.PaymentMethod,
            s.CashPaid,
            s.DigitalPaid,
            s.CreditPaid,
            s.Notes,
            s.SaleDate,
            s.CreatedAt,
            itemsBySale.GetValueOrDefault(s.Id, new List<SaleItemDto>())
        )).ToList();
    }

    public async Task<SaleDto?> GetSaleByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);

        const string saleSql = @"
            SELECT 
                id AS Id,
                invoice_number AS InvoiceNumber,
                customer_id AS CustomerId,
                customer_name AS CustomerName,
                customer_phone AS CustomerPhone,
                subtotal AS Subtotal,
                discount_amount AS DiscountAmount,
                tax_amount AS TaxAmount,
                total_amount AS TotalAmount,
                paid_amount AS PaidAmount,
                change_amount AS ChangeAmount,
                payment_method AS PaymentMethod,
                cash_paid AS CashPaid,
                digital_paid AS DigitalPaid,
                credit_paid AS CreditPaid,
                notes AS Notes,
                sale_date AS SaleDate,
                created_at AS CreatedAt
            FROM sales
            WHERE id = @Id;";

        var s = await conn.QuerySingleOrDefaultAsync<SaleHeaderRecord>(new CommandDefinition(saleSql, new { Id = id }, cancellationToken: cancellationToken));
        if (s == null) return null;

        const string itemsSql = @"
            SELECT 
                id AS Id,
                sale_id AS SaleId,
                product_id AS ProductId,
                product_name AS ProductName,
                unit AS Unit,
                unit_price AS UnitPrice,
                cost_price AS CostPrice,
                quantity AS Quantity,
                subtotal AS Subtotal,
                created_at AS CreatedAt
            FROM sale_items
            WHERE sale_id = @SaleId;";

        var items = (await conn.QueryAsync<SaleItemDto>(new CommandDefinition(itemsSql, new { SaleId = id }, cancellationToken: cancellationToken))).ToList();

        return new SaleDto(
            s.Id,
            s.InvoiceNumber,
            s.CustomerId,
            s.CustomerName,
            s.CustomerPhone,
            s.Subtotal,
            s.DiscountAmount,
            s.TaxAmount,
            s.TotalAmount,
            s.PaidAmount,
            s.ChangeAmount,
            s.PaymentMethod,
            s.CashPaid,
            s.DigitalPaid,
            s.CreditPaid,
            s.Notes,
            s.SaleDate,
            s.CreatedAt,
            items
        );
    }

    public async Task<SaleDto?> GetSaleByInvoiceNumberAsync(string invoiceNumber, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);

        const string saleSql = @"
            SELECT 
                id AS Id,
                invoice_number AS InvoiceNumber,
                customer_id AS CustomerId,
                customer_name AS CustomerName,
                customer_phone AS CustomerPhone,
                subtotal AS Subtotal,
                discount_amount AS DiscountAmount,
                tax_amount AS TaxAmount,
                total_amount AS TotalAmount,
                paid_amount AS PaidAmount,
                change_amount AS ChangeAmount,
                payment_method AS PaymentMethod,
                cash_paid AS CashPaid,
                digital_paid AS DigitalPaid,
                credit_paid AS CreditPaid,
                notes AS Notes,
                sale_date AS SaleDate,
                created_at AS CreatedAt
            FROM sales
            WHERE invoice_number = @InvoiceNumber;";

        var s = await conn.QuerySingleOrDefaultAsync<SaleHeaderRecord>(new CommandDefinition(saleSql, new { InvoiceNumber = invoiceNumber }, cancellationToken: cancellationToken));
        if (s == null) return null;

        const string itemsSql = @"
            SELECT 
                id AS Id,
                sale_id AS SaleId,
                product_id AS ProductId,
                product_name AS ProductName,
                unit AS Unit,
                unit_price AS UnitPrice,
                cost_price AS CostPrice,
                quantity AS Quantity,
                subtotal AS Subtotal,
                created_at AS CreatedAt
            FROM sale_items
            WHERE sale_id = @SaleId;";

        var items = (await conn.QueryAsync<SaleItemDto>(new CommandDefinition(itemsSql, new { SaleId = s.Id }, cancellationToken: cancellationToken))).ToList();

        return new SaleDto(
            s.Id,
            s.InvoiceNumber,
            s.CustomerId,
            s.CustomerName,
            s.CustomerPhone,
            s.Subtotal,
            s.DiscountAmount,
            s.TaxAmount,
            s.TotalAmount,
            s.PaidAmount,
            s.ChangeAmount,
            s.PaymentMethod,
            s.CashPaid,
            s.DigitalPaid,
            s.CreditPaid,
            s.Notes,
            s.SaleDate,
            s.CreatedAt,
            items
        );
    }

    public async Task<SalesSummaryDto> GetSalesSummaryAsync(DateTime? date = null, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        var targetDate = date ?? DateTime.UtcNow;
        var startOfDay = new DateTime(targetDate.Year, targetDate.Month, targetDate.Day, 0, 0, 0, DateTimeKind.Utc);
        var endOfDay = new DateTime(targetDate.Year, targetDate.Month, targetDate.Day, 23, 59, 59, DateTimeKind.Utc);

        const string summarySql = @"
            SELECT 
                COALESCE(SUM(total_amount), 0) AS TotalSalesAmount,
                COUNT(*) AS TotalBillsCount,
                COALESCE(SUM(cash_paid), 0) AS CashSalesAmount,
                COALESCE(SUM(digital_paid), 0) AS DigitalSalesAmount,
                COALESCE(SUM(credit_paid), 0) AS CreditSalesAmount
            FROM sales
            WHERE sale_date >= @StartOfDay AND sale_date <= @EndOfDay;";

        var summary = await conn.QueryFirstOrDefaultAsync<dynamic>(new CommandDefinition(summarySql, new { StartOfDay = startOfDay, EndOfDay = endOfDay }, cancellationToken: cancellationToken));

        const string itemsCountSql = @"
            SELECT COALESCE(SUM(si.quantity), 0)
            FROM sale_items si
            INNER JOIN sales s ON si.sale_id = s.id
            WHERE s.sale_date >= @StartOfDay AND s.sale_date <= @EndOfDay;";

        int totalItemsSold = (int)(await conn.ExecuteScalarAsync<decimal?>(new CommandDefinition(itemsCountSql, new { StartOfDay = startOfDay, EndOfDay = endOfDay }, cancellationToken: cancellationToken)) ?? 0);

        return new SalesSummaryDto(
            targetDate,
            summary?.TotalSalesAmount != null ? (decimal)summary.TotalSalesAmount : 0,
            summary?.TotalBillsCount != null ? (int)summary.TotalBillsCount : 0,
            summary?.CashSalesAmount != null ? (decimal)summary.CashSalesAmount : 0,
            summary?.DigitalSalesAmount != null ? (decimal)summary.DigitalSalesAmount : 0,
            summary?.CreditSalesAmount != null ? (decimal)summary.CreditSalesAmount : 0,
            totalItemsSold
        );
    }
}
