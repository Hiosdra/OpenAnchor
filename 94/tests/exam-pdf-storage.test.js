import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EXPECTED_PDF_HASH,
  savePdfData,
  loadPdfBlob,
  loadPdfMeta,
  isPdfImported,
  deletePdf,
  computeSha256,
  verifyPdfHash,
} from '../js/exam-pdf-storage.js';

// --- IndexedDB mock ---
function createMockIDB() {
  let store = {};

  const objectStoreMock = {
    put(value, key) {
      store[key] = value;
      return { onsuccess: null, onerror: null };
    },
    get(key) {
      const req = { result: store[key] || undefined, onsuccess: null, onerror: null };
      setTimeout(() => req.onsuccess?.(), 0);
      return req;
    },
    delete(key) {
      delete store[key];
      return { onsuccess: null, onerror: null };
    },
  };

  const txMock = {
    objectStore: () => objectStoreMock,
    oncomplete: null,
    onerror: null,
  };

  const dbMock = {
    transaction: () => {
      setTimeout(() => txMock.oncomplete?.(), 0);
      return txMock;
    },
    close: vi.fn(),
    objectStoreNames: { contains: () => true },
    createObjectStore: vi.fn(),
  };

  const requestMock = {
    result: dbMock,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  };

  global.indexedDB = {
    open: () => {
      setTimeout(() => requestMock.onsuccess?.(), 0);
      return requestMock;
    },
  };

  return { store, clear: () => { store = {}; } };
}

// --- crypto.subtle mock ---
function setupCryptoMock() {
  const mockDigest = vi.fn(async (_algo, buffer) => {
    const bytes = new Uint8Array(buffer);
    const hash = new Uint8Array(32);
    for (let i = 0; i < bytes.length; i++) {
      hash[i % 32] = (hash[i % 32] + bytes[i]) & 0xff;
    }
    return hash.buffer;
  });

  vi.stubGlobal('crypto', {
    subtle: { digest: mockDigest },
  });
}

describe('Exam PDF Storage', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = createMockIDB();
    setupCryptoMock();
  });

  describe('EXPECTED_PDF_HASH', () => {
    it('should be a 64-char hex string', () => {
      expect(EXPECTED_PDF_HASH).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be the known SHA-256 hash', () => {
      expect(EXPECTED_PDF_HASH).toBe('967e36168e85a50fc551acbcea171939bad82c2de4872009044c67685c970c10');
    });
  });

  describe('savePdfData / loadPdfBlob / loadPdfMeta', () => {
    it('should save and load PDF blob', async () => {
      const blob = new Blob(['test-pdf-content'], { type: 'application/pdf' });
      const metadata = { hash: 'abc123', filename: 'test.pdf', importDate: '2026-01-01' };

      await savePdfData(blob, metadata);
      const loadedBlob = await loadPdfBlob();

      expect(loadedBlob).toBeInstanceOf(Blob);
    });

    it('should save and load metadata', async () => {
      const blob = new Blob(['test'], { type: 'application/pdf' });
      const metadata = { hash: 'abc123', filename: 'test.pdf', importDate: '2026-01-01' };

      await savePdfData(blob, metadata);
      const loadedMeta = await loadPdfMeta();

      expect(loadedMeta).toEqual(metadata);
    });

    it('should return null when no blob saved', async () => {
      const result = await loadPdfBlob();
      expect(result).toBeNull();
    });

    it('should return null when no metadata saved', async () => {
      const result = await loadPdfMeta();
      expect(result).toBeNull();
    });
  });

  describe('isPdfImported', () => {
    it('should return false when nothing imported', async () => {
      const result = await isPdfImported();
      expect(result).toBe(false);
    });

    it('should return true after importing', async () => {
      const blob = new Blob(['test'], { type: 'application/pdf' });
      const metadata = { hash: 'abc', filename: 'test.pdf' };

      await savePdfData(blob, metadata);
      const result = await isPdfImported();

      expect(result).toBe(true);
    });
  });

  describe('deletePdf', () => {
    it('should remove saved PDF data', async () => {
      const blob = new Blob(['test'], { type: 'application/pdf' });
      await savePdfData(blob, { hash: 'abc' });

      await deletePdf();

      const result = await isPdfImported();
      expect(result).toBe(false);
    });

    it('should not throw when nothing to delete', async () => {
      await expect(deletePdf()).resolves.not.toThrow();
    });
  });

  describe('computeSha256', () => {
    it('should return a 64-char hex string', async () => {
      const buffer = new TextEncoder().encode('hello world').buffer;
      const hash = await computeSha256(buffer);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should call crypto.subtle.digest with SHA-256', async () => {
      const buffer = new TextEncoder().encode('test').buffer;
      await computeSha256(buffer);

      expect(globalThis.crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', buffer);
    });

    it('should produce consistent hashes for same input', async () => {
      const buffer = new TextEncoder().encode('same content').buffer;
      const hash1 = await computeSha256(buffer);
      const hash2 = await computeSha256(buffer);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different input', async () => {
      const buf1 = new TextEncoder().encode('content A').buffer;
      const buf2 = new TextEncoder().encode('content B').buffer;
      const hash1 = await computeSha256(buf1);
      const hash2 = await computeSha256(buf2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPdfHash', () => {
    it('should return valid: false for non-matching hash', async () => {
      const buffer = new TextEncoder().encode('wrong content').buffer;
      const result = await verifyPdfHash(buffer);

      expect(result.valid).toBe(false);
      expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return hash string in result', async () => {
      const buffer = new TextEncoder().encode('test').buffer;
      const result = await verifyPdfHash(buffer);

      expect(typeof result.hash).toBe('string');
      expect(result.hash.length).toBe(64);
    });

    it('should match expected hash when content produces it', async () => {
      // Mock crypto to return the expected hash
      const expectedBytes = [];
      for (let i = 0; i < 64; i += 2) {
        expectedBytes.push(parseInt(EXPECTED_PDF_HASH.substring(i, i + 2), 16));
      }
      vi.stubGlobal('crypto', {
        subtle: { digest: vi.fn(async () => new Uint8Array(expectedBytes).buffer) },
      });

      const buffer = new TextEncoder().encode('correct pdf').buffer;
      const result = await verifyPdfHash(buffer);

      expect(result.valid).toBe(true);
      expect(result.hash).toBe(EXPECTED_PDF_HASH);
    });
  });

  describe('error handling', () => {
    it('loadPdfBlob returns null on IndexedDB error', async () => {
      global.indexedDB = {
        open: () => {
          const req = { onerror: null, onsuccess: null };
          setTimeout(() => req.onerror?.(), 0);
          return req;
        },
      };

      const result = await loadPdfBlob();
      expect(result).toBeNull();
    });

    it('loadPdfMeta returns null on IndexedDB error', async () => {
      global.indexedDB = {
        open: () => {
          const req = { onerror: null, onsuccess: null };
          setTimeout(() => req.onerror?.(), 0);
          return req;
        },
      };

      const result = await loadPdfMeta();
      expect(result).toBeNull();
    });
  });
});
