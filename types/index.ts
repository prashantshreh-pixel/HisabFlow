export type LedgerTransactionType = 'CREDIT_PURCHASE' | 'PAYMENT_RECEIVED';

export type ProductUnit = 'kg' | 'pcs' | 'pkt' | 'ltr' | 'box' | 'dz' | 'gm' | 'bag';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  currentBalance: number; // positive = owes shop (Udhaar)
  creditLimit: number;
  lastTransactionDate: string;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  date: string;
  type: LedgerTransactionType;
  amount: number;
  balanceAfter: number;
  notes: string;
  paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER' | 'CREDIT_NOTE';
  billNumber?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: ProductUnit;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  barcode?: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalOutstandingKhata: number;
  totalCreditLimit: number;
  todayCreditGiven: number;
  todayPaymentReceived: number;
  todayNetFlow: number;
  lowStockCount: number;
  outOfStockCount: number;
  activeDebtorsCount: number;
  totalCustomersCount: number;
  totalInventoryCostValue: number;
  totalInventorySalesValue: number;
}
