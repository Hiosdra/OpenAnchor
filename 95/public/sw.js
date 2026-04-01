const CACHE_NAME = 'openanchor-superapp-v10';

// Core pages — always pre-cached on install (stable paths only, no hashed assets)
const coreUrls = [
  './',
  './index.html',
];

// Module URLs — cached on demand when user opens them
const moduleUrls = {
  anchor: ['./modules/anchor/', './modules/anchor/index.html'],
  wachtownik: ['./modules/wachtownik/', './modules/wachtownik/index.html'],
  egzamin: ['./modules/egzamin/', './modules/egzamin/index.html'],
  zeglowanie: ['./modules/zeglowanie/', './modules/zeglowanie/index.html'],
};

// Install service worker — only cache core assets for fast startup
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('OpenAnchor SW: caching core assets');
        return cache.addAll(coreUrls);
      })
  );
});

// Listen for messages from the page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
  if (event.data && event.data.type === 'CACHE_MODULE') {
    const urls = moduleUrls[event.data.module];
    if (urls) {
      event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urls))
      );
    }
  }
});

// Fetch from cache with runtime caching (stale-while-revalidate)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Skip CDN resources
  if (url.hostname.includes('cdn.tailwindcss.com') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    return;
  }

  if (event.request.method !== 'GET') return;

  // Hashed assets (/assets/*) are immutable — cache-first, no revalidation needed
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML and other resources — stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// Activate — clean up old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then(clients =>
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', cacheName: CACHE_NAME }))
        )
      )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./'));
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-position') {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-anchor-position') {
    event.waitUntil(Promise.resolve());
  }
});
