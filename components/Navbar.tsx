'use client';

import React from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  Store,
  LayoutDashboard,
  BookOpen,
  Boxes,
  RotateCcw,
  Menu,
  Wallet,
  UserPlus,
  PackagePlus,
  Sparkles,
  Search,
} from 'lucide-react';

export type NavTab = 'DASHBOARD' | 'KHATA' | 'PRODUCTS';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onToggleLeftMenu: () => void;
  onOpenAddCustomer: () => void;
  onOpenAddProduct: () => void;
  onOpenRecordTx: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onToggleLeftMenu,
  onOpenAddCustomer,
  onOpenAddProduct,
  onOpenRecordTx,
}) => {
  const { stats, resetToDefaults } = useKhata();

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
                <span className="mx-2">•</span>
                Stock Alerts: <span className="font-bold text-amber-400">{stats.lowStockCount + stats.outOfStockCount}</span>
              </div>
            </div>
          </div>

          {/* Center Tabs (Visible on mobile/tablet or secondary bar) */}
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
              {stats.activeDebtorsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {stats.activeDebtorsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('PRODUCTS')}
              className={`p-2 rounded-xl text-xs font-bold transition-all relative ${
                currentTab === 'PRODUCTS'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Boxes className="w-4 h-4" />
            </button>
          </nav>

          {/* Desktop Right Quick Drawer Launchers */}
          <div className="flex items-center gap-2">
            <button
              id="top-record-payment-btn"
              type="button"
              onClick={onOpenRecordTx}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>+ Record Payment</span>
            </button>

            <button
              id="top-add-customer-btn"
              type="button"
              onClick={onOpenAddCustomer}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Customer</span>
            </button>

            <button
              id="top-add-product-btn"
              type="button"
              onClick={onOpenAddProduct}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
            >
              <PackagePlus className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Product</span>
            </button>

            <button
              id="reset-mock-data-btn"
              type="button"
              onClick={() => {
                if (confirm('Reset sample retail data (customers, transactions, products) back to default demo state?')) {
                  resetToDefaults();
                }
              }}
              title="Reset Sample Data"
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-xl border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
