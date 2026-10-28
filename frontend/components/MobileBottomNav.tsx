'use client';

import React from 'react';
import { NavTab } from '@/components/Navbar';
import { useKhata } from '@/context/KhataContext';
import { getCurrentUser, getUserPermissions } from '@/lib/auth';
import {
  LayoutDashboard,
  ScanBarcode,
  BookOpen,
  Boxes,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenMoreMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onTabChange,
  onOpenMoreMenu,
}) => {
  const { stats, t } = useKhata();
  const currentUser = getCurrentUser();
  const perms = getUserPermissions(currentUser?.role);
  const hasStockAlert = stats.lowStockCount + stats.outOfStockCount > 0;
  const isMoreTabActive =
    currentTab === 'EXPENSES' ||
    currentTab === 'SUPPLIERS' ||
    currentTab === 'REPORTS' ||
    currentTab === 'SETTINGS';

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 pb-safe select-none"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-2">
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => onTabChange('DASHBOARD')}
          className={`flex flex-col items-center justify-center gap-1 h-full transition-colors ${
            currentTab === 'DASHBOARD' ? 'text-amber-400' : 'text-slate-400 active:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight">{t('dashboard')}</span>
        </button>

        {/* 2. Khata */}
        {(perms.canManageKhata || perms.canReceivePayments) ? (
          <button
            type="button"
            onClick={() => onTabChange('KHATA')}
            className={`flex flex-col items-center justify-center gap-1 h-full transition-colors ${
              currentTab === 'KHATA' ? 'text-amber-400' : 'text-slate-400 active:text-slate-200'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-semibold tracking-tight">{t('khata')}</span>
          </button>
        ) : (
          <div />
        )}

        {/* 3. Center POS Billing CTA */}
        <div className="flex items-center justify-center h-full">
          <button
            type="button"
            onClick={() => onTabChange('POS')}
            className={`-mt-4 w-13 h-13 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 ${
              currentTab === 'POS'
                ? 'bg-amber-400 text-slate-950 shadow-amber-500/30 ring-4 ring-slate-950'
                : 'bg-amber-500 text-slate-950 shadow-amber-500/20 ring-4 ring-slate-950'
            }`}
          >
            <ScanBarcode className="w-5 h-5 stroke-[2.25]" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">POS</span>
          </button>
        </div>

        {/* 4. Products / Inventory */}
        {perms.canManageProducts ? (
          <button
            type="button"
            onClick={() => onTabChange('PRODUCTS')}
            className={`relative flex flex-col items-center justify-center gap-1 h-full transition-colors ${
              currentTab === 'PRODUCTS' ? 'text-amber-400' : 'text-slate-400 active:text-slate-200'
            }`}
          >
            <div className="relative">
              <Boxes className="w-5 h-5" />
              {hasStockAlert && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
              )}
            </div>
            <span className="text-[10px] font-semibold tracking-tight">{t('products')}</span>
          </button>
        ) : (
          <div />
        )}

        {/* 5. More Menu */}
        <button
          type="button"
          onClick={onOpenMoreMenu}
          className={`flex flex-col items-center justify-center gap-1 h-full transition-colors ${
            isMoreTabActive ? 'text-amber-400' : 'text-slate-400 active:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
