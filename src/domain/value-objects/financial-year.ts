/**
 * FinancialYear Value Object
 *
 * Represents an Australian Financial Year (July 1 - June 30).
 * Immutable - all operations return new FinancialYear instances.
 *
 * @example
 * const fy = FinancialYear.current();           // Current FY
 * const fy2024 = FinancialYear.parse("2024-25"); // Specific FY
 * console.log(fy2024.format());                  // "FY 2024-25"
 * console.log(fy2024.startDate);                 // July 1, 2024
 * console.log(fy2024.contains(new Date()));      // true/false
 */
export class FinancialYear {
  /**
   * Private constructor - use static factory methods
   * @param value Financial year string in format "YYYY-YY" (e.g., "2024-25")
   */
  private constructor(readonly value: string) {
    // Validation happens in static factory methods
  }

  // ============ Factory Methods ============

  /**
   * Get the current Australian financial year
   */
  static current(): FinancialYear {
    const now = new Date();
    return FinancialYear.fromDate(now);
  }

  /**
   * Get the financial year for a specific date
   * @param date The date to check
   */
  static fromDate(date: Date): FinancialYear {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    // FY starts July 1 (month 6)
    if (month >= 6) {
      const value = `${year}-${(year + 1).toString().slice(-2)}`;
      return new FinancialYear(value);
    }
    const value = `${year - 1}-${year.toString().slice(-2)}`;
    return new FinancialYear(value);
  }

  /**
   * Parse a financial year string
   * @param value Financial year string like "2024-25"
   * @throws Error if format is invalid
   */
  static parse(value: string): FinancialYear {
    const pattern = /^(\d{4})-(\d{2})$/;
    const match = value.match(pattern);

    if (!match) {
      throw new Error(
        `Invalid financial year format: "${value}". Expected format: "YYYY-YY" (e.g., "2024-25")`
      );
    }

    const startYear = parseInt(match[1], 10);
    const endYearShort = parseInt(match[2], 10);
    const expectedEndYearShort = (startYear + 1) % 100;

    if (endYearShort !== expectedEndYearShort) {
      throw new Error(
        `Invalid financial year: "${value}". Years must be consecutive (expected "${startYear}-${expectedEndYearShort.toString().padStart(2, "0")}")`
      );
    }

    return new FinancialYear(value);
  }

