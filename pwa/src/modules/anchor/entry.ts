/**
 * Anchor module — Entry point
 *
 * Bootstraps the anchor alarm application.
 * Loaded as <script type="module"> from modules/anchor/index.html.
 */

import { I18N } from './i18n';
import { ConnectionStatus } from './connection-status';
import { OnboardingController } from './ui-utils';
import { AnchorApp } from './anchor-app';

// Apply early theme (matches the inline script that was in <head>)
document.documentElement.dataset.theme = localStorage.getItem('openanchor-theme') || 'dark';

// Initialize i18n (already done at module level in i18n.ts)
// Initialize connection status
ConnectionStatus.init();

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('../../sw.js')
      .then((registration) => console.log('Service Worker registered:', registration.scope))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}

// Bootstrap application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new OnboardingController();
  const app = new AnchorApp();

  // Expose app globally for cross-module access (e.g., SyncController, AlertController)
  Object.defineProperty(window, 'app', {
    value: app,
    writable: false,
    configurable: false,
  });

  // Apply i18n to all static DOM elements after app init
  I18N._applyToDOM();
});
