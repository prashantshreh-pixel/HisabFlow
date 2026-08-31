'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Customer, CreditLedgerEntry, Product, Expense, ExpenseSummary, Supplier, SupplierLedgerEntry, SupplierSummary, DashboardStats, LedgerTransactionType, SupplierTransactionType } from '@/types';
import { customersApi, productsApi, expensesApi, suppliersApi, RecordTransactionPayload } from '@/lib/api';
import { Language, CalendarMode, TRANSLATIONS } from '@/lib/translations';
import { formatSmartDate } from '@/lib/bikramSambat';

interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface KhataContextType {
  isLoading: boolean;
  customers: Customer[];
  ledgerEntries: CreditLedgerEntry[];
  products: Product[];
  expenses: Expense[];
  expensesSummary: ExpenseSummary;
  suppliers: Supplier[];
  suppliersSummary: SupplierSummary;
  stats: DashboardStats;
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;

  // Language & Calendar Preferences
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

const STORAGE_KEYS = {
  PRODUCTS: 'pasalkhata_products_v1',
};

export const KhataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [language, setLanguage] = useState<Language>('en');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('BS');

  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'en' ? 'np' : 'en'));
  }, []);

  const toggleCalendarMode = useCallback(() => {
    setCalendarMode((prev) => (prev === 'AD' ? 'BS' : 'AD'));
  }, []);

  const formatDate = useCallback(
    (dateInput: Date | string) => {
      return formatSmartDate(dateInput, calendarMode === 'BS', language === 'np');
    },
    [calendarMode, language]
  );

  const t = useCallback(
    (key: keyof typeof TRANSLATIONS['en']) => {
      return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
    },
    [language]
  );

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimersRef.current.delete(id);
    }, 4000);
    toastTimersRef.current.set(id, timer);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedCustomers, fetchedTransactions, fetchedProducts, fetchedExpenses, fetchedSummary, fetchedSuppliers, fetchedSupplierSummary] = await Promise.all([
        customersApi.getAll(),
        customersApi.getRecentTransactions(50),
        productsApi.getAll(),
        expensesApi.getAll(100).catch(() => []),
        expensesApi.getSummary().catch(() => ({ totalExpenses: 0, todayExpenses: 0, monthExpenses: 0, totalCount: 0 })),
        suppliersApi.getAll().catch(() => []),
        suppliersApi.getSummary().catch(() => ({ totalOutstandingPayable: 0, todayPurchases: 0, todayPaymentsGiven: 0, activeSuppliersCount: 0, totalSuppliersCount: 0 }))
      ]);

      const mappedCustomers: Customer[] = fetchedCustomers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address || '',
        currentBalance: Number(c.currentBalance),
        creditLimit: Number(c.creditLimit),
        lastTransactionDate: c.updatedAt || c.createdAt,
        createdAt: c.createdAt
      }));

      const mappedEntries: CreditLedgerEntry[] = fetchedTransactions.map(t => ({
        id: t.id,
        customerId: t.customerId,
        customerName: t.customerName || '',
        customerPhone: t.customerPhone || '',
        date: t.transactionDate,
        type: t.type === 1 ? 'CREDIT_PURCHASE' : 'PAYMENT_RECEIVED',
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        notes: t.particulars || '',
        paymentMethod: t.paymentMethod === 1 ? 'CASH' : t.paymentMethod === 2 ? 'QR_PAYMENT' : t.paymentMethod === 3 ? 'BANK_TRANSFER' : 'CREDIT_NOTE',
        billNumber: t.billNumber || ''
      }));

      const mappedProducts: Product[] = fetchedProducts.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        unit: p.unit as any,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        stockQuantity: Number(p.stockQuantity),
        minStockAlert: Number(p.minStockAlert),
        barcode: p.barcode || '',
        imageUrl: p.imageUrl || '',
        updatedAt: p.updatedAt || new Date().toISOString()
      }));

      const mappedSuppliers: Supplier[] = fetchedSuppliers.map(s => ({
        id: s.id,
        name: s.name,
        companyName: s.companyName || '',
        phone: s.phone,
        address: s.address || '',
        currentBalance: Number(s.currentBalance),
        updatedAt: s.updatedAt || s.createdAt,
        createdAt: s.createdAt,
      }));

      setCustomers(mappedCustomers);
      setLedgerEntries(mappedEntries);
      setProducts(mappedProducts);
      setExpenses(fetchedExpenses);
      setExpensesSummary(fetchedSummary);
      setSuppliers(mappedSuppliers);
      setSuppliersSummary(fetchedSupplierSummary);
    } catch (err) {
      console.error('Error loading data from database:', err);
      showToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not fetch database records. Make sure the backend is running.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const getCustomerById = useCallback((id: string) => customers.find((c) => c.id === id), [customers]);

  const getCustomerLedger = useCallback(async (customerId: string): Promise<CreditLedgerEntry[]> => {
    try {
      const stmt = await customersApi.getStatement(customerId);
      return stmt.ledgerEntries.map((t) => ({
        id: t.id,
        customerId: t.customerId,
        customerName: t.customerName || '',
        customerPhone: t.customerPhone || '',
        date: t.transactionDate,
        type: t.type === 1 ? 'CREDIT_PURCHASE' : 'PAYMENT_RECEIVED',
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        notes: t.particulars || '',
        paymentMethod: t.paymentMethod === 1 ? 'CASH' : t.paymentMethod === 2 ? 'QR_PAYMENT' : t.paymentMethod === 3 ? 'BANK_TRANSFER' : 'CREDIT_NOTE',
        billNumber: t.billNumber || '',
      }));
    } catch (err) {
      console.error('Error fetching statement:', err);
      return ledgerEntries.filter((e) => e.customerId === customerId);
    }
  }, [ledgerEntries]);

  const addCustomer = async (data: {
    name: string;
    phone: string;
    address?: string;
    creditLimit: number;
    initialBalance?: number;
    initialNote?: string;
  }): Promise<Customer> => {
    try {
      setIsLoading(true);
      const created = await customersApi.create({
        name: data.name,
        phone: data.phone,
        address: data.address,
        creditLimit: data.creditLimit,
        initialBalance: data.initialBalance || 0,
        initialNote: data.initialNote || null,
      });

      const newCust: Customer = {
        id: created.id,
        name: created.name,
        phone: created.phone,
        address: created.address || '',
        currentBalance: Number(created.currentBalance),
        creditLimit: Number(created.creditLimit),
        lastTransactionDate: created.updatedAt || created.createdAt,
        createdAt: created.createdAt,
      };

      setCustomers((prev) => [newCust, ...prev]);

      showToast({
        type: 'success',
        title: 'Customer Created',
        message: `${newCust.name} successfully added to database.`,
      });

      return newCust;
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Error Adding Customer',
        message: err.message || 'Could not save customer to backend API.',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      setIsLoading(true);
      const existing = customers.find((c) => c.id === id);
      if (!existing) return;

      await customersApi.update(id, {
        name: updates.name || existing.name,
        phone: updates.phone || existing.phone,
        address: updates.address !== undefined ? updates.address : existing.address,
        creditLimit: updates.creditLimit !== undefined ? updates.creditLimit : existing.creditLimit,
      });

      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );

      showToast({
        type: 'info',
        title: 'Customer Updated',
        message: 'Details successfully saved to database.',
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update database record.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      setIsLoading(true);
      await customersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setLedgerEntries((prev) => prev.filter((e) => e.customerId !== id));
      showToast({
        type: 'warning',
        title: 'Customer Removed',
        message: 'Customer and all ledger entries deleted from database.',
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete from database.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recordTransaction = async (params: {
    customerId: string;
    type: LedgerTransactionType;
    amount: number;
    notes: string;
    paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER' | 'CREDIT_NOTE';
    billNumber?: string;
    date?: string;
  }) => {
    try {
      setIsLoading(true);
      const pmMap = {
        CASH: 1,
        QR_PAYMENT: 2,
        BANK_TRANSFER: 3,
        CREDIT_NOTE: 4
      };

      const payload: RecordTransactionPayload = {
        customerId: params.customerId,
        type: params.type === 'CREDIT_PURCHASE' ? 1 : 2,
        amount: params.amount,
        paymentMethod: params.paymentMethod ? pmMap[params.paymentMethod] : 1,
        particulars: params.notes || null,
        billNumber: params.billNumber || null,
        transactionDate: params.date || null
      };

      const res = await customersApi.recordTransaction(payload);
      const dateIso = res.transactionDate;

      const newEntry: CreditLedgerEntry = {
        id: res.id,
        customerId: res.customerId,
        customerName: res.customerName || '',
        customerPhone: res.customerPhone || '',
        date: dateIso,
        type: params.type,
        amount: Number(res.amount),
        balanceAfter: Number(res.balanceAfter),
        notes: res.particulars || '',
        paymentMethod: params.paymentMethod || 'CASH',
        billNumber: res.billNumber || ''
      };

      setLedgerEntries((prev) => [newEntry, ...prev]);

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === params.customerId
            ? {
                ...c,
                currentBalance: Number(res.balanceAfter),
                lastTransactionDate: dateIso
              }
            : c
        )
      );

      showToast({
        type: params.type === 'CREDIT_PURCHASE' ? 'warning' : 'success',
        title: params.type === 'CREDIT_PURCHASE' ? 'Udhaar Recorded' : 'Repayment Saved',
        message: `Rs. ${params.amount.toLocaleString()} saved to database.`,
      });

      return newEntry;
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Transaction Error',
        message: err.message || 'Could not record transaction to backend API.',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const addProduct = async (data: Omit<Product, 'id' | 'updatedAt'>) => {
    try {
      setIsLoading(true);
      const created = await productsApi.create({
        name: data.name,
        category: data.category,
        unit: data.unit,
        costPrice: Number(data.costPrice) || 0,
        sellingPrice: Number(data.sellingPrice) || 0,
        stockQuantity: Number(data.stockQuantity) || 0,
        minStockAlert: Number(data.minStockAlert) || 5,
        barcode: data.barcode || null,
        imageUrl: data.imageUrl || null
      });

      const newProduct: Product = {
        id: created.id,
        name: created.name,
        category: created.category,
        unit: created.unit as any,
        costPrice: Number(created.costPrice),
        sellingPrice: Number(created.sellingPrice),
        stockQuantity: Number(created.stockQuantity),
        minStockAlert: Number(created.minStockAlert),
        barcode: created.barcode || '',
        imageUrl: created.imageUrl || '',
        updatedAt: created.updatedAt || new Date().toISOString()
      };

      setProducts((prev) => [newProduct, ...prev]);
      showToast({
        type: 'success',
        title: 'Product Saved',
        message: `${newProduct.name} saved to SQL database.`,
      });
      return newProduct;
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save product to database.',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      setIsLoading(true);
      await productsApi.update(id, {
        name: updates.name,
        category: updates.category,
        unit: updates.unit,
        costPrice: updates.costPrice !== undefined ? Number(updates.costPrice) : undefined,
        sellingPrice: updates.sellingPrice !== undefined ? Number(updates.sellingPrice) : undefined,
        stockQuantity: updates.stockQuantity !== undefined ? Number(updates.stockQuantity) : undefined,
        minStockAlert: updates.minStockAlert !== undefined ? Number(updates.minStockAlert) : undefined,
        barcode: updates.barcode !== undefined ? updates.barcode : undefined,
        imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : undefined
      });

      const nowIso = new Date().toISOString();
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: nowIso } : p))
      );

      showToast({
        type: 'info',
        title: 'Product Updated',
        message: 'Product changes saved to database.',
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update product in database.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      setIsLoading(true);
      const prod = products.find((p) => p.id === id);
      if (!prod) return;

      await productsApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));

      showToast({
        type: 'warning',
        title: 'Product Deleted',
        message: `${prod.name} deleted from database.`,
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete product from database.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const adjustStock = async (productId: string, delta: number, reason?: string) => {
    try {
      setIsLoading(true);
      const prod = products.find((p) => p.id === productId);
      if (!prod) return;

      await productsApi.adjustStock(productId, delta);
      const newStock = Math.max(0, prod.stockQuantity + delta);
      const nowIso = new Date().toISOString();

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                stockQuantity: newStock,
                updatedAt: nowIso,
              }
            : p
        )
      );

      const changeText = delta > 0 ? `+${delta}` : `${delta}`;
      showToast({
        type: newStock <= prod.minStockAlert ? 'warning' : 'success',
        title: 'Stock Adjusted',
        message: `${prod.name}: ${changeText} ${prod.unit} (Total: ${newStock} ${prod.unit}) saved to DB.${reason ? ` - ${reason}` : ''}`,
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Stock Adjustment Failed',
        message: err.message || 'Could not adjust stock in database.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addExpense = async (data: {
    category: string;
    title: string;
    amount: number;
    paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER';
    particulars?: string;
    expenseDate?: string;
  }) => {
    try {
      setIsLoading(true);
      const created = await expensesApi.create({
        category: data.category,
        title: data.title,
        amount: data.amount,
        paymentMethod: data.paymentMethod || 'CASH',
        particulars: data.particulars || '',
        expenseDate: data.expenseDate || new Date().toISOString(),
      });

      setExpenses((prev) => [created, ...prev]);
      const summary = await expensesApi.getSummary().catch(() => null);
      if (summary) setExpensesSummary(summary);

      showToast({
        type: 'success',
        title: 'Expense Saved',
        message: `Rs. ${data.amount.toLocaleString()} recorded for ${data.title}.`,
      });

      return created;
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Expense Error',
        message: err.message || 'Could not save expense record.',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      setIsLoading(true);
      await expensesApi.delete(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      const summary = await expensesApi.getSummary().catch(() => null);
      if (summary) setExpensesSummary(summary);

      showToast({
        type: 'warning',
        title: 'Expense Deleted',
        message: 'Expense record deleted.',
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete expense.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSupplierById = (id: string) => suppliers.find((s) => s.id === id);

  const getSupplierLedger = async (supplierId: string): Promise<SupplierLedgerEntry[]> => {
    try {
      const stmt = await suppliersApi.getStatement(supplierId);
      return stmt.ledgerEntries.map((t) => ({
        id: t.id,
        supplierId: t.supplierId,
        supplierName: t.supplierName || '',
        supplierPhone: t.supplierPhone || '',
        date: t.transactionDate,
        type: t.type === 1 ? 'STOCK_PURCHASE' : 'PAYMENT_GIVEN',
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        notes: t.particulars || '',
        invoiceNumber: t.invoiceNumber || '',
        paymentMethod: t.paymentMethod === 1 ? 'CASH' : t.paymentMethod === 2 ? 'QR_PAYMENT' : 'BANK_TRANSFER',
        createdAt: t.createdAt,
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const addSupplier = async (data: { name: string; phone: string; companyName?: string; address?: string; initialBalance?: number; initialNote?: string }) => {
    try {
      setIsLoading(true);
      const created = await suppliersApi.create(data);
      const newSup: Supplier = {
        id: created.id,
        name: created.name,
        companyName: created.companyName || '',
        phone: created.phone,
        address: created.address || '',
        currentBalance: Number(created.currentBalance),
        updatedAt: created.updatedAt || created.createdAt,
        createdAt: created.createdAt,
      };

      setSuppliers((prev) => [newSup, ...prev]);
      const summary = await suppliersApi.getSummary().catch(() => null);
      if (summary) setSuppliersSummary(summary);

      showToast({
        type: 'success',
        title: 'Supplier Registered',
        message: `${newSup.name} added to wholesalers list.`,
      });

      return newSup;
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Error Adding Supplier',
        message: err.message || 'Could not save supplier.',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      setIsLoading(true);
      const existing = suppliers.find((s) => s.id === id);
      if (!existing) return;

      await suppliersApi.update(id, {
        name: updates.name || existing.name,
        phone: updates.phone || existing.phone,
        companyName: updates.companyName !== undefined ? updates.companyName : existing.companyName,
        address: updates.address !== undefined ? updates.address : existing.address,
      });

      setSuppliers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );

      showToast({
        type: 'info',
        title: 'Supplier Updated',
        message: `Updated details for ${updates.name || existing.name}.`,
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update supplier.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      setIsLoading(true);
      const sup = suppliers.find((s) => s.id === id);
      await suppliersApi.delete(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      const summary = await suppliersApi.getSummary().catch(() => null);
      if (summary) setSuppliersSummary(summary);

      showToast({
        type: 'warning',
        title: 'Supplier Removed',
        message: `${sup?.name || 'Supplier'} removed from database.`,
      });
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete supplier.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recordSupplierTransaction = async (params: {
    supplierId: string;
    type: SupplierTransactionType;
    amount: number;
    notes?: string;
    invoiceNumber?: string;
    paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER';
    date?: string;
  }) => {
    try {
      setIsLoading(true);
      const typeInt = params.type === 'STOCK_PURCHASE' ? 1 : 2;
      const pmInt = params.paymentMethod === 'QR_PAYMENT' ? 2 : params.paymentMethod === 'BANK_TRANSFER' ? 3 : 1;

      const res = await suppliersApi.recordTransaction({
        supplierId: params.supplierId,
        type: typeInt,
        amount: params.amount,
        paymentMethod: pmInt,
        particulars: params.notes,
        invoiceNumber: params.invoiceNumber,
        transactionDate: params.date || new Date().toISOString(),
      });

      const nowIso = params.date || new Date().toISOString();

      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === params.supplierId
            ? {
                ...s,
                currentBalance: Number(res.balanceAfter),
                updatedAt: nowIso,
              }
            : s
        )
      );

      const summary = await suppliersApi.getSummary().catch(() => null);
      if (summary) setSuppliersSummary(summary);

      showToast({
        type: params.type === 'STOCK_PURCHASE' ? 'warning' : 'success',
        title: params.type === 'STOCK_PURCHASE' ? 'Purchase Recorded' : 'Payment Given',
        message: `Rs. ${params.amount.toLocaleString()} saved to supplier ledger.`,
      });

      return {
        id: res.id,
        supplierId: res.supplierId,
        supplierName: res.supplierName || '',
        supplierPhone: res.supplierPhone || '',
        date: res.transactionDate,
        type: params.type,
        amount: Number(res.amount),
        balanceAfter: Number(res.balanceAfter),
        notes: res.particulars || '',
        invoiceNumber: res.invoiceNumber || '',
        paymentMethod: params.paymentMethod || 'CASH',
        createdAt: res.createdAt,
      };
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Supplier Transaction Error',
        message: err.message || 'Could not record supplier transaction.',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo<DashboardStats>(() => {
    const totalOutstandingKhata = customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
    const activeDebtorsCount = customers.filter((c) => c.currentBalance > 0).length;

    let todayCreditGiven = 0;
    let todayPaymentReceived = 0;

    ledgerEntries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const isToday = entryDate.toDateString() === new Date().toDateString() || 
                      (new Date().getTime() - entryDate.getTime() < 24 * 60 * 60 * 1000);

      if (isToday) {
        if (entry.type === 'CREDIT_PURCHASE') {
          todayCreditGiven += entry.amount;
        } else if (entry.type === 'PAYMENT_RECEIVED') {
          todayPaymentReceived += entry.amount;
        }
      }
    });

    const lowStockCount = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockAlert).length;
    const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;

    const totalInventoryCostValue = products.reduce((sum, p) => sum + p.costPrice * p.stockQuantity, 0);
    const totalInventorySalesValue = products.reduce((sum, p) => sum + p.sellingPrice * p.stockQuantity, 0);

    const calculatedTotalExpenses = expensesSummary.totalExpenses || expenses.reduce((sum, e) => sum + e.amount, 0);

    const calculatedTotalPayables = suppliersSummary.totalOutstandingPayable || suppliers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);

    return {
      totalOutstandingKhata,
      totalCreditLimit,
      todayCreditGiven,
      todayPaymentReceived,
      todayNetFlow: todayPaymentReceived - todayCreditGiven,
      lowStockCount,
      outOfStockCount,
      activeDebtorsCount,
      totalCustomersCount: customers.length,
      totalInventoryCostValue,
      totalInventorySalesValue,
      totalExpenses: calculatedTotalExpenses,
      todayExpenses: expensesSummary.todayExpenses,
      monthExpenses: expensesSummary.monthExpenses,
      totalOutstandingPayable: calculatedTotalPayables,
      todaySupplierPurchases: suppliersSummary.todayPurchases,
      todaySupplierPayments: suppliersSummary.todayPaymentsGiven,
    };
  }, [customers, ledgerEntries, products, expenses, expensesSummary, suppliers, suppliersSummary]);

  const contextValue = useMemo(
    () => ({
      isLoading,
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
    }),
    [
      isLoading,
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
    ]
  );

  return (
    <KhataContext.Provider value={contextValue}>
      {children}
    </KhataContext.Provider>
  );
};

export const useKhata = () => {
  const context = useContext(KhataContext);
  if (!context) {
    throw new Error('useKhata must be used within a KhataProvider');
  }
  return context;
};
