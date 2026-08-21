'use client';

import React, { useState } from 'react';
import { useKhata } from '@/context/KhataContext';
import { ButtonSpinner } from '@/components/Loader';
import { Product } from '@/types';
import { X, Plus, Minus, RefreshCw, AlertTriangle, CheckCircle2, Boxes, ArrowRight } from 'lucide-react';

interface QuickStockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const QuickStockAdjustModal: React.FC<QuickStockAdjustModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { adjustStock } = useKhata();

  const [mode, setMode] = useState<'ADD' | 'DEDUCT' | 'SET'>('ADD');
  const [amount, setAmount] = useState('10');
  const [reason, setReason] = useState('New shipment / supplier delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const currentStock = product.stockQuantity;
  const numAmount = parseFloat(amount) || 0;

  let computedNewStock = currentStock;
  if (mode === 'ADD') computedNewStock = currentStock + numAmount;
  else if (mode === 'DEDUCT') computedNewStock = Math.max(0, currentStock - numAmount);
  else if (mode === 'SET') computedNewStock = Math.max(0, numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numAmount) || numAmount < 0) return;

    let delta = 0;
    if (mode === 'ADD') delta = numAmount;
    else if (mode === 'DEDUCT') delta = -numAmount;
    else if (mode === 'SET') delta = numAmount - currentStock;

    if (delta !== 0) {
      try {
        setIsSubmitting(true);
        await adjustStock(product.id, delta, reason);
        onClose();
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      onClose();
    }
  };

  return (
    <div
      id="quick-stock-modal-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Right-Side Slide Drawer */}
      <div
        id="quick-stock-drawer-panel"
        className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 text-slate-100"
      >
        {/* Fixed Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-100 truncate">Quick Stock Adjust</h3>
              <p className="text-[11px] text-slate-400 truncate">{product.name}</p>
            </div>
          </div>
          <button
            id="close-stock-adjust-drawer-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current vs New preview */}
        <div className="flex-none p-5 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between z-10">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Current Stock</span>
            <div className="text-xl font-bold text-slate-200 mt-0.5">
              {currentStock} {product.unit}
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-500" />

          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">New Stock Level</span>
            <div
              className={`text-xl font-black mt-0.5 ${
                computedNewStock <= product.minStockAlert ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {computedNewStock} {product.unit}
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form id="stock-adjust-drawer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Mode Selector */}
          <div className="grid grid-cols-3 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('ADD');
                setReason('New shipment / supplier delivery');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'ADD'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('DEDUCT');
                setReason('Manual sale / damage / expired');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'DEDUCT'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              Deduct (-)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('SET');
                setReason('Physical audit / inventory count');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                mode === 'SET'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Set Exact
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-amber-400" />
              {mode === 'ADD' ? 'Quantity to Add' : mode === 'DEDUCT' ? 'Quantity to Deduct' : 'Exact New Quantity'} ({product.unit})
            </label>
            <input
              id="stock-delta-input"
              type="number"
              min="0"
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-lg font-bold placeholder-slate-500 focus:ring-2 focus:ring-amber-500/50"
            />

            {/* Quick buttons */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-slate-500">Presets:</span>
              {[5, 10, 25, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors font-medium"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Adjustment Reason / Note
            </label>
            <input
              id="stock-reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs placeholder-slate-500 focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </form>

        {/* Fixed Footer Actions */}
        <div className="flex-none p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 z-20">
          <button
            id="cancel-stock-adjust-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            id="apply-stock-adjust-btn"
            type="submit"
            disabled={isSubmitting}
            form="stock-adjust-drawer-form"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <ButtonSpinner className="w-4 h-4 text-slate-950" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Adjustment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
