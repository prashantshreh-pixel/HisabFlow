using System.Data;
using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Sales.DTOs;
using Microsoft.Data.SqlClient;

namespace HisabFlow.Infrastructure.Repositories;

public class SaleRepository : ISaleRepository
{
    private readonly IDbConnectionFactory _db;

    public SaleRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<SaleDto> CreateSaleAsync(CreateSaleRequest request)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync();
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync();

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

            await conn.ExecuteAsync(insertSaleSql, new
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
            }, tx);

            var itemDtos = new List<SaleItemDto>();

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

            foreach (var item in request.Items)
            {
                var itemId = Guid.NewGuid();
                await conn.ExecuteAsync(insertItemSql, new
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
                }, tx);

                await conn.ExecuteAsync(deductStockSql, new
                {
                    item.Quantity,
                    UpdatedAt = now,
                    item.ProductId
                }, tx);

                itemDtos.Add(new SaleItemDto(
                    itemId, saleId, item.ProductId, item.ProductName, item.Unit,
                    item.UnitPrice, item.CostPrice, item.Quantity, item.Subtotal, now
                ));
            }

            if (request.CreditPaid > 0 && request.CustomerId.HasValue)
            {
                const string lockCustomerSql = @"
                    SELECT name, phone, current_balance AS CurrentBalance 
                    FROM customers WITH (UPDLOCK, ROWLOCK) 
                    WHERE id = @CustomerId;";

                var customer = await conn.QuerySingleOrDefaultAsync<dynamic>(lockCustomerSql, new { request.CustomerId }, tx);
                if (customer != null)
                {
                    decimal currentBalance = (decimal)customer.CurrentBalance;
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

                    await conn.ExecuteAsync(insertLedgerSql, new
                    {
                        Id = Guid.NewGuid(),
                        request.CustomerId,
                        Amount = request.CreditPaid,
                        BalanceAfter = newBalance,
                        Particulars = $"POS Sale - {invoiceNumber}",
                        BillNumber = invoiceNumber,
                        TransactionDate = saleDate,
                        CreatedAt = now
                    }, tx);

                    const string updateCustomerBalanceSql = @"
                        UPDATE customers
                        SET current_balance = @NewBalance, updated_at = @UpdatedAt
                        WHERE id = @CustomerId;";

                    await conn.ExecuteAsync(updateCustomerBalanceSql, new
                    {
                        NewBalance = newBalance,
                        UpdatedAt = now,
                        request.CustomerId
                    }, tx);
                }
            }

            await tx.CommitAsync();

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
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<IReadOnlyList<SaleDto>> GetRecentSalesAsync(int count = 50)
    {
        using var conn = await _db.CreateConnectionAsync();

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

        var sales = (await conn.QueryAsync<dynamic>(salesSql, new { Count = count })).ToList();
        if (!sales.Any()) return new List<SaleDto>();

        var saleIds = sales.Select(s => (Guid)s.Id).ToList();

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

        var items = (await conn.QueryAsync<SaleItemDto>(itemsSql, new { SaleIds = saleIds })).ToList();
        var itemsBySale = items.GroupBy(i => i.SaleId).ToDictionary(g => g.Key, g => (IReadOnlyList<SaleItemDto>)g.ToList());

        return sales.Select(s => new SaleDto(
            (Guid)s.Id,
            (string)s.InvoiceNumber,
            (Guid?)s.CustomerId,
            (string?)s.CustomerName,
            (string?)s.CustomerPhone,
            (decimal)s.Subtotal,
            (decimal)s.DiscountAmount,
            (decimal)s.TaxAmount,
            (decimal)s.TotalAmount,
            (decimal)s.PaidAmount,
            (decimal)s.ChangeAmount,
            (int)s.PaymentMethod,
            (decimal)s.CashPaid,
            (decimal)s.DigitalPaid,
            (decimal)s.CreditPaid,
            (string?)s.Notes,
            (DateTime)s.SaleDate,
            (DateTime)s.CreatedAt,
            itemsBySale.GetValueOrDefault((Guid)s.Id, new List<SaleItemDto>())
        )).ToList();
    }

    public async Task<SaleDto?> GetSaleByIdAsync(Guid id)
    {
        using var conn = await _db.CreateConnectionAsync();

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

        var s = await conn.QuerySingleOrDefaultAsync<dynamic>(saleSql, new { Id = id });
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

        var items = (await conn.QueryAsync<SaleItemDto>(itemsSql, new { SaleId = id })).ToList();

        return new SaleDto(
            (Guid)s.Id,
            (string)s.InvoiceNumber,
            (Guid?)s.CustomerId,
            (string?)s.CustomerName,
            (string?)s.CustomerPhone,
            (decimal)s.Subtotal,
            (decimal)s.DiscountAmount,
            (decimal)s.TaxAmount,
            (decimal)s.TotalAmount,
            (decimal)s.PaidAmount,
            (decimal)s.ChangeAmount,
            (int)s.PaymentMethod,
            (decimal)s.CashPaid,
            (decimal)s.DigitalPaid,
            (decimal)s.CreditPaid,
            (string?)s.Notes,
            (DateTime)s.SaleDate,
            (DateTime)s.CreatedAt,
            items
        );
    }

    public async Task<SaleDto?> GetSaleByInvoiceNumberAsync(string invoiceNumber)
    {
        using var conn = await _db.CreateConnectionAsync();

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

        var s = await conn.QuerySingleOrDefaultAsync<dynamic>(saleSql, new { InvoiceNumber = invoiceNumber });
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

        var items = (await conn.QueryAsync<SaleItemDto>(itemsSql, new { SaleId = (Guid)s.Id })).ToList();

        return new SaleDto(
            (Guid)s.Id,
            (string)s.InvoiceNumber,
            (Guid?)s.CustomerId,
            (string?)s.CustomerName,
            (string?)s.CustomerPhone,
            (decimal)s.Subtotal,
            (decimal)s.DiscountAmount,
            (decimal)s.TaxAmount,
            (decimal)s.TotalAmount,
            (decimal)s.PaidAmount,
            (decimal)s.ChangeAmount,
            (int)s.PaymentMethod,
            (decimal)s.CashPaid,
            (decimal)s.DigitalPaid,
            (decimal)s.CreditPaid,
            (string?)s.Notes,
            (DateTime)s.SaleDate,
            (DateTime)s.CreatedAt,
            items
        );
    }

    public async Task<SalesSummaryDto> GetSalesSummaryAsync(DateTime? date = null)
    {
        using var conn = await _db.CreateConnectionAsync();
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

        var summary = await conn.QueryFirstOrDefaultAsync<dynamic>(summarySql, new { StartOfDay = startOfDay, EndOfDay = endOfDay });

        const string itemsCountSql = @"
            SELECT COALESCE(SUM(si.quantity), 0)
            FROM sale_items si
            INNER JOIN sales s ON si.sale_id = s.id
            WHERE s.sale_date >= @StartOfDay AND s.sale_date <= @EndOfDay;";

        int totalItemsSold = (int)(await conn.ExecuteScalarAsync<decimal?>(itemsCountSql, new { StartOfDay = startOfDay, EndOfDay = endOfDay }) ?? 0);

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
