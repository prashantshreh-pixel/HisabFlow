'use client';

import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert, LogOut } from 'lucide-react';
import { getCurrentUser, DEMO_USERS, logoutUser } from '@/lib/auth';

interface TerminalLockModalProps {
  isOpen: boolean;
  onUnlock: () => void;
  onLogout: () => void;
}

export const TerminalLockModal: React.FC<TerminalLockModalProps> = ({
  isOpen,
  onUnlock,
  onLogout,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const currentUser = getCurrentUser();

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = password.trim();
    if (!trimmed) {
      setError('Please enter your password or PIN.');
      return;
    }

    const username = currentUser?.username || 'admin';
    const demoUser = DEMO_USERS[username.toLowerCase()];

    // Verify password against current user
    if (demoUser && demoUser.password === trimmed) {
      setPassword('');
      setError('');
      onUnlock();
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl shadow-black/60 relative">
        <div className="text-center space-y-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Terminal Locked</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Locked due to 5 minutes of inactivity. Cart items preserved.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
            <span className="font-medium">{currentUser?.displayName || 'Operator'}</span>
            <span className="text-[10px] text-slate-500 font-mono">(@{currentUser?.username || 'user'})</span>
          </div>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Enter Password or PIN
            </label>
            <input
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono text-center tracking-widest"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors text-xs flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Resume Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onLogout}
            className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Account</span>
          </button>
          <span className="text-[10px] font-mono text-slate-500">HisabFlow POS</span>
        </div>
      </div>
    </div>
  );
};
