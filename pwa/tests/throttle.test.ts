import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from '../src/modules/anchor/ui-utils';

describe('throttle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('invokes immediately on first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);
    throttled();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('suppresses calls within the throttle window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('fires trailing call after throttle window expires', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('a');
    throttled('b'); // queued as trailing
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('b');
  });

  it('allows next immediate call after window elapses', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    vi.advanceTimersByTime(150);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('passes arguments to the original function', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled(1, 'two', { three: 3 });
    expect(fn).toHaveBeenCalledWith(1, 'two', { three: 3 });
  });

  it('cancel() prevents queued trailing call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled(); // would be trailing
    throttled.cancel();

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1); // only the immediate one
  });

  it('cancel() is safe to call when nothing is queued', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    expect(() => throttled.cancel()).not.toThrow();
  });

  it('preserves "this" context', () => {
    const obj = {
      value: 42,
      getValue: throttle(function (this: { value: number }) {
        return this.value;
      }, 100),
    };
    const result = obj.getValue();
    expect(result).toBe(42);
  });
});
