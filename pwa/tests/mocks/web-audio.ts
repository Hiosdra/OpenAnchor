import { vi } from 'vitest';

export function createMockOscillator() {
  return {
    type: '' as OscillatorType,
    frequency: { setValueAtTime: vi.fn(), value: 440 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  };
}

export function createMockGainNode() {
  return {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      value: 1,
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

export function createMockAudioContext() {
  const oscillator = createMockOscillator();
  const gainNode = createMockGainNode();

  return {
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gainNode),
    destination: {},
    currentTime: 0,
    state: 'running' as AudioContextState,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    _oscillator: oscillator,
    _gainNode: gainNode,
  };
}

export function installMockAudioContext() {
  const ctx = createMockAudioContext();
  const Original = globalThis.AudioContext;

  (globalThis as any).AudioContext = vi.fn(() => ctx);
  (globalThis as any).webkitAudioContext = vi.fn(() => ctx);

  return {
    context: ctx,
    restore() {
      (globalThis as any).AudioContext = Original;
      delete (globalThis as any).webkitAudioContext;
    },
  };
}
