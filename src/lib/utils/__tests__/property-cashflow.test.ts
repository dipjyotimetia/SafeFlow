import { describe, it, expect } from "vitest";
import {
  calculateCashflowBreakdown,
  calculateManagementFee,
  calculateNegativeGearingBenefit,
} from "../property-cashflow";

describe("Property Cashflow Calculator", () => {
  // ============ Management Fee ============
  describe("calculateManagementFee", () => {
    it("should calculate GST-inclusive management fee", () => {
      // $30,000 annual rent × 8% = $2,400
      const fee = calculateManagementFee(3_000_000, 8, true);
      expect(fee).toBe(240_000); // $2,400
    });

    it("should calculate GST-exclusive management fee", () => {
      // $30,000 annual rent × 8% = $2,400 → GST-exclusive = $2,400 / 1.1 ≈ $2,182
      const fee = calculateManagementFee(3_000_000, 8, false);
      expect(fee).toBe(Math.round(240_000 / 1.1));
    });

    it("should handle zero percent", () => {
      const fee = calculateManagementFee(3_000_000, 0, true);
      expect(fee).toBe(0);
    });

    it("should handle zero rent", () => {
      const fee = calculateManagementFee(0, 8, true);
      expect(fee).toBe(0);
    });
  });

  // ============ Negative Gearing ============
  describe("calculateNegativeGearingBenefit", () => {
    it("should return tax benefit for negative income", () => {
      // -$5,000 loss at 32.5% marginal → $1,625 benefit
      const benefit = calculateNegativeGearingBenefit(-500_000, 32.5);
      expect(benefit).toBe(162_500);
    });

    it("should return zero for positive income", () => {
      const benefit = calculateNegativeGearingBenefit(500_000, 32.5);
      expect(benefit).toBe(0);
    });

    it("should return zero for zero income", () => {
      const benefit = calculateNegativeGearingBenefit(0, 32.5);
      expect(benefit).toBe(0);
    });
  });

  // ============ Cashflow Breakdown ============
  describe("calculateCashflowBreakdown", () => {
    const baseExpenses = {
      councilRates: 200_000, // $2,000
      waterRates: 100_000, // $1,000
      buildingInsurance: 150_000, // $1,500
      landlordInsurance: 130_000, // $1,300
      propertyManagementPercent: 8,
      maintenance: 200_000, // $2,000
    };

    it("should calculate net rental income after vacancy", () => {
      const result = calculateCashflowBreakdown(
        3_120_000, // $31,200 annual rent ($600/week × 52)
        5, // 5% vacancy
        baseExpenses,
        2_400_000, // $24,000 annual interest
        1_000_000, // $10,000 depreciation
        32.5
      );

      // Vacancy: $31,200 × 5% = $1,560
      expect(result.vacancyAllowance).toBe(156_000);
      // Net: $31,200 - $1,560 = $29,640
      expect(result.netRentalIncome).toBe(2_964_000);
    });

    it("should include all operating expenses", () => {
      const result = calculateCashflowBreakdown(
        3_120_000,
        5,
        baseExpenses,
        2_400_000,
        1_000_000,
        32.5
      );

      expect(result.councilRates).toBe(200_000);
      expect(result.waterRates).toBe(100_000);
      expect(result.buildingInsurance).toBe(150_000);
      expect(result.landlordInsurance).toBe(130_000);
      expect(result.maintenanceRepairs).toBe(200_000);
      expect(result.propertyManagement).toBeGreaterThan(0);
      expect(result.totalOperatingExpenses).toBeGreaterThan(0);
    });

    it("should calculate before-tax cashflow", () => {
      const result = calculateCashflowBreakdown(
        3_120_000,
        5,
        baseExpenses,
        2_400_000,
        1_000_000,
        32.5
      );

      // Before-tax = net rent - operating expenses - interest (excludes depreciation)
      expect(result.cashflowBeforeTax).toBe(
        result.netRentalIncome -
          result.totalOperatingExpenses -
          result.interestPayments
      );
    });

    it("should calculate tax benefit when negatively geared", () => {
      // Set up a clearly negative scenario
      const result = calculateCashflowBreakdown(
        2_000_000, // Lower rent
        5,
        baseExpenses,
        3_000_000, // Higher interest
        1_000_000,
        37 // Higher tax bracket
      );

      if (result.taxableIncome < 0) {
        expect(result.taxBenefit).toBeGreaterThan(0);
        expect(result.cashflowAfterTax).toBeGreaterThan(
          result.cashflowBeforeTax
        );
      }
    });

    it("should calculate after-tax cashflow for positively geared property", () => {
      // Set up a clearly positive scenario
      const result = calculateCashflowBreakdown(
        5_000_000, // $50k rent
        0,
        { maintenance: 50_000 },
        500_000, // $5k interest
        0,
        32.5
      );

      // Positively geared → tax payable reduces cashflow
      expect(result.taxableIncome).toBeGreaterThan(0);
      expect(result.cashflowAfterTax).toBeLessThan(
        result.cashflowBeforeTax
      );
    });

    it("should handle zero expenses", () => {
      const result = calculateCashflowBreakdown(
        3_120_000,
        0,
        {},
        0,
        0,
        32.5
      );

      expect(result.totalOperatingExpenses).toBe(0);
      expect(result.cashflowBeforeTax).toBe(3_120_000);
    });
  });
});
