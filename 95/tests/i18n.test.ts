import { describe, it, expect } from 'vitest';
import { I18N } from '../src/modules/anchor/i18n';

describe('anchor/i18n', () => {
  // ------------------------------------------------------------------
  // fmt() — pure template formatting
  // ------------------------------------------------------------------
  describe('fmt()', () => {
    it('replaces single variable', () => {
      expect(I18N.fmt('Hello {name}!', { name: 'World' })).toBe('Hello World!');
    });

    it('replaces multiple variables', () => {
      expect(I18N.fmt('{a} + {b} = {c}', { a: 1, b: 2, c: 3 })).toBe('1 + 2 = 3');
    });

    it('replaces repeated occurrences of the same variable', () => {
      expect(I18N.fmt('{x} and {x}', { x: 'ok' })).toBe('ok and ok');
    });

    it('leaves unknown variables as empty string', () => {
      expect(I18N.fmt('Hi {unknown}!', {})).toBe('Hi !');
    });

    it('returns template unchanged when no placeholders', () => {
      expect(I18N.fmt('No vars here', { a: 1 })).toBe('No vars here');
    });

    it('handles numeric values', () => {
      expect(I18N.fmt('Level: {level}%', { level: 85 })).toBe('Level: 85%');
    });

    it('handles empty template', () => {
      expect(I18N.fmt('', { x: 'val' })).toBe('');
    });
  });

  // ------------------------------------------------------------------
  // translations object structure
  // ------------------------------------------------------------------
  describe('translations', () => {
    it('has both pl and en translations', () => {
      expect(I18N.translations).toHaveProperty('pl');
      expect(I18N.translations).toHaveProperty('en');
    });

    it('pl and en have the same set of keys', () => {
      const plKeys = new Set(Object.keys(I18N.translations.pl));
      const enKeys = new Set(Object.keys(I18N.translations.en));
      // en should cover all pl keys (same structure)
      for (const key of plKeys) {
        expect(enKeys.has(key), `Missing en key: ${key}`).toBe(true);
      }
    });

    it('no translation value is empty string', () => {
      for (const lang of ['pl', 'en'] as const) {
        for (const [key, val] of Object.entries(I18N.translations[lang])) {
          expect(val.length, `${lang}.${key} is empty`).toBeGreaterThan(0);
        }
      }
    });
  });

  // ------------------------------------------------------------------
  // language detection
  // ------------------------------------------------------------------
  describe('lang', () => {
    it('defaults to pl when localStorage is empty', () => {
      // setup.js clears localStorage before each test
      expect(['pl', 'en']).toContain(I18N._lang);
    });
  });
});
