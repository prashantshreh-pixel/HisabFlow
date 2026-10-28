import type { Expense, ExpenseSummary, ProfitLossReport, Sale, CreateSaleRequest, SalesSummary } from '@/types';
import type { AuthUser } from '@/types/auth';
import { getCurrentUser } from '@/lib/auth';

export const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    // When running standalone Next.js dev server (port 3000/3001), route to ASP.NET Core dev backend (5200)
    if (window.location.port === '3000' || window.location.port === '3001') {
      return `http://${window.location.hostname || 'localhost'}:5200`;
    }
    // In any other browser environment (IIS, ASP.NET Core Kestrel, production, IP access, domain access),
    // the frontend is served from the same server as the API endpoints.
    // Relative URL (empty string) ensures requests always go to current host and port (/api/v1/...).
    return '';
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  return '';
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

  const currentUser = getCurrentUser();
  const authHeaders: Record<string, string> = {};
  if (currentUser) {
    const token = currentUser.token || `hisabflow_dev_token_${(currentUser.role || 'admin').toLowerCase()}`;
    authHeaders['Authorization'] = `Bearer ${token}`;
    authHeaders['X-User-Id'] = currentUser.id || 'usr_admin';
    authHeaders['X-User-Name'] = currentUser.username || 'admin';
    authHeaders['X-User-Role'] = currentUser.role || 'ADMIN';
  } else {
    // Default retail POS credentials for local development & POS desktop mode
    authHeaders['Authorization'] = 'Bearer hisabflow_dev_token_admin';
    authHeaders['X-User-Id'] = 'usr_admin';
    authHeaders['X-User-Name'] = 'admin';
    authHeaders['X-User-Role'] = 'ADMIN';
  }

  const headers: Record<string, string> = {
    ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...authHeaders,
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
  } catch {
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

// ---------- Auth API ----------

export interface ApiLoginResponse {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<ApiLoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  verifyUnlock: (password: string) =>
    apiFetch<{ verified: boolean }>('/api/v1/auth/verify-unlock', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  me: () => apiFetch<AuthUser>('/api/v1/auth/me'),
};

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
  type: number | string;        // 1/Debit (credit sale), 2/Credit (payment received)
  amount: number;
  balanceAfter: number;
  paymentMethod: number | string; // 1/Cash 2/QR 3/BankTransfer 4/CreditNote
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
  brand?: string | null;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BarcodeLookupResponse {
  found: boolean;
  source: 'LOCAL_INVENTORY' | 'OPEN_CATALOG' | 'NONE';
  product?: ApiProduct | null;
  data?: {
    name?: string | null;
    brand?: string | null;
    barcode?: string | null;
    category?: string | null;
    unit?: string | null;
    imageUrl?: string | null;
    netWeight?: string | null;
    description?: string | null;
  } | null;
  message?: string;
}

export const productsApi = {
  getAll: () => apiFetch<ApiProduct[]>('/api/v1/products'),

  getById: (id: string) => apiFetch<ApiProduct>(`/api/v1/products/${id}`),

  lookupBarcode: (barcode: string) =>
    apiFetch<BarcodeLookupResponse>(`/api/v1/products/lookup-barcode/${encodeURIComponent(barcode)}`),

  create: (data: {
    name: string;
    category: string;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    stockQuantity: number;
    minStockAlert: number;
    barcode?: string | null;
    imageUrl?: string | null;
    brand?: string | null;
    description?: string | null;
  }) =>
    apiFetch<ApiProduct>('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: {
      name: string;
      category: string;
      unit: string;
      costPrice: number;
      sellingPrice: number;
      stockQuantity: number;
      minStockAlert: number;
      barcode?: string | null;
      imageUrl?: string | null;
      brand?: string | null;
      description?: string | null;
    }
  ) =>
    apiFetch<void>(`/api/v1/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  adjustStock: (id: string, quantityChange: number, notes?: string) =>
    apiFetch<void>(`/api/v1/products/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ quantityChange, notes }),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/products/${id}`, {
      method: 'DELETE',
    }),

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{ imageUrl: string }>('/api/v1/products/upload-image', {
      method: 'POST',
      body: formData,
    });
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
  type: number | string; // 1/Debit (Stock Purchase), 2/Credit (Payment Given)
  amount: number;
  balanceAfter: number;
  paymentMethod: number | string;
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

export interface ApiAuditLog {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  changesJson: string;
  performedBy: string;
  createdAt: string;
}

export const auditApi = {
  getLogs: (entityName?: string, limit = 100) => {
    const params = new URLSearchParams();
    if (entityName) params.append('entityName', entityName);
    params.append('limit', limit.toString());
    return apiFetch<ApiAuditLog[]>(`/api/v1/audit?${params.toString()}`);
  },
};


// ---------- Customer-facing QR payment sessions ----------

export type PaymentSessionStatus = 'Pending' | 'Paid' | 'Expired' | 'Cancelled';
export type PaymentProvider = 'FONEPAY' | 'KHALTI' | 'ESEWA';

export interface ApiPaymentSession {
  id: string;
  prn: string;
  provider: PaymentProvider;
  invoiceRef: string | null;
  amount: number;
  status: PaymentSessionStatus;
  paidVia: string | null;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
}

export const paymentsApi = {
  createSession: (data: { amount: number; invoiceRef?: string; provider?: PaymentProvider }) =>
    apiFetch<ApiPaymentSession>('/api/v1/payments/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSession: (id: string) => apiFetch<ApiPaymentSession>(`/api/v1/payments/sessions/${id}`),
  confirmManual: (id: string) =>
    apiFetch<ApiPaymentSession>(`/api/v1/payments/sessions/${id}/confirm-manual`, { method: 'POST' }),
  cancel: (id: string) =>
    apiFetch<void>(`/api/v1/payments/sessions/${id}/cancel`, { method: 'POST' }),
  simulate: (id: string) =>
    apiFetch<ApiPaymentSession>(`/api/v1/payments/sessions/${id}/simulate`, { method: 'POST' }),
};
