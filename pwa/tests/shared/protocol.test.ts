import { describe, it, expect } from 'vitest';
import {
  WS_PING_INTERVAL_MS,
  WS_HEARTBEAT_TIMEOUT_MS,
  WS_STATE_UPDATE_INTERVAL_MS,
  WS_DEFAULT_PORT,
  WS_MAX_FRAME_SIZE,
  WS_RECONNECT_BASE_DELAY_MS,
  WS_RECONNECT_MAX_DELAY_MS,
  WS_RECONNECT_BACKOFF_MULTIPLIER,
  MessageType,
} from '../../src/shared/constants/protocol';

describe('protocol constants', () => {
  describe('timing', () => {
    it('PING interval is 5 seconds', () => {
      expect(WS_PING_INTERVAL_MS).toBe(5_000);
    });

    it('heartbeat timeout is 15 seconds', () => {
      expect(WS_HEARTBEAT_TIMEOUT_MS).toBe(15_000);
    });

    it('state update interval is 2 seconds', () => {
      expect(WS_STATE_UPDATE_INTERVAL_MS).toBe(2_000);
    });

    it('heartbeat timeout is at least 2× ping interval', () => {
      expect(WS_HEARTBEAT_TIMEOUT_MS).toBeGreaterThanOrEqual(WS_PING_INTERVAL_MS * 2);
    });
  });

  describe('connection', () => {
    it('default port is 8080', () => {
      expect(WS_DEFAULT_PORT).toBe(8080);
    });

    it('max frame size is 64 KB', () => {
      expect(WS_MAX_FRAME_SIZE).toBe(65_536);
    });
  });

  describe('reconnection', () => {
    it('base delay is 2 seconds', () => {
      expect(WS_RECONNECT_BASE_DELAY_MS).toBe(2_000);
    });

    it('max delay is 30 seconds', () => {
      expect(WS_RECONNECT_MAX_DELAY_MS).toBe(30_000);
    });

    it('backoff multiplier is 2', () => {
      expect(WS_RECONNECT_BACKOFF_MULTIPLIER).toBe(2);
    });

    it('max delay is reachable from base delay with multiplier', () => {
      expect(WS_RECONNECT_MAX_DELAY_MS).toBeGreaterThan(WS_RECONNECT_BASE_DELAY_MS);
    });
  });

  describe('MessageType', () => {
    it('contains all expected message types', () => {
      expect(MessageType.FULL_SYNC).toBe('FULL_SYNC');
      expect(MessageType.STATE_UPDATE).toBe('STATE_UPDATE');
      expect(MessageType.TRIGGER_ALARM).toBe('TRIGGER_ALARM');
      expect(MessageType.ANDROID_GPS_REPORT).toBe('ANDROID_GPS_REPORT');
      expect(MessageType.ACTION_COMMAND).toBe('ACTION_COMMAND');
      expect(MessageType.PING).toBe('PING');
      expect(MessageType.PONG).toBe('PONG');
      expect(MessageType.DISCONNECT).toBe('DISCONNECT');
    });

    it('has exactly 8 message types', () => {
      expect(Object.keys(MessageType)).toHaveLength(8);
    });
  });
});
