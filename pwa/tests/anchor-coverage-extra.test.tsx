/**
 * Additional branch-coverage tests for anchor module.
 *
 * Targets:
 *  - useAlertController.ts (~18 uncovered branches)
 *  - SessionModal.tsx       (~17 uncovered branches)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { createMockAudioContext } from './mocks/web-audio';
import { createMockWakeLock, createMockBattery } from './mocks/wake-lock';

// =====================================================================
// useAlertController — additional branch coverage
// =====================================================================
describe('useAlertController — extra branches', () => {
  let mockAudioCtx: ReturnType<typeof createMockAudioContext>;
  let mockWakeLock: ReturnType<typeof createMockWakeLock>;
  let mockBattery: ReturnType<typeof createMockBattery>;

  beforeEach(() => {
    vi.useFakeTimers();

    mockAudioCtx = createMockAudioContext();
    (globalThis as any).AudioContext = vi.fn(function (this: any) {
      Object.assign(this, mockAudioCtx);
      return mockAudioCtx;
    });

    mockWakeLock = createMockWakeLock();
    Object.defineProperty(navigator, 'wakeLock', {
      value: mockWakeLock,
      configurable: true,
    });

    mockBattery = createMockBattery();
    (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);
    navigator.vibrate = vi.fn();

    (globalThis as any).Notification = {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (globalThis as any).AudioContext;
    delete (globalThis as any).Notification;
  });

  async function importHook() {
    const mod = await import('../src/modules/anchor/hooks/useAlertController');
    return mod.useAlertController;
  }

  // ── playBeep branches ──

  it('playBeep does nothing when no AudioContext', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    // Don't call ensureAudioContext — audioCtxRef is null
    act(() => {
      result.current.playBeep('square');
    });
    // Should not throw, no oscillator created
    expect(mockAudioCtx.createOscillator).not.toHaveBeenCalled();
  });

  it('playBeep resumes suspended AudioContext', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
    });

    // Mark context as suspended
    mockAudioCtx.state = 'suspended';

    act(() => {
      result.current.playBeep('square');
    });
    expect(mockAudioCtx.resume).toHaveBeenCalled();
  });

  it('playBeep warning type', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.playBeep('warning');
    });
    expect(mockAudioCtx._oscillator.type).toBe('triangle');
  });

  it('playBeep sine type with linear ramp', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.playBeep('sine');
    });
    expect(mockAudioCtx._oscillator.type).toBe('sine');
    expect(mockAudioCtx._gainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
  });

  // ── ensureAudioContext with webkitAudioContext fallback ──

  it('falls back to webkitAudioContext', async () => {
    delete (globalThis as any).AudioContext;
    const webkitCtx = createMockAudioContext();
    (globalThis as any).webkitAudioContext = vi.fn(function (this: any) {
      Object.assign(this, webkitCtx);
      return webkitCtx;
    });

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
    });
    expect(globalThis.webkitAudioContext).toHaveBeenCalled();

    delete (globalThis as any).webkitAudioContext;
  });

  // ── requestWakeLock when wakeLock not in navigator ──

  it('requestWakeLock is no-op when wakeLock not available', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: undefined,
      configurable: true,
    });

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      await result.current.requestWakeLock();
    });
    // No error thrown
  });

  it('requestWakeLock handles errors', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    // Should not throw
    await act(async () => {
      await result.current.requestWakeLock();
    });
  });

  // ── releaseWakeLock when no sentinel ──

  it('releaseWakeLock is no-op when no sentinel', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    // Don't acquire wake lock — sentinel is null
    act(() => {
      result.current.releaseWakeLock();
    });
    // No error thrown
  });

  // ── sendNotification branches ──

  it('sendNotification sends via service worker', async () => {
    const mockShowNotification = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          showNotification: mockShowNotification,
        }),
        controller: null,
        addEventListener: vi.fn(),
      },
      configurable: true,
    });

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      result.current.sendNotification('Test Title', 'Test Body');
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockShowNotification).toHaveBeenCalledWith(
      'Test Title',
      expect.objectContaining({ body: 'Test Body' }),
    );
  });

  it('sendNotification falls back to new Notification when SW fails', async () => {
    const mockNotificationConstructor = vi.fn();
    (globalThis as any).Notification = Object.assign(mockNotificationConstructor, {
      permission: 'granted',
      requestPermission: vi.fn(),
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          showNotification: vi.fn().mockRejectedValue(new Error('SW failed')),
        }),
        controller: null,
        addEventListener: vi.fn(),
      },
      configurable: true,
    });

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      result.current.sendNotification('Fallback', 'Body');
      await vi.advanceTimersByTimeAsync(10);
    });
  });

  it('sendNotification does nothing when permission not granted', async () => {
    (globalThis as any).Notification = {
      permission: 'denied',
      requestPermission: vi.fn(),
    };

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.sendNotification('Title', 'Body');
    });
    // No error thrown, nothing happens
  });

  it('sendNotification does nothing when Notification not available', async () => {
    delete (globalThis as any).Notification;

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.sendNotification('Title', 'Body');
    });
    // No error
  });

  // ── initPermissions branches ──

  it('initPermissions skips notification request when already granted', async () => {
    (globalThis as any).Notification = {
      permission: 'granted',
      requestPermission: vi.fn(),
    };

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      result.current.initPermissions();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('initPermissions skips notification request when denied', async () => {
    (globalThis as any).Notification = {
      permission: 'denied',
      requestPermission: vi.fn(),
    };

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      result.current.initPermissions();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('initPermissions requests when permission is default', async () => {
    (globalThis as any).Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    await act(async () => {
      result.current.initPermissions();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(Notification.requestPermission).toHaveBeenCalled();
  });

  // ── Battery monitoring branches ──

  it('skips battery monitoring when getBattery not available', async () => {
    delete (navigator as any).getBattery;

    const useAlertController = await importHook();
    renderHook(() => useAlertController());

    // No error — just doesn't set up battery monitoring
  });

  it('does not fire onLowBattery when battery > 15%', async () => {
    mockBattery.level = 0.5;
    mockBattery.charging = false;

    const onLowBattery = vi.fn();
    const useAlertController = await importHook();
    renderHook(() =>
      useAlertController({
        onLowBattery,
        isAnchored: () => true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const checkFn = mockBattery.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === 'levelchange',
    )?.[1] as (() => void) | undefined;

    act(() => {
      checkFn?.();
    });
    expect(onLowBattery).not.toHaveBeenCalled();
  });

  it('does not fire onLowBattery when charging', async () => {
    mockBattery.level = 0.1;
    mockBattery.charging = true;

    const onLowBattery = vi.fn();
    const useAlertController = await importHook();
    renderHook(() =>
      useAlertController({
        onLowBattery,
        isAnchored: () => true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const checkFn = mockBattery.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === 'levelchange',
    )?.[1] as (() => void) | undefined;

    act(() => {
      checkFn?.();
    });
    expect(onLowBattery).not.toHaveBeenCalled();
  });

  it('does not fire onLowBattery when not anchored', async () => {
    mockBattery.level = 0.1;
    mockBattery.charging = false;

    const onLowBattery = vi.fn();
    const useAlertController = await importHook();
    renderHook(() =>
      useAlertController({
        onLowBattery,
        isAnchored: () => false,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const checkFn = mockBattery.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === 'levelchange',
    )?.[1] as (() => void) | undefined;

    act(() => {
      checkFn?.();
    });
    expect(onLowBattery).not.toHaveBeenCalled();
  });

  it('fires onLowBattery only once until charging resets', async () => {
    mockBattery.level = 0.1;
    mockBattery.charging = false;

    const onLowBattery = vi.fn();
    const useAlertController = await importHook();
    renderHook(() =>
      useAlertController({
        onLowBattery,
        isAnchored: () => true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const checkFn = mockBattery.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === 'levelchange',
    )?.[1] as (() => void) | undefined;

    // First trigger
    act(() => {
      checkFn?.();
    });
    expect(onLowBattery).toHaveBeenCalledTimes(1);

    // Second trigger — should be suppressed (warning already shown)
    act(() => {
      checkFn?.();
    });
    expect(onLowBattery).toHaveBeenCalledTimes(1);

    // Reset by charging
    mockBattery.charging = true;
    const chargeFn = mockBattery.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === 'chargingchange',
    )?.[1] as (() => void) | undefined;
    act(() => {
      chargeFn?.();
    });

    // Now discharge again — should fire again
    mockBattery.charging = false;
    mockBattery.level = 0.05;
    act(() => {
      checkFn?.();
    });
    expect(onLowBattery).toHaveBeenCalledTimes(2);
  });

  it('does not fire onLowBattery when isAnchored is undefined', async () => {
    mockBattery.level = 0.1;
    mockBattery.charging = false;

    const onLowBattery = vi.fn();
    const useAlertController = await importHook();
    renderHook(() =>
      useAlertController({
        onLowBattery,
        // isAnchored not provided
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const checkFn = mockBattery.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === 'levelchange',
    )?.[1] as (() => void) | undefined;

    act(() => {
      checkFn?.();
    });
    expect(onLowBattery).not.toHaveBeenCalled();
  });

  it('battery check runs on interval', async () => {
    mockBattery.level = 0.5;
    mockBattery.charging = false;

    const onLowBattery = vi.fn();
    const useAlertController = await importHook();
    renderHook(() =>
      useAlertController({
        onLowBattery,
        isAnchored: () => true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Change battery level low
    mockBattery.level = 0.1;

    // Advance by 60 seconds to trigger interval check
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });

    expect(onLowBattery).toHaveBeenCalled();
  });

  // ── cleanup branch ──

  it('cleanup when no battery listeners exist', async () => {
    delete (navigator as any).getBattery;

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    // Cleanup should handle null refs gracefully
    act(() => {
      result.current.cleanup();
    });
  });

  it('startAlarm without vibrate support', async () => {
    delete (navigator as any).vibrate;

    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.ensureAudioContext();
      result.current.startAlarm(1000);
    });
    // Should not throw
    expect(result.current.isAlarmingRef.current).toBe(true);
  });

  it('stopAlarm when not alarming is a no-op', async () => {
    const useAlertController = await importHook();
    const { result } = renderHook(() => useAlertController());

    act(() => {
      result.current.stopAlarm();
    });
    expect(result.current.isAlarmingRef.current).toBe(false);
  });
});

// =====================================================================
// SessionModal — branch coverage
// =====================================================================

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  History: (props: any) => React.createElement('span', props, '📋'),
  BarChart3: (props: any) => React.createElement('span', props, '📊'),
  Download: (props: any) => React.createElement('span', props, '⬇'),
  FileSpreadsheet: (props: any) => React.createElement('span', props, '📄'),
  Trash2: (props: any) => React.createElement('span', props, '🗑'),
  PlayCircle: (props: any) => React.createElement('span', props, '▶'),
  BookOpen: (props: any) => React.createElement('span', props, '📖'),
  X: (props: any) => React.createElement('span', props, '✕'),
}));

// Mock I18n
vi.mock('../src/modules/anchor/hooks/useI18n', () => ({
  useI18n: () => ({
    t: {
      histTitle: 'Sessions',
      histLoading: 'Loading...',
      histEmpty: 'No sessions',
      histTime: 'Duration:',
      histActive: 'Active',
      replayTitle: 'Replay',
      replayDate: 'Date:',
      replayDuration: 'Duration:',
      replayRadius: 'Radius:',
      replayMaxDev: 'Max deviation:',
      replayAlarms: 'Alarms:',
      replayPoints: 'Points:',
      replayExport: 'Export GPX',
      replayDelete: 'Delete',
      logTitle: 'Log',
      btnClose: 'Close',
    },
    fmt: (template: string, vars: Record<string, string | number>) => template,
    lang: 'en',
    locale: 'en-US',
    setLang: vi.fn(),
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// Mock Modal
vi.mock('../src/modules/anchor/components/modals/Modal', () => ({
  Modal: ({ open, onClose, children, className, id }: any) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'modal', id, className, onClick: onClose },
          children,
        )
      : null,
}));

// Mock formatDuration
vi.mock('../src/shared/utils/format', () => ({
  formatDuration: (val: number) => {
    const s = Math.floor(val / 1000);
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m`;
    return `${s}s`;
  },
}));

import type { AnchorSession } from '../src/modules/anchor/session-db';

describe('SessionModal — branch coverage', () => {
  function makeSession(overrides: Partial<AnchorSession> = {}): AnchorSession {
    return {
      id: 1,
      anchorLat: 54.0,
      anchorLng: 18.0,
      radius: 50,
      bufferRadius: null,
      sectorEnabled: false,
      sectorBearing: 0,
      sectorWidth: 0,
      startTime: Date.now() - 3600000,
      endTime: Date.now(),
      chainLengthM: null,
      depthM: null,
      alarmTriggered: false,
      alarmCount: 0,
      maxDistance: 25.5,
      maxSog: 2.1,
      ...overrides,
    };
  }

  async function importSessionModal() {
    const mod = await import('../src/modules/anchor/components/modals/SessionModal');
    return mod.SessionModal;
  }

  it('renders nothing when open is false', async () => {
    const SessionModal = await importSessionModal();
    const { container } = render(
      <SessionModal
        open={false}
        onClose={vi.fn()}
        sessions={[]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={null}
        replayMapRef={React.createRef()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders loading state', async () => {
    const SessionModal = await importSessionModal();
    const { container } = render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[]}
        loading={true}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={null}
        replayMapRef={React.createRef()}
      />,
    );
    expect(container.textContent).toContain('Loading...');
  });

  it('renders empty sessions message', async () => {
    const SessionModal = await importSessionModal();
    const { container } = render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={null}
        replayMapRef={React.createRef()}
      />,
    );
    expect(container.textContent).toContain('No sessions');
  });

  it('renders session list with completed sessions', async () => {
    const SessionModal = await importSessionModal();
    const sessions = [makeSession({ id: 1, alarmCount: 2 }), makeSession({ id: 2, alarmCount: 0 })];

    const { container } = render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={sessions}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={null}
        replayMapRef={React.createRef()}
      />,
    );

    // Should show alarm count for session with alarms
    expect(container.textContent).toContain('⚠');
    expect(container.textContent).toContain('2');
  });

  it('renders active session (no endTime)', async () => {
    const SessionModal = await importSessionModal();
    const sessions = [makeSession({ id: 1, endTime: null })];

    const { container } = render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={sessions}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={null}
        replayMapRef={React.createRef()}
      />,
    );

    // Should show "Active" indicator
    expect(container.textContent).toContain('Active');
  });

  it('calls onReplay when session clicked', async () => {
    const SessionModal = await importSessionModal();
    const onReplay = vi.fn();
    const sessions = [makeSession({ id: 42 })];

    render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={sessions}
        loading={false}
        onReplay={onReplay}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={null}
        replayMapRef={React.createRef()}
      />,
    );

    const sessionBtns = screen.getAllByRole('button');
    const sessionBtn = sessionBtns.find((b) => b.textContent?.includes('Duration:'));
    if (sessionBtn) fireEvent.click(sessionBtn);
    expect(onReplay).toHaveBeenCalledWith(42);
  });

  it('does not call onReplay when session id is null', async () => {
    const SessionModal = await importSessionModal();
    const onReplay = vi.fn();
    const sessions = [makeSession({ id: undefined })];

    render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={sessions}
        loading={false}
        onReplay={onReplay}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={null}
        replayMapRef={React.createRef()}
      />,
    );

    const sessionBtns = screen.getAllByRole('button');
    const sessionBtn = sessionBtns.find((b) => b.textContent?.includes('Duration:'));
    if (sessionBtn) fireEvent.click(sessionBtn);
    expect(onReplay).not.toHaveBeenCalled();
  });

  it('renders replay view with log entries', async () => {
    const SessionModal = await importSessionModal();
    const session = makeSession({ id: 5, alarmCount: 1 });
    const replaySession = {
      session,
      points: [
        { lat: 54, lng: 18 },
        { lat: 54.001, lng: 18.001 },
      ],
      logEntries: [{ summary: 'Anchor set' }, { logEntry: 'Drift detected' }, { other: 'data' }],
    };

    const { container } = render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[session]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={replaySession}
        replayMapRef={React.createRef()}
      />,
    );

    expect(container.textContent).toContain('Replay');
    expect(container.textContent).toContain('Anchor set');
    expect(container.textContent).toContain('Drift detected');
    // Third entry uses JSON.stringify fallback
    expect(container.textContent).toContain('data');
    expect(container.textContent).toContain('50m'); // radius
    expect(container.textContent).toContain('25.5m'); // max distance
    expect(container.textContent).toContain('2'); // points count
  });

  it('renders replay without log entries', async () => {
    const SessionModal = await importSessionModal();
    const session = makeSession({ id: 5 });
    const replaySession = {
      session,
      points: [{ lat: 54, lng: 18 }],
      logEntries: [],
    };

    const { container } = render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[session]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={replaySession}
        replayMapRef={React.createRef()}
      />,
    );

    // Log title should not appear when no entries
    expect(container.textContent).not.toContain('Log');
  });

  it('renders replay session without endTime (active)', async () => {
    const SessionModal = await importSessionModal();
    const session = makeSession({ id: 5, endTime: null });
    const replaySession = {
      session,
      points: [],
      logEntries: [],
    };

    const { container } = render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[session]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={replaySession}
        replayMapRef={React.createRef()}
      />,
    );

    expect(container.textContent).toContain('Active');
  });

  it('calls onExportGPX from replay view', async () => {
    const SessionModal = await importSessionModal();
    const onExportGPX = vi.fn();
    const session = makeSession({ id: 7 });
    const replaySession = {
      session,
      points: [],
      logEntries: [],
    };

    render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[session]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={onExportGPX}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={replaySession}
        replayMapRef={React.createRef()}
      />,
    );

    const exportBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Export GPX'));
    if (exportBtn) fireEvent.click(exportBtn);
    expect(onExportGPX).toHaveBeenCalledWith(7);
  });

  it('calls onExportCSV from replay view', async () => {
    const SessionModal = await importSessionModal();
    const onExportCSV = vi.fn();
    const session = makeSession({ id: 8 });
    const replaySession = {
      session,
      points: [],
      logEntries: [],
    };

    render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[session]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={onExportCSV}
        onDelete={vi.fn()}
        replaySession={replaySession}
        replayMapRef={React.createRef()}
      />,
    );

    const csvBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('CSV'));
    if (csvBtn) fireEvent.click(csvBtn);
    expect(onExportCSV).toHaveBeenCalledWith(8);
  });

  it('calls onDelete from replay view', async () => {
    const SessionModal = await importSessionModal();
    const onDelete = vi.fn();
    const session = makeSession({ id: 9 });
    const replaySession = {
      session,
      points: [],
      logEntries: [],
    };

    render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[session]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={onDelete}
        replaySession={replaySession}
        replayMapRef={React.createRef()}
      />,
    );

    const deleteBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('Delete'));
    if (deleteBtn) fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(9);
  });

  it('does not call export/delete when session id is null', async () => {
    const SessionModal = await importSessionModal();
    const onExportGPX = vi.fn();
    const onExportCSV = vi.fn();
    const onDelete = vi.fn();
    const session = makeSession({ id: undefined });
    const replaySession = {
      session,
      points: [],
      logEntries: [],
    };

    render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[session]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={onExportGPX}
        onExportCSV={onExportCSV}
        onDelete={onDelete}
        replaySession={replaySession}
        replayMapRef={React.createRef()}
      />,
    );

    const exportBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Export GPX'));
    const csvBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('CSV'));
    const deleteBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('Delete'));

    if (exportBtn) fireEvent.click(exportBtn);
    if (csvBtn) fireEvent.click(csvBtn);
    if (deleteBtn) fireEvent.click(deleteBtn);

    expect(onExportGPX).not.toHaveBeenCalled();
    expect(onExportCSV).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onClose from close button', async () => {
    const SessionModal = await importSessionModal();
    const onClose = vi.fn();

    render(
      <SessionModal
        open={true}
        onClose={onClose}
        sessions={[]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={null}
        replayMapRef={React.createRef()}
      />,
    );

    const closeBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('Close'));
    if (closeBtn) fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows hidden export button when no replay session', async () => {
    const SessionModal = await importSessionModal();

    const { container } = render(
      <SessionModal
        open={true}
        onClose={vi.fn()}
        sessions={[]}
        loading={false}
        onReplay={vi.fn()}
        onExportGPX={vi.fn()}
        onExportCSV={vi.fn()}
        onDelete={vi.fn()}
        replaySession={null}
        replayMapRef={React.createRef()}
      />,
    );

    const hiddenBtn = container.querySelector('#replay-export-btn');
    expect(hiddenBtn).not.toBeNull();
  });
});
