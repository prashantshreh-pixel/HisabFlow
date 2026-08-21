'use client';

import React, { useState, useRef } from 'react';
import { useKhata } from '@/context/KhataContext';
import { ButtonSpinner } from '@/components/Loader';
import { ExpenseCategory } from '@/types';
import { X, Receipt, Coins, QrCode, Tag, Calendar, FileText } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent & Lease',
  'Electricity & Utilities',
  'Staff Salaries & Wages',
  'Tea, Snacks & Refreshment',
  'Freight & Transport',
  'Packaging & Supplies',
  'Maintenance & Repairs',
  'General Operational',
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose }) => {
  const { addExpense } = useKhata();

  const [category, setCategory] = useState<ExpenseCategory>('Rent & Lease');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QR_PAYMENT'>('CASH');
  const [particulars, setParticulars] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().substring(0, 10));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) newErrors.title = 'Expense description/title is required';
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) newErrors.amount = 'Valid positive expense amount required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      // 1 = Cash, 2 = QrPayment (Matches C# PaymentMethod enum in HisabFlow.Domain.Enums)
      const paymentMethodEnum = paymentMethod === 'CASH' ? 1 : 2;

      await addExpense({
        category,
        title: title.trim(),
        amount: numAmount,
        paymentMethod: paymentMethodEnum as any,
        particulars: particulars.trim() || undefined,
        expenseDate: new Date(expenseDate).toISOString(),
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
      id="add-expense-modal-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="add-expense-drawer-panel"
        className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Fixed Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-100 truncate">Log Shop Expense</h3>
              <p className="text-[11px] text-slate-400 truncate">Record operational & store costs</p>
            </div>
          </div>
          <button
            id="close-expense-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="expense-drawer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {/* Category Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              Expense Category <span className="text-rose-400">*</span>
            </label>
            <select
              id="expense-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Title / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Expense Description / Purpose <span className="text-rose-400">*</span>
            </label>
            <input
              id="expense-title-input"
              type="text"
              required
              placeholder="e.g. August Store Rent, Electricity Bill, Tea/Khaja"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
            />
            {errors.title && <p className="text-xs text-rose-400 mt-1">{errors.title}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-rose-400" />
              Expense Amount (Rs.) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">Rs.</span>
              <input
                id="expense-amount-input"
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
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-base font-extrabold focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
            {errors.amount && <p className="text-xs text-rose-400 mt-1">{errors.amount}</p>}
          </div>

          {/* Payment Method Selector (Cash & QR Pay only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Paid Via
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'CASH'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('QR_PAYMENT')}
                className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'QR_PAYMENT'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>QR Pay</span>
              </button>
            </div>
          </div>

          {/* Unique Clickable Date Selector Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Date Spent
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
                    {new Date(expenseDate + 'T00:00:00').toLocaleDateString('en-US', {
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
              {/* Full Box Overlay Input */}
              <input
                ref={dateInputRef}
                id="expense-date-input"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Particulars / Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Notes / Voucher Ref (Optional)
            </label>
            <textarea
              id="expense-particulars-input"
              rows={2}
              placeholder="e.g. Paid to Ram Shrestha (Electrician), Invoice #104"
              value={particulars}
              onChange={(e) => setParticulars(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
          </div>
        </form>

        {/* Fixed Footer Actions */}
        <div className="flex-none p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 z-20">
          <button
            id="cancel-expense-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            id="save-expense-btn"
            type="submit"
            disabled={isSubmitting}
            form="expense-drawer-form"
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <ButtonSpinner className="w-4 h-4 text-white" />
                <span>Saving Expense...</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4" />
                <span>Save Expense</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
