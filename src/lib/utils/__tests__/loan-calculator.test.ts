import { describe, it, expect } from "vitest";
import {
  calculateInterestOnlyRepayment,
  calculatePrincipalInterestRepayment,
  calculateRepayment,
  calculateTotalInterest,
  generateAmortizationSchedule,
  calculateBalanceAfterMonths,
  calculateExtraPaymentImpact,
  calculateEffectiveRateWithOffset,
  getMonthlyRate,
} from "../loan-calculator";

describe("Loan Calculator", () => {
  // ============ Monthly Rate ============
  describe("getMonthlyRate", () => {
    it("should convert annual rate to monthly", () => {
      const rate = getMonthlyRate(6.0);
      expect(rate.toNumber()).toBeCloseTo(0.005, 6);
    });

    it("should handle zero rate", () => {
      const rate = getMonthlyRate(0);
      expect(rate.toNumber()).toBe(0);
    });
  });

  // ============ Interest Only ============
  describe("calculateInterestOnlyRepayment", () => {
    it("should calculate monthly IO repayment", () => {
      // $500,000 loan at 6% → $500,000 × 0.06 / 12 = $2,500
      const result = calculateInterestOnlyRepayment(
        50_000_000, // $500k
        6.0,
        "monthly"
      );
      expect(result).toBe(250_000); // $2,500
    });

    it("should calculate weekly IO repayment", () => {
      // $500,000 × 6% / 52 weeks = ~$576.92
      const result = calculateInterestOnlyRepayment(50_000_000, 6.0, "weekly");
      expect(result).toBeCloseTo(57_692, -1);
    });

    it("should calculate quarterly IO repayment", () => {
      // $500,000 × 6% / 4 = $7,500
      const result = calculateInterestOnlyRepayment(50_000_000, 6.0, "quarterly");
      expect(result).toBe(750_000); // $7,500
    });

    it("should handle zero rate", () => {
      const result = calculateInterestOnlyRepayment(50_000_000, 0, "monthly");
      expect(result).toBe(0);
    });
  });

  // ============ Principal + Interest ============
  describe("calculatePrincipalInterestRepayment", () => {
    it("should calculate standard P+I monthly repayment", () => {
      // $500,000 at 6% over 30 years (360 months)
      const result = calculatePrincipalInterestRepayment(
        50_000_000,
        6.0,
        360,
        "monthly"
      );
      // Expected ~$2,997.75 = 299,775 cents
      expect(result).toBeCloseTo(299_775, -2);
    });

    it("should handle zero interest rate", () => {
      // $300,000 over 30 years with 0% → $300k / 360 = $833.33
      const result = calculatePrincipalInterestRepayment(
        30_000_000,
        0,
        360,
        "monthly"
      );
      expect(result).toBeCloseTo(83_333, -1);
    });

    it("should calculate weekly P+I repayment", () => {
      const monthly = calculatePrincipalInterestRepayment(
        50_000_000,
        6.0,
        360,
        "monthly"
      );
      const weekly = calculatePrincipalInterestRepayment(
        50_000_000,
        6.0,
        360,
        "weekly"
      );
      // Weekly × 52/12 should approximately equal monthly
      expect(Math.round((weekly * 52) / 12)).toBeCloseTo(monthly, -2);
    });
  });

  // ============ Combined Repayment ============
  describe("calculateRepayment", () => {
    it("should return IO result for interest-only type", () => {
      const result = calculateRepayment(
        50_000_000,
        6.0,
        360,
        "interest-only",
        "monthly"
      );
      expect(result.principalPortion).toBe(0);
      expect(result.interestPortion).toBe(result.repaymentAmount);
    });

    it("should return P+I result for P+I type", () => {
      const result = calculateRepayment(
        50_000_000,
        6.0,
        360,
        "principal-interest",
        "monthly"
      );
      expect(result.principalPortion).toBeGreaterThan(0);
      expect(result.interestPortion).toBeGreaterThan(0);
      expect(result.principalPortion + result.interestPortion).toBe(
        result.repaymentAmount
      );
    });
  });

  // ============ Total Interest ============
  describe("calculateTotalInterest", () => {
    it("should calculate total interest over loan life", () => {
      // $500k at 6% over 30 years
      const total = calculateTotalInterest(50_000_000, 6.0, 360);
      // Monthly ~$3,000 × 360 - $500k = ~$580k interest
      expect(total).toBeGreaterThan(50_000_000);
      expect(total).toBeLessThan(70_000_000);
    });

    it("should calculate total interest with IO period", () => {
      const withIO = calculateTotalInterest(50_000_000, 6.0, 360, 60);
      const withoutIO = calculateTotalInterest(50_000_000, 6.0, 360, 0);
      // IO period results in more total interest
      expect(withIO).toBeGreaterThan(withoutIO);
    });
  });

  // ============ Amortization Schedule ============
  describe("generateAmortizationSchedule", () => {
    it("should generate correct number of entries", () => {
      const schedule = generateAmortizationSchedule(50_000_000, 6.0, 360);
      expect(schedule.length).toBe(360);
    });

    it("should have zero principal for IO period entries", () => {
      const schedule = generateAmortizationSchedule(50_000_000, 6.0, 360, 60);
      // First 60 entries should be IO (zero principal)
      for (let i = 0; i < 60; i++) {
        expect(schedule[i].principal).toBe(0);
      }
      // Entry 61 should have principal > 0
      expect(schedule[60].principal).toBeGreaterThan(0);
    });

    it("should end with approximately zero balance", () => {
      const schedule = generateAmortizationSchedule(30_000_000, 5.5, 360);
      const lastEntry = schedule[schedule.length - 1];
      // Balance should be near zero (may have small rounding residual)
      expect(lastEntry.balance).toBeLessThan(100); // Less than $1
    });

    it("should have decreasing balance over time", () => {
      const schedule = generateAmortizationSchedule(30_000_000, 5.5, 360);
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].balance).toBeLessThanOrEqual(schedule[i - 1].balance);
      }
    });
  });

  // ============ Balance After Months ============
  describe("calculateBalanceAfterMonths", () => {
    it("should return original amount during IO period", () => {
      const balance = calculateBalanceAfterMonths(
        50_000_000,
        6.0,
        360,
        30,
        60
      );
      expect(balance).toBe(50_000_000);
    });

    it("should decrease after IO period", () => {
      const balance = calculateBalanceAfterMonths(50_000_000, 6.0, 360, 120, 0);
      expect(balance).toBeLessThan(50_000_000);
      expect(balance).toBeGreaterThan(0);
    });

    it("should be zero at end of loan", () => {
      const balance = calculateBalanceAfterMonths(50_000_000, 6.0, 360, 360, 0);
      expect(balance).toBeLessThan(200); // Small rounding
    });
  });

  // ============ Extra Payment Impact ============
  describe("calculateExtraPaymentImpact", () => {
    it("should show interest savings with extra payments", () => {
      const impact = calculateExtraPaymentImpact(
        50_000_000,
        6.0,
        360,
        50_000 // $500/month extra
      );
      expect(impact.interestSaved).toBeGreaterThan(0);
      expect(impact.monthsSaved).toBeGreaterThan(0);
    });

    it("should handle zero extra payment", () => {
      const impact = calculateExtraPaymentImpact(50_000_000, 6.0, 360, 0);
      expect(impact.interestSaved).toBe(0);
      expect(impact.monthsSaved).toBe(0);
    });
  });

  // ============ Offset Account ============
  describe("calculateEffectiveRateWithOffset", () => {
    it("should reduce effective balance", () => {
      const result = calculateEffectiveRateWithOffset(
        50_000_000,
        10_000_000,
        6.0
      );
      expect(result.effectiveBalance).toBe(40_000_000);
    });

    it("should calculate monthly savings", () => {
      const result = calculateEffectiveRateWithOffset(
        50_000_000,
        10_000_000,
        6.0
      );
      expect(result.monthlySavings).toBeGreaterThan(0);
      // $100k offset × 6% / 12 = $500/month savings
      expect(result.monthlySavings).toBeCloseTo(50_000, -2);
    });

    it("should cap at zero effective balance", () => {
      const result = calculateEffectiveRateWithOffset(
        50_000_000,
        60_000_000, // More offset than loan
        6.0
      );
      expect(result.effectiveBalance).toBe(0);
    });
  });
});
