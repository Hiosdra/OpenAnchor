/**
 * Pure utility functions extracted from the alert controller.
 * No AudioContext / Notification / DOM dependencies — fully testable.
 */

/**
 * Build a human-readable notification body string.
 */
export function buildNotificationBody(
  reason: string,
  distance: number | null,
  distString: string,
  isBattery?: boolean,
): string {
  if (isBattery) return reason;
  if (distance === null) return reason;
  return `${reason} | ${distString}`;
}
