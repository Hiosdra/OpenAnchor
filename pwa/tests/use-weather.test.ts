import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useWeather } from '../src/modules/anchor/hooks/useWeather';

// Flush one microtask tick
const flushPromises = () => act(async () => {});

// ─── Helpers ──────────────────────────────────────────────────────

function makeStateRef(pos: { lat: number; lng: number } | null = { lat: 54.0, lng: 18.0 }) {
  return { current: { currentPos: pos } } as any;
}

function windJson(speeds: number[], gusts: number[], dirs: number[] = []) {
  return {
    hourly: {
      wind_speed_10m: speeds,
      wind_gusts_10m: gusts,
      wind_direction_10m: dirs.length ? dirs : speeds.map(() => 180),
    },
  };
}

function marineJson(heights: number[], periods: number[] = [], dirs: number[] = []) {
  return {
    hourly: {
      wave_height: heights,
      wave_period: periods.length ? periods : heights.map(() => 6),
      wave_direction: dirs.length ? dirs : heights.map(() => 270),
    },
  };
}

// ─── Setup ────────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  global.fetch = fetchMock as any;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchResponses(wind: object, marine: object | null, marineOk = true) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('marine-api')) {
      return Promise.resolve({
        ok: marineOk,
        json: () => Promise.resolve(marine),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(wind),
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('useWeather', () => {
  // ── assessWeather via hook (tested indirectly through weatherAssessment) ──

  describe('weatherAssessment (assessWeather branches)', () => {
    it('returns null when windSpeed is null (no data fetched)', () => {
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: false }));
      expect(result.current.weatherAssessment).toBeNull();
    });

    it('returns "danger" for gusts > 35 kn', async () => {
      mockFetchResponses(windJson([20], [40]), marineJson([0.5]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('danger');
    });

    it('returns "danger" for wave height > 2.5m', async () => {
      mockFetchResponses(windJson([10], [15]), marineJson([3.0]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('danger');
    });

    it('returns "caution" for gusts > 25 kn (below danger)', async () => {
      mockFetchResponses(windJson([10], [30]), marineJson([0.5]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('caution');
    });

    it('returns "caution" for wave height > 1.5m (below danger)', async () => {
      mockFetchResponses(windJson([10], [15]), marineJson([2.0]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('caution');
    });

    it('returns "caution" when max future wind > 20 kn', async () => {
      mockFetchResponses(windJson([10, 22], [15, 18]), marineJson([0.5]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('caution');
    });

    it('returns "moderate" for windSpeed > 15 kn', async () => {
      mockFetchResponses(windJson([18], [19]), marineJson([0.3]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('moderate');
    });

    it('returns "moderate" for gusts > 20 kn (wind ≤ 15)', async () => {
      mockFetchResponses(windJson([12], [22]), marineJson([0.3]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('moderate');
    });

    it('returns "good" for light conditions', async () => {
      mockFetchResponses(windJson([8], [12]), marineJson([0.3]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('good');
      expect(result.current.weatherAssessment?.text).toContain('8');
    });
  });

  // ── Nullish coalescing branches ──

  describe('nullish coalescing paths', () => {
    it('uses windSpeed as fallback when windGust is null', async () => {
      mockFetchResponses(
        { hourly: { wind_speed_10m: [18], wind_gusts_10m: [null], wind_direction_10m: [180] } },
        marineJson([0.3]),
      );
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('moderate');
    });

    it('uses 0 for wave height when null', async () => {
      mockFetchResponses(windJson([8], [12]), {
        hourly: { wave_height: [null], wave_period: [6], wave_direction: [270] },
      });
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('good');
    });

    it('uses curGust when gustForecast is empty', async () => {
      mockFetchResponses(
        { hourly: { wind_speed_10m: [8], wind_gusts_10m: [], wind_direction_10m: [180] } },
        marineJson([0.3]),
      );
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment?.level).toBe('good');
    });

    it('uses windSpeed when windForecast is empty', async () => {
      mockFetchResponses(
        { hourly: { wind_speed_10m: [], wind_gusts_10m: [12], wind_direction_10m: [180] } },
        marineJson([0.3]),
      );
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherAssessment).toBeNull();
    });
  });

  // ── fetchWeather ──

  describe('fetchWeather', () => {
    it('does not fetch when pos is null', async () => {
      const ref = makeStateRef(null);
      renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sets loading true then false on success', async () => {
      mockFetchResponses(windJson([10], [15]), marineJson([0.5]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherData.error).toBeNull();
      expect(result.current.weatherData.windSpeed).toBe(10);
    });

    it('handles marine response not ok (marineJson = null)', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('marine-api')) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(windJson([10], [15])) });
      });
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherData.waveHeight).toBeNull();
      expect(result.current.weatherData.windSpeed).toBe(10);
    });

    it('sets error on fetch failure', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherData.error).toContain('Network error');
    });

    it('handles missing hourly fields with nullish coalescing', async () => {
      mockFetchResponses({ hourly: {} }, { hourly: {} });
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: true }));
      await flushPromises();
      expect(result.current.weatherData.windSpeed).toBeNull();
      expect(result.current.weatherData.waveHeight).toBeNull();
    });
  });

  // ── Effect: auto-fetch ──

  describe('auto-fetch effect', () => {
    it('fetches when isWeatherModalOpen becomes true', async () => {
      mockFetchResponses(windJson([10], [15]), marineJson([0.5]));
      const ref = makeStateRef();
      const { rerender } = renderHook(
        ({ open }) => useWeather({ stateRef: ref, isWeatherModalOpen: open }),
        { initialProps: { open: false } },
      );
      expect(fetchMock).not.toHaveBeenCalled();
      rerender({ open: true });
      await flushPromises();
      expect(fetchMock).toHaveBeenCalled();
    });

    it('does not fetch when modal stays closed', () => {
      const ref = makeStateRef();
      const { rerender } = renderHook(
        ({ open }) => useWeather({ stateRef: ref, isWeatherModalOpen: open }),
        { initialProps: { open: false } },
      );
      rerender({ open: false });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // ── Manual fetchWeather call ──

  describe('manual fetchWeather', () => {
    it('can be called independently', async () => {
      mockFetchResponses(windJson([10], [15]), marineJson([0.5]));
      const ref = makeStateRef();
      const { result } = renderHook(() => useWeather({ stateRef: ref, isWeatherModalOpen: false }));
      await act(async () => {
        await result.current.fetchWeather();
      });
      expect(result.current.weatherData.windSpeed).toBe(10);
    });
  });
});
