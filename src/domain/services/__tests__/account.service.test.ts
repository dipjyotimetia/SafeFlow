import { describe, it, expect } from "vitest";
import {
  calculateBalance,
  calculateBalanceChange,
  calculateReverseBalanceChange,
  validateAccountData,
  isValidAccountType,
  canDeleteAccount,
  getAccountSummary,
  calculateSavingsRate,
  isAssetAccount,
  isLiabilityAccount,
  getAccountTypeCategory,
  getAccountTypeIcon,
} from "../account.service";
import type { Transaction } from "@/types";

// Helper to create mock transactions
function createTransaction(
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id: "tx-1",
    accountId: "acc-1",
    type: "expense",
    amount: 1000, // $10 in cents
    description: "Test transaction",
    date: new Date(),
    isReconciled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("AccountService", () => {
  describe("calculateBalance", () => {
    it("calculates balance from income transactions", () => {
      const transactions = [
        createTransaction({ type: "income", amount: 10000 }),
        createTransaction({ type: "income", amount: 5000 }),
      ];

      const balance = calculateBalance(transactions);
      expect(balance.cents).toBe(15000);
    });

    it("calculates balance from expense transactions", () => {
      const transactions = [
        createTransaction({ type: "expense", amount: 3000 }),
        createTransaction({ type: "expense", amount: 2000 }),
      ];

      const balance = calculateBalance(transactions);
      expect(balance.cents).toBe(-5000);
    });

    it("calculates net balance from mixed transactions", () => {
      const transactions = [
        createTransaction({ type: "income", amount: 10000 }),
        createTransaction({ type: "expense", amount: 3000 }),
        createTransaction({ type: "income", amount: 2000 }),
        createTransaction({ type: "expense", amount: 1000 }),
      ];

      const balance = calculateBalance(transactions);
      expect(balance.cents).toBe(8000); // 12000 - 4000
    });

    it("returns zero for empty transactions", () => {
      const balance = calculateBalance([]);
      expect(balance.cents).toBe(0);
    });

    it("ignores transfer transactions", () => {
      const transactions = [
        createTransaction({ type: "income", amount: 10000 }),
        createTransaction({ type: "transfer", amount: 5000 }),
      ];

      const balance = calculateBalance(transactions);
      expect(balance.cents).toBe(10000);
    });
  });

  describe("calculateBalanceChange", () => {
    it("returns positive for income", () => {
      expect(calculateBalanceChange("income", 1000)).toBe(1000);
    });

    it("returns negative for expense", () => {
      expect(calculateBalanceChange("expense", 1000)).toBe(-1000);
    });

    it("returns negative for transfer (source perspective)", () => {
      expect(calculateBalanceChange("transfer", 1000)).toBe(-1000);
    });
  });

  describe("calculateReverseBalanceChange", () => {
    it("reverses income", () => {
      expect(calculateReverseBalanceChange("income", 1000)).toBe(-1000);
    });

    it("reverses expense", () => {
      expect(calculateReverseBalanceChange("expense", 1000)).toBe(1000);
    });
  });

  describe("validateAccountData", () => {
    it("validates valid account data", () => {
      const result = validateAccountData({
        name: "Savings Account",
        type: "bank",
        balance: 10000,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects empty name", () => {
      const result = validateAccountData({ name: "  " });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Account name is required");
    });

    it("rejects long name", () => {
      const result = validateAccountData({ name: "a".repeat(101) });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Account name must be 100 characters or less");
    });

    it("rejects invalid account type", () => {
      const result = validateAccountData({ type: "invalid" as unknown as "bank" });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("Invalid account type");
    });

    it("rejects non-integer balance", () => {
      const result = validateAccountData({ balance: 100.5 });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Balance must be an integer (cents)");
    });

    it("collects multiple errors", () => {
      const result = validateAccountData({
        name: "",
        type: "invalid" as unknown as "bank",
        balance: 100.5,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("isValidAccountType", () => {
    it("returns true for valid types", () => {
      expect(isValidAccountType("bank")).toBe(true);
      expect(isValidAccountType("credit")).toBe(true);
      expect(isValidAccountType("investment")).toBe(true);
      expect(isValidAccountType("crypto")).toBe(true);
      expect(isValidAccountType("cash")).toBe(true);
      expect(isValidAccountType("asset")).toBe(true);
      expect(isValidAccountType("liability")).toBe(true);
    });

    it("returns false for invalid types", () => {
      expect(isValidAccountType("invalid")).toBe(false);
      expect(isValidAccountType("")).toBe(false);
    });
  });

  describe("canDeleteAccount", () => {
    it("allows deletion by default", () => {
      const transactions = [
        createTransaction({ isReconciled: false }),
      ];

      const result = canDeleteAccount(transactions);
      expect(result.canDelete).toBe(true);
    });

    it("blocks deletion with unreconciled when required", () => {
      const transactions = [
        createTransaction({ isReconciled: false }),
      ];

      const result = canDeleteAccount(transactions, { requireAllReconciled: true });
      expect(result.canDelete).toBe(false);
      expect(result.reason).toContain("unreconciled");
    });

    it("allows deletion when all reconciled", () => {
      const transactions = [
        createTransaction({ isReconciled: true }),
        createTransaction({ isReconciled: true }),
      ];

      const result = canDeleteAccount(transactions, { requireAllReconciled: true });
      expect(result.canDelete).toBe(true);
    });
  });

  describe("getAccountSummary", () => {
    it("calculates summary from transactions", () => {
      const transactions = [
        createTransaction({ type: "income", amount: 50000 }),
        createTransaction({ type: "income", amount: 30000 }),
        createTransaction({ type: "expense", amount: 20000 }),
        createTransaction({ type: "expense", amount: 15000 }),
      ];

      const summary = getAccountSummary(transactions);

      expect(summary.totalIncome.cents).toBe(80000);
      expect(summary.totalExpenses.cents).toBe(35000);
      expect(summary.netCashflow.cents).toBe(45000);
      expect(summary.transactionCount).toBe(4);
    });

    it("handles empty transactions", () => {
      const summary = getAccountSummary([]);

      expect(summary.totalIncome.cents).toBe(0);
      expect(summary.totalExpenses.cents).toBe(0);
      expect(summary.netCashflow.cents).toBe(0);
      expect(summary.transactionCount).toBe(0);
    });
  });

  describe("calculateSavingsRate", () => {
    it("calculates savings rate percentage", () => {
      // Income: $1000, Expenses: $800, Savings: $200 = 20%
      expect(calculateSavingsRate(100000, 80000)).toBe(20);
    });

    it("returns null for zero income", () => {
      expect(calculateSavingsRate(0, 5000)).toBeNull();
    });

    it("handles negative savings rate", () => {
      // Income: $1000, Expenses: $1200 = -20%
      expect(calculateSavingsRate(100000, 120000)).toBe(-20);
    });

    it("rounds to nearest integer", () => {
      // 33.33% should round to 33
      expect(calculateSavingsRate(30000, 20000)).toBe(33);
    });
  });

  describe("Account Type Helpers", () => {
    describe("isAssetAccount", () => {
      it("returns true for asset types", () => {
        expect(isAssetAccount("bank")).toBe(true);
        expect(isAssetAccount("investment")).toBe(true);
        expect(isAssetAccount("crypto")).toBe(true);
        expect(isAssetAccount("cash")).toBe(true);
        expect(isAssetAccount("asset")).toBe(true);
      });

      it("returns false for liability types", () => {
        expect(isAssetAccount("credit")).toBe(false);
        expect(isAssetAccount("liability")).toBe(false);
      });
    });

    describe("isLiabilityAccount", () => {
      it("returns true for liability types", () => {
        expect(isLiabilityAccount("credit")).toBe(true);
        expect(isLiabilityAccount("liability")).toBe(true);
      });

      it("returns false for asset types", () => {
        expect(isLiabilityAccount("bank")).toBe(false);
        expect(isLiabilityAccount("investment")).toBe(false);
      });
    });

    describe("getAccountTypeCategory", () => {
      it("categorizes cash accounts", () => {
        expect(getAccountTypeCategory("bank")).toBe("cash");
        expect(getAccountTypeCategory("cash")).toBe("cash");
      });

      it("categorizes investment accounts", () => {
        expect(getAccountTypeCategory("investment")).toBe("investments");
        expect(getAccountTypeCategory("crypto")).toBe("investments");
      });

      it("categorizes liability accounts", () => {
        expect(getAccountTypeCategory("credit")).toBe("liabilities");
        expect(getAccountTypeCategory("liability")).toBe("liabilities");
      });

      it("categorizes asset accounts", () => {
        expect(getAccountTypeCategory("asset")).toBe("assets");
      });
    });

    describe("getAccountTypeIcon", () => {
      it("returns icons for each type", () => {
        expect(getAccountTypeIcon("bank")).toBe("building-columns");
        expect(getAccountTypeIcon("credit")).toBe("credit-card");
        expect(getAccountTypeIcon("investment")).toBe("chart-line");
        expect(getAccountTypeIcon("crypto")).toBe("bitcoin");
        expect(getAccountTypeIcon("cash")).toBe("wallet");
        expect(getAccountTypeIcon("asset")).toBe("home");
        expect(getAccountTypeIcon("liability")).toBe("receipt");
      });
    });
  });
});
