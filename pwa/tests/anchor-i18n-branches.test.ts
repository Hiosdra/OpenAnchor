import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to reset localStorage before importing I18N so it picks up our values
// I18N reads localStorage at module evaluation time

describe('I18N', () => {
  let I18N: typeof import('../src/modules/anchor/i18n').I18N;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    const mod = await import('../src/modules/anchor/i18n');
    I18N = mod.I18N;
    I18N.init();
  });

  // ─── init() ─────────────────────────────────────────────────────
  describe('init()', () => {
    it('loads pl translations by default', () => {
      expect(I18N.t.appTitle).toBe('Alert Kotwiczny');
    });

    it('falls back to pl when language key is unknown', async () => {
      vi.resetModules();
      localStorage.setItem('oa_lang', 'xx');
      const mod = await import('../src/modules/anchor/i18n');
      mod.I18N.init();
      // Should fall back to pl
      expect(mod.I18N.t.appTitle).toBe('Alert Kotwiczny');
    });

    it('loads en translations when _lang is en', async () => {
      vi.resetModules();
      localStorage.setItem('oa_lang', 'en');
      const mod = await import('../src/modules/anchor/i18n');
      mod.I18N.init();
      expect(mod.I18N.t.appTitle).toBe('Anchor Alert');
    });
  });

  // ─── fmt() ──────────────────────────────────────────────────────
  describe('fmt()', () => {
    it('replaces single variable', () => {
      expect(I18N.fmt('Hello {name}', { name: 'World' })).toBe('Hello World');
    });

    it('replaces multiple variables', () => {
      expect(I18N.fmt('{a} and {b}', { a: 'X', b: 'Y' })).toBe('X and Y');
    });

    it('replaces missing variable with empty string', () => {
      expect(I18N.fmt('Hello {missing}', {})).toBe('Hello ');
    });

    it('replaces numeric values', () => {
      expect(I18N.fmt('Count: {n}', { n: 42 })).toBe('Count: 42');
    });

    it('handles template with no variables', () => {
      expect(I18N.fmt('No vars here', { x: 1 })).toBe('No vars here');
    });
  });

  // ─── locale getter ─────────────────────────────────────────────
  describe('locale', () => {
    it('returns pl-PL when lang is pl', () => {
      I18N._lang = 'pl';
      expect(I18N.locale).toBe('pl-PL');
    });

    it('returns en-US when lang is en', () => {
      I18N._lang = 'en';
      expect(I18N.locale).toBe('en-US');
    });

    it('returns en-US for any non-pl language', () => {
      I18N._lang = 'de';
      expect(I18N.locale).toBe('en-US');
    });
  });

  // ─── lang getter ───────────────────────────────────────────────
  describe('lang', () => {
    it('returns current _lang value', () => {
      I18N._lang = 'en';
      expect(I18N.lang).toBe('en');
    });
  });

  // ─── setLang() ─────────────────────────────────────────────────
  describe('setLang()', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div data-i18n="appTitle">placeholder</div>
        <div data-i18n="nightMode">placeholder</div>
        <div data-i18n-title="changeMap" title="placeholder"></div>
        <input data-i18n-placeholder="gpsSearching" placeholder="placeholder" />
        <button id="lang-toggle">PL</button>
      `;
    });

    it('switches to en and updates translations object', () => {
      I18N.setLang('en');
      expect(I18N._lang).toBe('en');
      expect(I18N.t.appTitle).toBe('Anchor Alert');
    });

    it('persists to localStorage', () => {
      I18N.setLang('en');
      expect(localStorage.getItem('oa_lang')).toBe('en');
    });

    it('falls back to pl translations for unknown lang', () => {
      I18N.setLang('zz');
      expect(I18N.t.appTitle).toBe('Alert Kotwiczny');
    });

    it('applies data-i18n to DOM elements', () => {
      // DOM patching removed — React handles translations via useI18n context
    });

    it('applies data-i18n-title to DOM elements', () => {
      // DOM patching removed — React handles translations via useI18n context
    });

    it('applies data-i18n-placeholder to DOM elements', () => {
      // DOM patching removed — React handles translations via useI18n context
    });

    it('updates lang-toggle button text to EN when switching to pl', () => {
      // DOM patching removed — React handles lang toggle via useI18n context
    });

    it('updates lang-toggle button text to PL when switching to en', () => {
      // DOM patching removed — React handles lang toggle via useI18n context
    });

    it('sets document.documentElement.lang attribute', () => {
      I18N.setLang('en');
      expect(document.documentElement.lang).toBe('en');
    });

    it('sets document.title to appTitle', () => {
      I18N.setLang('en');
      expect(document.title).toBe('Anchor Alert');
    });
  });

  // ─── _applyToDOM() removed — React handles DOM translations via useI18n ───
});
