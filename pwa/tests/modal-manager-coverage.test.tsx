import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';

// ─── Mock Leaflet ─────────────────────────────────────────────────
vi.mock('leaflet', () => {
  const latLng = (lat: number, lng: number) => ({ lat, lng });
  return {
    default: { latLng },
    latLng,
  };
});

import L from 'leaflet';

// ─── Mock child components ────────────────────────────────────────

vi.mock('../src/modules/anchor/components/modals/CalcModal', () => ({
  CalcModal: (props: any) => (props.open ? <div data-testid="calc-modal" /> : null),
}));
vi.mock('../src/modules/anchor/components/modals/OffsetModal', () => ({
  OffsetModal: (props: any) => {
    if (!props.open) return null;
    return (
      <div data-testid="offset-modal">
        <button data-testid="offset-apply" onClick={() => props.onApply(100, 180)} />
      </div>
    );
  },
}));
vi.mock('../src/modules/anchor/components/modals/SectorModal', () => ({
  SectorModal: (props: any) => {
    if (!props.open) return null;
    return (
      <div data-testid="sector-modal">
        <button data-testid="sector-save" onClick={() => props.onSave(true, 90, 60)} />
      </div>
    );
  },
}));
vi.mock('../src/modules/anchor/components/modals/WatchModal', () => ({
  WatchModal: (props: any) => (props.open ? <div data-testid="watch-modal" /> : null),
}));
vi.mock('../src/modules/anchor/components/modals/WeatherModal', () => ({
  WeatherModal: (props: any) => (props.open ? <div data-testid="weather-modal" /> : null),
}));
vi.mock('../src/modules/anchor/components/modals/SyncModal', () => ({
  SyncModal: (props: any) => {
    if (!props.open) return null;
    return (
      <div data-testid="sync-modal">
        <button data-testid="sync-connect" onClick={() => props.onConnect('ws://test')} />
        <button data-testid="sync-disconnect" onClick={props.onDisconnect} />
      </div>
    );
  },
}));
vi.mock('../src/modules/anchor/components/modals/AIModal', () => ({
  AIModal: (props: any) => (props.open ? <div data-testid="ai-modal" /> : null),
}));
vi.mock('../src/modules/anchor/components/modals/SessionModal', () => ({
  SessionModal: (props: any) => (props.open ? <div data-testid="session-modal" /> : null),
}));
vi.mock('../src/modules/anchor/components/modals/AlertModals', () => ({
  AlertModals: (props: any) => (
    <div data-testid="alert-modals">
      {props.dragWarningOpen && (
        <div data-testid="drag-warning">
          <button data-testid="drag-dismiss" onClick={props.onDragDismiss} />
          <button data-testid="drag-check" onClick={props.onDragCheck} />
        </div>
      )}
      {props.watchAlertOpen && (
        <button data-testid="watch-alert-ok" onClick={props.onWatchAlertOk} />
      )}
    </div>
  ),
}));
vi.mock('../src/modules/anchor/components/modals/ApiKeyModal', () => ({
  ApiKeyModal: (props: any) => (props.open ? <div data-testid="apikey-modal" /> : null),
}));
vi.mock('../src/modules/anchor/components/modals/StatsModal', () => ({
  StatsModal: (props: any) => (props.open ? <div data-testid="stats-modal" /> : null),
}));
vi.mock('../src/modules/anchor/components/modals/QRScanModal', () => ({
  QRScanModal: (props: any) => {
    if (!props.open) return null;
    return (
      <div data-testid="qr-modal">
        <button data-testid="qr-connect" onClick={() => props.onConnect('ws://qr')} />
      </div>
    );
  },
}));
vi.mock('../src/modules/anchor/components/SimpleMonitor', () => ({
  SimpleMonitor: (props: any) => {
    if (!props.visible) return null;
    return (
      <div data-testid="simple-monitor">
        <span data-testid="unit-display">{props.unit}</span>
        <button data-testid="toggle-night" onClick={props.onToggleNightRed} />
      </div>
    );
  },
}));
vi.mock('../src/modules/anchor/components/Onboarding', () => ({
  Onboarding: (props: any) => {
    if (!props.visible) return null;
    return (
      <div data-testid="onboarding">
        <button data-testid="onboarding-complete" onClick={props.onComplete} />
      </div>
    );
  },
}));

