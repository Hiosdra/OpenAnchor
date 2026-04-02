import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AILogbookController } from '../src/modules/anchor/controllers/ai-logbook.controller';

vi.mock('marked', () => ({ marked: { parse: (s: string) => `<p>${s}</p>` } }));
vi.mock('lucide', () => ({ createIcons: vi.fn(), icons: {} }));

function makeState(overrides = {}) {
  return {
    unit: 'm', isAnchored: false, anchorPos: null, currentPos: null,
    accuracy: 5, distance: 0, radius: 50, anchorStartTime: null,
    maxDistanceSwing: 0, maxSogDuringAnchor: 0, chainLengthM: null,
    depthM: null, alarmState: 'SAFE', sessionId: null, alarmCount: 0,
    sog: 0, cog: null,
    ...overrides,
  } as any;
}

function makeMockDb() {
  return {
    db: {},
    getStats: vi.fn().mockResolvedValue({ totalSessions: 5, totalAlarms: 2 }),
    getTrackPoints: vi.fn().mockResolvedValue([]),
    getSession: vi.fn().mockResolvedValue({ alarmCount: 0 }),
    addLogbookEntry: vi.fn().mockResolvedValue(1),
  } as any;
}

function makeMockAiCtrl() {
  return {
    apiKey: 'test-key',
    buildContextPrompt: vi.fn(() => 'context'),
    fetchWeather: vi.fn().mockResolvedValue('weather data'),
    askWithContext: vi.fn().mockResolvedValue('AI response text'),
    ask: vi.fn().mockResolvedValue('SUMMARY: Test summary\nLOG: Test log entry\nSAFETY: All good'),
    clearChat: vi.fn(),
    pendingAction: null,
  } as any;
}

function setupDom() {
  const ids = [
    'ai-chat-input', 'ai-chat-area', 'ai-chat-placeholder',
    'ai-clear-chat-btn', 'ai-ask-btn', 'ai-depth', 'ai-chain',
    'ai-wind', 'ai-context-badge',
    'ai-summary-modal', 'ai-summary-loader', 'ai-summary-content',
    'ai-summary-raw', 'ai-summary-summary', 'ai-summary-log',
    'ai-summary-safety-text',
  ];
  ids.forEach(id => {
    let el: HTMLElement;
    if (id === 'ai-chat-input' || id === 'ai-depth' || id === 'ai-chain' || id === 'ai-wind') {
      el = document.createElement('input');
    } else if (id === 'ai-ask-btn') {
      el = document.createElement('button');
    } else {
      el = document.createElement('div');
    }
    el.id = id;
    el.classList.add('hidden');
    document.body.appendChild(el);
  });
  // ai-bottom needs to be a select
  const select = document.createElement('select');
  select.id = 'ai-bottom';
  const opt = document.createElement('option');
  opt.value = 'sand'; opt.textContent = 'Sand';
  select.appendChild(opt);
  document.body.appendChild(select);
}

function cleanDom() {
  [
    'ai-chat-input', 'ai-chat-area', 'ai-chat-placeholder',
    'ai-clear-chat-btn', 'ai-ask-btn', 'ai-depth', 'ai-chain',
    'ai-wind', 'ai-bottom', 'ai-context-badge',
    'ai-summary-modal', 'ai-summary-loader', 'ai-summary-content',
    'ai-summary-raw', 'ai-summary-summary', 'ai-summary-log',
    'ai-summary-safety-text',
  ].forEach(id => document.getElementById(id)?.remove());
}

describe('AILogbookController', () => {
  let ctrl: AILogbookController;
  let state: ReturnType<typeof makeState>;
  let db: ReturnType<typeof makeMockDb>;
  let aiCtrl: ReturnType<typeof makeMockAiCtrl>;

  beforeEach(() => {
    setupDom();
    state = makeState();
    db = makeMockDb();
    aiCtrl = makeMockAiCtrl();
    ctrl = new AILogbookController(state, db, aiCtrl);
  });

  afterEach(() => {
    cleanDom();
  });

  describe('handleAskAI', () => {
    it('does nothing when input is empty', async () => {
      (document.getElementById('ai-chat-input') as HTMLInputElement).value = '';
      await ctrl.handleAskAI();
      expect(aiCtrl.askWithContext).not.toHaveBeenCalled();
    });

    it('sends question to AI and renders response', async () => {
      (document.getElementById('ai-chat-input') as HTMLInputElement).value = 'Is my anchor safe?';
      await ctrl.handleAskAI();
      expect(aiCtrl.buildContextPrompt).toHaveBeenCalled();
      expect(aiCtrl.askWithContext).toHaveBeenCalled();
      const chatArea = document.getElementById('ai-chat-area')!;
      expect(chatArea.innerHTML).toContain('Is my anchor safe?');
      expect(chatArea.innerHTML).toContain('AI response text');
    });

    it('fetches weather context when position is available', async () => {
      state.currentPos = { lat: 50, lng: 14 };
      (document.getElementById('ai-chat-input') as HTMLInputElement).value = 'Weather?';
      await ctrl.handleAskAI();
      expect(aiCtrl.fetchWeather).toHaveBeenCalledWith(50, 14);
    });
  });

  describe('clearAIChat', () => {
    it('clears chat area and history', () => {
      ctrl.clearAIChat();
      expect(aiCtrl.clearChat).toHaveBeenCalled();
      const chatArea = document.getElementById('ai-chat-area')!;
      expect(chatArea.innerHTML).toContain('ai-chat-placeholder');
      expect(document.getElementById('ai-clear-chat-btn')!.classList.contains('hidden')).toBe(true);
    });
  });

  describe('generateLogbookEntry', () => {
    it('does nothing without anchorStartTime', async () => {
      state.anchorStartTime = null;
      await ctrl.generateLogbookEntry();
      expect(aiCtrl.ask).not.toHaveBeenCalled();
    });

    it('does nothing without apiKey', async () => {
      state.anchorStartTime = Date.now() - 60000;
      aiCtrl.apiKey = '';
      await ctrl.generateLogbookEntry();
      expect(aiCtrl.ask).not.toHaveBeenCalled();
    });

    it('generates and parses logbook entry', async () => {
      state.anchorStartTime = Date.now() - 3600000;
      state.anchorPos = { lat: 50, lng: 14 } as any;
      state.sessionId = 1;
      await ctrl.generateLogbookEntry();
      expect(aiCtrl.ask).toHaveBeenCalled();
      expect(document.getElementById('ai-summary-summary')!.textContent).toBe('Test summary');
      expect(document.getElementById('ai-summary-log')!.textContent).toBe('Test log entry');
    });

    it('handles unparseable response gracefully', async () => {
      state.anchorStartTime = Date.now() - 3600000;
      aiCtrl.ask.mockResolvedValue('Just a plain response without structure');
      await ctrl.generateLogbookEntry();
      expect(document.getElementById('ai-summary-raw')!.classList.contains('hidden')).toBe(false);
    });
  });

  describe('saveLogbookEntry', () => {
    it('does nothing without sessionId', async () => {
      state.sessionId = null;
      await ctrl.saveLogbookEntry();
      expect(db.addLogbookEntry).not.toHaveBeenCalled();
    });

    it('saves entry to database after generation', async () => {
      state.anchorStartTime = Date.now() - 3600000;
      state.anchorPos = { lat: 50, lng: 14 } as any;
      state.sessionId = 1;
      await ctrl.generateLogbookEntry();
      await ctrl.saveLogbookEntry();
      expect(db.addLogbookEntry).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 1,
        summary: 'Test summary',
        logEntry: 'Test log entry',
        isAiGenerated: true,
      }));
    });
  });
});
