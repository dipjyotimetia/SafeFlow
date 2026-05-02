import { describe, expect, it } from "vitest";
import { calculateCGT } from "../cgt-calculator";
import type { CGTInputs } from "../cgt-calculator";

const baseInputs: CGTInputs = {
  salePrice: 80_000_000, // $800,000
  saleDate: new Date("2024-12-01"),
  purchasePrice: 50_000_000, // $500,000
  purchaseDate: new Date("2018-06-01"),
  stampDuty: 2_000_000, // $20,000
  legalFeesOnPurchase: 200_000, // $2,000
  otherPurchaseCosts: 0,
  capitalImprovements: 5_000_000, // $50,000
  agentCommission: 1_600_000, // $16,000
  advertisingCosts: 100_000, // $1,000
  legalFeesOnSale: 200_000, // $2,000
  otherSellingCosts: 0,
  division40Depreciation: 0,
  division43Depreciation: 0,
  marginalTaxRate: 37,
  isMainResidence: false,
};

describe("calculateCGT", () => {
  describe("Division 43 capital-works depreciation", () => {
    it("reduces cost base by Div 43 amount claimed (ITAA97 s110-45(2))", () => {
      const without = calculateCGT(baseInputs);
      const withDiv43 = calculateCGT({
        ...baseInputs,
        division43Depreciation: 3_000_000, // $30,000 claimed
      });

      // Cost base is reduced by exactly the Div 43 claim amount.
      expect(without.costBase - withDiv43.costBase).toBe(3_000_000);

      // Gross capital gain rises by the same amount.
      expect(withDiv43.grossCapitalGain - without.grossCapitalGain).toBe(
        3_000_000,
      );
    });

    it("surfaces the reduction in the breakdown", () => {
      const result = calculateCGT({
        ...baseInputs,
        division43Depreciation: 3_000_000,
      });
      expect(result.breakdown.div43CostBaseReduction).toBe(3_000_000);
    });

    it("treats Div 40 (plant) and Div 43 (capital works) independently", () => {
      const result = calculateCGT({
        ...baseInputs,
        division40Depreciation: 1_000_000, // added back to gain
        division43Depreciation: 2_000_000, // subtracted from cost base
      });

      // Both flow through the gain by the same magnitude, but via different
      // mechanisms — the breakdown should report both.
      expect(result.breakdown.div40Recapture).toBe(1_000_000);
      expect(result.breakdown.div43CostBaseReduction).toBe(2_000_000);

      // Adjusted gain = gross + Div40. Net effect on adjusted gain vs. a
      // baseline with neither claim is +Div40 + Div43 (because Div43 reduces
      // cost base, raising gross).
      const baseline = calculateCGT(baseInputs);
      expect(
        result.adjustedCapitalGain - baseline.adjustedCapitalGain,
      ).toBe(3_000_000);
    });
  });
});