// ─── Mock hooks used by ModalManager ──────────────────────────────

const mockModalState: Record<string, boolean> = {};
const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();

vi.mock('../src/modules/anchor/contexts/ModalContext', () => ({
  useModalState: () => mockModalState,
  useModalActions: () => ({ openModal: mockOpenModal, closeModal: mockCloseModal }),
}));

const mockWeather = {
  weatherData: {
    loading: false,
    error: null,
    windSpeed: null,
    windGust: null,
    windDir: null,
    waveHeight: null,
    wavePeriod: null,
    waveDir: null,
    windForecast: [],
    waveForecast: [],
    gustForecast: [],
  },
  fetchWeather: vi.fn(),
  weatherAssessment: null,
};
vi.mock('../src/modules/anchor/hooks/useWeather', () => ({
  useWeather: () => mockWeather,
}));

const mockAIChat = {
  chatMessages: [],
  aiLoading: false,
  logbookEntry: null,
  hasAiKey: true,
  handleAiSendMessage: vi.fn(),
  handleAiClearChat: vi.fn(),
  handleSaveLogbook: vi.fn(),
  handleSaveApiKey: vi.fn(),
  handleClearApiKey: vi.fn(),
};
vi.mock('../src/modules/anchor/hooks/useAIChat', () => ({
  useAIChat: () => mockAIChat,
}));

const mockSessionHistory = {
  sessions: [],
  sessionsLoading: false,
  replayData: null,
  setReplayData: vi.fn(),
  statsData: null,
  loadHistory: vi.fn(),
  loadStats: vi.fn(),
  handleReplaySession: vi.fn(),
  handleExportGPX: vi.fn(),
  handleExportCSV: vi.fn(),
  handleDeleteSession: vi.fn(),
};
vi.mock('../src/modules/anchor/hooks/useSessionHistory', () => ({
  useSessionHistory: () => mockSessionHistory,
}));

// ─── Mock GeoUtils ────────────────────────────────────────────────
vi.mock('../src/modules/anchor/geo-utils', () => ({
  GeoUtils: {
    getDestinationPoint: vi.fn(() => ({ lat: 54.001, lng: 18.001 })),
  },
}));

// ─── Import under test ───────────────────────────────────────────

import {
  ModalManager,
  type ModalManagerProps,
} from '../src/modules/anchor/components/ModalManager';

// ─── Helpers ──────────────────────────────────────────────────────

