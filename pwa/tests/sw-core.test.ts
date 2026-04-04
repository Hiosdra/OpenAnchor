import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CACHE_NAME,
  coreUrls,
  moduleUrls,
  CDN_HOSTNAMES,
  isCdnRequest,
  getModuleUrls,
  shouldHandleFetch,
  isHashedAsset,
  cacheFirstStrategy,
  staleWhileRevalidate,
} from '../src/service-worker/sw-core';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

describe('sw-core constants', () => {
  it('CACHE_NAME is a versioned string', () => {
    expect(CACHE_NAME).toBe('openanchor-superapp-v10');
  });

  it('coreUrls contains root and index', () => {
    expect(coreUrls).toEqual(['./', './index.html']);
  });

  it('moduleUrls has all four modules with two URLs each', () => {
    expect(Object.keys(moduleUrls)).toEqual([
      'anchor',
      'wachtownik',
      'egzamin',
      'zeglowanie',
    ]);
    for (const urls of Object.values(moduleUrls)) {
      expect(urls).toHaveLength(2);
      expect(urls[0]).toMatch(/^\.\/modules\//);
      expect(urls[1]).toMatch(/index\.html$/);
    }
  });

  it('CDN_HOSTNAMES includes all expected CDNs', () => {
    expect(CDN_HOSTNAMES).toContain('cdn.tailwindcss.com');
    expect(CDN_HOSTNAMES).toContain('cdn.jsdelivr.net');
    expect(CDN_HOSTNAMES).toContain('unpkg.com');
    expect(CDN_HOSTNAMES).toContain('cdnjs.cloudflare.com');
    expect(CDN_HOSTNAMES).toHaveLength(4);
  });
});

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

describe('isCdnRequest', () => {
  it.each([
    'https://cdn.tailwindcss.com/tailwind.css',
    'https://cdn.jsdelivr.net/npm/htmx.org',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
  ])('returns true for CDN URL %s', (raw) => {
    expect(isCdnRequest(new URL(raw))).toBe(true);
  });

  it.each([
    'https://example.com/app.js',
    'https://mysite.com/api/data',
    'http://localhost:3000/index.html',
  ])('returns false for non-CDN URL %s', (raw) => {
    expect(isCdnRequest(new URL(raw))).toBe(false);
  });
});

describe('getModuleUrls', () => {
  it('returns URLs for a known module', () => {
    expect(getModuleUrls('egzamin')).toEqual([
      './modules/egzamin/',
      './modules/egzamin/index.html',
    ]);
  });

  it('returns undefined for unknown module', () => {
    expect(getModuleUrls('nonexistent')).toBeUndefined();
  });
});

describe('shouldHandleFetch', () => {
  it('returns true for http GET', () => {
    expect(shouldHandleFetch(new URL('http://example.com/page'), 'GET')).toBe(true);
  });

  it('returns true for https GET', () => {
    expect(shouldHandleFetch(new URL('https://example.com/page'), 'GET')).toBe(true);
  });

  it('returns false for non-http protocols', () => {
    expect(shouldHandleFetch(new URL('chrome-extension://id/page'), 'GET')).toBe(false);
    expect(shouldHandleFetch(new URL('data:text/html,<h1>hi</h1>'), 'GET')).toBe(false);
  });

  it('returns false for CDN URLs', () => {
    expect(shouldHandleFetch(new URL('https://cdn.jsdelivr.net/npm/foo'), 'GET')).toBe(false);
  });

  it('returns false for non-GET methods', () => {
    expect(shouldHandleFetch(new URL('https://example.com/api'), 'POST')).toBe(false);
    expect(shouldHandleFetch(new URL('https://example.com/api'), 'PUT')).toBe(false);
  });
});

describe('isHashedAsset', () => {
  it('returns true when pathname contains /assets/', () => {
    expect(isHashedAsset(new URL('https://example.com/app/assets/main-abc123.js'))).toBe(true);
    expect(isHashedAsset(new URL('https://example.com/OpenAnchor/95/assets/style.css'))).toBe(true);
  });

  it('returns false for non-asset paths', () => {
    expect(isHashedAsset(new URL('https://example.com/page'))).toBe(false);
    expect(isHashedAsset(new URL('https://example.com/api/data'))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Caching strategies (require global mocks)                          */
/* ------------------------------------------------------------------ */

describe('cacheFirstStrategy', () => {
  let mockCache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
  let originalCaches: typeof globalThis.caches;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    mockCache = {
      match: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    originalCaches = globalThis.caches;
    originalFetch = globalThis.fetch;

    globalThis.caches = {
      match: vi.fn(),
      open: vi.fn().mockResolvedValue(mockCache),
      has: vi.fn(),
      keys: vi.fn(),
      delete: vi.fn(),
    } as unknown as CacheStorage;

    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  });

  it('returns cached response when available', async () => {
    const cached = new Response('cached');
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockResolvedValue(cached);

    const request = new Request('https://example.com/assets/main.js');
    const result = await cacheFirstStrategy(request);

    expect(result).toBe(cached);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fetches and caches on miss with 200 response', async () => {
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const networkResponse = new Response('fresh', { status: 200 });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(networkResponse);

    const request = new Request('https://example.com/assets/main.js');
    const result = await cacheFirstStrategy(request);

    expect(result.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(request);
    expect(globalThis.caches.open).toHaveBeenCalledWith(CACHE_NAME);
    expect(mockCache.put).toHaveBeenCalled();
  });

  it('returns network response without caching on non-200', async () => {
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const networkResponse = new Response('not found', { status: 404 });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(networkResponse);

    const request = new Request('https://example.com/assets/missing.js');
    const result = await cacheFirstStrategy(request);

    expect(result.status).toBe(404);
    expect(mockCache.put).not.toHaveBeenCalled();
  });
});

describe('staleWhileRevalidate', () => {
  let mockCache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
  let originalCaches: typeof globalThis.caches;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    mockCache = {
      match: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    };

    originalCaches = globalThis.caches;
    originalFetch = globalThis.fetch;

    globalThis.caches = {
      match: vi.fn(),
      open: vi.fn().mockResolvedValue(mockCache),
      has: vi.fn(),
      keys: vi.fn(),
      delete: vi.fn(),
    } as unknown as CacheStorage;

    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  });

  it('returns cached response immediately and revalidates in background', async () => {
    const cachedResponse = new Response('stale');
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockResolvedValue(cachedResponse);

    const freshResponse = new Response('fresh', { status: 200 });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(freshResponse);

    const request = new Request('https://example.com/page');
    const result = await staleWhileRevalidate(request);

    expect(result).toBe(cachedResponse);
    // Background revalidation fires fetch
    expect(globalThis.fetch).toHaveBeenCalledWith(request);

    // Let background promise settle
    await new Promise((r) => setTimeout(r, 10));
    expect(globalThis.caches.open).toHaveBeenCalledWith(CACHE_NAME);
  });

  it('fetches from network on cache miss and caches the 200 response', async () => {
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const networkResponse = new Response('fresh', { status: 200 });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(networkResponse);

    const request = new Request('https://example.com/page');
    const result = await staleWhileRevalidate(request);

    expect(result.status).toBe(200);
    expect(globalThis.caches.open).toHaveBeenCalledWith(CACHE_NAME);
    expect(mockCache.put).toHaveBeenCalled();
  });

  it('returns non-200 network response without caching', async () => {
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const networkResponse = new Response('error', { status: 500 });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(networkResponse);

    const request = new Request('https://example.com/page');
    const result = await staleWhileRevalidate(request);

    expect(result.status).toBe(500);
    expect(mockCache.put).not.toHaveBeenCalled();
  });

  it('falls back to index.html for navigate requests when offline', async () => {
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockImplementation(
      (key: RequestInfo) => {
        const url = typeof key === 'string' ? key : (key as Request).url;
        if (url === './index.html') return Promise.resolve(new Response('<html>shell</html>'));
        return Promise.resolve(undefined);
      },
    );
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));

    // Request.mode is read-only; create a plain object that quacks like a Request
    const request = new Request('https://example.com/some-page');
    Object.defineProperty(request, 'mode', { value: 'navigate', writable: false });
    const result = await staleWhileRevalidate(request);

    const text = await result.text();
    expect(text).toBe('<html>shell</html>');
  });

  it('falls back to ./ when index.html is also missing', async () => {
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockImplementation(
      (key: RequestInfo) => {
        const url = typeof key === 'string' ? key : (key as Request).url;
        if (url === './') return Promise.resolve(new Response('<html>root</html>'));
        return Promise.resolve(undefined);
      },
    );
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));

    const request = new Request('https://example.com/some-page');
    Object.defineProperty(request, 'mode', { value: 'navigate', writable: false });
    const result = await staleWhileRevalidate(request);

    const text = await result.text();
    expect(text).toBe('<html>root</html>');
  });

  it('returns 503 for non-navigate requests when offline', async () => {
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));

    const request = new Request('https://example.com/api/data');
    const result = await staleWhileRevalidate(request);

    expect(result.status).toBe(503);
    expect(result.statusText).toBe('Service Unavailable');
  });

  it('does not crash when background revalidation fails', async () => {
    const cachedResponse = new Response('stale');
    (globalThis.caches.match as ReturnType<typeof vi.fn>).mockResolvedValue(cachedResponse);
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'));

    const request = new Request('https://example.com/page');
    const result = await staleWhileRevalidate(request);

    expect(result).toBe(cachedResponse);
    // Let background promise settle without throwing
    await new Promise((r) => setTimeout(r, 10));
  });
});

/* ------------------------------------------------------------------ */
/*  afterEach import for cleanup                                       */
/* ------------------------------------------------------------------ */
import { afterEach } from 'vitest';
