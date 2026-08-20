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
  Receipt,
  Printer,
  CheckCircle,
  Copy,
  User,
  FileText
} from 'lucide-react';
import { CreditLedgerEntry } from '@/types';

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
    showToast,
  } = useKhata();

  const [copiedMsg, setCopiedMsg] = useState(false);
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

  const handleCopyReminder = () => {
    const message = `Namaste ${customer.name}, your total outstanding balance at HisabFlow is Rs. ${customer.currentBalance.toLocaleString()}. Please arrange payment at your earliest convenience. Thank you!`;
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

  const printDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <>
      {/* CSS for fast print of essential details only */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-statement, #printable-statement * {
            visibility: visible !important;
          }
          #printable-statement {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 24px !important;
            font-family: inherit !important;
          }
        }
      ` }} />

      {/* Screen Drawer Modal */}
      <div
        id="customer-statement-modal-backdrop"
        className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div
          id="customer-statement-drawer-panel"
          className="w-full max-w-4xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300 text-slate-100"
        >
          {/* Header Ribbon */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20">
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
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
              >
                <Printer className="w-4 h-4" />
                Print Statement
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

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 border-b border-slate-800/80 bg-slate-950/40">
            {/* Outstanding Balance */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Outstanding Dues (Udhaar)
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-400">
                  Rs. {customer.currentBalance.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Current total amount owed to shop</p>
            </div>

            {/* Credit Limit & Progress */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Assigned Credit Limit
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
                  <span>{limitUsedPercent}% credit limit used</span>
                  <span>
                    Rs. {Math.max(0, customer.creditLimit - customer.currentBalance).toLocaleString()} remaining
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Statement Table Header */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-slate-800 bg-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Customer Statement ({ledger.length} Entries)
            </h3>
            <span className="text-[11px] text-slate-400">Chronological transaction history</span>
          </div>

          {/* Statement Table Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingLedger ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm font-medium text-slate-300">Loading statement transactions...</p>
              </div>
            ) : ledger.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-medium text-slate-300">No transactions recorded yet</p>
                <p className="text-xs text-slate-500 mt-1">Recorded Udhaar or repayment entries will appear here.</p>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Type / Mode</th>
                        <th className="py-3 px-4">Remarks</th>
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
                              <p className="font-medium text-slate-200 truncate">{entry.notes || '-'}</p>
                              {entry.billNumber && (
                                <span className="text-[10px] text-amber-400/80 font-mono">
                                  Bill #{entry.billNumber}
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
        </div>
      </div>

      {/* Hidden Essential Print Statement Document (Visible ONLY during print) */}
      <div id="printable-statement" className="hidden">
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>HisabFlow Retail POS</h1>
          <p style={{ fontSize: '13px', margin: '4px 0 0 0', color: '#444' }}>Customer Credit Statement (खाता विवरण)</p>
          <p style={{ fontSize: '11px', margin: '2px 0 0 0', color: '#666' }}>Printed on: {printDate}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '12px' }}>
          <div>
            <strong>Customer Details:</strong>
            <div>Name: {customer.name}</div>
            <div>Phone: {customer.phone}</div>
            <div>Address: {customer.address || 'N/A'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Credit Limit: Rs. {customer.creditLimit.toLocaleString()}</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', color: '#b91c1c' }}>
              Total Dues (Udhaar): Rs. {customer.currentBalance.toLocaleString()}
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000', background: '#f3f4f6' }}>
              <th style={{ padding: '6px' }}>Date</th>
              <th style={{ padding: '6px' }}>Type</th>
              <th style={{ padding: '6px' }}>Remarks</th>
              <th style={{ padding: '6px', textAlign: 'right' }}>Udhaar (Debit)</th>
              <th style={{ padding: '6px', textAlign: 'right' }}>Payment (Credit)</th>
              <th style={{ padding: '6px', textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((entry) => {
              const isPurchase = entry.type === 'CREDIT_PURCHASE';
              const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <tr key={entry.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '6px' }}>{formattedDate}</td>
                  <td style={{ padding: '6px' }}>{isPurchase ? 'Udhaar' : 'Repayment'}</td>
                  <td style={{ padding: '6px' }}>{entry.notes || '-'}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{isPurchase ? `Rs. ${entry.amount.toLocaleString()}` : '-'}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{!isPurchase ? `Rs. ${entry.amount.toLocaleString()}` : '-'}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>Rs. {entry.balanceAfter.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #ddd', fontSize: '11px', textAlign: 'center', color: '#666' }}>
          Thank you for your business! — HisabFlow Digital Retail System
        </div>
      </div>
    </>
  );
};
