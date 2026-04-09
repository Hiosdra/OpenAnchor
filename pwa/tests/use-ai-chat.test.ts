import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Mock AIController before importing the hook ──────────────────

const mockAiCtrl = vi.hoisted(() => ({
  apiKey: '' as string,
  buildContextPrompt: vi.fn(() => 'context'),
  askWithContext: vi.fn(),
  fetchWeather: vi.fn(),
  clearChat: vi.fn(),
  setKey: vi.fn(),
  clearKey: vi.fn(),
}));

vi.mock('../src/modules/anchor/ai-controller', () => ({
  AIController: function () {
    return mockAiCtrl;
  },
}));

import { useAIChat } from '../src/modules/anchor/hooks/useAIChat';

// ─── Helpers ──────────────────────────────────────────────────────

function makeParams(overrides: Record<string, any> = {}) {
  return {
    stateRef: {
      current: {
        currentPos: { lat: 54, lng: 18 },
        isAnchored: true,
        anchorPos: { lat: 54, lng: 18 },
        radius: 50,
        anchorStartTime: Date.now(),
        alarmCount: 0,
        distance: 10,
        alarmState: 'SAFE',
        maxDistanceSwing: 15,
        maxSogDuringAnchor: 0.5,
        chainLengthM: 30,
        depthM: 8,
        accuracy: 3,
        sessionId: 1,
        ...overrides.state,
      },
    } as any,
    session: {
      db: {
        current: {
          db: {
            addLogbookEntry: vi.fn().mockResolvedValue(undefined),
            getLogbookEntries: vi.fn().mockResolvedValue([]),
          },
        },
      },
      ...overrides.session,
    },
    openModal: vi.fn(),
    closeModal: vi.fn(),
    isAiModalOpen: overrides.isAiModalOpen ?? false,
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAiCtrl.apiKey = 'test-key';
  mockAiCtrl.buildContextPrompt.mockReturnValue('context');
  mockAiCtrl.askWithContext.mockResolvedValue('AI response');
  mockAiCtrl.fetchWeather.mockResolvedValue('weather info');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────

describe('useAIChat', () => {
  // ── hasAiKey initialization ──

  describe('hasAiKey', () => {
    it('is true when apiKey exists', () => {
      mockAiCtrl.apiKey = 'my-key';
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));
      expect(result.current.hasAiKey).toBe(true);
    });

    it('is false when apiKey is empty', () => {
      mockAiCtrl.apiKey = '';
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));
      expect(result.current.hasAiKey).toBe(false);
    });
  });

  // ── API key redirect effect ──

  describe('AI modal redirect when no API key', () => {
    it('redirects to apiKey modal when ai modal opens without key', async () => {
      mockAiCtrl.apiKey = '';
      const params = makeParams({ isAiModalOpen: true });
      renderHook(() => useAIChat(params));

      await waitFor(() => {
        expect(params.closeModal).toHaveBeenCalledWith('ai');
        expect(params.openModal).toHaveBeenCalledWith('apiKey');
      });
    });

    it('does not redirect when ai modal opens with key', () => {
      mockAiCtrl.apiKey = 'valid-key';
      const params = makeParams({ isAiModalOpen: true });
      renderHook(() => useAIChat(params));

      expect(params.closeModal).not.toHaveBeenCalled();
    });

    it('does not redirect when ai modal is closed', () => {
      mockAiCtrl.apiKey = '';
      const params = makeParams({ isAiModalOpen: false });
      renderHook(() => useAIChat(params));

      expect(params.closeModal).not.toHaveBeenCalled();
    });
  });

  // ── handleAiSendMessage ──

  describe('handleAiSendMessage', () => {
    it('adds user and assistant messages', async () => {
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('Hello');
      });

      expect(result.current.chatMessages).toHaveLength(2);
      expect(result.current.chatMessages[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(result.current.chatMessages[1]).toEqual({ role: 'assistant', content: 'AI response' });
    });

    it('sets and clears aiLoading', async () => {
      let resolveAsk!: (v: string) => void;
      mockAiCtrl.askWithContext.mockImplementation(
        () =>
          new Promise<string>((r) => {
            resolveAsk = r;
          }),
      );
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      let sendPromise: Promise<void>;
      await act(async () => {
        sendPromise = result.current.handleAiSendMessage('Hello');
      });

      // aiLoading should be true while waiting
      expect(result.current.aiLoading).toBe(true);

      await act(async () => {
        resolveAsk('done');
        await sendPromise!;
      });

      expect(result.current.aiLoading).toBe(false);
    });

    it('fetches weather when currentPos exists', async () => {
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('weather?');
      });

      expect(mockAiCtrl.fetchWeather).toHaveBeenCalledWith(54, 18);
    });

    it('skips weather when currentPos is null', async () => {
      const params = makeParams({ state: { currentPos: null } });
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('weather?');
      });

      expect(mockAiCtrl.fetchWeather).not.toHaveBeenCalled();
    });

    it('ignores weather fetch errors', async () => {
      mockAiCtrl.fetchWeather.mockRejectedValue(new Error('fail'));
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('test');
      });

      // Should still get AI response
      expect(result.current.chatMessages).toHaveLength(2);
    });

    it('parses logbook entry from SUMMARY:/LOG:/SAFETY: response', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue(
        'SUMMARY: Anchored safely\nLOG: Dropped anchor at 18:00\nSAFETY: Check depth',
      );
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('logbook');
      });

      expect(result.current.logbookEntry).toEqual({
        summary: 'Anchored safely',
        logEntry: 'Dropped anchor at 18:00',
        safetyNote: 'Check depth',
      });
    });

    it('does not set logbook when SUMMARY/LOG format is missing', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue('Just a normal response');
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('test');
      });

      expect(result.current.logbookEntry).toBeNull();
    });

    it('does not set logbook when SUMMARY is present but LOG is missing', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue('SUMMARY: foo\nNo log here');
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('test');
      });

      expect(result.current.logbookEntry).toBeNull();
    });

    it('handles missing SAFETY field (defaults to empty string via ??)', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue('SUMMARY: Anchored\nLOG: All good');
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('logbook');
      });

      expect(result.current.logbookEntry?.safetyNote).toBe('');
    });

    it('handles regex match failure when includes returns true but match returns null', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue('SUMMARY:\nLOG:');
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('test');
      });

      // SUMMARY: and LOG: are present but regex .+ requires content after colon
      // summaryMatch is null → logbookEntry stays null
      expect(result.current.logbookEntry).toBeNull();
    });
  });

  // ── handleAiClearChat ──

  describe('handleAiClearChat', () => {
    it('clears chat messages and logbook entry', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue('SUMMARY: x\nLOG: y');
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('test');
      });
      expect(result.current.chatMessages).toHaveLength(2);

      act(() => result.current.handleAiClearChat());

      expect(result.current.chatMessages).toHaveLength(0);
      expect(result.current.logbookEntry).toBeNull();
      expect(mockAiCtrl.clearChat).toHaveBeenCalled();
    });
  });

  // ── handleSaveLogbook ──

  describe('handleSaveLogbook', () => {
    it('returns early when logbookEntry is null', async () => {
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleSaveLogbook();
      });

      expect(params.session.db.current.db.addLogbookEntry).not.toHaveBeenCalled();
    });

    it('returns early when sessionId is null', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue('SUMMARY: x\nLOG: y');
      const params = makeParams({ state: { sessionId: null } });
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('logbook');
      });
      await act(async () => {
        await result.current.handleSaveLogbook();
      });

      expect(params.session.db.current.db.addLogbookEntry).not.toHaveBeenCalled();
    });

    it('saves logbook entry when both logbookEntry and sessionId exist', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue(
        'SUMMARY: Anchored safely\nLOG: Dropped at 18:00\nSAFETY: Check depth',
      );
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('logbook');
      });
      await act(async () => {
        await result.current.handleSaveLogbook();
      });

      expect(params.session.db.current.db.addLogbookEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 1,
          summary: 'Anchored safely',
          logEntry: 'Dropped at 18:00',
          safetyNote: 'Check depth',
          isAiGenerated: true,
        }),
      );
    });

    it('skips save when db.db is null', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue('SUMMARY: x\nLOG: y');
      const params = makeParams({ session: { db: { current: { db: null } } } });
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('logbook');
      });
      await act(async () => {
        await result.current.handleSaveLogbook();
      });
      // No throw, no call
    });

    it('catches save errors and logs warning', async () => {
      mockAiCtrl.askWithContext.mockResolvedValue('SUMMARY: x\nLOG: y');
      const params = makeParams();
      params.session.db.current.db.addLogbookEntry.mockRejectedValue(new Error('DB error'));
      const { result } = renderHook(() => useAIChat(params));

      await act(async () => {
        await result.current.handleAiSendMessage('logbook');
      });
      await act(async () => {
        await result.current.handleSaveLogbook();
      });

      expect(console.warn).toHaveBeenCalledWith('Failed to save logbook entry:', expect.any(Error));
    });
  });

  // ── handleSaveApiKey ──

  describe('handleSaveApiKey', () => {
    it('sets the key, updates hasAiKey, and switches modals', () => {
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      act(() => result.current.handleSaveApiKey('new-key'));

      expect(mockAiCtrl.setKey).toHaveBeenCalledWith('new-key');
      expect(result.current.hasAiKey).toBe(true);
      expect(params.closeModal).toHaveBeenCalledWith('apiKey');
      expect(params.openModal).toHaveBeenCalledWith('ai');
    });
  });

  // ── handleClearApiKey ──

  describe('handleClearApiKey', () => {
    it('clears the key and sets hasAiKey false', () => {
      const params = makeParams();
      const { result } = renderHook(() => useAIChat(params));

      act(() => result.current.handleClearApiKey());

      expect(mockAiCtrl.clearKey).toHaveBeenCalled();
      expect(result.current.hasAiKey).toBe(false);
    });
  });
});
