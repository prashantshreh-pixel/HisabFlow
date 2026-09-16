import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - HisabFlow',
  description: 'Privacy Policy and Data Protection standards for HisabFlow.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
          <div className="text-xs text-slate-500 font-medium">Effective: September 2026</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Data Protection & Privacy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Privacy Policy</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            HisabFlow is designed with privacy-first principles. We prioritize local control over your business data and commercial records.
          </p>
        </div>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-8">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">1. Information Collection</h2>
            <p>
              HisabFlow processes data entered directly by you, including customer profiles (names, contact numbers), inventory items (SKUs, costs, sales prices), and commercial transactions (credit disbursements, cash payments, reconciliations).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">2. Storage and Data Ownership</h2>
            <p>
              Your store ledger and financial data remain your sole property. HisabFlow utilizes local terminal caching and your designated store backend storage. We do not sell, license, or monetize your store&apos;s customer lists, sales figures, or supplier transactions to third parties or advertising networks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">3. Security Measures</h2>
            <p>
              We implement industry-standard encryption protocols for data in transit and credential verification. Local browser storage mechanisms are used strictly to maintain operational sessions and necessary terminal state.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">4. Customer Communication Data</h2>
            <p>
              When utilizing built-in messaging features (such as generating WhatsApp ledger balance statements), data is formatted locally on your device before transfer to the chosen messaging platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">5. Data Retention and Erasure</h2>
            <p>
              Store administrators retain complete control to modify, archive, or delete customer accounts, supplier profiles, and historical ledger entries directly through the administrative settings interface.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} HisabFlow. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-emerald-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-emerald-400 transition-colors">
              Return to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
