/**
 * Unified localStorage utility for OpenAnchor PWA.
 * Provides a consistent API with JSON serialization, error handling, and optional key prefixing.
 *
 * Usage:
 *   const storage = new StorageUtils('mymodule');
 *   storage.set('key', { foo: 'bar' });
 *   const val = storage.get('key', { foo: 'default' });
 *   storage.remove('key');
 */

class StorageUtils {
  /**
   * @param {string} [prefix=''] - Optional key prefix for namespacing (e.g., 'exam', 'anchor')
   */
  constructor(prefix = '') {
    this._prefix = prefix ? prefix + '_' : '';
  }

  _key(key) {
    return this._prefix + key;
  }

  /**
   * Get a value from localStorage, parsed from JSON.
   * @param {string} key
   * @param {*} [defaultValue=null] - Returned if key doesn't exist or parsing fails
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(this._key(key));
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`StorageUtils: failed to read '${this._key(key)}'`, e);
      return defaultValue;
    }
  }

  /**
   * Set a value in localStorage, serialized to JSON.
   * @param {string} key
   * @param {*} value
   * @returns {boolean} true if successful
   */
  set(key, value) {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`StorageUtils: failed to write '${this._key(key)}'`, e);
      return false;
    }
  }

  /**
   * Remove a key from localStorage.
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(this._key(key));
    } catch (e) {
      console.warn(`StorageUtils: failed to remove '${this._key(key)}'`, e);
    }
  }

  /**
   * Check if a key exists in localStorage.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return localStorage.getItem(this._key(key)) !== null;
  }

  /**
   * Get all keys managed by this prefix.
   * @returns {string[]}
   */
  keys() {
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this._prefix)) {
        result.push(k.slice(this._prefix.length));
      }
    }
    return result;
  }

  /**
   * Clear all keys managed by this prefix.
   */
  clear() {
    this.keys().forEach(k => this.remove(k));
  }
}

// Export for ES modules and script tags
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageUtils };
}
