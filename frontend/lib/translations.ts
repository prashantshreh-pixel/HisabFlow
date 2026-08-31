export type Language = 'en' | 'np';
export type CalendarMode = 'AD' | 'BS';

export const TRANSLATIONS = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    pos: 'POS Billing',
    khata: 'Customer Khata',
    products: 'Products & Stock',
    expenses: 'Expenses',
    suppliers: 'Wholesalers',
    reports: 'Profit & Loss',
    settings: 'Settings',

    // Headers & Stats
    totalUdhaar: 'Total Outstanding Khata (Udhaar)',
    todayNetFlow: 'Today Net Cash Flow',
    lowStockAlerts: 'Low Stock Alerts',
    activeDebtors: 'Active Customers with Dues',
    todaysSales: "Today's Sales",
    totalExpenses: 'Total Expenses',

    // Buttons & Actions
    recordTransaction: 'Record Transaction',
    addCustomer: 'Add Customer',
    addProduct: 'Add Product',
    addExpense: 'Add Expense',
    addSupplier: 'Add Supplier',
    print: 'Print',
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    viewStatement: 'Statement',
    checkout: 'Complete Sale',
    clear: 'Clear',

    // Mode Toggle
    languageToggle: 'नेपाली',
    calendarToggleAD: 'A.D.',
    calendarToggleBS: 'B.S. (वि.सं.)',
  },
  np: {
    // Navigation
    dashboard: 'ड्यासबोर्ड',
    pos: 'पीओएस बिलिङ',
    khata: 'ग्राहक खाता',
    products: 'सामान तथा मौज्दात',
    expenses: 'खर्च विवरण',
    suppliers: 'थोक बिक्रेता',
    reports: 'नाफा नोक्सान',
    settings: 'सेटिङ्स',

    // Headers & Stats
    totalUdhaar: 'कुल बाँकी उदारो (खाता)',
    todayNetFlow: 'आजको खुद नगद प्रवाह',
    lowStockAlerts: 'कम मौज्दात (स्टक) चेतावनी',
    activeDebtors: 'बाँकी रकम तिर्नुपर्ने ग्राहक',
    todaysSales: 'आजको कुल बिक्री',
    totalExpenses: 'कुल खर्च',

    // Buttons & Actions
    recordTransaction: 'लेनदेन प्रविष्टि',
    addCustomer: 'नयाँ ग्राहक',
    addProduct: 'सामान थप्नुहोस्',
    addExpense: 'खर्च प्रविष्टि',
    addSupplier: 'थोक बिक्रेता थप्नुहोस्',
    print: 'प्रिन्ट',
    whatsapp: 'व्हाट्सएप',
    sms: 'एसएमएस',
    viewStatement: 'खाता विवरण',
    checkout: 'बिक्री सम्पन्न',
    clear: 'रद्द',

    // Mode Toggle
    languageToggle: 'English',
    calendarToggleAD: 'सन् (A.D.)',
    calendarToggleBS: 'वि.सं. (B.S.)',
  },
};
