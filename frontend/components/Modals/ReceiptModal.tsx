'use client';

import React, { useState } from 'react';
import { Sale, DEFAULT_STORE_PROFILE } from '@/types';
import { useKhata } from '@/context/KhataContext';
import { formatLocalTime } from '@/lib/utils';
import { X, Printer, Store, CheckCircle, Sun, Moon, RotateCcw, MessageCircle, Send } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onRefundSale?: (sale: Sale) => void;
  canRefund?: boolean;
}

const numToWords = (num: number, cur: string): string => {
  if (num === 0) return `${cur} Zero Only`;
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  };
  return `${cur} ${convert(Math.floor(num))} Only`;
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
  onRefundSale,
  canRefund = false,
}) => {
  const { storeProfile, formatDate, language, t, showToast } = useKhata();
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm' | 'A4'>('80mm');
  const [receiptTheme, setReceiptTheme] = useState<'light' | 'dark'>('light');
  const [showWaPhoneBar, setShowWaPhoneBar] = useState<boolean>(false);
  const [customWaPhone, setCustomWaPhone] = useState<string>('');
  const profile = storeProfile || DEFAULT_STORE_PROFILE;

  if (!isOpen || !sale) return null;

  const cur = profile.currencySymbol || 'Rs.';
  const formattedBillDate = formatDate(sale.saleDate);
  const formattedBillTime = formatLocalTime(sale.saleDate);

  const handlePrint = () => {
    window.print();
  };

  const getPaymentLabel = (method: number) => {
    switch (method) {
      case 1:
        return language === 'np' ? 'नगद (Cash)' : 'Cash';
      case 2:
        return language === 'np' ? 'QR पे (Fonepay/eSewa)' : 'QR Pay (Fonepay/eSewa)';
      case 3:
        return language === 'np' ? 'ग्राहक खाता (उधारो)' : 'Customer Khata (Credit)';
      case 4:
        return language === 'np' ? 'मिश्रित भुक्तानी (Split)' : 'Split Payment';
      default:
        return language === 'np' ? 'नगद (Cash)' : 'Cash';
    }
  };

  const sendWhatsAppReceipt = (rawPhone: string) => {
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      showToast({
        type: 'warning',
        title: language === 'np' ? 'मोबाइल नम्बर आवश्यक' : 'Phone Number Required',
        message:
          language === 'np'
            ? 'कृपया ग्राहकको सही १० अंकको मोबाइल नम्बर राख्नुहोस्।'
            : 'Please enter a valid customer mobile number to share the bill on WhatsApp.',
      });
      setShowWaPhoneBar(true);
      return;
    }
    const targetPhone = cleanPhone.length === 10 ? `977${cleanPhone}` : cleanPhone;

    const itemLines = sale.items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.productName} (${item.quantity} x ${cur}${item.unitPrice}) = *${cur}${item.subtotal.toLocaleString()}*`
      )
      .join('\n');

    const statusLine = sale.isRefunded
      ? language === 'np'
        ? '\n⚠️ *स्थिति: फिर्ता गरिएको बिल (REFUNDED)*\n'
        : '\n⚠️ *STATUS: REFUNDED / RETURNED*\n'
      : '';

    const message =
      language === 'np'
        ? `*${profile.storeName}*\n${profile.address ? `${profile.address}\n` : ''}${statusLine}🧾 *बिल नं:* ${sale.invoiceNumber}\n📅 *मिति:* ${formattedBillDate} (${formattedBillTime})\n👤 *ग्राहक:* ${sale.customerName || 'Walk-in Customer'}\n────────────────\n${itemLines}\n────────────────\n${sale.discountAmount > 0 ? `छुट: -${cur} ${sale.discountAmount.toLocaleString()}\n` : ''}${sale.taxAmount > 0 ? `भ्याट (13%): ${cur} ${sale.taxAmount.toLocaleString()}\n` : ''}💰 *जम्मा रकम: ${cur} ${sale.totalAmount.toLocaleString()}*\n💳 *भुक्तानी माध्यम:* ${getPaymentLabel(sale.paymentMethod)}${sale.creditPaid > 0 ? `\n📒 *खाता बाँकी (उधारो): ${cur} ${sale.creditPaid.toLocaleString()}*` : ''}\n\n_${profile.receiptFooter || 'हामीलाई सम्झनुभएकोमा धन्यवाद!'}_`
        : `*${profile.storeName}*\n${profile.address ? `${profile.address}\n` : ''}${statusLine}🧾 *Bill No:* ${sale.invoiceNumber}\n📅 *Date:* ${formattedBillDate} (${formattedBillTime})\n👤 *Customer:* ${sale.customerName || 'Walk-in Customer'}\n────────────────\n${itemLines}\n────────────────\n${sale.discountAmount > 0 ? `Discount: -${cur} ${sale.discountAmount.toLocaleString()}\n` : ''}${sale.taxAmount > 0 ? `VAT (13%): ${cur} ${sale.taxAmount.toLocaleString()}\n` : ''}💰 *Grand Total: ${cur} ${sale.totalAmount.toLocaleString()}*\n💳 *Payment Mode:* ${getPaymentLabel(sale.paymentMethod)}${sale.creditPaid > 0 ? `\n📒 *Khata Due: ${cur} ${sale.creditPaid.toLocaleString()}*` : ''}\n\n_${profile.receiptFooter || 'Thank you for shopping with us!'}_`;

    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setShowWaPhoneBar(false);
  };

  const handleWhatsAppButtonClick = () => {
    const initialPhone = (customWaPhone || sale.customerPhone || '').trim();
    if (initialPhone && !showWaPhoneBar) {
      sendWhatsAppReceipt(initialPhone);
    } else {
      setCustomWaPhone(sale.customerPhone || '');
      setShowWaPhoneBar((prev) => !prev);
    }
  };

  const isDark = receiptTheme === 'dark';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${paperSize === 'A4' ? 'A4 portrait' : `${paperSize} auto`};
            margin: ${paperSize === 'A4' ? '12mm 15mm' : '0'};
          }
          html, body {
            background: ${isDark ? '#0f172a' : '#ffffff'} !important;
            color: ${isDark ? '#f8fafc' : '#000000'} !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #receipt-modal-wrapper, #receipt-modal-wrapper * {
            visibility: visible !important;
          }
          #receipt-modal-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: ${isDark ? '#0f172a' : '#ffffff'} !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #receipt-printable-content {
            visibility: visible !important;
            display: block !important;
            width: ${paperSize === '58mm' ? '58mm' : paperSize === '80mm' ? '80mm' : '100%'} !important;
            max-width: ${paperSize === '58mm' ? '58mm' : paperSize === '80mm' ? '80mm' : '100%'} !important;
            margin: 0 auto !important;
            padding: ${paperSize === '58mm' ? '2mm' : paperSize === '80mm' ? '4mm' : '0'} !important;
            background: ${isDark ? '#0f172a' : '#ffffff'} !important;
            color: ${isDark ? '#f8fafc' : '#000000'} !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      ` }} />

      <div id="receipt-modal-wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white print:block print:inset-auto print:absolute">
        <div className={`relative w-full ${
          paperSize === 'A4' ? 'max-w-4xl' : paperSize === '58mm' ? 'max-w-sm' : 'max-w-md'
        } bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300 print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:bg-white print:overflow-visible print:block print:max-h-none print:h-auto`}>
        
          {/* Header - Screen only */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 print:hidden shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border ${
                sale.isRefunded
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {sale.isRefunded ? <RotateCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-100 tracking-tight">
                    {sale.isRefunded
                      ? language === 'np' ? 'फिर्ता गरिएको बिल (Refunded)' : 'Sale Refunded / Returned'
                      : language === 'np' ? 'बिक्री सम्पन्न भयो' : 'Sale Completed'}
                  </h3>
                  {sale.isRefunded && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase">
                      {t('refunded')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  {sale.invoiceNumber} • {formattedBillDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!sale.isRefunded && canRefund && onRefundSale && (
                <button
                  type="button"
                  onClick={() => onRefundSale(sale)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title={language === 'np' ? 'यो बिल फिर्ता गर्नुहोस्' : 'Refund & Return this bill'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('refund')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Receipt Paper Container with Sleek Minimal App Scrollbar */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 print:p-0 print:m-0 print:overflow-visible custom-scrollbar">
            <div
              id="receipt-printable-content"
              className={`transition-all duration-200 ${
                paperSize === 'A4' ? 'w-full max-w-3xl mx-auto rounded-2xl p-6 sm:p-8 shadow-2xl print:shadow-none print:p-0 print:rounded-none' :
                paperSize === '58mm' ? 'w-[58mm] max-w-[58mm] mx-auto p-3.5 shadow-2xl rounded-sm print:shadow-none print:p-0 print:rounded-none' :
                'w-[80mm] max-w-[80mm] mx-auto p-6 shadow-2xl rounded-sm print:shadow-none print:p-0 print:rounded-none'
              } ${
                isDark ? 'bg-slate-950 text-slate-100 border border-slate-800' : 'bg-white text-black'
              }`}
            >

              {/* ======================================================== */}
              {/* LAYOUT 1: FULL A4 TAX INVOICE                            */}
              {/* ======================================================== */}
              {paperSize === 'A4' ? (
                <div className="space-y-6">
                  {/* Business & Invoice Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-dashed border-current">
                    <div>
                      <div className="flex items-center gap-2">
                        <Store className={`w-6 h-6 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600 print:text-black'}`} />
                        <h1 className="text-2xl font-black uppercase tracking-tight">{profile.storeName}</h1>
                      </div>
                      {profile.tagline && (
                        <p className="text-xs font-semibold italic mt-0.5 opacity-80">** {profile.tagline} **</p>
                      )}
                      <div className="text-xs space-y-0.5 mt-2 opacity-90">
                        {profile.address && <p>{profile.address}</p>}
                        {profile.phone && <p>Tel / Mobile: {profile.phone}</p>}
                        {profile.panNumber && <p className="font-bold">PAN / VAT Reg No: {profile.panNumber}</p>}
                      </div>
                    </div>

                    <div className="sm:text-right space-y-1">
                      <span className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                        isDark ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30' : 'bg-slate-900 text-white print:bg-black print:text-white'
                      }`}>
                        {sale.taxAmount > 0 ? 'Tax Invoice' : 'Tax Invoice / Cash Bill'}
                      </span>
                      <p className="text-lg font-mono font-bold mt-1">{sale.invoiceNumber}</p>
                      <p className="text-xs opacity-80">
                        Date: {formattedBillDate} {formattedBillTime}
                      </p>
                      <p className="text-xs opacity-80">Payment Mode: <strong>{getPaymentLabel(sale.paymentMethod)}</strong></p>
                    </div>
                  </div>

                  {/* Customer / Billed To Section */}
                  <div className={`p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-4 text-xs ${
                    isDark ? 'bg-slate-900/60 border border-slate-800' : 'bg-slate-50 border border-slate-200 print:bg-transparent print:border-black'
                  }`}>
                    <div>
                      <span className="font-bold uppercase tracking-wider text-[10px] opacity-70">Billed To:</span>
                      <p className="text-sm font-bold mt-0.5">{sale.customerName || 'Walk-In Customer'}</p>
                      <p className="opacity-80">Transaction Type: Retail Counter Sale</p>
                    </div>
                    <div className="sm:text-right">
                      <span className="font-bold uppercase tracking-wider text-[10px] opacity-70">Settlement Status:</span>
                      <p className={`text-sm font-bold print:text-black mt-0.5 ${sale.isRefunded ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {sale.isRefunded ? 'REFUNDED & RETURNED' : 'COMPLETED & SETTLED'}
                      </p>
                      <p className="opacity-80">Mode: {getPaymentLabel(sale.paymentMethod)}</p>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className={`border-y ${
                          isDark ? 'border-slate-800 bg-slate-900/80 text-slate-300' : 'border-slate-300 bg-slate-100 text-slate-800 print:border-black print:bg-transparent'
                        }`}>
                          <th className="py-2.5 px-3 w-12 text-center font-bold">#</th>
                          <th className="py-2.5 px-3 font-bold">Particulars / Item Description</th>
                          <th className="py-2.5 px-3 w-24 text-right font-bold">Qty</th>
                          <th className="py-2.5 px-3 w-28 text-right font-bold">Rate ({cur})</th>
                          <th className="py-2.5 px-3 w-32 text-right font-bold">Amount ({cur})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-current divide-opacity-10">
                        {sale.items.map((item, index) => (
                          <tr key={item.id} className="font-mono">
                            <td className="py-2.5 px-3 text-center">{index + 1}</td>
                            <td className="py-2.5 px-3 font-sans font-medium uppercase">{item.productName}</td>
                            <td className="py-2.5 px-3 text-right">{item.quantity.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right">{item.unitPrice.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold">{item.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Breakdown & Words */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-dashed border-current">
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="font-bold text-[10px] uppercase opacity-70">Amount In Words:</span>
                        <p className="font-medium italic mt-0.5 leading-snug">{numToWords(sale.totalAmount, cur)}</p>
                      </div>

                      <div className={`p-3 rounded-xl text-xs space-y-1 ${
                        isDark ? 'bg-slate-900/40 border border-slate-800' : 'bg-slate-50 border border-slate-200 print:bg-transparent print:border-black'
                      }`}>
                        <span className="font-bold text-[10px] uppercase opacity-70">Settlement Info:</span>
                        {sale.paymentMethod === 1 && (
                          <div className="flex justify-between font-mono">
                            <span>Cash Tendered: {cur} {sale.paidAmount.toFixed(2)}</span>
                            <span>Change/Refund: {cur} {sale.changeAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {sale.paymentMethod === 2 && (
                          <p className="font-mono">QR Received: {cur} {(sale.digitalPaid || sale.totalAmount).toFixed(2)}</p>
                        )}
                        {sale.paymentMethod === 3 && (
                          <p className="font-mono text-rose-500 print:text-black">Khata Due: {cur} {(sale.creditPaid || sale.totalAmount).toFixed(2)}</p>
                        )}
                        {sale.paymentMethod === 4 && (
                          <div className="space-y-0.5 font-mono">
                            <div className="flex justify-between"><span>Cash Paid:</span><span>{cur} {sale.cashPaid.toFixed(2)}</span></div>
                            {sale.digitalPaid > 0 && <div className="flex justify-between"><span>QR Paid:</span><span>{cur} {sale.digitalPaid.toFixed(2)}</span></div>}
                            {sale.creditPaid > 0 && <div className="flex justify-between"><span>Khata Due:</span><span>{cur} {sale.creditPaid.toFixed(2)}</span></div>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between py-1">
                        <span className="font-sans opacity-80">Gross Subtotal:</span>
                        <span>{cur} {sale.subtotal.toFixed(2)}</span>
                      </div>
                      {sale.discountAmount > 0 && (
                        <div className="flex justify-between py-1 text-emerald-500 print:text-black">
                          <span className="font-sans">Discount / Savings:</span>
                          <span>- {cur} {sale.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {sale.taxAmount > 0 && (
                        <div className="flex justify-between py-1">
                          <span className="font-sans opacity-80">VAT (13%):</span>
                          <span>{cur} {sale.taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className={`flex justify-between items-center py-2 px-3 rounded-lg font-bold text-sm ${
                        isDark ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30' : 'bg-slate-900 text-white print:border-y print:border-black print:bg-transparent print:text-black'
                      }`}>
                        <span className="font-sans">Grand Total:</span>
                        <span className="text-base font-black">{cur} {sale.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signature Blocks & Footer */}
                  <div className="pt-8 mt-6 border-t border-dashed border-current flex justify-between items-end text-xs">
                    <div className="text-center w-48">
                      <div className="border-t border-current pt-1 opacity-70">Customer Signature</div>
                    </div>
                    <div className="text-center w-56">
                      <div className="border-t border-current pt-1 font-bold">Authorized Signatory</div>
                      <p className="text-[10px] opacity-70 mt-0.5">{profile.storeName}</p>
                    </div>
                  </div>

                  <div className="text-center pt-2 text-[10px] opacity-70 space-y-0.5">
                    <p className="font-bold uppercase">{profile.receiptFooter}</p>
                    <p>Powered by HisabFlow POS System</p>
                  </div>
                </div>
              ) : paperSize === '58mm' ? (
                /* ======================================================== */
                /* LAYOUT 2: 58MM COMPACT THERMAL RECEIPT (2-INCH ROLL)     */
                /* ======================================================== */
                <div className="space-y-3 font-mono text-[9.5px] uppercase">
                  {/* Shop Header */}
                  <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-current">
                    <h2 className="text-xs font-black leading-tight">{profile.storeName}</h2>
                    {profile.tagline && <p className="text-[8.5px] italic leading-tight">** {profile.tagline} **</p>}
                    {profile.address && <p className="text-[8.5px] leading-tight">{profile.address}</p>}
                    {profile.phone && <p className="text-[8.5px] leading-tight">Tel: {profile.phone}</p>}
                    {profile.panNumber && <p className="text-[8.5px] font-bold leading-tight">PAN: {profile.panNumber}</p>}
                    <p className="text-[8px] font-bold mt-1 tracking-wider">
                      {sale.taxAmount > 0 ? '** TAX INVOICE **' : '** CASH BILL **'}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="space-y-0.5 text-[9px] pb-1.5 border-b border-dashed border-current">
                    {sale.isRefunded && (
                      <div className="text-center font-black py-0.5 border border-current mb-1">
                        *** REFUNDED / RETURNED ***
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>DATE:</span>
                      <span>{formattedBillDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BILL:</span>
                      <span>{sale.invoiceNumber}</span>
                    </div>
                    {sale.customerName && (
                      <div className="flex justify-between">
                        <span>CUST:</span>
                        <span className="truncate max-w-[120px]">{sale.customerName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>PAY:</span>
                      <span>{getPaymentLabel(sale.paymentMethod)}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="text-[9px]">
                    <div className="flex justify-between border-b border-dashed border-current pb-1 mb-1 font-bold">
                      <span className="flex-1">ITEM</span>
                      <span className="w-7 text-right">QTY</span>
                      <span className="w-10 text-right">RATE</span>
                      <span className="w-12 text-right">AMT</span>
                    </div>
                    <div className="space-y-1 pb-1.5 border-b border-dashed border-current">
                      {sale.items.map((item, i) => (
                        <div key={item.id} className="flex justify-between items-start leading-tight">
                          <span className="flex-1 pr-1 truncate">
                            {i + 1}. {item.productName}
                          </span>
                          <span className="w-7 text-right">{item.quantity.toFixed(1)}</span>
                          <span className="w-10 text-right">{item.unitPrice.toFixed(1)}</span>
                          <span className="w-12 text-right font-bold">{item.subtotal.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="space-y-0.5 text-[9px]">
                    <div className="flex justify-between">
                      <span>GROSSAMT:</span>
                      <span>{sale.subtotal.toFixed(2)}</span>
                    </div>
                    {sale.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span>VAT (13%):</span>
                        <span>{sale.taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {sale.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span>DISCOUNT:</span>
                        <span>{sale.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-[10.5px] pt-1 border-t border-dashed border-current">
                      <span>TOTAL:</span>
                      <span>{cur} {sale.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="capitalize text-[8px] leading-tight pt-0.5 opacity-90 border-b border-dashed border-current pb-1 mb-1 font-medium">
                      {numToWords(sale.totalAmount, cur)}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-0.5 text-[8.5px] pb-1">
                    {sale.paymentMethod === 1 && (
                      <>
                        <div className="flex justify-between">
                          <span>CASH PAID:</span>
                          <span>{sale.paidAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>CHANGE:</span>
                          <span>{sale.changeAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {sale.paymentMethod === 2 && (
                      <div className="flex justify-between">
                        <span>QR PAID:</span>
                        <span>{(sale.digitalPaid || sale.totalAmount).toFixed(2)}</span>
                      </div>
                    )}
                    {sale.paymentMethod === 3 && (
                      <div className="flex justify-between font-bold">
                        <span>KHATA DUE:</span>
                        <span>{(sale.creditPaid || sale.totalAmount).toFixed(2)}</span>
                      </div>
                    )}
                    {sale.paymentMethod === 4 && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between"><span>CASH:</span><span>{sale.cashPaid.toFixed(2)}</span></div>
                        {sale.digitalPaid > 0 && <div className="flex justify-between"><span>QR:</span><span>{sale.digitalPaid.toFixed(2)}</span></div>}
                        {sale.creditPaid > 0 && <div className="flex justify-between"><span>KHATA:</span><span>{sale.creditPaid.toFixed(2)}</span></div>}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-1.5 border-t border-dashed border-current text-[8px] space-y-0.5">
                    <p className="font-bold">{profile.receiptFooter}</p>
                    <p className="opacity-70">*** VISIT AGAIN ***</p>
                  </div>
                </div>
              ) : (
                /* ======================================================== */
                /* LAYOUT 3: 80MM STANDARD POS RECEIPT (3-INCH ROLL)        */
                /* ======================================================== */
                <div className="space-y-4 font-mono text-xs uppercase">
                  {/* Shop Header */}
                  <div className="text-center space-y-1 pb-2 border-b border-dashed border-current">
                    <div className="flex items-center justify-center gap-1.5">
                      <Store className={`w-4 h-4 print:hidden shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <h2 className="text-base sm:text-lg font-black uppercase leading-tight">
                        {profile.storeName}
                      </h2>
                    </div>
                    {profile.tagline && (
                      <p className="text-[11px] font-bold italic">
                        ** {profile.tagline} **
                      </p>
                    )}
                    {profile.address && (
                      <p className="text-[11px]">
                        {profile.address}
                      </p>
                    )}
                    {profile.phone && (
                      <p className="text-[11px]">
                        Phone / Mobile: {profile.phone}
                      </p>
                    )}
                    {profile.panNumber && (
                      <p className="text-[11px] font-bold">
                        PAN / VAT NO. : {profile.panNumber}
                      </p>
                    )}
                    <p className="text-[10px] font-bold mt-1 uppercase tracking-wider">
                      {sale.taxAmount > 0 ? '** Tax Invoice **' : '** Tax Invoice / Cash Bill **'}
                    </p>
                  </div>

                  {/* Bill Meta Details */}
                  <div className="space-y-0.5 text-[11px] pb-2">
                    {sale.isRefunded && (
                      <div className="text-center font-black py-1 border border-current mb-1.5">
                        *** REFUNDED / RETURNED BILL ***
                      </div>
                    )}
                    <div className="flex">
                      <span className="w-20">Bill Date</span>
                      <span>: {formattedBillDate} ({formattedBillTime})</span>
                    </div>
                    <div className="flex">
                      <span className="w-20">Bill No</span>
                      <span>: {sale.invoiceNumber}</span>
                    </div>
                    {sale.customerName && (
                      <div className="flex">
                        <span className="w-20">Customer</span>
                        <span>: {sale.customerName}</span>
                      </div>
                    )}
                    <div className="flex">
                      <span className="w-20">Payment</span>
                      <span>: {getPaymentLabel(sale.paymentMethod)}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="text-[11px]">
                    <div className="flex justify-between border-y border-dashed border-current py-1 mb-1 font-bold">
                      <span className="flex-1">Particulars</span>
                      <span className="w-8 text-right">Qty</span>
                      <span className="w-14 text-right">Rate</span>
                      <span className="w-16 text-right">Amount</span>
                    </div>

                    <div className="space-y-2 pb-2 border-b border-dashed border-current">
                      {sale.items.map((item, i) => (
                        <div key={item.id} className="flex justify-between items-start">
                          <span className="flex-1 pr-2 break-all uppercase leading-tight">
                            {i + 1}). {item.productName}
                          </span>
                          <span className="w-8 text-right">{item.quantity.toFixed(2)}</span>
                          <span className="w-14 text-right">{item.unitPrice.toFixed(2)}</span>
                          <span className="w-16 text-right">{item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals & Calculations */}
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between pt-1">
                      <span>GrossAmt :</span>
                      <span>{sale.subtotal.toFixed(2)}</span>
                    </div>
                    
                    {sale.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span>VAT (13%) :</span>
                        <span>{sale.taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between border-b border-dashed border-current pb-1 mb-1">
                      <span>Saving in this bill:</span>
                      <span>{sale.discountAmount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between font-bold pb-1 text-sm">
                      <span>Grand Total :</span>
                      <span>{cur} {sale.totalAmount.toFixed(2)}</span>
                    </div>
                    
                    <div className="capitalize border-b border-dashed border-current pb-1 mb-1 leading-tight font-medium">
                      {numToWords(sale.totalAmount, cur)}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-1 text-[11px] pb-2">
                    {sale.paymentMethod === 1 && (
                      <>
                        <div className="flex justify-between border-b border-dashed border-current pb-1 mb-1">
                          <span>Cash</span>
                          <span>{sale.paidAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-current pb-1 mb-1">
                          <span>Customer Paid: {sale.paidAmount.toFixed(2)}</span>
                          <span>Refund: {sale.changeAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {sale.paymentMethod === 2 && (
                      <div className="flex justify-between border-b border-dashed border-current pb-1 mb-1">
                        <span>QR Pay</span>
                        <span>{(sale.digitalPaid || sale.totalAmount).toFixed(2)}</span>
                      </div>
                    )}
                    {sale.paymentMethod === 3 && (
                      <div className="flex justify-between border-b border-dashed border-current pb-1 mb-1">
                        <span>Khata (Due)</span>
                        <span>{(sale.creditPaid || sale.totalAmount).toFixed(2)}</span>
                      </div>
                    )}
                    {sale.paymentMethod === 4 && (
                      <div className="border-b border-dashed border-current pb-1 mb-1 space-y-1">
                        <div className="flex justify-between">
                          <span>Cash Paid</span>
                          <span>{sale.cashPaid.toFixed(2)}</span>
                        </div>
                        {sale.digitalPaid > 0 && (
                          <div className="flex justify-between">
                            <span>QR Paid</span>
                            <span>{sale.digitalPaid.toFixed(2)}</span>
                          </div>
                        )}
                        {sale.creditPaid > 0 && (
                          <div className="flex justify-between">
                            <span>Khata Due</span>
                            <span>{sale.creditPaid.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Receipt Footer Note */}
                  <div className="text-center pt-2 border-t border-dashed border-current space-y-0.5">
                    <p className="text-[11px] font-bold uppercase">{profile.receiptFooter}</p>
                    <p className="text-[9px] opacity-70">Powered by HisabFlow POS System</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Printer Setup & Footer Controls - Screen only */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3 print:hidden shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Paper Size Picker */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium text-[11px]">Format:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['58mm', '80mm', 'A4'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setPaperSize(sz)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        paperSize === sz
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sz === '58mm' ? '58mm (2")' : sz === '80mm' ? '80mm (3")' : 'Full A4'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Receipt Theme Picker (Light / Dark Print Mode) */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium text-[11px]">Print Style:</span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReceiptTheme('light')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                      !isDark
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Classic high-contrast paper print"
                  >
                    <Sun className="w-3 h-3" />
                    <span>Light (Paper)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptTheme('dark')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                      isDark
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Modern digital dark invoice"
                  >
                    <Moon className="w-3 h-3" />
                    <span>Dark (Digital)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Inline WhatsApp Phone Input Bar (for Walk-in Customers or editing phone) */}
            {showWaPhoneBar && (
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 animate-in fade-in duration-150">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
                <input
                  id="wa-receipt-phone-input"
                  type="tel"
                  value={customWaPhone}
                  onChange={(e) => setCustomWaPhone(e.target.value)}
                  placeholder={
                    language === 'np'
                      ? 'ग्राहकको मोबाइल नं (98XXXXXXXX)...'
                      : 'Customer WhatsApp No (98XXXXXXXX)...'
                  }
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendWhatsAppReceipt(customWaPhone);
                    }
                  }}
                />
                <button
                  id="wa-receipt-send-btn"
                  type="button"
                  onClick={() => sendWhatsAppReceipt(customWaPhone)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'np' ? 'पठाउनुहोस्' : 'Send'}</span>
                </button>
              </div>
            )}

            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                {language === 'np' ? 'बन्द गर्नुहोस्' : 'Close'}
              </button>

              <div className="flex items-center gap-1.5 flex-1 justify-end">
                <button
                  id="wa-receipt-share-btn"
                  type="button"
                  onClick={handleWhatsAppButtonClick}
                  className="py-2.5 px-3.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
                  title={
                    sale.customerPhone
                      ? `Send WhatsApp Bill to ${sale.customerPhone}`
                      : 'Send itemized receipt via WhatsApp'
                  }
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t('whatsappBill')}</span>
                </button>

                {sale.customerPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomWaPhone(sale.customerPhone || '');
                      setShowWaPhoneBar((prev) => !prev);
                    }}
                    className="py-2.5 px-2.5 rounded-xl text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-800 transition-colors"
                    title="Change WhatsApp number"
                  >
                    #
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {t('print')} {paperSize === 'A4' ? 'A4' : paperSize}
                  </span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};