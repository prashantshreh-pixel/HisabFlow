'use client';

import React, { useMemo, useState } from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ChevronRight,
  CheckCircle2,
  Truck,
  UserPlus,
  Sparkles,
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
  onSelectCustomer,
  onQuickStockAdjust,
  onNavigateTab,
}) => {
  const { stats, ledgerEntries, customers, products, isLoading, formatDate } = useKhata();
  const [watchlistTab, setWatchlistTab] = useState<'DEBTORS' | 'STOCK'>('DEBTORS');

  const activeDebtors = useMemo(
    () =>
      [...customers]
        .filter((c) => c.currentBalance > 0)
        .sort((a, b) => b.currentBalance - a.currentBalance),
    [customers]
  );

  const displayedDebtors = useMemo(() => activeDebtors.slice(0, 6), [activeDebtors]);

  const lowStockItems = useMemo(
    () => products.filter((p) => p.stockQuantity <= p.minStockAlert).slice(0, 6),
    [products]
  );

  const totalStockAlerts = stats.lowStockCount + stats.outOfStockCount;
  const recentTransactions = useMemo(() => ledgerEntries.slice(0, 6), [ledgerEntries]);

  const limitPercent = Math.min(
    100,
    Math.round((stats.totalOutstandingKhata / Math.max(1, stats.totalCreditLimit)) * 100)
  );

  if (isLoading) {
    return <PageLoader text="Loading store overview..." />;
  }

  return (
    <div className="space-y-6">
      {/* 1. Clean Contextual Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">
            Store Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live balances, daily sales performance, and priority alerts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onOpenRecordTransaction(undefined, 'PAYMENT_RECEIVED')}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddCustomer}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* 2. Unified 4-Card KPI Strip (2x2 on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Khata */}
        <button
          type="button"
          id="stat-card-khata-hero"
          onClick={() => onNavigateTab('KHATA')}
          className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 text-left transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium text-slate-400">Outstanding Khata</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">
              {formatCurrency(stats.totalOutstandingKhata)}
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2.5">
              <div
                className={`h-full rounded-full ${
                  limitPercent > 80 ? 'bg-rose-500' : limitPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${limitPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 pt-2.5 border-t border-slate-800/70">
            <span>{stats.activeDebtorsCount} active debtors</span>
            <span className="text-slate-300 group-hover:text-amber-400 flex items-center gap-0.5 font-medium">
              View <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Card 2: Today's Sales */}
        <button
          type="button"
          id="stat-card-cashflow"
          onClick={() => onNavigateTab('POS')}
          className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 text-left transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium text-slate-400">Today&apos;s Sales</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
              {formatCurrency(stats.todayTotalSales)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cash: <span className="font-mono text-slate-200">{formatCurrency(stats.todayCashSales)}</span>
            </p>
          </div>

          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 pt-2.5 border-t border-slate-800/70">
            <span>Credit: {formatCurrency(stats.todayCreditGiven)}</span>
            <span className="text-slate-300 group-hover:text-amber-400 flex items-center gap-0.5 font-medium">
              POS <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Card 3: Payables & Expenses */}
        <button
          type="button"
          onClick={() => onNavigateTab('SUPPLIERS')}
          className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 text-left transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium text-slate-400">Supplier Payables</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Truck className="w-4 h-4" />
            </div>
          </div>

          <div className="my-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">
              {formatCurrency(stats.totalOutstandingPayable)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Expenses: <span className="font-mono text-slate-200">{formatCurrency(stats.totalExpenses)}</span>
            </p>
          </div>

          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 pt-2.5 border-t border-slate-800/70">
            <span>Wholesale ledger</span>
            <span className="text-slate-300 group-hover:text-amber-400 flex items-center gap-0.5 font-medium">
              Manage <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Card 4: Inventory Status */}
        <button
          type="button"
          id="stat-card-inventory"
          onClick={() => onNavigateTab('PRODUCTS')}
          className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 text-left transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium text-slate-400">Inventory Health</span>
            <div
              className={`p-2 rounded-xl border ${
                totalStockAlerts > 0
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {totalStockAlerts > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>

          <div className="my-3">
            <div
              className={`text-2xl font-bold font-mono tracking-tight ${
                totalStockAlerts > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {totalStockAlerts > 0 ? `${totalStockAlerts} Alerts` : 'Optimal'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.outOfStockCount > 0
                ? `${stats.outOfStockCount} out of stock`
                : `${products.length} total SKUs`}
            </p>
          </div>

          <div className="flex items-center justify-between w-full text-[11px] text-slate-400 pt-2.5 border-t border-slate-800/70">
            <span>Stock worth: {formatCurrency(stats.totalInventoryCostValue)}</span>
            <span className="text-slate-300 group-hover:text-amber-400 flex items-center gap-0.5 font-medium">
              Stock <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>
      </div>

      {/* 3. Two-Column Main Workspace (Activity Feed + Tabbed Watchlist) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Recent Khata Activity */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <h2 className="text-sm font-semibold text-slate-100">Recent Ledger Activity</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('KHATA')}
                className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <span>All Ledgers</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Sparkles className="w-7 h-7 text-slate-600 mx-auto" />
                <p className="text-xs font-medium text-slate-400">No ledger entries recorded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 mt-2">
                {recentTransactions.map((tx) => {
                  const isCredit = tx.type === 'CREDIT_PURCHASE';
                  return (
                    <div
                      key={tx.id}
                      onClick={() => onSelectCustomer(tx.customerId)}
                      className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/30 -mx-2 px-2 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            {formatPersonName(tx.customerName || 'Customer')}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {tx.notes || (isCredit ? 'Credit purchase' : 'Payment received')} &middot;{' '}
                            {formatDate(tx.date)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-bold font-mono ${
                            isCredit ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'} {formatCurrency(tx.amount)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Bal: {formatCurrency(tx.balanceAfter)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Unified Priority Watchlist (Debtors / Low Stock) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Segmented Switcher */}
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full">
                <button
                  type="button"
                  onClick={() => setWatchlistTab('DEBTORS')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    watchlistTab === 'DEBTORS'
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Top Debtors</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/15 text-rose-400">
                    {activeDebtors.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setWatchlistTab('STOCK')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    watchlistTab === 'STOCK'
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Low Stock</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      totalStockAlerts > 0
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {totalStockAlerts}
                  </span>
                </button>
              </div>
            </div>

            {/* Watchlist Content */}
            {watchlistTab === 'DEBTORS' ? (
              displayedDebtors.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                  <p className="text-xs font-medium text-slate-300">All customer accounts settled!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 mt-2">
                  {displayedDebtors.map((c) => (
                    <div
                      key={c.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectCustomer(c.id)}
                        className="text-left min-w-0 flex-1 group"
                      >
                        <div className="text-xs font-semibold text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                          {formatPersonName(c.name)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Due: <span className="text-rose-400 font-semibold">{formatCurrency(c.currentBalance)}</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenRecordTransaction(c.id, 'PAYMENT_RECEIVED')}
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-lg text-[11px] font-semibold transition-colors shrink-0"
                      >
                        Receive
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : lowStockItems.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                <p className="text-xs font-medium text-slate-300">All products are well-stocked</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 mt-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Remaining:{' '}
                        <span
                          className={`font-mono font-semibold ${
                            item.stockQuantity === 0 ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {item.stockQuantity} {item.unit}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onQuickStockAdjust(item)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold transition-colors shrink-0"
                    >
                      + Restock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
