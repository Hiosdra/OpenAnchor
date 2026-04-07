/**
 * Unified locale detection and storage.
 *
 * Reads/writes both the anchor key (`oa_lang`) and the wachtownik key
 * (`wachtownik_language`) so existing modules keep working until migrated.
 */

/** Primary key — used by the anchor module */
const ANCHOR_LOCALE_KEY = 'oa_lang';

/** Secondary key — used by the wachtownik module (format: 'pl-PL' / 'en-US') */
const WACHTOWNIK_LOCALE_KEY = 'wachtownik_language';

const SUPPORTED_SHORT = ['pl', 'en'] as const;
type SupportedShort = (typeof SUPPORTED_SHORT)[number];

/** Map between short locale codes and wachtownik-style full codes */
const FULL_LOCALE: Record<SupportedShort, string> = {
  pl: 'pl-PL',
  en: 'en-US',
};

function isSupportedShort(v: string): v is SupportedShort {
  return (SUPPORTED_SHORT as readonly string[]).includes(v);
}

function normalizeToShort(raw: string): SupportedShort | null {
  if (isSupportedShort(raw)) return raw;
  const prefix = raw.split('-')[0].toLowerCase();
  if (isSupportedShort(prefix)) return prefix;
  return null;
}

/**
 * Read the stored locale from localStorage.
 * Checks the primary key first, then the wachtownik key.
 * Returns `null` if nothing is stored.
 */
export function getStoredLocale(): string | null {
  try {
    const primary = localStorage.getItem(ANCHOR_LOCALE_KEY);
    if (primary) {
      const norm = normalizeToShort(primary);
      if (norm) return norm;
    }

    const secondary = localStorage.getItem(WACHTOWNIK_LOCALE_KEY);
    if (secondary) {
      const norm = normalizeToShort(secondary);
      if (norm) return norm;
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

/**
 * Persist locale to localStorage.
 * Writes both keys so anchor and wachtownik stay in sync.
 */
export function setStoredLocale(locale: string): void {
  const short = normalizeToShort(locale) ?? 'pl';
  try {
    localStorage.setItem(ANCHOR_LOCALE_KEY, short);
    localStorage.setItem(WACHTOWNIK_LOCALE_KEY, FULL_LOCALE[short]);
  } catch {
    // silently fail
  }
}

/**
 * Detect the user's locale.
 * Priority: localStorage → browser language → default ('pl').
 */
export function detectLocale(): string {
  const stored = getStoredLocale();
  if (stored) return stored;

  try {
    const browserLang =
      (navigator as { language?: string; userLanguage?: string }).language ||
      (navigator as { language?: string; userLanguage?: string }).userLanguage ||
      '';
    const norm = normalizeToShort(browserLang);
    if (norm) return norm;
  } catch {
    // navigator unavailable
  }

  return 'pl';
}
