import LZString from 'lz-string';
import QRCode from 'qrcode';

import type { AppState } from '../types';

/**
 * Core URL building logic, separated from window.location for testability.
 */
export function buildShareUrlCore(baseUrl: string, state: AppState, readOnly = false): string {
  const jsonState = JSON.stringify(state);
  const prefix = readOnly ? 'share-readonly' : 'share';

  if (readOnly) {
    const encoded = btoa(encodeURIComponent(jsonState));
    return `${baseUrl}#${prefix}=${encoded}`;
  }

  try {
    const compressed = LZString.compressToEncodedURIComponent(jsonState);
    return `${baseUrl}#${prefix}=c:${compressed}`;
  } catch (e) {
    console.error('LZString compression failed:', e);
  }

  console.error('LZString compression failed - cannot create share URL');
  return baseUrl;
}

export function buildShareUrl(state: AppState, readOnly = false): string {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return buildShareUrlCore(baseUrl, state, readOnly);
}

export async function generateQRCode(
  container: HTMLElement,
  url: string,
  isNightMode: boolean,
): Promise<void> {
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  await QRCode.toCanvas(canvas, url, {
    width: 256,
    color: {
      dark: isNightMode ? '#000000' : '#0c4a6e',
      light: isNightMode ? '#dc2626' : '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}
