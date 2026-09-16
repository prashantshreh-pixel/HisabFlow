import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - HisabFlow',
  description: 'Terms of Service and End User License Agreement for HisabFlow digital ledger and POS.',
};

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Terms of Service</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Please review these Terms of Service carefully before utilizing the HisabFlow digital khata, inventory ledger, and point-of-sale management software.
          </p>
        </div>

        <div className="space-y-8 text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-8">
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">1. Acceptance of Terms</h2>
            <p>
              By accessing, installing, or operating HisabFlow, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service. If you do not agree with any portion of these terms, do not use the application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">2. Service Scope and Use</h2>
            <p>
              HisabFlow provides digital bookkeeping, customer credit tracking (Khata), inventory management, and transaction reconciliation tools for commercial retail operators. You agree to use HisabFlow strictly in compliance with applicable commercial and financial bookkeeping regulations in your operational jurisdiction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">3. Data Accuracy and Ledger Integrity</h2>
            <p>
              You maintain full responsibility for the precision, truthfulness, and integrity of ledger records, customer credit entries, product pricing, and stock records keyed into your store instance. HisabFlow does not independently audit your local transaction inputs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">4. Account Security</h2>
            <p>
              Store administrators are solely responsible for securing administrative access, passwords, and local terminal hardware. You agree to notify store administrators immediately upon detecting any unauthorized terminal access or compromised credentials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">5. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, HisabFlow and its authors shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from ledger discrepancies, hardware malfunctions, local data loss, or business interruption.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-xs">6. Modifications</h2>
            <p>
              We reserve the right to revise or replace these terms as feature sets evolve. Continued use of the platform after modifications signifies consent to the revised terms.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} HisabFlow. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-amber-400 transition-colors">
              Return to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
