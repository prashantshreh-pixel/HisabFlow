'use client';

import React, { useState, useMemo } from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  Search,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Phone,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Users,
  Wallet,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { PageLoader } from '@/components/Loader';

interface KhataViewProps {
  onOpenAddCustomer: () => void;
  onOpenRecordTransaction: (customerId?: string, type?: 'PAYMENT_RECEIVED' | 'CREDIT_PURCHASE') => void;
  onSelectCustomer: (customerId: string) => void;
}

export const KhataView: React.FC<KhataViewProps> = ({
  onOpenAddCustomer,
  onOpenRecordTransaction,
  onSelectCustomer,
}) => {
  const { customers, stats, isLoading } = useKhata();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DUE_ONLY' | 'SETTLED' | 'OVER_LIMIT'>('ALL');
  const [sortBy, setSortBy] = useState<'BALANCE_DESC' | 'NAME' | 'RECENT'>('BALANCE_DESC');

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const q = searchQuery.toLowerCase().trim();
        if (q && !c.name.toLowerCase().includes(q) && !c.phone.includes(q)) return false;

        if (filterMode === 'DUE_ONLY' && c.currentBalance <= 0) return false;
        if (filterMode === 'SETTLED' && c.currentBalance > 0) return false;
        if (filterMode === 'OVER_LIMIT' && c.currentBalance <= c.creditLimit) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'BALANCE_DESC') return b.currentBalance - a.currentBalance;
        if (sortBy === 'NAME') return a.name.localeCompare(b.name);
        if (sortBy === 'RECENT') {
          return new Date(b.lastTransactionDate).getTime() - new Date(a.lastTransactionDate).getTime();
        }
        return 0;
      });
  }, [customers, searchQuery, filterMode, sortBy]);

  const overLimitCount = customers.filter((c) => c.currentBalance > c.creditLimit).length;
  const settledCount = customers.filter((c) => c.currentBalance === 0).length;

  if (isLoading) {
    return <PageLoader text="Loading khata records..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header ribbon & Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Receivables */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Khata Due (Udhaar)
            </span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              Rs. {stats.totalOutstandingKhata.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">{stats.activeDebtorsCount} customers have active dues</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Registered Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Khata Customers
            </span>
            <div className="text-2xl font-black text-slate-100 mt-1">
              {customers.length} Accounts
            </div>
            <span className="text-[11px] text-emerald-400">{settledCount} fully settled (Rs. 0)</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Over Limit Alerts & CTA */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Credit Limit Alerts
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {overLimitCount} At Risk
            </div>
            <span className="text-[11px] text-slate-400">Balances exceeding assigned limit</span>
          </div>
          <button
            id="khata-add-customer-btn"
            type="button"
            onClick={onOpenAddCustomer}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            + New Customer
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            id="khata-customer-search"
            type="text"
            placeholder="Search customer by name, phone (98XXXXXXXX), or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            id="filter-all"
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'ALL'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            id="filter-due-only"
            type="button"
            onClick={() => setFilterMode('DUE_ONLY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'DUE_ONLY'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            With Due ({stats.activeDebtorsCount})
          </button>
          <button
            id="filter-over-limit"
            type="button"
            onClick={() => setFilterMode('OVER_LIMIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'OVER_LIMIT'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            Over Limit ({overLimitCount})
          </button>
          <button
            id="filter-settled"
            type="button"
            onClick={() => setFilterMode('SETTLED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'SETTLED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
            }`}
          >
            Settled ({settledCount})
          </button>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Sort:</span>
          <select
            id="khata-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="BALANCE_DESC">Highest Balance First</option>
            <option value="NAME">Name (A-Z)</option>
            <option value="RECENT">Recent Activity</option>
          </select>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Customer Details</th>
                <th className="py-3.5 px-5">Phone & Address</th>
                <th className="py-3.5 px-5 text-right">Outstanding Balance (Udhaar)</th>
                <th className="py-3.5 px-5">Credit Limit & Usage</th>
                <th className="py-3.5 px-5">Last Transaction</th>
                <th className="py-3.5 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-300">No customers found</p>
                    <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search or filter terms.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const hasDue = customer.currentBalance > 0;
                  const isOverLimit = customer.currentBalance > customer.creditLimit;
                  const percentUsed = Math.min(
                    100,
                    Math.round((customer.currentBalance / Math.max(1, customer.creditLimit)) * 100)
                  );

                  const dateObj = new Date(customer.lastTransactionDate);
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Customer Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-700/80 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => onSelectCustomer(customer.id)}
                              className="font-bold text-slate-100 hover:text-amber-400 text-left transition-colors text-sm"
                            >
                              {customer.name}
                            </button>
                            <span className="block text-[10px] text-slate-500 font-mono">
                              ID: {customer.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Address */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <span className="flex items-center gap-1.5 text-slate-200 font-mono">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {customer.phone}
                          </span>
                          {customer.address && (
                            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate max-w-[180px]">
                              <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                              {customer.address}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-4 px-5 text-right">
                        {hasDue ? (
                          <div>
                            <span className="text-sm font-black text-rose-400 block">
                              Rs. {customer.currentBalance.toLocaleString()}
                            </span>
                            {isOverLimit && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 mt-0.5">
                                <ShieldAlert className="w-3 h-3" /> Exceeds Limit
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 rounded-md">
                            <CheckCircle2 className="w-3 h-3" /> All Settled (Rs. 0)
                          </span>
                        )}
                      </td>

                      {/* Credit Limit & Progress */}
                      <td className="py-4 px-5 min-w-[150px]">
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                            <span>Limit: Rs. {customer.creditLimit.toLocaleString()}</span>
                            <span>{percentUsed}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverLimit
                                  ? 'bg-rose-500'
                                  : percentUsed > 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Last Transaction */}
                      <td className="py-4 px-5">
                        <span className="text-slate-300 font-mono">{formattedDate}</span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`view-statement-${customer.id}`}
                            type="button"
                            onClick={() => onSelectCustomer(customer.id)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            Statement
                          </button>

                          <button
                            id={`record-payment-${customer.id}`}
                            type="button"
                            onClick={() => onOpenRecordTransaction(customer.id, 'PAYMENT_RECEIVED')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm shadow-emerald-600/20"
                            title="Record Repayment"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Pay
                          </button>

                          <button
                            id={`add-credit-${customer.id}`}
                            type="button"
                            onClick={() => onOpenRecordTransaction(customer.id, 'CREDIT_PURCHASE')}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 rounded-lg border border-slate-700 transition-colors"
                            title="Give Credit / Udhaar"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredCustomers.length} of {customers.length} total customer accounts</span>
          <span>Click on any customer name to view full chronological statement</span>
        </div>
      </div>
    </div>
  );
};
