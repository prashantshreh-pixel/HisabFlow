'use client';

import React, { useState, useMemo } from 'react';
import { useKhata } from '@/context/KhataContext';
import { Expense } from '@/types';
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  Coins,
  CreditCard,
  QrCode,
  Tag,
  Trash2,
  TrendingDown,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { PageLoader } from '@/components/Loader';

interface ExpensesViewProps {
  onOpenAddExpense: () => void;
}

const EXPENSE_CATEGORIES = [
  'All Categories',
  'Rent & Lease',
  'Electricity & Utilities',
  'Staff Salaries & Wages',
  'Tea, Snacks & Refreshment',
  'Freight & Transport',
  'Packaging & Supplies',
  'Maintenance & Repairs',
  'General Operational',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenAddExpense }) => {
  const { expenses, expensesSummary, stats, deleteExpense, isLoading } = useKhata();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        e.title.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        (e.particulars && e.particulars.toLowerCase().includes(query));

      if (!matchesQuery) return false;

      if (selectedCategory !== 'All Categories' && e.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategory]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Compute Net Shop Profit: (Retail Worth Potential - Stock Cost) - Expenses
  const netStoreProfit = useMemo(() => {
    const grossProfitPotential = stats.totalInventorySalesValue - stats.totalInventoryCostValue;
    return grossProfitPotential - stats.totalExpenses;
  }, [stats]);

  if (isLoading) {
    return <PageLoader text="Loading store expenses..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Strip - Expense Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Expenses Spent
            </span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              Rs. {stats.totalExpenses.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">{expenses.length} logged vouchers</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Today&apos;s Store Expenses
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              Rs. {stats.todayExpenses.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">Recorded today</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* This Month Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              This Month Expenses
            </span>
            <div className="text-2xl font-black text-slate-100 mt-1">
              Rs. {stats.monthExpenses.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">Current calendar month</span>
          </div>
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Net Profit Indicator + Log Expense CTA */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Est. Net Store Profit
            </span>
            <div
              className={`text-2xl font-black mt-1 ${
                netStoreProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              Rs. {netStoreProfit.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">Gross Margin minus Expenses</span>
          </div>
          <button
            id="log-expense-btn"
            type="button"
            onClick={onOpenAddExpense}
            className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            + Expense
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Category Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            id="expense-search-input"
            type="text"
            placeholder="Search expense description, category, or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Dropdown & Summary Total */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-500 hidden sm:block" />
            <select
              id="expense-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-rose-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
            Filtered Total: <strong className="text-rose-400">Rs. {totalFilteredAmount.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              <tr>
                <th className="py-3.5 px-5 min-w-[200px]">Expense Item / Purpose</th>
                <th className="py-3.5 px-5 min-w-[180px]">Category</th>
                <th className="py-3.5 px-5 text-right min-w-[120px]">Amount (Rs.)</th>
                <th className="py-3.5 px-5 text-center min-w-[120px]">Paid Via</th>
                <th className="py-3.5 px-5 min-w-[160px]">Date Spent</th>
                <th className="py-3.5 px-5 min-w-[200px]">Particulars / Notes</th>
                <th className="py-3.5 px-5 text-center min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-300">No store expenses logged yet</p>
                    <p className="text-xs text-slate-500 mt-0.5">Click &apos;+ Expense&apos; to log rent, electricity, salaries, or tea/khaja costs.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const expDate = new Date(expense.expenseDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={expense.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Description / Title */}
                      <td className="py-4 px-5 font-bold text-slate-100 text-sm">
                        {expense.title}
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 text-rose-300 font-semibold text-xs border border-slate-700/80 shadow-sm whitespace-nowrap">
                          {expense.category}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-5 text-right font-mono font-black text-rose-400 text-sm">
                        Rs. {expense.amount.toLocaleString()}
                      </td>

                      {/* Paid Via */}
                      <td className="py-4 px-5 text-center">
                        {(() => {
                          const isCash =
                            expense.paymentMethod === 'CASH' ||
                            (expense.paymentMethod as any) === 1 ||
                            (expense.paymentMethod as any) === 'Cash';
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 text-slate-200 font-medium text-xs border border-slate-800">
                              {isCash ? (
                                <>
                                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Cash</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-3.5 h-3.5 text-sky-400" />
                                  <span>QR Pay</span>
                                </>
                              )}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Date Spent */}
                      <td className="py-4 px-5 text-slate-300 font-mono text-xs">
                        {expDate}
                      </td>

                      {/* Particulars / Notes */}
                      <td className="py-4 px-5 text-slate-400 text-xs">
                        {expense.particulars || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete expense record '${expense.title}'?`)) {
                              deleteExpense(expense.id);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredExpenses.length} of {expenses.length} store expense records</span>
          <span>Logged expenses are factored into Net Profit calculations</span>
        </div>
      </div>
    </div>
  );
};
