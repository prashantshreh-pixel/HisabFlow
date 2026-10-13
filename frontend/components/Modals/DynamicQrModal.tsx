'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, QrCode, CheckCircle, Copy, Check, RefreshCw, Smartphone, ShieldCheck, ExternalLink, ArrowRight } from 'lucide-react';
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
  const [qrFormat, setQrFormat] = useState<'MOBANK_JSON' | 'EMVCO_NEPALPAY'>(
    storeProfile?.qrFormat || 'MOBANK_JSON'
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const cur = storeProfile?.currencySymbol || 'Rs.';
  const accountName = storeProfile?.qrAccountName || 'SADIKSHYA DAHAL';
  const accountNumber = storeProfile?.qrAccountNumber || '0215752768506001';
  const bankName = storeProfile?.qrBankName || 'NIC ASIA Bank';
  const bankCode = storeProfile?.qrBankCode || 'BOALNPKA';
  const bankCodeCIPS = storeProfile?.qrBankCodeCIPS || '2301';

  // Memoized deterministic raw payload string
  const rawPayload = useMemo(() => {
    return generateDynamicQrPayload({
      accountName,
      accountNumber,
      bankCode,
      bankCodeCIPS,
      bankName,
      amount,
      remarks: invoiceNumber,
      format: qrFormat,
    });
  }, [accountName, accountNumber, bankCode, bankCodeCIPS, bankName, amount, invoiceNumber, qrFormat]);

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
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100 tracking-tight">
                Dynamic QR Payment
              </h3>
              <p className="text-[11px] text-slate-400">
                Pre-filled Amount • Scan with Any Banking App
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
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 border border-amber-500/30 text-center space-y-1 shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Exact Amount To Pay (Pre-Filled)
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-50 font-mono tracking-tight">
              {cur} {amount.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Customer scans QR &mdash; no manual amount entry required</span>
            </p>
          </div>

          {/* QR Code Canvas Card */}
          <div className="bg-white rounded-2xl p-5 shadow-2xl mx-auto flex flex-col items-center justify-center max-w-[280px] sm:max-w-[310px] space-y-2 border-4 border-amber-400/80">
            {/* Bank Header inside QR standee */}
            <div className="text-center pb-1">
              <span className="text-[11px] font-black tracking-wider text-rose-700 block uppercase">
                {bankName}
              </span>
              <span className="text-[10px] font-bold text-slate-900 block truncate max-w-[240px]">
                {accountName}
              </span>
            </div>

            {/* QR Image */}
            <div className="relative w-60 h-60 flex items-center justify-center bg-white rounded-xl">
              {isGenerating || !qrDataUrl ? (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
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

            {/* Account & Network footer */}
            <div className="text-center pt-1 border-t border-slate-200 w-full space-y-0.5">
              <p className="text-[10px] font-mono font-bold text-slate-800">
                A/C: {accountNumber}
              </p>
              <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-slate-500 uppercase">
                <span>MoBank</span>
                <span>•</span>
                <span>connectIPS</span>
                <span>•</span>
                <span>Fonepay</span>
              </div>
            </div>
          </div>

          {/* Supported Apps pill strip */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-amber-400" /> Compatible With All Nepal Apps:
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              NIC ASIA MoBank, Global Smart, eSewa, Khalti, Nabil, Kumari, Siddhartha, Prabhu, Sanima, connectIPS, Fonepay & all NepalPay enabled apps.
            </p>
          </div>

          {/* QR Format Selector & Raw copy */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
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
