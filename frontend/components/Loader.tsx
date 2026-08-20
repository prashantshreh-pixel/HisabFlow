'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', text, className = '' }) => (
  <div className={`flex items-center justify-center gap-2 ${className}`}>
    <Loader2 className={`${sizeMap[size]} animate-spin text-amber-400`} />
    {text && <span className="text-sm text-slate-400">{text}</span>}
  </div>
);

/** Full page/section loader with centered spinner */
export const PageLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
    <p className="text-sm text-slate-400 font-medium">{text}</p>
  </div>
);

/** Skeleton line placeholder */
export const SkeletonLine: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse bg-slate-800 rounded ${className}`} />
);

/** Card skeleton */
export const SkeletonCard: React.FC = () => (
  <div className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-slate-800" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-4 w-1/3" />
        <SkeletonLine className="h-3 w-1/4" />
      </div>
    </div>
    <SkeletonLine className="h-3 w-2/3" />
    <div className="flex gap-4">
      <SkeletonLine className="h-8 w-24" />
      <SkeletonLine className="h-8 w-24" />
    </div>
  </div>
);

/** Table row skeleton */
export const SkeletonTableRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-slate-800 rounded w-full" />
      </td>
    ))}
  </tr>
);

/** Button spinner for inline loading states */
export const ButtonSpinner: React.FC = () => (
  <Loader2 className="w-4 h-4 animate-spin" />
);
