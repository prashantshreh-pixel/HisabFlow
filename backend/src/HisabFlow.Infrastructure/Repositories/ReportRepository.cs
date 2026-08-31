using System.Data;
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

        const string multiSql = @"
            -- 1. Sales & Collections
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
                ) AS PaymentsCollected;

            -- 2. Wholesale Purchases & Supplier Payments
            SELECT 
                COALESCE(SUM(CASE WHEN type = 1 THEN amount ELSE 0 END), 0) AS WholesalePurchases,
                COALESCE(COUNT(CASE WHEN type = 1 THEN 1 END), 0) AS PurchasesCount,
                COALESCE(SUM(CASE WHEN type = 2 THEN amount ELSE 0 END), 0) AS SupplierPaymentsGiven
            FROM supplier_ledger_entries
            WHERE transaction_date >= @StartDate AND transaction_date <= @EndDate;

            -- 3. Operating Expenses & Category Breakdown
            SELECT 
                category AS Category,
                COALESCE(SUM(amount), 0) AS Amount,
                COUNT(*) AS [Count]
            FROM expenses
            WHERE expense_date >= @StartDate AND expense_date <= @EndDate
            GROUP BY category
            ORDER BY Amount DESC;

            -- 4. Daily Trends - Sales
            SELECT 
                CONVERT(VARCHAR(10), transaction_date, 120) AS [Date],
                COALESCE(SUM(amount), 0) AS Amount
            FROM customer_ledger_entries
            WHERE type = 1 AND transaction_date >= @StartDate AND transaction_date <= @EndDate
            GROUP BY CONVERT(VARCHAR(10), transaction_date, 120);

            -- 5. Daily Trends - Wholesale
            SELECT 
                CONVERT(VARCHAR(10), transaction_date, 120) AS [Date],
                COALESCE(SUM(amount), 0) AS Amount
            FROM supplier_ledger_entries
            WHERE type = 1 AND transaction_date >= @StartDate AND transaction_date <= @EndDate
            GROUP BY CONVERT(VARCHAR(10), transaction_date, 120);

            -- 6. Daily Trends - Expense
            SELECT 
                CONVERT(VARCHAR(10), expense_date, 120) AS [Date],
                COALESCE(SUM(amount), 0) AS Amount
            FROM expenses
            WHERE expense_date >= @StartDate AND expense_date <= @EndDate
            GROUP BY CONVERT(VARCHAR(10), expense_date, 120);";

        using var multi = await connection.QueryMultipleAsync(new CommandDefinition(multiSql, new { StartDate = startDate, EndDate = endDate }, cancellationToken: cancellationToken));

        var salesData = await multi.ReadFirstOrDefaultAsync<(decimal GrossSales, int SalesCount, decimal PaymentsCollected)>();
        var wholesaleData = await multi.ReadFirstOrDefaultAsync<(decimal WholesalePurchases, int PurchasesCount, decimal SupplierPaymentsGiven)>();
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

        var wholesaleByDay = (await multi.ReadAsync<(string Date, decimal Amount)>())
            .ToDictionary(x => x.Date, x => x.Amount);

        var expenseByDay = (await multi.ReadAsync<(string Date, decimal Amount)>())
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
