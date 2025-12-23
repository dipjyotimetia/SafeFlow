import { describe, it, expect } from 'vitest';
import {
  getFrankingMultiplier,
  calculateFrankingCredit,
  calculateGrossedUpDividend,
  calculateFrankingDetails,
  calculateMaxFrankingCredit,
  isValidFrankingPercentage,
  formatFrankingPercentage,
} from '../franking';

describe('Franking Credit Utilities', () => {
  describe('getFrankingMultiplier', () => {
    it('should return correct multiplier for 30% rate', () => {
      const multiplier = getFrankingMultiplier(30);
      // 0.30 / 0.70 = 0.42857...
      expect(multiplier).toBeCloseTo(0.4286, 3);
    });

    it('should return correct multiplier for 25% rate', () => {
      const multiplier = getFrankingMultiplier(25);
      // 0.25 / 0.75 = 0.3333...
      expect(multiplier).toBeCloseTo(0.3333, 3);
    });
  });

  describe('calculateFrankingCredit', () => {
    describe('fully franked dividends (100%)', () => {
      it('should calculate correct credit at 30% rate', () => {
        // $100 cash dividend = 10000 cents
        // Credit = 10000 × 0.4286 = 4286 cents
        const credit = calculateFrankingCredit(10000, 100, 30);
        expect(credit).toBe(4286);
      });

      it('should calculate correct credit at 25% rate', () => {
        // $100 cash dividend = 10000 cents
        // Credit = 10000 × 0.3333 = 3333 cents
        const credit = calculateFrankingCredit(10000, 100, 25);
        expect(credit).toBe(3333);
      });

      it('should handle small dividends', () => {
        // $1 cash dividend = 100 cents
        const credit = calculateFrankingCredit(100, 100, 30);
        expect(credit).toBe(43); // 100 × 0.4286 = 42.86 rounds to 43
      });

      it('should handle large dividends', () => {
        // $10,000 cash dividend = 1000000 cents
        const credit = calculateFrankingCredit(1000000, 100, 30);
        expect(credit).toBe(428571); // ~$4,285.71
      });
    });

    describe('partially franked dividends', () => {
      it('should calculate 50% franked dividend', () => {
        // $100 @ 50% franked @ 30% rate
        // Credit = 10000 × 0.4286 × 0.5 = 2143 cents
        const credit = calculateFrankingCredit(10000, 50, 30);
        expect(credit).toBe(2143);
      });

      it('should calculate 75% franked dividend', () => {
        // $100 @ 75% franked @ 30% rate
        // Credit = 10000 × 0.4286 × 0.75 = 3214.5 rounds to 3214
        const credit = calculateFrankingCredit(10000, 75, 30);
        expect(credit).toBe(3214);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for zero dividend', () => {
        expect(calculateFrankingCredit(0, 100, 30)).toBe(0);
      });

      it('should return 0 for negative dividend', () => {
        expect(calculateFrankingCredit(-10000, 100, 30)).toBe(0);
      });

      it('should return 0 for zero franking percentage', () => {
        expect(calculateFrankingCredit(10000, 0, 30)).toBe(0);
      });

      it('should return 0 for franking > 100%', () => {
        expect(calculateFrankingCredit(10000, 150, 30)).toBe(0);
      });

      it('should handle 1 cent dividend', () => {
        const credit = calculateFrankingCredit(1, 100, 30);
        expect(credit).toBe(0); // 1 × 0.4286 = 0.4286 rounds to 0
      });
    });
  });

  describe('calculateGrossedUpDividend', () => {
    it('should add franking credit to cash dividend', () => {
      // $100 cash + $42.86 credit = $142.86
      expect(calculateGrossedUpDividend(10000, 4286)).toBe(14286);
    });

    it('should handle zero values', () => {
      expect(calculateGrossedUpDividend(0, 0)).toBe(0);
      expect(calculateGrossedUpDividend(10000, 0)).toBe(10000);
    });
  });

  describe('calculateFrankingDetails', () => {
    it('should return both franking credit and grossed-up amount', () => {
      const result = calculateFrankingDetails(10000, 100, 30);
      expect(result.frankingCredit).toBe(4286);
      expect(result.grossedUp).toBe(14286);
    });

    it('should handle partial franking', () => {
      const result = calculateFrankingDetails(10000, 50, 30);
      expect(result.frankingCredit).toBe(2143);
      expect(result.grossedUp).toBe(12143);
    });

    it('should use default 30% rate', () => {
      const result = calculateFrankingDetails(10000, 100);
      expect(result.frankingCredit).toBe(4286);
    });
  });

  describe('calculateMaxFrankingCredit', () => {
    it('should calculate max credit for 30% rate', () => {
      expect(calculateMaxFrankingCredit(10000, 30)).toBe(4286);
    });

    it('should calculate max credit for 25% rate', () => {
      expect(calculateMaxFrankingCredit(10000, 25)).toBe(3333);
    });
  });

  describe('isValidFrankingPercentage', () => {
    it('should accept valid percentages', () => {
      expect(isValidFrankingPercentage(0)).toBe(true);
      expect(isValidFrankingPercentage(50)).toBe(true);
      expect(isValidFrankingPercentage(100)).toBe(true);
    });

    it('should reject invalid percentages', () => {
      expect(isValidFrankingPercentage(-1)).toBe(false);
      expect(isValidFrankingPercentage(101)).toBe(false);
    });
  });

  describe('formatFrankingPercentage', () => {
    it('should format fully franked', () => {
      expect(formatFrankingPercentage(100)).toBe('Fully franked');
    });

    it('should format unfranked', () => {
      expect(formatFrankingPercentage(0)).toBe('Unfranked');
    });

    it('should format partial franking', () => {
      expect(formatFrankingPercentage(50)).toBe('50% franked');
      expect(formatFrankingPercentage(75)).toBe('75% franked');
    });
  });

  describe('Numeric precision tests', () => {
    it('should maintain precision across multiple calculations', () => {
      // Multiple dividends from same holding
      const dividends = [10000, 15000, 7500, 22500];
      let totalCredit = 0;

      for (const dividend of dividends) {
        totalCredit += calculateFrankingCredit(dividend, 100, 30);
      }

      // Should equal credit calculated on total
      const totalDividend = dividends.reduce((a, b) => a + b, 0);
      const bulkCredit = calculateFrankingCredit(totalDividend, 100, 30);

      // Allow for rounding differences (at most $0.04 difference for 4 calcs)
      expect(Math.abs(totalCredit - bulkCredit)).toBeLessThanOrEqual(4);
    });

    it('should never produce fractional cents', () => {
      // Test various amounts
      for (let cents = 1; cents <= 1000; cents++) {
        const credit = calculateFrankingCredit(cents, 100, 30);
        expect(Number.isInteger(credit)).toBe(true);
      }
    });

    it('should handle amounts that cause float issues', () => {
      // 1999 × 0.4286 = 856.8714 should round to 857
      const credit = calculateFrankingCredit(1999, 100, 30);
      expect(credit).toBe(857);

      // 2999 × 0.4286 = 1285.4714 should round to 1285
      const credit2 = calculateFrankingCredit(2999, 100, 30);
      expect(credit2).toBe(1285);
    });

    it('should verify ATO example: $70 dividend with 30% rate', () => {
      // ATO example: $70 fully franked dividend
      // Franking credit = $70 × (30/70) = $30
      const credit = calculateFrankingCredit(7000, 100, 30);
      expect(credit).toBe(3000); // $30.00
    });
  });
});
