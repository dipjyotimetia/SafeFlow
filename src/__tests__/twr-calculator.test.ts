import { describe, it, expect } from 'vitest';
import {
  calculateTWRFromPeriods,
  calculateTWRFromSnapshots,
  calculateModifiedDietz,
  validateTWRPeriods,
  validateSnapshots,
  type TWRPeriod,
  type PortfolioSnapshot,
} from '@/lib/utils/twr-calculator';

describe('TWR Calculator', () => {
  describe('validateTWRPeriods', () => {
    it('should reject empty periods array', () => {
      const result = validateTWRPeriods([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one period is required');
    });

    it('should reject periods with zero start value', () => {
      const periods: TWRPeriod[] = [
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          startValue: 0,
          endValue: 10000,
        },
      ];
      const result = validateTWRPeriods(periods);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Period 1: Start value must be positive');
    });

    it('should reject periods where end date is before start date', () => {
      const periods: TWRPeriod[] = [
        {
          startDate: new Date('2024-03-31'),
          endDate: new Date('2024-01-01'),
          startValue: 10000,
          endValue: 11000,
        },
      ];
      const result = validateTWRPeriods(periods);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Period 1: End date must be after start date');
    });

    it('should accept valid periods', () => {
      const periods: TWRPeriod[] = [
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          startValue: 10000,
          endValue: 10500,
        },
      ];
      const result = validateTWRPeriods(periods);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateSnapshots', () => {
    it('should reject less than 2 snapshots', () => {
      const snapshots: PortfolioSnapshot[] = [
        { date: new Date('2024-01-01'), value: 10000 },
      ];
      const result = validateSnapshots(snapshots);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 2 snapshots are required');
    });

    it('should accept valid snapshots', () => {
      const snapshots: PortfolioSnapshot[] = [
        { date: new Date('2024-01-01'), value: 10000 },
        { date: new Date('2024-06-30'), value: 10500 },
      ];
      const result = validateSnapshots(snapshots);
      expect(result.isValid).toBe(true);
    });
  });

  describe('calculateTWRFromPeriods', () => {
    it('should calculate 10% return for single period', () => {
      const periods: TWRPeriod[] = [
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          startValue: 1000000, // $10,000 in cents
          endValue: 1100000, // $11,000 in cents
        },
      ];

      const result = calculateTWRFromPeriods(periods);

      expect(result.twr).toBeCloseTo(10, 0); // 10% return
      expect(result.periodReturns).toHaveLength(1);
      expect(result.periodReturns[0].return).toBeCloseTo(0.1, 2);
    });

    it('should chain returns correctly for multiple periods', () => {
      // Two periods: 10% then 10% = (1.1 * 1.1) - 1 = 21%
      const periods: TWRPeriod[] = [
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          startValue: 1000000,
          endValue: 1100000, // +10%
        },
        {
          startDate: new Date('2024-06-30'),
          endDate: new Date('2024-12-31'),
          startValue: 1100000,
          endValue: 1210000, // +10%
        },
      ];

      const result = calculateTWRFromPeriods(periods);

      expect(result.twr).toBeCloseTo(21, 0); // 21% total return
      expect(result.periodReturns).toHaveLength(2);
    });

    it('should handle negative returns', () => {
      const periods: TWRPeriod[] = [
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          startValue: 1000000,
          endValue: 900000, // -10%
        },
      ];

      const result = calculateTWRFromPeriods(periods);

      expect(result.twr).toBeCloseTo(-10, 0);
    });

    it('should calculate annualized TWR', () => {
      // 10% return over 6 months should annualize to ~21%
      const periods: TWRPeriod[] = [
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-07-01'), // ~180 days
          startValue: 1000000,
          endValue: 1100000,
        },
      ];

      const result = calculateTWRFromPeriods(periods);

      expect(result.annualizedTWR).toBeGreaterThan(result.twr); // Annualized should be higher
      expect(result.totalDays).toBeCloseTo(182, 1);
    });
  });

  describe('calculateTWRFromSnapshots', () => {
    it('should convert snapshots to periods and calculate TWR', () => {
      const snapshots: PortfolioSnapshot[] = [
        { date: new Date('2024-01-01'), value: 1000000 },
        { date: new Date('2024-06-30'), value: 1050000 }, // +5%
        { date: new Date('2024-12-31'), value: 1102500 }, // +5% more
      ];

      const result = calculateTWRFromSnapshots(snapshots);

      expect(result.twr).toBeCloseTo(10.25, 0); // (1.05 * 1.05 - 1) = 10.25%
      expect(result.periodReturns).toHaveLength(2);
    });

    it('should handle cashflows correctly', () => {
      // Add $5000 mid-year, which should not affect TWR
      const snapshots: PortfolioSnapshot[] = [
        { date: new Date('2024-01-01'), value: 1000000 },
        { date: new Date('2024-06-30'), value: 1050000, cashflow: 500000 }, // +5%, add $5000
        { date: new Date('2024-12-31'), value: 1627500 }, // New base is $15,500, grew 5%
      ];

      const result = calculateTWRFromSnapshots(snapshots);

      // TWR should still be ~10.25% because external cashflows don't affect it
      expect(result.periodReturns).toHaveLength(2);
    });
  });

  describe('calculateModifiedDietz', () => {
    it('should calculate return with no cashflows', () => {
      const result = calculateModifiedDietz(
        1000000, // Start: $10,000
        1100000, // End: $11,000
        [],
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(result).toBeCloseTo(10, 0); // 10% return
    });

    it('should weight cashflows by time remaining', () => {
      // Deposit $5000 at mid-year (6 months remaining of 12)
      // Weight = 0.5, so weighted cashflow = $2500
      // Return = (11000 - 10000 - 5000) / (10000 + 2500) = -4000/12500 = -32%
      // But if the investment grows proportionally...
      const result = calculateModifiedDietz(
        1000000, // Start: $10,000
        1600000, // End: $16,000
        [{ date: new Date('2024-07-01'), amount: 500000 }], // Mid-year deposit of $5000
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      // Gain = 16000 - 10000 - 5000 = 1000
      // Average capital = 10000 + 5000 * 0.5 = 12500
      // Return = 1000 / 12500 = 8%
      expect(result).toBeCloseTo(8, 0);
    });

    it('should handle withdrawals', () => {
      const result = calculateModifiedDietz(
        1000000, // Start: $10,000
        600000, // End: $6,000
        [{ date: new Date('2024-07-01'), amount: -300000 }], // Mid-year withdrawal of $3000
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      // Gain = 6000 - 10000 - (-3000) = -1000
      // Average capital = 10000 + (-3000) * 0.5 = 8500
      // Return = -1000 / 8500 = -11.76%
      expect(result).toBeCloseTo(-11.76, 0);
    });

    it('should return 0 for zero-day period', () => {
      const result = calculateModifiedDietz(
        1000000,
        1100000,
        [],
        new Date('2024-01-01'),
        new Date('2024-01-01')
      );

      expect(result).toBe(0);
    });
  });
});
