import { Customer, CreditLedgerEntry, Product, ProductUnit, Expense, Supplier, SupplierLedgerEntry, LedgerTransactionType, SupplierTransactionType } from '@/types';
import { ApiCustomer, ApiLedgerEntry, ApiProduct, ApiSupplier, ApiSupplierLedgerEntry } from '@/lib/api';

export const mapApiCustomerToUI = (api: ApiCustomer): Customer => ({
  id: api.id,
  name: api.name,
  phone: api.phone,
  address: api.address || '',
  creditLimit: api.creditLimit,
  currentBalance: api.currentBalance,
  lastTransactionDate: api.updatedAt || api.createdAt,
  createdAt: api.createdAt,
});

export const mapApiLedgerEntryToUI = (api: ApiLedgerEntry): CreditLedgerEntry => {
  const mapPaymentMethod = (method: number): 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER' | 'CREDIT_NOTE' => {
    switch (method) {
      case 2: return 'QR_PAYMENT';
      case 3: return 'BANK_TRANSFER';
      case 4: return 'CREDIT_NOTE';
      case 1:
      default: return 'CASH';
    }
  };

  const mapType = (t: number): LedgerTransactionType => {
    return t === 1 ? 'CREDIT_PURCHASE' : 'PAYMENT_RECEIVED';
  };

  return {
    id: api.id,
    customerId: api.customerId,
    customerName: api.customerName || undefined,
    customerPhone: api.customerPhone || undefined,
    type: mapType(api.type),
    amount: api.amount,
    balanceAfter: api.balanceAfter,
    paymentMethod: mapPaymentMethod(api.paymentMethod),
    notes: api.particulars || '',
    billNumber: api.billNumber || undefined,
    date: api.transactionDate,
  };
};

export const mapApiProductToUI = (api: ApiProduct): Product => ({
  id: api.id,
  name: api.name,
  category: api.category,
  unit: (api.unit || 'pcs') as ProductUnit,
  costPrice: api.costPrice,
  sellingPrice: api.sellingPrice,
  stockQuantity: api.stockQuantity,
  minStockAlert: api.minStockAlert,
  barcode: api.barcode || undefined,
  imageUrl: api.imageUrl || undefined,
  updatedAt: api.updatedAt || new Date().toISOString(),
});

export const mapApiSupplierToUI = (api: ApiSupplier): Supplier => ({
  id: api.id,
  name: api.name,
  companyName: api.companyName || '',
  phone: api.phone,
  address: api.address || '',
  currentBalance: api.currentBalance,
  createdAt: api.createdAt,
  updatedAt: api.updatedAt,
});

export const mapApiSupplierLedgerEntryToUI = (api: ApiSupplierLedgerEntry): SupplierLedgerEntry => {
  const mapPaymentMethod = (method: number): 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER' => {
    switch (method) {
      case 2: return 'QR_PAYMENT';
      case 3: return 'BANK_TRANSFER';
      case 1:
      default: return 'CASH';
    }
  };

  const mapType = (t: number): SupplierTransactionType => {
    return t === 1 ? 'STOCK_PURCHASE' : 'PAYMENT_GIVEN';
  };

  return {
    id: api.id,
    supplierId: api.supplierId,
    supplierName: api.supplierName,
    supplierPhone: api.supplierPhone,
    type: mapType(api.type),
    amount: api.amount,
    balanceAfter: api.balanceAfter,
    paymentMethod: mapPaymentMethod(api.paymentMethod),
    notes: api.particulars || '',
    invoiceNumber: api.invoiceNumber || undefined,
    date: api.transactionDate,
    createdAt: api.createdAt,
  };
};
