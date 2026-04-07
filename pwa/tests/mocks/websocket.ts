import { vi } from 'vitest';

export class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  url: string;
  readyState: number = FakeWebSocket.CONNECTING;

  onopen: ((ev: any) => void) | null = null;
  onclose: ((ev: any) => void) | null = null;
  onmessage: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;

  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
  }

  simulateOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({} as any);
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason } as any);
  }

  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) } as any);
  }

  simulateRawMessage(data: string) {
    this.onmessage?.({ data } as any);
  }

  simulateError(err?: any) {
    this.onerror?.(err ?? ({} as any));
  }
}

export function installFakeWebSocket() {
  const instances: FakeWebSocket[] = [];
  const OriginalWebSocket = globalThis.WebSocket;

  (globalThis as any).WebSocket = class extends FakeWebSocket {
    constructor(url: string) {
      super(url);
      instances.push(this);
    }
  };

  // Copy static constants onto the replacement class
  Object.assign((globalThis as any).WebSocket, {
    CONNECTING: FakeWebSocket.CONNECTING,
    OPEN: FakeWebSocket.OPEN,
    CLOSING: FakeWebSocket.CLOSING,
    CLOSED: FakeWebSocket.CLOSED,
  });

  return {
    instances,
    get latest() {
      return instances[instances.length - 1] as FakeWebSocket | undefined;
    },
    restore() {
      (globalThis as any).WebSocket = OriginalWebSocket;
    },
  };
}
