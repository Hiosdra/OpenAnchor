/**
 * Integration tests for anchor module App.tsx orchestrator.
 *
 * These tests render the full AnchorApp component (inside I18nProvider)
 * and verify key integration behaviours: onboarding flow, anchor button,
 * GPS initialization, beforeunload handling, and cleanup on unmount.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import React from 'react';

import {
  installMockGeolocation,
  createMockGeolocation,
} from './mocks/geolocation';
import { installMockWakeLock, installMockBattery } from './mocks/wake-lock';
import { installMockAudioContext } from './mocks/web-audio';
import { setupLeafletMock } from './mocks/leaflet';

// ─── Leaflet mock (must be called before any import of App) ───
setupLeafletMock();

// ─── Mock lucide-react icons ───
const icon = (name: string) => {
  const Comp = (props: any) => <span data-icon={name} {...props} />;
  Comp.displayName = name;
  return Comp;
};
vi.mock('lucide-react', () => ({
  AlertCircle: icon('AlertCircle'),
  AlertTriangle: icon('AlertTriangle'),
  Anchor: icon('Anchor'),
  BarChart3: icon('BarChart3'),
  BatteryWarning: icon('BatteryWarning'),
  BellOff: icon('BellOff'),
  BookOpen: icon('BookOpen'),
  Bot: icon('Bot'),
  Calculator: icon('Calculator'),
  CalendarClock: icon('CalendarClock'),
  Clock: icon('Clock'),
  ClipboardList: icon('ClipboardList'),
  CloudLightning: icon('CloudLightning'),
  CloudSun: icon('CloudSun'),
  Crosshair: icon('Crosshair'),
  Download: icon('Download'),
  FileSpreadsheet: icon('FileSpreadsheet'),
  History: icon('History'),
  Key: icon('Key'),
  Layers: icon('Layers'),
  Loader2: icon('Loader2'),
  Map: icon('Map'),
  MapPinOff: icon('MapPinOff'),
  MessageCircle: icon('MessageCircle'),
  Monitor: icon('Monitor'),
  Moon: icon('Moon'),
  MoveDownLeft: icon('MoveDownLeft'),
  PieChart: icon('PieChart'),
  PlayCircle: icon('PlayCircle'),
  Plus: icon('Plus'),
  QrCode: icon('QrCode'),
  Radar: icon('Radar'),
  Ruler: icon('Ruler'),
  Satellite: icon('Satellite'),
  SatelliteDish: icon('SatelliteDish'),
  Save: icon('Save'),
  Send: icon('Send'),
  Share2: icon('Share2'),
  ShieldCheck: icon('ShieldCheck'),
  Siren: icon('Siren'),
  Smartphone: icon('Smartphone'),
  Sparkles: icon('Sparkles'),
  SunDim: icon('SunDim'),
  Timer: icon('Timer'),
  Trash2: icon('Trash2'),
  Wifi: icon('Wifi'),
  X: icon('X'),
}));

// ─── Mock session-db (avoid real IndexedDB) ───
vi.mock('../src/modules/anchor/session-db', () => ({
  SessionDB: class {
    open = vi.fn().mockResolvedValue(undefined);
    getActiveState = vi.fn().mockResolvedValue(null);
    createSession = vi.fn().mockResolvedValue(1);
    updateSession = vi.fn().mockResolvedValue(undefined);
    clearActiveState = vi.fn().mockResolvedValue(undefined);
    saveActiveState = vi.fn().mockResolvedValue(undefined);
    addTrackPointsBatch = vi.fn().mockResolvedValue(undefined);
    getAllSessions = vi.fn().mockResolvedValue([]);
    getSession = vi.fn().mockResolvedValue(undefined);
    getTrackPoints = vi.fn().mockResolvedValue([]);
    deleteSession = vi.fn().mockResolvedValue(undefined);
    getLogbookEntries = vi.fn().mockResolvedValue([]);
    getStats = vi.fn().mockResolvedValue({
      totalSessions: 0,
      totalAlarms: 0,
      totalDuration: 0,
      maxDistance: 0,
      maxSog: 0,
      avgDuration: 0,
    });
    db = {};
  },
}));

// ─── Mock ai-controller (avoid real fetch calls) ───
vi.mock('../src/modules/anchor/ai-controller', () => ({
  AIController: class {
    apiKey = null;
    setApiKey = vi.fn();
    clearApiKey = vi.fn();
    chat = vi.fn().mockResolvedValue({ text: '' });
    generateLogbook = vi.fn().mockResolvedValue(null);
  },
}));

// ─── Mock html5-qrcode (avoid DOM scanner) ───
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  })),
}));

// ─── Browser API mocks ───
let geo: ReturnType<typeof createMockGeolocation>;
let audioMock: ReturnType<typeof installMockAudioContext>;

beforeEach(() => {
  localStorage.clear();
  // Set English for readable assertions
  localStorage.setItem('oa_lang', 'en');

  geo = installMockGeolocation();
  installMockWakeLock();
  installMockBattery();
  audioMock = installMockAudioContext();
  navigator.vibrate = vi.fn();

  // Minimal Notification stub
  if (typeof globalThis.Notification === 'undefined') {
    (globalThis as any).Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
  }
});

afterEach(() => {
  cleanup();
  audioMock.restore();
  vi.restoreAllMocks();
});

// ─── Helpers ───

async function renderApp() {
  const { App } = await import('../src/modules/anchor/App');
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<App />);
  });
  // Wait for the async init() to settle
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  return result!;
}

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

describe('AnchorApp integration', () => {
  it('renders without crashing', async () => {
    const { container } = await renderApp();
    expect(container.querySelector('#app-body')).toBeTruthy();
  });

  it('shows onboarding overlay on first load', async () => {
    await renderApp();
    expect(screen.getByText('Welcome Aboard!')).toBeTruthy();
  });

  it('skips onboarding when already completed', async () => {
    localStorage.setItem('anchor_onboarding_done', '1');
    await renderApp();
    expect(screen.queryByText('Welcome Aboard!')).toBeNull();
  });

  it('dismisses onboarding via Skip button', async () => {
    await renderApp();
    expect(screen.getByText('Welcome Aboard!')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByText('Skip'));
    });

    expect(screen.queryByText('Welcome Aboard!')).toBeNull();
    expect(localStorage.getItem('anchor_onboarding_done')).toBe('1');
  });

  it('renders the main anchor button with "Drop Anchor" text', async () => {
    localStorage.setItem('anchor_onboarding_done', '1');
    await renderApp();
    expect(screen.getByText('Drop Anchor')).toBeTruthy();
  });

  it('anchor button is disabled when no GPS fix', async () => {
    localStorage.setItem('anchor_onboarding_done', '1');
    await renderApp();

    const btn = screen.getByText('Drop Anchor').closest('button')!;
    expect(btn.disabled).toBe(true);
  });

  it('calls navigator.geolocation.watchPosition on mount', async () => {
    localStorage.setItem('anchor_onboarding_done', '1');
    await renderApp();
    expect(geo.watchPosition).toHaveBeenCalled();
  });

  it('registers a beforeunload handler', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    localStorage.setItem('anchor_onboarding_done', '1');
    await renderApp();

    const beforeUnloadCalls = addSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(beforeUnloadCalls.length).toBeGreaterThanOrEqual(1);
    addSpy.mockRestore();
  });

  it('cleans up GPS watch on unmount', async () => {
    localStorage.setItem('anchor_onboarding_done', '1');
    const { unmount } = await renderApp();

    await act(async () => {
      unmount();
    });

    expect(geo.clearWatch).toHaveBeenCalled();
  });

  it('renders Header with app title', async () => {
    localStorage.setItem('anchor_onboarding_done', '1');
    await renderApp();
    expect(screen.getByText(/Anchor Alert/i)).toBeTruthy();
  });

  it('renders the map container element', async () => {
    localStorage.setItem('anchor_onboarding_done', '1');
    const { container } = await renderApp();
    expect(container.querySelector('#map')).toBeTruthy();
  });

  it('renders Dashboard with metric values', async () => {
    localStorage.setItem('anchor_onboarding_done', '1');
    const { container } = await renderApp();
    // Dashboard shows metric IDs
    expect(container.querySelector('#val-dist')).toBeTruthy();
    expect(container.querySelector('#val-sog')).toBeTruthy();
    expect(container.querySelector('#val-cog')).toBeTruthy();
  });
});
