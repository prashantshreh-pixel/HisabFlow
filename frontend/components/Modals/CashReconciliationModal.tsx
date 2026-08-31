'use client';

import React, { useState, useMemo } from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  X,
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Printer,
  Download,
  Store,
  Wallet
} from 'lucide-react';
import { downloadCSV } from '@/lib/exportUtils';

interface CashReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashReconciliationModal: React.FC<CashReconciliationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    ledgerEntries,
    expenses,
    showToast,
    formatDate,
    t
  } = useKhata();

  const [openingCash, setOpeningCash] = useState<number | ''>(1000);
  const [actualCash, setActualCash] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Calculate today's cash flows from ledger and expenses
  const todayCashMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Cash received from customers today
    const cashReceivedFromCustomers = ledgerEntries
      .filter((e) => e.type === 'PAYMENT_RECEIVED' && (e.paymentMethod === 'CASH' || !e.paymentMethod) && e.date.startsWith(todayStr))
      .reduce((sum, e) => sum + e.amount, 0);

    // Cash expenses today
    const cashExpensesPaid = expenses
      .filter((e) => (e.paymentMethod === 'CASH' || !e.paymentMethod) && e.expenseDate.startsWith(todayStr))
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      cashReceivedFromCustomers,
      cashExpensesPaid,
    };
  }, [ledgerEntries, expenses]);

  if (!isOpen) return null;

  const numOpening = Number(openingCash) || 0;
  const numActual = Number(actualCash) || 0;

  // Expected Cash = Opening Cash + Cash Received - Cash Expenses
  const expectedCash = numOpening + todayCashMetrics.cashReceivedFromCustomers - todayCashMetrics.cashExpensesPaid;
  const difference = numActual - expectedCash;

  const isBalanced = actualCash !== '' && difference === 0;
  const isSurplus = actualCash !== '' && difference > 0;
  const isShortage = actualCash !== '' && difference < 0;

  const handleExportReconciliation = () => {
    const headers = ['Metric', 'Amount (Rs.)'];
    const rows = [
      ['Date', new Date().toLocaleDateString()],
      ['Opening Cash Balance', numOpening],
      ['Cash Received from Customers', todayCashMetrics.cashReceivedFromCustomers],
      ['Cash Expenses Paid', todayCashMetrics.cashExpensesPaid],
      ['Expected Cash in Drawer', expectedCash],
      ['Actual Physical Cash Counted', actualCash === '' ? 0 : numActual],
      ['Discrepancy / Tally Difference', difference],
      ['Notes / Remarks', notes || '-'],
    ];

    downloadCSV(`DayEnd_Cash_Reconciliation_${new Date().toISOString().split('T')[0]}`, headers, rows);
    showToast({
      type: 'success',
      title: 'Report Downloaded',
      message: 'Day-end cash reconciliation report exported to CSV.',
    });
  };

  const handleCompleteClosure = () => {
    showToast({
      type: 'success',
      title: 'Register Closed Successfully',
      message: `Day-end cash register tally saved. Expected: Rs. ${expectedCash.toLocaleString()}, Actual: Rs. ${numActual.toLocaleString()}.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100 tracking-tight">
                Day-End Cash Register Reconciliation (रोजिना खाता मिलाउनुहोस्)
              </h3>
              <p className="text-xs text-slate-400">
                Tally physical drawer cash against recorded system sales & expenses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Opening & System Flow Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Opening Cash Input */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Opening Cash (बिहानको नगद)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">Rs.</span>
                <input
                  type="number"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">Cash in drawer at start of day</p>
            </div>

            {/* Actual Cash Input */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-amber-500/30 space-y-1.5">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                Physical Cash Counted (भौतिक नगद)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-amber-400">Rs.</span>
                <input
                  type="number"
                  min="0"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Count & enter total..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-amber-500/50 rounded-xl text-amber-300 text-sm font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
              <p className="text-[10px] text-slate-500">Actual counted money in cash box</p>
            </div>

          </div>

          {/* Ledger Flow Breakdown Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40 p-4 space-y-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Today&apos;s System Cash Flows (आजको प्रणाली नगद विवरण)
            </span>

            <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-slate-500" /> Opening Cash Balance
              </span>
              <span className="font-mono font-bold">Rs. {numOpening.toLocaleString()}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 text-emerald-400">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Cash Customer Payments Received
              </span>
              <span className="font-mono font-bold">+ Rs. {todayCashMetrics.cashReceivedFromCustomers.toLocaleString()}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-800 text-rose-400">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" /> Cash Expenses Paid Today
              </span>
              <span className="font-mono font-bold">- Rs. {todayCashMetrics.cashExpensesPaid.toLocaleString()}</span>
            </div>

            <div className="flex justify-between pt-2 text-sm font-black text-slate-100">
              <span>Expected Total Cash in Drawer:</span>
              <span className="font-mono text-amber-400">Rs. {expectedCash.toLocaleString()}</span>
            </div>
          </div>

          {/* Discrepancy Status Card */}
          {actualCash !== '' && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                isBalanced
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : isSurplus
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {isBalanced ? (
                  <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : isSurplus ? (
                  <TrendingUp className="w-6 h-6 text-amber-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                )}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {isBalanced
                      ? 'Register Balanced (सबै हिसाब मिलेको)'
                      : isSurplus
                      ? 'Cash Excess / Surplus (बढी नगद)'
                      : 'Cash Shortage / Deficit (घटी नगद)'}
                  </h4>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {isBalanced
                      ? 'Physical cash perfectly matches system expectations.'
                      : isSurplus
                      ? `Physical drawer has Rs. ${Math.abs(difference).toLocaleString()} more than expected.`
                      : `Physical drawer is short by Rs. ${Math.abs(difference).toLocaleString()}.`}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-slate-400 block font-mono">Difference</span>
                <span className="text-lg font-black font-mono">
                  {difference > 0 ? `+Rs. ${difference.toLocaleString()}` : `Rs. ${difference.toLocaleString()}`}
                </span>
              </div>
            </div>
          )}

          {/* Remarks Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Closing Remarks / Notes (कैफियत)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Settled cash drawer at 8:00 PM with staff Aayush..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleExportReconciliation}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Report (CSV)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompleteClosure}
              disabled={actualCash === ''}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save & Close Register</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
