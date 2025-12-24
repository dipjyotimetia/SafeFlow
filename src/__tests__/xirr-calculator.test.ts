import { describe, it, expect } from 'vitest';
import {
  calculateXIRR,
  validateXIRRCashflows,
  buildXIRRCashflows,
  calculatePortfolioXIRR,
  type DateCashflow,
} from '@/lib/utils/xirr-calculator';

describe('XIRR Calculator', () => {
  describe('validateXIRRCashflows', () => {
    it('should reject empty cashflows', () => {
      const result = validateXIRRCashflows([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 2 cashflows are required');
    });

    it('should reject cashflows with only positive amounts', () => {
      const cashflows: DateCashflow[] = [
        { date: new Date('2024-01-01'), amount: 10000 },
        { date: new Date('2024-12-01'), amount: 5000 },
      ];
      const result = validateXIRRCashflows(cashflows);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one negative cashflow (investment) is required');
    });

    it('should reject cashflows with only negative amounts', () => {
      const cashflows: DateCashflow[] = [
        { date: new Date('2024-01-01'), amount: -10000 },
        { date: new Date('2024-12-01'), amount: -5000 },
      ];
      const result = validateXIRRCashflows(cashflows);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one positive cashflow (return) is required');
    });

    it('should accept valid cashflows', () => {
      const cashflows: DateCashflow[] = [
        { date: new Date('2024-01-01'), amount: -10000 },
        { date: new Date('2024-12-01'), amount: 11000 },
      ];
      const result = validateXIRRCashflows(cashflows);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('calculateXIRR', () => {
    it('should calculate XIRR for a simple investment with 10% return', () => {
      // Invest $10,000 on Jan 1, receive $11,000 on Dec 31 (10% return)
      const cashflows: DateCashflow[] = [
        { date: new Date('2024-01-01'), amount: -1000000 }, // -$10,000 in cents
        { date: new Date('2024-12-31'), amount: 1100000 }, // $11,000 in cents
      ];

      const result = calculateXIRR(cashflows);
      expect(result.converged).toBe(true);
      expect(result.xirr).toBeCloseTo(10, 0); // Approximately 10%
    });

    it('should calculate XIRR for investment with multiple cashflows', () => {
      // Invest $10,000, add $5,000 mid-year, receive $16,500 at end
      const cashflows: DateCashflow[] = [
        { date: new Date('2024-01-01'), amount: -1000000 }, // -$10,000
        { date: new Date('2024-07-01'), amount: -500000 }, // -$5,000
        { date: new Date('2024-12-31'), amount: 1650000 }, // $16,500
      ];

      const result = calculateXIRR(cashflows);
      expect(result.converged).toBe(true);
      expect(result.xirr).toBeGreaterThan(0);
    });

    it('should handle negative returns (loss)', () => {
      // Invest $10,000, receive only $9,000 (10% loss)
      const cashflows: DateCashflow[] = [
        { date: new Date('2024-01-01'), amount: -1000000 }, // -$10,000
        { date: new Date('2024-12-31'), amount: 900000 }, // $9,000
      ];

      const result = calculateXIRR(cashflows);
      expect(result.converged).toBe(true);
      expect(result.xirr).toBeLessThan(0);
      expect(result.xirr).toBeCloseTo(-10, 0);
    });

    it('should handle dividends received during holding period', () => {
      // Invest $10,000, receive $200 dividend mid-year, end value $10,500
      const cashflows: DateCashflow[] = [
        { date: new Date('2024-01-01'), amount: -1000000 }, // -$10,000 investment
        { date: new Date('2024-06-15'), amount: 20000 }, // $200 dividend
        { date: new Date('2024-12-31'), amount: 1050000 }, // $10,500 final value
      ];

      const result = calculateXIRR(cashflows);
      expect(result.converged).toBe(true);
      expect(result.xirr).toBeGreaterThan(5); // Should be > 5% with dividend
    });

    it('should return error for invalid cashflows', () => {
      const cashflows: DateCashflow[] = [
        { date: new Date('2024-01-01'), amount: 10000 }, // No negative cashflow
      ];

      const result = calculateXIRR(cashflows);
      expect(result.converged).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('buildXIRRCashflows', () => {
    it('should convert buy transactions to negative cashflows', () => {
      const transactions = [
        { date: new Date('2024-01-01'), type: 'buy' as const, amount: 10000 },
      ];

      const cashflows = buildXIRRCashflows(transactions, 11000);

      expect(cashflows).toHaveLength(2);
      expect(cashflows[0].amount).toBe(-10000); // Buy is outflow
      expect(cashflows[1].amount).toBe(11000); // Current value is inflow
    });

    it('should convert sell transactions to positive cashflows', () => {
      const transactions = [
        { date: new Date('2024-01-01'), type: 'buy' as const, amount: 10000 },
        { date: new Date('2024-06-01'), type: 'sell' as const, amount: 5000 },
      ];

      const cashflows = buildXIRRCashflows(transactions, 6000);

      expect(cashflows).toHaveLength(3);
      expect(cashflows[0].amount).toBe(-10000); // Buy
      expect(cashflows[1].amount).toBe(5000); // Sell (inflow)
      expect(cashflows[2].amount).toBe(6000); // Current value
    });

    it('should convert dividends to positive cashflows', () => {
      const transactions = [
        { date: new Date('2024-01-01'), type: 'buy' as const, amount: 10000 },
        { date: new Date('2024-06-15'), type: 'dividend' as const, amount: 200 },
      ];

      const cashflows = buildXIRRCashflows(transactions, 10500);

      expect(cashflows).toHaveLength(3);
      expect(cashflows[1].amount).toBe(200); // Dividend is inflow
    });

    it('should convert fees to negative cashflows', () => {
      const transactions = [
        { date: new Date('2024-01-01'), type: 'buy' as const, amount: 10000 },
        { date: new Date('2024-06-01'), type: 'fee' as const, amount: 50 },
      ];

      const cashflows = buildXIRRCashflows(transactions, 10000);

      expect(cashflows).toHaveLength(3);
      expect(cashflows[1].amount).toBe(-50); // Fee is outflow
    });
  });

  describe('calculatePortfolioXIRR', () => {
    it('should calculate XIRR for a portfolio with multiple transactions', () => {
      const transactions = [
        { date: new Date('2024-01-01'), type: 'buy' as const, amount: 1000000 },
        { date: new Date('2024-03-15'), type: 'dividend' as const, amount: 10000 },
        { date: new Date('2024-06-15'), type: 'dividend' as const, amount: 10000 },
        { date: new Date('2024-09-15'), type: 'dividend' as const, amount: 10000 },
      ];

      const result = calculatePortfolioXIRR(transactions, 1100000, new Date('2024-12-31'));

      expect(result.converged).toBe(true);
      expect(result.xirr).toBeGreaterThan(0);
    });
  });
});
