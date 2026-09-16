'use client';

import React from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  Menu,
  Languages,
  CalendarDays,
  Store,
  ScanBarcode,
  UserPlus,
} from 'lucide-react';

export type NavTab = 'DASHBOARD' | 'POS' | 'KHATA' | 'PRODUCTS' | 'EXPENSES' | 'SUPPLIERS' | 'REPORTS' | 'SETTINGS';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onToggleLeftMenu: () => void;
  onOpenAddCustomer?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onToggleLeftMenu,
  onOpenAddCustomer,
}) => {
  const { stats, language, calendarMode, toggleLanguage, toggleCalendarMode } = useKhata();
  const totalStockAlerts = stats.lowStockCount + stats.outOfStockCount;

  return (
    <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Left Menu Toggle + Brand on Mobile */}
          <div className="flex items-center gap-3">
            <button
              id="open-left-menu-btn"
              type="button"
              onClick={onToggleLeftMenu}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg border border-slate-800 transition-all flex items-center"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                <Store className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-100">
                Hisab<span className="text-amber-400">Flow</span>
              </span>
            </div>

            {/* Desktop Store Status Indicator */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-[11px]">Register Active</span>
              </div>
              <div className="text-[11px] text-slate-400 font-normal">
                Debtors: <span className="text-slate-200 font-mono font-medium">{stats.activeDebtorsCount}</span>
                <span className="mx-2 text-slate-700">&middot;</span>
                Stock Alerts:{' '}
                <span className={`font-mono font-medium ${totalStockAlerts > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {totalStockAlerts}
                </span>
              </div>
            </div>
          </div>

          {/* Right Actions: Header CTAs + Disambiguated Calendar & Language Switchers */}
          <div className="flex items-center gap-2">
            {/* Primary Action Button (Only one solid amber button in header) */}
            <div className="hidden sm:flex items-center gap-2 mr-2 pr-2 border-r border-slate-800">
              <button
                type="button"
                onClick={() => onTabChange('POS')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <ScanBarcode className="w-3.5 h-3.5" />
                <span>New Sale (POS)</span>
              </button>

              {onOpenAddCustomer && (
                <button
                  type="button"
                  onClick={onOpenAddCustomer}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Add Customer</span>
                </button>
              )}
            </div>

            {/* Disambiguated Calendar System Toggle */}
            <button
              id="toggle-calendar-btn"
              type="button"
              onClick={toggleCalendarMode}
              title={`Active Calendar: ${calendarMode === 'BS' ? 'Bikram Sambat (B.S.)' : 'Gregorian (A.D.)'}. Click to switch.`}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px]">Cal: <strong className="text-slate-200 font-semibold">{calendarMode === 'BS' ? 'B.S.' : 'A.D.'}</strong></span>
            </button>

            {/* Disambiguated Language Switcher */}
            <button
              id="toggle-language-btn"
              type="button"
              onClick={toggleLanguage}
              title={`Active Language: ${language === 'en' ? 'English' : 'Nepali'}. Click to toggle.`}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-slate-100 border border-slate-800 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px]">Lang: <strong className="text-slate-200 font-semibold">{language === 'en' ? 'EN' : 'नेपाली'}</strong></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
