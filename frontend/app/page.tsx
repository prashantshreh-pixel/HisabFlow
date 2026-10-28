'use client';

import React, { useState, useEffect } from 'react';
import { LoginView } from '@/components/LoginView';
import { KhataProvider } from '@/context/KhataContext';
import { Navbar, NavTab } from '@/components/Navbar';
import { AppSidebar } from '@/components/AppSidebar';
import { LeftMenuDrawer } from '@/components/LeftMenuDrawer';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { DashboardView } from '@/components/DashboardView';
import { PosView } from '@/components/PosView';
import { KhataView } from '@/components/KhataView';
import { ProductsView } from '@/components/ProductsView';
import { ExpensesView } from '@/components/ExpensesView';
import { SuppliersView } from '@/components/SuppliersView';
import { ReportsView } from '@/components/ReportsView';
import { SettingsView } from '@/components/SettingsView';
import { ToastContainer } from '@/components/ToastContainer';
import { AddCustomerModal } from '@/components/Modals/AddCustomerModal';
import { RecordTransactionModal } from '@/components/Modals/RecordTransactionModal';
import { CustomerStatementModal } from '@/components/Modals/CustomerStatementModal';
import { AddEditProductModal } from '@/components/Modals/AddEditProductModal';
import { ProductScannerModal, ScannedProductDraft } from '@/components/Modals/ProductScannerModal';
import { QuickStockAdjustModal } from '@/components/Modals/QuickStockAdjustModal';
import { AddExpenseModal } from '@/components/Modals/AddExpenseModal';
import { AddSupplierModal } from '@/components/Modals/AddSupplierModal';
import { RecordSupplierTxModal } from '@/components/Modals/RecordSupplierTxModal';
import { SupplierStatementModal } from '@/components/Modals/SupplierStatementModal';
import { CashReconciliationModal } from '@/components/Modals/CashReconciliationModal';
import { TerminalLockModal } from '@/components/Modals/TerminalLockModal';
import { GlobalTopProgressBar } from '@/components/Loader';
import { useKhata } from '@/context/KhataContext';
import { logoutUser, checkIsAuthenticated } from '@/lib/auth';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { Product, LedgerTransactionType, SupplierTransactionType } from '@/types';

interface MainAppProps {
  onLogout: () => void;
}

