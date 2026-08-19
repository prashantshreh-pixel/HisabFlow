const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ---------- Generic helpers ----------

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body?.message ||
      (Array.isArray(body) ? body.map((e: { error: string }) => e.error).join(', ') : null) ||
      `API error ${res.status}`;
    throw new Error(message);
  }

  return res.json();
}

// ---------- Customer DTOs ----------

export interface ApiCustomer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiLedgerEntry {
  id: string;
  customerId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  type: number;        // 1=Debit (credit sale), 2=Credit (payment received)
  amount: number;
  balanceAfter: number;
  paymentMethod: number; // 1=Cash 2=QR 3=BankTransfer 4=CreditNote
  particulars: string | null;
  billNumber: string | null;
  transactionDate: string;
  createdAt: string;
}

export interface ApiCustomerStatement {
  customer: ApiCustomer;
  ledgerEntries: ApiLedgerEntry[];
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  address?: string | null;
  creditLimit: number;
  initialBalance?: number;
  initialNote?: string | null;
}

export interface RecordTransactionPayload {
  customerId: string;
  type: number;          // 1=Debit, 2=Credit
  amount: number;
  paymentMethod: number;
  particulars?: string | null;
  billNumber?: string | null;
  transactionDate?: string | null;
}

// ---------- Customer API ----------

export const customersApi = {
  getAll: () => apiFetch<ApiCustomer[]>('/api/v1/customers'),

  getById: (id: string) => apiFetch<ApiCustomer>(`/api/v1/customers/${id}`),

  create: (data: CreateCustomerPayload) =>
    apiFetch<ApiCustomer>('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStatement: (id: string) =>
    apiFetch<ApiCustomerStatement>(`/api/v1/customers/${id}/statement`),

  recordTransaction: (data: RecordTransactionPayload) =>
    apiFetch<ApiLedgerEntry>('/api/v1/customers/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRecentTransactions: (limit: number = 50) =>
    apiFetch<ApiLedgerEntry[]>(`/api/v1/customers/transactions?limit=${limit}`),

  update: (id: string, data: CreateCustomerPayload) =>
    fetch(`${API_BASE}/api/v1/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => {
      if (!res.ok) throw new Error(`Failed to update customer: ${res.status}`);
    }),

  delete: (id: string) =>
    fetch(`${API_BASE}/api/v1/customers/${id}`, {
      method: 'DELETE',
    }).then(res => {
      if (!res.ok) throw new Error(`Failed to delete customer: ${res.status}`);
    }),
};
