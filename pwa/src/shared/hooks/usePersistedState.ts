import { useState, useCallback, useRef, useEffect } from 'react';
import LZString from 'lz-string';

export interface UsePersistedStateOptions {
  /** Enable LZString compression (wachtownik compatibility) */
  compress?: boolean;
  /** Debounce writes to localStorage by this many ms (0 = immediate) */
  debounceMs?: number;
  /** Schema version — when set, stored data is wrapped as { __version, value } */
  version?: number;
}

const PENDING_SENTINEL = Symbol('pending');

function resolveInitial<T>(initialValue: T | (() => T)): T {
  return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
}

function readFromStorage<T>(
  key: string,
  initialValue: T | (() => T),
  compress: boolean,
  version: number | undefined,
): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return resolveInitial(initialValue);

    let json: string;
    if (compress) {
      const decompressed = LZString.decompress(raw);
      if (decompressed === null) return resolveInitial(initialValue);
      json = decompressed;
    } else {
      json = raw;
    }

    const data = JSON.parse(json);

    if (version !== undefined) {
      // Versioned: expect { __version, value } wrapper
      if (data && typeof data === 'object' && '__version' in data) {
        if (data.__version === version) return data.value as T;
        // Version mismatch — treat as stale, fall back to initial
        return resolveInitial(initialValue);
      }
      // Legacy unversioned data — treat as v0 compatible, return as-is
      return data as T;
    }

    return data as T;
  } catch {
    return resolveInitial(initialValue);
  }
}

function writeToStorage<T>(
  key: string,
  value: T,
  compress: boolean,
  version: number | undefined,
): void {
  try {
    const toStore = version !== undefined ? { __version: version, value } : value;
    const json = JSON.stringify(toStore);
    localStorage.setItem(key, compress ? (LZString.compress(json) ?? json) : json);
  } catch {
    // quota exceeded or serialization error — silently fail
  }
}

/**
 * React hook for persisted state with optional compression, debounce, and versioning.
 *
 * Covers patterns used by anchor, wachtownik, egzamin, and zeglowanie modules.
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T | (() => T),
  options: UsePersistedStateOptions = {},
): [T, (value: T | ((prev: T) => T)) => void] {
  const { compress = false, debounceMs = 0, version } = options;

  const [state, setState] = useState<T>(() =>
    readFromStorage(key, initialValue, compress, version),
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use a sentinel symbol to distinguish "no pending value" from "pending value is null/undefined"
  const pendingRef = useRef<T | typeof PENDING_SENTINEL>(PENDING_SENTINEL);

  const writeToDisk = useCallback(
    (value: T) => writeToStorage(key, value, compress, version),
    [key, compress, version],
  );

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;

        if (debounceMs > 0) {
          pendingRef.current = next;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            writeToDisk(next);
            pendingRef.current = PENDING_SENTINEL;
          }, debounceMs);
        } else {
          writeToDisk(next);
        }

        return next;
      });
    },
    [debounceMs, writeToDisk],
  );

  // Flush pending writes on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (pendingRef.current !== PENDING_SENTINEL) {
        writeToDisk(pendingRef.current as T);
      }
    };
  }, [writeToDisk]);

  return [state, setValue];
}
