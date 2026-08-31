'use client';

import React, { useState, useMemo } from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  PackagePlus,
  Clock,
  ChevronRight,
  ShieldAlert,
  Store,
  RefreshCw,
  Eye,
  CheckCircle2,
  Receipt,
  Truck,
  ScanBarcode,
} from 'lucide-react';
import { Product } from '@/types';
import { PageLoader } from '@/components/Loader';

import { NavTab } from '@/components/Navbar';

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

  // Top 5 debtors
  const topDebtors = useMemo(
    () =>
      [...customers]
        .filter((c) => c.currentBalance > 0)
        .sort((a, b) => b.currentBalance - a.currentBalance)
        .slice(0, 5),
    [customers]
  );

  // Critical low stock items
  const lowStockItems = useMemo(
    () => products.filter((p) => p.stockQuantity <= p.minStockAlert).slice(0, 5),
    [products]
  );

  // Recent 6 transactions
  const recentTransactions = useMemo(() => ledgerEntries.slice(0, 6), [ledgerEntries]);

  if (isLoading) {
    return <PageLoader text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Store status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">Store Operations & Khata Pulse</h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Store
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instant visibility into customer udhaar, today&apos;s settlements, and inventory levels
            </p>
          </div>
        </div>

        {/* Quick Action Bar (Primary CTA group) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="quick-pos-sale-btn"
            type="button"
            onClick={() => onNavigateTab('POS')}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center gap-2 shadow-md shadow-amber-500/25"
          >
            <ScanBarcode className="w-4 h-4" />
            + New Sale (POS)
          </button>

          <button
            id="quick-add-cust-btn"
            type="button"
            onClick={onOpenAddCustomer}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2 shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            + Add Customer
          </button>

          <button
            id="quick-record-payment-btn"
            type="button"
            onClick={() => onOpenRecordTransaction(undefined, 'PAYMENT_RECEIVED')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <ArrowDownLeft className="w-4 h-4" />
            + Record Payment
          </button>

          <button
            id="quick-add-product-btn"
            type="button"
            onClick={onOpenAddProduct}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2 shadow-sm"
          >
            <PackagePlus className="w-4 h-4 text-amber-400" />
            + Add Product
          </button>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Khata */}
        <div
          id="stat-card-khata"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Outstanding Khata
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              Rs. {stats.totalOutstandingKhata.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              <span>Limit Utilized</span>
              <span className="font-semibold text-slate-300">
                {Math.round((stats.totalOutstandingKhata / Math.max(1, stats.totalCreditLimit)) * 100)}% of Rs. {stats.totalCreditLimit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Cash Flow / Sales */}
        <div
          id="stat-card-cashflow"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Today&apos;s Total Sales
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              Rs. {stats.todayTotalSales.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              <span>Cash: <strong className="text-emerald-300">Rs. {stats.todayCashSales.toLocaleString()}</strong></span>
              <span>Credit: <strong className="text-rose-400">Rs. {stats.todayCreditGiven.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Active Debtors */}
        <div
          id="stat-card-debtors"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Credit Customers
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100 tracking-tight">
              {stats.activeDebtorsCount}{' '}
              <span className="text-sm font-normal text-slate-400">/ {stats.totalCustomersCount}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              <span>Avg Debt / Customer</span>
              <span className="font-semibold text-slate-300">
                Rs. {stats.activeDebtorsCount > 0 ? Math.round(stats.totalOutstandingKhata / stats.activeDebtorsCount).toLocaleString() : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          id="stat-card-inventory"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Low Stock Warnings
            </span>
            <div
              className={`p-2 rounded-xl ${
                stats.lowStockCount + stats.outOfStockCount > 0
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black tracking-tight ${
                  stats.lowStockCount + stats.outOfStockCount > 0 ? 'text-amber-400' : 'text-slate-200'
                }`}
              >
                {stats.lowStockCount + stats.outOfStockCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">SKUs need reorder</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
              <span>Out of Stock (0)</span>
              <span className="font-bold text-rose-400">{stats.outOfStockCount} items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Health & Expenses / Payables Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expenses Summary */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Expense Tracker
              </div>
              <div className="text-sm font-extrabold text-slate-100 mt-0.5">
                Expenses: <span className="text-rose-400 font-mono">Rs. {stats.totalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('EXPENSES')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1 shrink-0"
          >
            <span>Expenses</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Suppliers Payables Summary */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Wholesalers & Payables
              </div>
              <div className="text-sm font-extrabold text-slate-100 mt-0.5">
                Payables: <span className="text-rose-400 font-mono">Rs. {stats.totalOutstandingPayable.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('SUPPLIERS')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1 shrink-0"
          >
            <span>Suppliers</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Recent Activity Feed + Fast Settlement Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Khata Activity Feed (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Recent Khata Activity Feed
                </h3>
                <p className="text-xs text-slate-400">Live stream of credit purchases and customer settlements</p>
              </div>

              <button
                id="view-all-khata-btn"
                type="button"
                onClick={() => onNavigateTab('KHATA')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                View Full Khata <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider rounded-lg">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-lg">Customer</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Note / Items</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3 text-center rounded-r-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentTransactions.map((entry) => {
                    const isPurchase = entry.type === 'CREDIT_PURCHASE';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => onSelectCustomer(entry.customerId)}
                            className="font-bold text-slate-200 hover:text-amber-400 text-left transition-colors truncate max-w-[140px] block"
                          >
                            {entry.customerName || 'Customer'}
                          </button>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(entry.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              isPurchase
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                            }`}
                          >
                            {isPurchase ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                            {isPurchase ? 'Udhaar' : 'Repayment'}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-[160px]">
                          <p className="truncate text-slate-300 font-medium">{entry.notes}</p>
                          {entry.paymentMethod && (
                            <span className="text-[10px] text-slate-500">{entry.paymentMethod}</span>
                          )}
                        </td>

                        <td
                          className={`py-3 px-3 text-right font-bold ${
                            isPurchase ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isPurchase ? `+Rs. ${entry.amount.toLocaleString()}` : `-Rs. ${entry.amount.toLocaleString()}`}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-200">
                          Rs. {entry.balanceAfter.toLocaleString()}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectCustomer(entry.customerId)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
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

          <div className="pt-4 mt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {recentTransactions.length} of {ledgerEntries.length} total recorded entries</span>
            <button
              type="button"
              onClick={() => onOpenRecordTransaction()}
              className="text-amber-400 hover:underline font-semibold"
            >
              + Record New Ledger Entry
            </button>
          </div>
        </div>

        {/* Side Column: Top Debtors & Low Stock Watchlist */}
        <div className="space-y-6">
          {/* Top Outstanding Balances */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Top Udhaar Balances
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('KHATA')}
                className="text-[11px] font-semibold text-amber-400 hover:underline"
              >
                All Debtors
              </button>
            </div>

            <div className="divide-y divide-slate-800/60 mt-2">
              {topDebtors.map((cust) => {
                const isOver = cust.currentBalance > cust.creditLimit;
                return (
                  <div key={cust.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectCustomer(cust.id)}
                        className="text-xs font-bold text-slate-200 hover:text-amber-400 transition-colors truncate block text-left"
                      >
                        {cust.name}
                      </button>
                      <span className="text-[11px] text-slate-500">{cust.phone}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-rose-400">
                        Rs. {cust.currentBalance.toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenRecordTransaction(cust.id, 'PAYMENT_RECEIVED')}
                        className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
                      >
                        Settle Pay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock Watchlist */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Low Stock Alert ({lowStockItems.length})
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('PRODUCTS')}
                className="text-[11px] font-semibold text-amber-400 hover:underline"
              >
                Inventory
              </button>
            </div>

            <div className="divide-y divide-slate-800/60 mt-2">
              {lowStockItems.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  All products sufficiently stocked!
                </div>
              ) : (
                lowStockItems.map((prod) => (
                  <div key={prod.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{prod.name}</p>
                      <span className="text-[10px] text-slate-500">{prod.category}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          prod.stockQuantity === 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {prod.stockQuantity} {prod.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQuickStockAdjust(prod)}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                        title="Restock"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
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
