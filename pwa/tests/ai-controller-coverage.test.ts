import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { I18N } from '../src/modules/anchor/i18n';
import { AIController } from '../src/modules/anchor/ai-controller';

// ─── Setup ────────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  global.fetch = fetchMock as any;
  I18N.init();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────

function okResponse(data: object) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

function errorResponse(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

function aiSuccessResponse(text = 'Hello sailor') {
  return okResponse({
    candidates: [{ content: { parts: [{ text }] } }],
  });
}

function aiEmptyResponse() {
  return okResponse({ candidates: [] });
}

// ─── askWithContext tests ──────────────────────────────────────────

describe('AIController (coverage)', () => {
  describe('askWithContext', () => {
    it('formats first message with context when chat history is empty', async () => {
      fetchMock.mockReturnValue(aiSuccessResponse());
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const result = await ctrl.askWithContext('Hello', 'system', 'context', '');

      expect(result).toBe('Hello sailor');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.contents).toHaveLength(1);
      expect(body.contents[0].parts[0].text).toContain("Sailor's question:");
    });

    it('includes chat history in follow-up messages', async () => {
      fetchMock.mockReturnValue(aiSuccessResponse());
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';
      ctrl.chatHistory = [
        { role: 'user', parts: [{ text: 'prev question' }] },
        { role: 'model', parts: [{ text: 'prev answer' }] },
      ];

      await ctrl.askWithContext('Follow-up', 'system', 'context', '');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.contents.length).toBeGreaterThan(1);
      expect(body.contents[body.contents.length - 1].parts[0].text).toContain(
        'Follow-up question:',
      );
    });

    it('appends weather context when provided', async () => {
      fetchMock.mockReturnValue(aiSuccessResponse());
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      await ctrl.askWithContext('Q', 'sys', 'ctx', 'Wind 10kn');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.contents[0].parts[0].text).toContain('Wind 10kn');
    });

    it('does not append weather when empty string', async () => {
      fetchMock.mockReturnValue(aiSuccessResponse());
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      await ctrl.askWithContext('Q', 'sys', 'ctx', '');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.contents[0].parts[0].text).not.toContain('\nctx\n');
    });

    it('returns aiErrorKey on 400 status', async () => {
      fetchMock.mockReturnValue(errorResponse(400));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const result = await ctrl.askWithContext('Q', 'sys', 'ctx', '');

      expect(result).toBe(I18N.t.aiErrorKey);
    });

    it('returns aiErrorKey on 403 status', async () => {
      fetchMock.mockReturnValue(errorResponse(403));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const result = await ctrl.askWithContext('Q', 'sys', 'ctx', '');

      expect(result).toBe(I18N.t.aiErrorKey);
    });

    it('retries on 429, returns aiErrorRate on 3rd attempt (i=2)', async () => {
      fetchMock.mockReturnValue(errorResponse(429));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const resultPromise = ctrl.askWithContext('Q', 'sys', 'ctx', '');

      // Advance through retry delays: attempts 0, 1 throw 429 → retry; attempt 2 → aiErrorRate
      await vi.advanceTimersByTimeAsync(1000); // delay[0]
      await vi.advanceTimersByTimeAsync(2000); // delay[1]

      const result = await resultPromise;
      expect(result).toBe(I18N.t.aiErrorRate);
    });

    it('returns aiErrorEmpty when response has no text', async () => {
      fetchMock.mockReturnValue(aiEmptyResponse());
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const result = await ctrl.askWithContext('Q', 'sys', 'ctx', '');

      expect(result).toBe(I18N.t.aiErrorEmpty);
    });

    it('retries on generic HTTP error', async () => {
      let call = 0;
      fetchMock.mockImplementation(() => {
        call++;
        if (call === 1) return errorResponse(500);
        return aiSuccessResponse();
      });
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const resultPromise = ctrl.askWithContext('Q', 'sys', 'ctx', '');
      await vi.advanceTimersByTimeAsync(1000); // delay[0]

      const result = await resultPromise;
      expect(result).toBe('Hello sailor');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('returns aiErrorNet after all 6 retries fail', async () => {
      fetchMock.mockImplementation(() => {
        throw new Error('net fail');
      });
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const resultPromise = ctrl.askWithContext('Q', 'sys', 'ctx', '');

      // Advance through all 5 delays: 1000, 2000, 4000, 8000, 16000
      for (const delay of [1000, 2000, 4000, 8000, 16000]) {
        await vi.advanceTimersByTimeAsync(delay);
      }

      const result = await resultPromise;
      expect(result).toBe(I18N.t.aiErrorNet);
    });

    it('pushes to chatHistory on success', async () => {
      fetchMock.mockReturnValue(aiSuccessResponse('answer'));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      await ctrl.askWithContext('Q', 'sys', 'ctx', '');

      expect(ctrl.chatHistory).toHaveLength(2);
      expect(ctrl.chatHistory[0].role).toBe('user');
      expect(ctrl.chatHistory[1].role).toBe('model');
    });

    it('trims chatHistory to last 20 entries', async () => {
      fetchMock.mockReturnValue(aiSuccessResponse('answer'));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';
      // Fill history with 20 entries
      ctrl.chatHistory = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('model' as const),
        parts: [{ text: `msg${i}` }],
      }));

      await ctrl.askWithContext('Q', 'sys', 'ctx', '');

      // 20 + 2 = 22 > 20 → trimmed to last 20
      expect(ctrl.chatHistory).toHaveLength(20);
      expect(ctrl.chatHistory[ctrl.chatHistory.length - 1].parts[0].text).toBe('answer');
    });

    it('does not trim chatHistory when under limit', async () => {
      fetchMock.mockReturnValue(aiSuccessResponse('answer'));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';
      ctrl.chatHistory = [
        { role: 'user', parts: [{ text: 'q1' }] },
        { role: 'model', parts: [{ text: 'a1' }] },
      ];

      await ctrl.askWithContext('Q', 'sys', 'ctx', '');

      expect(ctrl.chatHistory).toHaveLength(4);
    });
  });

  // ─── ask tests ──────────────────────────────────────────────────

  describe('ask', () => {
    it('returns text on 200 OK', async () => {
      fetchMock.mockReturnValue(aiSuccessResponse('answer'));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const result = await ctrl.ask('prompt', 'system');

      expect(result).toBe('answer');
    });

    it('returns aiErrorKey on 400', async () => {
      fetchMock.mockReturnValue(errorResponse(400));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const result = await ctrl.ask('prompt', 'system');
      expect(result).toBe(I18N.t.aiErrorKey);
    });

    it('returns aiErrorKey on 403', async () => {
      fetchMock.mockReturnValue(errorResponse(403));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const result = await ctrl.ask('prompt', 'system');
      expect(result).toBe(I18N.t.aiErrorKey);
    });

    it('returns aiErrorRate on 429 at i=2', async () => {
      fetchMock.mockReturnValue(errorResponse(429));
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const resultPromise = ctrl.ask('prompt', 'system');
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;
      expect(result).toBe(I18N.t.aiErrorRate);
    });

    it('returns aiErrorEmpty when no text in response', async () => {
      fetchMock.mockReturnValue(aiEmptyResponse());
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const result = await ctrl.ask('prompt', 'system');
      expect(result).toBe(I18N.t.aiErrorEmpty);
    });

    it('retries on generic error and succeeds', async () => {
      let call = 0;
      fetchMock.mockImplementation(() => {
        call++;
        if (call === 1) return errorResponse(500);
        return aiSuccessResponse('recovered');
      });
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const resultPromise = ctrl.ask('prompt', 'system');
      await vi.advanceTimersByTimeAsync(1000);

      const result = await resultPromise;
      expect(result).toBe('recovered');
    });

    it('returns aiErrorNet after all retries', async () => {
      fetchMock.mockImplementation(() => {
        throw new Error('net');
      });
      const ctrl = new AIController();
      ctrl.apiKey = 'test-key';

      const resultPromise = ctrl.ask('prompt', 'system');
      for (const delay of [1000, 2000, 4000, 8000, 16000]) {
        await vi.advanceTimersByTimeAsync(delay);
      }

      const result = await resultPromise;
      expect(result).toBe(I18N.t.aiErrorNet);
    });
  });

  // ─── fetchWeather tests ──────────────────────────────────────────

  describe('fetchWeather', () => {
    const windData = {
      current: {
        wind_speed_10m: 15,
        wind_gusts_10m: 20,
        wind_direction_10m: 180,
      },
      hourly: {
        time: [new Date(Date.now() + 3600000).toISOString()],
        wind_gusts_10m: [25],
      },
    };

    const marineData = {
      current: {
        wave_height: 1.2,
        wave_direction: 270,
        wave_period: 6,
      },
    };

    it('returns formatted weather string on success with marine data', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('marine-api')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(marineData) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(windData) });
      });
      const ctrl = new AIController();

      const result = await ctrl.fetchWeather(54, 18);

      expect(result).toContain('[GPS]');
      expect(result).toContain('1.2');
    });

    it('returns wind only when marine response is not ok', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('marine-api')) {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(windData) });
      });
      const ctrl = new AIController();

      const result = await ctrl.fetchWeather(54, 18);

      expect(result).toContain('[GPS]');
      expect(result).not.toContain('1.2');
    });

    it('returns failure message on network error', async () => {
      fetchMock.mockRejectedValue(new Error('network'));
      const ctrl = new AIController();

      const result = await ctrl.fetchWeather(54, 18);

      expect(result).toContain('[GPS]');
      expect(result).toContain(I18N.t.wxAiFail);
    });

    it('handles missing gusts (uses wind speed as fallback)', async () => {
      const noGustData = {
        ...windData,
        current: { ...windData.current, wind_gusts_10m: null },
      };
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('marine-api')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(marineData) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(noGustData) });
      });
      const ctrl = new AIController();

      const result = await ctrl.fetchWeather(54, 18);

      expect(result).toContain('[GPS]');
    });

    it('handles hourly.time with no future timestamps (findIndex returns -1 or 0)', async () => {
      const pastTimeData = {
        ...windData,
        hourly: {
          time: [new Date(Date.now() - 3600000).toISOString()],
          wind_gusts_10m: [30],
        },
      };
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('marine-api')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(marineData) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(pastTimeData) });
      });
      const ctrl = new AIController();

      const result = await ctrl.fetchWeather(54, 18);

      expect(result).toContain('[GPS]');
    });

    it('handles empty hourly gusts array', async () => {
      const emptyGustsData = {
        ...windData,
        hourly: {
          time: [],
          wind_gusts_10m: [],
        },
      };
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('marine-api')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(marineData) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(emptyGustsData) });
      });
      const ctrl = new AIController();

      const result = await ctrl.fetchWeather(54, 18);

      expect(result).toContain('[GPS]');
    });
  });
});
