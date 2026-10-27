'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, QrCode, CheckCircle, Copy, Check, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react';
import { useKhata } from '@/context/KhataContext';
import { generateDynamicQrPayload, generateQrDataUrl } from '@/lib/qrUtils';

interface DynamicQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  invoiceNumber?: string;
  onConfirmPayment?: () => void;
}

export const DynamicQrModal: React.FC<DynamicQrModalProps> = ({
  isOpen,
  onClose,
  amount,
  invoiceNumber = 'POS-BILL',
  onConfirmPayment,
}) => {
  const { storeProfile, showToast } = useKhata();
  const [qrFormat, setQrFormat] = useState<'FONEPAY_DYNAMIC' | 'EMVCO_NEPALPAY' | 'MOBANK_JSON'>(
    storeProfile?.qrFormat || 'FONEPAY_DYNAMIC'
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const cur = storeProfile?.currencySymbol || 'Rs.';
  const accountName = storeProfile?.qrAccountName || 'Anjali Store';
  const accountNumber = storeProfile?.qrAccountNumber || '2222610021768837';
  const bankName = storeProfile?.qrBankName || 'Fonepay (Khalti)';
  const merchantId = storeProfile?.qrMerchantId || accountNumber;
  const acquirerId = storeProfile?.qrAcquirerId || storeProfile?.qrBankCodeCIPS || '4271420021768837';
  const terminalLabel = storeProfile?.qrTerminalLabel || '2236157';
  const city = storeProfile?.qrCity || storeProfile?.address || 'Lalitpur MP';

  // Memoized deterministic raw payload string
  const rawPayload = useMemo(() => {
    return generateDynamicQrPayload({
      accountName,
      accountNumber,
      bankName,
      merchantId,
      acquirerId,
      terminalLabel,
      city,
      amount,
      remarks: invoiceNumber,
      format: qrFormat,
    });
  }, [accountName, accountNumber, bankName, merchantId, acquirerId, terminalLabel, city, amount, invoiceNumber, qrFormat]);

  // Generate dynamic QR code whenever rawPayload changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    generateQrDataUrl(rawPayload, { width: 360, margin: 1 })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Error generating dynamic QR:', err);
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, rawPayload]);

  if (!isOpen) return null;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(rawPayload);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
    showToast({
      type: 'info',
      title: 'QR Payload Copied',
      message: 'Raw dynamic QR data copied to clipboard.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100 tracking-tight">
                Fonepay Dynamic QR Payment
              </h3>
              <p className="text-[11px] text-slate-400">
                Pre-filled Amount • Scan with Any Mobile Banking or Wallet App
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Dynamic Amount Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/30 border border-rose-500/30 text-center space-y-1 shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Exact Amount To Pay (Pre-Filled)
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-50 font-mono tracking-tight">
              {cur} {amount.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Customer scans QR &mdash; amount is automatically filled in banking app</span>
            </p>
          </div>

          {/* QR Code Standee Card (Styled to match the physical Fonepay standee) */}
          <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-2xl mx-auto flex flex-col items-center justify-center max-w-[290px] sm:max-w-[320px] space-y-2.5 border-4 border-rose-500/90 relative">
            {/* Standee Brand Top Banner */}
            <div className="w-full flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-xs rounded tracking-wider uppercase">
                  fone<span className="text-white">pay</span>
                </span>
                <span className="text-[8px] font-semibold text-slate-500 leading-tight">
                  राष्ट्र बैंकबाट अनुमति
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                WE ACCEPT
              </span>
            </div>

            {/* Merchant Details */}
            <div className="text-center w-full space-y-0.5">
              <h4 className="text-sm font-black text-slate-950 tracking-tight">
                {accountName}
              </h4>
              <p className="text-[10px] font-mono font-bold text-slate-700">
                Terminal: <span className="text-rose-700 font-black">{merchantId}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Address: {city}
              </p>
            </div>

            {/* QR Image */}
            <div className="relative w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center bg-white rounded-xl border border-slate-200 p-1">
              {isGenerating || !qrDataUrl ? (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <RefreshCw className="w-7 h-7 animate-spin text-rose-500" />
                  <span className="text-xs font-medium">Generating dynamic QR...</span>
                </div>
              ) : (
                <img
                  src={qrDataUrl}
                  alt="Dynamic Payment QR Code"
                  className="w-full h-full object-contain rounded-lg"
                />
              )}
            </div>

            {/* Footer with Payment Partner Badges */}
            <div className="text-center pt-1.5 border-t border-slate-200 w-full space-y-1">
              <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-600 uppercase tracking-tight">
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-black">UPI</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-black">Alipay+</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 font-black">UnionPay</span>
              </div>
              <p className="text-[9px] text-slate-500 font-semibold">
                ACQUIRED BY <span className="text-purple-700 font-bold">khalti</span> • fonepay.com
              </p>
            </div>
          </div>

          {/* Supported Apps strip */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-rose-400" /> Compatible With All Nepal Banking Apps:
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Khalti, eSewa, Fonepay, Global Smart, NIC ASIA MoBank, Nabil, Kumari, Siddhartha, Prabhu, Sanima, connectIPS & all commercial banks in Nepal.
            </p>
          </div>

          {/* QR Format Selector & Raw copy */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setQrFormat('FONEPAY_DYNAMIC')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  qrFormat === 'FONEPAY_DYNAMIC'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Fonepay Dynamic QR (Standee Standard)"
              >
                Fonepay Dynamic (Default)
              </button>
              <button
                type="button"
                onClick={() => setQrFormat('EMVCO_NEPALPAY')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  qrFormat === 'EMVCO_NEPALPAY'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="NepalQR / NEPALPAY Standard (EMVCo Dynamic)"
              >
                NepalQR EMV
              </button>
              <button
                type="button"
                onClick={() => setQrFormat('MOBANK_JSON')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  qrFormat === 'MOBANK_JSON'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="NIC ASIA MoBank & connectIPS JSON Format"
              >
                MoBank JSON
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyPayload}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-semibold border border-slate-700 transition-colors flex items-center gap-1"
              title="Copy raw QR string"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? 'Copied' : 'Copy Data'}</span>
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            Cancel / Close
          </button>
          {onConfirmPayment && (
            <button
              type="button"
              onClick={() => {
                onConfirmPayment();
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm Paid ({cur} {amount.toFixed(2)})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
