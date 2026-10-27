import { useState, useCallback } from 'react';
import { Expense, ExpenseSummary } from '@/types';
import { expensesApi } from '@/lib/api';
import { ToastNotification } from '@/context/ToastContext';

interface UseExpenseDomainOptions {
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  onMutationSuccess?: () => void;
}

export function useExpenseDomain({ showToast, onMutationSuccess }: UseExpenseDomainOptions) {
  const [isExpensesLoading, setIsExpensesLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesSummary, setExpensesSummary] = useState<ExpenseSummary>({
    totalExpenses: 0,
    todayExpenses: 0,
    monthExpenses: 0,
    totalCount: 0,
  });

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

  const addExpense = useCallback(
    async (data: { category: string; title: string; amount: number; paymentMethod?: string; particulars?: string; expenseDate?: string }) => {
      let pmStr = 'Cash';
      if (data.paymentMethod === 'QR_PAYMENT' || data.paymentMethod === '2') pmStr = 'QR_PAYMENT';
      else if (data.paymentMethod === 'BANK_TRANSFER' || data.paymentMethod === '3') pmStr = 'BANK_TRANSFER';

      const created = await expensesApi.create({
        category: data.category,
        title: data.title,
        amount: data.amount,
        paymentMethod: pmStr as unknown as Expense['paymentMethod'],
        particulars: data.particulars,
        expenseDate: data.expenseDate || new Date().toISOString(),
      });

      setExpenses((prev) => [created, ...prev]);
      showToast({ type: 'success', title: 'Expense Added', message: `Rs. ${data.amount} recorded.` });
      
      const summary = await expensesApi.getSummary();
      setExpensesSummary(summary);
      onMutationSuccess?.();
      return created;
    },
    [showToast, onMutationSuccess]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      await expensesApi.delete(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      showToast({ type: 'warning', title: 'Expense Removed', message: 'Expense entry deleted.' });
      
      const summary = await expensesApi.getSummary();
      setExpensesSummary(summary);
      onMutationSuccess?.();
    },
    [showToast, onMutationSuccess]
  );

  return {
    isExpensesLoading,
    expenses,
    expensesSummary,
    fetchExpenses,
    addExpense,
    deleteExpense,
  };
}
