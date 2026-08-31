import type { Expense, ExpenseSummary, ProfitLossReport, Sale, CreateSaleRequest, SalesSummary } from '@/types';

export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.port === '5200') {
    return '';
  }
  if (typeof window !== 'undefined' && window.location.port !== '5200') {
    return `http://${window.location.hostname || 'localhost'}:5200`;
  }
  return 'http://localhost:5200';
};

export const getImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = getApiBase();
  return base ? `${base}${url}` : url;
};

// ---------- Generic helpers ----------

async function apiFetch<T>(path: string, options?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  const apiBase = getApiBase();
  const url = apiBase ? `${apiBase}${path}` : path;

  let res: Response;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (options?.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 10000);
    res = await fetch(url, {
      signal: options?.signal || controller.signal,
      ...options,
      headers,
    });
  } catch (err: unknown) {
    throw new Error(
      `Cannot connect to HisabFlow API server. Make sure ASP.NET Core backend is running at ${apiBase || 'http://localhost:5200'}.`
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    let message = `API error ${res.status}: ${res.statusText}`;

    if (body) {
      if (typeof body.message === 'string' && body.message.trim()) {
        message = body.message;
      } else if (body.detail && typeof body.detail === 'string') {
        message = body.detail;
      } else if (body.errors && typeof body.errors === 'object') {
        const msgs = Object.values(body.errors).flat();
        if (msgs.length > 0) message = msgs.join(', ');
      } else if (Array.isArray(body)) {
        const msgs = body.map((e: { error?: string; errorMessage?: string; message?: string }) => e.error || e.errorMessage || e.message || JSON.stringify(e));
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
      idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
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

// ---------- Product DTOs & API ----------

export interface ApiProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  barcode?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const productsApi = {
  getAll: () => apiFetch<ApiProduct[]>('/api/v1/products'),

  getById: (id: string) => apiFetch<ApiProduct>(`/api/v1/products/${id}`),

  create: (data: { name: string; category: string; unit: string; costPrice: number; sellingPrice: number; stockQuantity: number; minStockAlert: number; barcode?: string; imageUrl?: string }) =>
    apiFetch<ApiProduct>('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name: string; category: string; unit: string; costPrice: number; sellingPrice: number; stockQuantity: number; minStockAlert: number; barcode?: string; imageUrl?: string }) =>
    apiFetch<void>(`/api/v1/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  adjustStock: (id: string, quantityChange: number) =>
    apiFetch<void>(`/api/v1/products/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ quantityChange }),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/products/${id}`, {
      method: 'DELETE',
    }),

  uploadImage: async (file: File) => {
    const apiBase = getApiBase();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${apiBase}/api/v1/products/upload-image`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to upload product image file.');
    }
    return (await response.json()) as { imageUrl: string };
  },
};

export const expensesApi = {
  getAll: (limit = 100) => apiFetch<Expense[]>(`/api/v1/expenses?limit=${limit}`),
  getById: (id: string) => apiFetch<Expense>(`/api/v1/expenses/${id}`),
  create: (data: Omit<Expense, 'id' | 'createdAt'>) =>
    apiFetch<Expense>('/api/v1/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/v1/expenses/${id}`, {
      method: 'DELETE',
    }),
  getSummary: () => apiFetch<ExpenseSummary>('/api/v1/expenses/summary'),
};

export interface ApiSupplier {
  id: string;
  name: string;
  companyName?: string | null;
  phone: string;
  address?: string | null;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSupplierLedgerEntry {
  id: string;
  supplierId: string;
  supplierName?: string;
  supplierPhone?: string;
  transactionDate: string;
  type: number; // 1: Stock Purchase, 2: Payment Given
  amount: number;
  balanceAfter: number;
  paymentMethod: number;
  particulars?: string | null;
  invoiceNumber?: string | null;
  createdAt: string;
}

export interface ApiSupplierStatement {
  supplier: ApiSupplier;
  ledgerEntries: ApiSupplierLedgerEntry[];
}

export interface ApiSupplierSummary {
  totalOutstandingPayable: number;
  todayPurchases: number;
  todayPaymentsGiven: number;
  activeSuppliersCount: number;
  totalSuppliersCount: number;
}

export const suppliersApi = {
  getAll: () => apiFetch<ApiSupplier[]>('/api/v1/suppliers'),
  getById: (id: string) => apiFetch<ApiSupplier>(`/api/v1/suppliers/${id}`),
  create: (data: { name: string; phone: string; companyName?: string; address?: string; initialBalance?: number; initialNote?: string }) =>
    apiFetch<ApiSupplier>('/api/v1/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name: string; phone: string; companyName?: string; address?: string }) =>
    apiFetch<ApiSupplier>(`/api/v1/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/v1/suppliers/${id}`, {
      method: 'DELETE',
    }),
  recordTransaction: (data: { supplierId: string; type: number; amount: number; paymentMethod: number; particulars?: string; invoiceNumber?: string; transactionDate?: string }) =>
    apiFetch<ApiSupplierLedgerEntry>('/api/v1/suppliers/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
    }),
  getStatement: (id: string) => apiFetch<ApiSupplierStatement>(`/api/v1/suppliers/${id}/statement`),
  getSummary: () => apiFetch<ApiSupplierSummary>('/api/v1/suppliers/summary'),
};

export interface ApiDashboardSummary {
  totalOutstandingKhata: number;
  totalInventoryCostValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayCashSales: number;
  todayDigitalSales: number;
  todayCreditGiven: number;
  todayTotalSales: number;
  todayExpensesAmount: number;
  activeCustomersCount: number;
  activeProductsCount: number;
}

export const reportsApi = {
  getProfitLoss: (period = 'this_month', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiFetch<ProfitLossReport>(`/api/v1/reports/profit-loss?${params.toString()}`);
  },
  getDashboardSummary: () => apiFetch<ApiDashboardSummary>('/api/v1/reports/dashboard-summary'),
};

export const salesApi = {
  createSale: (data: CreateSaleRequest) =>
    apiFetch<Sale>('/api/v1/sales', {
      method: 'POST',
      body: JSON.stringify(data),
      idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
    }),
  getRecentSales: (count = 50) => apiFetch<Sale[]>(`/api/v1/sales/recent?count=${count}`),
  getSaleById: (id: string) => apiFetch<Sale>(`/api/v1/sales/${id}`),
  getSaleByInvoiceNumber: (invoiceNumber: string) => apiFetch<Sale>(`/api/v1/sales/invoice/${encodeURIComponent(invoiceNumber)}`),
  getSalesSummary: (date?: string) => {
    const params = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiFetch<SalesSummary>(`/api/v1/sales/summary${params}`);
  },
};
