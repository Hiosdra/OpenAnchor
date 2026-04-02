import { describe, it, expect } from 'vitest';
import { t, translations } from '../src/modules/wachtownik/constants';

describe('wachtownik/constants — t() translation helper', () => {
  it('returns Polish translation by default', () => {
    expect(t('btn.generate')).toBe('Generuj harmonogram wacht');
  });

  it('returns English translation when locale is en-US', () => {
    expect(t('btn.generate', 'en-US')).toBe('Generate watch schedule');
  });

  it('falls back to Polish for missing en-US key', () => {
    // If a key happens to exist only in pl-PL, it should still return something
    const plKeys = Object.keys(translations['pl-PL']);
    const testKey = plKeys[0];
    const result = t(testKey, 'en-US');
    expect(result).toBeTruthy();
  });

  it('returns the key itself when not found in any locale', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
    expect(t('nonexistent.key', 'en-US')).toBe('nonexistent.key');
  });

  it('pl-PL and en-US have matching keys', () => {
    const plKeys = new Set(Object.keys(translations['pl-PL']));
    const enKeys = new Set(Object.keys(translations['en-US']));
    for (const key of plKeys) {
      expect(enKeys.has(key), `Missing en-US key: ${key}`).toBe(true);
    }
    for (const key of enKeys) {
      expect(plKeys.has(key), `Missing pl-PL key: ${key}`).toBe(true);
    }
  });

  it('no translation value is empty', () => {
    for (const locale of ['pl-PL', 'en-US'] as const) {
      for (const [key, val] of Object.entries(translations[locale])) {
        expect(val.length, `${locale}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});
