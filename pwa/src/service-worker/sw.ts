/// <reference lib="webworker" />

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  readonly tag: string;
}

declare const self: ServiceWorkerGlobalScope;
export {};

const CACHE_NAME = 'openanchor-superapp-v10' as const;

const coreUrls: readonly string[] = [
  './',
  './index.html',
] as const;

const moduleUrls: Readonly<Record<string, readonly string[]>> = {
  anchor: ['./modules/anchor/', './modules/anchor/index.html'],
  wachtownik: ['./modules/wachtownik/', './modules/wachtownik/index.html'],
  egzamin: ['./modules/egzamin/', './modules/egzamin/index.html'],
  zeglowanie: ['./modules/zeglowanie/', './modules/zeglowanie/index.html'],
} as const;

type SWMessageData =
  | { type: 'SKIP_WAITING' }
  | { type: 'CACHE_MODULE'; module: string };

const CDN_HOSTNAMES: readonly string[] = [
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
] as const;

function isCdnRequest(url: URL): boolean {
  return CDN_HOSTNAMES.some((cdn) => url.hostname.includes(cdn));
}

async function cacheFirstStrategy(
  request: Request,
): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.status === 200) {
    const clone = response.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, clone);
  }
  return response;
}

async function staleWhileRevalidate(
  request: Request,
): Promise<Response> {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    fetch(request)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        }
      })
      .catch(() => {});
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (!networkResponse || networkResponse.status !== 200) return networkResponse;
    const clone = networkResponse.clone();
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, clone);
    return networkResponse;
  } catch {
    if (request.mode === 'navigate') {
      const indexResponse = await caches.match('./index.html');
      if (indexResponse) return indexResponse;
      const rootResponse = await caches.match('./');
      if (rootResponse) return rootResponse;
    }
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Install — pre-cache core shell assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('OpenAnchor SW: caching core assets');
      return cache.addAll(coreUrls as string[]);
    }),
  );
});

// Message handler — SKIP_WAITING + on-demand module caching
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as SWMessageData | undefined;
  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }

  if (data.type === 'CACHE_MODULE') {
    const urls = moduleUrls[data.module];
    if (urls) {
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urls as string[])),
      );
    }
  }
});

// Fetch — cache-first for hashed assets, stale-while-revalidate for the rest
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (isCdnRequest(url)) return;
  if (event.request.method !== 'GET') return;

  // Hashed assets are immutable — cache-first, no revalidation needed
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }

  // Everything else — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});

// Activate — clean old caches, claim clients, notify windows
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients
          .matchAll({ type: 'window' })
          .then((clients) =>
            clients.forEach((c) =>
              c.postMessage({ type: 'SW_UPDATED', cacheName: CACHE_NAME }),
            ),
          ),
      ),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('./'));
});

self.addEventListener('sync' as string, ((event: SyncEvent) => {
  if (event.tag === 'sync-position') {
    event.waitUntil(Promise.resolve());
  }
}) as EventListener);

self.addEventListener('periodicsync' as string, ((event: PeriodicSyncEvent) => {
  if (event.tag === 'check-anchor-position') {
    event.waitUntil(Promise.resolve());
  }
}) as EventListener);
