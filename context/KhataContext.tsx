'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Customer, CreditLedgerEntry, Product, DashboardStats, LedgerTransactionType } from '@/types';
import { customersApi, RecordTransactionPayload } from '@/lib/api';

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
  stats: DashboardStats;
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  
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
  addProduct: (data: Omit<Product, 'id' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, delta: number, reason?: string) => void;
  
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
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Products remain local storage based for now
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn(e);
      }
    }
    return []; // No default mock products either
  });

  // Save products only to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [products]);

  const showToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = 'toast-' + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const fetchedCustomers = await customersApi.getAll();
      const fetchedTransactions = await customersApi.getRecentTransactions(50);

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

      setCustomers(mappedCustomers);
      setLedgerEntries(mappedEntries);
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
  };

  // Initial fetch on load
  useEffect(() => {
    refreshData();
  }, []);

  const getCustomerById = (id: string) => customers.find((c) => c.id === id);

  // Helper to fetch ledger for a customer
  const getCustomerLedger = async (customerId: string) => {
    try {
      const statement = await customersApi.getStatement(customerId);
      if (!statement) return [];

      return statement.ledgerEntries.map((t): CreditLedgerEntry => ({
        id: t.id,
        customerId: t.customerId,
        customerName: statement.customer.name,
        customerPhone: statement.customer.phone,
        date: t.transactionDate,
        type: t.type === 1 ? 'CREDIT_PURCHASE' : 'PAYMENT_RECEIVED',
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        notes: t.particulars || '',
        paymentMethod: t.paymentMethod === 1 ? 'CASH' : t.paymentMethod === 2 ? 'QR_PAYMENT' : t.paymentMethod === 3 ? 'BANK_TRANSFER' : 'CREDIT_NOTE',
        billNumber: t.billNumber || ''
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // Add Customer
  const addCustomer = async (data: {
    name: string;
    phone: string;
    address?: string;
    creditLimit: number;
    initialBalance?: number;
    initialNote?: string;
  }) => {
    try {
      setIsLoading(true);
      const created = await customersApi.create({
        name: data.name.trim(),
        phone: data.phone.trim(),
        address: data.address?.trim() || '',
        creditLimit: data.creditLimit,
        initialBalance: data.initialBalance || 0,
        initialNote: data.initialNote?.trim() || undefined
      });

      const newCustomer: Customer = {
        id: created.id,
        name: created.name,
        phone: created.phone,
        address: created.address || '',
        currentBalance: Number(created.currentBalance),
        creditLimit: Number(created.creditLimit),
        lastTransactionDate: created.updatedAt || created.createdAt,
        createdAt: created.createdAt
      };

      setCustomers((prev) => [newCustomer, ...prev]);

      // If opening balance was added, refresh transaction log
      if (data.initialBalance && data.initialBalance > 0) {
        await refreshData();
      } else {
        showToast({
          type: 'success',
          title: 'Customer Added',
          message: `${newCustomer.name} has been saved to database.`,
        });
      }

      return newCustomer;
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Error Adding Customer',
        message: err.message || 'Could not save to database.',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update Customer
  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      setIsLoading(true);
      const original = customers.find(c => c.id === id);
      if (!original) throw new Error('Customer not found local state.');

      const payload = {
        name: updates.name ?? original.name,
        phone: updates.phone ?? original.phone,
        address: updates.address !== undefined ? updates.address : original.address,
        creditLimit: updates.creditLimit ?? original.creditLimit,
      };

      await customersApi.update(id, payload);

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

  // Delete Customer
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

  // Record Ledger Transaction
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

      const created = await customersApi.recordTransaction(payload);
      
      // Update global states
      await refreshData();

      const isPayment = params.type === 'PAYMENT_RECEIVED';
      showToast({
        type: isPayment ? 'success' : 'info',
        title: isPayment ? 'Payment Recorded' : 'Credit Added (Udhaar)',
        message: `${isPayment ? 'Collected' : 'Added'} Rs. ${params.amount.toLocaleString()}.`,
      });

      const newEntry: CreditLedgerEntry = {
        id: created.id,
        customerId: created.customerId,
        customerName: created.customerName || '',
        customerPhone: created.customerPhone || '',
        date: created.transactionDate,
        type: created.type === 1 ? 'CREDIT_PURCHASE' : 'PAYMENT_RECEIVED',
        amount: Number(created.amount),
        balanceAfter: Number(created.balanceAfter),
        notes: created.particulars || '',
        paymentMethod: created.paymentMethod === 1 ? 'CASH' : created.paymentMethod === 2 ? 'QR_PAYMENT' : created.paymentMethod === 3 ? 'BANK_TRANSFER' : 'CREDIT_NOTE',
        billNumber: created.billNumber || ''
      };

      return newEntry;
    } catch (err: any) {
      console.error(err);
      showToast({
        type: 'error',
        title: 'Transaction Failed',
        message: err.message || 'Could not record ledger entry.',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Product Operations (Local Storage for now)
  const addProduct = (data: Omit<Product, 'id' | 'updatedAt'>) => {
    const id = `prod-${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();

    const newProduct: Product = {
      ...data,
      id,
      costPrice: Number(data.costPrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
      stockQuantity: Number(data.stockQuantity) || 0,
      minStockAlert: Number(data.minStockAlert) || 5,
      updatedAt: nowIso,
    };

    setProducts((prev) => [newProduct, ...prev]);
    showToast({
      type: 'success',
      title: 'Product Added',
      message: `${newProduct.name} added to local inventory.`,
    });
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const nowIso = new Date().toISOString();
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: nowIso } : p))
    );
    showToast({
      type: 'info',
      title: 'Product Updated',
      message: 'Product changes saved locally.',
    });
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast({
      type: 'warning',
      title: 'Product Deleted',
      message: `${prod.name} removed from local inventory.`,
    });
  };

  const adjustStock = (productId: string, delta: number, reason?: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

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
      message: `${prod.name}: ${changeText} ${prod.unit} (Total: ${newStock} ${prod.unit})${reason ? ` - ${reason}` : ''}`,
    });
  };

  // Compute Dashboard Stats
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
    };
  }, [customers, ledgerEntries, products]);

  return (
    <KhataContext.Provider
      value={{
        isLoading,
        customers,
        ledgerEntries,
        products,
        stats,
        toasts,
        dismissToast,
        showToast,
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
        refreshData,
      }}
    >
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
