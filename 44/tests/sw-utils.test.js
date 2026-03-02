import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  APP_CACHE_PREFIX,
  isServiceWorkerSupported,
  clearAppCaches,
  waitForServiceWorkerUpdate,
  showUpdateBanner,
  hideUpdateBanner,
  handleUpdateClick
} from '../js/sw-utils.js';

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

  describe('APP_CACHE_PREFIX', () => {
    it('should be defined as openanchor-', () => {
      expect(APP_CACHE_PREFIX).toBe('openanchor-');
    });
  });
});