function MainApp({ onLogout }: MainAppProps) {
  const { isLoading } = useKhata();
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('tab');
      if (param === 'POS' || param === 'KHATA' || param === 'PRODUCTS' || param === 'DASHBOARD') {
        return param;
      }
    }
    return 'DASHBOARD';
  });
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [isTerminalLocked, setIsTerminalLocked] = useState(false);

  // Inactivity detection: 5 minutes idle lock on POS, 15 minutes otherwise
  const idleTimeout = currentTab === 'POS' ? 5 * 60 * 1000 : 15 * 60 * 1000;
  useIdleTimer({
    timeoutMs: idleTimeout,
    onIdle: () => setIsTerminalLocked(true),
    enabled: !isTerminalLocked,
  });

  // Modal / Drawer states
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isCashReconciliationOpen, setIsCashReconciliationOpen] = useState(false);

  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [recordTxCustomerId, setRecordTxCustomerId] = useState<string | undefined>(undefined);
  const [recordTxType, setRecordTxType] = useState<LedgerTransactionType>('PAYMENT_RECEIVED');

  const [isRecordSupplierTxOpen, setIsRecordSupplierTxOpen] = useState(false);
  const [recordSupplierTxId, setRecordSupplierTxId] = useState<string | undefined>(undefined);
  const [recordSupplierTxType, setRecordSupplierTxType] = useState<SupplierTransactionType>('STOCK_PURCHASE');

  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);
  const [statementSupplierId, setStatementSupplierId] = useState<string | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProductScannerOpen, setIsProductScannerOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [scannedProductDraft, setScannedProductDraft] = useState<Partial<Product> | null>(null);

  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);

  const handleOpenRecordTx = (customerId?: string, type?: LedgerTransactionType) => {
    setRecordTxCustomerId(customerId);
    setRecordTxType(type || 'PAYMENT_RECEIVED');
    setIsRecordTxOpen(true);
  };

  const handleOpenRecordSupplierTx = (supplierId?: string, type?: SupplierTransactionType) => {
    setRecordSupplierTxId(supplierId);
    setRecordSupplierTxType(type || 'STOCK_PURCHASE');
    setIsRecordSupplierTxOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setProductToEdit(product);
    setScannedProductDraft(null);
    setIsProductModalOpen(true);
  };

  const handleOpenAddProduct = () => {
    setProductToEdit(null);
    setScannedProductDraft(null);
    setIsProductModalOpen(true);
  };

  const handleProductScanned = (scannedData: ScannedProductDraft) => {
    setProductToEdit(null);
    setScannedProductDraft({
      name: scannedData.name || '',
      brand: scannedData.brand || '',
      barcode: scannedData.barcode || '',
      category: scannedData.category || 'Packaged Foods & Snacks',
      unit: (scannedData.unit || 'pcs') as any,
      imageUrl: scannedData.imageUrl || '',
      description: scannedData.description || '',
    });
    setIsProductScannerOpen(false);
    setIsProductModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-amber-500 selection:text-slate-950 relative">
      {/* Top Slim Animated Progress Bar */}
      <GlobalTopProgressBar isLoading={isLoading} />

      {/* Persistent Left Sidebar on Desktop */}
      <AppSidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
        onOpenAddProduct={handleOpenAddProduct}
        onOpenRecordTx={() => handleOpenRecordTx()}
        onOpenCashReconciliation={() => setIsCashReconciliationOpen(true)}
        onLogout={onLogout}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Bar / Mobile Header */}
        <Navbar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onToggleLeftMenu={() => setIsLeftMenuOpen(true)}
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          onLogout={onLogout}
        />

        {/* Mobile Left-Side Navigation Drawer */}
        <LeftMenuDrawer
          isOpen={isLeftMenuOpen}
          onClose={() => setIsLeftMenuOpen(false)}
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          onOpenAddProduct={handleOpenAddProduct}
          onOpenRecordTx={() => handleOpenRecordTx()}
          onOpenCashReconciliation={() => setIsCashReconciliationOpen(true)}
          onLogout={onLogout}
        />

        {/* Main Application Views */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-10">
          {currentTab === 'DASHBOARD' && (
            <DashboardView
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenRecordTransaction={handleOpenRecordTx}
              onOpenAddProduct={handleOpenAddProduct}
              onSelectCustomer={(id) => setStatementCustomerId(id)}
              onQuickStockAdjust={(p) => setQuickStockProduct(p)}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'POS' && <PosView />}

          {currentTab === 'KHATA' && (
            <KhataView
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenRecordTransaction={handleOpenRecordTx}
              onSelectCustomer={(id) => setStatementCustomerId(id)}
            />
          )}

          {currentTab === 'PRODUCTS' && (
            <ProductsView
              onOpenAddProduct={handleOpenAddProduct}
              onOpenScanner={() => setIsProductScannerOpen(true)}
              onEditProduct={handleOpenEditProduct}
              onQuickStockAdjust={(p) => setQuickStockProduct(p)}
            />
          )}

          {currentTab === 'EXPENSES' && (
            <ExpensesView onOpenAddExpense={() => setIsAddExpenseOpen(true)} />
          )}

          {currentTab === 'SUPPLIERS' && (
            <SuppliersView
              onOpenAddSupplier={() => setIsAddSupplierOpen(true)}
              onOpenRecordTransaction={handleOpenRecordSupplierTx}
              onSelectSupplier={(id) => setStatementSupplierId(id)}
            />
          )}

          {currentTab === 'REPORTS' && <ReportsView />}

          {currentTab === 'SETTINGS' && <SettingsView />}
        </main>
      </div>

      {/* Native-Feel Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenMoreMenu={() => setIsLeftMenuOpen(true)}
      />

      {/* Modals & Dialogs */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />

      <AddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
      />

      <RecordSupplierTxModal
        isOpen={isRecordSupplierTxOpen}
        onClose={() => setIsRecordSupplierTxOpen(false)}
        defaultSupplierId={recordSupplierTxId}
        defaultType={recordSupplierTxType}
      />

      <SupplierStatementModal
        supplierId={statementSupplierId}
        isOpen={!!statementSupplierId}
        onClose={() => setStatementSupplierId(null)}
      />

      <RecordTransactionModal
        key={`rec-tx-${recordTxCustomerId || 'all'}-${recordTxType}-${isRecordTxOpen}`}
        isOpen={isRecordTxOpen}
        onClose={() => setIsRecordTxOpen(false)}
        defaultCustomerId={recordTxCustomerId}
        defaultType={recordTxType}
      />

      <CustomerStatementModal
        key={`statement-${statementCustomerId || 'none'}`}
        customerId={statementCustomerId}
        isOpen={!!statementCustomerId}
        onClose={() => setStatementCustomerId(null)}
      />

      <ProductScannerModal
        isOpen={isProductScannerOpen}
        onClose={() => setIsProductScannerOpen(false)}
        onProductScanned={handleProductScanned}
        onEditExistingProduct={(product) => {
          setProductToEdit(product);
          setScannedProductDraft(null);
          setIsProductScannerOpen(false);
          setIsProductModalOpen(true);
        }}
      />

      <AddEditProductModal
        key={`prod-modal-${productToEdit?.id || 'new'}-${isProductModalOpen}`}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setScannedProductDraft(null);
        }}
        productToEdit={productToEdit}
        initialData={scannedProductDraft}
        onOpenScanner={() => {
          setIsProductModalOpen(false);
          setIsProductScannerOpen(true);
        }}
      />

      <QuickStockAdjustModal
        key={`stock-adj-${quickStockProduct?.id || 'none'}`}
        isOpen={!!quickStockProduct}
        onClose={() => setQuickStockProduct(null)}
        product={quickStockProduct}
      />

      <CashReconciliationModal
        isOpen={isCashReconciliationOpen}
        onClose={() => setIsCashReconciliationOpen(false)}
      />

      {/* POS Terminal Idle Lock Screen */}
      <TerminalLockModal
        isOpen={isTerminalLocked}
        onUnlock={() => setIsTerminalLocked(false)}
        onLogout={() => {
          setIsTerminalLocked(false);
          onLogout();
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAuthenticated(checkIsAuthenticated());
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsAuthChecked(true);
    }

    // Register Service Worker for offline PWA & zero-lag asset caching
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    logoutUser(() => setIsAuthenticated(false));
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400 font-bold text-sm">
        Initializing HisabFlow...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <KhataProvider>
      <MainApp onLogout={handleLogout} />
    </KhataProvider>
  );
}
