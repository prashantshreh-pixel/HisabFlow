'use client';

import React from 'react';
import { useKhata } from '@/context/KhataContext';
import { NavTab } from '@/components/Navbar';
import {
  Store,
  LayoutDashboard,
  BookOpen,
  Boxes,
  Wallet,
  UserPlus,
  PackagePlus,
  RotateCcw,
  Sparkles,
  TrendingUp,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AppSidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddCustomer: () => void;
  onOpenAddProduct: () => void;
  onOpenRecordTx: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenAddCustomer,
  onOpenAddProduct,
  onOpenRecordTx,
}) => {
  const { stats } = useKhata();

  return (
    <aside className="hidden lg:flex flex-col justify-between w-64 shrink-0 bg-slate-900/95 border-r border-slate-800/90 h-screen sticky top-0 z-30 select-none">
      {/* Brand & Store Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-slate-100">
                  Hisab<span className="text-amber-400">Flow</span>
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded">
                  POS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Digital Retail & Khata Ledger</p>
            </div>
          </div>
        </div>

        {/* Quick 1-Click Action Buttons */}
        <div className="p-4 border-b border-slate-800/60">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2 px-1">
            Quick Actions
          </span>
          <div className="grid grid-cols-1 gap-2">
            <button
              id="sidebar-quick-payment-btn"
              type="button"
              onClick={onOpenRecordTx}
              className="w-full flex items-center justify-between px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-all group"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <span>Receive Payment</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-extrabold">+ Jamā</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="sidebar-quick-customer-btn"
                type="button"
                onClick={onOpenAddCustomer}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold transition-all"
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Customer</span>
              </button>

              <button
                id="sidebar-quick-product-btn"
                type="button"
                onClick={onOpenAddProduct}
                className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold transition-all"
              >
                <PackagePlus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Product</span>
              </button>
            </div>
          </div>
        </div>

        {/* Primary Navigation Menus */}
        <div className="p-4 space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2 px-1">
            Store Navigation
          </span>

          <button
            id="sidebar-nav-dashboard"
            type="button"
            onClick={() => onTabChange('DASHBOARD')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'DASHBOARD'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview Dashboard</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            id="sidebar-nav-khata"
            type="button"
            onClick={() => onTabChange('KHATA')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              currentTab === 'KHATA'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4" />
              <span>Digital Khata (Ledger)</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>

          <button
            id="sidebar-nav-products"
            type="button"
            onClick={() => onTabChange('PRODUCTS')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              currentTab === 'PRODUCTS'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Boxes className="w-4 h-4" />
              <span>Products & Inventory</span>
            </div>
            {stats.lowStockCount + stats.outOfStockCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  currentTab === 'PRODUCTS'
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {stats.lowStockCount + stats.outOfStockCount} Low
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Footer Mini Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-3">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <span>Outstanding Due:</span>
            <span className="font-black text-rose-400">Rs. {stats.totalOutstandingKhata.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Inventory Value:</span>
            <span className="font-semibold text-slate-200">Rs. {stats.totalInventoryCostValue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
