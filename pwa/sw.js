const CACHE_NAME = 'anchor-alarm-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch from cache with runtime caching (cache-first / stale-while-revalidate)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Optionally update the cache in the background
        fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }).catch(() => {
          // Ignore network errors during background update
        });

        // Serve the cached response immediately
        return cachedResponse;
      }

      // Not in cache – fetch from network and cache the response
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
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
          return caches.match('./');
        }

        // For other requests, return an empty 503 response
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// Update service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim clients to ensure the new service worker takes control immediately
      return self.clients.claim();
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

// Push API - handle push events from server
self.addEventListener('push', event => {
  console.log('Push event received');

  let notificationData = {
    title: '🚨 Alert Kotwiczny',
    body: 'Sprawdź swoją pozycję!',
    icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle fill=\'%230f172a\' cx=\'50\' cy=\'50\' r=\'50\'/%3E%3Ctext x=\'50\' y=\'70\' font-size=\'60\' text-anchor=\'middle\' fill=\'%233b82f6\'%3E%E2%9A%93%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle fill=\'%230f172a\' cx=\'50\' cy=\'50\' r=\'50\'/%3E%3Ctext x=\'50\' y=\'70\' font-size=\'60\' text-anchor=\'middle\' fill=\'%233b82f6\'%3E%E2%9A%93%3C/text%3E%3C/svg%3E',
    vibrate: [500, 200, 500],
    tag: 'anchor-alarm',
    requireInteraction: true,
    data: {
      url: './'
    }
  };

  // Parse push notification payload if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        ...payload
      };
    } catch (e) {
      // If not JSON, use text content as body
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data
    })
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', event => {
  console.log('Push subscription changed');

  event.waitUntil(
    // Resubscribe to push notifications
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // VAPID public key would be provided by the server
        // This is a placeholder - actual key should come from server configuration
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8vyGOmL9bDdJzgZLIhC3GHV6RH7VSLi9CRXGpNbH9hE3Cp6xjXPG0M'
      )
    }).then(subscription => {
      // Send new subscription to server
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });
    })
  );
});

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Background Sync API - sync position data when connection is restored
self.addEventListener('sync', event => {
  if (event.tag === 'sync-position') {
    event.waitUntil(syncPositionData());
  }
});

async function syncPositionData() {
  try {
    // Retrieve any pending position data from IndexedDB or cache
    // This is a placeholder - actual implementation would need to integrate with the app's data storage
    console.log('Background sync: syncing position data');

    // In a real implementation, this would:
    // 1. Retrieve stored position data that needs syncing
    // 2. Send it to a server or sync with connected devices
    // 3. Clear the sync queue on success

    // For now, we'll just log the sync attempt
    return Promise.resolve();
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error; // Rethrow to retry sync later
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
    // This would integrate with the geolocation API and alarm logic
    // For now, it's a placeholder for future implementation
    return Promise.resolve();
  } catch (error) {
    console.error('Periodic sync failed:', error);
    throw error;
  }
}
