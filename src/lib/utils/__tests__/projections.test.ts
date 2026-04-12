import { describe, it, expect } from "vitest";
import {
  calculateFutureValue,
  calculateRequiredContribution,
  calculateMonthsToTarget,
  generateProjectionPoints,
  calculateRetirementProjection,
  calculateGrowthRate,
  calculateProgressPercentage,
  formatTimeframe,
} from "../projections";

describe("Financial Projection Utilities", () => {
  // ============ Future Value ============
  describe("calculateFutureValue", () => {
    it("should calculate compound growth on present value", () => {
      // $10,000 at 7% for 10 years (120 months), no contributions
      const result = calculateFutureValue(1_000_000, 0, 0.07, 120);
      // FV = 10000 × (1.005833)^120 ≈ $20,097
      expect(result).toBeGreaterThan(1_900_000);
      expect(result).toBeLessThan(2_100_000);
    });

    it("should include regular contributions", () => {
      // $0 starting, $500/month at 7% for 10 years
      const result = calculateFutureValue(0, 50_000, 0.07, 120);
      // Should accumulate significant balance
      expect(result).toBeGreaterThan(8_000_000); // > $80k
    });

    it("should handle zero return rate", () => {
      // $10,000 + $500/month × 12 = $16,000
      const result = calculateFutureValue(1_000_000, 50_000, 0, 12);
      expect(result).toBe(1_600_000);
    });

    it("should handle negative present value (debt)", () => {
      // -$5,000 debt + $1,000/month contributions
      const result = calculateFutureValue(-500_000, 100_000, 0.07, 12);
      // First 5 months pay down debt, then 7 months compound growth
      expect(result).toBeGreaterThan(0);
    });

    it("should handle negative present value that stays negative", () => {
      // -$100,000 debt + $100/month, 12 months
      const result = calculateFutureValue(-10_000_000, 10_000, 0.07, 12);
      // $100/month × 12 = $1,200, still in debt
      expect(result).toBeLessThan(0);
    });

    it("should return PV when months is zero", () => {
      const result = calculateFutureValue(1_000_000, 50_000, 0.07, 0);
      expect(result).toBe(1_000_000);
    });
  });

  // ============ Required Contribution ============
  describe("calculateRequiredContribution", () => {
    it("should calculate monthly contribution needed", () => {
      // Need to go from $10k to $100k in 10 years at 7%
      const result = calculateRequiredContribution(
        1_000_000,
        10_000_000,
        0.07,
        120
      );
      // Should need ~$400-500/month
      expect(result).toBeGreaterThan(40_000);
      expect(result).toBeLessThan(60_000);
    });

    it("should return 0 if already at target", () => {
      const result = calculateRequiredContribution(
        10_000_000,
        5_000_000,
        0.07,
        120
      );
      expect(result).toBe(0);
    });

    it("should return 0 if growth alone exceeds target", () => {
      // $50k at 10% for 20 years → $50k × (1.00833)^240 ≈ $367k
      const result = calculateRequiredContribution(
        5_000_000,
        10_000_000,
        0.10,
        240
      );
      expect(result).toBe(0);
    });

    it("should handle zero return rate", () => {
      // Need $50k more in 50 months → $1,000/month
      const result = calculateRequiredContribution(
        0,
        5_000_000,
        0,
        50
      );
      expect(result).toBe(100_000); // $1,000
    });
  });

  // ============ Months to Target ============
  describe("calculateMonthsToTarget", () => {
    it("should calculate months needed", () => {
      // $10k → $100k with $500/month at 7%
      const result = calculateMonthsToTarget(1_000_000, 10_000_000, 50_000, 0.07);
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThan(100);
      expect(result!).toBeLessThan(180);
    });

    it("should return 0 if already at target", () => {
      const result = calculateMonthsToTarget(10_000_000, 5_000_000, 50_000, 0.07);
      expect(result).toBe(0);
    });

    it("should return null if unreachable (no contributions, no growth)", () => {
      const result = calculateMonthsToTarget(1_000_000, 10_000_000, 0, 0);
      expect(result).toBeNull();
    });

    it("should handle zero return with contributions", () => {
      // $0 → $12,000 at $1,000/month, 0% → 12 months
      const result = calculateMonthsToTarget(0, 1_200_000, 100_000, 0);
      expect(result).toBe(12);
    });
  });

  // ============ Projection Points ============
  describe("generateProjectionPoints", () => {
    it("should include starting point", () => {
      const points = generateProjectionPoints(1_000_000, 50_000, 0.07, 12);
      expect(points[0].value).toBe(1_000_000);
    });

    it("should have increasing values for positive returns", () => {
      const points = generateProjectionPoints(1_000_000, 50_000, 0.07, 12);
      for (let i = 1; i < points.length; i++) {
        expect(points[i].value).toBeGreaterThan(points[i - 1].value);
      }
    });

    it("should use yearly intervals for long projections", () => {
      const points = generateProjectionPoints(1_000_000, 0, 0.07, 120);
      // Should have ~10 yearly points + starting point
      expect(points.length).toBeLessThanOrEqual(12);
    });

    it("should use monthly intervals for short projections", () => {
      const points = generateProjectionPoints(1_000_000, 0, 0.07, 6);
      // Should have 6 monthly points + starting point
      expect(points.length).toBe(7);
    });
  });

  // ============ Retirement Projection ============
  describe("calculateRetirementProjection", () => {
    it("should project retirement balance", () => {
      const result = calculateRetirementProjection(
        30, // current age
        60, // retirement age
        10_000_000, // $100k super
        5_000_000, // $50k investments
        100_000, // $1k/month super contributions
        50_000, // $500/month investment contributions
        0.07, // 7% super return
        0.07, // 7% investment return
        60,
        500_000 // $5k/month target income
      );

      expect(result.currentAge).toBe(30);
      expect(result.retirementAge).toBe(60);
      expect(result.projectedBalance).toBeGreaterThan(result.currentBalance);
      expect(result.monthlyIncomeAtRetirement).toBeGreaterThan(0);
      expect(result.yearsOfIncome).toBeGreaterThan(0);
    });

    it("should apply 15% super earnings tax", () => {
      // Compare super-only growth with and without tax
      const withTax = calculateRetirementProjection(
        30, 60, 10_000_000, 0, 0, 0, 0.07, 0.07, 60, 500_000
      );

      // Super should grow less than investments due to 15% earnings tax
      const pureGrowth = calculateRetirementProjection(
        30, 60, 0, 10_000_000, 0, 0, 0.07, 0.07, 60, 500_000
      );

      expect(withTax.superBalance).toBeLessThan(pureGrowth.investmentBalance);
    });

    it("should identify when not on track", () => {
      const result = calculateRetirementProjection(
        50, // only 10 years to retirement
        60,
        5_000_000, // only $50k
        0,
        50_000, // small contributions
        0,
        0.07,
        0.07,
        60,
        1_000_000 // $10k/month target — ambitious
      );

      expect(result.isOnTrack).toBe(false);
      expect(result.requiredMonthlyContribution).toBeDefined();
      expect(result.requiredMonthlyContribution!).toBeGreaterThan(0);
    });

    it("should handle already retired (0 years to retirement)", () => {
      const result = calculateRetirementProjection(
        65, 60, 100_000_000, 0, 0, 0, 0.07, 0.07, 60, 500_000
      );
      // Already past retirement age
      expect(result.projectedBalance).toBe(result.currentBalance);
    });
  });

  // ============ Growth Rate (CAGR) ============
  describe("calculateGrowthRate", () => {
    it("should return 0 for single value", () => {
      const rate = calculateGrowthRate([
        { date: new Date("2024-01-01"), value: 100_000 },
      ]);
      expect(rate).toBe(0);
    });

    it("should calculate positive growth", () => {
      const rate = calculateGrowthRate([
        { date: new Date("2023-01-01"), value: 100_000 },
        { date: new Date("2024-01-01"), value: 110_000 },
      ]);
      // 10% growth in 12 months ≈ 10% annualized
      expect(rate).toBeCloseTo(0.1, 1);
    });

    it("should handle negative growth", () => {
      const rate = calculateGrowthRate([
        { date: new Date("2023-01-01"), value: 100_000 },
        { date: new Date("2024-01-01"), value: 90_000 },
      ]);
      expect(rate).toBeLessThan(0);
    });

    it("should return 0 for zero starting value", () => {
      const rate = calculateGrowthRate([
        { date: new Date("2023-01-01"), value: 0 },
        { date: new Date("2024-01-01"), value: 100_000 },
      ]);
      expect(rate).toBe(0);
    });
  });

  // ============ Progress Percentage ============
  describe("calculateProgressPercentage", () => {
    it("should calculate correct percentage", () => {
      expect(calculateProgressPercentage(50_000, 100_000)).toBe(50);
    });

    it("should handle exceeding target", () => {
      expect(calculateProgressPercentage(150_000, 100_000)).toBe(150);
    });

    it("should handle zero target", () => {
      expect(calculateProgressPercentage(100_000, 0)).toBe(100);
      expect(calculateProgressPercentage(0, 0)).toBe(0);
    });
  });

  // ============ Format Timeframe ============
  describe("formatTimeframe", () => {
    it("should format months only", () => {
      expect(formatTimeframe(5)).toBe("5 months");
      expect(formatTimeframe(1)).toBe("1 month");
    });

    it("should format years only", () => {
      expect(formatTimeframe(12)).toBe("1 year");
      expect(formatTimeframe(36)).toBe("3 years");
    });

    it("should format years and months", () => {
      expect(formatTimeframe(15)).toBe("1 year, 3 months");
      expect(formatTimeframe(25)).toBe("2 years, 1 month");
    });

    it("should handle null", () => {
      expect(formatTimeframe(null)).toBe("Unable to calculate");
    });

    it("should handle zero or negative", () => {
      expect(formatTimeframe(0)).toBe("Already reached");
      expect(formatTimeframe(-5)).toBe("Already reached");
    });
  });
});
