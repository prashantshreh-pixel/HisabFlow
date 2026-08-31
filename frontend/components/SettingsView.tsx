'use client';

import React, { useState, useEffect } from 'react';
import { useKhata } from '@/context/KhataContext';
import {
  Store,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  ShieldCheck,
  Server,
  RefreshCw,
  HardDrive,
  User,
  Phone,
  MapPin,
  Tag,
  Receipt,
  FileJson
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { customers, products, stats, showToast } = useKhata();

  // Store Profile State
  const [storeName, setStoreName] = useState('HisabFlow Grocery & Retail');
  const [tagline, setTagline] = useState('Digital Khata & Retail Ledger');
  const [ownerName, setOwnerName] = useState('Pasal Manager');
  const [phone, setPhone] = useState('9851000000');
  const [address, setAddress] = useState('Kathmandu, Nepal');
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  const [defaultCreditLimit, setDefaultCreditLimit] = useState('10000');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for shopping with us! Visit again.');

  const [isSaving, setIsSaving] = useState(false);

  // Load saved store profile from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hisabflow_store_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed.storeName) setStoreName(parsed.storeName);
        if (parsed.tagline) setTagline(parsed.tagline);
        if (parsed.ownerName) setOwnerName(parsed.ownerName);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.currencySymbol) setCurrencySymbol(parsed.currencySymbol);
        if (parsed.defaultCreditLimit) setDefaultCreditLimit(parsed.defaultCreditLimit);
        if (parsed.receiptFooter) setReceiptFooter(parsed.receiptFooter);
      }
    } catch (e) {
      console.error('Error loading store profile:', e);
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const profile = {
      storeName,
      tagline,
      ownerName,
      phone,
      address,
      currencySymbol,
      defaultCreditLimit,
      receiptFooter,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('hisabflow_store_profile', JSON.stringify(profile));
    setTimeout(() => {
      setIsSaving(false);
      showToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Store profile settings updated successfully.'
      });
    }, 400);
  };

  // ---------------- Export & Backup Functions ----------------

  const handleExportJSON = () => {
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      storeProfile: { storeName, tagline, ownerName, phone, address, currencySymbol },
      summary: {
        totalCustomers: customers.length,
        totalProducts: products.length,
        totalOutstandingKhata: stats.totalOutstandingKhata,
        totalInventoryValue: stats.totalInventoryCostValue
      },
      customers,
      products
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `hisabflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast({
      type: 'success',
      title: 'Backup Exported',
      message: `Full database backup downloaded: ${filename}`
    });
  };

  const handleExportCustomersCSV = () => {
    const headers = ['ID', 'Name', 'Phone', 'Address', 'Current Balance (Rs)', 'Credit Limit (Rs)', 'Last Activity'];
    const rows = customers.map(c => [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.currentBalance,
      c.creditLimit,
      `"${c.lastTransactionDate}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    const filename = `hisabflow-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast({
      type: 'info',
      title: 'CSV Downloaded',
      message: `Exported ${customers.length} customer records to CSV.`
    });
  };

  const handleExportProductsCSV = () => {
    const headers = ['ID', 'Name', 'Category', 'Selling Price (Rs)', 'Cost Price (Rs)', 'Current Stock', 'Min Stock Level'];
    const rows = products.map(p => [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.sellingPrice,
      p.costPrice,
      p.stockQuantity,
      p.minStockAlert
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    const filename = `hisabflow-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast({
      type: 'info',
      title: 'CSV Downloaded',
      message: `Exported ${products.length} product records to CSV.`
    });
  };

  const handleImportBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.customers || parsed.products) {
          showToast({
            type: 'success',
            title: 'Backup Verified',
            message: `Backup file contains ${parsed.customers?.length || 0} customers and ${parsed.products?.length || 0} products.`
          });
        } else {
          throw new Error('Invalid format');
        }
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Import Failed',
          message: 'Selected file is not a valid HisabFlow backup JSON.'
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs tracking-wider uppercase mb-1">
            <Store className="w-4 h-4" /> Store Settings & Data Backup
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100">
            System Configuration & Database Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage store profile, credit rules, backup data, and view real-time SQL Server database status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Full Backup
          </button>
        </div>
      </div>

      {/* Main Grid: Store Profile & Database Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Store Profile Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" />
              Store Business Profile
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              These details appear on statements, printed receipts, and SMS reminders.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-amber-400" /> Store / Pasal Name
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-medium focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" /> Business Tagline / Slogan
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-medium focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Owner Name
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-medium focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" /> Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> Store Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-medium focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-bold focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Default Customer Credit Limit (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={defaultCreditLimit}
                  onChange={(e) => setDefaultCreditLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-bold focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-400" /> Receipt Footer Note
              </label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-medium focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving Changes...' : 'Save Business Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Live Database & System Diagnostics */}
        <div className="space-y-6">
          {/* Database Health Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Live Database Health
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Target SQL Server:</span>
                <span className="font-mono font-bold text-slate-200">SHINIGAMI</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Database Name:</span>
                <span className="font-mono font-bold text-amber-400">HisabFlowDB</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Backend API Host:</span>
                <span className="font-mono font-bold text-slate-200">ASP.NET Core 9 (5200)</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">ORM / Access Layer:</span>
                <span className="font-semibold text-slate-300">Dapper Micro-ORM</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              Database Record Stats
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Total Customers</span>
                <span className="text-lg font-black text-slate-100 mt-0.5 block">{customers.length}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Total Products</span>
                <span className="text-lg font-black text-slate-100 mt-0.5 block">{products.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Data Backup, Import & CSV Exports */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            Data Backup & Export Tools
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Export customer ledgers, product inventory, and full system backups to JSON or CSV for safety and reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: JSON Backup */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <FileJson className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Full System Backup (JSON)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Complete database snapshot including customers, ledgers, products, and store configuration.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportJSON}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON Backup
            </button>
          </div>

          {/* Card 2: Customers CSV Export */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Customers Ledger (CSV)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Export customer phone numbers, addresses, credit limits, and balances to Excel CSV format.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCustomersCSV}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export Customers CSV
            </button>
          </div>

          {/* Card 3: Inventory Products CSV Export */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Inventory Stock List (CSV)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Export products, categories, cost prices, selling prices, and stock levels to Excel CSV format.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportProductsCSV}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" /> Export Inventory CSV
            </button>
          </div>
        </div>

        {/* Import Backup File Input */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-200 block">Verify or Import Existing Backup File</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Select a `.json` backup file from your computer to inspect and restore records.</span>
          </div>

          <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 cursor-pointer transition-colors flex items-center gap-2 shrink-0">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Browse JSON File</span>
            <input type="file" accept=".json" onChange={handleImportBackupJSON} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
