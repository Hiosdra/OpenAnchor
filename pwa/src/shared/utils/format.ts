/**
 * Shared time formatting utilities for the OpenAnchor PWA.
 */

/** Format a duration value to a human-readable string ("Xh Ym", "Xm", or "Xs"). */
export function formatDuration(value: number, unit: 'ms' | 's' = 'ms'): string {
  const totalSeconds = unit === 'ms' ? Math.floor(value / 1000) : value;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** Format seconds as "M:SS" (exam countdown style). */
export function formatExamTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
