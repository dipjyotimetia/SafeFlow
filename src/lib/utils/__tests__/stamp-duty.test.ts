import { describe, it, expect } from "vitest";
import {
  calculateStampDuty,
  calculateStampDutyWithOptions,
  estimateStampDuty,
  getStampDutyBreakdown,
  checkFHBEligibility,
  checkVICOffPlanEligibility,
} from "../stamp-duty";

describe("Stamp Duty Calculator", () => {
  // ============ NSW ============
  describe("NSW", () => {
    it("should calculate stamp duty for a $500,000 property", () => {
      // $500,000 = 50_000_000 cents
      const result = calculateStampDuty(50_000_000, "NSW", false, true);
      // $500k falls in 351k-1.168M bracket: base $10,530 + ($500k - $351k) × 4.5%
      // = $10,530 + $149,000 × 0.045 = $10,530 + $6,705 = $17,235
      expect(result.stampDuty).toBe(1_723_500);
      expect(result.isFirstHomeBuyerExempt).toBe(false);
    });

    it("should give full FHB exemption for $700,000 property", () => {
      // NSW FHB full exemption below $800,000
      const result = calculateStampDuty(70_000_000, "NSW", true, false);
      expect(result.stampDuty).toBe(0);
      expect(result.isFirstHomeBuyerExempt).toBe(true);
    });

    it("should give partial FHB concession for $900,000 property", () => {
      // NSW partial: $800k-$1M sliding scale
      const result = calculateStampDuty(90_000_000, "NSW", true, false);
      expect(result.stampDuty).toBeGreaterThan(0);
      expect(result.concessionApplied).toBeGreaterThan(0);
    });

    it("should not give FHB concession for investment property", () => {
      const result = calculateStampDuty(60_000_000, "NSW", true, true);
      // Even with isFirstHomeBuyer=true, investments don't get concession
      expect(result.concessionApplied).toBe(0);
    });
  });

  // ============ VIC ============
  describe("VIC", () => {
    it("should calculate stamp duty for a $600,000 property", () => {
      const result = calculateStampDuty(60_000_000, "VIC", false, true);
      // $600k in 130k-960k bracket: base $2,870 + ($600k - $130k) × 6%
      // = $2,870 + $470k × 0.06 = $2,870 + $28,200 = $31,070
      expect(result.stampDuty).toBe(3_107_000);
    });

    it("should give full FHB exemption below $600,000", () => {
      const result = calculateStampDuty(50_000_000, "VIC", true, false);
      expect(result.stampDuty).toBe(0);
      expect(result.isFirstHomeBuyerExempt).toBe(true);
    });

    it("should calculate VIC off-the-plan concession", () => {
      const result = calculateStampDutyWithOptions(80_000_000, "VIC", {
        isOffPlan: true,
        constructionValuePercent: 40,
        isInvestment: true,
      });
      // Off-plan reduces dutiable value by 40%
      // Dutiable value = 800k × 0.6 = 480k
      // This should produce less duty than standard
      const standard = calculateStampDuty(80_000_000, "VIC", false, true);
      expect(result.stampDuty).toBeLessThan(standard.stampDuty);
    });

    it("should report VIC off-plan eligibility", () => {
      const elig = checkVICOffPlanEligibility(80_000_000, 40);
      expect(elig.eligible).toBe(true);
      expect(elig.estimatedSavings).toBeGreaterThan(0);
    });
  });

  // ============ QLD ============
  describe("QLD", () => {
    it("should calculate stamp duty for a $400,000 property", () => {
      const result = calculateStampDuty(40_000_000, "QLD", false, true);
      // $400k in 75k-540k bracket: base $1,050 + ($400k - $75k) × 3.5%
      // = $1,050 + $325k × 0.035 = $1,050 + $11,375 = $12,425
      expect(result.stampDuty).toBe(1_242_500);
    });

    it("should give full FHB exemption for new home with no value cap", () => {
      // QLD May 2025: no value cap for new homes
      const result = calculateStampDutyWithOptions(150_000_000, "QLD", {
        isFirstHomeBuyer: true,
        isNewHome: true,
        isInvestment: false,
      });
      expect(result.stampDuty).toBe(0);
      expect(result.isFirstHomeBuyerExempt).toBe(true);
    });

    it("should give full FHB exemption for vacant land with no value cap", () => {
      const result = calculateStampDutyWithOptions(80_000_000, "QLD", {
        isFirstHomeBuyer: true,
        isVacantLand: true,
        isInvestment: false,
      });
      expect(result.stampDuty).toBe(0);
      expect(result.isFirstHomeBuyerExempt).toBe(true);
    });

    it("should give standard FHB concession for established homes", () => {
      // QLD established: $700k full exemption threshold
      const result = calculateStampDutyWithOptions(60_000_000, "QLD", {
        isFirstHomeBuyer: true,
        isInvestment: false,
      });
      expect(result.stampDuty).toBe(0);
      expect(result.isFirstHomeBuyerExempt).toBe(true);
    });

    it("should report QLD FHB eligibility for new homes", () => {
      const elig = checkFHBEligibility(200_000_000, "QLD", {
        isNewHome: true,
      });
      expect(elig.eligible).toBe(true);
      expect(elig.fullExemption).toBe(true);
      expect(elig.note).toContain("no value cap");
    });
  });

  // ============ SA ============
  describe("SA", () => {
    it("should calculate stamp duty for a $300,000 property", () => {
      const result = calculateStampDuty(30_000_000, "SA", false, true);
      expect(result.stampDuty).toBeGreaterThan(0);
    });
  });

  // ============ WA ============
  describe("WA", () => {
    it("should calculate stamp duty for a $450,000 property", () => {
      const result = calculateStampDuty(45_000_000, "WA", false, true);
      expect(result.stampDuty).toBeGreaterThan(0);
    });
  });

  // ============ TAS ============
  describe("TAS", () => {
    it("should calculate stamp duty for a $200,000 property", () => {
      const result = calculateStampDuty(20_000_000, "TAS", false, true);
      expect(result.stampDuty).toBeGreaterThan(0);
    });
  });

  // ============ NT ============
  describe("NT", () => {
    it("should use formula-based calculation for property under $525k", () => {
      const result = calculateStampDuty(50_000_000, "NT", false, true);
      // NT formula: D = (0.06571441 × V²) + 15V where V = value/1000
      // V = 500, D = 0.06571441 × 250000 + 7500 = ~$23,929
      expect(result.stampDuty).toBeGreaterThan(2_300_000);
      expect(result.stampDuty).toBeLessThan(2_500_000);
    });

    it("should use flat rate for property over $525k", () => {
      const result = calculateStampDuty(100_000_000, "NT", false, true);
      // $1M × 4.95% = $49,500
      expect(result.stampDuty).toBe(4_950_000);
    });
  });

  // ============ ACT ============
  describe("ACT", () => {
    it("should calculate stamp duty for a $500,000 property", () => {
      const result = calculateStampDuty(50_000_000, "ACT", false, true);
      expect(result.stampDuty).toBeGreaterThan(0);
    });
  });

  // ============ Common ============
  describe("Common features", () => {
    it("should include transfer fee and mortgage registration", () => {
      const result = calculateStampDuty(50_000_000, "NSW", false, true);
      expect(result.transferFee).toBeGreaterThan(0);
      expect(result.mortgageRegistration).toBeGreaterThan(0);
    });

    it("should calculate correct total government charges", () => {
      const result = calculateStampDuty(50_000_000, "NSW", false, true);
      expect(result.totalGovernmentCharges).toBe(
        result.stampDuty + result.transferFee + result.mortgageRegistration
      );
    });

    it("should return a stamp duty breakdown", () => {
      const breakdown = getStampDutyBreakdown(50_000_000, "NSW", false);
      expect(breakdown.length).toBeGreaterThanOrEqual(3);
      expect(breakdown.find((d) => d.label === "Stamp Duty")).toBeTruthy();
      expect(breakdown.find((d) => d.label === "Transfer Fee")).toBeTruthy();
    });

    it("should handle a zero-value property", () => {
      const result = calculateStampDuty(0, "NSW", false, true);
      expect(result.stampDuty).toBe(0);
    });

    it("estimateStampDuty should match full calculation", () => {
      const estimate = estimateStampDuty(50_000_000, "VIC");
      const full = calculateStampDuty(50_000_000, "VIC", false, true);
      expect(estimate).toBe(full.stampDuty);
    });
  });
});
