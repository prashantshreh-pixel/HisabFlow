using System.Data;
using Dapper;
using HisabFlow.Application.Abstractions.Repositories;
using HisabFlow.Application.Common.Interfaces;
using HisabFlow.Application.Reports.DTOs;

namespace HisabFlow.Infrastructure.Repositories;

public class ReportRepository : IReportRepository
{
    private readonly IDbConnectionFactory _dbConnectionFactory;

    public ReportRepository(IDbConnectionFactory dbConnectionFactory)
    {
        _dbConnectionFactory = dbConnectionFactory;
    }

    public async Task<ProfitLossReportDto> GetProfitLossReportAsync(DateTime startDate, DateTime endDate, string periodName = "Custom")
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        // 1. Sales & Collections from POS Sales + Standalone Khata Ledger Entries
        const string salesSql = @"
            SELECT 
                (
                    (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE sale_date >= @StartDate AND sale_date <= @EndDate) +
                    (SELECT COALESCE(SUM(amount), 0) FROM customer_ledger_entries WHERE type = 1 AND (bill_number IS NULL OR bill_number NOT LIKE 'INV-%') AND transaction_date >= @StartDate AND transaction_date <= @EndDate)
                ) AS GrossSales,
                (
                    (SELECT COUNT(*) FROM sales WHERE sale_date >= @StartDate AND sale_date <= @EndDate) +
                    (SELECT COUNT(*) FROM customer_ledger_entries WHERE type = 1 AND (bill_number IS NULL OR bill_number NOT LIKE 'INV-%') AND transaction_date >= @StartDate AND transaction_date <= @EndDate)
                ) AS SalesCount,
                (
                    (SELECT COALESCE(SUM(cash_paid + digital_paid), 0) FROM sales WHERE sale_date >= @StartDate AND sale_date <= @EndDate) +
                    (SELECT COALESCE(SUM(amount), 0) FROM customer_ledger_entries WHERE type = 2 AND transaction_date >= @StartDate AND transaction_date <= @EndDate)
                ) AS PaymentsCollected;";

        var salesData = await connection.QueryFirstOrDefaultAsync<(decimal GrossSales, int SalesCount, decimal PaymentsCollected)>(
            salesSql, new { StartDate = startDate, EndDate = endDate });

        // 2. Wholesale Purchases & Supplier Payments from Supplier Ledger
        const string wholesaleSql = @"
            SELECT 
                COALESCE(SUM(CASE WHEN type = 1 THEN amount ELSE 0 END), 0) AS WholesalePurchases,
                COALESCE(COUNT(CASE WHEN type = 1 THEN 1 END), 0) AS PurchasesCount,
                COALESCE(SUM(CASE WHEN type = 2 THEN amount ELSE 0 END), 0) AS SupplierPaymentsGiven
            FROM supplier_ledger_entries
            WHERE transaction_date >= @StartDate AND transaction_date <= @EndDate;";

        var wholesaleData = await connection.QueryFirstOrDefaultAsync<(decimal WholesalePurchases, int PurchasesCount, decimal SupplierPaymentsGiven)>(
            wholesaleSql, new { StartDate = startDate, EndDate = endDate });

        // 3. Operating Expenses & Category Breakdown
        const string expenseSql = @"
            SELECT 
                category AS Category,
                COALESCE(SUM(amount), 0) AS Amount,
                COUNT(*) AS [Count]
            FROM expenses
            WHERE expense_date >= @StartDate AND expense_date <= @EndDate
            GROUP BY category
            ORDER BY Amount DESC;";

        var rawExpenses = (await connection.QueryAsync<(string Category, decimal Amount, int Count)>(
            expenseSql, new { StartDate = startDate, EndDate = endDate })).ToList();

        decimal totalOperatingExpenses = rawExpenses.Sum(e => e.Amount);
        int totalExpensesCount = rawExpenses.Sum(e => e.Count);

