'use client';

import React from 'react';
import { useKhata } from '@/context/KhataContext';
import { logoutUser, getCurrentUser, getUserPermissions } from '@/lib/auth';
import { NavTab } from '@/components/Navbar';
import {
  Store,
  LayoutDashboard,
  ScanBarcode,
  BookOpen,
  Boxes,
  Receipt,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Wallet,
  Calculator,
  UserPlus,
  PackagePlus,
  ShieldCheck,
  User,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AppSidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddCustomer: () => void;
  onOpenAddProduct: () => void;
  onOpenRecordTx: () => void;
  onOpenCashReconciliation?: () => void;
  onLogout?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenAddCustomer,
  onOpenAddProduct,
  onOpenRecordTx,
  onOpenCashReconciliation,
  onLogout,
}) => {
  const { stats, t } = useKhata();
  const currentUser = getCurrentUser();
  const perms = getUserPermissions(currentUser?.role);

  const allNavItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string; visible: boolean }[] = [
    { id: 'DASHBOARD', label: t('dashboard'), icon: LayoutDashboard, visible: true },
    { id: 'POS', label: t('pos'), icon: ScanBarcode, visible: perms.canAccessPOS },
    { id: 'KHATA', label: t('khata'), icon: BookOpen, visible: perms.canManageKhata || perms.canReceivePayments },
    { 
      id: 'PRODUCTS', 
      label: t('products'), 
      icon: Boxes,
      badge: stats.lowStockCount + stats.outOfStockCount > 0 ? `${stats.lowStockCount + stats.outOfStockCount} Low` : undefined,
      visible: perms.canManageProducts,
    },
    { id: 'EXPENSES', label: t('expenses'), icon: Receipt, visible: perms.canManageExpenses },
    { id: 'SUPPLIERS', label: t('suppliers'), icon: Truck, visible: perms.canManageSuppliers },
    { id: 'REPORTS', label: t('reports'), icon: BarChart3, visible: perms.canViewReports },
    { id: 'SETTINGS', label: t('settings'), icon: Settings, visible: perms.canManageSettings },
  ];

  const visibleNavItems = allNavItems.filter((i) => i.visible);

  return (
    <aside className="hidden lg:flex flex-col justify-between w-64 shrink-0 bg-slate-900/90 border-r border-slate-800/80 h-screen sticky top-0 z-30 select-none backdrop-blur-sm">
      {/* Brand & Store Header */}
      <div>
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-slate-100 block">
                Hisab<span className="text-amber-400">Flow</span>
              </span>
              <p className="text-[11px] text-slate-400 font-normal">Retail Ledger &amp; POS</p>
            </div>
          </div>
        </div>

        {/* Operator Profile Badge */}
        <div className="px-4 py-2.5 bg-slate-950/50 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate block">
                {currentUser?.displayName || 'Operator'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">@{currentUser?.username || 'user'}</span>
            </div>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
            currentUser?.role === 'ADMIN'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              : currentUser?.role === 'MANAGER'
              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}>
            {currentUser?.role || 'CASHIER'}
          </span>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="p-3 border-b border-slate-800/80">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 px-1">
            Quick Actions
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onOpenRecordTx}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white rounded-md text-xs font-medium transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Payment</span>
            </button>

            {onOpenCashReconciliation && (
              <button
                type="button"
                onClick={onOpenCashReconciliation}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white rounded-md text-xs font-medium transition-colors"
              >
                <Calculator className="w-3.5 h-3.5 text-slate-400" />
                <span>Closure</span>
              </button>
            )}

            {perms.canManageKhata && (
              <button
                type="button"
                onClick={onOpenAddCustomer}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white rounded-md text-xs font-medium transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer</span>
              </button>
            )}

            {perms.canManageProducts && (
              <button
                type="button"
                onClick={onOpenAddProduct}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white rounded-md text-xs font-medium transition-colors"
              >
                <PackagePlus className="w-3.5 h-3.5 text-slate-400" />
                <span>Product</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Navigation Menus */}
        <div className="p-3 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5 px-2">
            Navigation
          </span>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
                  isActive
                    ? 'bg-slate-800/90 text-amber-400 font-semibold border-l-2 border-amber-400 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/40 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Balance Overview & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-baseline justify-between text-slate-400">
            <span className="text-[11px] font-medium">Due Balances:</span>
            <span className="font-semibold font-mono text-rose-400">
              {formatCurrency(stats.totalOutstandingKhata)}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-slate-400">
            <span className="text-[11px] font-medium">Stock Value:</span>
            <span className="font-medium font-mono text-slate-200">
              {formatCurrency(stats.totalInventoryCostValue)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logoutUser(onLogout)}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white rounded-md text-xs font-medium transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
