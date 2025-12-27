import { describe, it, expect } from "vitest";
import {
  calculateIncomeTax,
  getMarginalTaxRate,
  calculateDeductions,
  estimateTax,
  filterTransactionsForFY,
  filterInvestmentTransactionsForFY,
  calculateIncomeSummary,
  TAX_BRACKETS_2024_25,
  MLS_THRESHOLDS,
} from "../tax.service";
import { FinancialYear } from "../../value-objects/financial-year";
import type { Transaction, InvestmentTransaction } from "@/types";

describe("Tax Service", () => {
  describe("TAX_BRACKETS_2024_25", () => {
    it("has correct number of brackets", () => {
      expect(TAX_BRACKETS_2024_25).toHaveLength(5);
    });

    it("has correct tax-free threshold", () => {
      expect(TAX_BRACKETS_2024_25[0].min).toBe(0);
      expect(TAX_BRACKETS_2024_25[0].max).toBe(18200);
      expect(TAX_BRACKETS_2024_25[0].rate).toBe(0);
    });

    it("has correct top marginal rate", () => {
      const topBracket = TAX_BRACKETS_2024_25[TAX_BRACKETS_2024_25.length - 1];
      expect(topBracket.rate).toBe(45);
      expect(topBracket.min).toBe(190001);
    });
  });

  describe("calculateIncomeTax", () => {
    describe("Tax-free threshold (0 - $18,200)", () => {
      it("returns zero tax for zero income", () => {
        const result = calculateIncomeTax(0);
        expect(result.incomeTax.cents).toBe(0);
        expect(result.medicareLevy.cents).toBe(0);
        expect(result.totalTax.cents).toBe(0);
      });

      it("returns zero income tax within tax-free threshold", () => {
        const result = calculateIncomeTax(1820000); // $18,200
        expect(result.incomeTax.cents).toBe(0);
        expect(result.marginalRate).toBe(0);
      });

      it("calculates medicare levy on tax-free income", () => {
        const result = calculateIncomeTax(1820000); // $18,200
        // Medicare levy = $18,200 * 2% = $364
        expect(result.medicareLevy.cents).toBe(36400);
      });
    });

    describe("16% bracket ($18,201 - $45,000)", () => {
      it("calculates tax at bracket start", () => {
        const result = calculateIncomeTax(1820100); // $18,201
        // Tax = $1 * 16% = $0.16
        expect(result.incomeTax.cents).toBe(16);
        expect(result.marginalRate).toBe(16);
      });

      it("calculates tax at bracket end", () => {
        const result = calculateIncomeTax(4500000); // $45,000
        // Tax = ($45,000 - $18,200) * 16% = $26,800 * 16% = $4,288
        expect(result.incomeTax.cents).toBe(428800);
      });

      it("calculates effective rate correctly", () => {
        const result = calculateIncomeTax(4500000); // $45,000
        // Effective rate = ($4,288 + $900) / $45,000 * 100 = 11.53%
        expect(result.effectiveRate).toBeGreaterThan(11);
        expect(result.effectiveRate).toBeLessThan(12);
      });
    });

    describe("30% bracket ($45,001 - $135,000)", () => {
      it("calculates tax at bracket start", () => {
        const result = calculateIncomeTax(4500100); // $45,001
        // Base tax = $4,288 + $1 * 30% = $4,288.30
        expect(result.incomeTax.cents).toBe(428830);
        expect(result.marginalRate).toBe(30);
      });

      it("calculates tax at bracket end", () => {
        const result = calculateIncomeTax(13500000); // $135,000
        // Base tax = $4,288 + ($135,000 - $45,000) * 30% = $4,288 + $27,000 = $31,288
        expect(result.incomeTax.cents).toBe(3128800);
      });
    });

    describe("37% bracket ($135,001 - $190,000)", () => {
      it("calculates tax at bracket start", () => {
        const result = calculateIncomeTax(13500100); // $135,001
        // Base tax = $31,288 + $1 * 37% = $31,288.37
        expect(result.incomeTax.cents).toBe(3128837);
        expect(result.marginalRate).toBe(37);
      });

      it("calculates tax at bracket end", () => {
        const result = calculateIncomeTax(19000000); // $190,000
        // Base tax = $31,288 + ($190,000 - $135,000) * 37% = $31,288 + $20,350 = $51,638
        expect(result.incomeTax.cents).toBe(5163800);
      });
    });

    describe("45% bracket ($190,001+)", () => {
      it("calculates tax at bracket start", () => {
        const result = calculateIncomeTax(19000100); // $190,001
        // Base tax = $51,638 + $1 * 45% = $51,638.45
        expect(result.incomeTax.cents).toBe(5163845);
        expect(result.marginalRate).toBe(45);
      });

      it("calculates tax for high income", () => {
        const result = calculateIncomeTax(30000000); // $300,000
        // Base tax = $51,638 + ($300,000 - $190,000) * 45% = $51,638 + $49,500 = $101,138
        expect(result.incomeTax.cents).toBe(10113800);
      });
    });

    describe("Medicare Levy", () => {
      it("calculates medicare levy at 2%", () => {
        const result = calculateIncomeTax(10000000); // $100,000
        // Medicare = $100,000 * 2% = $2,000
        expect(result.medicareLevy.cents).toBe(200000);
      });

      it("includes medicare levy in total tax", () => {
        const result = calculateIncomeTax(10000000); // $100,000
        const expectedTotal = result.incomeTax.cents + result.medicareLevy.cents;
        expect(result.totalTax.cents).toBe(expectedTotal);
      });
    });
  });

  describe("getMarginalTaxRate", () => {
    it("returns 0% for tax-free threshold", () => {
      expect(getMarginalTaxRate(0)).toBe(0);
      expect(getMarginalTaxRate(1820000)).toBe(0);
    });

    it("returns 16% for first bracket", () => {
      expect(getMarginalTaxRate(3000000)).toBe(16); // $30,000
    });

    it("returns 30% for second bracket", () => {
      expect(getMarginalTaxRate(10000000)).toBe(30); // $100,000
    });

    it("returns 37% for third bracket", () => {
      expect(getMarginalTaxRate(15000000)).toBe(37); // $150,000
    });

    it("returns 45% for top bracket", () => {
      expect(getMarginalTaxRate(25000000)).toBe(45); // $250,000
    });
  });

  describe("calculateDeductions", () => {
    const mockTransactions: Transaction[] = [
      {
        id: "1",
        accountId: "acc1",
        type: "expense",
        amount: 50000, // $500
        description: "Work laptop",
        date: new Date("2024-09-15"),
        isDeductible: true,
        atoCategory: "D5",
        gstAmount: 4545,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        accountId: "acc1",
        type: "expense",
        amount: 20000, // $200
        description: "Tax agent fee",
        date: new Date("2024-10-20"),
        isDeductible: true,
        atoCategory: "D10",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        accountId: "acc1",
        type: "expense",
        amount: 100000, // $1000 - not deductible
        description: "Personal expense",
        date: new Date("2024-11-01"),
        isDeductible: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "4",
        accountId: "acc1",
        type: "income",
        amount: 500000, // Income - should be ignored
        description: "Salary",
        date: new Date("2024-11-01"),
        isDeductible: true, // Even if marked deductible, income is ignored
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("calculates total deductible amount", () => {
      const result = calculateDeductions(mockTransactions);
      // $500 + $200 = $700
      expect(result.totalDeductible.cents).toBe(70000);
    });

    it("calculates total GST", () => {
      const result = calculateDeductions(mockTransactions);
      expect(result.totalGST.cents).toBe(4545);
    });

    it("groups by ATO category", () => {
      const result = calculateDeductions(mockTransactions);
      expect(result.categories).toHaveLength(2);

      const d5 = result.categories.find((c) => c.code === "D5");
      expect(d5?.amount.cents).toBe(50000);

      const d10 = result.categories.find((c) => c.code === "D10");
      expect(d10?.amount.cents).toBe(20000);
    });

    it("counts deductible transactions", () => {
      const result = calculateDeductions(mockTransactions);
      expect(result.transactionCount).toBe(2);
    });

    it("handles empty array", () => {
      const result = calculateDeductions([]);
      expect(result.totalDeductible.cents).toBe(0);
      expect(result.categories).toHaveLength(0);
    });
  });

  describe("estimateTax", () => {
    it("calculates basic tax estimate", () => {
      const result = estimateTax({
        grossIncome: 10000000, // $100,000
        deductions: 500000, // $5,000
        capitalGains: 0,
        frankingCredits: 0,
        hasPrivateHealth: true,
      });

      // Taxable income = $100,000 - $5,000 = $95,000
      expect(result.taxableIncome.cents).toBe(9500000);
      expect(result.taxPayable.cents).toBeGreaterThan(0);
    });

    it("applies franking credit offset", () => {
      const withoutCredits = estimateTax({
        grossIncome: 10000000,
        deductions: 0,
        capitalGains: 0,
        frankingCredits: 0,
        hasPrivateHealth: true,
      });

      const withCredits = estimateTax({
        grossIncome: 10000000,
        deductions: 0,
        capitalGains: 0,
        frankingCredits: 100000, // $1,000 franking credits
        hasPrivateHealth: true,
      });

      expect(withCredits.taxPayable.cents).toBe(
        withoutCredits.taxPayable.cents - 100000
      );
    });

    it("calculates refund when franking credits exceed tax", () => {
      const result = estimateTax({
        grossIncome: 2000000, // $20,000 - low income
        deductions: 0,
        capitalGains: 0,
        frankingCredits: 500000, // $5,000 franking credits
        hasPrivateHealth: true,
      });

      // Tax on $20,000 is low, franking credits may exceed it
      expect(result.refundDue.cents).toBeGreaterThan(0);
      expect(result.taxPayable.cents).toBe(0);
    });

    it("adds Medicare Levy Surcharge for no private health", () => {
      const withHealth = estimateTax({
        grossIncome: 15000000, // $150,000
        deductions: 0,
        capitalGains: 0,
        frankingCredits: 0,
        hasPrivateHealth: true,
      });

      const withoutHealth = estimateTax({
        grossIncome: 15000000,
        deductions: 0,
        capitalGains: 0,
        frankingCredits: 0,
        hasPrivateHealth: false,
      });

      expect(withoutHealth.medicareLevySurcharge.cents).toBeGreaterThan(0);
      expect(withoutHealth.taxPayable.cents).toBeGreaterThan(
        withHealth.taxPayable.cents
      );
    });

    it("includes capital gains in taxable income", () => {
      const result = estimateTax({
        grossIncome: 10000000, // $100,000
        deductions: 0,
        capitalGains: 2000000, // $20,000 capital gains
        frankingCredits: 0,
        hasPrivateHealth: true,
      });

      // Taxable = $100,000 + $20,000 = $120,000
      expect(result.taxableIncome.cents).toBe(12000000);
    });

    it("prevents negative taxable income", () => {
      const result = estimateTax({
        grossIncome: 1000000, // $10,000
        deductions: 5000000, // $50,000 deductions (more than income)
        capitalGains: 0,
        frankingCredits: 0,
        hasPrivateHealth: true,
      });

      expect(result.taxableIncome.cents).toBe(0);
    });
  });

  describe("MLS Thresholds", () => {
    it("has correct thresholds", () => {
      expect(MLS_THRESHOLDS[0].max).toBe(93000);
      expect(MLS_THRESHOLDS[0].rate).toBe(0);

      expect(MLS_THRESHOLDS[1].min).toBe(93001);
      expect(MLS_THRESHOLDS[1].rate).toBe(1);

      expect(MLS_THRESHOLDS[2].rate).toBe(1.25);
      expect(MLS_THRESHOLDS[3].rate).toBe(1.5);
    });
  });

  describe("filterTransactionsForFY", () => {
    const fy = FinancialYear.parse("2024-25");
    const transactions: Transaction[] = [
      {
        id: "1",
        accountId: "acc1",
        type: "income",
        amount: 100000,
        description: "July income",
        date: new Date("2024-07-15"), // In FY
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        accountId: "acc1",
        type: "expense",
        amount: 50000,
        description: "March expense",
        date: new Date("2025-03-20"), // In FY
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        accountId: "acc1",
        type: "expense",
        amount: 30000,
        description: "Before FY",
        date: new Date("2024-06-30"), // Before FY
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "4",
        accountId: "acc1",
        type: "income",
        amount: 80000,
        description: "After FY",
        date: new Date("2025-07-01"), // After FY
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("filters transactions within FY", () => {
      const result = filterTransactionsForFY(transactions, fy);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toContain("1");
      expect(result.map((t) => t.id)).toContain("2");
    });

    it("excludes transactions before FY", () => {
      const result = filterTransactionsForFY(transactions, fy);
      expect(result.map((t) => t.id)).not.toContain("3");
    });

    it("excludes transactions after FY", () => {
      const result = filterTransactionsForFY(transactions, fy);
      expect(result.map((t) => t.id)).not.toContain("4");
    });
  });

  describe("filterInvestmentTransactionsForFY", () => {
    const fy = FinancialYear.parse("2024-25");
    const transactions: InvestmentTransaction[] = [
      {
        id: "1",
        holdingId: "h1",
        type: "dividend",
        date: new Date("2024-09-15"), // In FY
        units: 0,
        pricePerUnit: 0,
        totalAmount: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        holdingId: "h1",
        type: "sell",
        date: new Date("2024-05-15"), // Before FY
        units: 10,
        pricePerUnit: 1000,
        totalAmount: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("filters investment transactions within FY", () => {
      const result = filterInvestmentTransactionsForFY(transactions, fy);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });
  });

  describe("calculateIncomeSummary", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        accountId: "acc1",
        type: "income",
        amount: 8000000, // $80,000 salary
        description: "Salary",
        date: new Date("2024-08-15"),
        atoCategory: "salary",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        accountId: "acc1",
        type: "income",
        amount: 500000, // $5,000 other
        description: "Side gig",
        date: new Date("2024-09-15"),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const investmentTransactions: InvestmentTransaction[] = [
      {
        id: "i1",
        holdingId: "h1",
        type: "dividend",
        date: new Date("2024-10-15"),
        units: 0,
        pricePerUnit: 0,
        totalAmount: 200000, // $2,000 dividend
        frankingCreditAmount: 85714, // ~$857 franking credit (30% rate)
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "i2",
        holdingId: "h2",
        type: "sell",
        date: new Date("2024-11-15"),
        units: 100,
        pricePerUnit: 5000,
        totalAmount: 500000,
        capitalGain: 100000, // $1,000 capital gain
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("calculates salary income", () => {
      const result = calculateIncomeSummary(transactions, investmentTransactions);
      expect(result.salaryIncome.cents).toBe(8000000);
    });

    it("calculates other income", () => {
      const result = calculateIncomeSummary(transactions, investmentTransactions);
      expect(result.otherIncome.cents).toBe(500000);
    });

    it("calculates dividends", () => {
      const result = calculateIncomeSummary(transactions, investmentTransactions);
      expect(result.dividends.cents).toBe(200000);
    });

    it("calculates franking credits", () => {
      const result = calculateIncomeSummary(transactions, investmentTransactions);
      expect(result.frankingCredits.cents).toBe(85714);
    });

    it("calculates grossed up dividends", () => {
      const result = calculateIncomeSummary(transactions, investmentTransactions);
      // Grossed up = $2,000 + $857.14 = $2,857.14
      expect(result.grossedUpDividends.cents).toBe(285714);
    });

    it("calculates capital gains", () => {
      const result = calculateIncomeSummary(transactions, investmentTransactions);
      expect(result.capitalGains.cents).toBe(100000);
    });

    it("calculates total assessable income", () => {
      const result = calculateIncomeSummary(transactions, investmentTransactions);
      // Total = $80,000 + $5,000 + $2,857.14 + $1,000 = $88,857.14
      expect(result.totalAssessableIncome.cents).toBe(8885714);
    });
  });

  describe("Real-world Tax Scenarios", () => {
    it("calculates tax for average salary", () => {
      // Average Australian salary ~$95,000
      const result = calculateIncomeTax(9500000);

      // Expected: base $4,288 + ($95,000 - $45,000) * 30% = $4,288 + $15,000 = $19,288
      // Plus Medicare: $95,000 * 2% = $1,900
      // Total ~$21,188
      expect(result.incomeTax.cents).toBe(1928800);
      expect(result.medicareLevy.cents).toBe(190000);
      expect(result.effectiveRate).toBeCloseTo(22.3, 0);
    });

    it("calculates tax for minimum wage", () => {
      // Minimum wage ~$45,906/year (2024)
      const result = calculateIncomeTax(4590600);

      expect(result.marginalRate).toBe(30);
      expect(result.effectiveRate).toBeLessThan(15);
    });

    it("calculates complete tax estimate for investor", () => {
      const result = estimateTax({
        grossIncome: 12000000, // $120,000 salary
        deductions: 300000, // $3,000 work deductions
        capitalGains: 500000, // $5,000 net capital gains (after CGT discount)
        frankingCredits: 200000, // $2,000 franking credits
        hasPrivateHealth: true,
      });

      // Taxable = $120,000 - $3,000 + $5,000 = $122,000
      expect(result.taxableIncome.cents).toBe(12200000);

      // Should have franking credit applied
      expect(result.frankingCredits.cents).toBe(200000);

      // Tax payable should be total tax minus franking credits
      // totalTax = incomeTax + medicareLevy
      const totalTaxBeforeCredits =
        result.incomeTax.cents + result.medicareLevy.cents;
      expect(result.taxPayable.cents).toBe(
        totalTaxBeforeCredits - result.frankingCredits.cents
      );
    });
  });
});
