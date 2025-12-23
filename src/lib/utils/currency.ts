// Currency utilities for AUD

const AUD_FORMATTER = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const AUD_COMPACT_FORMATTER = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Format cents to AUD currency string
 * @param cents Amount in cents
 * @returns Formatted string like "$1,234.56"
 */
export function formatAUD(cents: number): string {
  return AUD_FORMATTER.format(cents / 100);
}

/**
 * Format cents to compact AUD string for large numbers
 * @param cents Amount in cents
 * @returns Formatted string like "$1.2M"
 */
export function formatAUDCompact(cents: number): string {
  return AUD_COMPACT_FORMATTER.format(cents / 100);
}

/**
 * Format cents to plain number string (no currency symbol)
 * @param cents Amount in cents
 * @returns Formatted string like "1,234.56"
 */
export function formatNumber(cents: number): string {
  return (cents / 100).toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse AUD string to cents
 * @param value Currency string like "$1,234.56" or "1234.56"
 * @returns Amount in cents
 */
export function parseAUD(value: string): number {
  // Remove $ and commas, then convert to cents
  const cleaned = value.replace(/[$,\s]/g, '');
  const dollars = parseFloat(cleaned);
  if (isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
}

/**
 * Convert dollars to cents
 * @param dollars Amount in dollars
 * @returns Amount in cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 *
 * @warning Result is floating-point. Do NOT use in calculations that will
 * be stored back as cents - use only for display purposes. For calculations,
 * keep values in cents and only divide for final display.
 *
 * @param cents Amount in cents
 * @returns Amount in dollars (floating-point)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format percentage
 * @param value Decimal value (e.g., 0.15 for 15%)
 * @returns Formatted string like "15.00%"
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Format change with + or - prefix and color class
 * @param cents Change amount in cents
 * @returns Object with formatted string and color class
 */
export function formatChange(cents: number): { text: string; className: string } {
  const formatted = formatAUD(Math.abs(cents));
  if (cents > 0) {
    return { text: `+${formatted}`, className: 'text-green-600' };
  } else if (cents < 0) {
    return { text: `-${formatted}`, className: 'text-red-600' };
  }
  return { text: formatted, className: 'text-gray-600' };
}