  /**
   * Safely parse a financial year string
   * @param value Financial year string like "2024-25"
   * @returns FinancialYear or null if invalid
   */
  static tryParse(value: string): FinancialYear | null {
    try {
      return FinancialYear.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * Create from start year number
   * @param startYear The calendar year when the FY starts (e.g., 2024 for FY 2024-25)
   */
  static fromStartYear(startYear: number): FinancialYear {
    const endYearShort = ((startYear + 1) % 100).toString().padStart(2, "0");
    return new FinancialYear(`${startYear}-${endYearShort}`);
  }

  // ============ Properties ============

  /**
   * Get the calendar year when the FY starts (July 1)
   */
  get startYear(): number {
    return parseInt(this.value.split("-")[0], 10);
  }

  /**
   * Get the calendar year when the FY ends (June 30)
   */
  get endYear(): number {
    return this.startYear + 1;
  }

  /**
   * Get the start date of the financial year (July 1)
   */
  get startDate(): Date {
    return new Date(this.startYear, 6, 1); // July 1
  }

  /**
   * Get the end date of the financial year (June 30, 23:59:59.999)
   */
  get endDate(): Date {
    return new Date(this.endYear, 5, 30, 23, 59, 59, 999); // June 30
  }

  // ============ Query Methods ============

  /**
   * Check if a date falls within this financial year
   * @param date The date to check
   */
  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  /**
   * Check if this is the current financial year
   */
  isCurrent(): boolean {
    return this.equals(FinancialYear.current());
  }

  /**
   * Check equality with another FinancialYear
   */
  equals(other: FinancialYear): boolean {
    return this.value === other.value;
  }

  /**
   * Check if this FY is before another
   */
  isBefore(other: FinancialYear): boolean {
    return this.startYear < other.startYear;
  }

  /**
   * Check if this FY is after another
   */
  isAfter(other: FinancialYear): boolean {
    return this.startYear > other.startYear;
  }

  // ============ Navigation Methods ============

  /**
   * Get the next financial year
   */
  next(): FinancialYear {
    return FinancialYear.fromStartYear(this.startYear + 1);
  }

  /**
   * Get the previous financial year
   */
  previous(): FinancialYear {
    return FinancialYear.fromStartYear(this.startYear - 1);
  }

  /**
   * Get a financial year offset by N years
   * @param years Number of years to offset (positive = future, negative = past)
   */
  offset(years: number): FinancialYear {
    return FinancialYear.fromStartYear(this.startYear + years);
  }

  // ============ Quarter Methods ============

  /**
   * Get the quarters within this financial year
   */
  getQuarters(): FinancialQuarter[] {
    return [
      {
        quarter: 1,
        label: "Q1 (Jul-Sep)",
        start: new Date(this.startYear, 6, 1),
        end: this.getEndOfMonth(this.startYear, 8), // September
      },
      {
        quarter: 2,
        label: "Q2 (Oct-Dec)",
        start: new Date(this.startYear, 9, 1),
        end: this.getEndOfMonth(this.startYear, 11), // December
      },
      {
        quarter: 3,
        label: "Q3 (Jan-Mar)",
        start: new Date(this.endYear, 0, 1),
        end: this.getEndOfMonth(this.endYear, 2), // March
      },
      {
        quarter: 4,
        label: "Q4 (Apr-Jun)",
        start: new Date(this.endYear, 3, 1),
        end: this.getEndOfMonth(this.endYear, 5), // June
      },
    ];
  }

  /**
   * Get the quarter number (1-4) for a given date
   * @returns Quarter number or null if date is outside this FY
   */
  getQuarterForDate(date: Date): number | null {
    if (!this.contains(date)) {
      return null;
    }

    const month = date.getMonth();
    const year = date.getFullYear();

    // Q1: Jul-Sep (months 6-8 of start year)
    if (year === this.startYear && month >= 6 && month <= 8) return 1;
    // Q2: Oct-Dec (months 9-11 of start year)
    if (year === this.startYear && month >= 9 && month <= 11) return 2;
    // Q3: Jan-Mar (months 0-2 of end year)
    if (year === this.endYear && month >= 0 && month <= 2) return 3;
    // Q4: Apr-Jun (months 3-5 of end year)
    if (year === this.endYear && month >= 3 && month <= 5) return 4;

    return null;
  }

  /**
   * Get the current quarter number (1-4) if we're in this FY
   * @returns Quarter number or null if current date is outside this FY
   */
  getCurrentQuarter(): number | null {
    return this.getQuarterForDate(new Date());
  }

  // ============ Month Methods ============

  /**
   * Get all months within this financial year
   */
  getMonths(): FinancialMonth[] {
    const months: FinancialMonth[] = [];

    // July to December (start year)
    for (let month = 6; month <= 11; month++) {
      months.push(this.createMonth(this.startYear, month));
    }

    // January to June (end year)
    for (let month = 0; month <= 5; month++) {
      months.push(this.createMonth(this.endYear, month));
    }

    return months;
  }

  // ============ Formatting Methods ============

  /**
   * Format as display string
   * @returns Formatted string like "FY 2024-25"
   */
  format(): string {
    return `FY ${this.value}`;
  }

  /**
   * Format as short string (just the value)
   * @returns String like "2024-25"
   */
  toString(): string {
    return this.value;
  }

  /**
   * Format as full date range
   * @returns String like "1 Jul 2024 - 30 Jun 2025"
   */
  formatDateRange(): string {
    const startStr = this.startDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const endStr = this.endDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): string {
    return this.value;
  }

  // ============ Static Utility Methods ============

  /**
   * Get a list of recent financial years
   * @param count Number of years to return (default: 5)
   * @returns Array of FinancialYear instances, most recent first
   */
  static getRecentYears(count: number = 5): FinancialYear[] {
    const current = FinancialYear.current();
    const years: FinancialYear[] = [];

    for (let i = 0; i < count; i++) {
      years.push(current.offset(-i));
    }

    return years;
  }

  /**
   * Get a range of financial years between two years (inclusive)
   * @param start Starting financial year
   * @param end Ending financial year
   */
  static range(start: FinancialYear, end: FinancialYear): FinancialYear[] {
    const years: FinancialYear[] = [];
    let current = start;

    while (!current.isAfter(end)) {
      years.push(current);
      current = current.next();
    }

    return years;
  }

  // ============ Private Helpers ============

  private getEndOfMonth(year: number, month: number): Date {
    // Create date for the 1st of next month, then subtract 1 day
    const nextMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return nextMonth;
  }

  private createMonth(year: number, month: number): FinancialMonth {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return {
      month,
      year,
      label: `${monthNames[month]} ${year}`,
      start: new Date(year, month, 1),
      end: this.getEndOfMonth(year, month),
    };
  }
}

// ============ Types ============

export interface FinancialQuarter {
  /** Quarter number (1-4) */
  quarter: number;
  /** Display label (e.g., "Q1 (Jul-Sep)") */
  label: string;
  /** Start date of the quarter */
  start: Date;
  /** End date of the quarter */
  end: Date;
}

export interface FinancialMonth {
  /** Month number (0-11, JavaScript style) */
  month: number;
  /** Calendar year */
  year: number;
  /** Display label (e.g., "Jul 2024") */
  label: string;
  /** Start date of the month */
  start: Date;
  /** End date of the month */
  end: Date;
}
