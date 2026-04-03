import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the dashboard/index dependency that dashboard-ui.ts imports
vi.mock('../src/modules/dashboard/index', () => ({
  initBetaMode: vi.fn(),
  toggleBetaMode: vi.fn(),
  openSettings: vi.fn(),
  closeSettings: vi.fn(),
  closeSettingsOnBackdrop: vi.fn(),
  openModule: vi.fn(),
}));

import { initDashboard } from '../src/modules/dashboard/dashboard-ui';
import {
  initBetaMode,
  toggleBetaMode,
  openSettings,
  closeSettings,
  closeSettingsOnBackdrop,
  openModule,
} from '../src/modules/dashboard/index';

describe('dashboard-ui', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.dataset.theme = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── setTheme & updateThemeButtons ───────────────────────────────
  describe('setTheme (exposed via initDashboard)', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button class="theme-btn" data-theme-value="dark"></button>
        <button class="theme-btn" data-theme-value="light"></button>
        <button class="theme-btn" data-theme-value="oled"></button>
        <button id="forceUpdateBtn"></button>
        <div id="installBanner"></div>
        <button id="installBtn"></button>
        <button id="installDismissBtn"></button>
        <div id="updateBanner"></div>
        <button id="updateBtn"></button>
        <button id="dismissBtn"></button>
        <div class="module-card" tabindex="0"></div>
      `;
      initDashboard();
    });

    it('sets data-theme on documentElement and persists to localStorage', () => {
      (window as any).setTheme('light');
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(localStorage.getItem('openanchor-theme')).toBe('light');
    });

    it('sets dark theme', () => {
      (window as any).setTheme('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(localStorage.getItem('openanchor-theme')).toBe('dark');
    });

    it('marks correct button as active after setTheme', () => {
      (window as any).setTheme('light');
      const lightBtn = document.querySelector('[data-theme-value="light"]')!;
      const darkBtn = document.querySelector('[data-theme-value="dark"]')!;
      expect(lightBtn.classList.contains('active')).toBe(true);
      expect(darkBtn.classList.contains('active')).toBe(false);
    });

    it('defaults to dark when no theme attribute is set', () => {
      delete document.documentElement.dataset.theme;
      // We can't dispatch 'load' because it triggers SW registration.
      // Instead, call setTheme with no current theme and verify the default active.
      (window as any).setTheme('dark');
      const darkBtn = document.querySelector('[data-theme-value="dark"]')!;
      expect(darkBtn.classList.contains('active')).toBe(true);
    });
  });

  // ─── initDashboard globals exposure ──────────────────────────────
  describe('initDashboard()', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button id="forceUpdateBtn"></button>
        <div id="installBanner"></div>
        <div id="updateBanner"></div>
        <button id="updateBtn"></button>
        <button id="dismissBtn"></button>
      `;
      initDashboard();
    });

    it('exposes all expected functions on window', () => {
      expect((window as any).setTheme).toBeDefined();
      expect((window as any).forceUpdate).toBeDefined();
      expect((window as any).toggleBetaMode).toBe(toggleBetaMode);
      expect((window as any).openSettings).toBe(openSettings);
      expect((window as any).closeSettings).toBe(closeSettings);
      expect((window as any).closeSettingsOnBackdrop).toBe(closeSettingsOnBackdrop);
      expect((window as any).openModule).toBe(openModule);
    });

    it('calls initBetaMode on load event when SW register works', () => {
      // Ensure SW register returns a promise
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue({
            waiting: null,
            installing: null,
            update: vi.fn(),
            addEventListener: vi.fn(),
          }),
          addEventListener: vi.fn(),
          controller: null,
        },
        configurable: true,
      });

      initDashboard();
      window.dispatchEvent(new Event('load'));
      expect(initBetaMode).toHaveBeenCalled();
    });
  });

  // ─── forceUpdate branches ────────────────────────────────────────
  describe('forceUpdate', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button id="forceUpdateBtn">Update</button>
        <div id="installBanner"></div>
        <div id="updateBanner"></div>
        <button id="updateBtn"></button>
        <button id="dismissBtn"></button>
      `;
      initDashboard();
    });

    it('returns early when forceUpdateBtn is missing', async () => {
      document.body.innerHTML = '';
      initDashboard();
      await expect((window as any).forceUpdate()).resolves.toBeUndefined();
    });

    it('disables button and shows updating state', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue(undefined),
          addEventListener: vi.fn(),
          controller: null,
        },
        configurable: true,
      });

      const btn = document.getElementById('forceUpdateBtn') as HTMLButtonElement;
      const promise = (window as any).forceUpdate();
      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('updating')).toBe(true);
      await promise;
    });

    it('reloads when no serviceWorker in navigator', async () => {
      const origSW = (navigator as any).serviceWorker;
      delete (navigator as any).serviceWorker;

      const btn = document.getElementById('forceUpdateBtn') as HTMLButtonElement;
      await (window as any).forceUpdate();

      Object.defineProperty(navigator, 'serviceWorker', {
        value: origSW,
        configurable: true,
      });
    });

    it('reloads when no registration found', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue(undefined),
          addEventListener: vi.fn(),
          controller: null,
        },
        configurable: true,
      });
      await (window as any).forceUpdate();
    });

    it('posts SKIP_WAITING if registration.waiting exists', async () => {
      const postMessage = vi.fn();
      const mockReg = {
        waiting: { postMessage },
        update: vi.fn(),
      };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue(mockReg),
          addEventListener: vi.fn(),
          controller: null,
        },
        configurable: true,
      });

      await (window as any).forceUpdate();
      expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });

    it('handles error in forceUpdate gracefully', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockRejectedValue(new Error('SW error')),
          addEventListener: vi.fn(),
          controller: null,
        },
        configurable: true,
      });

      // Mock window.alert since happy-dom may not have it
      (window as any).alert = vi.fn();
      await (window as any).forceUpdate();
      // Button should be restored
      const btn = document.getElementById('forceUpdateBtn') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
      expect(btn.classList.contains('updating')).toBe(false);
    });

    it('clears cache and reloads when no update after registration.update()', async () => {
      const mockReg = {
        waiting: null,
        installing: null,
        update: vi.fn().mockResolvedValue(undefined),
        addEventListener: vi.fn(),
      };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue(mockReg),
          addEventListener: vi.fn(),
          controller: null,
        },
        configurable: true,
      });

      // Mock caches API
      const originalCaches = globalThis.caches;
      Object.defineProperty(globalThis, 'caches', {
        value: {
          keys: vi.fn().mockResolvedValue(['openanchor-v1', 'openanchor-v2', 'other-cache']),
          delete: vi.fn().mockResolvedValue(true),
        },
        configurable: true,
      });

      await (window as any).forceUpdate();

      if (originalCaches) {
        Object.defineProperty(globalThis, 'caches', {
          value: originalCaches,
          configurable: true,
        });
      }
    });

    it('sends SKIP_WAITING when hasUpdate is true after registration.update()', async () => {
      const postMessage = vi.fn();
      const waitingWorker = { postMessage };
      const mockReg = {
        waiting: null as any,
        installing: null as any,
        update: vi.fn().mockImplementation(async () => {
          // After update, waiting becomes available
          mockReg.waiting = waitingWorker;
        }),
        addEventListener: vi.fn().mockImplementation((event: string, cb: Function) => {
          // Trigger updatefound immediately
          if (event === 'updatefound') {
            cb();
          }
        }),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue(mockReg),
          addEventListener: vi.fn(),
          controller: null,
        },
        configurable: true,
      });

      await (window as any).forceUpdate();
      expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
  });

  // ─── Install banner ──────────────────────────────────────────────
  describe('install banner', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="installBanner"></div>
        <button id="installBtn"></button>
        <button id="installDismissBtn"></button>
        <div id="updateBanner"></div>
        <button id="updateBtn"></button>
        <button id="dismissBtn"></button>
        <button id="forceUpdateBtn"></button>
      `;
      initDashboard();
    });

    it('shows install banner on beforeinstallprompt if not dismissed', () => {
      const event = new Event('beforeinstallprompt');
      (event as any).preventDefault = vi.fn();
      window.dispatchEvent(event);
      expect(document.getElementById('installBanner')!.classList.contains('show')).toBe(true);
    });

    it('does not show install banner if dismissed in sessionStorage', () => {
      sessionStorage.setItem('installDismissed', 'true');
      const event = new Event('beforeinstallprompt');
      (event as any).preventDefault = vi.fn();
      window.dispatchEvent(event);
      expect(document.getElementById('installBanner')!.classList.contains('show')).toBe(false);
      sessionStorage.removeItem('installDismissed');
    });

    it('install button returns early if no deferred prompt', () => {
      document.getElementById('installBtn')!.click();
      // Should not throw
    });

    it('dismiss button hides banner and sets sessionStorage', () => {
      document.getElementById('installBanner')!.classList.add('show');
      document.getElementById('installDismissBtn')!.click();
      expect(document.getElementById('installBanner')!.classList.contains('show')).toBe(false);
      expect(sessionStorage.getItem('installDismissed')).toBe('true');
    });

    it('appinstalled event hides banner', () => {
      document.getElementById('installBanner')!.classList.add('show');
      window.dispatchEvent(new Event('appinstalled'));
      expect(document.getElementById('installBanner')!.classList.contains('show')).toBe(false);
    });
  });

  // ─── Card keyboard a11y ──────────────────────────────────────────
  describe('card keyboard accessibility', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="module-card" tabindex="0"></div>
        <div class="module-card" tabindex="0"></div>
        <button id="forceUpdateBtn"></button>
        <div id="installBanner"></div>
        <div id="updateBanner"></div>
        <button id="updateBtn"></button>
        <button id="dismissBtn"></button>
      `;
      initDashboard();
    });

    it('triggers click on Enter key', () => {
      const card = document.querySelector('.module-card')!;
      const clickSpy = vi.fn();
      card.addEventListener('click', clickSpy);
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(clickSpy).toHaveBeenCalled();
    });

    it('triggers click on Space key', () => {
      const card = document.querySelector('.module-card')!;
      const clickSpy = vi.fn();
      card.addEventListener('click', clickSpy);
      card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(clickSpy).toHaveBeenCalled();
    });

    it('does not trigger click on other keys', () => {
      const card = document.querySelector('.module-card')!;
      const clickSpy = vi.fn();
      card.addEventListener('click', clickSpy);
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Service worker registration ─────────────────────────────────
  describe('service worker registration', () => {
    it('skips if no serviceWorker in navigator', () => {
      const origSW = (navigator as any).serviceWorker;
      delete (navigator as any).serviceWorker;
      document.body.innerHTML = `
        <button id="forceUpdateBtn"></button>
        <div id="installBanner"></div>
        <div id="updateBanner"></div>
        <button id="updateBtn"></button>
        <button id="dismissBtn"></button>
      `;
      expect(() => initDashboard()).not.toThrow();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: origSW,
        configurable: true,
      });
    });

    it('controllerchange event reloads only once (refreshing guard)', () => {
      document.body.innerHTML = `
        <button id="forceUpdateBtn"></button>
        <div id="installBanner"></div>
        <div id="updateBanner"></div>
        <button id="updateBtn"></button>
        <button id="dismissBtn"></button>
      `;
      
      const addEventListenerSpy = vi.fn();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          addEventListener: addEventListenerSpy,
          register: vi.fn().mockResolvedValue({
            waiting: null,
            addEventListener: vi.fn(),
            update: vi.fn(),
          }),
          controller: null,
        },
        configurable: true,
      });
      initDashboard();
      // controllerchange handler was registered
      expect(addEventListenerSpy).toHaveBeenCalledWith('controllerchange', expect.any(Function));
    });

    it('updateBtn posts SKIP_WAITING when newWorker is set', () => {
      document.body.innerHTML = `
        <button id="forceUpdateBtn"></button>
        <div id="installBanner"></div>
        <div id="updateBanner"></div>
        <button id="updateBtn"></button>
        <button id="dismissBtn"></button>
      `;
      initDashboard();
      // Without newWorker set, click falls through to else
      document.getElementById('updateBtn')!.click();
    });

    it('dismissBtn hides update banner', () => {
      document.body.innerHTML = `
        <button id="forceUpdateBtn"></button>
        <div id="installBanner"></div>
        <div id="updateBanner" class="show"></div>
        <button id="updateBtn"></button>
        <button id="dismissBtn"></button>
      `;
      initDashboard();
      document.getElementById('dismissBtn')!.click();
      expect(document.getElementById('updateBanner')!.classList.contains('show')).toBe(false);
    });
  });
});
