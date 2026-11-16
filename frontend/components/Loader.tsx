'use client';

import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export const ButtonSpinner: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <Loader2 className={`${className} animate-spin text-current shrink-0`} />
);

/** Full page/section loader with centered spinner fitting dark slate/amber UI */
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading records...' }) => (
  <div
    role="status"
    aria-live="polite"
    className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900/50 border border-slate-800/80 rounded-2xl my-4 animate-in fade-in duration-200"
  >
    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
    <p className="text-xs text-slate-300 font-bold tracking-wide">{text}</p>
  </div>
);

/** Standardized Error State screen with retry button */
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Unable to load records',
  message = 'A connection or server error occurred while fetching data.',
  onRetry,
}) => (
  <div
    role="alert"
    className="flex flex-col items-center justify-center py-16 px-6 gap-3 bg-slate-900 border border-rose-500/30 rounded-2xl my-4 text-center animate-in fade-in duration-200"
  >
    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
      <AlertTriangle className="w-7 h-7" />
    </div>
    <div className="space-y-1 max-w-md">
      <h3 className="text-sm font-bold text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors duration-150 flex items-center gap-1.5"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Try Again</span>
      </button>
    )}
  </div>
);

/** Standardized Empty State screen */
export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center py-14 px-6 gap-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-center">
    <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-400">
      {icon}
    </div>
    <div className="space-y-1 max-w-sm">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {description && <p className="text-xs text-slate-400">{description}</p>}
    </div>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors duration-150"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

/** Top Slim Progress Bar */
export const GlobalTopProgressBar: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  if (!isLoading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-950 overflow-hidden">
      <div className="h-full bg-amber-500 animate-pulse w-full" />
    </div>
  );
};
