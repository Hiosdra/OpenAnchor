/**
 * Typed localStorage wrapper for OpenAnchor PWA.
 * Provides a consistent API with JSON serialization, error handling, and optional key prefixing.
 *
 * Migrated from js/storage-utils.js
 */

export class StorageUtils {
  private _prefix: string;

  constructor(prefix: string = '') {
    this._prefix = prefix ? prefix + '_' : '';
  }

  private _key(key: string): string {
    return this._prefix + key;
  }

  get<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    try {
      const raw = localStorage.getItem(this._key(key));
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`StorageUtils: failed to read '${this._key(key)}'`, e);
      return defaultValue;
    }
  }

  set(key: string, value: unknown): boolean {
    try {
      localStorage.setItem(this._key(key), JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`StorageUtils: failed to write '${this._key(key)}'`, e);
      return false;
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this._key(key));
    } catch (e) {
      console.warn(`StorageUtils: failed to remove '${this._key(key)}'`, e);
    }
  }

  has(key: string): boolean {
    return localStorage.getItem(this._key(key)) !== null;
  }

  keys(): string[] {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this._prefix)) {
        result.push(k.slice(this._prefix.length));
      }
    }
    return result;
  }

  clear(): void {
    this.keys().forEach((k) => this.remove(k));
  }
}
