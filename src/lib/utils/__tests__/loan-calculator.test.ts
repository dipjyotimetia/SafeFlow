import { describe, expect, it } from "vitest";
import {
  calculateBalanceAfterMonths,
  calculateExtraPaymentImpact,
} from "../loan-calculator";

describe("loan-calculator", () => {
  describe("calculateBalanceAfterMonths", () => {
    it("handles 0% interest without NaN", () => {
      const balance = calculateBalanceAfterMonths(
        1200000, // $12,000
        0,
        12,
        6,
        0
      );

      // 6 months into a 12-month 0% loan => half remaining
      expect(balance).toBe(600000);
    });
  });

  describe("calculateExtraPaymentImpact", () => {
    it("handles 0% interest extra payments", () => {
      const result = calculateExtraPaymentImpact(1200000, 0, 12, 100000);
      expect(result.newTotalInterest).toBe(0);
      expect(result.monthsSaved).toBeGreaterThan(0);
    });
  });
});
