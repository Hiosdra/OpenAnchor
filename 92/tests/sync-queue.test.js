import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncQueue } from '../js/sync-queue.js';

describe('SyncQueue', () => {
  let queue;

  beforeEach(() => {
    localStorage.clear();
    queue = new SyncQueue('test_queue');
  });

  describe('constructor', () => {
    it('should use default storage key when none provided', () => {
      const q = new SyncQueue();
      q.enqueue('X', {});
      expect(localStorage.getItem('openanchor_sync_queue')).not.toBeNull();
    });

    it('should use custom storage key', () => {
      queue.enqueue('X', {});
      expect(localStorage.getItem('test_queue')).not.toBeNull();
    });
  });

  describe('getQueue', () => {
    it('should return empty array when nothing is stored', () => {
      expect(queue.getQueue()).toEqual([]);
    });

    it('should return parsed queue from localStorage', () => {
      const data = [{ id: '1', type: 'A', payload: {}, timestamp: 1, retries: 0 }];
      localStorage.setItem('test_queue', JSON.stringify(data));
      expect(queue.getQueue()).toEqual(data);
    });

    it('should return empty array on parse error', () => {
      localStorage.setItem('test_queue', 'not json');
      expect(queue.getQueue()).toEqual([]);
    });

    it('should warn on parse error', () => {
      localStorage.setItem('test_queue', 'bad');
      queue.getQueue();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('_saveQueue', () => {
    it('should warn when localStorage.setItem throws', () => {
      const orig = localStorage.setItem.bind(localStorage);
      localStorage.setItem = () => { throw new Error('quota'); };
      queue._saveQueue([]);
      expect(console.warn).toHaveBeenCalled();
      localStorage.setItem = orig;
    });
  });

  describe('enqueue', () => {
    it('should add an operation to the queue', () => {
      queue.enqueue('EXAM_PROGRESS', { qid: 'q1' });
      const items = queue.getQueue();
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe('EXAM_PROGRESS');
      expect(items[0].payload).toEqual({ qid: 'q1' });
    });

    it('should set retries to 0', () => {
      queue.enqueue('T', {});
      expect(queue.getQueue()[0].retries).toBe(0);
    });

    it('should set a timestamp', () => {
      const before = Date.now();
      queue.enqueue('T', {});
      const after = Date.now();
      const ts = queue.getQueue()[0].timestamp;
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('should generate unique ids', () => {
      queue.enqueue('A', {});
      queue.enqueue('B', {});
      const items = queue.getQueue();
      expect(items[0].id).not.toBe(items[1].id);
    });

    it('should return true', () => {
      expect(queue.enqueue('T', {})).toBe(true);
    });

    it('should drop oldest operation when queue reaches MAX_QUEUE_SIZE (100)', () => {
      for (let i = 0; i < 100; i++) {
        queue.enqueue('ITEM', { i });
      }
      expect(queue.getQueue()).toHaveLength(100);

      queue.enqueue('NEW', { i: 100 });
      const items = queue.getQueue();
      expect(items).toHaveLength(100);
      expect(items[0].payload.i).toBe(1);
      expect(items[99].type).toBe('NEW');
    });

    it('should warn when dropping oldest', () => {
      for (let i = 0; i < 100; i++) queue.enqueue('X', {});
      queue.enqueue('OVERFLOW', {});
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('queue full')
      );
    });
  });

  describe('processQueue', () => {
    it('should return zeros for empty queue', async () => {
      const result = await queue.processQueue(vi.fn());
      expect(result).toEqual({ processed: 0, failed: 0 });
    });

    it('should not call handler for empty queue', async () => {
      const handler = vi.fn();
      await queue.processQueue(handler);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should process all operations and call handler with each', async () => {
      queue.enqueue('A', { v: 1 });
      queue.enqueue('B', { v: 2 });
      const handler = vi.fn();
      const result = await queue.processQueue(handler);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler.mock.calls[0][0].type).toBe('A');
      expect(handler.mock.calls[1][0].type).toBe('B');
      expect(result).toEqual({ processed: 2, failed: 0 });
    });

    it('should clear queue after successful processing', async () => {
      queue.enqueue('A', {});
      await queue.processQueue(vi.fn());
      expect(queue.size).toBe(0);
    });

    it('should re-enqueue failed operations with incremented retries', async () => {
      queue.enqueue('FAIL', {});
      const handler = vi.fn().mockRejectedValue(new Error('network'));
      const result = await queue.processQueue(handler);

      expect(result).toEqual({ processed: 0, failed: 1 });
      const items = queue.getQueue();
      expect(items).toHaveLength(1);
      expect(items[0].retries).toBe(1);
    });

    it('should drop operations exceeding MAX_RETRIES (3)', async () => {
      const op = { id: 'x', type: 'T', payload: {}, timestamp: 1, retries: 3 };
      localStorage.setItem('test_queue', JSON.stringify([op]));

      const handler = vi.fn().mockRejectedValue(new Error('fail'));
      const result = await queue.processQueue(handler);

      expect(result).toEqual({ processed: 0, failed: 0 });
      expect(queue.size).toBe(0);
    });

    it('should handle a mix of successes and failures', async () => {
      queue.enqueue('OK1', {});
      queue.enqueue('FAIL', {});
      queue.enqueue('OK2', {});

      const handler = vi.fn()
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('err'))
        .mockResolvedValueOnce();

      const result = await queue.processQueue(handler);
      expect(result).toEqual({ processed: 2, failed: 1 });
    });

    it('should warn on handler failure', async () => {
      queue.enqueue('BAD', {});
      await queue.processQueue(vi.fn().mockRejectedValue(new Error('oops')));
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('size', () => {
    it('should return 0 for empty queue', () => {
      expect(queue.size).toBe(0);
    });

    it('should reflect number of enqueued items', () => {
      queue.enqueue('A', {});
      queue.enqueue('B', {});
      expect(queue.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should empty the queue', () => {
      queue.enqueue('A', {});
      queue.clear();
      expect(queue.size).toBe(0);
    });

    it('should persist empty array in localStorage', () => {
      queue.enqueue('A', {});
      queue.clear();
      expect(JSON.parse(localStorage.getItem('test_queue'))).toEqual([]);
    });
  });
});
