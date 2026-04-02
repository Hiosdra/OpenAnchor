import { useState, useEffect, useCallback } from 'react';
import type { Locale } from '../types';

export interface AppSettingsReturn {
  isNightMode: boolean;
  setIsNightMode: (v: boolean) => void;
  toggleNightMode: () => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => Promise<void>;
  userLocale: Locale;
  toggleLanguage: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function detectLocale(): Locale {
  const saved = localStorage.getItem('wachtownik_language');
  if (saved === 'en-US' || saved === 'pl-PL') return saved;
  const browserLocale =
    (navigator as { language?: string; userLanguage?: string }).language ||
    (navigator as { language?: string; userLanguage?: string }).userLanguage ||
    'pl-PL';
  if (browserLocale.startsWith('en')) return 'en-US';
  return 'pl-PL';
}

export function useAppSettings(): AppSettingsReturn {
  const [isNightMode, setIsNightMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [userLocale, setUserLocale] = useState<Locale>(detectLocale);
  const [activeTab, setActiveTab] = useState('setup');

  useEffect(() => {
    localStorage.setItem('wachtownik_language', userLocale);
  }, [userLocale]);

  useEffect(() => {
    if (isNightMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isNightMode]);

  const toggleNightMode = useCallback(() => {
    setIsNightMode((prev) => !prev);
  }, []);

  const toggleLanguage = useCallback(() => {
    setUserLocale((prev) => (prev === 'pl-PL' ? 'en-US' : 'pl-PL'));
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') setNotificationsEnabled(true);
        else alert('Musisz zezwolić na powiadomienia w przeglądarce.');
      }
    } else {
      setNotificationsEnabled(false);
    }
  }, [notificationsEnabled]);

  return {
    isNightMode,
    setIsNightMode,
    toggleNightMode,
    notificationsEnabled,
    toggleNotifications,
    userLocale,
    toggleLanguage,
    activeTab,
    setActiveTab,
  };
}
