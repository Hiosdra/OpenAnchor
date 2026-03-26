import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageUtils } from '../js/storage-utils.js';

// The setup.js mock lacks length/key() needed by StorageUtils.keys().
// Provide a full localStorage mock for these tests.
function createLocalStorageMock() {
  const store = {};
  return {
    _store: store,
    getItem(key) { return key in store ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key(i) { return Object.keys(store)[i] ?? null; },
  };
}

describe('StorageUtils', () => {
  let storage;

  beforeEach(() => {
    global.localStorage = createLocalStorageMock();
    storage = new StorageUtils('test');
  });

  describe('constructor', () => {
    it('should add underscore separator to prefix', () => {
      const s = new StorageUtils('ns');
      s.set('k', 1);
      expect(localStorage.getItem('ns_k')).toBe('1');
    });

    it('should use empty prefix when none provided', () => {
      const s = new StorageUtils();
      s.set('k', 1);
      expect(localStorage.getItem('k')).toBe('1');
    });

    it('should use empty prefix for empty string', () => {
      const s = new StorageUtils('');
      s.set('k', 1);
      expect(localStorage.getItem('k')).toBe('1');
    });
  });

  describe('get', () => {
    it('should return parsed JSON value', () => {
      localStorage.setItem('test_color', JSON.stringify('blue'));
      expect(storage.get('color')).toBe('blue');
    });

    it('should return objects', () => {
      localStorage.setItem('test_obj', JSON.stringify({ a: 1 }));
      expect(storage.get('obj')).toEqual({ a: 1 });
    });

    it('should return defaultValue when key is missing', () => {
      expect(storage.get('missing', 'fallback')).toBe('fallback');
    });

    it('should return null when key is missing and no default given', () => {
      expect(storage.get('missing')).toBeNull();
    });

    it('should return defaultValue on JSON parse error', () => {
      localStorage.setItem('test_bad', '{invalid');
      expect(storage.get('bad', 42)).toBe(42);
    });

    it('should warn on JSON parse error', () => {
      localStorage.setItem('test_bad', '{invalid');
      storage.get('bad');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should store JSON-serialized value', () => {
      storage.set('arr', [1, 2]);
      expect(localStorage.getItem('test_arr')).toBe('[1,2]');
    });

    it('should return true on success', () => {
      expect(storage.set('k', 'v')).toBe(true);
    });

    it('should return false when localStorage throws', () => {
      localStorage.setItem = () => { throw new Error('quota'); };
      expect(storage.set('k', 'v')).toBe(false);
    });

    it('should warn when localStorage throws', () => {
      localStorage.setItem = () => { throw new Error('quota'); };
      storage.set('k', 'v');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a key', () => {
      storage.set('k', 'v');
      storage.remove('k');
      expect(localStorage.getItem('test_k')).toBeNull();
    });

    it('should handle removeItem errors gracefully', () => {
      localStorage.removeItem = () => { throw new Error('err'); };
      expect(() => storage.remove('k')).not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('should return true when key exists', () => {
      storage.set('k', 'v');
      expect(storage.has('k')).toBe(true);
    });

    it('should return false when key does not exist', () => {
      expect(storage.has('nope')).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return keys matching the prefix', () => {
      storage.set('a', 1);
      storage.set('b', 2);
      expect(storage.keys().sort()).toEqual(['a', 'b']);
    });

    it('should not include keys from other prefixes', () => {
      storage.set('mine', 1);
      localStorage.setItem('other_x', '1');
      expect(storage.keys()).toEqual(['mine']);
    });

    it('should return empty array when no keys match', () => {
      localStorage.setItem('other_x', '1');
      expect(storage.keys()).toEqual([]);
    });

    it('should strip prefix from returned keys', () => {
      storage.set('mykey', 'v');
      expect(storage.keys()).toEqual(['mykey']);
    });
  });

  describe('clear', () => {
    it('should remove all keys with matching prefix', () => {
      storage.set('a', 1);
      storage.set('b', 2);
      storage.clear();
      expect(storage.keys()).toEqual([]);
    });

    it('should not remove keys from other prefixes', () => {
      storage.set('a', 1);
      localStorage.setItem('other_x', 'v');
      storage.clear();
      expect(localStorage.getItem('other_x')).toBe('v');
    });
  });
});
