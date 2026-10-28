'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, QrCode, CheckCircle, Copy, Check, RefreshCw, Smartphone, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { useKhata } from '@/context/KhataContext';
import { generateDynamicQrPayload, generateQrDataUrl } from '@/lib/qrUtils';
import { paymentsApi, ApiPaymentSession, PaymentProvider } from '@/lib/api';

interface DynamicQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  invoiceNumber?: string;
  onConfirmPayment?: () => void;
}

type Phase = 'creating' | 'waiting' | 'paid' | 'expired' | 'error';

const POLL_INTERVAL_MS = 2000;
const SUCCESS_HOLD_MS = 1800;
const PROVIDERS: { id: PaymentProvider; label: string }[] = [
  { id: 'FONEPAY', label: 'Fonepay' },
  { id: 'KHALTI', label: 'Khalti' },
  { id: 'ESEWA', label: 'eSewa' },
];

/** Short two-note chime so the cashier hears the payment land even if not looking at the screen. */
function playSuccessChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.12;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
    navigator.vibrate?.([80]);
  } catch {
    // Audio blocked or unavailable; the visual confirmation is enough.
  }
}

/**
 * Mounted only while the modal is open, so every open starts with fresh state
 * (and creates a fresh server-side payment session).
 */
const DynamicQrPanel: React.FC<Omit<DynamicQrModalProps, 'isOpen'>> = ({
  onClose,
  amount,
  invoiceNumber = 'POS-BILL',
  onConfirmPayment,
}) => {
  const { storeProfile, showToast } = useKhata();

  const [qrFormat, setQrFormat] = useState<'FONEPAY_DYNAMIC' | 'EMVCO_NEPALPAY' | 'MOBANK_JSON'>(
    storeProfile?.qrFormat || 'FONEPAY_DYNAMIC'
  );
  const [provider, setProvider] = useState<PaymentProvider>('FONEPAY');
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('creating');
  const [session, setSession] = useState<ApiPaymentSession | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const completedRef = useRef(false);

  // Keep the latest parent callbacks in refs so inline handlers from the parent
  // never restart the success timer.
  const onConfirmRef = useRef(onConfirmPayment);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onConfirmRef.current = onConfirmPayment;
    onCloseRef.current = onClose;
  });
  const cur = storeProfile?.currencySymbol || 'Rs.';
  const accountName = storeProfile?.qrAccountName || 'Anjali Store';
  const accountNumber = storeProfile?.qrAccountNumber || '2222610021768837';
  const bankName = storeProfile?.qrBankName || 'Fonepay (Khalti)';
  const merchantId = storeProfile?.qrMerchantId || accountNumber;
  const acquirerId = storeProfile?.qrAcquirerId || storeProfile?.qrBankCodeCIPS || '4271420021768837';
  const terminalLabel = storeProfile?.qrTerminalLabel || '2236157';
  const city = storeProfile?.qrCity || storeProfile?.address || 'Lalitpur MP';

  // 1. Create a server-side payment session (new one per attempt)
  useEffect(() => {
    let cancelled = false;

    paymentsApi
      .createSession({ amount, invoiceRef: invoiceNumber, provider })
      .then((s) => {
        if (cancelled) {
          paymentsApi.cancel(s.id).catch(() => {});
          return;
        }
        setSession(s);
        setPhase('waiting');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : 'Could not start payment session.');
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, amount, invoiceNumber, provider]);

  // 2. Poll the server for the real status while waiting, plus a cosmetic countdown
  useEffect(() => {
    if (phase !== 'waiting' || !session) return;

    const expiresAtMs = new Date(session.expiresAt).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000)));
    tick();
    const countdown = setInterval(tick, 1000);

    const poll = setInterval(async () => {
      try {
        const fresh = await paymentsApi.getSession(session.id);
        if (fresh.status === 'Paid') setPhase('paid');
        else if (fresh.status === 'Expired' || fresh.status === 'Cancelled') setPhase('expired');
      } catch {
        // Transient network error: keep polling, the next tick will retry.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(countdown);
      clearInterval(poll);
    };
  }, [phase, session]);

  // 3. On success: chime, hold the tick for a moment, then finish the sale exactly once
  useEffect(() => {
    if (phase !== 'paid') return;
    playSuccessChime();

    const timer = setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onConfirmRef.current?.();
      onCloseRef.current();
    }, SUCCESS_HOLD_MS);

    return () => clearTimeout(timer);
  }, [phase]);

  // QR content embeds the server-issued PRN so the payment can be matched to this exact session
  const rawPayload = useMemo(() => {
    if (!session) return '';
    return generateDynamicQrPayload({
      accountName,
      accountNumber,
      bankName,
      merchantId,
      acquirerId,
      terminalLabel,
      city,
      amount,
      remarks: session.prn,
      format: qrFormat,
    });
  }, [session, accountName, accountNumber, bankName, merchantId, acquirerId, terminalLabel, city, amount, qrFormat]);

  useEffect(() => {
    if (!rawPayload) return;
    let isMounted = true;

    generateQrDataUrl(rawPayload, { width: 360, margin: 1 })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error('Error generating dynamic QR:', err));

    return () => {
      isMounted = false;
    };
  }, [rawPayload]);

  const isPaid = phase === 'paid';
  const isExpired = phase === 'expired';
  const showQr = phase === 'waiting' || isPaid || isExpired;

  const restart = () => {
    setSession(null);
    setQrDataUrl('');
    setSecondsLeft(null);
    setErrorMsg('');
    setPhase('creating');
    setAttempt((n) => n + 1);
  };

  const handleProviderChange = (next: PaymentProvider) => {
    if (next === provider || isPaid) return;
    if (session && phase === 'waiting') paymentsApi.cancel(session.id).catch(() => {});
    setProvider(next);
    restart();
  };

  const handleClose = () => {
    if (isPaid) return; // don't abandon a bill that was just paid
    if (session && phase === 'waiting') paymentsApi.cancel(session.id).catch(() => {});
    onClose();
  };

  const handleManualConfirm = async () => {
    if (!session || isConfirming) return;
    setIsConfirming(true);
    try {
      const result = await paymentsApi.confirmManual(session.id);
      if (result.status === 'Paid') setPhase('paid');
      else setPhase('expired');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not confirm payment',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSimulate = async () => {
    if (!session) return;
    try {
      await paymentsApi.simulate(session.id);
    } catch {
      showToast({ type: 'error', title: 'Simulation unavailable', message: 'Only works on a Development backend.' });
    }
  };

  const handleCopyPayload = () => {
    if (!rawPayload) return;
    navigator.clipboard.writeText(rawPayload);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
    showToast({ type: 'info', title: 'QR Payload Copied', message: 'Raw dynamic QR data copied to clipboard.' });
  };

  const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border transition-colors ${
                isPaid
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {isPaid ? <CheckCircle className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-100 tracking-tight">
                {isPaid ? 'Payment Received' : 'Dynamic QR Payment'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isPaid
                  ? 'Completing your sale…'
                  : 'Pre-filled Amount • Scan with Any Mobile Banking or Wallet App'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPaid}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Dynamic Amount Banner */}
          <div
            className={`p-4 rounded-2xl border text-center space-y-1 shadow-lg transition-colors duration-500 ${
              isPaid
                ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-emerald-500/40'
                : 'bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/30 border-rose-500/30'
            }`}
          >
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                isPaid ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPaid ? 'Amount Paid' : 'Exact Amount To Pay (Pre-Filled)'}
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-50 font-mono tracking-tight">
              {cur} {amount.toFixed(2)}
            </div>
            {!isPaid && (
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Customer scans QR &mdash; amount is automatically filled in banking app</span>
              </p>
            )}
          </div>

          {/* QR Code Standee Card */}
          <div className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-2xl mx-auto flex flex-col items-center justify-center max-w-[290px] sm:max-w-[320px] space-y-2.5 border-4 border-rose-500/90 relative">
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

            <div className="text-center w-full space-y-0.5">
              <h4 className="text-sm font-black text-slate-950 tracking-tight">{accountName}</h4>
              <p className="text-[10px] font-mono font-bold text-slate-700">
                Terminal: <span className="text-rose-700 font-black">{merchantId}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Address: {city}</p>
            </div>

            {/* QR Image with success / expired overlays */}
            <div className="relative w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center bg-white rounded-xl border border-slate-200 p-1 overflow-hidden">
              {!showQr || !qrDataUrl ? (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  {phase === 'error' ? (
                    <>
                      <AlertTriangle className="w-7 h-7 text-amber-500" />
                      <span className="text-xs font-medium text-center px-3">{errorMsg}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-7 h-7 animate-spin text-rose-500" />
                      <span className="text-xs font-medium">Generating dynamic QR...</span>
                    </>
                  )}
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Dynamic Payment QR Code"
                  className={`w-full h-full object-contain rounded-lg transition-all duration-500 ${
                    isPaid || isExpired ? 'blur-md opacity-40 scale-95' : ''
                  }`}
                />
              )}

              {isPaid && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50" role="status" aria-live="polite">
                  <div className="hf-check-circle w-24 h-24 rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-14 h-14" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path className="hf-check-path" d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </div>
                </div>
              )}

              {isExpired && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60">
                  <Clock className="w-8 h-8 text-slate-600" />
                  <span className="text-xs font-bold text-slate-700">QR expired</span>
                  <button
                    type="button"
                    onClick={restart}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> New QR
                  </button>
                </div>
              )}
            </div>

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

          {/* Live status line */}
          {!isPaid && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400" role="status" aria-live="polite">
              {phase === 'waiting' && (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                  <span>Waiting for payment…</span>
                  {secondsLeft !== null && (
                    <span className="font-mono text-slate-500">({formatCountdown(secondsLeft)})</span>
                  )}
                </>
              )}
              {phase === 'error' && (
                <button type="button" onClick={restart} className="text-amber-400 hover:text-amber-300 font-semibold underline">
                  Retry
                </button>
              )}
            </div>
          )}

          {!isPaid && (
            <>
              {/* Supported Apps strip */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-rose-400" /> Compatible With All Nepal Banking Apps:
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Khalti, eSewa, Fonepay, Global Smart, NIC ASIA MoBank, Nabil, Kumari, Siddhartha, Prabhu, Sanima, connectIPS &amp; all commercial banks in Nepal.
                </p>
              </div>

              {/* Provider + QR Format selectors */}
              <div className="space-y-2 pt-1 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProviderChange(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        provider === p.id ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setQrFormat('FONEPAY_DYNAMIC')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        qrFormat === 'FONEPAY_DYNAMIC' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Fonepay Dynamic QR (Standee Standard)"
                    >
                      Fonepay Dynamic (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrFormat('EMVCO_NEPALPAY')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        qrFormat === 'EMVCO_NEPALPAY' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="NepalQR / NEPALPAY Standard (EMVCo Dynamic)"
                    >
                      NepalQR EMV
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrFormat('MOBANK_JSON')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        qrFormat === 'MOBANK_JSON' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
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

                {process.env.NODE_ENV === 'development' && phase === 'waiting' && (
                  <button
                    type="button"
                    onClick={handleSimulate}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25"
                  >
                    Dev: simulate customer payment
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPaid}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
          >
            Cancel / Close
          </button>
          {onConfirmPayment && !isPaid && (
            <button
              type="button"
              onClick={handleManualConfirm}
              disabled={phase !== 'waiting' || isConfirming}
              title="Use only after checking the payment in your merchant app"
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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

export const DynamicQrModal: React.FC<DynamicQrModalProps> = ({ isOpen, ...rest }) => {
  if (!isOpen) return null;
  return <DynamicQrPanel {...rest} />;
};
