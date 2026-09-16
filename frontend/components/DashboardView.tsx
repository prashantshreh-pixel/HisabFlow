'use client';

import React, { useMemo } from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  PackagePlus,
  Clock,
  ChevronRight,
  Eye,
  CheckCircle2,
  Receipt,
  Truck,
} from 'lucide-react';
import { Product } from '@/types';
import { PageLoader } from '@/components/Loader';
import { NavTab } from '@/components/Navbar';
import { formatPersonName, formatCurrency } from '@/lib/utils';

interface DashboardViewProps {
  onOpenAddCustomer: () => void;
  onOpenRecordTransaction: (customerId?: string, type?: 'PAYMENT_RECEIVED' | 'CREDIT_PURCHASE') => void;
  onOpenAddProduct: () => void;
  onSelectCustomer: (customerId: string) => void;
  onQuickStockAdjust: (product: Product) => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddCustomer,
  onOpenRecordTransaction,
  onOpenAddProduct,
  onSelectCustomer,
  onQuickStockAdjust,
  onNavigateTab,
}) => {
  const { stats, ledgerEntries, customers, products, isLoading } = useKhata();

  // All active debtors sorted highest balance first
  const activeDebtors = useMemo(
    () =>
      [...customers]
        .filter((c) => c.currentBalance > 0)
        .sort((a, b) => b.currentBalance - a.currentBalance),
    [customers]
  );

  const displayedDebtors = useMemo(() => activeDebtors.slice(0, 5), [activeDebtors]);
  const hiddenDebtorsCount = Math.max(0, activeDebtors.length - displayedDebtors.length);

  const lowStockItems = useMemo(
    () => products.filter((p) => p.stockQuantity <= p.minStockAlert).slice(0, 5),
    [products]
  );

  const totalStockAlerts = stats.lowStockCount + stats.outOfStockCount;
  const recentTransactions = useMemo(() => ledgerEntries.slice(0, 6), [ledgerEntries]);

  // Credit limit utilization percentage
  const limitPercent = Math.min(
    100,
    Math.round((stats.totalOutstandingKhata / Math.max(1, stats.totalCreditLimit)) * 100)
  );

  if (isLoading) {
    return <PageLoader text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. SECTION HEADER (Clean 24px vertical rhythm) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Store Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time balance totals, active credit ledgers, and inventory alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenRecordTransaction(undefined, 'PAYMENT_RECEIVED')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 font-medium text-xs rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <PackagePlus className="w-3.5 h-3.5 text-slate-400" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 2. HERO CARD: TOTAL OUTSTANDING KHATA (Elevated with shadow & distinct depth) */}
      <div
        id="stat-card-khata-hero"
        className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg shadow-black/20 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Core Ledger Metric
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Active Udhaar
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">
                Total Outstanding Khata
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-semibold font-mono tracking-tight text-rose-400">
              {formatCurrency(stats.totalOutstandingKhata)}
            </div>

            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Net balance owed by <strong className="text-slate-200 font-medium">{stats.activeDebtorsCount} credit customers</strong> across your active store register.
            </p>
          </div>

          {/* Limit Utilization Progress Bar & Quick Stats */}
          <div className="w-full md:w-80 p-5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Credit Limit Utilized</span>
              <span className="font-semibold font-mono text-slate-200">{limitPercent}%</span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  limitPercent > 80 ? 'bg-rose-500' : limitPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${limitPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Total Limit Assigned</span>
              <span className="font-mono font-medium text-slate-300">{formatCurrency(stats.totalCreditLimit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECONDARY KPI CARDS (Standard p-6 padding, perfect vertical alignment) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Today's Sales */}
        <div
          id="stat-card-cashflow"
          className="p-6 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">
                Today&apos;s Sales
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div
              className={`text-2xl font-semibold font-mono tracking-tight ${
                stats.todayTotalSales > 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {formatCurrency(stats.todayTotalSales)}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
              <span>
                Cash:{' '}
                <strong className={`font-mono font-medium ${stats.todayCashSales > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {formatCurrency(stats.todayCashSales)}
                </strong>
              </span>
              <span>
                Credit:{' '}
                <strong className={`font-mono font-medium ${stats.todayCreditGiven > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {formatCurrency(stats.todayCreditGiven)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Active Credit Customers */}
        <div
          id="stat-card-debtors"
          className="p-6 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-300">
                Credit Customers
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl font-semibold font-mono text-slate-100 tracking-tight">
              {stats.activeDebtorsCount}{' '}
              <span className="text-sm font-normal text-slate-400 font-sans">/ {stats.totalCustomersCount} registered</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
              <span>Avg Debt / Customer</span>
              <span className="font-medium font-mono text-slate-300">
                {stats.activeDebtorsCount > 0
                  ? formatCurrency(stats.totalOutstandingKhata / stats.activeDebtorsCount)
                  : 'Rs. 0'}
              </span>
            </div>
          </div>
        </div>

        {/* Inventory Health */}
        <div
          id="stat-card-inventory"
          className="p-6 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {totalStockAlerts > 0 ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="text-xs font-medium text-slate-300">
                Inventory Health
              </span>
            </div>
          </div>

          <div className="mt-4">
            {totalStockAlerts > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold font-mono tracking-tight text-rose-400">
                    {totalStockAlerts}
                  </span>
                  <span className="text-xs text-slate-400">SKUs require reorder</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
                  <span>Out of stock</span>
                  <span className="font-medium font-mono text-rose-400">{stats.outOfStockCount} items</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold font-mono tracking-tight text-slate-100">
                    Optimal
                  </span>
                  <span className="text-xs text-slate-400">stock levels</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
                  <span>Stock status</span>
                  <span className="font-medium text-emerald-400">All SKUs healthy</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. FINANCIAL OVERVIEW CARDS (Standard p-6 padding) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expenses Summary */}
        <div className="p-6 bg-slate-900/80 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <div className="text-xs font-medium text-slate-300">
                Recorded Expenses
              </div>
              <div className="text-base font-semibold font-mono text-slate-100 mt-0.5">
                {formatCurrency(stats.totalExpenses)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('EXPENSES')}
            className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-xs rounded-md border border-slate-750 transition-colors flex items-center gap-1 shrink-0"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Suppliers Payables Summary */}
        <div className="p-6 bg-slate-900/80 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <div className="text-xs font-medium text-slate-300">
                Supplier Payables
              </div>
              <div className="text-base font-semibold font-mono text-slate-100 mt-0.5">
                {formatCurrency(stats.totalOutstandingPayable)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('SUPPLIERS')}
            className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-xs rounded-md border border-slate-750 transition-colors flex items-center gap-1 shrink-0"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. ACTIVITY FEED & SIDE WATCHLISTS (24px gap, 24px internal padding) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Khata Activity Feed */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Recent Khata Activity</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest credit purchases and customer repayments</p>
              </div>

              <button
                id="view-all-khata-btn"
                type="button"
                onClick={() => onNavigateTab('KHATA')}
                className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View Full Khata</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] font-semibold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-md font-medium">Customer</th>
                    <th className="py-2.5 px-3 font-medium">Type</th>
                    <th className="py-2.5 px-3 font-medium">Note / Particulars</th>
                    <th className="py-2.5 px-3 text-right font-medium">Amount</th>
                    <th className="py-2.5 px-3 text-right font-medium">Balance</th>
                    <th className="py-2.5 px-3 text-center rounded-r-md font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentTransactions.map((entry) => {
                    const isPurchase = entry.type === 'CREDIT_PURCHASE';
                    const customerName = formatPersonName(entry.customerName || 'Customer');
                    return (
                      <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => onSelectCustomer(entry.customerId)}
                            className="font-medium text-slate-200 hover:text-amber-400 text-left transition-colors truncate max-w-[140px] block"
                            title={customerName}
                          >
                            {customerName}
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(entry.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              isPurchase
                                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            }`}
                          >
                            {isPurchase ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            {isPurchase ? 'Udhaar' : 'Repayment'}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-[180px]">
                          <p
                            className="truncate text-slate-300 cursor-help"
                            title={entry.notes || 'No notes provided'}
                          >
                            {entry.notes || '—'}
                          </p>
                          {entry.paymentMethod && (
                            <span className="text-[10px] text-slate-400 font-mono">{entry.paymentMethod}</span>
                          )}
                        </td>

                        <td
                          className={`py-3 px-3 text-right font-mono font-medium ${
                            isPurchase ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isPurchase ? `+${formatCurrency(entry.amount)}` : `-${formatCurrency(entry.amount)}`}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {formatCurrency(entry.balanceAfter)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectCustomer(entry.customerId)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 transition-colors"
                            title="View Statement"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {recentTransactions.length} of {ledgerEntries.length} entries</span>
            <button
              type="button"
              onClick={() => onOpenRecordTransaction()}
              className="text-slate-300 hover:text-white font-medium underline"
            >
              + Record Ledger Entry
            </button>
          </div>
        </div>

        {/* Side Watchlists */}
        <div className="space-y-6">
          {/* Top Udhaar Balances */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-semibold text-slate-200">
                  Top Udhaar Balances
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300">
                  {activeDebtors.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('KHATA')}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-slate-800/60 mt-1">
              {displayedDebtors.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No outstanding customer balances.
                </div>
              ) : (
                displayedDebtors.map((cust) => {
                  const customerName = formatPersonName(cust.name);
                  return (
                    <div key={cust.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(cust.id)}
                          className="text-xs font-medium text-slate-200 hover:text-amber-400 transition-colors truncate block text-left"
                          title={customerName}
                        >
                          {customerName}
                        </button>
                        <span className="text-[11px] text-slate-400 font-mono">{cust.phone}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-semibold font-mono text-rose-400">
                            {formatCurrency(cust.currentBalance)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenRecordTransaction(cust.id, 'PAYMENT_RECEIVED')}
                          className="px-2.5 py-1 bg-slate-850 hover:bg-slate-800 text-emerald-400 border border-slate-750 rounded-md text-[10px] font-medium transition-colors"
                        >
                          Settle Pay
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {hiddenDebtorsCount > 0 && (
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('KHATA')}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    + {hiddenDebtorsCount} more debtor{hiddenDebtorsCount > 1 ? 's' : ''} in full ledger
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Inventory Low Stock Watchlist */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-slate-200">
                Low Stock Alert ({lowStockItems.length})
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('PRODUCTS')}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Inventory
              </button>
            </div>

            <div className="divide-y divide-slate-800/60 mt-1">
              {lowStockItems.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  All products sufficiently stocked
                </div>
              ) : (
                lowStockItems.map((prod) => (
                  <div key={prod.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{prod.name}</p>
                      <span className="text-[10px] text-slate-400">{prod.category}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-medium font-mono px-2 py-0.5 rounded-md ${
                          prod.stockQuantity === 0
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {prod.stockQuantity} {prod.unit}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
