'use client';

import React, { useState } from 'react';
import { Store, KeyRound, User, ArrowRight, Eye, EyeOff, ShieldCheck, CheckSquare, Square } from 'lucide-react';
import { ButtonSpinner } from '@/components/Loader';
import { getImageUrl } from '@/lib/api';

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

    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    if (username.trim() === 'admin' && password === 'admin') {
      localStorage.setItem('hisabflow_auth', 'true');
      onLoginSuccess();
    } else {
      setError('Invalid username or password. Hint: use admin / admin');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-purple-500 selection:text-white relative overflow-x-hidden">
      {/* 1. Top Curved Hero Header Banner */}
      <div className="relative w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 pt-12 pb-32 px-4 sm:px-8 shadow-xl">
        {/* Subtle Backdrop Pattern */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: `url(${getImageUrl('/images/retail_hero_bg.jpg')})` }}
        />

        {/* Ambient Purple Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-500/20 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          {/* Logo Title */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-white shadow-2xl backdrop-blur-md">
            <Store className="w-7 h-7 text-amber-400" />
            <span className="text-2xl font-black tracking-wider uppercase text-white">
              HISAB<span className="text-amber-400">FLOW</span>
            </span>
          </div>

          {/* Welcome Pill */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-sm font-semibold backdrop-blur-md shadow-sm">
              <span>Hello 👋 Welcome!</span>
            </div>
          </div>
        </div>

        {/* 2. Curved Arc SVG Divider (Light bottom curve sweeping into top header) */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none pointer-events-none">
          <svg
            className="relative block w-full h-16 sm:h-28 text-slate-50 fill-current"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
          >
            <path d="M0,0 C480,90 960,90 1440,0 L1440,120 L0,120 Z"></path>
          </svg>
        </div>
      </div>

      {/* 3. Lower Background Area with Centered Floating Card */}
      <div className="flex-1 bg-slate-50 relative px-4 pb-20 flex flex-col justify-start items-center">
        {/* Subtle Grid Lines Pattern */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
            backgroundSize: '32px 32px' 
          }} 
        />

        {/* 4. Floating Card Container */}
        <div className="w-full max-w-md relative z-20 -mt-24 sm:-mt-28">
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-2xl shadow-purple-900/15 border border-slate-100 relative">
            {/* Header inside card */}
            <div className="text-center space-y-1 mb-6">
              <div className="inline-block relative">
                <span className="absolute -inset-1 rounded-lg bg-purple-100/80 -z-10 transform -rotate-1"></span>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 px-2">
                  Log<span className="text-purple-600">In</span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Please login to admin dashboard
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              {/* Username Input */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email/Username<span className="text-purple-600">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    disabled={isLoading}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all disabled:opacity-50"
                    placeholder="Admin@gamil.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password<span className="text-purple-600">*</span>
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4 text-purple-600" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all disabled:opacity-50"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
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
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
                >
                  {rememberMe ? (
                    <CheckSquare className="w-4 h-4 text-purple-600 fill-purple-100" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300" />
                  )}
                  <span>Remember me</span>
                </button>

                <button
                  type="button"
                  onClick={() => setError('Contact store administrator to reset credentials.')}
                  className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold text-center animate-in fade-in duration-200">
                  {error}
                </div>
              )}

              {/* Primary Login Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all text-sm tracking-wide flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <>
                      <ButtonSpinner />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Login</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-medium text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> HisabFlow POS Secure Engine
              </span>
              <span className="font-mono text-slate-400">v1.0.0</span>
            </div>
          </div>

          {/* 3D Mascot Character Overlay - Transparent PNG floating on lower right */}
          <div className="hidden lg:block absolute -right-28 -bottom-6 w-48 h-72 pointer-events-none z-30">
            <img
              src={getImageUrl('/images/store_owner_3d.png')}
              alt="HisabFlow Mascot Character"
              className="w-full h-full object-contain filter drop-shadow-[0_15px_20px_rgba(0,0,0,0.15)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
