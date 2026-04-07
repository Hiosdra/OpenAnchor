import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '../src/modules/anchor/hooks/useOnlineStatus';

let onLineValue = true;

beforeEach(() => {
  vi.clearAllMocks();
  onLineValue = true;
  Object.defineProperty(navigator, 'onLine', {
    get: () => onLineValue,
    configurable: true,
  });
});

afterEach(() => {
  onLineValue = true;
});

// ---------------------------------------------------------------------------
// Initial value
// ---------------------------------------------------------------------------
describe('useOnlineStatus — initial value', () => {
  it('returns true when navigator.onLine is true', () => {
    onLineValue = true;
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    onLineValue = false;
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Event-driven updates
// ---------------------------------------------------------------------------
describe('useOnlineStatus — events', () => {
  it('updates to true when online event fires', () => {
    onLineValue = false;
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('updates to false when offline event fires', () => {
    onLineValue = true;
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('handles multiple toggles correctly', () => {
    onLineValue = true;
    const { result } = renderHook(() => useOnlineStatus());

    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.isOnline).toBe(false);

    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current.isOnline).toBe(true);

    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.isOnline).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
describe('useOnlineStatus — cleanup', () => {
  it('removes event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());

    const onlineCalls = addSpy.mock.calls.filter(([e]) => e === 'online');
    const offlineCalls = addSpy.mock.calls.filter(([e]) => e === 'offline');
    expect(onlineCalls.length).toBeGreaterThanOrEqual(1);
    expect(offlineCalls.length).toBeGreaterThanOrEqual(1);

    unmount();

    const removeOnline = removeSpy.mock.calls.filter(([e]) => e === 'online');
    const removeOffline = removeSpy.mock.calls.filter(([e]) => e === 'offline');
    expect(removeOnline.length).toBeGreaterThanOrEqual(1);
    expect(removeOffline.length).toBeGreaterThanOrEqual(1);
  });

  it('does not respond to events after unmount', () => {
    onLineValue = true;
    const { result, unmount } = renderHook(() => useOnlineStatus());

    unmount();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // After unmount, last captured value should still be true
    expect(result.current.isOnline).toBe(true);
  });
});
