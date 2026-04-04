/// <reference lib="webworker" />

import {
  CACHE_NAME,
  coreUrls,
  getModuleUrls,
  shouldHandleFetch,
  isHashedAsset,
  cacheFirstStrategy,
  staleWhileRevalidate,
} from './sw-core';

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  readonly tag: string;
}

declare const self: ServiceWorkerGlobalScope;
export {};

type SWMessageData =
  | { type: 'SKIP_WAITING' }
  | { type: 'CACHE_MODULE'; module: string };

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
    const urls = getModuleUrls(data.module);
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

  if (!shouldHandleFetch(url, event.request.method)) return;

  if (isHashedAsset(url)) {
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
