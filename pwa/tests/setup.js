// Test setup file
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

global.localStorage = localStorageMock;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock navigator for service worker tests — preserve getter-based props like userAgent
const origNav = global.navigator;
const userAgent = origNav?.userAgent || 'Mozilla/5.0 (happy-dom)';
global.navigator = {
  ...global.navigator,
  userAgent,
  serviceWorker: {
    register: vi.fn(),
    controller: null,
    addEventListener: vi.fn(),
  }
};

// Reset mocks before each test
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
