import { useState, useCallback } from 'react';
import { Supplier, SupplierLedgerEntry, SupplierSummary, SupplierTransactionType } from '@/types';
import { suppliersApi } from '@/lib/api';
import { mapApiSupplierToUI, mapApiSupplierLedgerEntryToUI } from '@/lib/mappers';
import { ToastNotification } from '@/context/ToastContext';

interface UseSupplierDomainOptions {
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  onMutationSuccess?: () => void;
}

export function useSupplierDomain({ showToast, onMutationSuccess }: UseSupplierDomainOptions) {
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersSummary, setSuppliersSummary] = useState<SupplierSummary>({
    totalOutstandingPayable: 0,
    todayPurchases: 0,
    todayPaymentsGiven: 0,
    activeSuppliersCount: 0,
    totalSuppliersCount: 0,
  });

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

  const addSupplier = useCallback(
    async (data: { name: string; phone: string; companyName?: string; address?: string; initialBalance?: number; initialNote?: string }) => {
      const created = await suppliersApi.create(data);
      const newSupplier = mapApiSupplierToUI(created);
      setSuppliers((prev) => [newSupplier, ...prev]);
      showToast({ type: 'success', title: 'Supplier Added', message: `${newSupplier.name} saved.` });
      
      const summary = await suppliersApi.getSummary();
      setSuppliersSummary(summary);
      onMutationSuccess?.();
      return newSupplier;
    },
    [showToast, onMutationSuccess]
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
      onMutationSuccess?.();
    },
    [suppliers, showToast, onMutationSuccess]
  );

  const deleteSupplier = useCallback(
    async (id: string) => {
      await suppliersApi.delete(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      showToast({ type: 'warning', title: 'Supplier Deleted', message: 'Supplier record removed.' });
      
      const summary = await suppliersApi.getSummary();
      setSuppliersSummary(summary);
      onMutationSuccess?.();
    },
    [showToast, onMutationSuccess]
  );

  const getSupplierById = useCallback((id: string) => suppliers.find((s) => s.id === id), [suppliers]);

  const getSupplierLedger = useCallback(
    async (supplierId: string) => {
      try {
        const stmt = await suppliersApi.getStatement(supplierId);
        return stmt.ledgerEntries.map(mapApiSupplierLedgerEntryToUI);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load supplier statement ledger.';
        showToast({ type: 'error', title: 'Supplier Ledger Error', message });
        throw err;
      }
    },
    [showToast]
  );

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
      
      fetchSuppliers();
      onMutationSuccess?.();
      return newEntry;
    },
    [showToast, fetchSuppliers, onMutationSuccess]
  );

  return {
    isSuppliersLoading,
    suppliers,
    suppliersSummary,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById,
    getSupplierLedger,
    recordSupplierTransaction,
  };
}
