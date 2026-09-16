'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Store, KeyRound, User, ArrowRight, Eye, EyeOff, ShieldCheck, CheckSquare, Square, Shield } from 'lucide-react';
import { ButtonSpinner } from '@/components/Loader';
import { getImageUrl } from '@/lib/api';
import { loginUser, DEMO_USERS } from '@/lib/auth';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter your username and password.');
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const matched = DEMO_USERS[trimmedUser];
    if (matched && matched.password === trimmedPass) {
      loginUser(matched.user);
      onLoginSuccess();
    } else {
      setError('Invalid credentials. Use demo roles: admin/admin, manager/manager, or cashier/cashier.');
      setIsLoading(false);
    }
  };

  const handleSelectQuickRole = (roleKey: 'admin' | 'manager' | 'cashier') => {
    const creds = DEMO_USERS[roleKey];
    if (creds) {
      setUsername(creds.user.username);
      setPassword(creds.password);
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* 1. Header Banner */}
      <div className="relative w-full bg-slate-950 border-b border-slate-800/80 pt-12 pb-28 px-4 sm:px-8">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-5 pointer-events-none"
          style={{ backgroundImage: `url(${getImageUrl('/images/retail_hero_bg.jpg')})` }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-lg">
            <Store className="w-6 h-6 text-amber-400" />
            <span className="text-xl font-black tracking-wider uppercase text-white">
              HISAB<span className="text-amber-400">FLOW</span>
            </span>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
              Retail Ledger &amp; Point of Sale Management
            </p>
          </div>
        </div>
      </div>

      {/* 2. Lower Area with Centered Floating Card */}
      <div className="flex-1 bg-slate-900 relative px-4 pb-16 flex flex-col justify-start items-center">
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`,
            backgroundSize: '32px 32px' 
          }} 
        />

        {/* 3. Floating Card Container */}
        <div className="w-full max-w-md relative z-20 -mt-16">
          <div className="bg-slate-950 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative">
            <div className="text-center space-y-1 mb-5">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Sign <span className="text-amber-400">In</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Enter credentials to access your store terminal
              </p>
            </div>

            {/* Quick Role Selector for testing / demo */}
            <div className="mb-5 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5 px-1">
                Select Demo Role
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectQuickRole('admin')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    username === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuickRole('manager')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    username === 'manager'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750'
                  }`}
                >
                  Manager
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectQuickRole('cashier')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    username === 'cashier'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750'
                  }`}
                >
                  Cashier
                </button>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              {/* Username Input */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Email or Username
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    disabled={isLoading}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
                    placeholder="admin"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors font-medium"
                >
                  {rememberMe ? (
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-600" />
                  )}
                  <span>Remember me</span>
                </button>

                <button
                  type="button"
                  onClick={() => setError('Contact store administrator to reset credentials.')}
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-semibold text-center animate-in fade-in duration-200">
                  {error}
                </div>
              )}

              {/* Primary Login Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-md hover:shadow-amber-500/20 transition-all text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <ButtonSpinner />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Terminal</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> RBAC Engine Active
              </span>
              <span className="font-mono text-slate-500">v1.0.0</span>
            </div>
          </div>

          {/* Legal and Compliance Links in Footer */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms &amp; Conditions
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
