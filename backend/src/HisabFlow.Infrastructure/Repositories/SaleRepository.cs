using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Common.Models;
using HisabFlow.Application.DTOs;
using HisabFlow.Infrastructure.Services;
using Microsoft.Data.SqlClient;

namespace HisabFlow.Infrastructure.Repositories;

public class SaleRepository : ISaleRepository
{
    private readonly IDbConnectionFactory _db;
    private readonly IReportRepository _reportRepository;
    private readonly IAuditRepository _auditRepository;
    private readonly ICurrentUserService _currentUser;

    private readonly record struct CustomerLockRecord(string Name, string Phone, decimal CurrentBalance, decimal CreditLimit, bool IsActive);
    private readonly record struct ProductLockRecord(Guid Id, string Name, string Unit, decimal SellingPrice, decimal CostPrice, decimal StockQuantity, bool IsActive);

    public SaleRepository(
        IDbConnectionFactory db,
        IReportRepository reportRepository,
        IAuditRepository auditRepository,
        ICurrentUserService? currentUser = null)
    {
        _db = db;
        _reportRepository = reportRepository;
        _auditRepository = auditRepository;
        _currentUser = currentUser ?? new CurrentUserService(new Microsoft.AspNetCore.Http.HttpContextAccessor());
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

            // 1. Credit Validation & Lock Customer (If sale has credit component)
            CustomerLockRecord? customerRecord = null;
            if (request.CreditPaid > 0)
            {
                if (!request.CustomerId.HasValue || request.CustomerId.Value == Guid.Empty)
                {
                    throw new InvalidOperationException("A valid customer selection is required for credit transactions.");
                }

                const string lockCustomerSql = @"
                    SELECT name AS Name, phone AS Phone, current_balance AS CurrentBalance, credit_limit AS CreditLimit, is_active AS IsActive
                    FROM customers WITH (UPDLOCK, ROWLOCK) 
                    WHERE id = @CustomerId;";

                var customer = await conn.QuerySingleOrDefaultAsync<CustomerLockRecord>(
                    new CommandDefinition(lockCustomerSql, new { request.CustomerId }, tx, cancellationToken: cancellationToken));

                if (customer.Equals(default(CustomerLockRecord)) || !customer.IsActive)
                {
                    throw new InvalidOperationException("Selected customer does not exist or is inactive.");
                }

                if (customer.CreditLimit > 0 && (customer.CurrentBalance + request.CreditPaid) > customer.CreditLimit)
                {
                    throw new InvalidOperationException(
                        $"Credit limit exceeded for customer '{customer.Name}'. Current Balance: Rs. {customer.CurrentBalance}, Credit Requested: Rs. {request.CreditPaid}, Limit: Rs. {customer.CreditLimit}.");
                }

                customerRecord = customer;
            }

            // 2. Lock Products in Deterministic Order (prevents deadlocks across concurrent POS checkouts)
            //    and track running stock across duplicate product entries in the cart
            const string lockProductSql = @"
                SELECT id AS Id, name AS Name, unit AS Unit, selling_price AS SellingPrice, cost_price AS CostPrice, stock_quantity AS StockQuantity, is_active AS IsActive
                FROM products WITH (UPDLOCK, ROWLOCK)
                WHERE id = @ProductId;";

            var lockedProducts = new Dictionary<Guid, ProductLockRecord>();
            var runningStockByProduct = new Dictionary<Guid, decimal>();

            foreach (var productId in request.Items.Select(i => i.ProductId).Distinct().OrderBy(id => id))
            {
                var dbProduct = await conn.QuerySingleOrDefaultAsync<ProductLockRecord>(
                    new CommandDefinition(lockProductSql, new { ProductId = productId }, tx, cancellationToken: cancellationToken));

                if (dbProduct.Equals(default(ProductLockRecord)) || !dbProduct.IsActive)
                {
                    throw new InvalidOperationException($"Product with ID '{productId}' does not exist or is inactive.");
                }

                lockedProducts[productId] = dbProduct;
                runningStockByProduct[productId] = dbProduct.StockQuantity;
            }

            var itemDtos = new List<SaleItemDto>(request.Items.Count);
            var insertItemParams = new List<object>(request.Items.Count);
            var deductStockParams = new List<object>(request.Items.Count);
            var stockMovementParams = new List<object>(request.Items.Count);
            decimal computedSubtotal = 0m;

            foreach (var item in request.Items)
            {
                var dbProduct = lockedProducts[item.ProductId];
                var availableStock = runningStockByProduct[item.ProductId];

                if (availableStock < item.Quantity)
                {
                    throw new InvalidOperationException(
                        $"Insufficient stock for product '{dbProduct.Name}'. Available stock: {availableStock} {dbProduct.Unit}, Requested: {item.Quantity} {dbProduct.Unit}.");
                }

                var newStock = availableStock - item.Quantity;
                runningStockByProduct[item.ProductId] = newStock;

                var itemId = Guid.NewGuid();
                decimal unitPrice = dbProduct.SellingPrice;
                decimal costPrice = dbProduct.CostPrice;
                decimal itemSubtotal = unitPrice * item.Quantity;
                computedSubtotal += itemSubtotal;

                insertItemParams.Add(new
                {
                    Id = itemId,
                    SaleId = saleId,
                    item.ProductId,
                    ProductName = dbProduct.Name,
                    Unit = dbProduct.Unit,
                    UnitPrice = unitPrice,
                    CostPrice = costPrice,
                    item.Quantity,
                    Subtotal = itemSubtotal,
                    CreatedAt = now
                });

                deductStockParams.Add(new
                {
                    item.Quantity,
                    UpdatedAt = now,
                    item.ProductId
                });

                stockMovementParams.Add(new
                {
                    Id = Guid.NewGuid(),
                    item.ProductId,
                    MovementType = "SALE",
                    QuantityChange = -item.Quantity,
                    StockAfter = newStock,
                    ReferenceId = invoiceNumber,
                    Notes = $"POS Sale {invoiceNumber}",
                    CreatedAt = now
                });

                itemDtos.Add(new SaleItemDto(
                    itemId, saleId, item.ProductId, dbProduct.Name, dbProduct.Unit,
                    unitPrice, costPrice, item.Quantity, itemSubtotal, now
                ));
            }

            // 3. Compute Server-side Totals
            decimal taxAmount = request.TaxAmount >= 0 ? request.TaxAmount : 0m;
            decimal discountAmount = request.DiscountAmount >= 0 ? request.DiscountAmount : 0m;
            decimal totalAmount = Math.Max(0m, computedSubtotal + taxAmount - discountAmount);
            decimal paidAmount = request.PaidAmount;
            decimal changeAmount = Math.Max(0m, paidAmount - totalAmount);

            const string shiftSql = "SELECT TOP (1) id FROM cash_drawers WHERE status = 'OPEN' ORDER BY opened_at DESC;";
            var activeShiftId = await conn.QuerySingleOrDefaultAsync<Guid?>(new CommandDefinition(shiftSql, transaction: tx, cancellationToken: cancellationToken));

            // 4. Insert Sale Header
            const string insertSaleSql = @"
                INSERT INTO sales (
                    id, invoice_number, customer_id, customer_name, customer_phone,
                    subtotal, discount_amount, tax_amount, total_amount, paid_amount, change_amount,
                    payment_method, cash_paid, digital_paid, credit_paid, notes, is_refunded, refunded_at, sale_date, cash_drawer_shift_id, created_at, updated_at
                )
                VALUES (
                    @Id, @InvoiceNumber, @CustomerId, @CustomerName, @CustomerPhone,
                    @Subtotal, @DiscountAmount, @TaxAmount, @TotalAmount, @PaidAmount, @ChangeAmount,
                    @PaymentMethod, @CashPaid, @DigitalPaid, @CreditPaid, @Notes, 0, NULL, @SaleDate, @ShiftId, @CreatedAt, @UpdatedAt
                );";

            await conn.ExecuteAsync(new CommandDefinition(insertSaleSql, new
            {
                Id = saleId,
                InvoiceNumber = invoiceNumber,
                request.CustomerId,
                CustomerName = customerRecord?.Name ?? request.CustomerName,
                CustomerPhone = customerRecord?.Phone ?? request.CustomerPhone,
                Subtotal = computedSubtotal,
                DiscountAmount = discountAmount,
                TaxAmount = taxAmount,
                TotalAmount = totalAmount,
                PaidAmount = paidAmount,
                ChangeAmount = changeAmount,
                request.PaymentMethod,
                request.CashPaid,
                request.DigitalPaid,
                request.CreditPaid,
                request.Notes,
                SaleDate = saleDate,
                ShiftId = activeShiftId,
                CreatedAt = now,
                UpdatedAt = now
            }, tx, cancellationToken: cancellationToken));

            // 5. Insert Items, Deduct Inventory Stock & Record Stock Movements
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

            const string insertMovementSql = @"
                INSERT INTO stock_movements (id, product_id, movement_type, quantity_change, stock_after, reference_id, notes, created_at)
                VALUES (@Id, @ProductId, @MovementType, @QuantityChange, @StockAfter, @ReferenceId, @Notes, @CreatedAt);";

            await conn.ExecuteAsync(new CommandDefinition(insertItemSql, insertItemParams, tx, cancellationToken: cancellationToken));
            await conn.ExecuteAsync(new CommandDefinition(deductStockSql, deductStockParams, tx, cancellationToken: cancellationToken));
            await conn.ExecuteAsync(new CommandDefinition(insertMovementSql, stockMovementParams, tx, cancellationToken: cancellationToken));

            // 6. Update Customer Ledger & Balance if Credit Sale
            if (request.CreditPaid > 0 && request.CustomerId.HasValue && customerRecord.HasValue)
            {
                decimal currentBalance = customerRecord.Value.CurrentBalance;
                decimal newBalance = currentBalance + request.CreditPaid;

                const string insertLedgerSql = @"
                    INSERT INTO customer_ledger_entries (
                        id, customer_id, type, amount, balance_after, payment_method,
                        particulars, bill_number, transaction_date, created_at
                    )
                    VALUES (
                        @Id, @CustomerId, 1, @Amount, @BalanceAfter, @PaymentMethod,
                        @Particulars, @BillNumber, @TransactionDate, @CreatedAt
                    );";

                await conn.ExecuteAsync(new CommandDefinition(insertLedgerSql, new
                {
                    Id = Guid.NewGuid(),
                    CustomerId = request.CustomerId.Value,
                    Amount = request.CreditPaid,
                    BalanceAfter = newBalance,
                    PaymentMethod = request.PaymentMethod,
                    Particulars = $"POS Credit Purchase - Bill #{invoiceNumber}",
                    BillNumber = invoiceNumber,
                    TransactionDate = saleDate,
                    CreatedAt = now
                }, tx, cancellationToken: cancellationToken));

                const string updateCustSql = @"
                    UPDATE customers
                    SET current_balance = @NewBalance,
                        updated_at = @UpdatedAt
                    WHERE id = @CustomerId;";

                await conn.ExecuteAsync(new CommandDefinition(updateCustSql, new
                {
                    NewBalance = newBalance,
                    UpdatedAt = now,
                    CustomerId = request.CustomerId.Value
                }, tx, cancellationToken: cancellationToken));
            }

            await tx.CommitAsync(cancellationToken);

            await _auditRepository.LogAsync(new CreateAuditLogRequest(
                "Sale",
                saleId.ToString(),
                "CREATE",
                System.Text.Json.JsonSerializer.Serialize(new { InvoiceNumber = invoiceNumber, TotalAmount = totalAmount, PaymentMethod = request.PaymentMethod }),
                _currentUser.Username
            ), cancellationToken);

            _reportRepository.InvalidateCache();

            return new SaleDto(
                saleId,
                invoiceNumber,
                request.CustomerId,
                customerRecord?.Name ?? request.CustomerName,
                customerRecord?.Phone ?? request.CustomerPhone,
                computedSubtotal,
                discountAmount,
                taxAmount,
                totalAmount,
                paidAmount,
                changeAmount,
                request.PaymentMethod,
                request.CashPaid,
                request.DigitalPaid,
                request.CreditPaid,
                request.Notes,
                false,
                null,
                saleDate,
                now,
                itemDtos
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
                is_refunded AS IsRefunded,
                refunded_at AS RefundedAt,
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
            s.IsRefunded,
            s.RefundedAt,
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
        public bool IsRefunded { get; set; }
        public DateTime? RefundedAt { get; set; }
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
                is_refunded AS IsRefunded,
                refunded_at AS RefundedAt,
                sale_date AS SaleDate,
                created_at AS CreatedAt
            FROM sales
            ORDER BY sale_date DESC;";

        var sales = (await conn.QueryAsync<SaleHeaderRecord>(new CommandDefinition(salesSql, new { Count = count }, cancellationToken: cancellationToken))).ToList();

        if (!sales.Any()) return Array.Empty<SaleDto>();

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
            s.IsRefunded,
            s.RefundedAt,
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
                is_refunded AS IsRefunded,
                refunded_at AS RefundedAt,
                sale_date AS SaleDate,
                created_at AS CreatedAt
            FROM sales
            WHERE id = @Id;

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
            WHERE sale_id = @Id;";

        using var multi = await conn.QueryMultipleAsync(new CommandDefinition(saleSql, new { Id = id }, cancellationToken: cancellationToken));
        var s = await multi.ReadSingleOrDefaultAsync<SaleHeaderRecord>();
        if (s == null) return null;

        var items = (await multi.ReadAsync<SaleItemDto>()).ToList();

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
            s.IsRefunded,
            s.RefundedAt,
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
                is_refunded AS IsRefunded,
                refunded_at AS RefundedAt,
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
            s.IsRefunded,
            s.RefundedAt,
            s.SaleDate,
            s.CreatedAt,
            items
        );
    }

