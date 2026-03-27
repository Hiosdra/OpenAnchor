import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  APP_CACHE_PREFIX,
  isServiceWorkerSupported,
  clearAppCaches,
  waitForServiceWorkerUpdate,
  showUpdateBanner,
  hideUpdateBanner,
  handleUpdateClick,
  forceUpdate
} from '../src/service-worker/sw-utils';

describe('Service Worker Utils', () => {
  describe('isServiceWorkerSupported', () => {
    it('should return true when serviceWorker is in navigator', () => {
      global.navigator.serviceWorker = {};
      expect(isServiceWorkerSupported()).toBe(true);
    });

    it('should return false when serviceWorker is not supported', () => {
      const original = global.navigator.serviceWorker;
      delete global.navigator.serviceWorker;

      expect(isServiceWorkerSupported()).toBe(false);

      global.navigator.serviceWorker = original;
    });
  });

  describe('clearAppCaches', () => {
    beforeEach(() => {
      global.caches = {
        keys: vi.fn(),
        delete: vi.fn()
      };
    });

    it('should clear only openanchor- prefixed caches', async () => {
      global.caches.keys.mockResolvedValue([
        'openanchor-v1',
        'openanchor-v2',
        'other-cache',
        'some-app-cache'
      ]);

      global.caches.delete.mockResolvedValue(true);

      await clearAppCaches();

      expect(global.caches.delete).toHaveBeenCalledTimes(2);
      expect(global.caches.delete).toHaveBeenCalledWith('openanchor-v1');
      expect(global.caches.delete).toHaveBeenCalledWith('openanchor-v2');
      expect(global.caches.delete).not.toHaveBeenCalledWith('other-cache');
    });

    it('should handle no caches gracefully', async () => {
      global.caches.keys.mockResolvedValue([]);

      await clearAppCaches();

      expect(global.caches.delete).not.toHaveBeenCalled();
    });

    it('should handle caches API not available', async () => {
      delete global.caches;

      await expect(clearAppCaches()).resolves.toBeUndefined();
    });
  });

  describe('waitForServiceWorkerUpdate', () => {
    it('should resolve true when waiting worker exists', async () => {
      const registration = {
        waiting: {},
        installing: null,
        addEventListener: vi.fn()
      };

      const result = await waitForServiceWorkerUpdate(registration, 100);
      expect(result).toBe(true);
    });

    it('should resolve false on timeout', async () => {
      const registration = {
        waiting: null,
        installing: null,
        addEventListener: vi.fn()
      };

      const result = await waitForServiceWorkerUpdate(registration, 100);
      expect(result).toBe(false);
    });

    it('should wait for installing worker to become installed', async () => {
      const stateChangeListeners = [];
      const installing = {
        state: 'installing',
        addEventListener: vi.fn((event, listener) => {
          stateChangeListeners.push(listener);
        }),
        removeEventListener: vi.fn()
      };

      const registration = {
        waiting: null,
        installing,
        addEventListener: vi.fn()
      };

      const resultPromise = waitForServiceWorkerUpdate(registration, 5000);

      // Simulate state change to installed
      setTimeout(() => {
        installing.state = 'installed';
        stateChangeListeners.forEach(listener => {
          listener({ target: installing });
        });
      }, 50);

      const result = await resultPromise;
      expect(result).toBe(true);
    });

    it('should respect custom timeout value', async () => {
      const registration = {
        waiting: null,
        installing: null,
        addEventListener: vi.fn()
      };

      // Use a very short timeout to verify it's being used
      const result = await waitForServiceWorkerUpdate(registration, 50);

      // Should return false because no update is found
      expect(result).toBe(false);
    });
  });

  describe('showUpdateBanner', () => {
    it('should add show class to banner', () => {
      const banner = document.createElement('div');
      showUpdateBanner(banner);

      expect(banner.classList.contains('show')).toBe(true);
    });

    it('should handle null banner', () => {
      expect(() => showUpdateBanner(null)).not.toThrow();
    });

    it('should handle undefined banner', () => {
      expect(() => showUpdateBanner()).not.toThrow();
    });
  });

  describe('hideUpdateBanner', () => {
    it('should remove show class from banner', () => {
      const banner = document.createElement('div');
      banner.classList.add('show');

      hideUpdateBanner(banner);

      expect(banner.classList.contains('show')).toBe(false);
    });

    it('should handle null banner', () => {
      expect(() => hideUpdateBanner(null)).not.toThrow();
    });
  });

  describe('handleUpdateClick', () => {
    it('should post SKIP_WAITING message to worker', () => {
      const newWorker = {
        postMessage: vi.fn()
      };

      handleUpdateClick(newWorker);

      expect(newWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });

    it('should reload when no worker is available', () => {
      const reloadSpy = vi.fn();
      global.window = { location: { reload: reloadSpy } };

      handleUpdateClick(null);

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('forceUpdate', () => {
    let btn;
    let reloadSpy;
    let originalLocation;
    let originalCaches;

    beforeEach(() => {
      btn = document.createElement('button');
      btn.innerHTML = 'Update';

      originalLocation = window.location;
      originalCaches = global.caches;

      reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
        configurable: true
      });

      global.caches = {
        keys: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(true)
      };
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true
      });
      global.caches = originalCaches;
    });

    it('should return early when btn is null', async () => {
      await forceUpdate(null);
      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('should reload page when service worker is not supported', async () => {
      const original = navigator.serviceWorker;
      delete global.navigator.serviceWorker;

      await forceUpdate(btn);

      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('updating')).toBe(true);
      expect(reloadSpy).toHaveBeenCalled();

      global.navigator.serviceWorker = original;
    });

    it('should reload page when no registration is found', async () => {
      global.navigator.serviceWorker = {
        getRegistration: vi.fn().mockResolvedValue(undefined)
      };

      await forceUpdate(btn);

      expect(btn.disabled).toBe(true);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should post SKIP_WAITING when registration has waiting worker', async () => {
      const postMessageSpy = vi.fn();
      global.navigator.serviceWorker = {
        getRegistration: vi.fn().mockResolvedValue({
          waiting: { postMessage: postMessageSpy }
        })
      };

      await forceUpdate(btn);

      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(btn.innerHTML).toContain('Instaluję...');
    });

    it('should post SKIP_WAITING when update found with waiting worker', async () => {
      const postMessageSpy = vi.fn();
      const registration = {
        waiting: null,
        installing: null,
        update: vi.fn().mockResolvedValue(undefined),
        addEventListener: vi.fn()
      };

      global.navigator.serviceWorker = {
        getRegistration: vi.fn().mockResolvedValue(registration)
      };

      // After update(), simulate a waiting worker appearing
      registration.update.mockImplementation(async () => {
        registration.waiting = { postMessage: postMessageSpy };
      });

      await forceUpdate(btn);

      expect(registration.update).toHaveBeenCalled();
      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(btn.innerHTML).toContain('Instaluję...');
    });

    it('should clear caches and reload when no update is available', async () => {
      const registration = {
        waiting: null,
        installing: null,
        update: vi.fn().mockResolvedValue(undefined),
        addEventListener: vi.fn()
      };

      global.navigator.serviceWorker = {
        getRegistration: vi.fn().mockResolvedValue(registration)
      };

      await forceUpdate(btn);

      expect(registration.update).toHaveBeenCalled();
      expect(btn.innerHTML).toContain('Czyszczę cache...');
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should restore button state and re-throw on error', async () => {
      const testError = new Error('update failed');
      global.navigator.serviceWorker = {
        getRegistration: vi.fn().mockRejectedValue(testError)
      };

      const originalHTML = btn.innerHTML;

      await expect(forceUpdate(btn)).rejects.toThrow('update failed');

      expect(btn.innerHTML).toBe(originalHTML);
      expect(btn.disabled).toBe(false);
      expect(btn.classList.contains('updating')).toBe(false);
    });
  });

  describe('APP_CACHE_PREFIX', () => {
    it('should be defined as openanchor-', () => {
      expect(APP_CACHE_PREFIX).toBe('openanchor-');
    });
  });
});
