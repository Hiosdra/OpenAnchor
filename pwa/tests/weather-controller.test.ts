import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeatherController } from '../src/modules/anchor/controllers/weather.controller';

function makeState(overrides = {}) {
  return { currentPos: null, ...overrides } as any;
}

function setupDom() {
  const ids = [
    'weather-loading', 'weather-content', 'weather-error',
    'wx-wind-speed', 'wx-wind-gust', 'wx-wind-dir',
    'wx-wave-height', 'wx-wave-period', 'wx-wave-dir',
    'wx-wind-chart', 'wx-wave-chart', 'wx-assessment-text',
  ];
  ids.forEach(id => {
    const el = document.createElement('div');
    el.id = id;
    el.classList.add('hidden');
    document.body.appendChild(el);
  });
}

function cleanDom() {
  [
    'weather-loading', 'weather-content', 'weather-error',
    'wx-wind-speed', 'wx-wind-gust', 'wx-wind-dir',
    'wx-wave-height', 'wx-wave-period', 'wx-wave-dir',
    'wx-wind-chart', 'wx-wave-chart', 'wx-assessment-text',
  ].forEach(id => document.getElementById(id)?.remove());
}

describe('WeatherController', () => {
  let ctrl: WeatherController;
  let state: ReturnType<typeof makeState>;

  beforeEach(() => {
    setupDom();
    state = makeState();
    ctrl = new WeatherController(state);
  });

  afterEach(() => {
    cleanDom();
    vi.restoreAllMocks();
  });

  it('fetchWeatherData shows error when no GPS position', async () => {
    state.currentPos = null;
    await ctrl.fetchWeatherData();
    const errEl = document.getElementById('weather-error')!;
    expect(errEl.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('weather-loading')!.classList.contains('hidden')).toBe(true);
  });

  it('fetchWeatherData fetches and displays weather', async () => {
    state.currentPos = { lat: 50, lng: 14 };
    const windData = {
      current: { wind_speed_10m: 12, wind_gusts_10m: 18, wind_direction_10m: 225 },
      hourly: { time: [new Date(Date.now() + 3600000).toISOString()], wind_speed_10m: [12], wind_gusts_10m: [18] },
    };
    const marineData = {
      current: { wave_height: 0.5, wave_period: 6, wave_direction: 180 },
      hourly: { time: [new Date(Date.now() + 3600000).toISOString()], wave_height: [0.5], wave_period: [6] },
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('marine-api')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(marineData) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(windData) } as Response);
    });

    await ctrl.fetchWeatherData();

    expect(document.getElementById('wx-wind-speed')!.textContent).toBe('12');
    expect(document.getElementById('wx-wind-gust')!.textContent).toBe('18');
    expect(document.getElementById('wx-wind-dir')!.textContent).toBe('SW');
    expect(document.getElementById('wx-wave-height')!.textContent).toBe('0.5');
    expect(document.getElementById('weather-content')!.classList.contains('hidden')).toBe(false);
  });

  it('fetchWeatherData handles API error gracefully', async () => {
    state.currentPos = { lat: 50, lng: 14 };
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    await ctrl.fetchWeatherData();

    const errEl = document.getElementById('weather-error')!;
    expect(errEl.classList.contains('hidden')).toBe(false);
    expect(errEl.textContent).toContain('Network error');
  });

  describe('renderBarChart', () => {
    it('renders bars for values', () => {
      ctrl.renderBarChart('wx-wind-chart', [10, 20, 30], [15, 25, 35], 'kn');
      const container = document.getElementById('wx-wind-chart')!;
      expect(container.children.length).toBe(3);
    });

    it('shows no-data message for empty values', () => {
      ctrl.renderBarChart('wx-wind-chart', [], [], 'kn');
      const container = document.getElementById('wx-wind-chart')!;
      expect(container.innerHTML).toContain('text-slate-500');
    });

    it('uses correct color coding', () => {
      ctrl.renderBarChart('wx-wind-chart', [5, 20, 30], [], 'kn');
      const container = document.getElementById('wx-wind-chart')!;
      const bars = container.querySelectorAll('.weather-bar');
      expect(bars[0].className).toContain('bg-cyan-400');
      expect(bars[1].className).toContain('bg-orange-400');
      expect(bars[2].className).toContain('bg-red-500');
    });
  });

  describe('renderWeatherAssessment', () => {
    it('shows good conditions for light wind', () => {
      ctrl.renderWeatherAssessment(8, 12, 0.3, [8, 10], [12, 14]);
      const text = document.getElementById('wx-assessment-text')!.innerHTML;
      expect(text).toContain('🟢');
    });

    it('shows danger for extreme conditions', () => {
      ctrl.renderWeatherAssessment(30, 40, 3.0, [30], [40]);
      const text = document.getElementById('wx-assessment-text')!.innerHTML;
      expect(text).toContain('🔴');
    });

    it('shows caution for moderate conditions', () => {
      ctrl.renderWeatherAssessment(18, 28, 1.0, [18], [28]);
      const text = document.getElementById('wx-assessment-text')!.innerHTML;
      expect(text).toContain('🟡');
    });

    it('shows orange for moderate wind/gust', () => {
      ctrl.renderWeatherAssessment(18, 22, 0.5, [18], [22]);
      const text = document.getElementById('wx-assessment-text')!.innerHTML;
      expect(text).toContain('🟠');
    });
  });
});
