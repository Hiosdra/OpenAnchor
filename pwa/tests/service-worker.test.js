import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';

const swSource = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');
const CACHE_NAME = 'openanchor-superapp-v10';

function createServiceWorkerEnvironment() {
  const listeners = new Map();
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const windowClients = [{ postMessage: vi.fn() }];

  const context = {
    Promise,
    URL,
    Response,
    console,
    setTimeout,
    clearTimeout,
    caches: {
      open: vi.fn().mockResolvedValue(cache),
      match: vi.fn(),
      keys: vi.fn(),
      delete: vi.fn(),
    },
    fetch: vi.fn(),
    clients: {
      openWindow: vi.fn().mockResolvedValue(undefined),
    },
    self: {
      addEventListener: vi.fn((type, handler) => {
        listeners.set(type, handler);
      }),
      skipWaiting: vi.fn().mockResolvedValue(undefined),
      clients: {
        claim: vi.fn().mockResolvedValue(undefined),
        matchAll: vi.fn().mockResolvedValue(windowClients),
      },
    },
  };

  runInNewContext(swSource, context, { filename: 'public/sw.js' });

  return {
    ...context,
    cache,
    windowClients,
    getHandler(type) {
      const handler = listeners.get(type);
      if (!handler) {
        throw new Error(`Missing ${type} handler`);
      }
      return handler;
    },
  };
}

async function runWaitUntil(handler, event = {}) {
  const pending = [];
  handler({
    ...event,
    waitUntil(promise) {
      pending.push(promise);
      return promise;
    },
  });
  await Promise.all(pending);
}

async function runFetch(handler, request) {
  let responsePromise;
  handler({
    request,
    respondWith(promise) {
      responsePromise = promise;
    },
  });
  expect(responsePromise).toBeDefined();
  return responsePromise;
}

describe('Service Worker Core Functionality', () => {
  it('caches only the core shell on install', async () => {
    const env = createServiceWorkerEnvironment();

    await runWaitUntil(env.getHandler('install'));

    expect(env.caches.open).toHaveBeenCalledWith(CACHE_NAME);
    expect(env.cache.addAll).toHaveBeenCalledWith(['./', './index.html']);
  });

  it('handles SKIP_WAITING and caches modules on demand', async () => {
    const env = createServiceWorkerEnvironment();
    const messageHandler = env.getHandler('message');

    await runWaitUntil(messageHandler, { data: { type: 'SKIP_WAITING' } });
    expect(env.self.skipWaiting).toHaveBeenCalled();

    await runWaitUntil(messageHandler, {
      data: { type: 'CACHE_MODULE', module: 'egzamin' },
    });

    expect(env.caches.open).toHaveBeenCalledWith(CACHE_NAME);
    expect(env.cache.addAll).toHaveBeenLastCalledWith([
      './modules/egzamin/',
      './modules/egzamin/index.html',
    ]);
  });

  it('treats hashed asset requests as cache-first under a Pages base path', async () => {
    const env = createServiceWorkerEnvironment();
    const cachedResponse = new Response('cached asset');
    env.caches.match.mockResolvedValue(cachedResponse);

    const response = await runFetch(env.getHandler('fetch'), {
      url: 'https://example.com/OpenAnchor/95/assets/main-hash.js',
      method: 'GET',
      mode: 'cors',
    });

    expect(response).toBe(cachedResponse);
    expect(env.fetch).not.toHaveBeenCalled();
  });

  it('falls back to ./ when offline navigation misses index.html', async () => {
    const env = createServiceWorkerEnvironment();
    const shellResponse = new Response('<html>shell</html>');

    env.caches.match.mockImplementation((request) => {
      if (request === './index.html') return Promise.resolve(undefined);
      if (request === './') return Promise.resolve(shellResponse);
      return Promise.resolve(undefined);
    });
    env.fetch.mockRejectedValue(new Error('offline'));

    const response = await runFetch(env.getHandler('fetch'), {
      url: 'https://example.com/OpenAnchor/95/some-page',
      method: 'GET',
      mode: 'navigate',
    });

    expect(response).toBe(shellResponse);
    expect(env.caches.match).toHaveBeenCalledWith('./index.html');
    expect(env.caches.match).toHaveBeenCalledWith('./');
  });

  it('returns 503 for non-navigation requests when offline', async () => {
    const env = createServiceWorkerEnvironment();
    env.caches.match.mockResolvedValue(undefined);
    env.fetch.mockRejectedValue(new Error('offline'));

    const response = await runFetch(env.getHandler('fetch'), {
      url: 'https://example.com/OpenAnchor/95/api/data',
      method: 'GET',
      mode: 'cors',
    });

    expect(response.status).toBe(503);
    expect(response.statusText).toBe('Service Unavailable');
  });

  it('cleans old caches and notifies controlled windows on activate', async () => {
    const env = createServiceWorkerEnvironment();
    env.caches.keys.mockResolvedValue([
      CACHE_NAME,
      'openanchor-superapp-v9',
      'other-cache',
    ]);
    env.caches.delete.mockResolvedValue(true);

    await runWaitUntil(env.getHandler('activate'));

    expect(env.caches.delete).toHaveBeenCalledWith('openanchor-superapp-v9');
    expect(env.caches.delete).toHaveBeenCalledWith('other-cache');
    expect(env.caches.delete).not.toHaveBeenCalledWith(CACHE_NAME);
    expect(env.self.clients.claim).toHaveBeenCalled();
    expect(env.self.clients.matchAll).toHaveBeenCalledWith({ type: 'window' });
    expect(env.windowClients[0].postMessage).toHaveBeenCalledWith({
      type: 'SW_UPDATED',
      cacheName: CACHE_NAME,
    });
  });
});
