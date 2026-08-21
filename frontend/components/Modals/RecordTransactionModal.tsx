'use client';

import React, { useState } from 'react';
import { useKhata } from '@/context/KhataContext';
import { ButtonSpinner } from '@/components/Loader';
import { LedgerTransactionType } from '@/types';
import { X, ArrowDownLeft, ArrowUpRight, Search, Receipt, Calendar, CreditCard, Banknote, QrCode, User, FileText } from 'lucide-react';

interface RecordTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCustomerId?: string;
  defaultType?: LedgerTransactionType;
}

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultCustomerId,
  defaultType = 'PAYMENT_RECEIVED',
}) => {
  const { customers, recordTransaction } = useKhata();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    () => defaultCustomerId || (customers.length > 0 ? customers[0].id : '')
  );
  const [type, setType] = useState<LedgerTransactionType>(() => defaultType);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QR_PAYMENT'>('CASH');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer');
      return;
    }

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      await recordTransaction({
        customerId: selectedCustomerId,
        type,
        amount: amtNum,
        notes: notes.trim(),
        paymentMethod: type === 'PAYMENT_RECEIVED' ? paymentMethod : undefined,
        billNumber: billNumber.trim() || undefined,
      });

      setAmount('');
      setNotes('');
      setBillNumber('');
      setError('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPayment = type === 'PAYMENT_RECEIVED';

  // Quick preset amount buttons
  const presetAmounts = isPayment && selectedCustomer && selectedCustomer.currentBalance > 0
    ? [500, 1000, 2000, selectedCustomer.currentBalance]
    : [200, 500, 1000, 2500];

  return (
    <div
      id="record-tx-modal-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Right-Side Slide Drawer */}
      <div
        id="record-tx-drawer-panel"
        className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Fixed Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isPayment
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {isPayment ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-100 truncate">
                {isPayment ? 'Record Repayment (रकम प्राप्त)' : 'Give Credit / Udhaar (उधार बिक्री)'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {isPayment ? 'Slide-over drawer • Log customer payment received' : 'Slide-over drawer • Log credit goods given to customer'}
              </p>
            </div>
          </div>
          <button
            id="close-record-tx-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="record-tx-drawer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Type Toggle Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                id="tab-payment-received"
                type="button"
                onClick={() => setType('PAYMENT_RECEIVED')}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                  isPayment
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Receive Payment (जम्मा)
              </button>
              <button
                id="tab-credit-purchase"
                type="button"
                onClick={() => setType('CREDIT_PURCHASE')}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                  !isPayment
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Give Udhaar (नामे)
              </button>
            </div>

            {/* Customer Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Select Customer <span className="text-rose-400">*</span>
              </label>

              <select
                id="select-tx-customer"
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - Due: Rs. {c.currentBalance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer mini status card */}
            {selectedCustomer && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">Current Outstanding Balance:</span>
                  <div className="text-base font-extrabold text-rose-400 mt-0.5">
                    Rs. {selectedCustomer.currentBalance.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">Credit Limit:</span>
                  <div className="text-xs font-semibold text-slate-300 mt-0.5">
                    Rs. {selectedCustomer.creditLimit.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Transaction Amount (रकम) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-base">Rs.</span>
                <input
                  id="tx-amount-input"
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Quick preset buttons */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[11px] text-slate-500">Quick:</span>
                {presetAmounts.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors font-medium"
                  >
                    Rs. {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method (for Repayment) */}
            {isPayment && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QR_PAYMENT')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'QR_PAYMENT'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    FonePay / QR
                  </button>
                </div>
              </div>
            )}

            {/* Bill / Invoice number (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                Bill / Token Number (Optional)
              </label>
              <input
                id="tx-bill-input"
                type="text"
                placeholder="e.g. INV-9042, Slip #14"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Remarks
              </label>
              <textarea
                id="tx-notes-input"
                rows={2}
                placeholder={isPayment ? 'e.g. Partial repayment via QR' : 'e.g. 5kg Rice, 2pkt Salt, 1L Oil'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
              />
            </div>

            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
          </form>

        {/* Fixed Footer Actions */}
        <div className="flex-none p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 z-20">
          <button
            id="cancel-record-tx-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            id="save-tx-btn"
            type="submit"
            disabled={isSubmitting}
            form="record-tx-drawer-form"
            className={`px-5 py-2.5 font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 text-white disabled:opacity-50 ${
              isPayment
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <ButtonSpinner className="w-4 h-4 text-white" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {isPayment ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                <span>{isPayment ? 'Record Repayment' : 'Confirm Udhaar (Credit)'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
