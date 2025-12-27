/**
 * Money Value Object
 *
 * Represents monetary amounts in cents to avoid floating-point precision issues.
 * Immutable - all operations return new Money instances.
 *
 * @example
 * const price = Money.fromCents(1999);     // $19.99
 * const tax = Money.fromDollars(2.50);     // $2.50
 * const total = price.add(tax);            // $22.49
 * console.log(total.format());             // "$22.49"
 */
export class Money {
  /**
   * Private constructor - use static factory methods
   */
  private constructor(
    readonly cents: number,
    readonly currency: "AUD" = "AUD"
  ) {
    if (!Number.isInteger(cents)) {
      throw new Error(`Money cents must be an integer, received: ${cents}`);
    }
  }

  // ============ Factory Methods ============

  /**
   * Create Money from cents (integer)
   * @param cents Amount in cents (can be negative)
   * @param currency Currency code (default: AUD)
   */
  static fromCents(cents: number, currency: "AUD" = "AUD"): Money {
    return new Money(Math.round(cents), currency);
  }

  /**
   * Create Money from dollars (decimal)
   * Converts to cents to avoid floating-point issues
   * @param dollars Amount in dollars (can be negative)
   * @param currency Currency code (default: AUD)
   */
  static fromDollars(dollars: number, currency: "AUD" = "AUD"): Money {
    // Use Math.round to handle floating-point edge cases like 0.1 + 0.2
    const cents = Math.round(dollars * 100);
    return new Money(cents, currency);
  }

  /**
   * Create zero Money
   * @param currency Currency code (default: AUD)
   */
  static zero(currency: "AUD" = "AUD"): Money {
    return new Money(0, currency);
  }

  // ============ Arithmetic Operations ============

  /**
   * Add another Money amount
   * @throws Error if currencies don't match
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents + other.cents, this.currency);
  }

  /**
   * Subtract another Money amount
   * @throws Error if currencies don't match
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.cents - other.cents, this.currency);
  }

  /**
   * Multiply by a factor (e.g., for tax calculation, discounts)
   * Result is rounded to nearest cent
   * @param factor Multiplication factor
   */
  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor), this.currency);
  }

  /**
   * Divide by a divisor
   * Result is rounded to nearest cent
   * @param divisor Division factor (must not be zero)
   */
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error("Cannot divide Money by zero");
    }
    return new Money(Math.round(this.cents / divisor), this.currency);
  }

  /**
   * Get absolute value (always positive)
   */
  abs(): Money {
    return new Money(Math.abs(this.cents), this.currency);
  }

  /**
   * Negate the amount (flip sign)
   */
  negate(): Money {
    return new Money(-this.cents, this.currency);
  }

  // ============ Comparison Methods ============

  /**
   * Check equality with another Money
   */
  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  /**
   * Check if this is greater than another Money
   * @throws Error if currencies don't match
   */
  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents > other.cents;
  }

  /**
   * Check if this is less than another Money
   * @throws Error if currencies don't match
   */
  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents < other.cents;
  }

  /**
   * Check if this is greater than or equal to another Money
   * @throws Error if currencies don't match
   */
  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents >= other.cents;
  }

  /**
   * Check if this is less than or equal to another Money
   * @throws Error if currencies don't match
   */
  lessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents <= other.cents;
  }

  /**
   * Check if amount is zero
   */
  isZero(): boolean {
    return this.cents === 0;
  }

  /**
   * Check if amount is negative
   */
  isNegative(): boolean {
    return this.cents < 0;
  }

  /**
   * Check if amount is positive
   */
  isPositive(): boolean {
    return this.cents > 0;
  }

  // ============ Conversion Methods ============

  /**
   * Convert to dollars (floating-point number)
   * Use only for display purposes - use cents for calculations
   */
  toDollars(): number {
    return this.cents / 100;
  }

  /**
   * Format as currency string
   * @param options Formatting options
   * @returns Formatted string like "$1,234.56" or "-$50.00"
   */
  format(options: MoneyFormatOptions = {}): string {
    const {
      showSign = false,
      signDisplay = "auto",
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
    } = options;

    const absValue = Math.abs(this.cents) / 100;
    const isNegative = this.cents < 0;

    const formatted = absValue.toLocaleString("en-AU", {
      style: "currency",
      currency: this.currency,
      minimumFractionDigits,
      maximumFractionDigits,
    });

    if (showSign && signDisplay === "always") {
      return isNegative ? formatted.replace("$", "-$") : `+${formatted}`;
    }

    if (isNegative) {
      return formatted.replace("$", "-$");
    }

    return formatted;
  }

  /**
   * Format as compact string for display in tight spaces
   * @returns Formatted string like "$1.2K" or "$2.5M"
   */
  formatCompact(): string {
    const absValue = Math.abs(this.cents) / 100;
    const sign = this.cents < 0 ? "-" : "";

    if (absValue >= 1_000_000) {
      return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
    }
    if (absValue >= 1_000) {
      return `${sign}$${(absValue / 1_000).toFixed(1)}K`;
    }
    return this.format();
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): MoneyJSON {
    return {
      cents: this.cents,
      currency: this.currency,
    };
  }

  /**
   * Create Money from plain object
   */
  static fromJSON(json: MoneyJSON): Money {
    return new Money(json.cents, json.currency);
  }

  // ============ Static Utility Methods ============

  /**
   * Sum an array of Money values
   * @throws Error if currencies don't match
   */
  static sum(amounts: Money[]): Money {
    if (amounts.length === 0) {
      return Money.zero();
    }

    const currency = amounts[0].currency;
    let total = 0;

    for (const amount of amounts) {
      if (amount.currency !== currency) {
        throw new Error(
          `Currency mismatch: expected ${currency}, got ${amount.currency}`
        );
      }
      total += amount.cents;
    }

    return new Money(total, currency);
  }

  /**
   * Find maximum value from array of Money
   * @throws Error if currencies don't match or array is empty
   */
  static max(amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new Error("Cannot find max of empty array");
    }

    const currency = amounts[0].currency;
    let maxCents = amounts[0].cents;

    for (const amount of amounts) {
      if (amount.currency !== currency) {
        throw new Error(
          `Currency mismatch: expected ${currency}, got ${amount.currency}`
        );
      }
      if (amount.cents > maxCents) {
        maxCents = amount.cents;
      }
    }

    return new Money(maxCents, currency);
  }

  /**
   * Find minimum value from array of Money
   * @throws Error if currencies don't match or array is empty
   */
  static min(amounts: Money[]): Money {
    if (amounts.length === 0) {
      throw new Error("Cannot find min of empty array");
    }

    const currency = amounts[0].currency;
    let minCents = amounts[0].cents;

    for (const amount of amounts) {
      if (amount.currency !== currency) {
        throw new Error(
          `Currency mismatch: expected ${currency}, got ${amount.currency}`
        );
      }
      if (amount.cents < minCents) {
        minCents = amount.cents;
      }
    }

    return new Money(minCents, currency);
  }

  // ============ Private Helpers ============

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Currency mismatch: cannot operate on ${this.currency} and ${other.currency}`
      );
    }
  }
}

// ============ Types ============

export interface MoneyFormatOptions {
  /** Show explicit + or - sign */
  showSign?: boolean;
  /** When to show sign: 'auto' (negative only) or 'always' */
  signDisplay?: "auto" | "always";
  /** Minimum fraction digits (default: 2) */
  minimumFractionDigits?: number;
  /** Maximum fraction digits (default: 2) */
  maximumFractionDigits?: number;
}

export interface MoneyJSON {
  cents: number;
  currency: "AUD";
}
