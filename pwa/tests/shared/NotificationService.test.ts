import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requestPermission,
  showNotification,
  vibrate,
} from '../../src/shared/services/NotificationService';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('NotificationService', () => {
  describe('requestPermission', () => {
    it('returns denied when Notification API is unavailable', async () => {
      const orig = globalThis.Notification;
      // @ts-expect-error — testing unavailable API
      delete globalThis.Notification;
      expect(await requestPermission()).toBe('denied');
      globalThis.Notification = orig;
    });

    it('returns granted when already granted', async () => {
      const orig = globalThis.Notification;
      globalThis.Notification = {
        permission: 'granted',
        requestPermission: vi.fn(),
      } as unknown as typeof Notification;
      expect(await requestPermission()).toBe('granted');
      globalThis.Notification = orig;
    });

    it('returns denied when already denied', async () => {
      const orig = globalThis.Notification;
      globalThis.Notification = {
        permission: 'denied',
        requestPermission: vi.fn(),
      } as unknown as typeof Notification;
      expect(await requestPermission()).toBe('denied');
      expect(globalThis.Notification.requestPermission).not.toHaveBeenCalled();
      globalThis.Notification = orig;
    });

    it('calls requestPermission when permission is default', async () => {
      const orig = globalThis.Notification;
      globalThis.Notification = {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      } as unknown as typeof Notification;
      expect(await requestPermission()).toBe('granted');
      expect(globalThis.Notification.requestPermission).toHaveBeenCalledOnce();
      globalThis.Notification = orig;
    });
  });

  describe('showNotification', () => {
    it('is a no-op when Notification API is unavailable', async () => {
      const orig = globalThis.Notification;
      // @ts-expect-error — testing unavailable API
      delete globalThis.Notification;
      // Should not throw
      await showNotification('test');
      globalThis.Notification = orig;
    });

    it('is a no-op when permission is not granted', async () => {
      const orig = globalThis.Notification;
      globalThis.Notification = {
        permission: 'denied',
      } as unknown as typeof Notification;
      await showNotification('test');
      globalThis.Notification = orig;
    });

    it('uses service worker notification when available', async () => {
      const orig = globalThis.Notification;
      const origSW = navigator.serviceWorker;

      const mockShowNotification = vi.fn().mockResolvedValue(undefined);
      globalThis.Notification = { permission: 'granted' } as unknown as typeof Notification;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({ showNotification: mockShowNotification }) },
        configurable: true,
      });

      await showNotification('Test Title', { body: 'Test body' });

      expect(mockShowNotification).toHaveBeenCalledWith('Test Title', { body: 'Test body' });
      globalThis.Notification = orig;
      Object.defineProperty(navigator, 'serviceWorker', { value: origSW, configurable: true });
    });

    it('falls back to Notification constructor when SW is unavailable', async () => {
      const orig = globalThis.Notification;
      const origSW = navigator.serviceWorker;

      const constructorSpy = vi.fn();
      globalThis.Notification = Object.assign(constructorSpy, {
        permission: 'granted',
      }) as unknown as typeof Notification;

      // Remove service worker to force fallback
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { ready: Promise.resolve({}) },
        configurable: true,
      });

      await showNotification('Fallback', { body: 'fb' });
      expect(constructorSpy).toHaveBeenCalledWith('Fallback', { body: 'fb' });

      globalThis.Notification = orig;
      Object.defineProperty(navigator, 'serviceWorker', { value: origSW, configurable: true });
    });
  });

  describe('vibrate', () => {
    it('calls navigator.vibrate when available', () => {
      const origVibrate = navigator.vibrate;
      const spy = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: spy, configurable: true });

      vibrate([100, 50, 100]);
      expect(spy).toHaveBeenCalledWith([100, 50, 100]);

      Object.defineProperty(navigator, 'vibrate', { value: origVibrate, configurable: true });
    });

    it('is a no-op when vibrate is not available', () => {
      const origVibrate = navigator.vibrate;
      Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
      // Should not throw
      vibrate([200]);
      Object.defineProperty(navigator, 'vibrate', { value: origVibrate, configurable: true });
    });
  });
});
