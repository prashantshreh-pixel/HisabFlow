'use client';

import React, { useState, useRef } from 'react';
import { useKhata } from '@/context/KhataContext';
import { ButtonSpinner } from '@/components/Loader';
import { SupplierTransactionType } from '@/types';
import { X, Truck, Coins, QrCode, Calendar, FileText, ArrowUpRight, ArrowDownLeft, Hash } from 'lucide-react';

interface RecordSupplierTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSupplierId?: string;
  defaultType?: SupplierTransactionType;
}

export const RecordSupplierTxModal: React.FC<RecordSupplierTxModalProps> = ({
  isOpen,
  onClose,
  defaultSupplierId,
  defaultType = 'STOCK_PURCHASE',
}) => {
  const { suppliers, recordSupplierTransaction } = useKhata();

  const [supplierId, setSupplierId] = useState(defaultSupplierId || (suppliers[0]?.id || ''));
  const [type, setType] = useState<SupplierTransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QR_PAYMENT'>('CASH');
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const dateInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDateBoxClick = () => {
    const el = dateInputRef.current;
    if (el) {
      if (typeof (el as any).showPicker === 'function') {
        (el as any).showPicker();
      } else {
        el.focus();
      }
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!supplierId) newErrors.supplierId = 'Please select a wholesaler / supplier';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) newErrors.amount = 'Valid positive amount required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await recordSupplierTransaction({
        supplierId,
        type,
        amount: numAmount,
        notes: notes.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        paymentMethod,
        date: new Date(date).toISOString(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="record-supplier-tx-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="record-supplier-tx-panel"
        className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Fixed Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                type === 'STOCK_PURCHASE'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {type === 'STOCK_PURCHASE' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-100 truncate">
                {type === 'STOCK_PURCHASE' ? 'Record Stock Purchase' : 'Record Payment Given'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">Update wholesaler ledger balance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="record-supplier-tx-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {/* Transaction Type Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('STOCK_PURCHASE')}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                type === 'STOCK_PURCHASE'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Stock Purchase (+Debt)</span>
            </button>

            <button
              type="button"
              onClick={() => setType('PAYMENT_GIVEN')}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                type === 'PAYMENT_GIVEN'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Payment Given (-Debt)</span>
            </button>
          </div>

          {/* Select Supplier */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              Select Wholesaler / Supplier <span className="text-rose-400">*</span>
            </label>
            <select
              id="supplier-select-input"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">Select Wholesaler...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.companyName ? `(${s.companyName})` : ''} - Due: Rs. {s.currentBalance.toLocaleString()}
                </option>
              ))}
            </select>
            {errors.supplierId && <p className="text-xs text-rose-400 mt-1">{errors.supplierId}</p>}
          </div>

          {/* Current Balance Card */}
          {selectedSupplier && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">Current Outstanding Payable:</span>
              <span className="font-mono font-black text-rose-400 text-sm">
                Rs. {selectedSupplier.currentBalance.toLocaleString()}
              </span>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Amount (Rs.) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">Rs.</span>
              <input
                id="supplier-amount-input"
                type="number"
                min="1"
                step="1"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors({ ...errors, amount: '' });
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-base font-extrabold focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            {errors.amount && <p className="text-xs text-rose-400 mt-1">{errors.amount}</p>}
          </div>

          {/* Payment Method Selector (Cash and QR Pay Only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Payment Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'CASH'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('QR_PAYMENT')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'QR_PAYMENT'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>QR Pay</span>
              </button>
            </div>
          </div>

          {/* Bill / Invoice Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-amber-400" />
              Wholesaler Invoice / Bill # (Optional)
            </label>
            <input
              id="supplier-invoice-input"
              type="text"
              placeholder="e.g. INV-9042"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Date Box (Full Area Clickable) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Transaction Date
            </label>
            <div
              onClick={handleDateBoxClick}
              className="relative w-full px-4 py-3 bg-slate-950 hover:bg-slate-900 border border-slate-700/90 hover:border-amber-500/80 rounded-xl cursor-pointer flex items-center justify-between shadow-md transition-all group select-none"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-100 font-mono">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-[10px] text-slate-400">Click anywhere in this box to change date</span>
                </div>
              </div>
              <span className="text-[11px] text-amber-400 font-bold px-2.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                Change Date
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Particulars / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Particulars / Item Notes (Optional)
            </label>
            <textarea
              id="supplier-notes-input"
              rows={2}
              placeholder="e.g. Purchased 20 Bags Sugar, 10 Cartons Oil"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="flex-none p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            form="record-supplier-tx-form"
            className={`px-5 py-2.5 font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 text-white disabled:opacity-50 ${
              type === 'STOCK_PURCHASE'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <ButtonSpinner className="w-4 h-4 text-white" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{type === 'STOCK_PURCHASE' ? 'Record Purchase' : 'Record Payment'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
