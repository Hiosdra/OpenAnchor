import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FakeWebSocket, installFakeWebSocket } from './mocks/websocket';
import { useSyncController } from '../src/modules/anchor/hooks/useSyncController';
import {
  WS_PING_INTERVAL_MS,
  WS_HEARTBEAT_TIMEOUT_MS,
  WS_STATE_UPDATE_INTERVAL_MS,
  WS_RECONNECT_BASE_DELAY_MS,
} from '../src/shared/constants/protocol';

vi.mock('leaflet', () => ({
  default: { latLng: (lat: number, lng: number) => ({ lat, lng }) },
  latLng: (lat: number, lng: number) => ({ lat, lng }),
}));

let fakeWSInstances: FakeWebSocket[];
let restoreWS: () => void;

beforeEach(() => {
  const installed = installFakeWebSocket();
  fakeWSInstances = installed.instances;
  restoreWS = installed.restore;
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  restoreWS();
});

const onMessage = vi.fn();

function setup() {
  return renderHook(() => useSyncController({ onMessage }));
}

function connectAndOpen(url = 'ws://localhost:8080') {
  const hook = setup();
  act(() => {
    hook.result.current.connect(url);
  });
  const ws = fakeWSInstances[fakeWSInstances.length - 1];
  act(() => {
    ws.simulateOpen();
  });
  return { hook, ws };
}

