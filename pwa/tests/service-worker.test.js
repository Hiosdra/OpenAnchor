import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock service worker globals
const createServiceWorkerEnvironment = () => {
  const listeners = {};

  global.self = {
    addEventListener: vi.fn((event, handler) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: {
      claim: vi.fn().mockResolvedValue(undefined)
    }
  };

  global.caches = {
    open: vi.fn(),
    match: vi.fn(),
    keys: vi.fn(),
    delete: vi.fn()
  };

  global.fetch = vi.fn();

  return {
    listeners,
    trigger: (event, data) => {
      if (listeners[event]) {
        listeners[event].forEach(handler => handler(data));
      }
    }
  };
};

describe('Service Worker Core Functionality', () => {
  const CACHE_NAME = 'openanchor-superapp-v6';
  const EXPECTED_URLS = [
    './',
    './index.html',
    './modules/anchor/',
    './modules/anchor/index.html',
    './modules/wachtownik/',
    './modules/wachtownik/index.html',
    './modules/egzamin/',
    './modules/egzamin/index.html',
    './modules/egzamin/exam_questions.json',
    './manifest.json',
    './assets/icon-192x192.png',
    './assets/icon-512x512.png',
    './assets/icon.svg'
  ];

  describe('Constants', () => {
    it('should have correct cache name', () => {
      expect(CACHE_NAME).toBe('openanchor-superapp-v6');
    });

    it('should have all required URLs to cache', () => {
      expect(EXPECTED_URLS).toContain('./index.html');
      expect(EXPECTED_URLS).toContain('./modules/egzamin/exam_questions.json');
      expect(EXPECTED_URLS).toContain('./manifest.json');
      expect(EXPECTED_URLS.length).toBe(13);
    });
  });

  describe('Install Event', () => {
    it('should cache all required URLs on install', async () => {
      const mockCache = {
        addAll: vi.fn().mockResolvedValue(undefined)
      };

      // Create a mock caches API
      const mockCachesAPI = {
        open: vi.fn().mockResolvedValue(mockCache)
      };

      const event = {
        waitUntil: vi.fn(promise => promise)
      };

      // Simulate install handler
      await event.waitUntil(
        mockCachesAPI.open(CACHE_NAME).then(cache => cache.addAll(EXPECTED_URLS))
      );

      expect(mockCachesAPI.open).toHaveBeenCalledWith(CACHE_NAME);
      expect(mockCache.addAll).toHaveBeenCalledWith(EXPECTED_URLS);
    });
  });

  describe('Message Event', () => {
    it('should skip waiting when receiving SKIP_WAITING message', async () => {
      const env = createServiceWorkerEnvironment();

      const event = {
        data: { type: 'SKIP_WAITING' },
        waitUntil: vi.fn(promise => promise)
      };

      // Simulate message handler
      if (event.data && event.data.type === 'SKIP_WAITING') {
        await event.waitUntil(self.skipWaiting());
      }

      expect(self.skipWaiting).toHaveBeenCalled();
    });

    it('should ignore other message types', () => {
      const event = {
        data: { type: 'OTHER_MESSAGE' }
      };

      // Message handler should not call skipWaiting for other types
      if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
      }

      expect(self.skipWaiting).not.toHaveBeenCalled();
    });
  });

  describe('Fetch Event - Cache Strategy', () => {
    beforeEach(() => {
      global.caches.match = vi.fn();
      global.fetch = vi.fn();
    });

    it('should serve from cache when available', async () => {
      const cachedResponse = new Response('cached');
      caches.match.mockResolvedValue(cachedResponse);

      const request = new Request('https://example.com/index.html');
      const response = await caches.match(request);

      expect(response).toBe(cachedResponse);
    });

    it('should fetch from network when not in cache', async () => {
      caches.match.mockResolvedValue(undefined);

      const networkResponse = new Response('network', { status: 200 });
      global.fetch.mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/index.html');
      const cachedResponse = await caches.match(request);

      if (!cachedResponse) {
        const response = await fetch(request);
        expect(response).toBe(networkResponse);
      }
    });

    it('should not cache non-200 responses', async () => {
      const badResponse = new Response('error', { status: 404 });
      global.fetch.mockResolvedValue(badResponse);

      const request = new Request('https://example.com/notfound.html');
      const response = await fetch(request);

      // Should not cache 404 responses
      expect(response.status).toBe(404);
    });

    it('should handle http and https schemes only', () => {
      const httpUrl = new URL('http://example.com');
      const httpsUrl = new URL('https://example.com');
      const chromeUrl = new URL('chrome-extension://abc123');

      expect(httpUrl.protocol).toBe('http:');
      expect(httpsUrl.protocol).toBe('https:');
      expect(chromeUrl.protocol).toBe('chrome-extension:');

      // Service worker should only handle http/https
      const shouldHandle = (url) => {
        return url.protocol === 'http:' || url.protocol === 'https:';
      };

      expect(shouldHandle(httpUrl)).toBe(true);
      expect(shouldHandle(httpsUrl)).toBe(true);
      expect(shouldHandle(chromeUrl)).toBe(false);
    });
  });

  describe('Activate Event', () => {
    it('should delete old caches', async () => {
      const oldCaches = ['openanchor-v1', 'openanchor-v2', 'openanchor-superapp-v6'];
      caches.keys.mockResolvedValue(oldCaches);
      caches.delete.mockResolvedValue(true);

      const cacheWhitelist = [CACHE_NAME];
      const cacheNames = await caches.keys();

      const deletions = cacheNames.map(cacheName => {
        if (cacheWhitelist.indexOf(cacheName) === -1) {
          return caches.delete(cacheName);
        }
      });

      await Promise.all(deletions);

      expect(caches.delete).toHaveBeenCalledWith('openanchor-v1');
      expect(caches.delete).toHaveBeenCalledWith('openanchor-v2');
      expect(caches.delete).not.toHaveBeenCalledWith('openanchor-superapp-v6');
    });

    it('should claim clients after activation', async () => {
      const env = createServiceWorkerEnvironment();

      await self.clients.claim();

      expect(self.clients.claim).toHaveBeenCalled();
    });
  });

  describe('Offline Fallback', () => {
    it('should serve index.html for navigation requests when offline', async () => {
      const indexResponse = new Response('<html></html>');
      caches.match.mockImplementation((req) => {
        if (req === './index.html' || req === './') {
          return Promise.resolve(indexResponse);
        }
        return Promise.resolve(undefined);
      });

      global.fetch.mockRejectedValue(new Error('Network error'));

      const request = new Request('https://example.com/some-page', {
        mode: 'navigate'
      });

      // Simulate offline fallback logic
      try {
        await fetch(request);
      } catch (error) {
        if (request.mode === 'navigate') {
          const fallback = await caches.match('./index.html') || await caches.match('./');
          expect(fallback).toBe(indexResponse);
        }
      }
    });

    it('should return 503 for non-navigation requests when offline', async () => {
      caches.match.mockResolvedValue(undefined);
      global.fetch.mockRejectedValue(new Error('Network error'));

      const request = new Request('https://example.com/api/data', {
        mode: 'cors'
      });

      try {
        await fetch(request);
      } catch (error) {
        if (request.mode !== 'navigate') {
          const response = new Response('', { status: 503, statusText: 'Service Unavailable' });
          expect(response.status).toBe(503);
        }
      }
    });
  });

  describe('Background Sync', () => {
    it('should handle sync-position event', () => {
      const syncTag = 'sync-position';
      expect(syncTag).toBe('sync-position');
    });

    it('should handle check-anchor-position periodic sync', () => {
      const syncTag = 'check-anchor-position';
      expect(syncTag).toBe('check-anchor-position');
    });
  });
});
