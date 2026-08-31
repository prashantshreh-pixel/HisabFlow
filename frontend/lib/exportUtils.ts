// CSV & Data Export Utility for HisabFlow

import { CreditLedgerEntry, SupplierLedgerEntry } from '@/types';

/**
 * Downloads a CSV file in browser
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((field) => {
          const str = String(field ?? '').replace(/"/g, '""');
          return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports customer credit statement to CSV
 */
export function exportCustomerStatementCSV(customerName: string, ledger: CreditLedgerEntry[]) {
  const headers = ['Date', 'Invoice/Receipt No', 'Type', 'Payment Mode', 'Particulars', 'Debit (Udhaar)', 'Credit (Payment)', 'Balance After'];
  const rows = ledger.map((entry) => {
    const isPurchase = entry.type === 'CREDIT_PURCHASE';
    return [
      new Date(entry.date).toLocaleString(),
      entry.billNumber || '-',
      isPurchase ? 'Udhaar Purchase' : 'Repayment',
      entry.paymentMethod || '-',
      entry.notes || '-',
      isPurchase ? entry.amount : 0,
      !isPurchase ? entry.amount : 0,
      entry.balanceAfter,
    ];
  });

  const safeName = customerName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  downloadCSV(`Khata_Statement_${safeName}`, headers, rows);
}

/**
 * Exports supplier statement to CSV
 */
export function exportSupplierStatementCSV(supplierName: string, ledger: SupplierLedgerEntry[]) {
  const headers = ['Date', 'Invoice No', 'Type', 'Payment Mode', 'Particulars', 'Purchase Amount', 'Payment Amount', 'Balance After'];
  const rows = ledger.map((entry) => {
    const isPurchase = entry.type === 'STOCK_PURCHASE';
    return [
      new Date(entry.date).toLocaleString(),
      entry.invoiceNumber || '-',
      isPurchase ? 'Stock Purchase' : 'Payment Given',
      entry.paymentMethod || '-',
      entry.notes || '-',
      isPurchase ? entry.amount : 0,
      !isPurchase ? entry.amount : 0,
      entry.balanceAfter,
    ];
  });

  const safeName = supplierName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  downloadCSV(`Supplier_Statement_${safeName}`, headers, rows);
}
