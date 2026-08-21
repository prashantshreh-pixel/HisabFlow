'use client';

import React, { useState, useEffect } from 'react';
import { LoginView } from '@/components/LoginView';
import { KhataProvider } from '@/context/KhataContext';
import { Navbar, NavTab } from '@/components/Navbar';
import { AppSidebar } from '@/components/AppSidebar';
import { LeftMenuDrawer } from '@/components/LeftMenuDrawer';
import { DashboardView } from '@/components/DashboardView';
import { KhataView } from '@/components/KhataView';
import { ProductsView } from '@/components/ProductsView';
import { ExpensesView } from '@/components/ExpensesView';
import { SuppliersView } from '@/components/SuppliersView';
import { SettingsView } from '@/components/SettingsView';
import { ToastContainer } from '@/components/ToastContainer';
import { AddCustomerModal } from '@/components/Modals/AddCustomerModal';
import { RecordTransactionModal } from '@/components/Modals/RecordTransactionModal';
import { CustomerStatementModal } from '@/components/Modals/CustomerStatementModal';
import { AddEditProductModal } from '@/components/Modals/AddEditProductModal';
import { QuickStockAdjustModal } from '@/components/Modals/QuickStockAdjustModal';
import { AddExpenseModal } from '@/components/Modals/AddExpenseModal';
import { AddSupplierModal } from '@/components/Modals/AddSupplierModal';
import { RecordSupplierTxModal } from '@/components/Modals/RecordSupplierTxModal';
import { SupplierStatementModal } from '@/components/Modals/SupplierStatementModal';
import { PageLoader, GlobalTopProgressBar } from '@/components/Loader';
import { useKhata } from '@/context/KhataContext';
import { Product, LedgerTransactionType, SupplierTransactionType } from '@/types';

function MainApp() {
  const { isLoading } = useKhata();
  const [currentTab, setCurrentTab] = useState<NavTab>('DASHBOARD');
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);

  // Modal / Drawer states
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  
  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [recordTxCustomerId, setRecordTxCustomerId] = useState<string | undefined>(undefined);
  const [recordTxType, setRecordTxType] = useState<LedgerTransactionType>('PAYMENT_RECEIVED');

  const [isRecordSupplierTxOpen, setIsRecordSupplierTxOpen] = useState(false);
  const [recordSupplierTxId, setRecordSupplierTxId] = useState<string | undefined>(undefined);
  const [recordSupplierTxType, setRecordSupplierTxType] = useState<SupplierTransactionType>('STOCK_PURCHASE');

  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);
  const [statementSupplierId, setStatementSupplierId] = useState<string | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

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
    setIsProductModalOpen(true);
  };

  const handleOpenAddProduct = () => {
    setProductToEdit(null);
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
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Bar / Mobile Header */}
        <Navbar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onToggleLeftMenu={() => setIsLeftMenuOpen(true)}
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
        />

        {/* Main Application Views */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              onEditProduct={handleOpenEditProduct}
              onQuickStockAdjust={(p) => setQuickStockProduct(p)}
            />
          )}

          {currentTab === 'EXPENSES' && (
            <ExpensesView
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            />
          )}

          {currentTab === 'SUPPLIERS' && (
            <SuppliersView
              onOpenAddSupplier={() => setIsAddSupplierOpen(true)}
              onOpenRecordTransaction={handleOpenRecordSupplierTx}
              onSelectSupplier={(id) => setStatementSupplierId(id)}
            />
          )}

          {currentTab === 'SETTINGS' && <SettingsView />}
        </main>
      </div>

      {/* Right Slide-Over Drawers */}
      <AddCustomerModal
        key={`add-cust-${isAddCustomerOpen}`}
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSuccess={(newId) => {
          setStatementCustomerId(newId);
        }}
      />

      <AddExpenseModal
        key={`add-exp-${isAddExpenseOpen}`}
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />

      <AddSupplierModal
        key={`add-sup-${isAddSupplierOpen}`}
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        onSuccess={(newId) => {
          setStatementSupplierId(newId);
        }}
      />

      <RecordSupplierTxModal
        key={`rec-sup-tx-${recordSupplierTxId || 'all'}-${recordSupplierTxType}-${isRecordSupplierTxOpen}`}
        isOpen={isRecordSupplierTxOpen}
        onClose={() => setIsRecordSupplierTxOpen(false)}
        defaultSupplierId={recordSupplierTxId}
        defaultType={recordSupplierTxType}
      />

      <SupplierStatementModal
        key={`supplier-stmt-${statementSupplierId || 'none'}`}
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

      <AddEditProductModal
        key={`prod-modal-${productToEdit?.id || 'new'}-${isProductModalOpen}`}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      <QuickStockAdjustModal
        key={`stock-adj-${quickStockProduct?.id || 'none'}`}
        isOpen={!!quickStockProduct}
        onClose={() => setQuickStockProduct(null)}
        product={quickStockProduct}
      />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem('hisabflow_auth');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  // Show loader while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <PageLoader text="Starting HisabFlow..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <KhataProvider>
      <MainApp />
    </KhataProvider>
  );
}
