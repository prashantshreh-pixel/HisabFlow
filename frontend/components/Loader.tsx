'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', text, className = '' }) => (
  <div className={`flex items-center justify-center gap-2 ${className}`}>
    <Loader2 className={`${sizeMap[size]} animate-spin text-amber-400`} />
    {text && <span className="text-xs text-slate-400 font-medium">{text}</span>}
  </div>
);

export const ButtonSpinner: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <Loader2 className={`${className} animate-spin text-current shrink-0`} />
);

/** Full page/section loader with centered spinner fitting dark slate/amber UI */
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading records...' }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-3 bg-slate-900/50 border border-slate-800/80 rounded-3xl my-4 animate-in fade-in duration-200">
    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-inner">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
    <p className="text-xs text-slate-300 font-bold tracking-wide">{text}</p>
  </div>
);

/** Skeleton line placeholder */
export const SkeletonLine: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse bg-slate-800/80 rounded-lg ${className}`} />
);

/** Card skeleton matching dashboard metric cards */
export const SkeletonCard: React.FC = () => (
  <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <SkeletonLine className="h-3 w-1/3 bg-slate-800" />
        <SkeletonLine className="h-6 w-1/2 bg-slate-800" />
      </div>
      <div className="w-10 h-10 rounded-2xl bg-slate-800/80" />
    </div>
    <SkeletonLine className="h-3 w-2/3 bg-slate-800/60" />
  </div>
);

/** Table row skeleton */
export const SkeletonTableRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr className="animate-pulse border-b border-slate-800/60">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-4 bg-slate-800/80 rounded-lg w-full" />
      </td>
    ))}
  </tr>
);

/** Top Slim Animated Progress Bar */
export const GlobalTopProgressBar: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  if (!isLoading) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-950 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 animate-pulse w-full" />
    </div>
  );
};