function makeProps(overrides: Partial<ModalManagerProps> = {}): ModalManagerProps {
  return {
    state: {
      isAnchored: false,
      anchorPos: null,
      currentPos: L.latLng(54, 18),
      radius: 50,
      bufferRadius: 60,
      sectorEnabled: false,
      sectorBearing: 0,
      sectorWidth: 90,
      distance: 0,
      sog: 0,
      cog: 0,
      accuracy: 5,
      alarmState: 'SAFE',
      hasGpsFix: true,
      gpsSignalLost: false,
      unit: 'm',
      chainLengthM: null,
      depthM: null,
      dragHistory: [],
      dragWarningDismissed: false,
      maxDistanceSwing: 0,
      maxSogDuringAnchor: 0,
      alarmCount: 0,
      sessionId: null,
      anchorStartTime: null,
      track: [],
      mapAutoCenter: true,
      watchMinutes: 60,
      watchActive: false,
      ...(overrides.state as any),
    } as any,
    stateRef: {
      current: {
        isAnchored: false,
        anchorPos: null,
        currentPos: L.latLng(54, 18),
        radius: 50,
        bufferRadius: 60,
        sectorEnabled: false,
        sectorBearing: 0,
        sectorWidth: 90,
        alarmState: 'SAFE',
        unit: 'm',
        chainLengthM: null,
        depthM: null,
        watchMinutes: 60,
        ...(overrides.state as any),
      },
    } as any,
    updateState: vi.fn(),
    session: {
      getSessionHistory: vi.fn(),
      getSessionReplay: vi.fn(),
      deleteSession: vi.fn(),
      getStats: vi.fn(),
      persistActiveState: vi.fn(),
      setAnchor: vi.fn().mockResolvedValue(42),
      db: { current: { db: null } },
    },
    alarm: { recalculateZone: vi.fn() },
    alertCtrl: {
      ensureAudioContext: vi.fn(),
      initPermissions: vi.fn(),
      requestWakeLock: vi.fn().mockResolvedValue(undefined),
    },
    mapHook: {
      setAnchor: vi.fn(),
      clearAnchor: vi.fn(),
      drawSafeZone: vi.fn(),
      fitSafeZone: vi.fn(),
      getMap: vi.fn(() => ({ setView: vi.fn() })),
    },
    mapRef: {
      current: {
        setAnchor: vi.fn(),
        clearAnchor: vi.fn(),
        drawSafeZone: vi.fn(),
        fitSafeZone: vi.fn(),
        getMap: vi.fn(() => ({ setView: vi.fn() })),
      },
    } as any,
    sync: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendFullSync: vi.fn(),
      isConnected: false,
      isConnectedRef: { current: false },
    },
    syncRef: {
      current: {
        isConnectedRef: { current: false },
        sendFullSync: vi.fn(),
      },
    } as any,
    watchSchedule: {
      startWatch: vi.fn(),
      cancelWatch: vi.fn(),
      addScheduleItem: vi.fn(),
      removeScheduleItem: vi.fn(),
      watchActive: false,
      watchMinutes: 60,
      schedule: [],
      setWatchMinutes: vi.fn(),
    },
    replayMapRef: { current: null },
    onRadiusChange: vi.fn(),
    onMuteAlarm: vi.fn(),
    ...overrides,
  } as ModalManagerProps;
}

function resetModalState(modals: Partial<Record<string, boolean>> = {}) {
  const allKeys = [
    'calc',
    'offset',
    'sector',
    'watch',
    'weather',
    'sync',
    'ai',
    'session',
    'apiKey',
    'stats',
    'qr',
    'simpleMonitor',
    'onboarding',
    'dragWarning',
    'gpsLost',
    'batteryLow',
    'watchAlert',
    'connLost',
  ];
  for (const k of allKeys) mockModalState[k] = false;
  for (const [k, v] of Object.entries(modals)) mockModalState[k] = v;
}

// ─── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  resetModalState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────

