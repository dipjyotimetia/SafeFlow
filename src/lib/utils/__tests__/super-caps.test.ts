import { describe, expect, it } from "vitest";
import {
  calculateBringForwardCap,
  calculateCarryForwardConcessional,
  getSuperCapConfig,
} from "../super-caps";

describe("super-caps", () => {
  it("returns FY-aware caps", () => {
    const fy2024 = getSuperCapConfig("2024-25");
    const fy2025 = getSuperCapConfig("2025-26");

    expect(fy2024.concessionalCap).toBe(3000000);
    expect(fy2025.nonConcessionalCap).toBe(12000000);
    expect(fy2025.superGuaranteeRate).toBe(12);
  });

  it("calculates carry-forward concessional availability", () => {
    const result = calculateCarryForwardConcessional({
      financialYear: "2025-26",
      concessionalContributionsByFY: {
        "2024-25": 1000000, // $10,000 used from $30,000 cap
        "2023-24": 2750000, // full cap used
      },
      totalSuperBalancePreviousJune30: 30000000, // $300,000
    });

    expect(result.eligible).toBe(true);
    expect(result.unusedByYear["2024-25"]).toBe(2000000);
    expect(result.available).toBeGreaterThanOrEqual(2000000);
  });

  it("disables carry-forward when balance is >= $500k", () => {
    const result = calculateCarryForwardConcessional({
      financialYear: "2025-26",
      concessionalContributionsByFY: {},
      totalSuperBalancePreviousJune30: 50000000,
    });

    expect(result.eligible).toBe(false);
    expect(result.available).toBe(0);
  });

  it("calculates bring-forward years from total super balance", () => {
    const threeYears = calculateBringForwardCap({
      financialYear: "2025-26",
      totalSuperBalancePreviousJune30: 150000000, // $1.5m
    });
    expect(threeYears.yearsAvailable).toBe(3);
    expect(threeYears.availableCap).toBe(36000000);

    const twoYears = calculateBringForwardCap({
      financialYear: "2025-26",
      totalSuperBalancePreviousJune30: 180000000, // $1.8m
    });
    expect(twoYears.yearsAvailable).toBe(2);
    expect(twoYears.availableCap).toBe(24000000);

    const oneYear = calculateBringForwardCap({
      financialYear: "2025-26",
      totalSuperBalancePreviousJune30: 190000000, // $1.9m
    });
    expect(oneYear.yearsAvailable).toBe(1);
    expect(oneYear.availableCap).toBe(12000000);
  });
});

