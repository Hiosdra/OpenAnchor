/**
 * Anchor module — Connection Status Controller
 *
 * Monitors online/offline state and updates the UI indicator.
 */

import { I18N } from './i18n';

export const ConnectionStatus = {
  _el: null as HTMLElement | null,
  _textEl: null as HTMLElement | null,

  init() {
    this._el = document.getElementById('connection-status');
    this._textEl = document.getElementById('connection-status-text');
    this._update(navigator.onLine);
    window.addEventListener('online', () => this._update(true));
    window.addEventListener('offline', () => this._update(false));
  },

  _update(isOnline: boolean) {
    if (!this._el || !this._textEl) return;
    if (isOnline) {
      this._el.classList.remove('connection-status--offline');
      this._textEl.textContent = I18N.t.connOnline || 'Online';
    } else {
      this._el.classList.add('connection-status--offline');
      this._textEl.textContent = '⚠ ' + (I18N.t.connOffline || 'Offline');
    }
  },
};
