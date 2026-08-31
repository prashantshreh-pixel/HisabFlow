namespace HisabFlow.Application.DTOs;

public class ProfitLossReportDto
{
    public string Period { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    // Revenue
    public decimal GrossSalesRevenue { get; set; }
    public decimal TotalPaymentsCollected { get; set; }
    public int TotalSalesCount { get; set; }

    // Cost of Goods / Wholesale Purchases
    public decimal WholesaleStockPurchases { get; set; }
    public int WholesalePurchasesCount { get; set; }

    // Gross Profit
    public decimal GrossProfit { get; set; }
    public decimal GrossProfitMarginPercentage { get; set; }

    // Operating Expenses
    public decimal TotalOperatingExpenses { get; set; }
    public int TotalExpensesCount { get; set; }
    public IReadOnlyList<ExpenseBreakdownItemDto> ExpenseBreakdown { get; set; } = [];

    // Net Profit
    public decimal NetProfit { get; set; }
    public decimal NetProfitMarginPercentage { get; set; }
    public bool IsProfitable => NetProfit >= 0;

    // Cash Flow (Liquidity)
    public CashFlowSummaryDto CashFlow { get; set; } = new();

    // Timeline Trends
    public IReadOnlyList<DailyTrendPointDto> DailyTrends { get; set; } = [];
}

public class ExpenseBreakdownItemDto
{
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int Count { get; set; }
    public decimal PercentageOfTotal { get; set; }
}

public class DailyTrendPointDto
{
    public string Date { get; set; } = string.Empty;
    public decimal SalesRevenue { get; set; }
    public decimal WholesaleCost { get; set; }
    public decimal OperatingExpense { get; set; }
    public decimal NetProfit { get; set; }
}

public class CashFlowSummaryDto
{
    public decimal TotalCashIn { get; set; }
    public decimal TotalCashOut { get; set; }
    public decimal NetCashFlow { get; set; }
}

public class DashboardSummaryDto
{
    public decimal TotalOutstandingKhata { get; set; }
    public decimal TotalInventoryCostValue { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public decimal TodayCashSales { get; set; }
    public decimal TodayDigitalSales { get; set; }
    public decimal TodayCreditGiven { get; set; }
    public decimal TodayTotalSales { get; set; }
    public int TodaySalesCount { get; set; }
    public decimal TodayExpensesAmount { get; set; }
    public int ActiveCustomersCount { get; set; }
    public int ActiveProductsCount { get; set; }
}
