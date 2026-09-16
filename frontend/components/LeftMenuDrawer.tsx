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
  Wallet,
  UserPlus,
  PackagePlus,
  User,
} from 'lucide-react';

interface LeftMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddCustomer: () => void;
  onOpenAddProduct: () => void;
  onOpenRecordTx: () => void;
  onLogout?: () => void;
}

export const LeftMenuDrawer: React.FC<LeftMenuDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onOpenAddCustomer,
  onOpenAddProduct,
  onOpenRecordTx,
  onLogout,
}) => {
  const { stats, t } = useKhata();
  const currentUser = getCurrentUser();
  const perms = getUserPermissions(currentUser?.role);

  if (!isOpen) return null;

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

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
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <div className="relative flex flex-col justify-between w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 h-full p-4 select-none z-10">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                <Store className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-100">
                Hisab<span className="text-amber-400">Flow</span>
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Operator Profile Badge */}
          <div className="py-2.5 px-2 border-b border-slate-800/80 flex items-center justify-between">
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

          {/* Quick Actions */}
          <div className="py-3 border-b border-slate-800/80 space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block px-1">
              Actions
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => { onOpenRecordTx(); onClose(); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-md text-xs font-medium"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Payment</span>
              </button>
              {perms.canManageKhata && (
                <button
                  type="button"
                  onClick={() => { onOpenAddCustomer(); onClose(); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-md text-xs font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-3 space-y-1">
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
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 font-semibold border-l-2 border-amber-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => logoutUser(onLogout)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
