/**
 * Offline Sync Queue for OpenAnchor PWA
 *
 * Architecture:
 * - Pending sync operations are stored in localStorage as a JSON array.
 * - Each operation has a type (e.g., 'EXAM_PROGRESS', 'ANCHOR_SESSION'), payload, and timestamp.
 * - When the app detects an online connection, it processes the queue in FIFO order.
 * - Failed operations are re-enqueued with a retry count.
 * - The queue is capped at MAX_QUEUE_SIZE to prevent storage overflow.
 *
 * Intended usage:
 *   const syncQueue = new SyncQueue('openanchor_sync_queue');
 *   syncQueue.enqueue('EXAM_PROGRESS', { questionId: 'q1', correct: true });
 *   await syncQueue.processQueue(async (op) => { await fetch('/api/sync', { ... }); });
 *
 * Future enhancements:
 * - Use IndexedDB instead of localStorage for larger payloads.
 * - Add Background Sync API integration (navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-queue'))).
 * - Add conflict resolution for concurrent edits.
 * - Add exponential backoff for retries.
 */

const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;

class SyncQueue {
  /**
   * @param {string} storageKey - localStorage key for the queue
   */
  constructor(storageKey = 'openanchor_sync_queue') {
    this._storageKey = storageKey;
  }

  /**
   * Get the current queue from localStorage.
   * @returns {Array} Queue of pending operations
   */
  getQueue() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('SyncQueue: failed to read queue', e);
      return [];
    }
  }

  /**
   * Save the queue to localStorage.
   * @param {Array} queue
   */
  _saveQueue(queue) {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(queue));
    } catch (e) {
      console.warn('SyncQueue: failed to save queue', e);
    }
  }

  /**
   * Add an operation to the sync queue.
   * @param {string} type - Operation type (e.g., 'EXAM_PROGRESS', 'ANCHOR_SESSION')
   * @param {Object} payload - Operation data
   * @returns {boolean} true if enqueued successfully
   */
  enqueue(type, payload) {
    const queue = this.getQueue();
    if (queue.length >= MAX_QUEUE_SIZE) {
      console.warn('SyncQueue: queue full, dropping oldest operation');
      queue.shift();
    }
    queue.push({
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0
    });
    this._saveQueue(queue);
    return true;
  }

  /**
   * Process all pending operations in the queue.
   * @param {Function} handler - async function(operation) that processes each operation.
   *   Should throw on failure to trigger re-enqueue.
   * @returns {Object} { processed: number, failed: number }
   */
  async processQueue(handler) {
    const queue = this.getQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    const failed = [];
    let processed = 0;

    for (const op of queue) {
      try {
        await handler(op);
        processed++;
      } catch (e) {
        console.warn(`SyncQueue: failed to process ${op.type}:`, e);
        if (op.retries < MAX_RETRIES) {
          failed.push({ ...op, retries: op.retries + 1 });
        }
        // else: drop permanently after max retries
      }
    }

    this._saveQueue(failed);
    return { processed, failed: failed.length };
  }

  /**
   * Get the number of pending operations.
   * @returns {number}
   */
  get size() {
    return this.getQueue().length;
  }

  /**
   * Clear all pending operations.
   */
  clear() {
    this._saveQueue([]);
  }
}

// Export for ES modules and script tags
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SyncQueue };
}
