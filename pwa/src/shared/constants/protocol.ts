/**
 * WebSocket Protocol Constants (v2.0)
 * See docs/protocol/protocol.md for full specification.
 *
 * These values MUST stay in sync with the Android companion constants in:
 *   - android/core/network/.../AnchorWebSocketServer.kt
 *   - android/core/network/.../AnchorWebSocketClient.kt
 */

// ── Timing ──────────────────────────────────────────────────────────────────

/** Interval between PING messages sent to the peer. */
export const WS_PING_INTERVAL_MS = 5_000;

/** If no PING is received from the peer within this window, the connection is considered lost. */
export const WS_HEARTBEAT_TIMEOUT_MS = 15_000;

/** Interval between STATE_UPDATE messages. */
export const WS_STATE_UPDATE_INTERVAL_MS = 2_000;

// ── Connection ──────────────────────────────────────────────────────────────

/** Default WebSocket server port. */
export const WS_DEFAULT_PORT = 8080;

/** Maximum WebSocket frame size in bytes (64 KB). */
export const WS_MAX_FRAME_SIZE = 65_536;

// ── Reconnection ────────────────────────────────────────────────────────────

/** Base delay before the first reconnect attempt. */
export const WS_RECONNECT_BASE_DELAY_MS = 2_000;

/** Maximum delay between reconnect attempts (cap for exponential backoff). */
export const WS_RECONNECT_MAX_DELAY_MS = 30_000;

/** Multiplier applied to the delay on each successive reconnect attempt. */
export const WS_RECONNECT_BACKOFF_MULTIPLIER = 2;

// ── Message Types ───────────────────────────────────────────────────────────

export const MessageType = {
  FULL_SYNC: 'FULL_SYNC',
  STATE_UPDATE: 'STATE_UPDATE',
  TRIGGER_ALARM: 'TRIGGER_ALARM',
  ANDROID_GPS_REPORT: 'ANDROID_GPS_REPORT',
  ACTION_COMMAND: 'ACTION_COMMAND',
  PING: 'PING',
  PONG: 'PONG',
  DISCONNECT: 'DISCONNECT',
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

// ── Connection State ────────────────────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
