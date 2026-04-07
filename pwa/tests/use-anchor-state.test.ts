import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('leaflet', () => ({
  default: {},
  latLng: (lat: number, lng: number) => ({ lat, lng }),
}));

import { useAnchorState } from '../src/modules/anchor/hooks/useAnchorState';
import { GeoUtils } from '../src/modules/anchor/geo-utils';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe('useAnchorState — initial state', () => {
  it('has correct default unit and radius', () => {
    const { result } = renderHook(() => useAnchorState());
    expect(result.current.state.unit).toBe('m');
    expect(result.current.state.radius).toBe(50);
  });

  it('starts with isAnchored false', () => {
    const { result } = renderHook(() => useAnchorState());
    expect(result.current.state.isAnchored).toBe(false);
  });

  it('starts with alarmState SAFE', () => {
    const { result } = renderHook(() => useAnchorState());
    expect(result.current.state.alarmState).toBe('SAFE');
  });

  it('has null positions and zero counters by default', () => {
    const { result } = renderHook(() => useAnchorState());
    const s = result.current.state;
    expect(s.anchorPos).toBeNull();
    expect(s.currentPos).toBeNull();
    expect(s.sog).toBe(0);
    expect(s.distance).toBe(0);
    expect(s.accuracy).toBe(0);
    expect(s.alarmCount).toBe(0);
  });

  it('defaults mapAutoCenter to true and nightMode to false', () => {
    const { result } = renderHook(() => useAnchorState());
    expect(result.current.state.mapAutoCenter).toBe(true);
    expect(result.current.state.nightMode).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateState
// ---------------------------------------------------------------------------
describe('useAnchorState — updateState', () => {
  it('merges partial updates without losing other fields', () => {
    const { result } = renderHook(() => useAnchorState());

    act(() => {
      result.current.updateState({ isAnchored: true, radius: 100 });
    });

    expect(result.current.state.isAnchored).toBe(true);
    expect(result.current.state.radius).toBe(100);
    expect(result.current.state.unit).toBe('m');
    expect(result.current.state.alarmState).toBe('SAFE');
  });

  it('accepts a function that receives previous state', () => {
    const { result } = renderHook(() => useAnchorState());

    act(() => {
      result.current.updateState({ radius: 80 });
    });

    act(() => {
      result.current.updateState((prev) => ({ radius: prev.radius + 20 }));
    });

    expect(result.current.state.radius).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// resetState
// ---------------------------------------------------------------------------
describe('useAnchorState — resetState', () => {
  it('returns all fields to defaults', () => {
    const { result } = renderHook(() => useAnchorState());

    act(() => {
      result.current.updateState({
        isAnchored: true,
        radius: 200,
        unit: 'ft',
        alarmState: 'ALARM',
        nightMode: true,
      });
    });

    act(() => {
      result.current.resetState();
    });

    expect(result.current.state.unit).toBe('m');
    expect(result.current.state.isAnchored).toBe(false);
    expect(result.current.state.radius).toBe(50);
    expect(result.current.state.alarmState).toBe('SAFE');
    expect(result.current.state.nightMode).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toggleUnit
// ---------------------------------------------------------------------------
describe('useAnchorState — toggleUnit', () => {
  it('switches m → ft with correct radius conversion', () => {
    const { result } = renderHook(() => useAnchorState());
    expect(result.current.state.unit).toBe('m');

    act(() => {
      result.current.toggleUnit();
    });

    expect(result.current.state.unit).toBe('ft');
    expect(result.current.state.radius).toBe(Math.round(50 * GeoUtils.M2FT));
  });

  it('switches ft → m with correct radius conversion', () => {
    const { result } = renderHook(() => useAnchorState());

    act(() => {
      result.current.toggleUnit(); // m → ft
    });

    const ftRadius = result.current.state.radius;

    act(() => {
      result.current.toggleUnit(); // ft → m
    });

    expect(result.current.state.unit).toBe('m');
    expect(result.current.state.radius).toBe(Math.round(ftRadius / GeoUtils.M2FT));
  });
});

// ---------------------------------------------------------------------------
// Schedule from localStorage
// ---------------------------------------------------------------------------
describe('useAnchorState — schedule persistence', () => {
  it('loads schedule from localStorage on init', () => {
    const schedule = [
      { start: '08:00', end: '12:00', person: 'Alice' },
      { start: '12:00', end: '16:00', person: 'Bob' },
    ];
    localStorage.setItem('anchor_schedule', JSON.stringify(schedule));

    const { result } = renderHook(() => useAnchorState());
    expect(result.current.state.schedule).toEqual(schedule);
  });

  it('defaults to empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useAnchorState());
    expect(result.current.state.schedule).toEqual([]);
  });

  it('defaults to empty array when localStorage has invalid JSON', () => {
    localStorage.setItem('anchor_schedule', '{broken');
    const { result } = renderHook(() => useAnchorState());
    expect(result.current.state.schedule).toEqual([]);
  });
});
