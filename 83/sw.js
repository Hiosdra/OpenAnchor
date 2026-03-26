const CACHE_NAME = 'openanchor-superapp-v8';
const urlsToCache = [
  './',
  './index.html',
  './modules/anchor/',
  './modules/anchor/index.html',
  './modules/wachtownik/',
  './modules/wachtownik/index.html',
  './modules/egzamin/',
  './modules/egzamin/index.html',
  './modules/egzamin/exam_questions.json',
  './js/exam-pdf-storage.js',
  './modules/zeglowanie/',
  './modules/zeglowanie/index.html',
  './manifest.json',
  './assets/icon-192x192.png',
  './assets/icon-512x512.png',
  './assets/icon.svg'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('OpenAnchor SW: cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  // Activate immediately so new cache version takes effect
  self.skipWaiting();
});

// Listen for messages from the page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // When user clicks update button, activate the new service worker immediately
    event.waitUntil(self.skipWaiting());
  }
});

// Fetch from cache with runtime caching (cache-first / stale-while-revalidate)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle http/https requests – skip chrome-extension:// and other unsupported schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip CDN resources - let browser cache handle them
  if (url.hostname.includes('cdn.tailwindcss.com') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    return;
  }

  // Only cache GET requests - Cache API doesn't support other methods
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Only update cache for non-static assets (skip images, fonts, etc.)
        const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i.test(url.pathname);

        if (!isStaticAsset) {
          // Optionally update the cache in the background for HTML/JS/CSS
          fetch(event.request).then(networkResponse => {
            if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
              return;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }).catch(() => {
            // Ignore network errors during background update
          });
        }

        // Serve the cached response immediately
        return cachedResponse;
      }

      // Not in cache – fetch from network and cache the response
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If this is a navigation request, fall back to the cached app shell
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }

        // For other requests, return an empty 503 response
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// Update service worker - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('OpenAnchor SW: deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim clients to ensure the new service worker takes control immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients to reload for the new version
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', cacheName: CACHE_NAME });
        });
      });
    })
  );
});

// Handle notifications
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('./')
  );
});

// Background Sync API - sync position data when connection is restored
self.addEventListener('sync', event => {
  if (event.tag === 'sync-position') {
    event.waitUntil(syncPositionData());
  }
});

async function syncPositionData() {
  try {
    console.log('Background sync: syncing position data');
    return Promise.resolve();
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;
  }
}

// Periodic Background Sync (if supported) - check anchor position periodically
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-anchor-position') {
    event.waitUntil(checkAnchorPosition());
  }
});

async function checkAnchorPosition() {
  try {
    console.log('Periodic sync: checking anchor position');
    return Promise.resolve();
  } catch (error) {
    console.error('Periodic sync failed:', error);
    throw error;
  }
}

