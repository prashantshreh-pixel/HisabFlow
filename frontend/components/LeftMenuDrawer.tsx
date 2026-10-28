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
  X,
  LogOut,
  Calculator,
  User,
} from 'lucide-react';

interface LeftMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddCustomer?: () => void;
  onOpenAddProduct?: () => void;
  onOpenRecordTx?: () => void;
  onOpenCashReconciliation?: () => void;
  onLogout?: () => void;
}

export const LeftMenuDrawer: React.FC<LeftMenuDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onOpenCashReconciliation,
  onLogout,
}) => {
  const { stats, storeProfile, t } = useKhata();
  const currentUser = getCurrentUser();
  const perms = getUserPermissions(currentUser?.role);

  if (!isOpen) return null;

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

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
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative flex flex-col justify-between w-72 max-w-[82vw] bg-slate-950 border-r border-slate-800 h-full p-4 select-none z-10 overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Store className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-sm text-slate-100 block truncate">
                  {storeProfile?.storeName || 'HisabFlow'}
                </span>
                <span className="text-[11px] text-slate-400 block truncate">Retail POS &amp; Ledger</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <div className="py-4 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs transition-colors ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/25">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2.5 pb-safe">
          {onOpenCashReconciliation && (
            <button
              type="button"
              onClick={() => {
                onOpenCashReconciliation();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-medium transition-colors"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Shift Cash Closure</span>
            </button>
          )}

          <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                <User className="w-4 h-4" />
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
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
