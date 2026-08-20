const getApiBase = () => {
  // If running in browser and already on backend port 5200, use relative paths
  if (typeof window !== 'undefined' && window.location.port === '5200') {
    return '';
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // If user opens standalone Next dev server on port 3000, route API calls to ASP.NET Core on 5200
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return 'http://localhost:5200';
  }
  return '';
};

// ---------- Generic helpers ----------

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const apiBase = getApiBase();
  const url = apiBase ? `${apiBase}${path}` : path;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err: any) {
    throw new Error(
      `Cannot connect to HisabFlow API server. Make sure ASP.NET Core backend is running at ${apiBase || 'http://localhost:5200'}.`
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    let message = `API error ${res.status}: ${res.statusText}`;

    if (body) {
      if (typeof body.message === 'string' && body.message.trim()) {
        message = body.message;
      } else if (body.errors && typeof body.errors === 'object') {
        const msgs = Object.values(body.errors).flat();
        if (msgs.length > 0) message = msgs.join(', ');
      } else if (Array.isArray(body)) {
        const msgs = body.map((e: any) => e.error || e.errorMessage || e.message || JSON.stringify(e));
        if (msgs.length > 0) message = msgs.join(', ');
      } else if (typeof body.title === 'string' && body.title.trim()) {
        message = body.title;
      }
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return {} as T;
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
    apiFetch<void>(`/api/v1/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/customers/${id}`, {
      method: 'DELETE',
    }),
};
