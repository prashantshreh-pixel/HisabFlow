'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, CalendarMode, TRANSLATIONS } from '@/lib/translations';
import { formatSmartDate } from '@/lib/bikramSambat';

interface SettingsContextType {
  language: Language;
  calendarMode: CalendarMode;
  setLanguage: (lang: Language) => void;
  setCalendarMode: (mode: CalendarMode) => void;
  toggleLanguage: () => void;
  toggleCalendarMode: () => void;
  formatDate: (dateInput: Date | string) => string;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [calendarMode, setCalendarModeState] = useState<CalendarMode>('BS');

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('hisabflow_lang') as Language;
      if (savedLang === 'en' || savedLang === 'np') {
        setLanguageState(savedLang);
      }
      const savedCal = localStorage.getItem('hisabflow_cal_mode') as CalendarMode;
      if (savedCal === 'AD' || savedCal === 'BS') {
        setCalendarModeState(savedCal);
      }
    } catch {}
  }, []);

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
        setLanguage,
        setCalendarMode,
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
