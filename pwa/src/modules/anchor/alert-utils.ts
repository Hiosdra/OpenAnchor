/**
 * Pure utility functions extracted from the alert controller.
 * No AudioContext / Notification / DOM dependencies — fully testable.
 */

/**
 * Build a human-readable notification body string.
 *
 * Mirrors the logic in AlertController.start() and battery monitor:
 *  - Battery alerts just return the reason text.
 *  - Normal alerts combine reason + formatted distance.
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
