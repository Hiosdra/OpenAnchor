/**
 * Unified notification service abstracting the Web Notifications API.
 *
 * Prefers service-worker–based notifications (persistent, works when tab is
 * backgrounded) and falls back to the regular Notification constructor.
 */

/**
 * Request notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof globalThis.Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/**
 * Show a notification.
 * Uses the service worker registration when available for better PWA support,
 * falls back to the regular Notification constructor.
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions,
): Promise<void> {
  if (typeof globalThis.Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  // Prefer SW-based notifications (persistent, works when tab is backgrounded)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    }
  } catch {
    // fall through to regular notification
  }

  new Notification(title, options);
}

/**
 * Trigger device vibration.
 * No-op if the Vibration API is not available.
 */
export function vibrate(pattern: number[]): void {
  try {
    if (navigator?.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // silently fail
  }
}
