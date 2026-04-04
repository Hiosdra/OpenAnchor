import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReconnectStrategy } from '../src/modules/anchor/reconnect-strategy';

describe('ReconnectStrategy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Construction & defaults
  // -----------------------------------------------------------------------
  it('starts with 0 attempts', () => {
    const rs = new ReconnectStrategy();
    expect(rs.attempts).toBe(0);
  });

  it('is not intentionally disconnected by default', () => {
    const rs = new ReconnectStrategy();
    expect(rs.isIntentionalDisconnect).toBe(false);
  });

  // -----------------------------------------------------------------------
  // getNextDelay — exponential backoff
  // -----------------------------------------------------------------------
  describe('getNextDelay', () => {
    it('returns baseDelay for first attempt', () => {
      const rs = new ReconnectStrategy({ baseDelay: 1000 });
      expect(rs.getNextDelay()).toBe(1000);
    });

    it('doubles delay per attempt', () => {
      const rs = new ReconnectStrategy({ baseDelay: 1000 });
      rs.schedule(() => {}); // attempt 0 → 1
      expect(rs.getNextDelay()).toBe(2000);
      rs.schedule(() => {}); // attempt 1 → 2
      expect(rs.getNextDelay()).toBe(4000);
    });

    it('caps delay at maxDelay', () => {
      const rs = new ReconnectStrategy({ baseDelay: 1000, maxDelay: 5000 });
      // Force many attempts
      for (let i = 0; i < 20; i++) rs.schedule(() => {});
      expect(rs.getNextDelay()).toBeLessThanOrEqual(5000);
    });

    it('uses default baseDelay=2000 and maxDelay=30000', () => {
      const rs = new ReconnectStrategy();
      expect(rs.getNextDelay()).toBe(2000);
      // After 10 attempts: 2000 * 2^10 = 2_048_000, capped at 30_000
      for (let i = 0; i < 10; i++) rs.schedule(() => {});
      expect(rs.getNextDelay()).toBe(30000);
    });
  });

  // -----------------------------------------------------------------------
  // canReconnect
  // -----------------------------------------------------------------------
  describe('canReconnect', () => {
    it('returns true initially', () => {
      expect(new ReconnectStrategy().canReconnect()).toBe(true);
    });

    it('returns false after markIntentional()', () => {
      const rs = new ReconnectStrategy();
      rs.markIntentional();
      expect(rs.canReconnect()).toBe(false);
    });

    it('returns false when maxAttempts exceeded', () => {
      const rs = new ReconnectStrategy({ maxAttempts: 3 });
      rs.schedule(() => {});
      rs.schedule(() => {});
      rs.schedule(() => {});
      expect(rs.canReconnect()).toBe(false);
    });

    it('returns true after reset even if previously marked intentional', () => {
      const rs = new ReconnectStrategy();
      rs.markIntentional();
      rs.reset();
      expect(rs.canReconnect()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // schedule
  // -----------------------------------------------------------------------
  describe('schedule', () => {
    it('calls the callback after the delay', () => {
      const rs = new ReconnectStrategy({ baseDelay: 500 });
      const cb = vi.fn();
      const delay = rs.schedule(cb);

      expect(delay).toBe(500);
      expect(cb).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(cb).toHaveBeenCalledOnce();
    });

    it('returns null when reconnection is not allowed', () => {
      const rs = new ReconnectStrategy();
      rs.markIntentional();
      expect(rs.schedule(() => {})).toBeNull();
    });

    it('increments attempt counter', () => {
      const rs = new ReconnectStrategy();
      rs.schedule(() => {});
      expect(rs.attempts).toBe(1);
      rs.schedule(() => {});
      expect(rs.attempts).toBe(2);
    });

    it('cancels previous pending timer on re-schedule', () => {
      const rs = new ReconnectStrategy({ baseDelay: 1000 });
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      rs.schedule(cb1);
      rs.schedule(cb2);

      vi.advanceTimersByTime(2000);
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledOnce();
    });
  });

  // -----------------------------------------------------------------------
  // cancelPending
  // -----------------------------------------------------------------------
  describe('cancelPending', () => {
    it('prevents scheduled callback from firing', () => {
      const rs = new ReconnectStrategy({ baseDelay: 500 });
      const cb = vi.fn();
      rs.schedule(cb);
      rs.cancelPending();

      vi.advanceTimersByTime(1000);
      expect(cb).not.toHaveBeenCalled();
    });

    it('is safe to call when nothing is pending', () => {
      const rs = new ReconnectStrategy();
      expect(() => rs.cancelPending()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // markIntentional
  // -----------------------------------------------------------------------
  describe('markIntentional', () => {
    it('prevents future reconnections', () => {
      const rs = new ReconnectStrategy();
      rs.markIntentional();
      expect(rs.isIntentionalDisconnect).toBe(true);
      expect(rs.canReconnect()).toBe(false);
    });

    it('cancels pending timer and resets attempts', () => {
      const rs = new ReconnectStrategy({ baseDelay: 500 });
      const cb = vi.fn();
      rs.schedule(cb);
      rs.schedule(cb);
      expect(rs.attempts).toBe(2);

      rs.markIntentional();
      expect(rs.attempts).toBe(0);

      vi.advanceTimersByTime(10000);
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // reset
  // -----------------------------------------------------------------------
  describe('reset', () => {
    it('clears intentional flag, attempts, and pending timer', () => {
      const rs = new ReconnectStrategy({ baseDelay: 500 });
      rs.schedule(() => {});
      rs.schedule(() => {});
      rs.markIntentional();

      rs.reset();
      expect(rs.attempts).toBe(0);
      expect(rs.isIntentionalDisconnect).toBe(false);
      expect(rs.canReconnect()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // onConnected
  // -----------------------------------------------------------------------
  describe('onConnected', () => {
    it('resets attempt counter', () => {
      const rs = new ReconnectStrategy();
      rs.schedule(() => {});
      rs.schedule(() => {});
      expect(rs.attempts).toBe(2);

      rs.onConnected();
      expect(rs.attempts).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Integration scenario: typical reconnection cycle
  // -----------------------------------------------------------------------
  describe('integration: reconnect cycle', () => {
    it('performs escalating backoff then resets on success', () => {
      const rs = new ReconnectStrategy({ baseDelay: 100, maxDelay: 1000 });
      const delays: number[] = [];
      const cb = vi.fn();

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const delay = rs.schedule(cb);
        delays.push(delay!);
        vi.advanceTimersByTime(delay!);
      }

      expect(delays).toEqual([100, 200, 400, 800, 1000]);
      expect(cb).toHaveBeenCalledTimes(5);

      // Simulate successful connection
      rs.onConnected();
      expect(rs.attempts).toBe(0);

      // Next schedule should use base delay again
      const newDelay = rs.schedule(cb);
      expect(newDelay).toBe(100);
    });
  });
});
