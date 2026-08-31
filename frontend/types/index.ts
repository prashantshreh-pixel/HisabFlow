export type LedgerTransactionType = 'CREDIT_PURCHASE' | 'PAYMENT_RECEIVED';

export type SupplierTransactionType = 'STOCK_PURCHASE' | 'PAYMENT_GIVEN';

export type ProductUnit = 'kg' | 'pcs' | 'pkt' | 'ltr' | 'box' | 'dz' | 'gm' | 'bag';

export type ExpenseCategory =
  | 'Rent & Lease'
  | 'Electricity & Utilities'
  | 'Staff Salaries & Wages'
  | 'Tea, Snacks & Refreshment'
  | 'Freight & Transport'
  | 'Packaging & Supplies'
  | 'Maintenance & Repairs'
  | 'General Operational';

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
  imageUrl?: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  category: string;
  title: string;
  amount: number;
  paymentMethod: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER';
  particulars?: string;
  expenseDate: string;
  createdAt: string;
}

export interface ExpenseSummary {
  totalExpenses: number;
  todayExpenses: number;
  monthExpenses: number;
  totalCount: number;
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  address?: string;
  currentBalance: number; // positive = shop owes supplier (Payable)
  updatedAt: string;
  createdAt: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  supplierName?: string;
  supplierPhone?: string;
  date: string;
  type: SupplierTransactionType; // STOCK_PURCHASE = 1 (Debt/Payable Increase), PAYMENT_GIVEN = 2 (Debt/Payable Decrease)
  amount: number;
  balanceAfter: number;
  notes: string;
  invoiceNumber?: string;
  paymentMethod?: 'CASH' | 'QR_PAYMENT' | 'BANK_TRANSFER';
  createdAt: string;
}

export interface SupplierSummary {
  totalOutstandingPayable: number;
  todayPurchases: number;
  todayPaymentsGiven: number;
  activeSuppliersCount: number;
  totalSuppliersCount: number;
}

export interface DashboardStats {
  totalOutstandingKhata: number;
  totalCreditLimit: number;
  todayCashSales: number;
  todayDigitalSales: number;
  todayCreditGiven: number;
  todayPaymentReceived: number;
  todayTotalSales: number;
  todayNetFlow: number;
  lowStockCount: number;
  outOfStockCount: number;
  activeDebtorsCount: number;
  totalCustomersCount: number;
  totalInventoryCostValue: number;
  totalInventorySalesValue: number;
  totalExpenses: number;
  todayExpenses: number;
  monthExpenses: number;
  totalOutstandingPayable: number;
  todaySupplierPurchases: number;
  todaySupplierPayments: number;
}

export interface ExpenseBreakdownItem {
  category: string;
  amount: number;
  count: number;
  percentageOfTotal: number;
}

export interface DailyTrendPoint {
  date: string;
  salesRevenue: number;
  wholesaleCost: number;
  operatingExpense: number;
  netProfit: number;
}

export interface CashFlowSummary {
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
}

export interface ProfitLossReport {
  period: string;
  startDate: string;
  endDate: string;
  grossSalesRevenue: number;
  totalPaymentsCollected: number;
  totalSalesCount: number;
  wholesaleStockPurchases: number;
  wholesalePurchasesCount: number;
  grossProfit: number;
  grossProfitMarginPercentage: number;
  totalOperatingExpenses: number;
  totalExpensesCount: number;
  expenseBreakdown: ExpenseBreakdownItem[];
  netProfit: number;
  netProfitMarginPercentage: number;
  isProfitable: boolean;
  cashFlow: CashFlowSummary;
  dailyTrends: DailyTrendPoint[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
  createdAt: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: number; // 1: Cash, 2: QR, 3: Khata, 4: Split
  cashPaid: number;
  digitalPaid: number;
  creditPaid: number;
  notes?: string;
  saleDate: string;
  createdAt: string;
  items: SaleItem[];
}

export interface CreateSaleItemRequest {
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
}

export interface CreateSaleRequest {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: number;
  cashPaid: number;
  digitalPaid: number;
  creditPaid: number;
  notes?: string;
  saleDate?: string;
  items: CreateSaleItemRequest[];
}

export interface SalesSummary {
  date: string;
  totalSalesAmount: number;
  totalBillsCount: number;
  cashSalesAmount: number;
  digitalSalesAmount: number;
  creditSalesAmount: number;
  totalItemsSold: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
