'use client';

import React, { useState, useEffect } from 'react';
import { useKhata } from '@/context/KhataContext';
import { SupplierLedgerEntry } from '@/types';
import { X, Truck, Phone, MapPin, Building, ArrowUpRight, ArrowDownLeft, Calendar, FileText, Printer } from 'lucide-react';
import { PageLoader } from '@/components/Loader';

interface SupplierStatementModalProps {
  supplierId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SupplierStatementModal: React.FC<SupplierStatementModalProps> = ({
  supplierId,
  isOpen,
  onClose,
}) => {
  const { getSupplierById, getSupplierLedger } = useKhata();
  const [entries, setEntries] = useState<SupplierLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const supplier = supplierId ? getSupplierById(supplierId) : null;

  useEffect(() => {
    if (supplierId && isOpen) {
      setLoading(true);
      getSupplierLedger(supplierId).then((res) => {
        setEntries(res);
        setLoading(false);
      });
    }
  }, [supplierId, isOpen]);

  if (!isOpen || !supplier) return null;

  return (
    <div
      id="supplier-statement-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="supplier-statement-panel"
        className="w-full max-w-2xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-100">{supplier.name}</h3>
                <p className="text-xs text-slate-400">
                  {supplier.companyName ? `${supplier.companyName} · ` : ''}
                  Phone: {supplier.phone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Statement
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Supplier Info & Payable Summary Card */}
          <div className="p-6 bg-slate-950/40 border-b border-slate-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Wholesaler Firm Details
                </span>
                <div className="mt-1 font-bold text-slate-100 text-sm">
                  {supplier.companyName || supplier.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 font-mono">
                  Phone: {supplier.phone}
                </div>
                {supplier.address && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    Location: {supplier.address}
                  </div>
                )}
              </div>

              <div className="sm:text-right flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Outstanding Payable
                </span>
                <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                  Rs. {supplier.currentBalance.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  {supplier.currentBalance > 0 ? 'Amount shop currently owes' : 'Account settled / clear'}
                </span>
              </div>
            </div>
          </div>

          {/* Ledger Entries List */}
          <div className="p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Transaction History ({entries.length})
            </h4>

            {loading ? (
              <PageLoader text="Loading ledger entries..." />
            ) : entries.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-slate-800/80 rounded-2xl bg-slate-950/50">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-semibold text-slate-300">No transactions recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => {
                  const entryDate = new Date(entry.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={entry.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            entry.type === 'STOCK_PURCHASE'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {entry.type === 'STOCK_PURCHASE' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-slate-100 text-xs">
                            {entry.type === 'STOCK_PURCHASE' ? 'Stock Purchase (+Payable)' : 'Payment Given (-Payable)'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {entry.notes || '—'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {entryDate} {entry.invoiceNumber ? `· Bill: ${entry.invoiceNumber}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-black text-sm ${
                            entry.type === 'STOCK_PURCHASE' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {entry.type === 'STOCK_PURCHASE' ? '+' : '-'} Rs. {entry.amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Bal: Rs. {entry.balanceAfter.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400 sticky bottom-0">
          <span>HisabFlow Digital Ledger Statement</span>
          <span>Supplier ID: {supplier.id.substring(0, 8)}</span>
        </div>
      </div>
    </div>
  );
};