    public async Task<SalesSummaryDto> GetSalesSummaryAsync(DateTime? date, CancellationToken cancellationToken = default)
    {
        using var conn = await _db.CreateConnectionAsync(cancellationToken);
        var targetDate = date ?? DateTime.UtcNow;
        var startOfDay = targetDate.Date;
        var nextDay = targetDate.Date.AddDays(1);

        const string summarySql = @"
            SELECT 
                COALESCE(SUM(total_amount), 0) AS TotalSalesAmount,
                COUNT(*) AS TotalBillsCount,
                COALESCE(SUM(cash_paid), 0) AS CashSalesAmount,
                COALESCE(SUM(digital_paid), 0) AS DigitalSalesAmount,
                COALESCE(SUM(credit_paid), 0) AS CreditSalesAmount,
                (
                    SELECT COALESCE(SUM(si.quantity), 0)
                    FROM sale_items si
                    INNER JOIN sales s2 ON si.sale_id = s2.id
                    WHERE s2.sale_date >= @StartOfDay AND s2.sale_date < @NextDay AND s2.is_refunded = 0
                ) AS TotalItemsSold
            FROM sales
            WHERE sale_date >= @StartOfDay AND sale_date < @NextDay AND is_refunded = 0;";

        var summary = await conn.QueryFirstOrDefaultAsync<dynamic>(new CommandDefinition(summarySql, new { StartOfDay = startOfDay, NextDay = nextDay }, cancellationToken: cancellationToken));

        return new SalesSummaryDto(
            targetDate,
            summary?.TotalSalesAmount != null ? (decimal)summary.TotalSalesAmount : 0,
            summary?.TotalBillsCount != null ? (int)summary.TotalBillsCount : 0,
            summary?.CashSalesAmount != null ? (decimal)summary.CashSalesAmount : 0,
            summary?.DigitalSalesAmount != null ? (decimal)summary.DigitalSalesAmount : 0,
            summary?.CreditSalesAmount != null ? (decimal)summary.CreditSalesAmount : 0,
            summary?.TotalItemsSold != null ? (int)(decimal)summary.TotalItemsSold : 0
        );
    }

