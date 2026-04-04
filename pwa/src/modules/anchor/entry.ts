/**
 * Anchor module — Entry point
 *
 * Bootstraps the anchor alarm application.
 * Loaded as <script type="module"> from modules/anchor/index.html.
 */

import './styles.css';
import { initBackground } from '../../shared/init-background';
import { I18N } from './i18n';
import { ConnectionStatus } from './connection-status';
import { OnboardingController } from './ui-utils';
import { AnchorApp } from './anchor-app';
import { renderApp } from './templates';

initBackground();

// Apply early theme (matches the inline script that was in <head>)
document.documentElement.dataset.theme = localStorage.getItem('openanchor-theme') || 'dark';

// Inject all application HTML into the minimal shell.
// Module scripts run after HTML parsing, so #app-root is available here.
document.getElementById('app-root')!.innerHTML = renderApp();

// Initialize i18n (already done at module level in i18n.ts)
// Initialize connection status
ConnectionStatus.init();

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js')
      .catch((err) => console.error('Service Worker registration failed:', err));
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
