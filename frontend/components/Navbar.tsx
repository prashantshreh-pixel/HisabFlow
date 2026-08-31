'use client';

import React from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  LogOut, Store,
  LayoutDashboard,
  ScanBarcode,
  BookOpen,
  Boxes,
  Receipt,
  Truck,
  BarChart3,
  Menu,
  Globe,
  Calendar,
} from 'lucide-react';

export type NavTab = 'DASHBOARD' | 'POS' | 'KHATA' | 'PRODUCTS' | 'EXPENSES' | 'SUPPLIERS' | 'REPORTS' | 'SETTINGS';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onToggleLeftMenu: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onToggleLeftMenu,
  onLogout,
}) => {
  const { stats, language, calendarMode, toggleLanguage, toggleCalendarMode } = useKhata();

  return (
    <header className="sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Left Menu Toggle + Brand on Mobile */}
          <div className="flex items-center gap-3">
            <button
              id="open-left-menu-btn"
              type="button"
              onClick={onToggleLeftMenu}
              className="lg:hidden p-2 text-slate-300 hover:text-amber-400 hover:bg-slate-900 rounded-xl border border-slate-800 transition-all flex items-center gap-1.5"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                <Store className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-100">
                Hisab<span className="text-amber-400">Flow</span>
              </span>
            </div>

            {/* Desktop Store Status Indicator */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Retail Ledger Active</span>
              </div>
              <div className="text-xs text-slate-400">
                Debtors: <span className="font-bold text-rose-400">{stats.activeDebtorsCount}</span>
                <span className="mx-2">&middot;</span>
                Stock Alerts: <span className="font-bold text-amber-400">{stats.lowStockCount + stats.outOfStockCount}</span>
              </div>
            </div>
          </div>

          {/* Right Actions: B.S. Calendar Toggle, Language Switcher, Sign Out */}
          <div className="flex items-center gap-2">
            {/* Quick Header Controls */}
            <div className="flex items-center gap-2">
              {/* B.S. / A.D. Date Converter Toggle */}
              <button
                id="toggle-calendar-btn"
                type="button"
                onClick={toggleCalendarMode}
                title={`Switch calendar to ${calendarMode === 'AD' ? 'Bikram Sambat (B.S.)' : 'Gregorian (A.D.)'}`}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>{calendarMode === 'BS' ? 'नेपाली (B.S.)' : 'English (A.D.)'}</span>
              </button>

              {/* Language Switcher */}
              <button
                id="toggle-language-btn"
                type="button"
                onClick={toggleLanguage}
                title={`Switch language to ${language === 'en' ? 'Nepali' : 'English'}`}
                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'नेपाली' : 'English'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
