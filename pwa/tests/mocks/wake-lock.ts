import { vi } from 'vitest';

export function createMockWakeLockSentinel() {
  return {
    released: false,
    release: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    type: 'screen' as WakeLockType,
  };
}

export function createMockWakeLock() {
  const sentinel = createMockWakeLockSentinel();
  return {
    request: vi.fn().mockResolvedValue(sentinel),
    _sentinel: sentinel,
  };
}

export function createMockBattery(level = 0.8, charging = false) {
  return {
    level,
    charging,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    chargingTime: charging ? 0 : Infinity,
    dischargingTime: Infinity,
  };
}

export function installMockWakeLock() {
  const wakeLock = createMockWakeLock();
  Object.defineProperty(navigator, 'wakeLock', {
    value: wakeLock,
    writable: true,
    configurable: true,
  });
  return wakeLock;
}

export function installMockBattery(level = 0.8, charging = false) {
  const battery = createMockBattery(level, charging);
  Object.defineProperty(navigator, 'getBattery', {
    value: vi.fn().mockResolvedValue(battery),
    writable: true,
    configurable: true,
  });
  return battery;
}
