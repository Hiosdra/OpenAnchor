import { describe, it, expect, beforeEach } from 'vitest';
import { detectLocale, getStoredLocale, setStoredLocale } from '../../src/shared/i18n/locale';

beforeEach(() => {
  localStorage.clear();
});

describe('locale utilities', () => {
  describe('getStoredLocale', () => {
    it('returns null when nothing is stored', () => {
      expect(getStoredLocale()).toBeNull();
    });

    it('reads from primary key (oa_lang)', () => {
      localStorage.setItem('oa_lang', 'en');
      expect(getStoredLocale()).toBe('en');
    });

    it('reads from wachtownik key when primary is absent', () => {
      localStorage.setItem('wachtownik_language', 'en-US');
      expect(getStoredLocale()).toBe('en');
    });

    it('normalizes pl-PL to pl', () => {
      localStorage.setItem('oa_lang', 'pl-PL');
      expect(getStoredLocale()).toBe('pl');
    });

    it('prefers primary key over wachtownik key', () => {
      localStorage.setItem('oa_lang', 'en');
      localStorage.setItem('wachtownik_language', 'pl-PL');
      expect(getStoredLocale()).toBe('en');
    });

    it('returns null for unsupported locales', () => {
      localStorage.setItem('oa_lang', 'de');
      expect(getStoredLocale()).toBeNull();
    });
  });

  describe('setStoredLocale', () => {
    it('writes to both anchor and wachtownik keys', () => {
      setStoredLocale('en');
      expect(localStorage.getItem('oa_lang')).toBe('en');
      expect(localStorage.getItem('wachtownik_language')).toBe('en-US');
    });

    it('normalizes full locale to short form for anchor key', () => {
      setStoredLocale('pl-PL');
      expect(localStorage.getItem('oa_lang')).toBe('pl');
      expect(localStorage.getItem('wachtownik_language')).toBe('pl-PL');
    });

    it('defaults to pl for unrecognized locale', () => {
      setStoredLocale('zz');
      expect(localStorage.getItem('oa_lang')).toBe('pl');
      expect(localStorage.getItem('wachtownik_language')).toBe('pl-PL');
    });
  });

  describe('detectLocale', () => {
    it('returns stored locale when available', () => {
      localStorage.setItem('oa_lang', 'en');
      expect(detectLocale()).toBe('en');
    });

    it('falls back to wachtownik key', () => {
      localStorage.setItem('wachtownik_language', 'en-US');
      expect(detectLocale()).toBe('en');
    });

    it('falls back to browser language', () => {
      const origLang = navigator.language;
      Object.defineProperty(navigator, 'language', { value: 'en-GB', configurable: true });
      expect(detectLocale()).toBe('en');
      Object.defineProperty(navigator, 'language', { value: origLang, configurable: true });
    });

    it('defaults to pl when browser language is unsupported', () => {
      const origLang = navigator.language;
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      expect(detectLocale()).toBe('pl');
      Object.defineProperty(navigator, 'language', { value: origLang, configurable: true });
    });

    it('defaults to pl when no signals are available', () => {
      const origLang = navigator.language;
      Object.defineProperty(navigator, 'language', { value: '', configurable: true });
      expect(detectLocale()).toBe('pl');
      Object.defineProperty(navigator, 'language', { value: origLang, configurable: true });
    });
  });
});
