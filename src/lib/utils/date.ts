/**
 * Date utility functions for SafeFlow
 */

/**
 * Get the start of the day (midnight) for a date
 * Used for creating deterministic daily IDs (e.g., price history, portfolio snapshots)
 */
export function getDateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get a deterministic date key string (YYYY-MM-DD format)
 * Used for creating unique daily IDs
 */
export function getDateKey(date: Date): string {
  return date.toISOString().substring(0, 10);
}

/**
 * Check if a date is stale (older than specified milliseconds)
 */
export function isDateStale(date: Date | undefined, maxAgeMs: number): boolean {
  if (!date) return true;
  const cutoff = new Date(Date.now() - maxAgeMs);
  return new Date(date) < cutoff;
}

/** One hour in milliseconds */
export const ONE_HOUR_MS = 60 * 60 * 1000;

/** One day in milliseconds */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
