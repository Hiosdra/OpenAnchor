/**
 * Service Worker utilities and update management
 */

export const APP_CACHE_PREFIX = 'openanchor-';

/**
 * Check if service worker is supported
 * @returns {boolean}
 */
export function isServiceWorkerSupported() {
  return 'serviceWorker' in navigator;
}

/**
 * Clear all app caches (those with openanchor- prefix)
 * @returns {Promise<void>}
 */
export async function clearAppCaches() {
  if (!('caches' in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  const appCacheNames = cacheNames.filter(name => name.startsWith(APP_CACHE_PREFIX));
  await Promise.all(appCacheNames.map(name => caches.delete(name)));
}

/**
 * Force update - checks for SW updates and clears caches
 * @param {HTMLElement} btn - Update button element
 * @returns {Promise<void>}
 */
export async function forceUpdate(btn) {
  if (!btn) return;

  // Disable button and show loading state
  btn.disabled = true;
  btn.classList.add('updating');
  const originalText = btn.innerHTML;

  const updateButtonText = (text) => {
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
      </svg>
      ${text}
    `;
  };

  if (!isServiceWorkerSupported()) {
    window.location.reload();
    return;
  }

  try {
    updateButtonText('Sprawdzam...');
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      window.location.reload();
      return;
    }

    // Check if there's already a waiting service worker
    if (registration.waiting) {
      updateButtonText('Instaluję...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    // Force update check
    await registration.update();

    // Wait for the new service worker to be installed
    const hasUpdate = await waitForServiceWorkerUpdate(registration);

    if (hasUpdate && registration.waiting) {
      updateButtonText('Instaluję...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // No update available - clear caches and reload
      updateButtonText('Czyszczę cache...');
      await clearAppCaches();
      window.location.reload();
    }
  } catch (error) {
    console.error('Force update error:', error);
    btn.innerHTML = originalText;
    btn.disabled = false;
    btn.classList.remove('updating');
    throw error;
  }
}

/**
 * Wait for service worker update with timeout
 * @param {ServiceWorkerRegistration} registration
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
export function waitForServiceWorkerUpdate(registration, timeout = 5000) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(false), timeout);

    const checkUpdate = () => {
      if (registration.waiting) {
        clearTimeout(timeoutId);
        resolve(true);
      } else if (registration.installing) {
        registration.installing.addEventListener('statechange', function onStateChange(e) {
          if (e.target.state === 'installed') {
            e.target.removeEventListener('statechange', onStateChange);
            clearTimeout(timeoutId);
            resolve(true);
          }
        });
      } else {
        clearTimeout(timeoutId);
        resolve(false);
      }
    };

    checkUpdate();
    registration.addEventListener('updatefound', checkUpdate, { once: true });
  });
}

/**
 * Show update banner
 * @param {HTMLElement} banner
 */
export function showUpdateBanner(banner) {
  if (banner) {
    banner.classList.add('show');
  }
}

/**
 * Hide update banner
 * @param {HTMLElement} banner
 */
export function hideUpdateBanner(banner) {
  if (banner) {
    banner.classList.remove('show');
  }
}

/**
 * Handle service worker update click
 * @param {ServiceWorker} newWorker
 */
export function handleUpdateClick(newWorker) {
  if (newWorker) {
    newWorker.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}
