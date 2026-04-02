import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the I18N dependency before importing the module
vi.mock('../src/modules/anchor/i18n', () => ({
  I18N: {
    _lang: 'en',
    t: {
      connOnline: 'Online',
      connOffline: 'Offline',
    },
    translations: {},
    init: vi.fn(),
    fmt: vi.fn(),
    locale: 'en',
    lang: 'en',
    setLang: vi.fn(),
    _applyToDOM: vi.fn(),
  },
}));

import { ConnectionStatus } from '../src/modules/anchor/connection-status';

describe('ConnectionStatus', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="connection-status"></div>
      <span id="connection-status-text"></span>
    `;
    ConnectionStatus._el = null;
    ConnectionStatus._textEl = null;
  });

  it('init() binds elements from the DOM', () => {
    ConnectionStatus.init();
    expect(ConnectionStatus._el).toBe(document.getElementById('connection-status'));
    expect(ConnectionStatus._textEl).toBe(document.getElementById('connection-status-text'));
  });

  it('shows online state when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    ConnectionStatus.init();

    const el = document.getElementById('connection-status')!;
    const textEl = document.getElementById('connection-status-text')!;
    expect(el.classList.contains('connection-status--offline')).toBe(false);
    expect(textEl.textContent).toBe('Online');
  });

  it('shows offline state when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    ConnectionStatus.init();

    const el = document.getElementById('connection-status')!;
    const textEl = document.getElementById('connection-status-text')!;
    expect(el.classList.contains('connection-status--offline')).toBe(true);
    expect(textEl.textContent).toBe('⚠ Offline');
  });

  it('_update toggles offline class and text for online=true', () => {
    ConnectionStatus.init();
    const el = document.getElementById('connection-status')!;
    const textEl = document.getElementById('connection-status-text')!;

    el.classList.add('connection-status--offline');
    ConnectionStatus._update(true);

    expect(el.classList.contains('connection-status--offline')).toBe(false);
    expect(textEl.textContent).toBe('Online');
  });

  it('_update toggles offline class and text for online=false', () => {
    ConnectionStatus.init();
    const el = document.getElementById('connection-status')!;
    const textEl = document.getElementById('connection-status-text')!;

    ConnectionStatus._update(false);

    expect(el.classList.contains('connection-status--offline')).toBe(true);
    expect(textEl.textContent).toBe('⚠ Offline');
  });

  it('_update does nothing when elements are null', () => {
    // Don't call init(), so _el and _textEl remain null
    expect(() => ConnectionStatus._update(true)).not.toThrow();
  });

  it('responds to online/offline window events after init', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    ConnectionStatus.init();

    const el = document.getElementById('connection-status')!;
    const textEl = document.getElementById('connection-status-text')!;

    window.dispatchEvent(new Event('offline'));
    expect(el.classList.contains('connection-status--offline')).toBe(true);
    expect(textEl.textContent).toBe('⚠ Offline');

    window.dispatchEvent(new Event('online'));
    expect(el.classList.contains('connection-status--offline')).toBe(false);
    expect(textEl.textContent).toBe('Online');
  });
});
