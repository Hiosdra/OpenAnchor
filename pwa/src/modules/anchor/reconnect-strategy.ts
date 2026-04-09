/**
 * ReconnectStrategy — extracted from SyncController for testability.
 *
 * Encapsulates exponential backoff logic for WebSocket reconnection.
 * Pure logic, no DOM or WebSocket dependencies.
 */
import { WS_RECONNECT_BASE_DELAY_MS, WS_RECONNECT_MAX_DELAY_MS } from '@shared/constants/protocol';

export interface ReconnectConfig {
  baseDelay?: number;
  maxDelay?: number;
  maxAttempts?: number;
}

const DEFAULTS: Required<ReconnectConfig> = {
  baseDelay: WS_RECONNECT_BASE_DELAY_MS,
  maxDelay: WS_RECONNECT_MAX_DELAY_MS,
  maxAttempts: Infinity,
};

export class ReconnectStrategy {
  private _attempts = 0;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _intentionalDisconnect = false;
  private readonly _config: Required<ReconnectConfig>;

  constructor(config: ReconnectConfig = {}) {
    this._config = { ...DEFAULTS, ...config };
  }

  get attempts(): number {
    return this._attempts;
  }

  get isIntentionalDisconnect(): boolean {
    return this._intentionalDisconnect;
  }

  /** Calculate delay for the current attempt (exponential backoff, capped). */
  getNextDelay(): number {
    const delay = Math.min(
      this._config.baseDelay * Math.pow(2, this._attempts),
      this._config.maxDelay,
    );
    return delay;
  }

  /** Whether more reconnect attempts are allowed. */
  canReconnect(): boolean {
    return !this._intentionalDisconnect && this._attempts < this._config.maxAttempts;
  }

  /**
   * Schedule a reconnect callback. Returns the delay used (ms), or null if
   * reconnection is not allowed.
   */
  schedule(callback: () => void): number | null {
    this.cancelPending();
    if (!this.canReconnect()) return null;

    const delay = this.getNextDelay();
    this._attempts++;
    this._timer = setTimeout(callback, delay);
    return delay;
  }

  /** Cancel any pending reconnect timer. */
  cancelPending(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /** Mark disconnection as intentional (stops further reconnects). */
  markIntentional(): void {
    this._intentionalDisconnect = true;
    this.cancelPending();
    this._attempts = 0;
  }

  /** Reset state for a fresh connection cycle. */
  reset(): void {
    this._intentionalDisconnect = false;
    this._attempts = 0;
    this.cancelPending();
  }

  /** Called after a successful connection. */
  onConnected(): void {
    this._attempts = 0;
  }
}
