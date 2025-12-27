/**
 * Australian Financial Year utilities (July 1 - June 30)
 *
 * @deprecated These functions are deprecated. Use the FinancialYear class from
 * `@/domain/value-objects/financial-year` instead for a more robust, object-oriented API.
 *
 * Migration guide:
 * - getCurrentFinancialYear() -> FinancialYear.current().value
 * - getFinancialYearForDate(date) -> FinancialYear.fromDate(date).value
 * - getFinancialYearDates(fy) -> { start: fy.startDate, end: fy.endDate }
 * - isDateInFinancialYear(date, fy) -> FinancialYear.parse(fy).contains(date)
 * - getFinancialYearOptions(count) -> FinancialYear.getRecentYears(count).map(fy => fy.value)
 * - getFinancialQuarters(fy) -> FinancialYear.parse(fy).getQuarters()
 * - getCurrentQuarter() -> FinancialYear.current().getCurrentQuarter()
 * - getFinancialYearMonths(fy) -> FinancialYear.parse(fy).getMonths()
 * - formatFinancialYear(fy) -> FinancialYear.parse(fy).format()
 * - parseFinancialYear(fy) -> FinancialYear.tryParse(fy)?.value ?? null
 */

import { FinancialYear } from "@/domain/value-objects/financial-year";

/**
 * Get the current Australian financial year
 * @returns Financial year string like "2024-25"
 * @deprecated Use FinancialYear.current().value instead
 */
export function getCurrentFinancialYear(): string {
  return FinancialYear.current().value;
}

/**
 * Get the financial year for a given date
 * @param date The date to check
 * @returns Financial year string like "2024-25"
 * @deprecated Use FinancialYear.fromDate(date).value instead
 */
export function getFinancialYearForDate(date: Date): string {
  return FinancialYear.fromDate(date).value;
}

/**
 * Get the start and end dates for a financial year
 * @param fy Financial year string like "2024-25"
 * @returns Object with start and end dates
 * @deprecated Use FinancialYear.parse(fy).startDate and .endDate instead
 */
export function getFinancialYearDates(fy: string): { start: Date; end: Date } {
  const financialYear = FinancialYear.parse(fy);
  return {
    start: financialYear.startDate,
    end: financialYear.endDate,
  };
}

/**
 * Check if a date is within a financial year
 * @param date The date to check
 * @param fy Financial year string like "2024-25"
 * @returns True if date is within the FY
 * @deprecated Use FinancialYear.parse(fy).contains(date) instead
 */
export function isDateInFinancialYear(date: Date, fy: string): boolean {
  return FinancialYear.parse(fy).contains(date);
}

/**
 * Get a list of recent financial years for selection
 * @param count Number of years to return (default 5)
 * @returns Array of FY strings, most recent first
 * @deprecated Use FinancialYear.getRecentYears(count).map(fy => fy.value) instead
 */
export function getFinancialYearOptions(count: number = 5): string[] {
  return FinancialYear.getRecentYears(count).map((fy) => fy.value);
}

/**
 * Get the Australian financial quarters for a financial year
 * @param fy Financial year string like "2024-25"
 * @returns Array of quarter objects with dates and labels
 * @deprecated Use FinancialYear.parse(fy).getQuarters() instead
 */
export function getFinancialQuarters(fy: string): Array<{
  quarter: number;
  label: string;
  start: Date;
  end: Date;
}> {
  return FinancialYear.parse(fy).getQuarters();
}

/**
 * Get the current quarter within the financial year
 * @returns Quarter number (1-4)
 * @deprecated Use FinancialYear.current().getCurrentQuarter() instead
 */
export function getCurrentQuarter(): number {
  return FinancialYear.current().getCurrentQuarter() ?? 1;
}

/**
 * Get months for a financial year in order
 * @param fy Financial year string
 * @returns Array of month objects
 * @deprecated Use FinancialYear.parse(fy).getMonths() instead
 */
export function getFinancialYearMonths(fy: string): Array<{
  month: number;
  year: number;
  label: string;
  start: Date;
  end: Date;
}> {
  return FinancialYear.parse(fy).getMonths();
}

/**
 * Format a financial year for display
 * @param fy Financial year string like "2024-25"
 * @returns Formatted string like "FY 2024-25"
 * @deprecated Use FinancialYear.parse(fy).format() instead
 */
export function formatFinancialYear(fy: string): string {
  return FinancialYear.parse(fy).format();
}

/**
 * Parse a financial year string and validate
 * @param fy Financial year string
 * @returns Validated FY string or null if invalid
 * @deprecated Use FinancialYear.tryParse(fy)?.value ?? null instead
 */
export function parseFinancialYear(fy: string): string | null {
  return FinancialYear.tryParse(fy)?.value ?? null;
}
