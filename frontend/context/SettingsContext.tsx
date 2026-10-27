'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, CalendarMode, TRANSLATIONS } from '@/lib/translations';
import { formatSmartDate } from '@/lib/bikramSambat';
import { StoreProfile, DEFAULT_STORE_PROFILE } from '@/types';

interface SettingsContextType {
  language: Language;
  calendarMode: CalendarMode;
  storeProfile: StoreProfile;
  setLanguage: (lang: Language) => void;
  setCalendarMode: (mode: CalendarMode) => void;
  updateStoreProfile: (profile: Partial<StoreProfile>) => void;
  toggleLanguage: () => void;
  toggleCalendarMode: () => void;
  formatDate: (dateInput: Date | string) => string;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;
}

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem('hisabflow_lang') as Language;
    if (saved === 'en' || saved === 'np') return saved;
  } catch {}
  return 'en';
};

const getInitialCalendarMode = (): CalendarMode => {
  if (typeof window === 'undefined') return 'BS';
  try {
    const saved = localStorage.getItem('hisabflow_cal_mode') as CalendarMode;
    if (saved === 'AD' || saved === 'BS') return saved;
  } catch {}
  return 'BS';
};

const getInitialStoreProfile = (): StoreProfile => {
  if (typeof window === 'undefined') return DEFAULT_STORE_PROFILE;
  try {
    const saved = localStorage.getItem('hisabflow_store_profile');
    if (saved) {
      const p = JSON.parse(saved);
      // Migrate legacy demo accounts to the new Fonepay Anjali Store configuration
      if (p.qrAccountNumber === '0215752768506001' || p.qrAccountName === 'SADIKSHYA DAHAL' || !p.qrFormat || p.qrFormat === 'MOBANK_JSON') {
        localStorage.removeItem('hisabflow_store_profile');
        return DEFAULT_STORE_PROFILE;
      }
      return {
        storeName: p.storeName || DEFAULT_STORE_PROFILE.storeName,
        tagline: p.tagline !== undefined ? p.tagline : DEFAULT_STORE_PROFILE.tagline,
        ownerName: p.ownerName || DEFAULT_STORE_PROFILE.ownerName,
        phone: p.phone !== undefined ? p.phone : DEFAULT_STORE_PROFILE.phone,
        address: p.address || DEFAULT_STORE_PROFILE.address,
        panNumber: p.panNumber || '',
        currencySymbol: p.currencySymbol || DEFAULT_STORE_PROFILE.currencySymbol,
        defaultCreditLimit: p.defaultCreditLimit || DEFAULT_STORE_PROFILE.defaultCreditLimit,
        receiptFooter: p.receiptFooter || DEFAULT_STORE_PROFILE.receiptFooter,
        updatedAt: p.updatedAt,
        qrAccountName: p.qrAccountName || DEFAULT_STORE_PROFILE.qrAccountName,
        qrAccountNumber: p.qrAccountNumber || DEFAULT_STORE_PROFILE.qrAccountNumber,
        qrBankName: p.qrBankName || DEFAULT_STORE_PROFILE.qrBankName,
        qrBankCode: p.qrBankCode || DEFAULT_STORE_PROFILE.qrBankCode,
        qrBankCodeCIPS: p.qrBankCodeCIPS || DEFAULT_STORE_PROFILE.qrBankCodeCIPS,
        qrFormat: p.qrFormat || DEFAULT_STORE_PROFILE.qrFormat,
        qrMerchantId: p.qrMerchantId || DEFAULT_STORE_PROFILE.qrMerchantId,
        qrAcquirerId: p.qrAcquirerId || DEFAULT_STORE_PROFILE.qrAcquirerId,
        qrTerminalLabel: p.qrTerminalLabel || DEFAULT_STORE_PROFILE.qrTerminalLabel,
        qrCity: p.qrCity || DEFAULT_STORE_PROFILE.qrCity,
      };
    }
  } catch {}
  return DEFAULT_STORE_PROFILE;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [calendarMode, setCalendarModeState] = useState<CalendarMode>(getInitialCalendarMode);
  const [storeProfile, setStoreProfileState] = useState<StoreProfile>(getInitialStoreProfile);

  const loadSavedProfile = useCallback(() => {
    try {
      const saved = localStorage.getItem('hisabflow_store_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.qrAccountNumber === '0215752768506001' || p.qrAccountName === 'SADIKSHYA DAHAL' || !p.qrFormat || p.qrFormat === 'MOBANK_JSON') {
          localStorage.removeItem('hisabflow_store_profile');
          setStoreProfileState(DEFAULT_STORE_PROFILE);
          return;
        }
        setStoreProfileState({
          storeName: p.storeName || DEFAULT_STORE_PROFILE.storeName,
          tagline: p.tagline !== undefined ? p.tagline : DEFAULT_STORE_PROFILE.tagline,
          ownerName: p.ownerName || DEFAULT_STORE_PROFILE.ownerName,
          phone: p.phone !== undefined ? p.phone : DEFAULT_STORE_PROFILE.phone,
          address: p.address || DEFAULT_STORE_PROFILE.address,
          panNumber: p.panNumber || '',
          currencySymbol: p.currencySymbol || DEFAULT_STORE_PROFILE.currencySymbol,
          defaultCreditLimit: p.defaultCreditLimit || DEFAULT_STORE_PROFILE.defaultCreditLimit,
          receiptFooter: p.receiptFooter || DEFAULT_STORE_PROFILE.receiptFooter,
          updatedAt: p.updatedAt,
          qrAccountName: p.qrAccountName || DEFAULT_STORE_PROFILE.qrAccountName,
          qrAccountNumber: p.qrAccountNumber || DEFAULT_STORE_PROFILE.qrAccountNumber,
          qrBankName: p.qrBankName || DEFAULT_STORE_PROFILE.qrBankName,
          qrBankCode: p.qrBankCode || DEFAULT_STORE_PROFILE.qrBankCode,
          qrBankCodeCIPS: p.qrBankCodeCIPS || DEFAULT_STORE_PROFILE.qrBankCodeCIPS,
          qrFormat: p.qrFormat || DEFAULT_STORE_PROFILE.qrFormat,
          qrMerchantId: p.qrMerchantId || DEFAULT_STORE_PROFILE.qrMerchantId,
          qrAcquirerId: p.qrAcquirerId || DEFAULT_STORE_PROFILE.qrAcquirerId,
          qrTerminalLabel: p.qrTerminalLabel || DEFAULT_STORE_PROFILE.qrTerminalLabel,
          qrCity: p.qrCity || DEFAULT_STORE_PROFILE.qrCity,
        });
      }
    } catch (e) {
      console.error('Error loading store profile:', e);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hisabflow_lang' && (e.newValue === 'en' || e.newValue === 'np')) {
        setLanguageState(e.newValue as Language);
      } else if (e.key === 'hisabflow_cal_mode' && (e.newValue === 'AD' || e.newValue === 'BS')) {
        setCalendarModeState(e.newValue as CalendarMode);
      } else if (!e.key || e.key === 'hisabflow_store_profile') {
        loadSavedProfile();
      }
    };

    const handleProfileCustomEvent = () => {
      loadSavedProfile();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hisabflow_store_profile_updated', handleProfileCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hisabflow_store_profile_updated', handleProfileCustomEvent);
    };
  }, [loadSavedProfile]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('hisabflow_lang', lang);
    } catch {}
  }, []);

  const setCalendarMode = useCallback((mode: CalendarMode) => {
    setCalendarModeState(mode);
    try {
      localStorage.setItem('hisabflow_cal_mode', mode);
    } catch {}
  }, []);

  const updateStoreProfile = useCallback((updates: Partial<StoreProfile>) => {
    setStoreProfileState((prev) => {
      const updated: StoreProfile = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem('hisabflow_store_profile', JSON.stringify(updated));
        window.dispatchEvent(new Event('hisabflow_store_profile_updated'));
      } catch (e) {
        console.error('Error saving store profile:', e);
      }
      return updated;
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'np' : 'en');
  }, [language, setLanguage]);

  const toggleCalendarMode = useCallback(() => {
    setCalendarMode(calendarMode === 'AD' ? 'BS' : 'AD');
  }, [calendarMode, setCalendarMode]);

  const formatDate = useCallback(
    (dateInput: Date | string) => {
      return formatSmartDate(dateInput, calendarMode === 'BS', language === 'np');
    },
    [calendarMode, language]
  );

  const t = useCallback(
    (key: keyof typeof TRANSLATIONS['en']): string => {
      const translationMap = TRANSLATIONS[language] || TRANSLATIONS.en;
      return translationMap[key] || TRANSLATIONS.en[key] || String(key);
    },
    [language]
  );

  return (
    <SettingsContext.Provider
      value={{
        language,
        calendarMode,
        storeProfile,
        setLanguage,
        setCalendarMode,
        updateStoreProfile,
        toggleLanguage,
        toggleCalendarMode,
        formatDate,
        t,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
