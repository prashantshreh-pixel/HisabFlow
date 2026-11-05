'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useKhata } from '@/context/KhataContext';
import { salesApi, getImageUrl } from '@/lib/api';
import { formatLocalTime, playPosSound } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
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
  Store,
  X,
} from 'lucide-react';
import { ButtonSpinner, PageLoader } from '@/components/Loader';
import { ReceiptModal } from '@/components/Modals/ReceiptModal';
import { DynamicQrModal } from '@/components/Modals/DynamicQrModal';
import { generateDynamicQrPayload, generateQrDataUrl } from '@/lib/qrUtils';

export const PosView: React.FC = () => {
  const { products, customers, refreshData, showToast, storeProfile, t, formatDate, language } = useKhata();
  const cur = storeProfile?.currencySymbol || 'Rs.';
  const currentUser = getCurrentUser();
  const canRefund = !currentUser || currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  // Mode: POS Terminal vs. Recent Invoices
  const [activeSubTab, setActiveSubTab] = useState<'TERMINAL' | 'INVOICES'>('TERMINAL');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Barcode Audio & Visual Flash Feedback State
  const [scanFlash, setScanFlash] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const scanFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sale Refund & Return Modal State
  const [saleToRefund, setSaleToRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState<string>('Customer Return');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

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
  const [isDynamicQrModalOpen, setIsDynamicQrModalOpen] = useState<boolean>(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [inlineQrUrl, setInlineQrUrl] = useState<string>('');

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

  // Generate inline dynamic QR for checkout
  useEffect(() => {
    let isCurrent = true;
    const qrAmount = paymentMethod === 4 && typeof splitDigital === 'number' && splitDigital > 0 ? splitDigital : grandTotal;
    if ((paymentMethod === 2 || (paymentMethod === 4 && typeof splitDigital === 'number' && splitDigital > 0)) && qrAmount > 0) {
      const payload = generateDynamicQrPayload({
        accountName: storeProfile?.qrAccountName || 'Anjali Store',
        accountNumber: storeProfile?.qrAccountNumber || '2222610021768837',
        bankCode: storeProfile?.qrBankCode || 'fonepay.com',
        bankCodeCIPS: storeProfile?.qrBankCodeCIPS || '4271420021768837',
        bankName: storeProfile?.qrBankName || 'Fonepay (Khalti)',
        merchantId: storeProfile?.qrMerchantId || storeProfile?.qrAccountNumber || '2222610021768837',
        acquirerId: storeProfile?.qrAcquirerId || storeProfile?.qrBankCodeCIPS || '4271420021768837',
        terminalLabel: storeProfile?.qrTerminalLabel || '2236157',
        city: storeProfile?.qrCity || storeProfile?.address || 'Lalitpur MP',



        amount: qrAmount,
        remarks: 'HisabFlow POS',
        format: storeProfile?.qrFormat || 'FONEPAY_DYNAMIC',
      });
      generateQrDataUrl(payload, { width: 180, margin: 1 })
        .then((url) => {
          if (isCurrent) setInlineQrUrl(url);
        })
        .catch(() => {
          if (isCurrent) setInlineQrUrl('');
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInlineQrUrl('');
    }
    return () => {
      isCurrent = false;
    };
  }, [paymentMethod, grandTotal, splitDigital, storeProfile]);

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

  // Trigger audio beep/buzz + visual flash on barcode scan or item addition
  const triggerScanFeedback = useCallback((type: 'success' | 'error', message: string) => {
    playPosSound(type === 'success' ? 'beep' : 'error');
    if (scanFlashTimerRef.current) {
      clearTimeout(scanFlashTimerRef.current);
    }
    setScanFlash({ type, message });
    scanFlashTimerRef.current = setTimeout(() => {
      setScanFlash(null);
    }, 1100);
  }, []);

  // Cart Operations
  const addToCart = (product: Product, fromBarcodeScan = false) => {
    if (product.stockQuantity <= 0) {
      triggerScanFeedback('error', `${t('outOfStock')}: ${product.name}`);
      showToast({
        type: 'warning',
        title: language === 'np' ? 'स्टक सकिएको छ' : 'Out of Stock',
        message: `${product.name} has 0 stock remaining.`,
      });
      return;
    }

    if (!fromBarcodeScan) {
      playPosSound('beep');
    }

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

  // Barcode / Search form submit: if exact match or single product, add directly with audio beep & flash!
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    // Check exact barcode match first
    const exactBarcode = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()
    );
    if (exactBarcode) {
      if (exactBarcode.stockQuantity <= 0) {
        triggerScanFeedback('error', `${t('outOfStock')}: ${exactBarcode.name}`);
        showToast({
          type: 'warning',
          title: language === 'np' ? 'स्टक सकिएको छ' : 'Out of Stock',
          message: `${exactBarcode.name} is currently out of stock.`,
        });
        setSearchQuery('');
        return;
      }
      addToCart(exactBarcode, true);
      triggerScanFeedback('success', `✓ ${exactBarcode.name} (${cur} ${exactBarcode.sellingPrice})`);
      setSearchQuery('');
      showToast({ type: 'success', title: 'Barcode Scanned', message: `Added ${exactBarcode.name} to cart.` });
      return;
    }

    // Check if only 1 matching product
    if (filteredProducts.length === 1) {
      const match = filteredProducts[0];
      if (match.stockQuantity <= 0) {
        triggerScanFeedback('error', `${t('outOfStock')}: ${match.name}`);
        showToast({
          type: 'warning',
          title: language === 'np' ? 'स्टक सकिएको छ' : 'Out of Stock',
          message: `${match.name} is currently out of stock.`,
        });
        return;
      }
      addToCart(match, true);
      triggerScanFeedback('success', `✓ ${match.name} (${cur} ${match.sellingPrice})`);
      setSearchQuery('');
      showToast({ type: 'success', title: 'Product Added', message: `Added ${match.name} to cart.` });
      return;
    }

    // If no products matched at all, buzz & flash red
    if (filteredProducts.length === 0) {
      triggerScanFeedback('error', `${language === 'np' ? 'भेटिएन' : 'Not found'}: "${trimmed}"`);
      showToast({
        type: 'error',
        title: language === 'np' ? 'बारकोड भेटिएन' : 'Barcode Not Found',
        message: `No product matched "${trimmed}".`,
      });
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
      playPosSound('checkout');
      await refreshData();

      setCompletedSale(created);
      setIsReceiptOpen(true);
      setIsDynamicQrModalOpen(false);
      setIsMobileCartOpen(false);
      clearCart();
      showToast({ type: 'success', title: 'Sale Completed', message: `Invoice #${created.invoiceNumber} recorded successfully.` });
    } catch (err: any) {
      console.error('Checkout error:', err);
      playPosSound('error');
      showToast({ type: 'error', title: 'Checkout Failed', message: err.message || 'Failed to complete sale.' });
    } finally {
      setIsProcessing(false);
    }
  }, [cart, paymentMethod, selectedCustomerId, selectedCustomer, subtotal, discountAmount, taxAmount, grandTotal, changeAmount, cashTendered, splitCash, splitDigital, splitCredit, notes, showToast, refreshData, clearCart]);

  // Process POS Sale Refund & Return
  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToRefund || isRefunding) return;
    try {
      setIsRefunding(true);
      const updatedSale = await salesApi.refundSale(
        saleToRefund.id,
        refundReason.trim() || 'Customer Return'
      );
      playPosSound('beep');
      await Promise.all([fetchInvoices(), refreshData()]);
      if (completedSale?.id === updatedSale.id) {
        setCompletedSale(updatedSale);
      }
      showToast({
        type: 'success',
        title: language === 'np' ? 'बिल फिर्ता सम्पन्न भयो' : 'Sale Refunded & Stock Restored',
        message:
          language === 'np'
            ? `बिल #${updatedSale.invoiceNumber} फिर्ता गरियो र स्टक अद्यावधिक गरियो।`
            : `Invoice #${updatedSale.invoiceNumber} refunded. Stock & Khata balance restored.`,
      });
      setSaleToRefund(null);
      setRefundReason('Customer Return');
    } catch (err: any) {
      playPosSound('error');
      showToast({
        type: 'error',
        title: language === 'np' ? 'बिल फिर्ता असफल' : 'Refund Failed',
        message: err.message || 'Failed to process refund.',
      });
    } finally {
      setIsRefunding(false);
    }
  };

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
  }, [cart, isProcessing, activeSubTab, searchQuery, handleCheckout, clearCart]);

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

  const totalCartUnits = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  return (
    <div className="space-y-4">
      {/* Clean Top POS Bar */}
      <div className="flex items-center justify-between gap-3">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('TERMINAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'TERMINAL'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{t('billingTerminal')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('INVOICES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'INVOICES'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('recentInvoices')}</span>
          </button>
        </div>

        {/* Subtle Desktop Keyboard Shortcuts Hint */}
        <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">F3</kbd> Search
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">F4</kbd> {t('invoices')}
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-emerald-400">F9</kbd> {t('checkout')}
          </span>
        </div>
      </div>

      {activeSubTab === 'TERMINAL' ? (
        /* MAIN SPLIT POS TERMINAL */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 7 COLS: Product Catalog & Fast Scanner */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* Barcode & Search Bar with Audio + Visual Flash Feedback */}
            <form
              onSubmit={handleSearchSubmit}
              className={`p-2.5 border rounded-2xl flex items-center gap-2 transition-all duration-200 relative ${
                scanFlash?.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20'
                  : scanFlash?.type === 'error'
                  ? 'bg-rose-950/70 border-rose-500 ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/20'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="relative flex-1">
                <ScanBarcode
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                    scanFlash?.type === 'success'
                      ? 'text-emerald-400'
                      : scanFlash?.type === 'error'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchBarcodePlaceholder')}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              {scanFlash && (
                <span
                  className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold animate-in fade-in zoom-in-95 duration-150 shrink-0 ${
                    scanFlash.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {scanFlash.message}
                </span>
              )}
              <button
                type="submit"
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                {t('add')}
              </button>
            </form>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-2">
                <Boxes className="w-9 h-9 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">{t('noMatchingProducts')}</h4>
                <p className="text-xs text-slate-500">
                  Try adjusting your search query or select another category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 lg:max-h-[650px] lg:overflow-y-auto pr-0.5">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.stockQuantity <= 0;
                  const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= (p.minStockAlert || 5);
                  const inCartItem = cart.find((item) => item.product.id === p.id);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={isOutOfStock}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden active:scale-[0.98] ${
                        isOutOfStock
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-55 cursor-not-allowed'
                          : inCartItem
                          ? 'bg-slate-900 border-amber-500/60 ring-1 ring-amber-500/30 cursor-pointer'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {p.imageUrl ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getImageUrl(p.imageUrl)}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : null}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-medium text-slate-400 truncate">
                              {p.category}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold shrink-0 ${
                                isOutOfStock
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : isLowStock
                                  ? 'bg-amber-500/10 text-amber-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {p.stockQuantity} {p.unit}
                            </span>
                          </div>

                          <h4 className="text-xs font-semibold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                            {p.name}
                          </h4>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-emerald-400">
                          {cur} {p.sellingPrice.toLocaleString()}
                        </span>
                        {inCartItem ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-[11px]">
                            {inCartItem.quantity}x
                          </span>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 flex items-center justify-center transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT 5 COLS: Interactive Cart (Desktop Sticky Column + Mobile Slide-Up Sheet) */}
          <div
            className={`${
              isMobileCartOpen
                ? 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col justify-end lg:static lg:bg-transparent lg:backdrop-blur-none lg:block'
                : 'hidden lg:block'
            } lg:col-span-5`}
          >
            <div className="bg-slate-900 border-t lg:border border-slate-800 rounded-t-3xl lg:rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] lg:max-h-none overflow-y-auto">
              {/* Mobile Sheet Header */}
              <div className="flex lg:hidden items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-slate-100">
                    {t('currentBill')} ({totalCartUnits} {t('items')})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Customer Selector & Cart Controls */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex-1">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">{t('walkInCustomer')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - {t('due')}: {cur} {c.currentBalance.toLocaleString()}
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
                        title={t('holdCart')}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl transition-colors border border-slate-700"
                      >
                        <PauseCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={clearCart}
                        title={t('clearCart')}
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
                    <span>{heldCarts.length} {t('parkedCarts')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {heldCarts.map((h, i) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => handleRecallCart(h.id)}
                        className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold text-[10px] hover:bg-amber-400 transition-colors"
                      >
                        {t('recall')} #{i + 1} ({h.timestamp})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl">
                  <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">{t('cartEmpty')}</p>
                  <p className="text-[11px] text-slate-600">
                    {t('cartEmptyHint')}
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
                          {cur} {item.unitPrice} / {item.product.unit}
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
                          {cur} {item.subtotal.toLocaleString()}
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
                  <span className="text-slate-400">{t('itemsSubtotal')} ({cart.length} {t('items')}):</span>
                  <span className="font-mono font-bold text-slate-200">{cur} {subtotal.toLocaleString()}</span>
                </div>

                {/* Discount and VAT toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{t('disc')}:</span>
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
                      onClick={() => setDiscountType((dt) => (dt === 'FLAT' ? 'PERCENT' : 'FLAT'))}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-amber-400"
                    >
                      {discountType === 'FLAT' ? cur : '%'}
                    </button>
                  </div>

                  <label className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 cursor-pointer">
                    <span className="text-[11px] text-slate-300 font-medium">{t('addVat')}</span>
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
                      {t('payableGrandTotal')}
                    </span>
                    <span className="text-xl font-mono font-black text-slate-100">
                      {cur} {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  {t('selectPaymentMethod')}
                </span>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 1, label: t('cash'), icon: DollarSign },
                    { id: 2, label: t('qrPay'), icon: QrCode },
                    { id: 3, label: 'Khata', icon: BookOpen },
                    { id: 4, label: t('split'), icon: Split },
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
                      <span className="text-xs text-slate-400">{t('cashReceived')}:</span>
                      <div className="flex items-center gap-1 bg-slate-900 px-3 py-1 rounded-xl border border-slate-700">
                        <span className="text-xs text-slate-500 font-mono">{cur}</span>
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
                          {val === grandTotal ? t('exact') : val}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                      <span className="text-slate-400">{t('changeReturnDue')}:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {cur} {changeAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Method 2: Dynamic QR Pay */}
                {paymentMethod === 2 && (
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          {t('dynamicQrReady')}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                        Auto-Fills {cur} {grandTotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Inline QR Canvas Thumbnail */}
                      <button
                        type="button"
                        onClick={() => setIsDynamicQrModalOpen(true)}
                        className="bg-white p-1.5 rounded-xl shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-md group relative block text-left border border-slate-200"
                        title="Click to enlarge QR for customer"
                      >
                        {inlineQrUrl ? (
                          <img
                            src={inlineQrUrl}
                            alt="Dynamic Payment QR"
                            className="w-20 h-20 object-contain rounded-md"
                          />
                        ) : (
                          <div className="w-20 h-20 flex items-center justify-center text-slate-400">
                            <QrCode className="w-8 h-8 animate-pulse text-emerald-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-slate-950/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[8.5px] font-bold text-white bg-slate-900 px-1 py-0.5 rounded">Enlarge</span>
                        </div>
                      </button>

                      {/* Payment Beneficiary info */}
                      <div className="space-y-1 min-w-0 flex-1 text-xs">
                        <p className="font-bold text-slate-200 truncate">
                          {storeProfile?.qrAccountName || 'Anjali Store'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {storeProfile?.qrBankName || 'Fonepay (Khalti)'} • <span className="font-mono">{storeProfile?.qrAccountNumber || '2222610021768837'}</span>
                        </p>
                        <p className="text-[10px] text-emerald-400 font-semibold">
                          ✓ Pre-filled {cur} {grandTotal.toFixed(2)} • No manual typing
                        </p>

                        <button
                          type="button"
                          onClick={() => setIsDynamicQrModalOpen(true)}
                          className="mt-1 px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>{t('showFullscreenQr')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Method 3: Khata Credit Check */}
                {paymentMethod === 3 && (
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{t('customerKhata')}:</span>
                      <span className="font-bold text-slate-200">
                        {selectedCustomer ? selectedCustomer.name : t('noCustomerSelected')}
                      </span>
                    </div>
                    {selectedCustomer && (
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>{t('newBalanceWillBe')}:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {cur} {(selectedCustomer.currentBalance + grandTotal).toLocaleString()}
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
                    {typeof splitDigital === 'number' && splitDigital > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsDynamicQrModalOpen(true)}
                        className="w-full py-1.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>Show Dynamic QR for {cur} {splitDigital.toFixed(2)}</span>
                      </button>
                    )}
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
                    <span>{t('processingSale')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>{t('completeSaleAndBill')} ({cur} {grandTotal.toLocaleString()})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Floating Cart Bar (Visible on phones/tablets when items are in cart) */}
          {cart.length > 0 && !isMobileCartOpen && (
            <div className="lg:hidden fixed bottom-19 inset-x-4 z-30">
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="w-full p-3.5 rounded-2xl bg-amber-500 text-slate-950 shadow-2xl shadow-amber-500/30 flex items-center justify-between font-bold text-xs active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-1 rounded-lg bg-slate-950 text-amber-400 font-mono font-black text-xs">
                    {totalCartUnits} {t('items')}
                  </span>
                  <span className="font-mono font-black text-sm">
                    {cur} {grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-black">
                  <span>{t('viewBillAndPay')}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* RECENT INVOICES VIEW */
        <div className="space-y-4">
          {/* Summary KPIs */}
          {salesSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('todaysPosSales')}
                </span>
                <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                  {cur} {salesSummary.totalSalesAmount.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400">{salesSummary.totalBillsCount} {t('invoices')}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('cashCollections')}
                </span>
                <div className="text-xl font-black font-mono text-slate-100 mt-1">
                  {cur} {salesSummary.cashSalesAmount.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('digitalQrSales')}
                </span>
                <div className="text-xl font-black font-mono text-cyan-400 mt-1">
                  {cur} {salesSummary.digitalSalesAmount.toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('khataCreditSales')}
                </span>
                <div className="text-xl font-black font-mono text-rose-400 mt-1">
                  {cur} {salesSummary.creditSalesAmount.toLocaleString()}
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
                  placeholder={t('searchInvoicePlaceholder')}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={fetchInvoices}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                {t('refreshList')}
              </button>
            </div>

            {isLoadingInvoices ? (
              <PageLoader text="Loading recent sales invoices..." />
            ) : filteredInvoices.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                {t('noInvoicesYet')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{t('invoiceNo')}</th>
                      <th className="py-3 px-4">{t('dateTime')}</th>
                      <th className="py-3 px-4">{t('customer')}</th>
                      <th className="py-3 px-4 text-center">{t('items')}</th>
                      <th className="py-3 px-4">{t('payment')}</th>
                      <th className="py-3 px-4 text-right">{t('totalAmount')}</th>
                      <th className="py-3 px-4 text-center">{t('action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredInvoices.map((s) => (
                      <tr
                        key={s.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          s.isRefunded ? 'opacity-75 bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-100">
                          <div className="flex items-center gap-2">
                            <span>{s.invoiceNumber}</span>
                            {s.isRefunded && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[9px] font-sans font-black uppercase">
                                {t('refunded')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {formatDate(s.saleDate)} <span className="text-[10px] text-slate-500">{formatLocalTime(s.saleDate)}</span>
                        </td>
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
                                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                            }`}
                          >
                            {s.paymentMethod === 1 ? t('cash') : s.paymentMethod === 2 ? 'QR' : s.paymentMethod === 3 ? 'Khata' : t('split')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black">
                          <span className={s.isRefunded ? 'line-through text-slate-500' : 'text-emerald-400'}>
                            {cur} {s.totalAmount.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCompletedSale(s);
                                setIsReceiptOpen(true);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-sans font-semibold"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{t('receipt')}</span>
                            </button>

                            {!s.isRefunded && canRefund && (
                              <button
                                id={`refund-invoice-${s.id}`}
                                type="button"
                                onClick={() => {
                                  setSaleToRefund(s);
                                  setRefundReason('Customer Return');
                                }}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/25 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-sans font-semibold"
                                title={language === 'np' ? 'यो बिल फिर्ता गर्नुहोस् र स्टक जोड्नुहोस्' : 'Refund sale & restore inventory stock'}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t('refund')}</span>
                              </button>
                            )}
                          </div>
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
        canRefund={canRefund}
        onRefundSale={(sale) => {
          setIsReceiptOpen(false);
          setSaleToRefund(sale);
          setRefundReason('Customer Return');
        }}
      />

      {/* POS Sale Refund & Return Confirmation Modal */}
      {saleToRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">
                    {language === 'np' ? 'बिल फिर्ता र स्टक मिलान' : 'Refund & Return POS Sale'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {saleToRefund.invoiceNumber} • {cur} {saleToRefund.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaleToRefund(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRefund} className="p-5 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{t('customer')}:</span>
                  <span className="font-bold text-slate-200">
                    {saleToRefund.customerName || 'Walk-in Customer'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{t('items')}:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{saleToRefund.items?.length || 0} SKU(s) restored to stock
                  </span>
                </div>
                {saleToRefund.creditPaid > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Khata Reversal:</span>
                    <span className="font-mono font-bold text-amber-400">
                      -{cur} {saleToRefund.creditPaid.toLocaleString()} from customer due
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  {language === 'np' ? 'फिर्ता गर्नुको कारण (Refund Reason)' : 'Reason for Return / Refund'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Customer Return',
                    'Defective / Damaged Item',
                    'Wrong Item Billed',
                    'Order Cancelled',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRefundReason(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        refundReason === preset
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for refund..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleToRefund(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  {language === 'np' ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
                >
                  {isRefunding ? (
                    <ButtonSpinner />
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>
                        {language === 'np' ? 'बिल फिर्ता निश्चित गर्नुहोस्' : 'Confirm Refund & Return'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Customer-Facing QR Payment Modal */}
      <DynamicQrModal
        isOpen={isDynamicQrModalOpen}
        onClose={() => setIsDynamicQrModalOpen(false)}
        amount={
          paymentMethod === 4 && typeof splitDigital === 'number' && splitDigital > 0
            ? splitDigital
            : grandTotal
        }
        invoiceNumber="POS-BILL"
        onConfirmPayment={handleCheckout}
      />
    </div>
  );
};
