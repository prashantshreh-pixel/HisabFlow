'use client';

import React, { useState } from 'react';
import { KhataProvider } from '@/context/KhataContext';
import { Navbar, NavTab } from '@/components/Navbar';
import { AppSidebar } from '@/components/AppSidebar';
import { LeftMenuDrawer } from '@/components/LeftMenuDrawer';
import { DashboardView } from '@/components/DashboardView';
import { KhataView } from '@/components/KhataView';
import { ProductsView } from '@/components/ProductsView';
import { ToastContainer } from '@/components/ToastContainer';
import { AddCustomerModal } from '@/components/Modals/AddCustomerModal';
import { RecordTransactionModal } from '@/components/Modals/RecordTransactionModal';
import { CustomerStatementModal } from '@/components/Modals/CustomerStatementModal';
import { AddEditProductModal } from '@/components/Modals/AddEditProductModal';
import { QuickStockAdjustModal } from '@/components/Modals/QuickStockAdjustModal';
import { Product, LedgerTransactionType } from '@/types';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>('DASHBOARD');
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);

  // Modal / Drawer states
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  
  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [recordTxCustomerId, setRecordTxCustomerId] = useState<string | undefined>(undefined);
  const [recordTxType, setRecordTxType] = useState<LedgerTransactionType>('PAYMENT_RECEIVED');

  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);

  const handleOpenRecordTx = (customerId?: string, type?: LedgerTransactionType) => {
    setRecordTxCustomerId(customerId);
    setRecordTxType(type || 'PAYMENT_RECEIVED');
    setIsRecordTxOpen(true);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-amber-500 selection:text-slate-950">
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
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          onOpenAddProduct={handleOpenAddProduct}
          onOpenRecordTx={() => handleOpenRecordTx()}
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
        </main>
      </div>

      {/* Right Slide-Over Drawers (All slide from the right side) */}
      <AddCustomerModal
        key={`add-cust-${isAddCustomerOpen}`}
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSuccess={(newId) => {
          setStatementCustomerId(newId);
        }}
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
  return (
    <KhataProvider>
      <MainApp />
    </KhataProvider>
  );
}
