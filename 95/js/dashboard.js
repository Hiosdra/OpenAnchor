/**
 * Dashboard module - Beta mode management and settings
 */

export const BETA_MODE_KEY = 'oa_beta_mode';

/**
 * Check if beta mode is enabled
 * @returns {boolean}
 */
export function isBetaModeEnabled() {
  return localStorage.getItem(BETA_MODE_KEY) === 'true';
}

/**
 * Set beta mode state
 * @param {boolean} enabled
 */
export function setBetaMode(enabled) {
  localStorage.setItem(BETA_MODE_KEY, enabled.toString());
}

/**
 * Initialize beta mode on page load
 * Updates DOM elements based on stored beta mode preference
 * Note: Beta modules start with 'module-hidden' class in HTML to prevent flash
 */
export function initBetaMode() {
  const isBetaEnabled = isBetaModeEnabled();
  const betaToggle = document.getElementById('betaToggle');
  const anchorModule = document.getElementById('anchorModule');

  // Set toggle state
  if (betaToggle) {
    betaToggle.checked = isBetaEnabled;
  }

  // Only remove hidden class if beta is enabled
  // Modules are hidden by default in HTML to prevent flash on load
  if (isBetaEnabled) {
    if (anchorModule) anchorModule.classList.remove('module-hidden');
  }
}

/**
 * Toggle beta mode and update UI
 */
export function toggleBetaMode() {
  const betaToggle = document.getElementById('betaToggle');
  const isBetaEnabled = betaToggle?.checked ?? false;
  const anchorModule = document.getElementById('anchorModule');

  // Save preference
  setBetaMode(isBetaEnabled);

  // Show/hide modules
  if (isBetaEnabled) {
    if (anchorModule) anchorModule.classList.remove('module-hidden');
  } else {
    if (anchorModule) anchorModule.classList.add('module-hidden');
  }
}

/**
 * Open settings modal
 */
export function openSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('show');
  }
}

/**
 * Close settings modal
 */
export function closeSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

/**
 * Close settings when clicking on backdrop
 * @param {MouseEvent} event
 */
export function closeSettingsOnBackdrop(event) {
  if (event.target.id === 'settingsModal') {
    closeSettings();
  }
}

/**
 * Navigate to a module
 * Sends CACHE_MODULE message to service worker for best-effort lazy caching, then navigates.
 * @param {string} url - Module URL
 */
export function openModule(url) {
  const match = url.match(/modules\/([^/]+)\//);
  if (match && navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_MODULE',
      module: match[1]
    });
  }
  window.location.href = url;
}
