import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import LZString from 'lz-string';
import { usePersistedState } from '../../src/shared/hooks/usePersistedState';

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePersistedState', () => {
  describe('basic persistence', () => {
    it('returns initialValue when nothing is stored', () => {
      const { result } = renderHook(() => usePersistedState('test-key', 42));
      expect(result.current[0]).toBe(42);
    });

    it('supports initialValue as a factory function', () => {
      const factory = () => ({ count: 0 });
      const { result } = renderHook(() => usePersistedState('test-key', factory));
      expect(result.current[0]).toEqual({ count: 0 });
    });

    it('reads previously stored value from localStorage', () => {
      localStorage.setItem('test-key', JSON.stringify({ name: 'hello' }));
      const { result } = renderHook(() => usePersistedState('test-key', { name: 'default' }));
      expect(result.current[0]).toEqual({ name: 'hello' });
    });

    it('writes to localStorage on setValue', () => {
      const { result } = renderHook(() => usePersistedState('test-key', 0));
      act(() => {
        result.current[1](99);
      });
      expect(result.current[0]).toBe(99);
      expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(99);
    });

    it('supports updater function in setValue', () => {
      const { result } = renderHook(() => usePersistedState('test-key', 10));
      act(() => {
        result.current[1]((prev) => prev + 5);
      });
      expect(result.current[0]).toBe(15);
      expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(15);
    });

    it('handles null values correctly', () => {
      const { result } = renderHook(() => usePersistedState<string | null>('test-key', 'default'));
      act(() => {
        result.current[1](null);
      });
      expect(result.current[0]).toBeNull();
      expect(JSON.parse(localStorage.getItem('test-key')!)).toBeNull();
    });
  });

  describe('error handling', () => {
    it('falls back to initialValue on corrupted JSON', () => {
      localStorage.setItem('test-key', 'not-valid-json{{{');
      const { result } = renderHook(() => usePersistedState('test-key', 'fallback'));
      expect(result.current[0]).toBe('fallback');
    });

    it('handles localStorage.setItem failure gracefully', () => {
      const orig = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QuotaExceeded');
      };
      const { result } = renderHook(() => usePersistedState('test-key', 'ok'));
      // Should not throw
      act(() => {
        result.current[1]('new');
      });
      expect(result.current[0]).toBe('new');
      localStorage.setItem = orig;
    });
  });

  describe('LZString compression', () => {
    it('stores compressed data when compress=true', () => {
      const { result } = renderHook(() =>
        usePersistedState('c-key', { data: 'hello' }, { compress: true }),
      );
      act(() => {
        result.current[1]({ data: 'world' });
      });
      const raw = localStorage.getItem('c-key')!;
      // Raw value should NOT be valid JSON (it's compressed)
      expect(() => JSON.parse(raw)).toThrow();
      // But decompressing should yield the JSON
      const decompressed = LZString.decompress(raw)!;
      expect(JSON.parse(decompressed)).toEqual({ data: 'world' });
    });

    it('reads compressed data on init', () => {
      const compressed = LZString.compress(JSON.stringify({ x: 1 }));
      localStorage.setItem('c-key', compressed!);
      const { result } = renderHook(() => usePersistedState('c-key', { x: 0 }, { compress: true }));
      expect(result.current[0]).toEqual({ x: 1 });
    });

    it('falls back to initialValue if decompression fails', () => {
      localStorage.setItem('c-key', 'garbage');
      const { result } = renderHook(() =>
        usePersistedState('c-key', 'default', { compress: true }),
      );
      expect(result.current[0]).toBe('default');
    });
  });

  describe('debounced writes', () => {
    it('does not write to localStorage immediately', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => usePersistedState('d-key', 0, { debounceMs: 500 }));
      act(() => {
        result.current[1](1);
      });
      // State updates immediately
      expect(result.current[0]).toBe(1);
      // But localStorage is not yet written
      expect(localStorage.getItem('d-key')).toBeNull();

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(JSON.parse(localStorage.getItem('d-key')!)).toBe(1);
    });

    it('resets timer on rapid updates — only last value is persisted', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => usePersistedState('d-key', 0, { debounceMs: 300 }));
      act(() => {
        result.current[1](1);
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        result.current[1](2);
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        result.current[1](3);
      });
      // Nothing written yet
      expect(localStorage.getItem('d-key')).toBeNull();

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(JSON.parse(localStorage.getItem('d-key')!)).toBe(3);
    });

    it('flushes pending writes on unmount', () => {
      vi.useFakeTimers();
      const { result, unmount } = renderHook(() =>
        usePersistedState('d-key', 0, { debounceMs: 1000 }),
      );
      act(() => {
        result.current[1](42);
      });
      expect(localStorage.getItem('d-key')).toBeNull();
      unmount();
      expect(JSON.parse(localStorage.getItem('d-key')!)).toBe(42);
    });

    it('flushes null value on unmount (sentinel bug check)', () => {
      vi.useFakeTimers();
      const { result, unmount } = renderHook(() =>
        usePersistedState<number | null>('d-key', 10, { debounceMs: 1000 }),
      );
      act(() => {
        result.current[1](null);
      });
      unmount();
      expect(JSON.parse(localStorage.getItem('d-key')!)).toBeNull();
    });
  });

  describe('version migration', () => {
    it('wraps data with __version when version is set', () => {
      const { result } = renderHook(() => usePersistedState('v-key', 'init', { version: 1 }));
      act(() => {
        result.current[1]('v1data');
      });
      const stored = JSON.parse(localStorage.getItem('v-key')!);
      expect(stored).toEqual({ __version: 1, value: 'v1data' });
    });

    it('reads versioned data correctly', () => {
      localStorage.setItem('v-key', JSON.stringify({ __version: 2, value: 'hello' }));
      const { result } = renderHook(() => usePersistedState('v-key', 'default', { version: 2 }));
      expect(result.current[0]).toBe('hello');
    });

    it('falls back to initialValue when version mismatches', () => {
      localStorage.setItem('v-key', JSON.stringify({ __version: 1, value: 'old' }));
      const { result } = renderHook(() =>
        usePersistedState('v-key', 'new-default', { version: 2 }),
      );
      expect(result.current[0]).toBe('new-default');
    });

    it('treats legacy unversioned data as compatible (v0)', () => {
      localStorage.setItem('v-key', JSON.stringify({ name: 'legacy' }));
      const { result } = renderHook(() =>
        usePersistedState('v-key', { name: 'default' }, { version: 1 }),
      );
      // Legacy data has no __version — treated as v0 compatible, returned as-is
      expect(result.current[0]).toEqual({ name: 'legacy' });
    });
  });
});
