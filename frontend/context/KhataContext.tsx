'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Customer, CreditLedgerEntry, Product, Expense, ExpenseSummary, Supplier, SupplierLedgerEntry, SupplierSummary, DashboardStats, LedgerTransactionType, SupplierTransactionType } from '@/types';
import { customersApi, productsApi, expensesApi, suppliersApi, reportsApi, RecordTransactionPayload, ApiDashboardSummary } from '@/lib/api';
import { mapApiCustomerToUI, mapApiLedgerEntryToUI, mapApiProductToUI, mapApiSupplierToUI, mapApiSupplierLedgerEntryToUI } from '@/lib/mappers';
import { ToastProvider, useToast, ToastNotification } from '@/context/ToastContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { Language, CalendarMode, TRANSLATIONS } from '@/lib/translations';

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

  const [isCustomersLoading, setIsCustomersLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isExpensesLoading, setIsExpensesLoading] = useState(true);
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<CreditLedgerEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesSummary, setExpensesSummary] = useState<ExpenseSummary>({
    totalExpenses: 0,
    todayExpenses: 0,
    monthExpenses: 0,
    totalCount: 0,
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersSummary, setSuppliersSummary] = useState<SupplierSummary>({
    totalOutstandingPayable: 0,
    todayPurchases: 0,
    todayPaymentsGiven: 0,
    activeSuppliersCount: 0,
    totalSuppliersCount: 0,
  });

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

  const fetchCustomers = useCallback(async () => {
    setIsCustomersLoading(true);
    try {
      const data = await customersApi.getAll();
      setCustomers(data.map(mapApiCustomerToUI));
    } catch (err: unknown) {
      console.warn('Failed to fetch customers from API:', err);
    } finally {
      setIsCustomersLoading(false);
    }
  }, []);

  const fetchRecentTransactions = useCallback(async () => {
    try {
      const data = await customersApi.getRecentTransactions(50);
      setLedgerEntries(data.map(mapApiLedgerEntryToUI));
    } catch (err: unknown) {
      console.warn('Failed to fetch transactions from API:', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setIsProductsLoading(true);
    try {
      const data = await productsApi.getAll();
      setProducts(data.map(mapApiProductToUI));
    } catch (err: unknown) {
      console.warn('Failed to fetch products from API:', err);
    } finally {
      setIsProductsLoading(false);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setIsExpensesLoading(true);
    try {
      const data = await expensesApi.getAll(100);
      setExpenses(data);
      const summary = await expensesApi.getSummary();
      setExpensesSummary(summary);
    } catch (err: unknown) {
      console.warn('Failed to fetch expenses from API:', err);
    } finally {
      setIsExpensesLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    setIsSuppliersLoading(true);
    try {
      const data = await suppliersApi.getAll();
      setSuppliers(data.map(mapApiSupplierToUI));
      const summary = await suppliersApi.getSummary();
      setSuppliersSummary(summary);
    } catch (err: unknown) {
      console.warn('Failed to fetch suppliers from API:', err);
    } finally {
      setIsSuppliersLoading(false);
    }
  }, []);

  const fetchDashboardSummary = useCallback(async () => {
    try {
      const summary = await reportsApi.getDashboardSummary();
      setDashboardSummary(summary);
    } catch (err: unknown) {
      console.warn('Failed to fetch dashboard summary from API:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchCustomers(),
      fetchRecentTransactions(),
      fetchProducts(),
      fetchExpenses(),
      fetchSuppliers(),
      fetchDashboardSummary(),
    ]);
  }, [fetchCustomers, fetchRecentTransactions, fetchProducts, fetchExpenses, fetchSuppliers, fetchDashboardSummary]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Customer Operations
  const addCustomer = useCallback(
    async (data: { name: string; phone: string; address?: string; creditLimit: number; initialBalance?: number; initialNote?: string }) => {
      const created = await customersApi.create({
        name: data.name,
        phone: data.phone,
        address: data.address || null,
        creditLimit: data.creditLimit,
        initialBalance: data.initialBalance || 0,
        initialNote: data.initialNote || null,
      });

      const newCustomer = mapApiCustomerToUI(created);
      setCustomers((prev) => [newCustomer, ...prev]);

      showToast({
        type: 'success',
        title: 'Customer Added',
        message: `${newCustomer.name} added to khata ledger.`,
      });

      refreshData();
      return newCustomer;
    },
    [showToast, refreshData]
  );

  const updateCustomer = useCallback(
    async (id: string, updates: Partial<Customer>) => {
      const existing = customers.find((c) => c.id === id);
      if (!existing) return;

      await customersApi.update(id, {
        name: updates.name ?? existing.name,
        phone: updates.phone ?? existing.phone,
        address: updates.address ?? existing.address,
        creditLimit: updates.creditLimit ?? existing.creditLimit,
      });

      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      showToast({ type: 'info', title: 'Customer Updated', message: 'Customer record saved.' });
    },
    [customers, showToast]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      await customersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      showToast({ type: 'warning', title: 'Customer Removed', message: 'Customer record deleted.' });
    },
    [showToast]
  );

  const getCustomerById = useCallback((id: string) => customers.find((c) => c.id === id), [customers]);

  const getCustomerLedger = useCallback(async (customerId: string) => {
    try {
      const stmt = await customersApi.getStatement(customerId);
      return stmt.ledgerEntries.map(mapApiLedgerEntryToUI);
    } catch {
      return [];
    }
  }, []);

  // Ledger Transaction Record
  const recordTransaction = useCallback(
    async (params: {
      customerId: string;
      type: LedgerTransactionType;
      amount: number;
      notes: string;
      paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER' | 'CREDIT_NOTE';
      billNumber?: string;
      date?: string;
    }): Promise<CreditLedgerEntry | null> => {
      const typeNum = params.type === 'CREDIT_PURCHASE' ? 1 : 2;
      let pmNum = 1;
      if (params.paymentMethod === 'QR_PAYMENT') pmNum = 2;
      else if (params.paymentMethod === 'BANK_TRANSFER') pmNum = 3;
      else if (params.paymentMethod === 'CREDIT_NOTE') pmNum = 4;

      const payload: RecordTransactionPayload = {
        customerId: params.customerId,
        type: typeNum,
        amount: params.amount,
        paymentMethod: pmNum,
        particulars: params.notes || null,
        billNumber: params.billNumber || null,
        transactionDate: params.date || null,
      };

      const created = await customersApi.recordTransaction(payload);
      const newEntry = mapApiLedgerEntryToUI(created);

      showToast({
        type: 'success',
        title: 'Transaction Saved',
        message: `Rs. ${params.amount.toLocaleString()} recorded.`,
      });

      refreshData();
      return newEntry;
    },
    [showToast, refreshData]
  );

  // Product Operations
  const addProduct = useCallback(
    async (data: Omit<Product, 'id' | 'updatedAt'>) => {
      const created = await productsApi.create({
        name: data.name,
        category: data.category,
        unit: data.unit,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        stockQuantity: data.stockQuantity,
        minStockAlert: data.minStockAlert,
        barcode: data.barcode || undefined,
        imageUrl: data.imageUrl || undefined,
      });

      const newProduct = mapApiProductToUI(created);
      setProducts((prev) => [newProduct, ...prev]);

      showToast({ type: 'success', title: 'Product Added', message: `${newProduct.name} saved to inventory.` });
      return newProduct;
    },
    [showToast]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      const existing = products.find((p) => p.id === id);
      if (!existing) return;

      await productsApi.update(id, {
        name: updates.name ?? existing.name,
        category: updates.category ?? existing.category,
        unit: updates.unit ?? existing.unit,
        costPrice: updates.costPrice ?? existing.costPrice,
        sellingPrice: updates.sellingPrice ?? existing.sellingPrice,
        stockQuantity: updates.stockQuantity ?? existing.stockQuantity,
        minStockAlert: updates.minStockAlert ?? existing.minStockAlert,
        barcode: updates.barcode ?? existing.barcode,
        imageUrl: updates.imageUrl ?? existing.imageUrl,
      });

      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)));
      showToast({ type: 'info', title: 'Product Updated', message: 'Inventory item saved.' });
    },
    [products, showToast]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await productsApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast({ type: 'warning', title: 'Product Deleted', message: 'Product removed.' });
    },
    [showToast]
  );

  const adjustStock = useCallback(
    async (productId: string, delta: number) => {
      await productsApi.adjustStock(productId, delta);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stockQuantity: Math.max(0, p.stockQuantity + delta) } : p))
      );
      showToast({ type: 'info', title: 'Stock Adjusted', message: `Stock updated by ${delta > 0 ? '+' : ''}${delta}.` });
    },
    [showToast]
  );

  // Expense Operations
  const addExpense = useCallback(
    async (data: { category: string; title: string; amount: number; paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER'; particulars?: string; expenseDate?: string }) => {
      let pmNum = 1;
      if (data.paymentMethod === 'QR_PAYMENT') pmNum = 2;
      else if (data.paymentMethod === 'BANK_TRANSFER') pmNum = 3;

      const created = await expensesApi.create({
        category: data.category,
        title: data.title,
        amount: data.amount,
        paymentMethod: pmNum as unknown as Expense['paymentMethod'],
        particulars: data.particulars,
        expenseDate: data.expenseDate || new Date().toISOString(),
      });

      setExpenses((prev) => [created, ...prev]);
      showToast({ type: 'success', title: 'Expense Added', message: `Rs. ${data.amount} recorded.` });
      refreshData();
      return created;
    },
    [showToast, refreshData]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      await expensesApi.delete(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      showToast({ type: 'warning', title: 'Expense Removed', message: 'Expense entry deleted.' });
      refreshData();
    },
    [showToast, refreshData]
  );

  // Supplier Operations
  const addSupplier = useCallback(
    async (data: { name: string; phone: string; companyName?: string; address?: string; initialBalance?: number; initialNote?: string }) => {
      const created = await suppliersApi.create(data);
      const newSupplier = mapApiSupplierToUI(created);
      setSuppliers((prev) => [newSupplier, ...prev]);
      showToast({ type: 'success', title: 'Supplier Added', message: `${newSupplier.name} saved.` });
      refreshData();
      return newSupplier;
    },
    [showToast, refreshData]
  );

  const updateSupplier = useCallback(
    async (id: string, updates: Partial<Supplier>) => {
      const existing = suppliers.find((s) => s.id === id);
      if (!existing) return;

      const updated = await suppliersApi.update(id, {
        name: updates.name ?? existing.name,
        phone: updates.phone ?? existing.phone,
        companyName: updates.companyName ?? existing.companyName,
        address: updates.address ?? existing.address,
      });

      const updatedUI = mapApiSupplierToUI(updated);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? updatedUI : s)));
      showToast({ type: 'info', title: 'Supplier Saved', message: 'Supplier info updated.' });
    },
    [suppliers, showToast]
  );

  const deleteSupplier = useCallback(
    async (id: string) => {
      await suppliersApi.delete(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      showToast({ type: 'warning', title: 'Supplier Deleted', message: 'Supplier record removed.' });
    },
    [showToast]
  );

  const getSupplierById = useCallback((id: string) => suppliers.find((s) => s.id === id), [suppliers]);

  const getSupplierLedger = useCallback(async (supplierId: string) => {
    try {
      const stmt = await suppliersApi.getStatement(supplierId);
      return stmt.ledgerEntries.map(mapApiSupplierLedgerEntryToUI);
    } catch {
      return [];
    }
  }, []);

  const recordSupplierTransaction = useCallback(
    async (params: {
      supplierId: string;
      type: SupplierTransactionType;
      amount: number;
      notes?: string;
      invoiceNumber?: string;
      paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER';
      date?: string;
    }): Promise<SupplierLedgerEntry | null> => {
      const typeNum = params.type === 'STOCK_PURCHASE' ? 1 : 2;
      let pmNum = 1;
      if (params.paymentMethod === 'QR_PAYMENT') pmNum = 2;
      else if (params.paymentMethod === 'BANK_TRANSFER') pmNum = 3;

      const created = await suppliersApi.recordTransaction({
        supplierId: params.supplierId,
        type: typeNum,
        amount: params.amount,
        paymentMethod: pmNum,
        particulars: params.notes,
        invoiceNumber: params.invoiceNumber,
        transactionDate: params.date,
      });

      const newEntry = mapApiSupplierLedgerEntryToUI(created);
      showToast({ type: 'success', title: 'Supplier Transaction', message: `Rs. ${params.amount} recorded.` });
      refreshData();
      return newEntry;
    },
    [showToast, refreshData]
  );

  // Compute Dashboard Stats (Combines backend summary endpoint with fallbacks)
  const stats: DashboardStats = useMemo(() => {
    const totalOutstandingKhata = dashboardSummary.totalOutstandingKhata || customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const totalInventoryCostValue = dashboardSummary.totalInventoryCostValue || products.reduce((sum, p) => sum + p.stockQuantity * p.costPrice, 0);
    const lowStockCount = dashboardSummary.lowStockCount || products.filter((p) => p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0).length;
    const outOfStockCount = dashboardSummary.outOfStockCount || products.filter((p) => p.stockQuantity <= 0).length;

    const todayCashSales = dashboardSummary.todayCashSales || 0;
    const todayDigitalSales = dashboardSummary.todayDigitalSales || 0;
    const todayCreditGiven = dashboardSummary.todayCreditGiven || 0;
    const todayPaymentReceived = todayCashSales + todayDigitalSales;
    const todayTotalSales = dashboardSummary.todayTotalSales || (todayPaymentReceived + todayCreditGiven);
    const todayExpenses = expensesSummary.todayExpenses || dashboardSummary.todayExpensesAmount || 0;

    return {
      totalOutstandingKhata,
      totalCreditLimit: customers.reduce((sum, c) => sum + c.creditLimit, 0),
      todayCashSales,
      todayDigitalSales,
      todayCreditGiven,
      todayPaymentReceived,
      todayTotalSales,
      todayNetFlow: todayPaymentReceived - todayExpenses,
      lowStockCount,
      outOfStockCount,
      activeDebtorsCount: customers.filter((c) => c.currentBalance > 0).length,
      totalCustomersCount: customers.length,
      totalInventoryCostValue,
      totalInventorySalesValue: products.reduce((sum, p) => sum + p.stockQuantity * p.sellingPrice, 0),
      totalExpenses: expensesSummary.totalExpenses,
      todayExpenses,
      monthExpenses: expensesSummary.monthExpenses,
      totalOutstandingPayable: suppliersSummary.totalOutstandingPayable,
      todaySupplierPurchases: suppliersSummary.todayPurchases,
      todaySupplierPayments: suppliersSummary.todayPaymentsGiven,
    };
  }, [dashboardSummary, customers, products, expensesSummary, suppliersSummary]);

  const isLoading = isCustomersLoading || isProductsLoading || isExpensesLoading || isSuppliersLoading;

  return (
    <KhataContext.Provider
      value={{
        isLoading,
        isCustomersLoading,
        isProductsLoading,
        isExpensesLoading,
        isSuppliersLoading,
        customers,
        ledgerEntries,
        products,
        expenses,
        expensesSummary,
        suppliers,
        suppliersSummary,
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
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerById,
        getCustomerLedger,
        recordTransaction,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        addExpense,
        deleteExpense,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        getSupplierById,
        getSupplierLedger,
        recordSupplierTransaction,
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
