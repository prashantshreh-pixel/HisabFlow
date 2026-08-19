'use client';

import React, { useState, useEffect } from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  X,
  Phone,
  MapPin,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Receipt,
  MessageSquare,
  Clock,
  Printer,
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  Copy,
} from 'lucide-react';
import { LedgerTransactionType, CreditLedgerEntry } from '@/types';

interface CustomerStatementModalProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  customerId,
  isOpen,
  onClose,
}) => {
  const {
    getCustomerById,
    getCustomerLedger,
    recordTransaction,
    updateCustomer,
    deleteCustomer,
    showToast,
  } = useKhata();

  const [activeTab, setActiveTab] = useState<'LEDGER' | 'QUICK_TRANSACTION' | 'SETTINGS'>('LEDGER');
  const [inlineType, setInlineType] = useState<LedgerTransactionType>('PAYMENT_RECEIVED');
  const [inlineAmount, setInlineAmount] = useState('');
  const [inlineNotes, setInlineNotes] = useState('');
  const [inlinePaymentMethod, setInlinePaymentMethod] = useState<'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER'>('CASH');
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Edit customer state
  const [editLimit, setEditLimit] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [localLedger, setLocalLedger] = useState<CreditLedgerEntry[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      const loadLedger = async () => {
        setIsLoadingLedger(true);
        const data = await getCustomerLedger(customerId);
        setLocalLedger(data);
        setIsLoadingLedger(false);
      };
      loadLedger();
    }
  }, [customerId, isOpen]);

  if (!isOpen || !customerId) return null;

  const customer = getCustomerById(customerId);
  if (!customer) return null;

  const ledger = localLedger;

  const limitUsedPercent = Math.min(100, Math.round((customer.currentBalance / Math.max(1, customer.creditLimit)) * 100));
  const isOverLimit = customer.currentBalance > customer.creditLimit;

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(inlineAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount',
      });
      return;
    }

    const entry = await recordTransaction({
      customerId: customer.id,
      type: inlineType,
      amount: amt,
      notes: inlineNotes.trim(),
      paymentMethod: inlineType === 'PAYMENT_RECEIVED' ? inlinePaymentMethod : undefined,
    });

    if (entry) {
      const data = await getCustomerLedger(customer.id);
      setLocalLedger(data);
    }

    setInlineAmount('');
    setInlineNotes('');
    setActiveTab('LEDGER');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCustomer(customer.id, {
      creditLimit: parseFloat(editLimit) || customer.creditLimit,
      phone: editPhone.trim() || customer.phone,
      address: editAddress.trim() || customer.address,
    });
    setIsEditingProfile(false);
  };

  const handleCopyReminder = () => {
    const message = `Namaste ${customer.name}, your total outstanding balance at PasalKhata is Rs. ${customer.currentBalance.toLocaleString()}. Please arrange payment via Cash or Fonepay QR at your earliest convenience. Thank you!`;
    navigator.clipboard?.writeText(message);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 3000);
    showToast({
      type: 'info',
      title: 'Reminder Copied',
      message: 'Payment reminder message copied to clipboard.',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="customer-statement-modal-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="customer-statement-drawer-panel"
        className="w-full max-w-4xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Header Ribbon */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shadow-inner">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-100">{customer.name}</h2>
                {isOverLimit && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Over Limit
                  </span>
                )}
                {customer.currentBalance === 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Settled (All Clear)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" /> {customer.phone}
                </span>
                {customer.address && (
                  <span className="hidden sm:flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" /> {customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id="copy-reminder-btn"
              type="button"
              onClick={handleCopyReminder}
              title="Copy SMS / WhatsApp reminder"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              {copiedMsg ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              {copiedMsg ? 'Copied' : 'Reminder Msg'}
            </button>
            <button
              id="print-statement-btn"
              type="button"
              onClick={handlePrint}
              title="Print Statement"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              id="close-statement-modal-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Metric Cards & Balance Gauge */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-6 border-b border-slate-800/80 bg-slate-950/40">
          {/* Outstanding Balance */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Udhaar (Due)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400">
                Rs. {customer.currentBalance.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Amount owed to store</p>
          </div>

          {/* Credit Limit & Progress */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Credit Limit
              </span>
              <span className="text-xs font-bold text-slate-300">
                Rs. {customer.creditLimit.toLocaleString()}
              </span>
            </div>
            <div className="mt-2.5">
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isOverLimit
                      ? 'bg-rose-500'
                      : limitUsedPercent > 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, limitUsedPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>{limitUsedPercent}% used</span>
                <span>
                  Rs. {Math.max(0, customer.creditLimit - customer.currentBalance).toLocaleString()} remaining
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions / Action Toggle */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quick Action
            </span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                id="drawer-receive-payment-btn"
                type="button"
                onClick={() => {
                  setInlineType('PAYMENT_RECEIVED');
                  setActiveTab('QUICK_TRANSACTION');
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Receive Pay
              </button>
              <button
                id="drawer-give-credit-btn"
                type="button"
                onClick={() => {
                  setInlineType('CREDIT_PURCHASE');
                  setActiveTab('QUICK_TRANSACTION');
                }}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-rose-600/20"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Add Udhaar
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Record repayment or fresh credit</p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-800 bg-slate-900">
          <div className="flex gap-4">
            <button
              id="tab-statement-ledger"
              type="button"
              onClick={() => setActiveTab('LEDGER')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'LEDGER'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Transaction Ledger ({ledger.length})
            </button>
            <button
              id="tab-statement-add-tx"
              type="button"
              onClick={() => setActiveTab('QUICK_TRANSACTION')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'QUICK_TRANSACTION'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              + Record Entry
            </button>
            <button
              id="tab-statement-settings"
              type="button"
              onClick={() => {
                setEditLimit(customer.creditLimit.toString());
                setEditPhone(customer.phone);
                setEditAddress(customer.address || '');
                setActiveTab('SETTINGS');
              }}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'SETTINGS'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Customer Profile
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'LEDGER' && (
            <div className="space-y-4">
              {ledger.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-sm font-medium text-slate-300">No transactions recorded yet</p>
                  <p className="text-xs text-slate-500 mt-1">Use the Record Entry tab to add credit purchases or repayments.</p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Type / Mode</th>
                          <th className="py-3 px-4">Description / Bill #</th>
                          <th className="py-3 px-4 text-right">Debit (Udhaar)</th>
                          <th className="py-3 px-4 text-right">Credit (Repaid)</th>
                          <th className="py-3 px-4 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {ledger.map((entry) => {
                          const isPurchase = entry.type === 'CREDIT_PURCHASE';
                          const dateObj = new Date(entry.date);
                          const formattedDate = dateObj.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          });
                          const formattedTime = dateObj.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-mono text-slate-300">
                                <div>{formattedDate}</div>
                                <div className="text-[10px] text-slate-500">{formattedTime}</div>
                              </td>

                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                    isPurchase
                                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                  }`}
                                >
                                  {isPurchase ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                  ) : (
                                    <ArrowDownLeft className="w-3 h-3" />
                                  )}
                                  {isPurchase ? 'Udhaar' : 'Repayment'}
                                </span>
                                {entry.paymentMethod && (
                                  <span className="block text-[10px] text-slate-400 mt-0.5">
                                    {entry.paymentMethod}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 max-w-xs">
                                <p className="font-medium text-slate-200 truncate">{entry.notes}</p>
                                {entry.billNumber && (
                                  <span className="text-[10px] text-amber-400/80 font-mono">
                                    #{entry.billNumber}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right font-bold text-rose-400">
                                {isPurchase ? `Rs. ${entry.amount.toLocaleString()}` : '-'}
                              </td>

                              <td className="py-3 px-4 text-right font-bold text-emerald-400">
                                {!isPurchase ? `Rs. ${entry.amount.toLocaleString()}` : '-'}
                              </td>

                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                                Rs. {entry.balanceAfter.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'QUICK_TRANSACTION' && (
            <div className="max-w-md mx-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-md">
              <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                Record Transaction for {customer.name}
              </h3>

              <form onSubmit={handleInlineSubmit} className="space-y-4">
                {/* Type Selection */}
                <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInlineType('PAYMENT_RECEIVED')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      inlineType === 'PAYMENT_RECEIVED'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    Receive Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setInlineType('CREDIT_PURCHASE')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      inlineType === 'CREDIT_PURCHASE'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Give Credit (Udhaar)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Amount (Rs.) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="0.00"
                    value={inlineAmount}
                    onChange={(e) => setInlineAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-lg font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  {inlineType === 'PAYMENT_RECEIVED' && customer.currentBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setInlineAmount(customer.currentBalance.toString())}
                      className="mt-1.5 text-xs text-amber-400 hover:underline font-semibold"
                    >
                      Fill Total Balance: Rs. {customer.currentBalance.toLocaleString()}
                    </button>
                  )}
                </div>

                {inlineType === 'PAYMENT_RECEIVED' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Payment Channel
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['CASH', 'QR_PAYMENT', 'BANK_TRANSFER'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setInlinePaymentMethod(method)}
                          className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                            inlinePaymentMethod === method
                              ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {method === 'CASH' ? 'Cash' : method === 'QR_PAYMENT' ? 'Fonepay' : 'Bank'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Description / Items / Notes
                  </label>
                  <input
                    type="text"
                    placeholder={
                      inlineType === 'PAYMENT_RECEIVED'
                        ? 'e.g. Payment for grocery items'
                        : 'e.g. 2kg Rice, 1L Milk, 5 pkt Wai Wai'
                    }
                    value={inlineNotes}
                    onChange={(e) => setInlineNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                    inlineType === 'PAYMENT_RECEIVED'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  }`}
                >
                  {inlineType === 'PAYMENT_RECEIVED' ? 'Save Repayment' : 'Add to Udhaar Ledger'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="max-w-lg mx-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-1">Customer Information & Limits</h3>
                <p className="text-xs text-slate-400">Update credit rules and contact information for this customer.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Credit Limit (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editLimit}
                    onChange={(e) => setEditLimit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all"
                >
                  Save Profile Changes
                </button>
              </form>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-rose-400">Delete Customer Record</h4>
                  <p className="text-[11px] text-slate-500">Permanently remove customer and ledger history.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete ${customer.name}? This cannot be undone.`)) {
                      await deleteCustomer(customer.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/30 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