    public async Task<SaleDto> RefundSaleAsync(Guid saleId, string reason, CancellationToken cancellationToken = default)
    {
        using var conn = (SqlConnection)await _db.CreateConnectionAsync(cancellationToken);
        using var tx = (SqlTransaction)await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            // Atomically Lock Sale Record WITH (UPDLOCK, ROWLOCK) and fetch items inside the SAME active transaction
            const string lockSaleSql = @"
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
                    is_refunded AS IsRefunded,
                    refunded_at AS RefundedAt,
                    sale_date AS SaleDate,
                    created_at AS CreatedAt
                FROM sales WITH (UPDLOCK, ROWLOCK)
                WHERE id = @SaleId;

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

            using var multi = await conn.QueryMultipleAsync(new CommandDefinition(lockSaleSql, new { SaleId = saleId }, tx, cancellationToken: cancellationToken));
            var lockedSale = await multi.ReadSingleOrDefaultAsync<SaleHeaderRecord>();
            if (lockedSale == null)
            {
                throw new KeyNotFoundException($"Sale with ID '{saleId}' was not found.");
            }

            if (lockedSale.IsRefunded)
            {
                throw new InvalidOperationException($"Sale '{lockedSale.InvoiceNumber}' has already been refunded.");
            }

            var items = (await multi.ReadAsync<SaleItemDto>()).ToList();

            var now = DateTime.UtcNow;
            var updatedNotes = string.IsNullOrWhiteSpace(lockedSale.Notes)
                ? $"[REFUNDED] Reason: {reason}"
                : $"{lockedSale.Notes} | [REFUNDED] Reason: {reason}";

            const string updateSaleSql = @"
                UPDATE sales
                SET is_refunded = 1,
                    refunded_at = @Now,
                    notes = @Notes,
                    updated_at = @Now
                WHERE id = @SaleId;";

            await conn.ExecuteAsync(new CommandDefinition(updateSaleSql, new { SaleId = saleId, Notes = updatedNotes, Now = now }, tx, cancellationToken: cancellationToken));

            // Restore Product Inventory Stock & Record Stock Movements in deterministic ProductId order
            foreach (var item in items.OrderBy(i => i.ProductId))
            {
                const string updateStockSql = @"
                    UPDATE products
                    SET stock_quantity = stock_quantity + @Quantity, updated_at = @Now
                    OUTPUT INSERTED.stock_quantity
                    WHERE id = @ProductId;";

                var newStock = await conn.ExecuteScalarAsync<decimal>(
                    new CommandDefinition(updateStockSql, new { ProductId = item.ProductId, Quantity = item.Quantity, Now = now }, tx, cancellationToken: cancellationToken));

                const string recordMovementSql = @"
                    INSERT INTO stock_movements (id, product_id, movement_type, quantity_change, stock_after, reference_id, notes, created_at)
                    VALUES (@Id, @ProductId, 'REFUND', @QuantityChange, @StockAfter, @ReferenceId, @Notes, @CreatedAt);";

                await conn.ExecuteAsync(new CommandDefinition(recordMovementSql, new
                {
                    Id = Guid.NewGuid(),
                    item.ProductId,
                    QuantityChange = item.Quantity,
                    StockAfter = newStock,
                    ReferenceId = lockedSale.InvoiceNumber,
                    Notes = $"Sale Refund: {reason}",
                    CreatedAt = now
                }, tx, cancellationToken: cancellationToken));
            }

            // If Credit was used, reverse customer balance
            if (lockedSale.CreditPaid > 0 && lockedSale.CustomerId.HasValue)
            {
                const string getCustSql = "SELECT current_balance FROM customers WITH (UPDLOCK, ROWLOCK) WHERE id = @CustomerId;";
                var currentBalance = await conn.ExecuteScalarAsync<decimal>(new CommandDefinition(getCustSql, new { CustomerId = lockedSale.CustomerId.Value }, tx, cancellationToken: cancellationToken));
                var newBalance = Math.Max(0, currentBalance - lockedSale.CreditPaid);

                const string updateCustSql = "UPDATE customers SET current_balance = @NewBalance, updated_at = @Now WHERE id = @CustomerId;";
                await conn.ExecuteAsync(new CommandDefinition(updateCustSql, new { NewBalance = newBalance, Now = now, CustomerId = lockedSale.CustomerId.Value }, tx, cancellationToken: cancellationToken));

                const string ledgerSql = @"
                    INSERT INTO customer_ledger_entries (id, customer_id, type, amount, balance_after, payment_method, particulars, bill_number, transaction_date, created_at)
                    VALUES (@Id, @CustomerId, 2, @Amount, @BalanceAfter, 4, @Particulars, @BillNumber, @TransactionDate, @CreatedAt);";

                await conn.ExecuteAsync(new CommandDefinition(ledgerSql, new
                {
                    Id = Guid.NewGuid(),
                    CustomerId = lockedSale.CustomerId.Value,
                    Amount = lockedSale.CreditPaid,
                    BalanceAfter = newBalance,
                    Particulars = $"Refund Adjustment - {lockedSale.InvoiceNumber}",
                    BillNumber = lockedSale.InvoiceNumber,
                    TransactionDate = now,
                    CreatedAt = now
                }, tx, cancellationToken: cancellationToken));
            }

            await tx.CommitAsync(cancellationToken);

            await _auditRepository.LogAsync(new CreateAuditLogRequest(
                "Sale",
                saleId.ToString(),
                "REFUND",
                System.Text.Json.JsonSerializer.Serialize(new { InvoiceNumber = lockedSale.InvoiceNumber, Reason = reason }),
                _currentUser.Username
            ), cancellationToken);

            _reportRepository.InvalidateCache();

            return new SaleDto(
                lockedSale.Id,
                lockedSale.InvoiceNumber,
                lockedSale.CustomerId,
                lockedSale.CustomerName,
                lockedSale.CustomerPhone,
                lockedSale.Subtotal,
                lockedSale.DiscountAmount,
                lockedSale.TaxAmount,
                lockedSale.TotalAmount,
                lockedSale.PaidAmount,
                lockedSale.ChangeAmount,
                lockedSale.PaymentMethod,
                lockedSale.CashPaid,
                lockedSale.DigitalPaid,
                lockedSale.CreditPaid,
                updatedNotes,
                true,
                now,
                lockedSale.SaleDate,
                lockedSale.CreatedAt,
                items
            );
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