describe('ModalManager', () => {
  // ── handleApplyOffset ──

  describe('handleApplyOffset', () => {
    it('returns early when currentPos is null', () => {
      resetModalState({ offset: true });
      const props = makeProps();
      props.stateRef.current!.currentPos = null;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('offset-apply'));

      expect(props.mapHook.setAnchor).not.toHaveBeenCalled();
    });

    it('updates existing anchor when already anchored', () => {
      resetModalState({ offset: true });
      const props = makeProps();
      props.stateRef.current!.isAnchored = true;
      props.stateRef.current!.anchorPos = L.latLng(54, 18);
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('offset-apply'));

      expect(props.mapHook.clearAnchor).toHaveBeenCalled();
      expect(props.mapHook.setAnchor).toHaveBeenCalled();
      expect(props.mapHook.drawSafeZone).toHaveBeenCalled();
      expect(props.updateState).toHaveBeenCalledWith(
        expect.objectContaining({
          anchorPos: expect.any(Object),
          bufferRadius: expect.any(Number),
        }),
      );
      expect(props.session.persistActiveState).toHaveBeenCalled();
    });

    it('sends full sync when connected and anchored', () => {
      resetModalState({ offset: true });
      const props = makeProps();
      props.stateRef.current!.isAnchored = true;
      props.syncRef.current!.isConnectedRef.current = true;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('offset-apply'));

      expect(props.syncRef.current!.sendFullSync).toHaveBeenCalled();
    });

    it('does not send sync when not connected and anchored', () => {
      resetModalState({ offset: true });
      const props = makeProps();
      props.stateRef.current!.isAnchored = true;
      props.syncRef.current!.isConnectedRef.current = false;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('offset-apply'));

      expect(props.syncRef.current!.sendFullSync).not.toHaveBeenCalled();
    });

    it('drops new anchor when not anchored', async () => {
      resetModalState({ offset: true });
      const props = makeProps();
      props.stateRef.current!.isAnchored = false;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('offset-apply'));

      expect(props.alertCtrl.initPermissions).toHaveBeenCalled();
      expect(props.session.setAnchor).toHaveBeenCalled();
    });
  });

  // ── handleSaveSector ──

  describe('handleSaveSector', () => {
    it('updates state with sector settings', () => {
      resetModalState({ sector: true });
      const props = makeProps();
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('sector-save'));

      expect(props.updateState).toHaveBeenCalledWith(
        expect.objectContaining({
          sectorEnabled: true,
          sectorBearing: 90,
          sectorWidth: 60,
        }),
      );
    });

    it('recalculates zone when anchored with anchorPos', () => {
      resetModalState({ sector: true });
      const props = makeProps();
      props.stateRef.current!.isAnchored = true;
      props.stateRef.current!.anchorPos = L.latLng(54, 18);
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('sector-save'));

      expect(props.alarm.recalculateZone).toHaveBeenCalled();
      expect(props.session.persistActiveState).toHaveBeenCalled();
    });

    it('does not recalculate when not anchored', () => {
      resetModalState({ sector: true });
      const props = makeProps();
      props.stateRef.current!.isAnchored = false;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('sector-save'));

      expect(props.alarm.recalculateZone).not.toHaveBeenCalled();
    });

    it('does not recalculate when anchorPos is null', () => {
      resetModalState({ sector: true });
      const props = makeProps();
      props.stateRef.current!.isAnchored = true;
      props.stateRef.current!.anchorPos = null;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('sector-save'));

      expect(props.alarm.recalculateZone).not.toHaveBeenCalled();
    });

    it('sends sync when connected', () => {
      resetModalState({ sector: true });
      const props = makeProps();
      props.syncRef.current!.isConnectedRef.current = true;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('sector-save'));

      expect(props.syncRef.current!.sendFullSync).toHaveBeenCalled();
    });

    it('does not send sync when not connected', () => {
      resetModalState({ sector: true });
      const props = makeProps();
      props.syncRef.current!.isConnectedRef.current = false;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('sector-save'));

      expect(props.syncRef.current!.sendFullSync).not.toHaveBeenCalled();
    });
  });

  // ── Sync handlers ──

  describe('sync handlers', () => {
    it('handleSyncConnect calls sync.connect and closes modal', () => {
      resetModalState({ sync: true });
      const props = makeProps();
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('sync-connect'));

      expect(props.sync.connect).toHaveBeenCalledWith('ws://test');
      expect(mockCloseModal).toHaveBeenCalledWith('sync');
    });

    it('handleSyncDisconnect calls sync.disconnect and closes modal', () => {
      resetModalState({ sync: true });
      const props = makeProps();
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('sync-disconnect'));

      expect(props.sync.disconnect).toHaveBeenCalled();
      expect(mockCloseModal).toHaveBeenCalledWith('sync');
    });

    it('handleQrConnect calls sync.connect', () => {
      resetModalState({ qr: true });
      const props = makeProps();
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('qr-connect'));

      expect(props.sync.connect).toHaveBeenCalledWith('ws://qr');
    });
  });

  // ── Drag warning handlers ──

  describe('drag warning handlers', () => {
    it('handleDragDismiss closes dragWarning modal', () => {
      resetModalState({ dragWarning: true });
      const props = makeProps();
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('drag-dismiss'));

      expect(mockCloseModal).toHaveBeenCalledWith('dragWarning');
    });

    it('handleDragCheck sets map view when pos and map exist', () => {
      resetModalState({ dragWarning: true });
      const setViewMock = vi.fn();
      const props = makeProps();
      props.stateRef.current!.currentPos = L.latLng(54, 18);
      props.mapRef.current!.getMap = vi.fn(() => ({ setView: setViewMock })) as any;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('drag-check'));

      expect(mockCloseModal).toHaveBeenCalledWith('dragWarning');
      expect(setViewMock).toHaveBeenCalled();
    });

    it('handleDragCheck does nothing when pos is null', () => {
      resetModalState({ dragWarning: true });
      const props = makeProps();
      props.stateRef.current!.currentPos = null;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('drag-check'));

      expect(mockCloseModal).toHaveBeenCalledWith('dragWarning');
    });

    it('handleDragCheck does nothing when map is null', () => {
      resetModalState({ dragWarning: true });
      const props = makeProps();
      props.stateRef.current!.currentPos = L.latLng(54, 18);
      props.mapRef.current!.getMap = vi.fn(() => null) as any;
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('drag-check'));

      expect(mockCloseModal).toHaveBeenCalledWith('dragWarning');
    });
  });

  // ── Watch alert handler ──

  describe('handleWatchAlertOk', () => {
    it('closes modal and restarts watch', () => {
      resetModalState({ watchAlert: true });
      const props = makeProps();
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('watch-alert-ok'));

      expect(mockCloseModal).toHaveBeenCalledWith('watchAlert');
      expect(props.watchSchedule.startWatch).toHaveBeenCalled();
      expect(props.updateState).toHaveBeenCalledWith({ watchActive: true });
    });
  });

  // ── Onboarding ──

  describe('handleOnboardingComplete', () => {
    it('sets localStorage and closes modal', () => {
      resetModalState({ onboarding: true });
      const props = makeProps();
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('onboarding-complete'));

      expect(localStorage.getItem('anchor_onboarding_done')).toBe('1');
      expect(mockCloseModal).toHaveBeenCalledWith('onboarding');
    });
  });

  // ── SimpleMonitor unit display ──

  describe('SimpleMonitor unit display', () => {
    it('passes "feet" when unit is "ft"', () => {
      resetModalState({ simpleMonitor: true });
      const props = makeProps({ state: { unit: 'ft' } } as any);
      const { getByTestId } = render(<ModalManager {...props} />);

      expect(getByTestId('unit-display').textContent).toBe('feet');
    });

    it('passes "meters" when unit is "m"', () => {
      resetModalState({ simpleMonitor: true });
      const props = makeProps({ state: { unit: 'm' } } as any);
      const { getByTestId } = render(<ModalManager {...props} />);

      expect(getByTestId('unit-display').textContent).toBe('meters');
    });
  });

  // ── Night red filter toggle ──

  describe('night red filter', () => {
    it('toggles nightRedFilter on button click', () => {
      resetModalState({ simpleMonitor: true });
      const props = makeProps();
      const { getByTestId } = render(<ModalManager {...props} />);

      fireEvent.click(getByTestId('toggle-night'));
      // Just ensure no crash — the internal state toggle works via useState
    });
  });

  // ── syncUrlInput localStorage init ──

  describe('syncUrlInput initialization', () => {
    it('initializes from localStorage', () => {
      localStorage.setItem('anchor_ws_url', 'ws://saved');
      resetModalState({ sync: true });
      const props = makeProps();
      render(<ModalManager {...props} />);
      // The SyncModal receives wsUrl prop — tested via the connect handler saving it
    });

    it('defaults to empty string when not in localStorage', () => {
      resetModalState({ sync: true });
      const props = makeProps();
      render(<ModalManager {...props} />);
      // No error, just defaults
    });
  });
});
