import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import { buildSync } from 'esbuild';

const swCompiled = buildSync({
  entryPoints: [resolve(process.cwd(), 'src/service-worker/sw.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'es2020',
});
const swSource = swCompiled.outputFiles[0].text;
const CACHE_NAME = 'openanchor-superapp-v10';

interface MockCache {
  addAll: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
}

interface MockCaches {
  open: ReturnType<typeof vi.fn>;
  match: ReturnType<typeof vi.fn>;
  keys: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface WindowClient {
  postMessage: ReturnType<typeof vi.fn>;
}

interface SWContext {
  Promise: typeof Promise;
  URL: typeof URL;
  Response: typeof Response;
  console: typeof console;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  caches: MockCaches;
  fetch: ReturnType<typeof vi.fn>;
  clients: {
    openWindow: ReturnType<typeof vi.fn>;
  };
  self: {
    addEventListener: ReturnType<typeof vi.fn>;
    skipWaiting: ReturnType<typeof vi.fn>;
    clients: {
      claim: ReturnType<typeof vi.fn>;
      matchAll: ReturnType<typeof vi.fn>;
    };
  };
  cache: MockCache;
  windowClients: WindowClient[];
  getHandler(type: string): (event: Record<string, unknown>) => void;
}

function createServiceWorkerEnvironment(): SWContext {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const cache: MockCache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  };
  const windowClients: WindowClient[] = [{ postMessage: vi.fn() }];

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
      addEventListener: vi.fn((type: string, handler: (event: Record<string, unknown>) => void) => {
        listeners.set(type, handler);
      }),
      skipWaiting: vi.fn().mockResolvedValue(undefined),
      clients: {
        claim: vi.fn().mockResolvedValue(undefined),
        matchAll: vi.fn().mockResolvedValue(windowClients),
      },
    },
  };

  runInNewContext(swSource, context, { filename: 'src/service-worker/sw.ts' });

  return {
    ...context,
    cache,
    windowClients,
    getHandler(type: string) {
      const handler = listeners.get(type);
      if (!handler) {
        throw new Error(`Missing ${type} handler`);
      }
      return handler;
    },
  };
}

async function runWaitUntil(
  handler: (event: Record<string, unknown>) => void,
  event: Record<string, unknown> = {}
): Promise<void> {
  const pending: Promise<unknown>[] = [];
  handler({
    ...event,
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise);
      return promise;
    },
  });
  await Promise.all(pending);
}

async function runFetch(
  handler: (event: Record<string, unknown>) => void,
  request: Record<string, unknown>
): Promise<Response> {
  let responsePromise: Promise<Response> | undefined;
  handler({
    request,
    respondWith(promise: Promise<Response>) {
      responsePromise = promise;
    },
  });
  expect(responsePromise).toBeDefined();
  return responsePromise!;
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

    env.caches.match.mockImplementation((request: string) => {
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
