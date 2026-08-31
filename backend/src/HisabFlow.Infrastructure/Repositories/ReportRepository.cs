using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.DTOs;

namespace HisabFlow.Infrastructure.Repositories;

public class ReportRepository : IReportRepository
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public ReportRepository(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    public async Task<ProfitLossReportDto> GetProfitLossReportAsync(DateTime startDate, DateTime endDate, string periodName = "Custom", CancellationToken cancellationToken = default)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync(cancellationToken);

        var start = startDate.Date;
        var nextDay = endDate.Date.AddDays(1);

        const string multiSql = @"
            -- 1. Sales & Collections
            SELECT 
                (
                    (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE sale_date >= @Start AND sale_date < @NextDay AND is_refunded = 0) +
                    (SELECT COALESCE(SUM(amount), 0) FROM customer_ledger_entries WHERE type = 1 AND (bill_number IS NULL OR bill_number NOT LIKE 'INV-%') AND transaction_date >= @Start AND transaction_date < @NextDay)
                ) AS GrossSales,
                (
                    (SELECT COUNT(*) FROM sales WHERE sale_date >= @Start AND sale_date < @NextDay AND is_refunded = 0) +
                    (SELECT COUNT(*) FROM customer_ledger_entries WHERE type = 1 AND (bill_number IS NULL OR bill_number NOT LIKE 'INV-%') AND transaction_date >= @Start AND transaction_date < @NextDay)
                ) AS SalesCount,
                (
                    (SELECT COALESCE(SUM(cash_paid + digital_paid), 0) FROM sales WHERE sale_date >= @Start AND sale_date < @NextDay AND is_refunded = 0) +
                    (SELECT COALESCE(SUM(amount), 0) FROM customer_ledger_entries WHERE type = 2 AND transaction_date >= @Start AND transaction_date < @NextDay)
                ) AS PaymentsCollected;

            -- 2. Cost of Goods Sold (COGS) & Wholesale Purchases
            SELECT 
                (SELECT COALESCE(SUM(si.quantity * si.cost_price), 0) FROM sale_items si INNER JOIN sales s ON si.sale_id = s.id WHERE s.sale_date >= @Start AND s.sale_date < @NextDay AND s.is_refunded = 0) AS CostOfGoodsSold,
                COALESCE(SUM(CASE WHEN type = 1 THEN amount ELSE 0 END), 0) AS WholesalePurchases,
                COALESCE(COUNT(CASE WHEN type = 1 THEN 1 END), 0) AS PurchasesCount,
                COALESCE(SUM(CASE WHEN type = 2 THEN amount ELSE 0 END), 0) AS SupplierPaymentsGiven
            FROM supplier_ledger_entries
            WHERE transaction_date >= @Start AND transaction_date < @NextDay;

            -- 3. Operating Expenses & Category Breakdown
            SELECT 
                category AS Category,
                COALESCE(SUM(amount), 0) AS Amount,
                COUNT(*) AS [Count]
            FROM expenses
            WHERE expense_date >= @Start AND expense_date < @NextDay
            GROUP BY category
            ORDER BY Amount DESC;

            -- 4. Daily Trends - Sales
            SELECT 
                CONVERT(VARCHAR(10), sale_date, 120) AS [Date],
                COALESCE(SUM(total_amount), 0) AS Amount
            FROM sales
            WHERE sale_date >= @Start AND sale_date < @NextDay AND is_refunded = 0
            GROUP BY CONVERT(VARCHAR(10), sale_date, 120);

            -- 5. Daily Trends - Cost of Goods Sold (COGS)
            SELECT 
                CONVERT(VARCHAR(10), s.sale_date, 120) AS [Date],
                COALESCE(SUM(si.quantity * si.cost_price), 0) AS Amount
            FROM sale_items si
            INNER JOIN sales s ON si.sale_id = s.id
            WHERE s.sale_date >= @Start AND s.sale_date < @NextDay AND s.is_refunded = 0
            GROUP BY CONVERT(VARCHAR(10), s.sale_date, 120);

            -- 6. Daily Trends - Expense
            SELECT 
                CONVERT(VARCHAR(10), expense_date, 120) AS [Date],
                COALESCE(SUM(amount), 0) AS Amount
            FROM expenses
            WHERE expense_date >= @Start AND expense_date < @NextDay
            GROUP BY CONVERT(VARCHAR(10), expense_date, 120);";

        using var multi = await connection.QueryMultipleAsync(new CommandDefinition(multiSql, new { Start = start, NextDay = nextDay }, cancellationToken: cancellationToken));

        var salesData = await multi.ReadFirstOrDefaultAsync<(decimal GrossSales, int SalesCount, decimal PaymentsCollected)>();
        var cogsAndWholesaleData = await multi.ReadFirstOrDefaultAsync<(decimal CostOfGoodsSold, decimal WholesalePurchases, int PurchasesCount, decimal SupplierPaymentsGiven)>();
        var rawExpenses = (await multi.ReadAsync<(string Category, decimal Amount, int Count)>()).ToList();

        decimal totalOperatingExpenses = rawExpenses.Sum(e => e.Amount);
        int totalExpensesCount = rawExpenses.Sum(e => e.Count);

        var expenseBreakdown = rawExpenses.Select(e => new ExpenseBreakdownItemDto
        {
            Category = e.Category,
            Amount = e.Amount,
            Count = e.Count,
            PercentageOfTotal = totalOperatingExpenses > 0 ? Math.Round((e.Amount / totalOperatingExpenses) * 100, 1) : 0
        }).ToList();

        var salesByDay = (await multi.ReadAsync<(string Date, decimal Amount)>())
            .ToDictionary(x => x.Date, x => x.Amount);

        var cogsByDay = (await multi.ReadAsync<(string Date, decimal Amount)>())
            .ToDictionary(x => x.Date, x => x.Amount);

        var expenseByDay = (await multi.ReadAsync<(string Date, decimal Amount)>())
            .ToDictionary(x => x.Date, x => x.Amount);

        var allDates = salesByDay.Keys.Union(cogsByDay.Keys).Union(expenseByDay.Keys).OrderBy(d => d).ToList();
        var dailyTrends = allDates.Select(date =>
        {
            decimal s = salesByDay.GetValueOrDefault(date, 0);
            decimal cogs = cogsByDay.GetValueOrDefault(date, 0);
            decimal e = expenseByDay.GetValueOrDefault(date, 0);
            return new DailyTrendPointDto
            {
                Date = date,
                SalesRevenue = s,
                WholesaleCost = cogs,
                OperatingExpense = e,
                NetProfit = s - cogs - e
            };
        }).ToList();

        decimal grossSales = salesData.GrossSales;
        decimal cogsTotal = cogsAndWholesaleData.CostOfGoodsSold;
        decimal grossProfit = grossSales - cogsTotal;
        decimal grossProfitMargin = grossSales > 0 ? Math.Round((grossProfit / grossSales) * 100, 2) : 0;
        decimal netProfit = grossProfit - totalOperatingExpenses;
        decimal netProfitMargin = grossSales > 0 ? Math.Round((netProfit / grossSales) * 100, 2) : 0;

        decimal totalCashIn = salesData.PaymentsCollected;
        decimal totalCashOut = cogsAndWholesaleData.SupplierPaymentsGiven + totalOperatingExpenses;

        return new ProfitLossReportDto
        {
            Period = periodName,
            StartDate = startDate,
            EndDate = endDate,
            GrossSalesRevenue = grossSales,
            TotalPaymentsCollected = salesData.PaymentsCollected,
            TotalSalesCount = salesData.SalesCount,
            WholesaleStockPurchases = cogsAndWholesaleData.WholesalePurchases,
            WholesalePurchasesCount = cogsAndWholesaleData.PurchasesCount,
            GrossProfit = grossProfit,
            GrossProfitMarginPercentage = grossProfitMargin,
            TotalOperatingExpenses = totalOperatingExpenses,
            TotalExpensesCount = totalExpensesCount,
            ExpenseBreakdown = expenseBreakdown,
            NetProfit = netProfit,
            NetProfitMarginPercentage = netProfitMargin,
            CashFlow = new CashFlowSummaryDto
            {
                TotalCashIn = totalCashIn,
                TotalCashOut = totalCashOut,
                NetCashFlow = totalCashIn - totalCashOut
            },
            DailyTrends = dailyTrends
        };
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken cancellationToken = default)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync(cancellationToken);
        var today = DateTime.UtcNow.Date;
        var nextDay = today.AddDays(1);

        const string sql = @"
            SELECT 
                (SELECT COALESCE(SUM(current_balance), 0) FROM customers WHERE is_active = 1 AND current_balance > 0) AS TotalOutstandingKhata,
                (SELECT COALESCE(SUM(stock_quantity * cost_price), 0) FROM products WHERE is_active = 1) AS TotalInventoryCostValue,
                (SELECT COUNT(1) FROM products WHERE is_active = 1 AND stock_quantity <= min_stock_alert AND stock_quantity > 0) AS LowStockCount,
                (SELECT COUNT(1) FROM products WHERE is_active = 1 AND stock_quantity <= 0) AS OutOfStockCount,
                (SELECT COALESCE(SUM(cash_paid), 0) FROM sales WHERE sale_date >= @Today AND sale_date < @NextDay AND is_refunded = 0) AS TodayCashSales,
                (SELECT COALESCE(SUM(digital_paid), 0) FROM sales WHERE sale_date >= @Today AND sale_date < @NextDay AND is_refunded = 0) AS TodayDigitalSales,
                (SELECT COALESCE(SUM(credit_paid), 0) FROM sales WHERE sale_date >= @Today AND sale_date < @NextDay AND is_refunded = 0) AS TodayCreditGiven,
                (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE sale_date >= @Today AND sale_date < @NextDay AND is_refunded = 0) AS TodayTotalSales,
                (SELECT COUNT(1) FROM sales WHERE sale_date >= @Today AND sale_date < @NextDay AND is_refunded = 0) AS TodaySalesCount,
                (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE expense_date >= @Today AND expense_date < @NextDay) AS TodayExpensesAmount,
                (SELECT COUNT(1) FROM customers WHERE is_active = 1) AS ActiveCustomersCount,
                (SELECT COUNT(1) FROM products WHERE is_active = 1) AS ActiveProductsCount;";

        var summary = await connection.QuerySingleAsync<DashboardSummaryDto>(
            new CommandDefinition(sql, new { Today = today, NextDay = nextDay }, cancellationToken: cancellationToken));

        return summary;
    }

    public void InvalidateCache()
    {
        // Concrete repository does not hold in-memory cache directly
    }
}
