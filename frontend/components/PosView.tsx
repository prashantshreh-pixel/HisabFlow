'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useKhata } from '@/context/KhataContext';
import { salesApi } from '@/lib/api';
import { Product, Customer, CartItem, Sale, SalesSummary } from '@/types';
import {
  ScanBarcode,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  DollarSign,
  QrCode,
  BookOpen,
  Split,
  Layers,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  User,
  CheckCircle,
  History,
  TrendingUp,
  Boxes,
  AlertCircle,
  Keyboard,
} from 'lucide-react';
import { ButtonSpinner, PageLoader } from '@/components/Loader';
import { ReceiptModal } from '@/components/Modals/ReceiptModal';

export const PosView: React.FC = () => {
  const { products, customers, refreshData, showToast } = useKhata();

  // Mode: POS Terminal vs. Recent Invoices
  const [activeSubTab, setActiveSubTab] = useState<'TERMINAL' | 'INVOICES'>('TERMINAL');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENT'>('FLAT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [applyTax, setApplyTax] = useState<boolean>(false); // 13% VAT toggle
  const [notes, setNotes] = useState<string>('');

  // Payment Method: 1=Cash, 2=QR, 3=Khata, 4=Split
  const [paymentMethod, setPaymentMethod] = useState<number>(1);
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [splitCash, setSplitCash] = useState<number | ''>('');
  const [splitDigital, setSplitDigital] = useState<number | ''>('');
  const [splitCredit, setSplitCredit] = useState<number | ''>('');

  // Parked / Held Carts
  const [heldCarts, setHeldCarts] = useState<{ id: string; timestamp: string; cart: CartItem[]; customerId: string }[]>([]);

  // Checkout & Receipt Modal
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // Invoices Tab State
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState<boolean>(false);
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === 'FLAT') return Math.min(discountValue, subtotal);
    return Math.min(Math.round((subtotal * discountValue) / 100), subtotal);
  }, [subtotal, discountType, discountValue]);

  const taxableAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const taxAmount = useMemo(() => {
    if (!applyTax) return 0;
    return Math.round(taxableAmount * 0.13); // 13% Nepal VAT
  }, [applyTax, taxableAmount]);

  const grandTotal = useMemo(() => {
    return taxableAmount + taxAmount;
  }, [taxableAmount, taxAmount]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 1) return 0;
    const tendered = typeof cashTendered === 'number' ? cashTendered : 0;
    return Math.max(0, tendered - grandTotal);
  }, [paymentMethod, cashTendered, grandTotal]);

  // Clear Cart
  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomerId('');
    setDiscountValue(0);
    setApplyTax(false);
    setNotes('');
    setCashTendered('');
    setSplitCash('');
    setSplitDigital('');
    setSplitCredit('');
    searchInputRef.current?.focus();
  }, []);

  // Fetch Invoices when switching to INVOICES tab
  const fetchInvoices = async () => {
    try {
      setIsLoadingInvoices(true);
      const [salesData, summaryData] = await Promise.all([
        salesApi.getRecentSales(50),
        salesApi.getSalesSummary(),
      ]);
      setRecentSales(salesData);
      setSalesSummary(summaryData);
    } catch (err) {
      console.error('Failed to load recent sales:', err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Auto-fill exact cash tendered when total changes if empty
  useEffect(() => {
    if (paymentMethod === 1 && (cashTendered === '' || cashTendered === 0)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCashTendered(grandTotal);
    }
  }, [grandTotal, paymentMethod, cashTendered]);

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'INVOICES') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchInvoices();
    }
  }, [activeSubTab]);

  // Cart Operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          subtotal: product.sellingPrice,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.unitPrice,
            }
          : item
      )
    );
  };

  const updateUnitPrice = (productId: string, unitPrice: number) => {
    if (unitPrice < 0) return;
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              unitPrice,
              subtotal: item.quantity * unitPrice,
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Barcode / Search form submit: if exact match or single product, add directly!
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check exact barcode match first
    const exactBarcode = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === searchQuery.toLowerCase().trim()
    );
    if (exactBarcode) {
      addToCart(exactBarcode);
      setSearchQuery('');
      showToast({ type: 'success', title: 'Product Added', message: `Added ${exactBarcode.name} to cart.` });
      return;
    }

    // Check if only 1 matching product
    if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0]);
      setSearchQuery('');
      showToast({ type: 'success', title: 'Product Added', message: `Added ${filteredProducts[0].name} to cart.` });
    }
  };

  // Park / Hold Cart
  const handleHoldCart = () => {
    if (cart.length === 0) {
      showToast({ type: 'warning', title: 'Empty Cart', message: 'Cart is empty. Nothing to hold.' });
      return;
    }
    const newHold = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cart: [...cart],
      customerId: selectedCustomerId,
    };
    setHeldCarts((prev) => [newHold, ...prev]);
    clearCart();
    showToast({ type: 'info', title: 'Cart Parked', message: 'Cart parked/held successfully.' });
  };

  // Recall Held Cart
  const handleRecallCart = (holdId: string) => {
    const held = heldCarts.find((h) => h.id === holdId);
    if (!held) return;
    setCart(held.cart);
    setSelectedCustomerId(held.customerId);
    setHeldCarts((prev) => prev.filter((h) => h.id !== holdId));
    showToast({ type: 'success', title: 'Cart Recalled', message: 'Recalled parked cart.' });
  };

  // Process Checkout
  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) {
      showToast({ type: 'warning', title: 'Empty Cart', message: 'Cart is empty. Please add items to checkout.' });
      return;
    }

    if (paymentMethod === 3 && !selectedCustomerId) {
      showToast({ type: 'warning', title: 'Select Customer', message: 'Please select a Khata customer for credit billing.' });
      return;
    }

    // Calculate payment parts
    let cashPaid = 0;
    let digitalPaid = 0;
    let creditPaid = 0;
    let paidAmount = 0;

    if (paymentMethod === 1) {
      // Cash
      const tendered = typeof cashTendered === 'number' ? cashTendered : grandTotal;
      if (tendered < grandTotal) {
        showToast({ type: 'warning', title: 'Insufficient Tender', message: 'Cash tendered is less than Grand Total.' });
        return;
      }
      cashPaid = grandTotal;
      paidAmount = tendered;
    } else if (paymentMethod === 2) {
      // QR Pay
      digitalPaid = grandTotal;
      paidAmount = grandTotal;
    } else if (paymentMethod === 3) {
      // Khata
      creditPaid = grandTotal;
      paidAmount = 0;
    } else if (paymentMethod === 4) {
      // Split
      const c = typeof splitCash === 'number' ? splitCash : 0;
      const d = typeof splitDigital === 'number' ? splitDigital : 0;
      const cr = typeof splitCredit === 'number' ? splitCredit : 0;
      if (c + d + cr < grandTotal) {
        showToast({ type: 'warning', title: 'Invalid Split Amount', message: `Split total (Rs. ${c + d + cr}) is less than Grand Total (Rs. ${grandTotal}).` });
        return;
      }
      if (cr > 0 && !selectedCustomerId) {
        showToast({ type: 'warning', title: 'Select Customer', message: 'Please select a customer for split credit balance.' });
        return;
      }
      cashPaid = c;
      digitalPaid = d;
      creditPaid = cr;
      paidAmount = c + d;
    }

    try {
      setIsProcessing(true);

      const saleRequest = {
        customerId: selectedCustomerId || undefined,
        customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
        customerPhone: selectedCustomer ? selectedCustomer.phone : undefined,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount: grandTotal,
        paidAmount,
        changeAmount,
        paymentMethod,
        cashPaid,
        digitalPaid,
        creditPaid,
        notes: notes || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          unit: item.product.unit || 'pcs',
          unitPrice: item.unitPrice,
          costPrice: item.product.costPrice || 0,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
      };

      const created = await salesApi.createSale(saleRequest);
      await refreshData();

      setCompletedSale(created);
      setIsReceiptOpen(true);
      clearCart();
      showToast({ type: 'success', title: 'Sale Completed', message: `Invoice #${created.invoiceNumber} recorded successfully.` });
    } catch (err: any) {
      console.error('Checkout error:', err);
      showToast({ type: 'error', title: 'Checkout Failed', message: err.message || 'Failed to complete sale.' });
    } finally {
      setIsProcessing(false);
    }
  }, [cart, paymentMethod, selectedCustomerId, selectedCustomer, subtotal, discountAmount, taxAmount, grandTotal, changeAmount, cashTendered, splitCash, splitDigital, splitCredit, notes, showToast, refreshData]);

  // Global POS Keyboard Shortcuts Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: POS Terminal tab
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveSubTab('TERMINAL');
        searchInputRef.current?.focus();
      }
      // F3 or Ctrl+K: Focus Search/Barcode Input
      else if (e.key === 'F3' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setActiveSubTab('TERMINAL');
        searchInputRef.current?.focus();
      }
      // F4: Recent Invoices tab
      else if (e.key === 'F4') {
        e.preventDefault();
        setActiveSubTab('INVOICES');
      }
      // F9 or Ctrl+Enter: Trigger Checkout
      else if ((e.ctrlKey && e.key === 'Enter') || e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0 && !isProcessing) {
          handleCheckout();
        }
      }
      // Escape: Clear Search or Cart
      else if (e.key === 'Escape' && activeSubTab === 'TERMINAL') {
        if (searchQuery) {
          setSearchQuery('');
        } else if (cart.length > 0 && document.activeElement !== searchInputRef.current) {
          clearCart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isProcessing, activeSubTab, searchQuery, handleCheckout]);

  // Filtered recent invoices
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return recentSales;
    const q = invoiceSearch.toLowerCase().trim();
    return recentSales.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q))
    );
  }, [recentSales, invoiceSearch]);

  return (
    <div className="space-y-4 pb-16">
      {/* Top POS Sub-Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-100 tracking-tight">
              POS / Quick Billing
            </h2>
            <p className="text-xs text-slate-400">
              High-speed retail billing, barcode scanning, live stock deduction & Khata linking
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('TERMINAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'TERMINAL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS Terminal (F2)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('INVOICES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'INVOICES'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Recent Invoices (F4)</span>
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Quick Bar */}
      <div className="px-4 py-2 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between text-[11px] text-slate-400 overflow-x-auto gap-3">
        <div className="flex items-center gap-1.5 shrink-0 text-amber-400 font-bold">
          <Keyboard className="w-3.5 h-3.5" />
          <span>Counter Shortcuts:</span>
        </div>
        <div className="flex items-center gap-4 shrink-0 font-mono">
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300">F3 / Ctrl+K</kbd> Search</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300">F2</kbd> Terminal</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300">F4</kbd> Invoices</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-emerald-400">Ctrl+Enter / F9</kbd> Checkout</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-rose-300">Esc</kbd> Clear</span>
        </div>
      </div>

      {activeSubTab === 'TERMINAL' ? (
        /* MAIN SPLIT POS TERMINAL */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT 7 COLS: Product Catalog & Fast Scanner */}
          <div className="lg:col-span-7 space-y-4">
            {/* Barcode & Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan Barcode or Search product name / SKU (Press Enter)..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-colors shrink-0 shadow-sm shadow-amber-500/20"
              >
                Find & Add
              </button>
            </form>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Boxes className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No matching products found</h4>
                <p className="text-xs text-slate-500">
                  Try adjusting your search query or select another category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[620px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.stockQuantity <= 0;
                  const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= (p.minStockAlert || 5);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={isOutOfStock}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
                        isOutOfStock
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                          : 'bg-slate-900 border-slate-800 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                            {p.category}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${
                              isOutOfStock
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : isLowStock
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {p.stockQuantity} {p.unit}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-2">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-emerald-400">
                          Rs. {p.sellingPrice.toLocaleString()}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 flex items-center justify-center transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT 5 COLS: Interactive Cart, Calculations & Checkout */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              {/* Customer Selector & Cart Controls */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex-1">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">Walk-in Customer (Cash / Direct)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - Due: Rs. {c.currentBalance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  {cart.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleHoldCart}
                        title="Hold/Park Cart"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl transition-colors border border-slate-700"
                      >
                        <PauseCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={clearCart}
                        title="Clear Cart"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl transition-colors border border-slate-700"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Parked Carts Notification Strip */}
              {heldCarts.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <PauseCircle className="w-4 h-4" />
                    <span>{heldCarts.length} Parked Cart(s)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {heldCarts.map((h, i) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => handleRecallCart(h.id)}
                        className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold text-[10px] hover:bg-amber-400 transition-colors"
                      >
                        Recall #{i + 1} ({h.timestamp})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">Cart is empty</p>
                  <p className="text-[11px] text-slate-600">
                    Scan a barcode or click products on the left to add items.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-100 truncate">{item.product.name}</h5>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Rs. {item.unitPrice} / {item.product.unit}
                        </span>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product.id, parseFloat(e.target.value) || 1)}
                          className="w-10 text-center bg-transparent text-xs font-mono font-bold text-slate-100 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-emerald-400">
                          Rs. {item.subtotal.toLocaleString()}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Calculations Block */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Items Subtotal ({cart.length} items):</span>
                  <span className="font-mono font-bold text-slate-200">Rs. {subtotal.toLocaleString()}</span>
                </div>

                {/* Discount and VAT toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Disc:</span>
                    <input
                      type="number"
                      min="0"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-transparent text-xs font-mono text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setDiscountType((t) => (t === 'FLAT' ? 'PERCENT' : 'FLAT'))}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-amber-400"
                    >
                      {discountType === 'FLAT' ? 'Rs' : '%'}
                    </button>
                  </div>

                  <label className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 cursor-pointer">
                    <span className="text-[11px] text-slate-300 font-medium">Add 13% VAT</span>
                    <input
                      type="checkbox"
                      checked={applyTax}
                      onChange={(e) => setApplyTax(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                    />
                  </label>
                </div>

                {/* Grand Total */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-950 to-slate-950 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                      Payable Grand Total
                    </span>
                    <span className="text-xl font-mono font-black text-slate-100">
                      Rs. {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Select Payment Method
                </span>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 1, label: 'Cash', icon: DollarSign },
                    { id: 2, label: 'QR Pay', icon: QrCode },
                    { id: 3, label: 'Khata', icon: BookOpen },
                    { id: 4, label: 'Split', icon: Split },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === m.id
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Method 1: Cash Change Calculator */}
                {paymentMethod === 1 && (
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">Cash Received:</span>
                      <div className="flex items-center gap-1 bg-slate-900 px-3 py-1 rounded-xl border border-slate-700">
                        <span className="text-xs text-slate-500 font-mono">Rs.</span>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder={grandTotal.toString()}
                          className="w-24 bg-transparent text-sm font-mono font-bold text-slate-100 text-right focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Fast Note Buttons */}
                    <div className="flex items-center gap-1">
                      {[grandTotal, 100, 500, 1000, 2000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCashTendered(val)}
                          className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-300 rounded-lg border border-slate-700 transition-colors"
                        >
                          {val === grandTotal ? 'Exact' : val}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                      <span className="text-slate-400">Change Return Due:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        Rs. {changeAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Method 2: QR Pay info */}
                {paymentMethod === 2 && (
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-emerald-400">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-emerald-400" />
                      <span>Scan Fonepay / eSewa / Khalti QR code</span>
                    </div>
                    <span className="font-mono font-bold text-slate-100">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                )}

                {/* Method 3: Khata Credit Check */}
                {paymentMethod === 3 && (
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Customer Khata:</span>
                      <span className="font-bold text-slate-200">
                        {selectedCustomer ? selectedCustomer.name : 'No customer selected!'}
                      </span>
                    </div>
                    {selectedCustomer && (
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>New Balance will be:</span>
                        <span className="font-mono font-bold text-rose-400">
                          Rs. {(selectedCustomer.currentBalance + grandTotal).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Method 4: Split Payment inputs */}
                {paymentMethod === 4 && (
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Cash Part:</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-slate-100 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">QR / Digital:</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={splitDigital}
                        onChange={(e) => setSplitDigital(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-slate-100 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Khata (Credit):</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={splitCredit}
                        onChange={(e) => setSplitCredit(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-slate-100 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Action Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isProcessing || cart.length === 0}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  isProcessing || cart.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-xl shadow-amber-500/25 active:scale-[0.99]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <ButtonSpinner />
                    <span>Processing Sale & Billing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Complete Sale & Bill (Rs. {grandTotal.toLocaleString()})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* RECENT INVOICES VIEW */
        <div className="space-y-4">
          {/* Summary KPIs */}
          {salesSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Today&apos;s POS Sales
                </span>
                <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                  Rs. {salesSummary.totalSalesAmount.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400">{salesSummary.totalBillsCount} Invoices</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cash Collections
                </span>
                <div className="text-xl font-black font-mono text-slate-100 mt-1">
                  Rs. {salesSummary.cashSalesAmount.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Digital / QR Sales
                </span>
                <div className="text-xl font-black font-mono text-cyan-400 mt-1">
                  Rs. {salesSummary.digitalSalesAmount.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Khata Credit Sales
                </span>
                <div className="text-xl font-black font-mono text-rose-400 mt-1">
                  Rs. {salesSummary.creditSalesAmount.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Search bar & Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="Search invoice number or customer name..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={fetchInvoices}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                Refresh List
              </button>
            </div>

            {isLoadingInvoices ? (
              <PageLoader text="Loading recent sales invoices..." />
            ) : filteredInvoices.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No invoices recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4 text-center">Items</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredInvoices.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-100">{s.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(s.saleDate).toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-300 font-sans">
                          {s.customerName || 'Walk-in Customer'}
                        </td>
                        <td className="py-3 px-4 text-center">{s.items?.length || 0}</td>
                        <td className="py-3 px-4 font-sans text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold ${
                              s.paymentMethod === 1
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : s.paymentMethod === 2
                                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                                : s.paymentMethod === 3
                                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            }`}
                          >
                            {s.paymentMethod === 1 ? 'Cash' : s.paymentMethod === 2 ? 'QR' : s.paymentMethod === 3 ? 'Khata' : 'Split'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-400">
                          Rs. {s.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setCompletedSale(s);
                              setIsReceiptOpen(true);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-sans font-semibold"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Thermal Receipt Modal */}
      <ReceiptModal
        sale={completedSale}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};