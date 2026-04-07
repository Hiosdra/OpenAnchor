import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { I18nProvider, useI18n } from '../src/modules/anchor/hooks/useI18n';
import { I18N } from '../src/modules/anchor/i18n';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // Reset I18N to default state
  I18N.setLang('pl');
});

function wrapper({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, children);
}

// ---------------------------------------------------------------------------
// Provider renders
// ---------------------------------------------------------------------------
describe('I18nProvider', () => {
  it('renders children without crashing', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current).toBeDefined();
  });

  it('provides a translation object with expected keys', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.t).toBeDefined();
    expect(typeof result.current.t.appTitle).toBe('string');
    expect(typeof result.current.t.dropAnchor).toBe('string');
    expect(typeof result.current.t.raiseAnchor).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Language state
// ---------------------------------------------------------------------------
describe('useI18n — language', () => {
  it('default lang is pl', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.lang).toBe('pl');
  });

  it('setLang switches to English and re-renders with new translations', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    act(() => {
      result.current.setLang('en');
    });

    expect(result.current.lang).toBe('en');
    expect(result.current.t.appTitle).toBe('Anchor Alert');
  });

  it('setLang switches back to Polish', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    act(() => { result.current.setLang('en'); });
    act(() => { result.current.setLang('pl'); });

    expect(result.current.lang).toBe('pl');
    expect(result.current.t.appTitle).toBe('Alert Kotwiczny');
  });

  it('setLang persists to localStorage', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    act(() => {
      result.current.setLang('en');
    });

    expect(localStorage.getItem('oa_lang')).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// Locale
// ---------------------------------------------------------------------------
describe('useI18n — locale', () => {
  it('returns pl-PL locale for Polish', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.locale).toBe('pl-PL');
  });

  it('returns en-US locale for English', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    act(() => {
      result.current.setLang('en');
    });

    expect(result.current.locale).toBe('en-US');
  });
});

// ---------------------------------------------------------------------------
// fmt
// ---------------------------------------------------------------------------
describe('useI18n — fmt', () => {
  it('formats template strings with variables', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    const output = result.current.fmt('Hello {name}!', { name: 'World' });
    expect(output).toBe('Hello World!');
  });

  it('handles numeric values in templates', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    const output = result.current.fmt('Level: {level}%', { level: 85 });
    expect(output).toBe('Level: 85%');
  });
});

// ---------------------------------------------------------------------------
// Default language from localStorage
// ---------------------------------------------------------------------------
describe('useI18n — localStorage init', () => {
  it('loads language from localStorage on init', () => {
    localStorage.setItem('oa_lang', 'en');
    I18N.setLang('en');

    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.lang).toBe('en');
    expect(result.current.t.appTitle).toBe('Anchor Alert');
  });
});
