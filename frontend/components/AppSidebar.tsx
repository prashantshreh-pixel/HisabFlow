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
  Calculator,
  User,
} from 'lucide-react';

interface AppSidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAddCustomer?: () => void;
  onOpenAddProduct?: () => void;
  onOpenRecordTx?: () => void;
  onOpenCashReconciliation?: () => void;
  onLogout?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenCashReconciliation,
  onLogout,
}) => {
  const { stats, storeProfile, t } = useKhata();
  const currentUser = getCurrentUser();
  const perms = getUserPermissions(currentUser?.role);

  const stockAlerts = stats.lowStockCount + stats.outOfStockCount;

  const allNavItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    visible: boolean;
  }[] = [
    { id: 'DASHBOARD', label: t('dashboard'), icon: LayoutDashboard, visible: true },
    { id: 'POS', label: t('pos'), icon: ScanBarcode, visible: perms.canAccessPOS },
    { id: 'KHATA', label: t('khata'), icon: BookOpen, visible: perms.canManageKhata || perms.canReceivePayments },
    {
      id: 'PRODUCTS',
      label: t('products'),
      icon: Boxes,
      badge: stockAlerts > 0 ? `${stockAlerts}` : undefined,
      visible: perms.canManageProducts,
    },
    { id: 'EXPENSES', label: t('expenses'), icon: Receipt, visible: perms.canManageExpenses },
    { id: 'SUPPLIERS', label: t('suppliers'), icon: Truck, visible: perms.canManageSuppliers },
    { id: 'REPORTS', label: t('reports'), icon: BarChart3, visible: perms.canViewReports },
    { id: 'SETTINGS', label: t('settings'), icon: Settings, visible: perms.canManageSettings },
  ];

  const visibleNavItems = allNavItems.filter((i) => i.visible);

  return (
    <aside className="hidden lg:flex flex-col justify-between w-64 shrink-0 bg-slate-950 border-r border-slate-800/80 h-screen sticky top-0 z-30 select-none">
      {/* Top Brand & Primary Navigation */}
      <div>
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <Store className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm tracking-tight text-slate-100 block truncate">
              {storeProfile?.storeName || 'HisabFlow'}
            </span>
            <p className="text-[11px] text-slate-400 truncate">Retail POS &amp; Ledger</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3.5 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-amber-500/12 text-amber-400 font-semibold border border-amber-500/25'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 font-medium border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Clean Operator Footer */}
      <div className="p-3.5 border-t border-slate-800/80 space-y-2.5">
        {onOpenCashReconciliation && (
          <button
            type="button"
            onClick={onOpenCashReconciliation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>Shift Cash Closure</span>
          </button>
        )}

        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate block">
                {currentUser?.displayName || 'Operator'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono uppercase">
                {currentUser?.role || 'ADMIN'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logoutUser(onLogout)}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
