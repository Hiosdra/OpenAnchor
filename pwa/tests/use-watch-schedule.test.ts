import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWatchSchedule } from '../src/modules/anchor/hooks/useWatchSchedule';
import type { ScheduleItem } from '../src/modules/anchor/anchor-utils';

const SCHEDULE_STORAGE_KEY = 'anchor_schedule';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe('useWatchSchedule — initial state', () => {
  it('returns default values when localStorage is empty', () => {
    const { result } = renderHook(() => useWatchSchedule());

    expect(result.current.watchActive).toBe(false);
    expect(result.current.watchEndTime).toBeNull();
    expect(result.current.watchMinutes).toBe(10);
    expect(result.current.schedule).toEqual([]);
  });

  it('restores schedule from localStorage', () => {
    const saved: ScheduleItem[] = [
      { start: '08:00', end: '12:00', person: 'Alice' },
    ];
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useWatchSchedule());
    expect(result.current.schedule).toEqual(saved);
  });

  it('falls back to empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, 'not-json');

    const { result } = renderHook(() => useWatchSchedule());
    expect(result.current.schedule).toEqual([]);
  });

  it('falls back to empty array when localStorage contains non-array JSON', () => {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify({ bad: true }));

    const { result } = renderHook(() => useWatchSchedule());
    expect(result.current.schedule).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// startWatch / cancelWatch
// ---------------------------------------------------------------------------
describe('useWatchSchedule — startWatch & cancelWatch', () => {
  it('startWatch activates the watch and sets endTime', () => {
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
    const { result } = renderHook(() => useWatchSchedule());

    act(() => result.current.startWatch(5));

    expect(result.current.watchActive).toBe(true);
    expect(result.current.watchEndTime).toBe(
      Date.now() + 5 * 60 * 1000,
    );
    expect(result.current.watchMinutes).toBe(5);
  });

  it('cancelWatch deactivates the watch and clears endTime', () => {
    const { result } = renderHook(() => useWatchSchedule());

    act(() => result.current.startWatch(10));
    expect(result.current.watchActive).toBe(true);

    act(() => result.current.cancelWatch());
    expect(result.current.watchActive).toBe(false);
    expect(result.current.watchEndTime).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkWatchTimer
// ---------------------------------------------------------------------------
describe('useWatchSchedule — checkWatchTimer', () => {
  it('returns false when watch is not active', () => {
    const { result } = renderHook(() => useWatchSchedule());

    let expired: boolean;
    act(() => {
      expired = result.current.checkWatchTimer();
    });
    expect(expired!).toBe(false);
  });

  it('returns false when watch is active but not yet expired', () => {
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
    const { result } = renderHook(() => useWatchSchedule());

    act(() => result.current.startWatch(10));

    // Advance 5 minutes — still within the 10-minute window
    vi.advanceTimersByTime(5 * 60 * 1000);

    let expired: boolean;
    act(() => {
      expired = result.current.checkWatchTimer();
    });
    expect(expired!).toBe(false);
    expect(result.current.watchActive).toBe(true);
  });

  it('returns true and deactivates watch when timer has expired', () => {
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
    const { result } = renderHook(() => useWatchSchedule());

    act(() => result.current.startWatch(10));

    // Advance past the 10-minute mark
    vi.advanceTimersByTime(11 * 60 * 1000);

    let expired: boolean;
    act(() => {
      expired = result.current.checkWatchTimer();
    });
    expect(expired!).toBe(true);
    expect(result.current.watchActive).toBe(false);
    expect(result.current.watchEndTime).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// addScheduleItem / removeScheduleItem
// ---------------------------------------------------------------------------
describe('useWatchSchedule — schedule management', () => {
  const item1: ScheduleItem = { start: '08:00', end: '12:00', person: 'Alice' };
  const item2: ScheduleItem = { start: '12:00', end: '16:00', person: 'Bob' };

  it('addScheduleItem appends to the schedule', () => {
    const { result } = renderHook(() => useWatchSchedule());

    act(() => result.current.addScheduleItem(item1));
    expect(result.current.schedule).toEqual([item1]);

    act(() => result.current.addScheduleItem(item2));
    expect(result.current.schedule).toEqual([item1, item2]);
  });

  it('removeScheduleItem removes the item at the given index', () => {
    const { result } = renderHook(() => useWatchSchedule());

    act(() => {
      result.current.addScheduleItem(item1);
      result.current.addScheduleItem(item2);
    });

    act(() => result.current.removeScheduleItem(0));
    expect(result.current.schedule).toEqual([item2]);
  });
});

// ---------------------------------------------------------------------------
// Schedule persistence (debounced localStorage save)
// ---------------------------------------------------------------------------
describe('useWatchSchedule — persistence', () => {
  it('saves schedule to localStorage after debounce delay', () => {
    const item: ScheduleItem = { start: '06:00', end: '10:00', person: 'Carol' };
    const { result } = renderHook(() => useWatchSchedule());

    act(() => result.current.addScheduleItem(item));

    // Before debounce fires
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBeNull();

    // Flush the 300 ms debounce timer
    act(() => vi.advanceTimersByTime(300));

    expect(JSON.parse(localStorage.getItem(SCHEDULE_STORAGE_KEY)!)).toEqual([item]);
  });

  it('clears pending save timer on unmount', () => {
    const item: ScheduleItem = { start: '06:00', end: '10:00', person: 'Carol' };
    const { result, unmount } = renderHook(() => useWatchSchedule());

    act(() => result.current.addScheduleItem(item));
    unmount();

    // Advance time — the save should NOT fire because cleanup cleared the timer
    act(() => vi.advanceTimersByTime(500));
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getActiveScheduleSlot
// ---------------------------------------------------------------------------
describe('useWatchSchedule — getActiveScheduleSlot', () => {
  it('returns null when schedule is empty', () => {
    const { result } = renderHook(() => useWatchSchedule());

    let slot: ScheduleItem | null;
    act(() => {
      slot = result.current.getActiveScheduleSlot();
    });
    expect(slot!).toBeNull();
  });

  it('returns matching slot when current time falls within range', () => {
    // Set time to 09:30
    vi.setSystemTime(new Date('2025-06-01T09:30:00'));
    const item: ScheduleItem = { start: '08:00', end: '12:00', person: 'Alice' };
    const { result } = renderHook(() => useWatchSchedule());

    act(() => result.current.addScheduleItem(item));

    let slot: ScheduleItem | null;
    act(() => {
      slot = result.current.getActiveScheduleSlot();
    });
    expect(slot!).toEqual(item);
  });

  it('returns null when current time is outside all slots', () => {
    // Set time to 06:00
    vi.setSystemTime(new Date('2025-06-01T06:00:00'));
    const item: ScheduleItem = { start: '08:00', end: '12:00', person: 'Alice' };
    const { result } = renderHook(() => useWatchSchedule());

    act(() => result.current.addScheduleItem(item));

    let slot: ScheduleItem | null;
    act(() => {
      slot = result.current.getActiveScheduleSlot();
    });
    expect(slot!).toBeNull();
  });
});
