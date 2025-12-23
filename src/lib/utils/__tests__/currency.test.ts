import { describe, it, expect } from 'vitest';
import {
  formatAUD,
  formatAUDCompact,
  formatNumber,
  parseAUD,
  dollarsToCents,
  centsToDollars,
  formatPercent,
  formatChange,
} from '../currency';

describe('Currency Utilities', () => {
  describe('formatAUD', () => {
    it('should format positive cents to AUD currency', () => {
      expect(formatAUD(123456)).toBe('$1,234.56');
      expect(formatAUD(100)).toBe('$1.00');
      expect(formatAUD(99)).toBe('$0.99');
    });

    it('should format zero', () => {
      expect(formatAUD(0)).toBe('$0.00');
    });

    it('should format negative cents', () => {
      expect(formatAUD(-123456)).toBe('-$1,234.56');
      expect(formatAUD(-100)).toBe('-$1.00');
    });

    it('should handle large amounts', () => {
      expect(formatAUD(100000000)).toBe('$1,000,000.00');
      expect(formatAUD(999999999)).toBe('$9,999,999.99');
    });

    it('should handle single cent', () => {
      expect(formatAUD(1)).toBe('$0.01');
    });
  });

  describe('formatAUDCompact', () => {
    it('should format small amounts normally', () => {
      // Compact formatter shows 1 decimal place max
      expect(formatAUDCompact(100)).toBe('$1.0');
      expect(formatAUDCompact(99900)).toBe('$999.0');
    });

    it('should format thousands with K suffix', () => {
      expect(formatAUDCompact(100000)).toBe('$1.0K');
      expect(formatAUDCompact(150000)).toBe('$1.5K');
    });

    it('should format millions with M suffix', () => {
      expect(formatAUDCompact(100000000)).toBe('$1.0M');
      expect(formatAUDCompact(250000000)).toBe('$2.5M');
    });
  });

  describe('formatNumber', () => {
    it('should format cents to number without currency symbol', () => {
      expect(formatNumber(123456)).toBe('1,234.56');
      expect(formatNumber(100)).toBe('1.00');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0.00');
    });

    it('should format negative numbers', () => {
      expect(formatNumber(-123456)).toBe('-1,234.56');
    });
  });

  describe('parseAUD', () => {
    it('should parse dollar amounts to cents', () => {
      expect(parseAUD('$1,234.56')).toBe(123456);
      expect(parseAUD('1234.56')).toBe(123456);
      expect(parseAUD('1.00')).toBe(100);
    });

    it('should handle amounts without cents', () => {
      expect(parseAUD('$100')).toBe(10000);
      expect(parseAUD('100')).toBe(10000);
    });

    it('should handle amounts with spaces', () => {
      expect(parseAUD('$ 1,234.56')).toBe(123456);
      expect(parseAUD(' $1,234.56 ')).toBe(123456);
    });

    it('should return 0 for invalid input', () => {
      expect(parseAUD('')).toBe(0);
      expect(parseAUD('abc')).toBe(0);
      expect(parseAUD('$abc')).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(parseAUD('0')).toBe(0);
      expect(parseAUD('0.00')).toBe(0);
      expect(parseAUD('0.01')).toBe(1);
      expect(parseAUD('0.99')).toBe(99);
    });

    it('should round fractional cents', () => {
      // 1.234 dollars = 123.4 cents, rounds to 123
      expect(parseAUD('1.234')).toBe(123);
      // 1.235 dollars = 123.5 cents, rounds to 124
      expect(parseAUD('1.235')).toBe(124);
      // 1.239 dollars = 123.9 cents, rounds to 124
      expect(parseAUD('1.239')).toBe(124);
    });

    it('should handle negative amounts', () => {
      expect(parseAUD('-100')).toBe(-10000);
      expect(parseAUD('-$1,234.56')).toBe(-123456);
    });
  });

  describe('dollarsToCents', () => {
    it('should convert dollars to cents', () => {
      expect(dollarsToCents(1)).toBe(100);
      expect(dollarsToCents(1.5)).toBe(150);
      expect(dollarsToCents(1234.56)).toBe(123456);
    });

    it('should handle zero', () => {
      expect(dollarsToCents(0)).toBe(0);
    });

    it('should round fractional cents', () => {
      // 1.234 dollars = 123.4 cents, rounds to 123
      expect(dollarsToCents(1.234)).toBe(123);
      // 1.235 dollars = 123.5 cents, rounds to 124
      expect(dollarsToCents(1.235)).toBe(124);
    });

    it('should handle negative amounts', () => {
      expect(dollarsToCents(-10)).toBe(-1000);
      expect(dollarsToCents(-1.5)).toBe(-150);
    });

    it('should handle floating point precision issues', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      expect(dollarsToCents(0.1 + 0.2)).toBe(30);
      // 0.07 * 100 = 7.000000000000001 in JS
      expect(dollarsToCents(0.07)).toBe(7);
    });
  });

  describe('centsToDollars', () => {
    it('should convert cents to dollars', () => {
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(150)).toBe(1.5);
      expect(centsToDollars(123456)).toBe(1234.56);
    });

    it('should handle zero', () => {
      expect(centsToDollars(0)).toBe(0);
    });

    it('should handle negative amounts', () => {
      expect(centsToDollars(-1000)).toBe(-10);
    });

    // Note: centsToDollars returns a float - it should only be used for display
    it('should return float for non-even cent amounts', () => {
      expect(centsToDollars(1)).toBe(0.01);
      expect(centsToDollars(99)).toBe(0.99);
    });
  });

  describe('formatPercent', () => {
    it('should format decimal to percentage', () => {
      expect(formatPercent(0.15)).toBe('15.00%');
      expect(formatPercent(0.5)).toBe('50.00%');
      expect(formatPercent(1)).toBe('100.00%');
    });

    it('should handle zero', () => {
      expect(formatPercent(0)).toBe('0.00%');
    });

    it('should handle small percentages', () => {
      expect(formatPercent(0.001)).toBe('0.10%');
      expect(formatPercent(0.0001)).toBe('0.01%');
    });

    it('should handle percentages over 100%', () => {
      expect(formatPercent(1.5)).toBe('150.00%');
      expect(formatPercent(2)).toBe('200.00%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercent(-0.15)).toBe('-15.00%');
    });
  });

  describe('formatChange', () => {
    it('should format positive change with + prefix', () => {
      const result = formatChange(12345);
      expect(result.text).toBe('+$123.45');
      expect(result.className).toBe('text-green-600');
    });

    it('should format negative change with - prefix', () => {
      const result = formatChange(-12345);
      expect(result.text).toBe('-$123.45');
      expect(result.className).toBe('text-red-600');
    });

    it('should format zero change', () => {
      const result = formatChange(0);
      expect(result.text).toBe('$0.00');
      expect(result.className).toBe('text-gray-600');
    });

    it('should handle small changes', () => {
      const positive = formatChange(1);
      expect(positive.text).toBe('+$0.01');
      expect(positive.className).toBe('text-green-600');

      const negative = formatChange(-1);
      expect(negative.text).toBe('-$0.01');
      expect(negative.className).toBe('text-red-600');
    });
  });

  describe('Round-trip conversions', () => {
    it('should maintain precision through format/parse cycle', () => {
      const originalCents = 123456;
      const formatted = formatAUD(originalCents);
      const parsed = parseAUD(formatted);
      expect(parsed).toBe(originalCents);
    });

    it('should maintain precision through dollars/cents conversion', () => {
      const originalCents = 123456;
      const dollars = centsToDollars(originalCents);
      const backToCents = dollarsToCents(dollars);
      expect(backToCents).toBe(originalCents);
    });

    it('should handle multiple round-trips', () => {
      let cents = 999999;
      for (let i = 0; i < 10; i++) {
        const dollars = centsToDollars(cents);
        cents = dollarsToCents(dollars);
      }
      expect(cents).toBe(999999);
    });
  });

  describe('Edge cases and precision', () => {
    it('should handle very large amounts without precision loss', () => {
      // $1 billion in cents
      const oneBillion = 100000000000;
      expect(formatAUD(oneBillion)).toBe('$1,000,000,000.00');
      expect(parseAUD('$1,000,000,000.00')).toBe(oneBillion);
    });

    it('should handle amounts that cause float issues', () => {
      // Common problematic values
      expect(dollarsToCents(19.99)).toBe(1999);
      expect(dollarsToCents(29.99)).toBe(2999);
      expect(dollarsToCents(99.99)).toBe(9999);
    });
  });
});
