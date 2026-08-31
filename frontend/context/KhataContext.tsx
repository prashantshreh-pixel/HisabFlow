'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Customer, CreditLedgerEntry, Product, Expense, ExpenseSummary, Supplier, SupplierLedgerEntry, SupplierSummary, DashboardStats, LedgerTransactionType, SupplierTransactionType } from '@/types';
import { reportsApi, ApiDashboardSummary } from '@/lib/api';
import { ToastProvider, useToast, ToastNotification } from '@/context/ToastContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { Language, CalendarMode, TRANSLATIONS } from '@/lib/translations';

import { useCustomerDomain } from '@/hooks/useCustomerDomain';
import { useProductDomain } from '@/hooks/useProductDomain';
import { useExpenseDomain } from '@/hooks/useExpenseDomain';
import { useSupplierDomain } from '@/hooks/useSupplierDomain';

interface KhataContextType {
  isLoading: boolean;
  isCustomersLoading: boolean;
  isProductsLoading: boolean;
  isExpensesLoading: boolean;
  isSuppliersLoading: boolean;

  customers: Customer[];
  ledgerEntries: CreditLedgerEntry[];
  products: Product[];
  expenses: Expense[];
  expensesSummary: ExpenseSummary;
  suppliers: Supplier[];
  suppliersSummary: SupplierSummary;
  stats: DashboardStats;

  // Toast Facade
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;

  // Language & Calendar Facade
  language: Language;
  calendarMode: CalendarMode;
  setLanguage: (lang: Language) => void;
  setCalendarMode: (mode: CalendarMode) => void;
  toggleLanguage: () => void;
  toggleCalendarMode: () => void;
  formatDate: (dateInput: Date | string) => string;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;

  // Customer operations
  addCustomer: (data: { name: string; phone: string; address?: string; creditLimit: number; initialBalance?: number; initialNote?: string }) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;
  getCustomerLedger: (customerId: string) => Promise<CreditLedgerEntry[]>;

  // Ledger operations
  recordTransaction: (params: {
    customerId: string;
    type: LedgerTransactionType;
    amount: number;
    notes: string;
    paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER' | 'CREDIT_NOTE';
    billNumber?: string;
    date?: string;
  }) => Promise<CreditLedgerEntry | null>;

  // Product operations
  addProduct: (data: Omit<Product, 'id' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, delta: number, reason?: string) => Promise<void>;

  // Expense operations
  addExpense: (data: { category: string; title: string; amount: number; paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER'; particulars?: string; expenseDate?: string }) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;

  // Supplier operations
  addSupplier: (data: { name: string; phone: string; companyName?: string; address?: string; initialBalance?: number; initialNote?: string }) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  getSupplierById: (id: string) => Supplier | undefined;
  getSupplierLedger: (supplierId: string) => Promise<SupplierLedgerEntry[]>;
  recordSupplierTransaction: (params: {
    supplierId: string;
    type: SupplierTransactionType;
    amount: number;
    notes?: string;
    invoiceNumber?: string;
    paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER';
    date?: string;
  }) => Promise<SupplierLedgerEntry | null>;

  // Refresh utility
  refreshData: () => Promise<void>;
}

const KhataContext = createContext<KhataContextType | null>(null);

const KhataInnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, showToast, dismissToast } = useToast();
  const { language, calendarMode, setLanguage, setCalendarMode, toggleLanguage, toggleCalendarMode, formatDate, t } = useSettings();

  const [dashboardSummary, setDashboardSummary] = useState<ApiDashboardSummary>({
    totalOutstandingKhata: 0,
    totalInventoryCostValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    todayCashSales: 0,
    todayDigitalSales: 0,
    todayCreditGiven: 0,
    todayTotalSales: 0,
    todayExpensesAmount: 0,
    activeCustomersCount: 0,
    activeProductsCount: 0,
  });

  const fetchDashboardSummary = useCallback(async () => {
    try {
      const summary = await reportsApi.getDashboardSummary();
      setDashboardSummary(summary);
    } catch (err: unknown) {
      console.warn('Failed to fetch dashboard summary from API:', err);
    }
  }, []);

  // Domain Hooks
  const customerDomain = useCustomerDomain({ showToast, onMutationSuccess: fetchDashboardSummary });
  const productDomain = useProductDomain({ showToast, onMutationSuccess: fetchDashboardSummary });
  const expenseDomain = useExpenseDomain({ showToast, onMutationSuccess: fetchDashboardSummary });
  const supplierDomain = useSupplierDomain({ showToast, onMutationSuccess: fetchDashboardSummary });

