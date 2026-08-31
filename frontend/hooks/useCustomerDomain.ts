import { useState, useCallback } from 'react';
import { Customer, CreditLedgerEntry, LedgerTransactionType } from '@/types';
import { customersApi, RecordTransactionPayload } from '@/lib/api';
import { mapApiCustomerToUI, mapApiLedgerEntryToUI } from '@/lib/mappers';
import { ToastNotification } from '@/context/ToastContext';

interface UseCustomerDomainOptions {
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  onMutationSuccess?: () => void;
}

export function useCustomerDomain({ showToast, onMutationSuccess }: UseCustomerDomainOptions) {
  const [isCustomersLoading, setIsCustomersLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<CreditLedgerEntry[]>([]);

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

      onMutationSuccess?.();
      return newCustomer;
    },
    [showToast, onMutationSuccess]
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
      onMutationSuccess?.();
    },
    [customers, showToast, onMutationSuccess]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      await customersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      showToast({ type: 'warning', title: 'Customer Removed', message: 'Customer record deleted.' });
      onMutationSuccess?.();
    },
    [showToast, onMutationSuccess]
  );

  const getCustomerById = useCallback((id: string) => customers.find((c) => c.id === id), [customers]);

  const getCustomerLedger = useCallback(
    async (customerId: string) => {
      try {
        const stmt = await customersApi.getStatement(customerId);
        return stmt.ledgerEntries.map(mapApiLedgerEntryToUI);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load customer statement ledger.';
        showToast({ type: 'error', title: 'Ledger Load Error', message });
        throw err;
      }
    },
    [showToast]
  );

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

      fetchCustomers();
      fetchRecentTransactions();
      onMutationSuccess?.();
      return newEntry;
    },
    [showToast, fetchCustomers, fetchRecentTransactions, onMutationSuccess]
  );

  return {
    isCustomersLoading,
    customers,
    ledgerEntries,
    fetchCustomers,
    fetchRecentTransactions,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomerLedger,
    recordTransaction,
  };
}
