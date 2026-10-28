'use client';

import React, { useState, useEffect } from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  Languages,
  CalendarDays,
  Store,
  ScanBarcode,
  Download,
} from 'lucide-react';

export type NavTab = 'DASHBOARD' | 'POS' | 'KHATA' | 'PRODUCTS' | 'EXPENSES' | 'SUPPLIERS' | 'REPORTS' | 'SETTINGS';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onToggleLeftMenu: () => void;
  onOpenAddCustomer?: () => void;
  onLogout?: () => void;
}

const TAB_TITLES: Record<NavTab, string> = {
  DASHBOARD: 'Store Overview',
  POS: 'Point of Sale Terminal',
  KHATA: 'Customer Khata Ledger',
  PRODUCTS: 'Product Inventory',
  EXPENSES: 'Store Expenses',
  SUPPLIERS: 'Supplier Ledgers',
  REPORTS: 'Financial Reports',
  SETTINGS: 'System Settings',
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
}) => {
  const { language, calendarMode, toggleLanguage, toggleCalendarMode, storeProfile } = useKhata();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 pt-safe">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Left: Mobile Brand / Desktop Current Section Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2.5 lg:hidden min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-sm tracking-tight text-slate-100 block truncate">
                  {storeProfile?.storeName || 'HisabFlow'}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {TAB_TITLES[currentTab]}
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
                {TAB_TITLES[currentTab]}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
          </div>

          {/* Right: Clean Utility Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallApp}
                className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Install HisabFlow App on your device"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {currentTab !== 'POS' && (
              <button
                type="button"
                onClick={() => onTabChange('POS')}
                className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                <ScanBarcode className="w-3.5 h-3.5" />
                <span>POS Billing</span>
              </button>
            )}

            {/* Calendar Toggle */}
            <button
              id="toggle-calendar-btn"
              type="button"
              onClick={toggleCalendarMode}
              title={`Active Calendar: ${calendarMode === 'BS' ? 'Bikram Sambat (B.S.)' : 'Gregorian (A.D.)'}`}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-semibold text-slate-200">{calendarMode}</span>
            </button>

            {/* Language Toggle */}
            <button
              id="toggle-language-btn"
              type="button"
              onClick={toggleLanguage}
              title={`Active Language: ${language === 'en' ? 'English' : 'Nepali'}`}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-200">{language === 'en' ? 'EN' : 'ने'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
