import { describe, it, expect, beforeEach } from 'vitest';
import { setLocale, getLocale, t, translations } from '../src/shared/i18n/index';

describe('shared/i18n', () => {
  beforeEach(() => {
    // Reset to default locale
    setLocale('pl');
  });

  describe('getLocale / setLocale', () => {
    it('defaults to pl', () => {
      expect(getLocale()).toBe('pl');
    });

    it('setLocale changes the current locale', () => {
      setLocale('en');
      expect(getLocale()).toBe('en');
    });

    it('can switch back and forth', () => {
      setLocale('en');
      expect(getLocale()).toBe('en');
      setLocale('pl');
      expect(getLocale()).toBe('pl');
    });
  });

  describe('t() translation lookup', () => {
    it('returns Polish translation by default', () => {
      expect(t('back')).toBe('Powrót');
      expect(t('error')).toBe('Błąd');
      expect(t('loading')).toBe('Ładowanie...');
    });

    it('returns English translation after setLocale("en")', () => {
      setLocale('en');
      expect(t('back')).toBe('Back');
      expect(t('error')).toBe('Error');
      expect(t('loading')).toBe('Loading...');
    });

    it('returns correct value for all keys in pl', () => {
      for (const [key, value] of Object.entries(translations.pl)) {
        expect(t(key as any)).toBe(value);
      }
    });

    it('returns correct value for all keys in en', () => {
      setLocale('en');
      for (const [key, value] of Object.entries(translations.en)) {
        expect(t(key as any)).toBe(value);
      }
    });
  });

  describe('translations object', () => {
    it('has pl and en locales', () => {
      expect(translations).toHaveProperty('pl');
      expect(translations).toHaveProperty('en');
    });

    it('pl and en have the same keys', () => {
      const plKeys = Object.keys(translations.pl).sort();
      const enKeys = Object.keys(translations.en).sort();
      expect(plKeys).toEqual(enKeys);
    });

    it('all translation values are non-empty strings', () => {
      for (const locale of ['pl', 'en'] as const) {
        for (const [key, value] of Object.entries(translations[locale])) {
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
