'use client';

import React from 'react';
import { useKhata } from '@/context/KhataContext';
import { NavTab } from '@/components/Navbar';
import {
  X,
  Store,
  LayoutDashboard,
  BookOpen,
  Boxes,
  ShoppingCart,
  Truck,
  Receipt,
  BarChart3,
  Settings,
  ShieldCheck,
  RotateCcw,
  Wallet,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface LeftMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddCustomer: () => void;
  onOpenAddProduct: () => void;
  onOpenRecordTx: () => void;
}

export const LeftMenuDrawer: React.FC<LeftMenuDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onOpenAddCustomer,
  onOpenAddProduct,
  onOpenRecordTx,
}) => {
  const { stats, customers, products } = useKhata();

  if (!isOpen) return null;

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <div
      id="left-menu-drawer-backdrop"
      className="fixed inset-0 z-50 flex bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Left Drawer Panel */}
      <div
        id="left-menu-drawer-panel"
        className="w-full max-w-xs sm:max-w-sm h-full bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-300 text-slate-100"
      >
        {/* Header */}
        <div>
          <div className="p-5 border-b border-slate-800/90 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-base tracking-tight text-slate-100">
                    Hisab<span className="text-amber-400">Flow</span>
                  </h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Digital Khata & Retail Ledger</p>
              </div>
            </div>

            <button
              id="close-left-menu-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Shortcuts inside Drawer */}
          <div className="p-4 bg-slate-950/60 border-b border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Quick Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecordTx();
                }}
                className="px-2.5 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-2"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>+ Payment</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddCustomer();
                }}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all text-left flex items-center gap-2"
              >
                <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>+ Customer</span>
              </button>
            </div>
          </div>

          {/* Primary Navigation Menus */}
          <div className="p-4 space-y-5">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5 block">
                Core Modules
              </span>
              <nav className="space-y-1">
                {/* 1. Overview */}
                <button
                  id="drawer-nav-dashboard"
                  type="button"
                  onClick={() => handleTabClick('DASHBOARD')}
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

                {/* 2. Khata */}
                <button
                  id="drawer-nav-khata"
                  type="button"
                  onClick={() => handleTabClick('KHATA')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'KHATA'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4" />
                    <span>Digital Khata (Ledger)</span>
                  </div>
                  {stats.activeDebtorsCount > 0 ? (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        currentTab === 'KHATA'
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {stats.activeDebtorsCount} Due
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  )}
                </button>

                {/* 3. Products & Stock */}
                <button
                  id="drawer-nav-products"
                  type="button"
                  onClick={() => handleTabClick('PRODUCTS')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'PRODUCTS'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Boxes className="w-4 h-4" />
                    <span>Products & Inventory</span>
                  </div>
                  {stats.lowStockCount + stats.outOfStockCount > 0 ? (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        currentTab === 'PRODUCTS'
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {stats.lowStockCount + stats.outOfStockCount} Low
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  )}
                </button>
              </nav>
            </div>

            {/* Additional Expansion Modules (Ready for the user to extend) */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5 block">
                Additional Modules (Extensible)
              </span>
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <ShoppingCart className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                    <span>POS / Quick Billing</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Ready</span>
                </div>

                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Truck className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                    <span>Suppliers & Wholesale</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Ready</span>
                </div>

                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                    <span>Profit & Loss Reports</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Ready</span>
                </div>

                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                    <span>Expense Tracker</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Ready</span>
                </div>

                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                    <span>Store Settings & Backup</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info & Reset button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Total Khata Receivables:</span>
              <span className="font-bold text-rose-400">Rs. {stats.totalOutstandingKhata.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Stock Cost Valuation:</span>
              <span className="font-bold text-slate-200">Rs. {stats.totalInventoryCostValue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transparent Clickable Area to Close */}
      <div className="flex-1 h-full cursor-pointer" onClick={onClose} />
    </div>
  );
};
