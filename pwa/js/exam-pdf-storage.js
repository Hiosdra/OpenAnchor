/**
 * exam-pdf-storage.js
 * IndexedDB storage for exam PDF data.
 * Persists through service worker cache clears and app updates.
 */

const EXPECTED_PDF_HASH = '967e36168e85a50fc551acbcea171939bad82c2de4872009044c67685c970c10';

const PDF_DB_NAME = 'openanchor_exam_pdf';
const PDF_DB_VERSION = 1;
const PDF_STORE_NAME = 'pdf_data';
const PDF_KEY = 'main';

function _openPdfDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PDF_DB_NAME, PDF_DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
                db.createObjectStore(PDF_STORE_NAME);
            }
        };
    });
}

async function savePdfData(blob, metadata) {
    const db = await _openPdfDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PDF_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PDF_STORE_NAME);
        store.put({ blob, metadata }, PDF_KEY);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

async function loadPdfBlob() {
    try {
        const db = await _openPdfDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PDF_STORE_NAME, 'readonly');
            const store = tx.objectStore(PDF_STORE_NAME);
            const request = store.get(PDF_KEY);
            request.onsuccess = () => {
                db.close();
                resolve(request.result ? request.result.blob : null);
            };
            request.onerror = () => { db.close(); reject(request.error); };
        });
    } catch {
        return null;
    }
}

async function loadPdfMeta() {
    try {
        const db = await _openPdfDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PDF_STORE_NAME, 'readonly');
            const store = tx.objectStore(PDF_STORE_NAME);
            const request = store.get(PDF_KEY);
            request.onsuccess = () => {
                db.close();
                resolve(request.result ? request.result.metadata : null);
            };
            request.onerror = () => { db.close(); reject(request.error); };
        });
    } catch {
        return null;
    }
}

async function isPdfImported() {
    const meta = await loadPdfMeta();
    return meta !== null;
}

async function deletePdf() {
    const db = await _openPdfDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PDF_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PDF_STORE_NAME);
        store.delete(PDF_KEY);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

async function computeSha256(arrayBuffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPdfHash(arrayBuffer) {
    const hash = await computeSha256(arrayBuffer);
    return { valid: hash === EXPECTED_PDF_HASH, hash };
}
