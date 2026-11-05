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
  MessageSquare,
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
  const { customers, stats, isLoading, formatDate, t, language, storeProfile } = useKhata();
  const cur = storeProfile?.currencySymbol || 'Rs.';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DUE_ONLY' | 'SETTLED' | 'OVER_LIMIT'>('ALL');
  const [sortBy, setSortBy] = useState<'BALANCE_DESC' | 'NAME' | 'RECENT'>('BALANCE_DESC');

  const handleSendWhatsAppReminder = (customer: { name: string; phone: string; currentBalance: number }) => {
    const digits = customer.phone.replace(/\D/g, '');
    const cleanPhone = digits.length === 10 ? `977${digits}` : digits;
    const shopName = storeProfile?.storeName || 'HisabFlow';
    const msg =
      language === 'np'
        ? `नमस्ते ${customer.name} ज्यू, ${shopName} मा तपाईंको कुल तिर्न बाँकी रकम (उदारो) ${cur} ${customer.currentBalance.toLocaleString()} छ। कृपया समयमै भुक्तानी गरिदिनुहुन अनुरोध गर्दछौं। धन्यवाद!`
        : `Namaste ${customer.name}, your total outstanding balance at ${shopName} is ${cur} ${customer.currentBalance.toLocaleString()}. Please arrange payment at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const q = searchQuery.toLowerCase().trim();
        if (q && !c.name.toLowerCase().includes(q) && !c.phone.includes(q) && !(c.address && c.address.toLowerCase().includes(q))) return false;

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
              {t('totalUdhaar')}
            </span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {cur} {stats.totalOutstandingKhata.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">{stats.activeDebtorsCount} {t('customersHaveDues')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Registered Accounts */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('khataCustomers')}
            </span>
            <div className="text-2xl font-black text-slate-100 mt-1">
              {customers.length} {t('accounts')}
            </div>
            <span className="text-[11px] text-emerald-400">{settledCount} {t('fullySettled')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Over Limit Alerts & CTA */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t('creditLimitAlerts')}
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {overLimitCount} {t('atRisk')}
            </div>
            <span className="text-[11px] text-slate-400">{t('exceedingLimit')}</span>
          </div>
          <button
            id="khata-add-customer-btn"
            type="button"
            onClick={onOpenAddCustomer}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            {t('addCustomer')}
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
            placeholder={t('searchCustomerPlaceholder')}
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
              {t('clear')}
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
            {t('all')} ({customers.length})
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
            {t('withDue')} ({stats.activeDebtorsCount})
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
            {t('overLimit')} ({overLimitCount})
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
            {t('settled')} ({settledCount})
          </button>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{t('sort')}:</span>
          <select
            id="khata-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="BALANCE_DESC">{t('highestBalanceFirst')}</option>
            <option value="NAME">{t('nameAZ')}</option>
            <option value="RECENT">{t('recentActivity')}</option>
          </select>
        </div>
      </div>

      {/* Mobile Customer Cards (Visible on phones) */}
      <div className="md:hidden space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-semibold text-slate-300">No customers found</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const hasDue = customer.currentBalance > 0;
            const isOverLimit = customer.currentBalance > customer.creditLimit;
            return (
              <div
                key={customer.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(customer.id)}
                    className="flex items-center gap-3 text-left min-w-0"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-100 truncate">
                        {customer.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                  </button>

                  <div className="text-right shrink-0">
                    {hasDue ? (
                      <div>
                        <span className="text-sm font-bold font-mono text-rose-400 block">
                          {cur} {customer.currentBalance.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isOverLimit ? t('overLimit') : t('due')}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                        {t('settled')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  {hasDue && (
                    <button
                      id={`wa-mobile-reminder-${customer.id}`}
                      type="button"
                      onClick={() => handleSendWhatsAppReminder(customer)}
                      className="py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0"
                      title="Send WhatsApp Payment Reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-current" />
                      <span>{t('whatsapp')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenRecordTransaction(customer.id, 'PAYMENT_RECEIVED')}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{t('recordTx')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectCustomer(customer.id)}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('statement')}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Customer Directory Table */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">{t('customerDetails')}</th>
                <th className="py-3.5 px-5">{t('phoneAddress')}</th>
                <th className="py-3.5 px-5 text-right">{t('outstandingBalance')}</th>
                <th className="py-3.5 px-5">{t('creditLimitUsage')}</th>
                <th className="py-3.5 px-5">{t('lastTransaction')}</th>
                <th className="py-3.5 px-5 text-center">{t('actions')}</th>
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

                  const formattedDate = formatDate(customer.lastTransactionDate);

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
                            {customer.address && (
                              <span className="block text-[11px] text-slate-400">
                                {customer.address}
                              </span>
                            )}
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
                              {cur} {customer.currentBalance.toLocaleString()}
                            </span>
                            {isOverLimit && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 mt-0.5">
                                <ShieldAlert className="w-3 h-3" /> {t('overLimit')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 rounded-md">
                            <CheckCircle2 className="w-3 h-3" /> {t('settled')} ({cur} 0)
                          </span>
                        )}
                      </td>

                      {/* Credit Limit & Progress */}
                      <td className="py-4 px-5 min-w-[150px]">
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                            <span>Limit: {cur} {customer.creditLimit.toLocaleString()}</span>
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
                        <div className="flex items-center justify-center gap-1.5">
                          {hasDue && (
                            <button
                              id={`wa-reminder-${customer.id}`}
                              type="button"
                              onClick={() => handleSendWhatsAppReminder(customer)}
                              className="h-8 px-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold rounded-lg transition-all inline-flex items-center justify-center gap-1 whitespace-nowrap"
                              title="Send WhatsApp Payment Reminder"
                            >
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 fill-current" />
                              <span>{t('whatsapp')}</span>
                            </button>
                          )}

                          <button
                            id={`record-tx-${customer.id}`}
                            type="button"
                            onClick={() => onOpenRecordTransaction(customer.id)}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm shadow-emerald-600/20"
                            title="Record Udhaar or Payment"
                          >
                            <Wallet className="w-3.5 h-3.5 shrink-0" />
                            <span>{t('recordTx')}</span>
                          </button>

                          <button
                            id={`view-statement-${customer.id}`}
                            type="button"
                            onClick={() => onSelectCustomer(customer.id)}
                            className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                            title="View Statement"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{t('statement')}</span>
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
