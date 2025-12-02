// Australian Financial Year utilities (July 1 - June 30)

import { startOfMonth, endOfMonth, addMonths, format, isWithinInterval } from 'date-fns';

/**
 * Get the current Australian financial year
 * @returns Financial year string like "2024-25"
 */
export function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // FY starts July 1 (month 6)
  if (month >= 6) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

/**
 * Get the financial year for a given date
 * @param date The date to check
 * @returns Financial year string like "2024-25"
 */
export function getFinancialYearForDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (month >= 6) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

/**
 * Get the start and end dates for a financial year
 * @param fy Financial year string like "2024-25"
 * @returns Object with start and end dates
 */
export function getFinancialYearDates(fy: string): { start: Date; end: Date } {
  const [startYearStr] = fy.split('-');
  const startYear = parseInt(startYearStr, 10);

  return {
    start: new Date(startYear, 6, 1), // July 1
    end: new Date(startYear + 1, 5, 30, 23, 59, 59, 999), // June 30
  };
}

/**
 * Check if a date is within a financial year
 * @param date The date to check
 * @param fy Financial year string like "2024-25"
 * @returns True if date is within the FY
 */
export function isDateInFinancialYear(date: Date, fy: string): boolean {
  const { start, end } = getFinancialYearDates(fy);
  return isWithinInterval(date, { start, end });
}

/**
 * Get a list of recent financial years for selection
 * @param count Number of years to return (default 5)
 * @returns Array of FY strings, most recent first
 */
export function getFinancialYearOptions(count: number = 5): string[] {
  const current = getCurrentFinancialYear();
  const [startYearStr] = current.split('-');
  const startYear = parseInt(startYearStr, 10);

  return Array.from({ length: count }, (_, i) => {
    const year = startYear - i;
    return `${year}-${(year + 1).toString().slice(-2)}`;
  });
}

/**
 * Get the Australian financial quarters for a financial year
 * @param fy Financial year string like "2024-25"
 * @returns Array of quarter objects with dates and labels
 */
export function getFinancialQuarters(fy: string): Array<{
  quarter: number;
  label: string;
  start: Date;
  end: Date;
}> {
  const [startYearStr] = fy.split('-');
  const startYear = parseInt(startYearStr, 10);

  // Use endOfMonth to safely get the last day of each quarter's final month
  return [
    {
      quarter: 1,
      label: 'Q1 (Jul-Sep)',
      start: startOfMonth(new Date(startYear, 6, 1)),
      end: endOfMonth(new Date(startYear, 8, 1)), // September
    },
    {
      quarter: 2,
      label: 'Q2 (Oct-Dec)',
      start: startOfMonth(new Date(startYear, 9, 1)),
      end: endOfMonth(new Date(startYear, 11, 1)), // December
    },
    {
      quarter: 3,
      label: 'Q3 (Jan-Mar)',
      start: startOfMonth(new Date(startYear + 1, 0, 1)),
      end: endOfMonth(new Date(startYear + 1, 2, 1)), // March
    },
    {
      quarter: 4,
      label: 'Q4 (Apr-Jun)',
      start: startOfMonth(new Date(startYear + 1, 3, 1)),
      end: endOfMonth(new Date(startYear + 1, 5, 1)), // June
    },
  ];
}

/**
 * Get the current quarter within the financial year
 * @returns Quarter number (1-4)
 */
export function getCurrentQuarter(): number {
  const month = new Date().getMonth();
  if (month >= 6 && month <= 8) return 1; // Jul-Sep
  if (month >= 9 && month <= 11) return 2; // Oct-Dec
  if (month >= 0 && month <= 2) return 3; // Jan-Mar
  return 4; // Apr-Jun
}

/**
 * Get months for a financial year in order
 * @param fy Financial year string
 * @returns Array of month objects
 */
export function getFinancialYearMonths(fy: string): Array<{
  month: number;
  year: number;
  label: string;
  start: Date;
  end: Date;
}> {
  const { start } = getFinancialYearDates(fy);
  const months = [];

  for (let i = 0; i < 12; i++) {
    const monthDate = addMonths(start, i);
    months.push({
      month: monthDate.getMonth(),
      year: monthDate.getFullYear(),
      label: format(monthDate, 'MMM yyyy'),
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    });
  }

  return months;
}

/**
 * Format a financial year for display
 * @param fy Financial year string like "2024-25"
 * @returns Formatted string like "FY 2024-25"
 */
export function formatFinancialYear(fy: string): string {
  return `FY ${fy}`;
}

/**
 * Parse a financial year string and validate
 * @param fy Financial year string
 * @returns Validated FY string or null if invalid
 */
export function parseFinancialYear(fy: string): string | null {
  const pattern = /^(\d{4})-(\d{2})$/;
  const match = fy.match(pattern);

  if (!match) return null;

  const startYear = parseInt(match[1], 10);
  const endYearShort = parseInt(match[2], 10);
  const expectedEndYearShort = (startYear + 1) % 100;

  if (endYearShort !== expectedEndYearShort) return null;

  return fy;
}
