'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '@/lib/api';
import { ProfitLossReport } from '@/types';
import {
  BarChart3,
  DollarSign,
  Truck,
  Receipt,
  Calendar,
  RefreshCw,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Layers,
  Sparkles,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { PageLoader } from '@/components/Loader';

type PeriodPreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export const ReportsView: React.FC = () => {
  const [period, setPeriod] = useState<PeriodPreset>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchReport = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await reportsApi.getProfitLoss(
        period,
        period === 'custom' && startDate ? startDate : undefined,
        period === 'custom' && endDate ? endDate : undefined
      );
      setReport(data);
    } catch (err) {
      console.error('Error fetching P&L report:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading && !report) {
    return <PageLoader text="Calculating Profit & Loss financial analytics..." />;
  }

  return (
    <div className="space-y-6 pb-16 print:p-0 print:m-0 print:space-y-4">
      {/* Header & Filter Controls (Hidden during print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 shadow-xl print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 tracking-tight">
                Profit & Loss (P&L) Reports
              </h2>
              <p className="text-xs text-slate-400">
                Revenue, cost of goods sold, operating expenses, and net profit margins
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchReport}
            disabled={isRefreshing}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Refresh Financial Report"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
            title="Print Financial Statement"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Period Selection Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Period:
          </span>

          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'this_year', label: 'This Year' },
            { id: 'custom', label: 'Custom Range' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id as PeriodPreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === item.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}
      </div>

      {report && (
        <>
          {/* Printable Report Header (Visible only when printing) */}
          <div className="hidden print:block border-b border-slate-300 pb-4 mb-4 text-black">
            <h1 className="text-2xl font-black">HisabFlow Store - Profit & Loss Financial Statement</h1>
            <p className="text-sm text-slate-600">
              Reporting Period: <span className="font-bold">{report.period}</span> ({new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()})
            </p>
          </div>

          {/* Primary Financial Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Gross Revenue */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Gross Sales Revenue
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-100 font-mono">
                  Rs. {report.grossSalesRevenue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                  <span>{report.totalSalesCount} Credit / Khata Sales</span>
                </div>
              </div>
            </div>

            {/* 2. Wholesale Stock Cost (COGS) */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Wholesale Stock (COGS)
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-300 font-mono">
                  Rs. {report.wholesaleStockPurchases.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                  <span>{report.wholesalePurchasesCount} Supplier Shipments</span>
                </div>
              </div>
            </div>

            {/* 3. Operating Expenses */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Operating Expenses
                </span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-rose-400 font-mono">
                  Rs. {report.totalOperatingExpenses.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                  <span>{report.totalExpensesCount} Expense Entries</span>
                </div>
              </div>
            </div>

            {/* 4. NET PROFIT / (LOSS) - Highlighted card */}
            <div
              className={`p-5 rounded-2xl border shadow-xl flex flex-col justify-between ${
                report.isProfitable
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/40'
                  : 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Net Profit / (Loss)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                    report.isProfitable
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {report.isProfitable ? (
                    <>
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      Net Gain
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-3 h-3 text-rose-400" />
                      Net Deficit
                    </>
                  )}
                </span>
              </div>
              <div className="mt-3">
                <div
                  className={`text-2xl font-black font-mono ${
                    report.isProfitable ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  Rs. {report.netProfit.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                  <span>Net Margin:</span>
                  <span className="font-bold text-slate-200">{report.netProfitMarginPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Income Statement Breakdown Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Step-by-Step Financial Ledger Statement Table */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-slate-100">
                    Statement of Profit & Loss ({report.period})
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">Nepali Rupees (Rs.)</span>
              </div>

              <div className="space-y-3">
                {/* 1. Revenue Block */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">1. Gross Revenue from Sales</span>
                    <span className="font-mono font-black text-emerald-400">
                      + Rs. {report.grossSalesRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pl-4">
                    <span>• Cash / QR Collections from Customers</span>
                    <span className="font-mono text-slate-300">Rs. {report.totalPaymentsCollected.toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. Direct Costs Block */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">2. Cost of Goods & Stock Purchases</span>
                    <span className="font-mono font-black text-amber-400">
                      - Rs. {report.wholesaleStockPurchases.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pl-4">
                    <span>• Wholesale Inventory Shipments Logged</span>
                    <span className="font-mono text-slate-300">{report.wholesalePurchasesCount} orders</span>
                  </div>
                </div>

                {/* 3. Gross Profit Subtotal */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>Gross Operating Profit (Revenue - Stock Cost)</span>
                  <span className="font-mono font-black text-sm text-amber-400">
                    Rs. {report.grossProfit.toLocaleString()}
                  </span>
                </div>

                {/* 4. Overhead Expenses */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">3. Store Overhead Expenses</span>
                    <span className="font-mono font-black text-rose-400">
                      - Rs. {report.totalOperatingExpenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1 pl-4 pt-1">
                    {report.expenseBreakdown.length === 0 ? (
                      <span className="text-[11px] text-slate-500">No overhead expenses recorded in this period.</span>
                    ) : (
                      report.expenseBreakdown.slice(0, 5).map((e) => (
                        <div key={e.category} className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>• {e.category} ({e.count} entries)</span>
                          <span className="font-mono text-slate-300">Rs. {e.amount.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 5. Final Net Profit */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between text-sm font-black ${
                    report.isProfitable
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>FINAL NET PROFIT / (LOSS)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg block">
                      Rs. {report.netProfit.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-normal opacity-80">
                      {report.isProfitable ? 'Net Profit Margin' : 'Loss Deficit'}: {report.netProfitMarginPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Operating Expense Breakdown & Cash Flow */}
            <div className="space-y-6">
              {/* Expense Category Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-rose-400" />
                    <h3 className="font-bold text-sm text-slate-100">Expenses by Category</h3>
                  </div>
                </div>

                {report.expenseBreakdown.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    No categorized expenses recorded in this period.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {report.expenseBreakdown.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">{item.category}</span>
                          <span className="font-mono text-slate-200 font-bold">
                            Rs. {item.amount.toLocaleString()} ({item.percentageOfTotal}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full"
                            style={{ width: `${Math.min(item.percentageOfTotal, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cash Flow Liquidity Snapshot */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-slate-100">Cash Flow Liquidity</h3>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Total Inflows (Collections):</span>
                    <span className="font-mono font-bold text-emerald-400">
                      + Rs. {report.cashFlow.totalCashIn.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Total Outflows (Wholesale + Expenses):</span>
                    <span className="font-mono font-bold text-rose-400">
                      - Rs. {report.cashFlow.totalCashOut.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 font-bold">
                    <span className="text-slate-200">Net Operational Cash Flow:</span>
                    <span
                      className={`font-mono font-black ${
                        report.cashFlow.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      Rs. {report.cashFlow.netCashFlow.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily / Timeline Breakdown Strip */}
          {report.dailyTrends.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-slate-100">
                    Timeline Trends & Daily Margins
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {report.dailyTrends.length} Active Days
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Sales Revenue</th>
                      <th className="py-3 px-4 text-right">Wholesale Cost</th>
                      <th className="py-3 px-4 text-right">Operating Expense</th>
                      <th className="py-3 px-4 text-right">Net Daily Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {report.dailyTrends.map((t) => (
                      <tr key={t.date} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-slate-200 font-sans font-bold">{t.date}</td>
                        <td className="py-3 px-4 text-right text-emerald-400">Rs. {t.salesRevenue.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-amber-400">Rs. {t.wholesaleCost.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-rose-400">Rs. {t.operatingExpense.toLocaleString()}</td>
                        <td className={`py-3 px-4 text-right font-black ${t.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Rs. {t.netProfit.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
