'use client';

import React from 'react';
import { Sale } from '@/types';
import { X, Printer, Store, CheckCircle, Receipt, ArrowRight } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, isOpen, onClose }) => {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPaymentLabel = (method: number) => {
    switch (method) {
      case 1:
        return 'Cash';
      case 2:
        return 'QR Pay (Fonepay/eSewa)';
      case 3:
        return 'Customer Khata (Credit)';
      case 4:
        return 'Split Payment';
      default:
        return 'Cash';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white">
        
        {/* Header - Screen only */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100 tracking-tight">
                Sale Completed
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {sale.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 print:p-0 print:m-0 print:overflow-visible">
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-inner font-mono text-xs space-y-4 text-slate-200 print:bg-white print:text-black print:border-none print:p-0 print:m-0">
            
            {/* Shop Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-700 print:border-black">
              <div className="flex items-center justify-center gap-1.5 font-sans font-black text-base text-slate-100 print:text-black">
                <Store className="w-4 h-4 text-amber-400 print:text-black" />
                <span>Hisab<span className="text-amber-400 print:text-black">Flow</span> Store</span>
              </div>
              <p className="text-[11px] text-slate-400 print:text-slate-700">Kathmandu, Nepal • Phone: 98XXXXXXXX</p>
              <p className="text-[10px] text-slate-500 print:text-slate-600 font-bold uppercase tracking-wider">
                Tax Invoice / Cash Bill
              </p>
            </div>

            {/* Bill Meta Details */}
            <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-700 print:border-black">
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-slate-700">Invoice No:</span>
                <span className="font-bold text-slate-100 print:text-black">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-slate-700">Date & Time:</span>
                <span>{new Date(sale.saleDate).toLocaleString()}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-700">Customer:</span>
                  <span className="font-bold text-slate-100 print:text-black">{sale.customerName} {sale.customerPhone ? `(${sale.customerPhone})` : ''}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-slate-700">Payment Mode:</span>
                <span className="font-semibold text-amber-300 print:text-black">{getPaymentLabel(sale.paymentMethod)}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2 pb-3 border-b border-dashed border-slate-700 print:border-black">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 print:text-slate-700 pb-1 border-b border-slate-800 print:border-slate-300">
                <span className="w-1/2">Item Description</span>
                <span className="w-1/4 text-center">Qty x Rate</span>
                <span className="w-1/4 text-right">Amount</span>
              </div>

              <div className="space-y-1.5">
                {sale.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start text-[11px]">
                    <div className="w-1/2 pr-1 font-medium truncate">
                      {item.productName}
                    </div>
                    <div className="w-1/4 text-center text-slate-400 print:text-slate-700">
                      {item.quantity} {item.unit} x {item.unitPrice}
                    </div>
                    <div className="w-1/4 text-right font-bold text-slate-100 print:text-black">
                      Rs. {item.subtotal.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Calculations */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400 print:text-slate-700">
                <span>Subtotal:</span>
                <span>Rs. {sale.subtotal.toLocaleString()}</span>
              </div>

              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 print:text-emerald-800">
                  <span>Discount:</span>
                  <span>- Rs. {sale.discountAmount.toLocaleString()}</span>
                </div>
              )}

              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-slate-400 print:text-slate-700">
                  <span>VAT / Tax (13%):</span>
                  <span>+ Rs. {sale.taxAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black pt-1.5 border-t border-slate-700 print:border-black text-slate-100 print:text-black">
                <span>Grand Total:</span>
                <span>Rs. {sale.totalAmount.toLocaleString()}</span>
              </div>

              {/* Payment Details */}
              <div className="pt-2 border-t border-dashed border-slate-700 print:border-black space-y-1 text-[11px]">
                {sale.paymentMethod === 1 && (
                  <>
                    <div className="flex justify-between text-slate-300 print:text-black">
                      <span>Cash Tendered:</span>
                      <span className="font-bold">Rs. {sale.paidAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-300 print:text-black">
                      <span>Change / Return:</span>
                      <span>Rs. {sale.changeAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}

                {sale.paymentMethod === 2 && (
                  <div className="flex justify-between text-emerald-400 print:text-black">
                    <span>Paid via QR Code:</span>
                    <span className="font-bold">Rs. {sale.digitalPaid || sale.totalAmount}</span>
                  </div>
                )}

                {sale.paymentMethod === 3 && (
                  <div className="flex justify-between text-rose-400 print:text-black font-bold">
                    <span>Added to Khata (Due):</span>
                    <span>Rs. {sale.creditPaid || sale.totalAmount}</span>
                  </div>
                )}

                {sale.paymentMethod === 4 && (
                  <>
                    <div className="flex justify-between">
                      <span>Cash Paid:</span>
                      <span>Rs. {sale.cashPaid.toLocaleString()}</span>
                    </div>
                    {sale.digitalPaid > 0 && (
                      <div className="flex justify-between">
                        <span>QR Paid:</span>
                        <span>Rs. {sale.digitalPaid.toLocaleString()}</span>
                      </div>
                    )}
                    {sale.creditPaid > 0 && (
                      <div className="flex justify-between text-rose-400 print:text-black font-bold">
                        <span>Khata Due:</span>
                        <span>Rs. {sale.creditPaid.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Receipt Footer Note */}
            <div className="text-center pt-3 border-t border-dashed border-slate-700 print:border-black text-[10px] text-slate-400 print:text-slate-600 space-y-0.5">
              <p className="font-semibold">*** Thank You! Please Visit Again ***</p>
              <p className="text-[9px] opacity-70">Powered by HisabFlow POS System</p>
            </div>
          </div>
        </div>

        {/* Footer Actions - Screen only */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
};