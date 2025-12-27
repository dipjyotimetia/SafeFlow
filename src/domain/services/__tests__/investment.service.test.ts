import { describe, it, expect } from "vitest";
import {
  calculatePortfolioSummary,
  calculateAllocation,
  calculateProportionalCostBasis,
  calculateAverageCostPerUnit,
  calculateHoldingAfterTransaction,
  daysBetween,
  monthsBetween,
  isEligibleForCGTDiscount,
  calculateCapitalGain,
  formatHoldingPeriod,
  getFrankingMultiplier,
  calculateFrankingCredit,
  calculateGrossedUpDividend,
  calculateFrankingDetails,
  calculateDividendSummary,
  validateSellTransaction,
  isTradeableHoldingType,
} from "../investment.service";
import type { Holding, InvestmentTransaction } from "@/types";

// Helper to create mock holdings
function createHolding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: "h-1",
    accountId: "acc-1",
    symbol: "VAS",
    name: "Vanguard Australian Shares",
    type: "etf",
    units: 100,
    costBasis: 10000, // $100
    currentPrice: 110, // $1.10 per unit
    currentValue: 11000, // $110
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("InvestmentService", () => {
  describe("Portfolio Calculations", () => {
    describe("calculatePortfolioSummary", () => {
      it("calculates portfolio summary", () => {
        const holdings = [
          createHolding({ costBasis: 10000, currentValue: 12000 }),
          createHolding({ costBasis: 5000, currentValue: 4500 }),
        ];

        const summary = calculatePortfolioSummary(holdings);

        expect(summary.totalCostBasis.cents).toBe(15000);
        expect(summary.totalCurrentValue.cents).toBe(16500);
        expect(summary.unrealizedGain.cents).toBe(1500);
        expect(summary.unrealizedGainPercent).toBe(10); // 1500/15000 = 10%
        expect(summary.holdingCount).toBe(2);
        expect(summary.holdingsWithPricing).toBe(2);
      });

      it("handles holdings without pricing", () => {
        const holdings = [
          createHolding({ costBasis: 10000, currentValue: undefined }),
        ];

        const summary = calculatePortfolioSummary(holdings);

        expect(summary.totalCostBasis.cents).toBe(10000);
        expect(summary.totalCurrentValue.cents).toBe(0);
        expect(summary.holdingsWithPricing).toBe(0);
      });

      it("handles empty holdings", () => {
        const summary = calculatePortfolioSummary([]);

        expect(summary.totalCostBasis.cents).toBe(0);
        expect(summary.holdingCount).toBe(0);
      });
    });

    describe("calculateAllocation", () => {
      it("calculates allocation by type", () => {
        const holdings = [
          createHolding({ type: "etf", currentValue: 6000 }),
          createHolding({ type: "stock", currentValue: 3000 }),
          createHolding({ type: "etf", currentValue: 1000 }),
        ];

        const allocation = calculateAllocation(holdings);

        expect(allocation).toHaveLength(2);
        expect(allocation[0].type).toBe("etf"); // Sorted by value
        expect(allocation[0].value.cents).toBe(7000);
        expect(allocation[0].percentage).toBe(70);
        expect(allocation[1].type).toBe("stock");
        expect(allocation[1].percentage).toBe(30);
      });
    });
  });

  describe("Cost Basis Calculations", () => {
    describe("calculateProportionalCostBasis", () => {
      it("calculates proportional cost for partial sale", () => {
        // Sell 50 of 100 units, cost basis $1000
        const result = calculateProportionalCostBasis(50, 100, 100000);
        expect(result).toBe(50000);
      });

      it("returns zero for zero units", () => {
        expect(calculateProportionalCostBasis(50, 0, 100000)).toBe(0);
      });

      it("rounds to nearest cent", () => {
        // 33 of 100 units, cost $1000 = $330
        const result = calculateProportionalCostBasis(33, 100, 100000);
        expect(result).toBe(33000);
      });
    });

    describe("calculateAverageCostPerUnit", () => {
      it("calculates average cost", () => {
        expect(calculateAverageCostPerUnit(100000, 100)).toBe(1000); // $10 per unit
      });

      it("returns zero for zero units", () => {
        expect(calculateAverageCostPerUnit(100000, 0)).toBe(0);
      });
    });

    describe("calculateHoldingAfterTransaction", () => {
      it("updates holding after buy", () => {
        const holding = { units: 100, costBasis: 100000, currentPrice: 1100 };
        const transaction = { type: "buy" as const, units: 50, totalAmount: 55000 };

        const result = calculateHoldingAfterTransaction(holding, transaction);

        expect(result.units).toBe(150);
        expect(result.costBasis).toBe(155000);
        expect(result.currentValue).toBe(165000); // 150 * 1100
      });

      it("updates holding after sell", () => {
        const holding = { units: 100, costBasis: 100000, currentPrice: 1100 };
        const transaction = { type: "sell" as const, units: 50, totalAmount: 55000 };

        const result = calculateHoldingAfterTransaction(holding, transaction);

        expect(result.units).toBe(50);
        expect(result.costBasis).toBe(50000); // Proportional reduction
      });

      it("prevents negative values", () => {
        const holding = { units: 10, costBasis: 10000, currentPrice: 1000 };
        const transaction = { type: "sell" as const, units: 20, totalAmount: 20000 };

        const result = calculateHoldingAfterTransaction(holding, transaction);

        expect(result.units).toBe(0);
        expect(result.costBasis).toBe(0);
      });
    });
  });

  describe("CGT Calculations", () => {
    describe("daysBetween", () => {
      it("calculates days between dates", () => {
        const start = new Date("2024-01-01");
        const end = new Date("2024-01-31");
        expect(daysBetween(start, end)).toBe(30);
      });

      it("returns 0 for same day", () => {
        const date = new Date("2024-01-01");
        expect(daysBetween(date, date)).toBe(0);
      });
    });

    describe("monthsBetween", () => {
      it("calculates months between dates", () => {
        const start = new Date("2024-01-15");
        const end = new Date("2024-06-20");
        expect(monthsBetween(start, end)).toBe(5);
      });

      it("handles incomplete months", () => {
        const start = new Date("2024-01-20");
        const end = new Date("2024-02-15");
        expect(monthsBetween(start, end)).toBe(0); // Less than 1 full month
      });
    });

    describe("isEligibleForCGTDiscount", () => {
      it("returns true for 12+ months", () => {
        const purchase = new Date("2023-01-01");
        const sale = new Date("2024-02-01");
        expect(isEligibleForCGTDiscount(purchase, sale)).toBe(true);
      });

      it("returns false for less than 12 months", () => {
        const purchase = new Date("2024-01-01");
        const sale = new Date("2024-11-01");
        expect(isEligibleForCGTDiscount(purchase, sale)).toBe(false);
      });
    });

    describe("calculateCapitalGain", () => {
      it("calculates gain with discount", () => {
        const result = calculateCapitalGain({
          saleProceeds: 150000,
          costBasis: 100000,
          purchaseDate: new Date("2022-01-01"),
          saleDate: new Date("2024-01-01"),
        });

        expect(result.grossCapitalGain.cents).toBe(50000);
        expect(result.isEligibleForDiscount).toBe(true);
        expect(result.discountPercent).toBe(50);
        expect(result.netCapitalGain.cents).toBe(25000);
        expect(result.isCapitalLoss).toBe(false);
      });

      it("calculates gain without discount (short hold)", () => {
        const result = calculateCapitalGain({
          saleProceeds: 150000,
          costBasis: 100000,
          purchaseDate: new Date("2024-01-01"),
          saleDate: new Date("2024-06-01"),
        });

        expect(result.isEligibleForDiscount).toBe(false);
        expect(result.discountPercent).toBe(0);
        expect(result.netCapitalGain.cents).toBe(50000);
      });

      it("calculates capital loss (no discount)", () => {
        const result = calculateCapitalGain({
          saleProceeds: 80000,
          costBasis: 100000,
          purchaseDate: new Date("2022-01-01"),
          saleDate: new Date("2024-01-01"),
        });

        expect(result.grossCapitalGain.cents).toBe(-20000);
        expect(result.isCapitalLoss).toBe(true);
        expect(result.discountAmount.cents).toBe(0); // No discount on losses
      });

      it("includes fees in calculation", () => {
        const result = calculateCapitalGain({
          saleProceeds: 100000,
          fees: 1000,
          costBasis: 90000,
          purchaseDate: new Date("2022-01-01"),
          saleDate: new Date("2024-01-01"),
        });

        expect(result.saleProceeds.cents).toBe(99000); // After fees
        expect(result.grossCapitalGain.cents).toBe(9000);
      });
    });

    describe("formatHoldingPeriod", () => {
      it("formats days", () => {
        expect(formatHoldingPeriod(15)).toBe("15 days");
        expect(formatHoldingPeriod(1)).toBe("1 day");
      });

      it("formats months", () => {
        expect(formatHoldingPeriod(60)).toBe("2 months");
        expect(formatHoldingPeriod(30)).toBe("1 month");
      });

      it("formats years and months", () => {
        expect(formatHoldingPeriod(450)).toBe("1 year, 3 months");
        expect(formatHoldingPeriod(365)).toBe("1 year");
      });
    });
  });

  describe("Franking Credits", () => {
    describe("getFrankingMultiplier", () => {
      it("returns correct multiplier for 30% rate", () => {
        const multiplier = getFrankingMultiplier(30);
        expect(multiplier).toBeCloseTo(0.4286, 3);
      });

      it("returns correct multiplier for 25% rate", () => {
        const multiplier = getFrankingMultiplier(25);
        expect(multiplier).toBeCloseTo(0.3333, 3);
      });
    });

    describe("calculateFrankingCredit", () => {
      it("calculates fully franked dividend credit", () => {
        // $100 dividend, 100% franked at 30%
        const credit = calculateFrankingCredit(10000, 100, 30);
        expect(credit).toBe(4286);
      });

      it("calculates partially franked dividend credit", () => {
        // $100 dividend, 50% franked at 30%
        const credit = calculateFrankingCredit(10000, 50, 30);
        expect(credit).toBe(2143);
      });

      it("returns zero for unfranked", () => {
        expect(calculateFrankingCredit(10000, 0, 30)).toBe(0);
      });

      it("returns zero for negative dividend", () => {
        expect(calculateFrankingCredit(-10000, 100, 30)).toBe(0);
      });
    });

    describe("calculateGrossedUpDividend", () => {
      it("adds credit to cash dividend", () => {
        const grossedUp = calculateGrossedUpDividend(10000, 4286);
        expect(grossedUp).toBe(14286);
      });
    });

    describe("calculateFrankingDetails", () => {
      it("calculates all franking details", () => {
        const details = calculateFrankingDetails(10000, 100, 30);

        expect(details.cashDividend.cents).toBe(10000);
        expect(details.frankingCredit.cents).toBe(4286);
        expect(details.grossedUpDividend.cents).toBe(14286);
        expect(details.frankingPercentage).toBe(100);
        expect(details.companyTaxRate).toBe(30);
      });
    });
  });

  describe("Dividend Summary", () => {
    describe("calculateDividendSummary", () => {
      it("calculates dividend totals", () => {
        const transactions: InvestmentTransaction[] = [
          {
            id: "1",
            holdingId: "h-1",
            type: "dividend",
            units: 0,
            pricePerUnit: 0,
            totalAmount: 10000,
            frankingCreditAmount: 4286,
            date: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "2",
            holdingId: "h-1",
            type: "distribution",
            units: 0,
            pricePerUnit: 0,
            totalAmount: 5000,
            frankingCreditAmount: 2143,
            date: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const summary = calculateDividendSummary(transactions);

        expect(summary.totalCashDividends.cents).toBe(15000);
        expect(summary.totalFrankingCredits.cents).toBe(6429);
        expect(summary.totalGrossedUp.cents).toBe(21429);
        expect(summary.dividendCount).toBe(2);
      });

      it("ignores non-dividend transactions", () => {
        const transactions: InvestmentTransaction[] = [
          {
            id: "1",
            holdingId: "h-1",
            type: "buy",
            units: 100,
            pricePerUnit: 1000,
            totalAmount: 100000,
            date: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const summary = calculateDividendSummary(transactions);

        expect(summary.dividendCount).toBe(0);
        expect(summary.totalCashDividends.cents).toBe(0);
      });
    });
  });

  describe("Validation", () => {
    describe("validateSellTransaction", () => {
      it("validates valid sell", () => {
        const result = validateSellTransaction(50, 100);
        expect(result.isValid).toBe(true);
      });

      it("rejects zero units", () => {
        const result = validateSellTransaction(0, 100);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("positive");
      });

      it("rejects selling more than available", () => {
        const result = validateSellTransaction(150, 100);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("Only 100 units available");
      });
    });

    describe("isTradeableHoldingType", () => {
      it("returns true for tradeable types", () => {
        expect(isTradeableHoldingType("etf")).toBe(true);
        expect(isTradeableHoldingType("stock")).toBe(true);
        expect(isTradeableHoldingType("crypto")).toBe(true);
      });

      it("returns false for non-tradeable types", () => {
        expect(isTradeableHoldingType("managed-fund")).toBe(false);
      });
    });
  });
});
