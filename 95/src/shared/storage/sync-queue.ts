/**
 * Offline Sync Queue for OpenAnchor PWA
 *
 * Migrated from js/sync-queue.js
 */

import type { SyncOperation, SyncResult } from '../types/index';

const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;

export class SyncQueue {
  private _storageKey: string;

  constructor(storageKey: string = 'openanchor_sync_queue') {
    this._storageKey = storageKey;
  }

  getQueue(): SyncOperation[] {
    try {
      const raw = localStorage.getItem(this._storageKey);
      return raw ? (JSON.parse(raw) as SyncOperation[]) : [];
    } catch (e) {
      console.warn('SyncQueue: failed to read queue', e);
      return [];
    }
  }

  _saveQueue(queue: SyncOperation[]): void {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(queue));
    } catch (e) {
      console.warn('SyncQueue: failed to save queue', e);
    }
  }

  enqueue(type: string, payload: unknown): boolean {
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

  async processQueue(handler: (op: SyncOperation) => Promise<void>): Promise<SyncResult> {
    const queue = this.getQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    const failed: SyncOperation[] = [];
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
      }
    }

    this._saveQueue(failed);
    return { processed, failed: failed.length };
  }

  get size(): number {
    return this.getQueue().length;
  }

  clear(): void {
    this._saveQueue([]);
  }
}