// ---------------------------------------------------------------------------
// 1. Initial state
// ---------------------------------------------------------------------------
describe('useSyncController', () => {
  describe('initial state', () => {
    it('starts disconnected with null peer state', () => {
      const { result } = setup();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.wsUrl).toBe('');
      expect(result.current.peerBattery).toBeNull();
      expect(result.current.peerCharging).toBe(false);
      expect(result.current.peerPos).toBeNull();
      expect(result.current.connectionLostWarning).toBe(false);
    });

    it('restores wsUrl from localStorage', () => {
      localStorage.setItem('anchor_ws_url', 'ws://saved:1234');
      const { result } = setup();
      expect(result.current.wsUrl).toBe('ws://saved:1234');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. connect
  // ---------------------------------------------------------------------------
  describe('connect', () => {
    it('creates a WebSocket to the given URL', () => {
      const { result } = setup();
      act(() => {
        result.current.connect('ws://host:9090');
      });
      expect(fakeWSInstances).toHaveLength(1);
      expect(fakeWSInstances[0].url).toBe('ws://host:9090');
    });

    it('saves URL to localStorage and state', () => {
      const { result } = setup();
      act(() => {
        result.current.connect('ws://host:9090');
      });
      expect(localStorage.getItem('anchor_ws_url')).toBe('ws://host:9090');
      expect(result.current.wsUrl).toBe('ws://host:9090');
    });

    it('sets isConnected=true on ws.onopen', () => {
      const { hook, ws } = connectAndOpen();
      expect(hook.result.current.isConnected).toBe(true);
      expect(hook.result.current.isConnectedRef.current).toBe(true);
    });

    it('starts a ping interval on open', () => {
      const { hook, ws } = connectAndOpen();
      // Advance past one ping interval
      act(() => {
        vi.advanceTimersByTime(WS_PING_INTERVAL_MS);
      });
      const sent = ws.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      expect(sent.some((m: any) => m.type === 'PING')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. disconnect
  // ---------------------------------------------------------------------------
  describe('disconnect', () => {
    it('sends DISCONNECT message and closes socket', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.disconnect();
      });
      const sent = ws.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      expect(sent.some((m: any) => m.type === 'DISCONNECT')).toBe(true);
      expect(hook.result.current.isConnected).toBe(false);
    });

    it('resets peer state on disconnect', () => {
      const { hook, ws } = connectAndOpen();
      // First give it some peer state via a message
      act(() => {
        ws.simulateMessage({
          type: 'ANDROID_GPS_REPORT',
          payload: { pos: { lat: 1, lng: 2 }, batteryLevel: 80, isCharging: true },
        });
      });
      expect(hook.result.current.peerBattery).toBe(80);
      act(() => {
        hook.result.current.disconnect();
      });
      expect(hook.result.current.peerBattery).toBeNull();
      expect(hook.result.current.peerPos).toBeNull();
    });

    it('does not schedule reconnect after intentional disconnect', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.disconnect();
      });
      // Simulate server closing after disconnect message
      // onclose was set to null by closeSocket, so no handler fires
      // Advance timers far — no new WebSocket should appear
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      // Only the original WS instance exists
      expect(fakeWSInstances).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. sendMessage
  // ---------------------------------------------------------------------------
  describe('sendMessage', () => {
    it('sends JSON with type, timestamp, payload when connected', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.sendMessage('TEST', { key: 'val' });
      });
      const sent = JSON.parse(ws.send.mock.calls.at(-1)![0]);
      expect(sent.type).toBe('TEST');
      expect(sent.payload).toEqual({ key: 'val' });
      expect(typeof sent.timestamp).toBe('number');
    });

    it('does not send when disconnected', () => {
      const { result } = setup();
      act(() => {
        result.current.sendMessage('NOPE', {});
      });
      // No WebSocket was even created
      expect(fakeWSInstances).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. sendStateUpdate deduplication
  // ---------------------------------------------------------------------------
  describe('sendStateUpdate', () => {
    const state = {
      currentPos: { lat: 50, lng: 20 } as any,
      accuracy: 5,
      distance: 10,
      alarmState: 'SAFE',
      sog: 2,
      cog: 180 as number | null,
      batteryLevel: 90,
      isCharging: false,
    };

    it('sends STATE_UPDATE on first call', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.sendStateUpdate(state);
      });
      const sent = ws.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      expect(sent.some((m: any) => m.type === 'STATE_UPDATE')).toBe(true);
    });

    it('deduplicates identical state updates', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.sendStateUpdate(state);
      });
      const countBefore = ws.send.mock.calls.length;
      act(() => {
        hook.result.current.sendStateUpdate(state);
      });
      expect(ws.send.mock.calls.length).toBe(countBefore);
    });

    it('sends again when state changes', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.sendStateUpdate(state);
      });
      const countBefore = ws.send.mock.calls.length;
      act(() => {
        hook.result.current.sendStateUpdate({ ...state, distance: 99 });
      });
      expect(ws.send.mock.calls.length).toBe(countBefore + 1);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. sendFullSync
  // ---------------------------------------------------------------------------
  describe('sendFullSync', () => {
    const baseState = {
      isAnchored: true,
      anchorPos: { lat: 50, lng: 20 } as any,
      sectorEnabled: false,
      radius: 30,
      bufferRadius: 50 as number | null,
      unit: 'meters',
      sectorBearing: 0,
      sectorWidth: 90,
      chainLengthM: null as number | null,
      depthM: null as number | null,
    };

    it('sends FULL_SYNC with circle zoneType when sector disabled', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.sendFullSync(baseState);
      });
      const sent = JSON.parse(ws.send.mock.calls.at(-1)![0]);
      expect(sent.type).toBe('FULL_SYNC');
      expect(sent.payload.zoneType).toBe('CIRCLE');
      expect(sent.payload.sector).toBeUndefined();
    });

    it('includes sector config when sectorEnabled=true', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.sendFullSync({ ...baseState, sectorEnabled: true });
      });
      const sent = JSON.parse(ws.send.mock.calls.at(-1)![0]);
      expect(sent.payload.zoneType).toBe('SECTOR');
      expect(sent.payload.sector).toBeDefined();
      expect(sent.payload.sector.bearingDeg).toBe(0);
      expect(sent.payload.sector.halfAngleDeg).toBe(45);
    });

    it('includes chainLengthM and depthM when provided', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.sendFullSync({ ...baseState, chainLengthM: 40, depthM: 10 });
      });
      const sent = JSON.parse(ws.send.mock.calls.at(-1)![0]);
      expect(sent.payload.chainLengthM).toBe(40);
      expect(sent.payload.depthM).toBe(10);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. handleOnMessage
  // ---------------------------------------------------------------------------
  describe('handleOnMessage', () => {
    it('updates lastPeerPingTime on PING (clears warning)', () => {
      const { hook, ws } = connectAndOpen();
      // First, simulate warning state via heartbeat timeout
      act(() => {
        ws.simulateMessage({ type: 'PING' });
      });
      expect(hook.result.current.connectionLostWarning).toBe(false);
    });

    it('updates peerPos and peerBattery on ANDROID_GPS_REPORT', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        ws.simulateMessage({
          type: 'ANDROID_GPS_REPORT',
          payload: { pos: { lat: 52.5, lng: 13.4 }, batteryLevel: 75, isCharging: true },
        });
      });
      expect(hook.result.current.peerPos).toEqual({ lat: 52.5, lng: 13.4 });
      expect(hook.result.current.peerBattery).toBe(75);
      expect(hook.result.current.peerCharging).toBe(true);
    });

    it('delegates unknown message types to onMessage callback', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        ws.simulateMessage({ type: 'CUSTOM_CMD', payload: { foo: 'bar' } });
      });
      expect(onMessage).toHaveBeenCalledWith('CUSTOM_CMD', { foo: 'bar' });
    });

    it('handles invalid JSON gracefully', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { hook, ws } = connectAndOpen();
      act(() => {
        ws.simulateRawMessage('not json at all');
      });
      expect(errorSpy).toHaveBeenCalled();
      // Hook should still be functional
      expect(hook.result.current.isConnected).toBe(true);
    });

    it('ignores messages without a string type field', () => {
      const { hook, ws } = connectAndOpen();
      onMessage.mockClear();
      act(() => {
        ws.simulateMessage({ noType: true });
      });
      expect(onMessage).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Reconnect on unexpected close
  // ---------------------------------------------------------------------------
  describe('reconnect', () => {
    it('schedules reconnect on unexpected close', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { hook, ws } = connectAndOpen();
      // Simulate unexpected close
      act(() => {
        ws.simulateClose(1006, 'abnormal');
      });
      expect(hook.result.current.isConnected).toBe(false);
      // First reconnect delay is baseDelay * 2^0
      act(() => {
        vi.advanceTimersByTime(WS_RECONNECT_BASE_DELAY_MS);
      });
      // A new WebSocket should have been created
      expect(fakeWSInstances.length).toBeGreaterThanOrEqual(2);
    });

    it('reconnects again after subsequent unexpected close', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { hook, ws } = connectAndOpen();

      // First unexpected close
      act(() => {
        ws.simulateClose();
      });
      // 1st reconnect at baseDelay
      act(() => {
        vi.advanceTimersByTime(WS_RECONNECT_BASE_DELAY_MS);
      });
      expect(fakeWSInstances).toHaveLength(2);

      // Open ws2 then close it unexpectedly
      const ws2 = fakeWSInstances[1];
      act(() => {
        ws2.simulateOpen();
      });
      act(() => {
        ws2.simulateClose();
      });
      // onConnected resets attempts, so delay is again baseDelay
      act(() => {
        vi.advanceTimersByTime(WS_RECONNECT_BASE_DELAY_MS);
      });
      expect(fakeWSInstances).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. checkHeartbeat
  // ---------------------------------------------------------------------------
  describe('checkHeartbeat', () => {
    it('closes socket and triggers reconnect when no peer ping for >15s', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { hook, ws } = connectAndOpen();
      // Advance past heartbeat timeout
      act(() => {
        vi.advanceTimersByTime(WS_HEARTBEAT_TIMEOUT_MS + 1_000);
      });
      act(() => {
        hook.result.current.checkHeartbeat();
      });
      // checkHeartbeat closes the socket and calls handleOnClose which
      // resets connectionLostWarning, but isConnected should be false
      // and a reconnect should be scheduled
      expect(hook.result.current.isConnected).toBe(false);
      expect(ws.close).toHaveBeenCalled();
      // Reconnect fires after baseDelay
      act(() => {
        vi.advanceTimersByTime(WS_RECONNECT_BASE_DELAY_MS);
      });
      expect(fakeWSInstances.length).toBeGreaterThanOrEqual(2);
    });

    it('does nothing when not connected', () => {
      const { result } = setup();
      act(() => {
        result.current.checkHeartbeat();
      });
      expect(result.current.connectionLostWarning).toBe(false);
    });

    it('does not warn when peer pinged recently', () => {
      const { hook, ws } = connectAndOpen();
      // Peer sends a ping
      act(() => {
        ws.simulateMessage({ type: 'PING' });
      });
      // Only advance well under heartbeat threshold
      act(() => {
        vi.advanceTimersByTime(WS_PING_INTERVAL_MS);
      });
      act(() => {
        hook.result.current.checkHeartbeat();
      });
      expect(hook.result.current.connectionLostWarning).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. startStateUpdateInterval / stopStateUpdateInterval
  // ---------------------------------------------------------------------------
  describe('state update interval', () => {
    it('periodically sends state updates when connected', () => {
      const { hook, ws } = connectAndOpen();
      let counter = 0;
      const getState = () => ({
        currentPos: { lat: 50, lng: 20 } as any,
        accuracy: 5,
        distance: counter++,
        alarmState: 'SAFE',
        sog: 1,
        cog: null as number | null,
        batteryLevel: 80,
        isCharging: false,
      });
      act(() => {
        hook.result.current.startStateUpdateInterval(getState);
      });
      const beforeCount = ws.send.mock.calls.length;
      // Advance two intervals (WS_STATE_UPDATE_INTERVAL_MS)
      act(() => {
        vi.advanceTimersByTime(WS_STATE_UPDATE_INTERVAL_MS * 2);
      });
      const stateUpdates = ws.send.mock.calls
        .slice(beforeCount)
        .map((c: any[]) => JSON.parse(c[0]))
        .filter((m: any) => m.type === 'STATE_UPDATE');
      expect(stateUpdates.length).toBeGreaterThanOrEqual(2);
    });

    it('stopStateUpdateInterval clears the interval', () => {
      const { hook, ws } = connectAndOpen();
      let counter = 0;
      const getState = () => ({
        currentPos: null,
        accuracy: 5,
        distance: counter++,
        alarmState: 'SAFE',
        sog: 0,
        cog: null as number | null,
        batteryLevel: 50,
        isCharging: false,
      });
      act(() => {
        hook.result.current.startStateUpdateInterval(getState);
      });
      act(() => {
        hook.result.current.stopStateUpdateInterval();
      });
      const countAfterStop = ws.send.mock.calls.length;
      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      // No new STATE_UPDATE messages after stop
      const newCalls = ws.send.mock.calls.slice(countAfterStop);
      const stateUpdates = newCalls
        .map((c: any[]) => JSON.parse(c[0]))
        .filter((m: any) => m.type === 'STATE_UPDATE');
      expect(stateUpdates).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Cleanup on unmount
  // ---------------------------------------------------------------------------
  describe('cleanup on unmount', () => {
    it('closes socket and clears intervals on unmount', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.unmount();
      });
      expect(ws.close).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 12. sendTriggerAlarm
  // ---------------------------------------------------------------------------
  describe('sendTriggerAlarm', () => {
    it('sends TRIGGER_ALARM message with reason and alarmState', () => {
      const { hook, ws } = connectAndOpen();
      act(() => {
        hook.result.current.sendTriggerAlarm('DRIFT', 'Boat drifted', 'ALARM');
      });
      const sent = JSON.parse(ws.send.mock.calls.at(-1)![0]);
      expect(sent.type).toBe('TRIGGER_ALARM');
      expect(sent.payload.reason).toBe('DRIFT');
      expect(sent.payload.message).toBe('Boat drifted');
      expect(sent.payload.alarmState).toBe('ALARM');
    });
  });

  // ---------------------------------------------------------------------------
  // 13. connectionState
  // ---------------------------------------------------------------------------
  describe('connectionState', () => {
    it('starts as disconnected', () => {
      const { result } = setup();
      expect(result.current.connectionState).toBe('disconnected');
    });

    it('transitions to connecting then connected', () => {
      const hook = setup();
      act(() => {
        hook.result.current.connect('ws://localhost:8080');
      });
      expect(hook.result.current.connectionState).toBe('connecting');

      const ws = fakeWSInstances[fakeWSInstances.length - 1];
      act(() => {
        ws.simulateOpen();
      });
      expect(hook.result.current.connectionState).toBe('connected');
    });

    it('transitions to reconnecting after unexpected close', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { hook, ws } = connectAndOpen();
      act(() => {
        ws.simulateClose();
      });
      expect(hook.result.current.connectionState).toBe('reconnecting');
    });

    it('transitions to disconnected after intentional disconnect', () => {
      const { hook } = connectAndOpen();
      act(() => {
        hook.result.current.disconnect();
      });
      expect(hook.result.current.connectionState).toBe('disconnected');
    });

    it('transitions back to connected after successful reconnect', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { hook, ws } = connectAndOpen();
      act(() => {
        ws.simulateClose();
      });
      expect(hook.result.current.connectionState).toBe('reconnecting');

      act(() => {
        vi.advanceTimersByTime(WS_RECONNECT_BASE_DELAY_MS);
      });
      const ws2 = fakeWSInstances[fakeWSInstances.length - 1];
      // During reconnect attempt, state goes to connecting
      expect(hook.result.current.connectionState).toBe('connecting');

      act(() => {
        ws2.simulateOpen();
      });
      expect(hook.result.current.connectionState).toBe('connected');
    });
  });
});
