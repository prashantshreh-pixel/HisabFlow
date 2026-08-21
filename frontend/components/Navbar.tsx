'use client';

import React from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  LogOut, Store,
  LayoutDashboard,
  BookOpen,
  Boxes,
  Receipt,
  Truck,
  Menu,
} from 'lucide-react';

export type NavTab = 'DASHBOARD' | 'KHATA' | 'PRODUCTS' | 'EXPENSES' | 'SUPPLIERS' | 'SETTINGS';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onToggleLeftMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onToggleLeftMenu,
}) => {
  const { stats } = useKhata();

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

            {/* Mobile Brand */}
            <div
              className="flex lg:hidden items-center gap-2 cursor-pointer"
              onClick={() => onTabChange('DASHBOARD')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shrink-0">
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

          {/* Center Tabs (Visible on mobile/tablet) */}
          <nav className="flex lg:hidden items-center gap-1">
            <button
              type="button"
              onClick={() => onTabChange('DASHBOARD')}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'DASHBOARD'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onTabChange('KHATA')}
              className={`p-2 rounded-xl text-xs font-bold transition-all relative ${
                currentTab === 'KHATA'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onTabChange('PRODUCTS')}
              className={`p-2 rounded-xl text-xs font-bold transition-all relative ${
                currentTab === 'PRODUCTS'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
              title="Products"
            >
              <Boxes className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onTabChange('EXPENSES')}
              className={`p-2 rounded-xl text-xs font-bold transition-all relative ${
                currentTab === 'EXPENSES'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
              title="Expenses"
            >
              <Receipt className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onTabChange('SUPPLIERS')}
              className={`p-2 rounded-xl text-xs font-bold transition-all relative ${
                currentTab === 'SUPPLIERS'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
              title="Suppliers & Wholesale"
            >
              <Truck className="w-4 h-4" />
            </button>
          </nav>

          {/* Right: Sign Out only */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('hisabflow_auth');
                window.location.reload();
              }}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl border border-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