  const refreshData = useCallback(async () => {
    await Promise.all([
      customerDomain.fetchCustomers(),
      customerDomain.fetchRecentTransactions(),
      productDomain.fetchProducts(),
      expenseDomain.fetchExpenses(),
      supplierDomain.fetchSuppliers(),
      fetchDashboardSummary(),
    ]);
  }, [customerDomain, productDomain, expenseDomain, supplierDomain, fetchDashboardSummary]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute Dashboard Stats (Combines backend summary endpoint with fallbacks)
  const stats: DashboardStats = useMemo(() => {
    const totalOutstandingKhata = dashboardSummary.totalOutstandingKhata || customerDomain.customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const totalInventoryCostValue = dashboardSummary.totalInventoryCostValue || productDomain.products.reduce((sum, p) => sum + p.stockQuantity * p.costPrice, 0);
    const lowStockCount = dashboardSummary.lowStockCount || productDomain.products.filter((p) => p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0).length;
    const outOfStockCount = dashboardSummary.outOfStockCount || productDomain.products.filter((p) => p.stockQuantity <= 0).length;

    const todayCashSales = dashboardSummary.todayCashSales || 0;
    const todayDigitalSales = dashboardSummary.todayDigitalSales || 0;
    const todayCreditGiven = dashboardSummary.todayCreditGiven || 0;
    const todayPaymentReceived = todayCashSales + todayDigitalSales;
    const todayTotalSales = dashboardSummary.todayTotalSales || (todayPaymentReceived + todayCreditGiven);
    const todayExpenses = expenseDomain.expensesSummary.todayExpenses || dashboardSummary.todayExpensesAmount || 0;

    return {
      totalOutstandingKhata,
      totalCreditLimit: customerDomain.customers.reduce((sum, c) => sum + c.creditLimit, 0),
      todayCashSales,
      todayDigitalSales,
      todayCreditGiven,
      todayPaymentReceived,
      todayTotalSales,
      todayNetFlow: todayPaymentReceived - todayExpenses,
      lowStockCount,
      outOfStockCount,
      activeDebtorsCount: customerDomain.customers.filter((c) => c.currentBalance > 0).length,
      totalCustomersCount: customerDomain.customers.length,
      totalInventoryCostValue,
      totalInventorySalesValue: productDomain.products.reduce((sum, p) => sum + p.stockQuantity * p.sellingPrice, 0),
      totalExpenses: expenseDomain.expensesSummary.totalExpenses,
      todayExpenses,
      monthExpenses: expenseDomain.expensesSummary.monthExpenses,
      totalOutstandingPayable: supplierDomain.suppliersSummary.totalOutstandingPayable,
      todaySupplierPurchases: supplierDomain.suppliersSummary.todayPurchases,
      todaySupplierPayments: supplierDomain.suppliersSummary.todayPaymentsGiven,
    };
  }, [dashboardSummary, customerDomain.customers, productDomain.products, expenseDomain.expensesSummary, supplierDomain.suppliersSummary]);

  const isLoading = customerDomain.isCustomersLoading || productDomain.isProductsLoading || expenseDomain.isExpensesLoading || supplierDomain.isSuppliersLoading;

  return (
    <KhataContext.Provider
      value={{
        isLoading,
        isCustomersLoading: customerDomain.isCustomersLoading,
        isProductsLoading: productDomain.isProductsLoading,
        isExpensesLoading: expenseDomain.isExpensesLoading,
        isSuppliersLoading: supplierDomain.isSuppliersLoading,
        customers: customerDomain.customers,
        ledgerEntries: customerDomain.ledgerEntries,
        products: productDomain.products,
        expenses: expenseDomain.expenses,
        expensesSummary: expenseDomain.expensesSummary,
        suppliers: supplierDomain.suppliers,
        suppliersSummary: supplierDomain.suppliersSummary,
        stats,
        toasts,
        dismissToast,
        showToast,
        language,
        calendarMode,
        setLanguage,
        setCalendarMode,
        toggleLanguage,
        toggleCalendarMode,
        formatDate,
        t,
        addCustomer: customerDomain.addCustomer,
        updateCustomer: customerDomain.updateCustomer,
        deleteCustomer: customerDomain.deleteCustomer,
        getCustomerById: customerDomain.getCustomerById,
        getCustomerLedger: customerDomain.getCustomerLedger,
        recordTransaction: customerDomain.recordTransaction,
        addProduct: productDomain.addProduct,
        updateProduct: productDomain.updateProduct,
        deleteProduct: productDomain.deleteProduct,
        adjustStock: productDomain.adjustStock,
        addExpense: expenseDomain.addExpense,
        deleteExpense: expenseDomain.deleteExpense,
        addSupplier: supplierDomain.addSupplier,
        updateSupplier: supplierDomain.updateSupplier,
        deleteSupplier: supplierDomain.deleteSupplier,
        getSupplierById: supplierDomain.getSupplierById,
        getSupplierLedger: supplierDomain.getSupplierLedger,
        recordSupplierTransaction: supplierDomain.recordSupplierTransaction,
        refreshData,
      }}
    >
      {children}
    </KhataContext.Provider>
  );
};

export const KhataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <SettingsProvider>
      <KhataInnerProvider>{children}</KhataInnerProvider>
    </SettingsProvider>
  </ToastProvider>
);

export const useKhata = (): KhataContextType => {
  const context = useContext(KhataContext);
  if (!context) {
    throw new Error('useKhata must be used within a KhataProvider');
  }
  return context;
};
