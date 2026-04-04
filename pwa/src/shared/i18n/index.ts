/**
 * Centralized i18n for PL/EN translations
 */

const translations = {
  pl: {
    back: 'Powrót',
    error: 'Błąd',
    loading: 'Ładowanie...',
    retry: 'Ponów',
    settings: 'Ustawienia',
    close: 'Zamknij',
    update: 'Aktualizuj',
    offline: 'Offline',
    online: 'Online',
  },
  en: {
    back: 'Back',
    error: 'Error',
    loading: 'Loading...',
    retry: 'Retry',
    settings: 'Settings',
    close: 'Close',
    update: 'Update',
    offline: 'Offline',
    online: 'Online',
  },
} as const;

type Locale = keyof typeof translations;
type TranslationKey = keyof typeof translations['pl'];

let currentLocale: Locale = 'pl';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: TranslationKey): string {
  return translations[currentLocale][key] ?? key;
}

export { translations };
