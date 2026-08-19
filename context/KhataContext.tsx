'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Customer, CreditLedgerEntry, Product, DashboardStats, LedgerTransactionType } from '@/types';
import { INITIAL_CUSTOMERS, INITIAL_LEDGER_ENTRIES, INITIAL_PRODUCTS } from '@/lib/mockData';

interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface KhataContextType {
  customers: Customer[];
  ledgerEntries: CreditLedgerEntry[];
  products: Product[];
  stats: DashboardStats;
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  
  // Customer operations
  addCustomer: (data: { name: string; phone: string; address?: string; creditLimit: number; initialBalance?: number; initialNote?: string }) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  getCustomerLedger: (customerId: string) => CreditLedgerEntry[];

  // Ledger operations
  recordTransaction: (params: {
    customerId: string;
    type: LedgerTransactionType;
    amount: number;
    notes: string;
    paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER' | 'CREDIT_NOTE';
    billNumber?: string;
    date?: string;
  }) => CreditLedgerEntry | null;

  // Product operations
  addProduct: (data: Omit<Product, 'id' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, delta: number, reason?: string) => void;

  // Utilities
  resetToDefaults: () => void;
}

const KhataContext = createContext<KhataContextType | null>(null);

const STORAGE_KEYS = {
  CUSTOMERS: 'pasalkhata_customers_v1',
  LEDGER: 'pasalkhata_ledger_v1',
  PRODUCTS: 'pasalkhata_products_v1',
};

export const KhataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn(e);
      }
    }
    return INITIAL_CUSTOMERS;
  });

  const [ledgerEntries, setLedgerEntries] = useState<CreditLedgerEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.LEDGER);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn(e);
      }
    }
    return INITIAL_LEDGER_ENTRIES;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn(e);
      }
    }
    return INITIAL_PRODUCTS;
  });

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledgerEntries));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [customers, ledgerEntries, products]);

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

  // Helper to fetch customer
  const getCustomerById = (id: string) => customers.find((c) => c.id === id);

  // Helper to fetch ledger for a customer
  const getCustomerLedger = (customerId: string) => {
    return ledgerEntries
      .filter((entry) => entry.customerId === customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Add Customer
  const addCustomer = (data: {
    name: string;
    phone: string;
    address?: string;
    creditLimit: number;
    initialBalance?: number;
    initialNote?: string;
  }) => {
    const id = `cust-${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();
    const initBal = Number(data.initialBalance) || 0;

    const newCustomer: Customer = {
      id,
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address?.trim() || '',
      currentBalance: initBal,
      creditLimit: Number(data.creditLimit) || 10000,
      lastTransactionDate: nowIso,
      createdAt: nowIso,
    };

    setCustomers((prev) => [newCustomer, ...prev]);

    // If there is an initial balance, log an initial ledger record
    if (initBal > 0) {
      const initialEntry: CreditLedgerEntry = {
        id: `tx-${Date.now().toString().slice(-4)}`,
        customerId: id,
        customerName: newCustomer.name,
        customerPhone: newCustomer.phone,
        date: nowIso,
        type: 'CREDIT_PURCHASE',
        amount: initBal,
        balanceAfter: initBal,
        notes: data.initialNote || 'Opening balance / Previous Udhaar',
        billNumber: `OPEN-${id.toUpperCase()}`,
      };
      setLedgerEntries((prev) => [initialEntry, ...prev]);
    }

    showToast({
      type: 'success',
      title: 'Customer Added',
      message: `${newCustomer.name} was successfully registered with limit Rs. ${newCustomer.creditLimit.toLocaleString()}.`,
    });

    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    showToast({
      type: 'info',
      title: 'Customer Updated',
      message: 'Customer details have been saved.',
    });
  };

  const deleteCustomer = (id: string) => {
    const customer = customers.find((c) => c.id === id);
    if (!customer) return;
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    setLedgerEntries((prev) => prev.filter((e) => e.customerId !== id));
    showToast({
      type: 'warning',
      title: 'Customer Removed',
      message: `${customer.name} and associated records have been removed.`,
    });
  };

  // Record Ledger Transaction (Payment or Credit)
  const recordTransaction = (params: {
    customerId: string;
    type: LedgerTransactionType;
    amount: number;
    notes: string;
    paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER' | 'CREDIT_NOTE';
    billNumber?: string;
    date?: string;
  }) => {
    const customer = customers.find((c) => c.id === params.customerId);
    if (!customer) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Customer not found.',
      });
      return null;
    }

    const txAmount = Math.max(0, Number(params.amount));
    if (txAmount <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Amount must be greater than zero.',
      });
      return null;
    }

    let newBalance = customer.currentBalance;
    if (params.type === 'CREDIT_PURCHASE') {
      newBalance += txAmount;
    } else {
      newBalance = Math.max(0, newBalance - txAmount);
    }

    const nowIso = params.date || new Date().toISOString();
    const entryId = `tx-${Date.now().toString().slice(-5)}`;

    const newEntry: CreditLedgerEntry = {
      id: entryId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      date: nowIso,
      type: params.type,
      amount: txAmount,
      balanceAfter: newBalance,
      notes: params.notes || (params.type === 'CREDIT_PURCHASE' ? 'Goods bought on credit' : 'Repayment received'),
      paymentMethod: params.paymentMethod || (params.type === 'PAYMENT_RECEIVED' ? 'CASH' : undefined),
      billNumber: params.billNumber || (params.type === 'CREDIT_PURCHASE' ? `INV-${Math.floor(1000 + Math.random() * 9000)}` : `REC-${Math.floor(1000 + Math.random() * 9000)}`),
    };

    // Update customer balance & last transaction date
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id
          ? {
              ...c,
              currentBalance: newBalance,
              lastTransactionDate: nowIso,
            }
          : c
      )
    );

    // Prepend new ledger entry
    setLedgerEntries((prev) => [newEntry, ...prev]);

    const isPayment = params.type === 'PAYMENT_RECEIVED';
    showToast({
      type: isPayment ? 'success' : 'info',
      title: isPayment ? 'Payment Recorded' : 'Credit Added (Udhaar)',
      message: `${isPayment ? 'Collected' : 'Added'} Rs. ${txAmount.toLocaleString()} for ${customer.name}. New balance: Rs. ${newBalance.toLocaleString()}`,
    });

    return newEntry;
  };

  // Product Operations
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
      message: `${newProduct.name} added to inventory.`,
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
      message: 'Product changes saved successfully.',
    });
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast({
      type: 'warning',
      title: 'Product Deleted',
      message: `${prod.name} removed from inventory.`,
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

  const resetToDefaults = () => {
    setCustomers(INITIAL_CUSTOMERS);
    setLedgerEntries(INITIAL_LEDGER_ENTRIES);
    setProducts(INITIAL_PRODUCTS);
    try {
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
      localStorage.removeItem(STORAGE_KEYS.LEDGER);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    } catch (e) {
      console.warn(e);
    }
    showToast({
      type: 'info',
      title: 'Data Reset',
      message: 'Restored sample shop data and mock records.',
    });
  };

  // Compute Dashboard Stats
  const stats = useMemo<DashboardStats>(() => {
    const totalOutstandingKhata = customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
    const activeDebtorsCount = customers.filter((c) => c.currentBalance > 0).length;

    // Filter today's transactions (or recent within current date)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let todayCreditGiven = 0;
    let todayPaymentReceived = 0;

    ledgerEntries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      // For mock consistency, check if today or recent 24h
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
        resetToDefaults,
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