        var expenseBreakdown = rawExpenses.Select(e => new ExpenseBreakdownItemDto
        {
            Category = e.Category,
            Amount = e.Amount,
            Count = e.Count,
            PercentageOfTotal = totalOperatingExpenses > 0 ? Math.Round((e.Amount / totalOperatingExpenses) * 100, 1) : 0
        }).ToList();

        // 4. Daily / Timeline Trends
        const string dailySalesSql = @"
            SELECT 
                CONVERT(VARCHAR(10), transaction_date, 120) AS [Date],
                COALESCE(SUM(amount), 0) AS Amount
            FROM customer_ledger_entries
            WHERE type = 1 AND transaction_date >= @StartDate AND transaction_date <= @EndDate
            GROUP BY CONVERT(VARCHAR(10), transaction_date, 120);";

        const string dailyWholesaleSql = @"
            SELECT 
                CONVERT(VARCHAR(10), transaction_date, 120) AS [Date],
                COALESCE(SUM(amount), 0) AS Amount
            FROM supplier_ledger_entries
            WHERE type = 1 AND transaction_date >= @StartDate AND transaction_date <= @EndDate
            GROUP BY CONVERT(VARCHAR(10), transaction_date, 120);";

        const string dailyExpenseSql = @"
            SELECT 
                CONVERT(VARCHAR(10), expense_date, 120) AS [Date],
                COALESCE(SUM(amount), 0) AS Amount
            FROM expenses
            WHERE expense_date >= @StartDate AND expense_date <= @EndDate
            GROUP BY CONVERT(VARCHAR(10), expense_date, 120);";

        var salesByDay = (await connection.QueryAsync<(string Date, decimal Amount)>(dailySalesSql, new { StartDate = startDate, EndDate = endDate }))
            .ToDictionary(x => x.Date, x => x.Amount);

        var wholesaleByDay = (await connection.QueryAsync<(string Date, decimal Amount)>(dailyWholesaleSql, new { StartDate = startDate, EndDate = endDate }))
            .ToDictionary(x => x.Date, x => x.Amount);

        var expenseByDay = (await connection.QueryAsync<(string Date, decimal Amount)>(dailyExpenseSql, new { StartDate = startDate, EndDate = endDate }))
            .ToDictionary(x => x.Date, x => x.Amount);

        var allDates = salesByDay.Keys.Union(wholesaleByDay.Keys).Union(expenseByDay.Keys).OrderBy(d => d).ToList();
        var dailyTrends = allDates.Select(date =>
        {
            decimal s = salesByDay.GetValueOrDefault(date, 0);
            decimal w = wholesaleByDay.GetValueOrDefault(date, 0);
            decimal e = expenseByDay.GetValueOrDefault(date, 0);
            return new DailyTrendPointDto
            {
                Date = date,
                SalesRevenue = s,
                WholesaleCost = w,
                OperatingExpense = e,
                NetProfit = s - w - e
            };
        }).ToList();

        // Calculations
        decimal grossSales = salesData.GrossSales;
        decimal wholesaleCost = wholesaleData.WholesalePurchases;
        decimal grossProfit = grossSales - wholesaleCost;
        decimal grossProfitMargin = grossSales > 0 ? Math.Round((grossProfit / grossSales) * 100, 2) : 0;
        decimal netProfit = grossProfit - totalOperatingExpenses;
        decimal netProfitMargin = grossSales > 0 ? Math.Round((netProfit / grossSales) * 100, 2) : 0;

        decimal totalCashIn = salesData.PaymentsCollected;
        decimal totalCashOut = wholesaleData.SupplierPaymentsGiven + totalOperatingExpenses;

        return new ProfitLossReportDto
        {
            Period = periodName,
            StartDate = startDate,
            EndDate = endDate,
            GrossSalesRevenue = grossSales,
            TotalPaymentsCollected = salesData.PaymentsCollected,
            TotalSalesCount = salesData.SalesCount,
            WholesaleStockPurchases = wholesaleCost,
            WholesalePurchasesCount = wholesaleData.PurchasesCount,
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
}
