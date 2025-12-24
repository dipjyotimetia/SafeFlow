import { describe, it, expect } from 'vitest';
import {
  calculateInvestmentCGT,
  calculateSellTransactionCGT,
  formatHoldingPeriod,
  daysUntilCGTDiscount,
  CGT_DISCOUNT_HOLDING_DAYS,
} from '@/lib/utils/investment-cgt';

describe('Investment CGT Calculator', () => {
  describe('calculateInvestmentCGT', () => {
    it('should calculate capital gain with no discount for short-term holding', () => {
      const result = calculateInvestmentCGT({
        saleProceeds: 1100000, // $11,000
        saleDate: new Date('2024-06-01'),
        costBasis: 1000000, // $10,000
        purchaseDate: new Date('2024-01-01'), // 5 months - no discount
      });

      expect(result.grossCapitalGain).toBe(100000); // $1,000 gain
      expect(result.isEligibleForDiscount).toBe(false);
      expect(result.discountAmount).toBe(0);
      expect(result.netCapitalGain).toBe(100000); // No discount applied
      expect(result.isCapitalLoss).toBe(false);
    });

    it('should apply 50% CGT discount for holdings over 12 months', () => {
      const result = calculateInvestmentCGT({
        saleProceeds: 1100000, // $11,000
        saleDate: new Date('2025-01-15'), // Over 12 months
        costBasis: 1000000, // $10,000
        purchaseDate: new Date('2024-01-01'),
      });

      expect(result.grossCapitalGain).toBe(100000); // $1,000 gain
      expect(result.isEligibleForDiscount).toBe(true);
      expect(result.discountPercent).toBe(50);
      expect(result.discountAmount).toBe(50000); // $500 discount
      expect(result.netCapitalGain).toBe(50000); // $500 taxable
    });

    it('should correctly identify capital losses', () => {
      const result = calculateInvestmentCGT({
        saleProceeds: 900000, // $9,000
        saleDate: new Date('2025-01-15'),
        costBasis: 1000000, // $10,000
        purchaseDate: new Date('2024-01-01'),
      });

      expect(result.grossCapitalGain).toBe(-100000); // $1,000 loss
      expect(result.isCapitalLoss).toBe(true);
      expect(result.discountAmount).toBe(0); // No discount on losses
      expect(result.netCapitalGain).toBe(-100000); // Full loss
    });

    it('should subtract fees from proceeds', () => {
      const result = calculateInvestmentCGT({
        saleProceeds: 1100000, // $11,000
        saleDate: new Date('2024-06-01'),
        fees: 1000, // $10 fees
        costBasis: 1000000, // $10,000
        purchaseDate: new Date('2024-01-01'),
      });

      expect(result.saleProceeds).toBe(1099000); // $10,990 after fees
      expect(result.grossCapitalGain).toBe(99000); // $990 gain
    });

    it('should calculate estimated tax when marginal rate provided', () => {
      const result = calculateInvestmentCGT({
        saleProceeds: 1100000,
        saleDate: new Date('2025-01-15'), // With discount
        costBasis: 1000000,
        purchaseDate: new Date('2024-01-01'),
        marginalTaxRate: 32.5,
      });

      // Net gain after discount: $500
      // Tax at 32.5%: $162.50, rounded to $163
      expect(result.estimatedTax).toBeCloseTo(16250, -1);
      expect(result.effectiveTaxRate).toBeDefined();
    });

    it('should calculate holding period in days and months', () => {
      const result = calculateInvestmentCGT({
        saleProceeds: 1100000,
        saleDate: new Date('2024-07-15'),
        costBasis: 1000000,
        purchaseDate: new Date('2024-01-01'),
      });

      expect(result.holdingPeriodDays).toBeGreaterThan(180);
      expect(result.holdingPeriodMonths).toBeGreaterThanOrEqual(6);
    });
  });

  describe('calculateSellTransactionCGT', () => {
    it('should calculate proportional cost basis using average cost', () => {
      // Total holding: 100 units, cost basis $10,000
      // Selling 50 units, should use $5,000 cost basis
      const result = calculateSellTransactionCGT({
        holdingId: 'test',
        units: 50,
        pricePerUnit: 12000, // $120 per unit in cents
        saleDate: new Date('2025-01-15'),
        totalUnits: 100,
        totalCostBasis: 1000000, // $10,000
        firstPurchaseDate: new Date('2024-01-01'),
      });

      // Sale proceeds: 50 * $120 = $6,000 = 600,000 cents
      // Cost basis: $5,000 = 500,000 cents
      // Gross gain: $1,000 = 100,000 cents
      // With 50% discount: $500 = 50,000 cents

      expect(result.costBasis).toBe(500000);
      expect(result.saleProceeds).toBe(600000);
      expect(result.grossCapitalGain).toBe(100000);
      expect(result.isEligibleForDiscount).toBe(true);
      expect(result.netCapitalGain).toBe(50000);
    });

    it('should handle selling all units', () => {
      const result = calculateSellTransactionCGT({
        holdingId: 'test',
        units: 100,
        pricePerUnit: 11000,
        saleDate: new Date('2024-06-01'),
        totalUnits: 100,
        totalCostBasis: 1000000,
        firstPurchaseDate: new Date('2024-01-01'),
      });

      expect(result.costBasis).toBe(1000000);
      expect(result.saleProceeds).toBe(1100000);
    });

    it('should handle fees', () => {
      const result = calculateSellTransactionCGT({
        holdingId: 'test',
        units: 100,
        pricePerUnit: 11000,
        fees: 1000, // $10 fees
        saleDate: new Date('2024-06-01'),
        totalUnits: 100,
        totalCostBasis: 1000000,
        firstPurchaseDate: new Date('2024-01-01'),
      });

      expect(result.saleProceeds).toBe(1099000); // After fees
      expect(result.grossCapitalGain).toBe(99000);
    });
  });

  describe('formatHoldingPeriod', () => {
    it('should format days correctly', () => {
      expect(formatHoldingPeriod(15)).toBe('15 days');
      expect(formatHoldingPeriod(1)).toBe('1 day');
    });

    it('should format months correctly', () => {
      expect(formatHoldingPeriod(60)).toBe('2 months');
      expect(formatHoldingPeriod(30)).toBe('1 month');
    });

    it('should format years and months correctly', () => {
      expect(formatHoldingPeriod(365)).toBe('1 year');
      expect(formatHoldingPeriod(450)).toBe('1 year, 3 months'); // 450 days = ~15 months
      expect(formatHoldingPeriod(730)).toBe('2 years');
    });
  });

  describe('daysUntilCGTDiscount', () => {
    it('should return 0 for holdings already eligible', () => {
      const purchaseDate = new Date();
      purchaseDate.setDate(purchaseDate.getDate() - 400); // 400 days ago

      const result = daysUntilCGTDiscount(purchaseDate);
      expect(result).toBe(0);
    });

    it('should return positive days for holdings not yet eligible', () => {
      const purchaseDate = new Date();
      purchaseDate.setDate(purchaseDate.getDate() - 100); // 100 days ago

      const result = daysUntilCGTDiscount(purchaseDate);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(CGT_DISCOUNT_HOLDING_DAYS);
    });
  });
});
