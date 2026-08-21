'use client';

import React, { useState, useMemo } from 'react';
import { useKhata } from '@/context/KhataContext';
import { Supplier, SupplierTransactionType } from '@/types';
import {
  Truck,
  Plus,
  Search,
  Phone,
  MapPin,
  Building,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Trash2,
  Edit2,
  TrendingUp,
} from 'lucide-react';
import { PageLoader } from '@/components/Loader';

interface SuppliersViewProps {
  onOpenAddSupplier: () => void;
  onOpenRecordTransaction: (supplierId?: string, type?: SupplierTransactionType) => void;
  onSelectSupplier: (supplierId: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  onOpenAddSupplier,
  onOpenRecordTransaction,
  onSelectSupplier,
}) => {
  const { suppliers, suppliersSummary, stats, deleteSupplier, isLoading } = useKhata();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      return (
        s.name.toLowerCase().includes(query) ||
        (s.companyName && s.companyName.toLowerCase().includes(query)) ||
        s.phone.includes(query) ||
        (s.address && s.address.toLowerCase().includes(query))
      );
    });
  }, [suppliers, searchQuery]);

  if (isLoading) {
    return <PageLoader text="Loading wholesalers & suppliers ledger..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Payables */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Supplier Payables
            </span>
            <div className="text-2xl font-black text-rose-400 mt-1">
              Rs. {stats.totalOutstandingPayable.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">Amount shop owes wholesalers</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Stock Purchases */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Today&apos;s Purchases
            </span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              Rs. {stats.todaySupplierPurchases.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">Stock purchased today</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Supplier Payments */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Today&apos;s Payments Given
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              Rs. {stats.todaySupplierPayments.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">Paid to wholesalers today</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Action Button Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between gap-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
            <span>Wholesalers Directory</span>
            <span className="text-amber-400">{suppliers.length} Registered</span>
          </div>
          <button
            id="add-supplier-header-btn"
            type="button"
            onClick={onOpenAddSupplier}
            className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            id="supplier-search-input"
            type="text"
            placeholder="Search wholesaler by name, firm, phone, or location..."
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

        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredSuppliers.length} Wholesalers
        </span>
      </div>

      {/* Supplier Grid / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              <tr>
                <th className="py-3.5 px-5 min-w-[220px]">Wholesaler / Supplier</th>
                <th className="py-3.5 px-5 min-w-[160px]">Contact Phone</th>
                <th className="py-3.5 px-5 min-w-[180px]">Location</th>
                <th className="py-3.5 px-5 text-right min-w-[150px]">Outstanding Payable (Rs.)</th>
                <th className="py-3.5 px-5 text-center min-w-[240px]">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-300">No wholesalers found</p>
                    <p className="text-xs text-slate-500 mt-0.5">Click &apos;+ Supplier&apos; to add a new inventory vendor.</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-800/40 transition-colors group">
                    {/* Name & Company */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                          {supplier.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div
                            onClick={() => onSelectSupplier(supplier.id)}
                            className="font-bold text-slate-100 text-sm hover:text-amber-400 cursor-pointer transition-colors"
                          >
                            {supplier.name}
                          </div>
                          {supplier.companyName && (
                            <div className="text-[11px] text-amber-300 font-medium">
                              {supplier.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-5 font-mono text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{supplier.phone}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-5 text-xs text-slate-400">
                      {supplier.address ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[160px]">{supplier.address}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Payable Balance */}
                    <td className="py-4 px-5 text-right font-mono font-black text-sm">
                      <span className={supplier.currentBalance > 0 ? 'text-rose-400' : 'text-slate-400'}>
                        Rs. {supplier.currentBalance.toLocaleString()}
                      </span>
                    </td>

                    {/* Quick Actions */}
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenRecordTransaction(supplier.id, 'STOCK_PURCHASE')}
                          className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-[11px] border border-rose-800/80 rounded-lg transition-colors flex items-center gap-1"
                          title="Record Purchase from Wholesaler"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Purchase</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenRecordTransaction(supplier.id, 'PAYMENT_GIVEN')}
                          className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-bold text-[11px] border border-emerald-800/80 rounded-lg transition-colors flex items-center gap-1"
                          title="Give Payment to Wholesaler"
                        >
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Pay</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectSupplier(supplier.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] border border-slate-700 rounded-lg transition-colors flex items-center gap-1"
                          title="View Statement Ledger"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Ledger</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove supplier '${supplier.name}'?`)) {
                              deleteSupplier(supplier.id);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors"
                          title="Remove Supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
