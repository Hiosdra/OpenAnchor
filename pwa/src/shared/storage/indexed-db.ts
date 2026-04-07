/**
 * IndexedDB storage for exam PDF data.
 * Persists through service worker cache clears and app updates.
 *
 * Migrated from js/exam-pdf-storage.js
 */

import type { PdfMetadata, PdfStorageRecord } from '../types/index';

export const EXPECTED_PDF_HASH = '967e36168e85a50fc551acbcea171939bad82c2de4872009044c67685c970c10';

const PDF_DB_NAME = 'openanchor_exam_pdf';
const PDF_DB_VERSION = 1;
const PDF_STORE_NAME = 'pdf_data';
const PDF_KEY = 'main';

function _openPdfDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PDF_DB_NAME, PDF_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
        db.createObjectStore(PDF_STORE_NAME);
      }
    };
  });
}

export async function savePdfData(blob: Blob, metadata: PdfMetadata): Promise<void> {
  const db = await _openPdfDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PDF_STORE_NAME);
    store.put({ blob, metadata } as PdfStorageRecord, PDF_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadPdfBlob(): Promise<Blob | null> {
  try {
    const db = await _openPdfDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PDF_STORE_NAME, 'readonly');
      const store = tx.objectStore(PDF_STORE_NAME);
      const request = store.get(PDF_KEY);
      request.onsuccess = () => {
        resolve(request.result ? (request.result as PdfStorageRecord).blob : null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
      tx.oncomplete = () => {
        db.close();
      };
      tx.onerror = () => {
        db.close();
      };
    });
  } catch {
    return null;
  }
}

export async function loadPdfMeta(): Promise<PdfMetadata | null> {
  try {
    const db = await _openPdfDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PDF_STORE_NAME, 'readonly');
      const store = tx.objectStore(PDF_STORE_NAME);
      const request = store.get(PDF_KEY);
      request.onsuccess = () => {
        resolve(request.result ? (request.result as PdfStorageRecord).metadata : null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
      tx.oncomplete = () => {
        db.close();
      };
      tx.onerror = () => {
        db.close();
      };
    });
  } catch {
    return null;
  }
}

export async function isPdfImported(): Promise<boolean> {
  const meta = await loadPdfMeta();
  return meta !== null;
}

export async function deletePdf(): Promise<void> {
  const db = await _openPdfDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE_NAME, 'readwrite');
    const store = tx.objectStore(PDF_STORE_NAME);
    store.delete(PDF_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function computeSha256(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPdfHash(
  arrayBuffer: ArrayBuffer,
): Promise<{ valid: boolean; hash: string }> {
  const hash = await computeSha256(arrayBuffer);
  return { valid: hash === EXPECTED_PDF_HASH, hash };
}
