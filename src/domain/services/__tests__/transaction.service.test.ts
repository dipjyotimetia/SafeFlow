import { describe, it, expect } from "vitest";
import {
  generateTransactionKey,
  createDuplicateKeySet,
  filterDuplicates,
  groupByCategory,
  calculateCategoryBreakdown,
  groupByMonth,
  calculateMonthlyTotals,
  calculateCashflow,
  validateTransactionData,
  isValidTransactionType,
  getTopMerchants,
} from "../transaction.service";
import type { Transaction, Category, TransactionType } from "@/types";

// Helper to create mock transactions
function createTransaction(
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id: "tx-1",
    accountId: "acc-1",
    type: "expense",
    amount: 1000,
    description: "Test transaction",
    date: new Date("2024-08-15"),
    isReconciled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("TransactionService", () => {
  describe("Duplicate Detection", () => {
    describe("generateTransactionKey", () => {
      it("generates consistent key for same transaction", () => {
        const tx = {
          accountId: "acc-1",
          date: new Date("2024-08-15"),
          amount: 1000,
          description: "Woolworths",
        };

        const key1 = generateTransactionKey(tx);
        const key2 = generateTransactionKey(tx);

        expect(key1).toBe(key2);
      });

      it("includes all components in key", () => {
        const tx = {
          accountId: "acc-1",
          date: new Date("2024-08-15"),
          amount: 1000,
          description: "Woolworths",
        };

        const key = generateTransactionKey(tx);

        expect(key).toContain("acc-1");
        expect(key).toContain("2024-08-15");
        expect(key).toContain("1000");
        expect(key).toContain("Woolworths");
      });

      it("truncates long descriptions", () => {
        const tx = {
          accountId: "acc-1",
          date: new Date("2024-08-15"),
          amount: 1000,
          description: "a".repeat(100),
        };

        const key = generateTransactionKey(tx);

        // Should only contain first 50 chars
        expect(key).toContain("a".repeat(50));
        expect(key).not.toContain("a".repeat(51));
      });

      it("handles string dates", () => {
        const tx = {
          accountId: "acc-1",
          date: "2024-08-15T10:00:00Z",
          amount: 1000,
          description: "Test",
        };

        const key = generateTransactionKey(tx);
        expect(key).toContain("2024-08-15");
      });
    });

    describe("filterDuplicates", () => {
      it("filters out duplicates", () => {
        const existing = createDuplicateKeySet([
          createTransaction({ id: "1", amount: 1000, description: "Existing" }),
        ]);

        const incoming = [
          { accountId: "acc-1", date: new Date("2024-08-15"), amount: 1000, description: "Existing" },
          { accountId: "acc-1", date: new Date("2024-08-15"), amount: 2000, description: "New" },
        ];

        const { unique, duplicates } = filterDuplicates(incoming, existing);

        expect(unique).toHaveLength(1);
        expect(duplicates).toHaveLength(1);
        expect(unique[0].amount).toBe(2000);
      });

      it("handles empty incoming array", () => {
        const existing = new Set<string>();
        const { unique, duplicates } = filterDuplicates([], existing);

        expect(unique).toHaveLength(0);
        expect(duplicates).toHaveLength(0);
      });

      it("prevents duplicates within same batch", () => {
        const existing = new Set<string>();
        const incoming = [
          { accountId: "acc-1", date: new Date("2024-08-15"), amount: 1000, description: "Same" },
          { accountId: "acc-1", date: new Date("2024-08-15"), amount: 1000, description: "Same" },
        ];

        const { unique, duplicates } = filterDuplicates(incoming, existing);

        expect(unique).toHaveLength(1);
        expect(duplicates).toHaveLength(1);
      });
    });
  });

  describe("Categorization", () => {
    describe("groupByCategory", () => {
      it("groups transactions by category", () => {
        const transactions = [
          createTransaction({ categoryId: "cat-1" }),
          createTransaction({ categoryId: "cat-1" }),
          createTransaction({ categoryId: "cat-2" }),
          createTransaction({ categoryId: undefined }),
        ];

        const groups = groupByCategory(transactions);

        expect(groups.get("cat-1")).toHaveLength(2);
        expect(groups.get("cat-2")).toHaveLength(1);
        expect(groups.get(undefined)).toHaveLength(1);
      });
    });

    describe("calculateCategoryBreakdown", () => {
      it("calculates breakdown with percentages", () => {
        const transactions = [
          createTransaction({ type: "expense", categoryId: "cat-1", amount: 6000 }),
          createTransaction({ type: "expense", categoryId: "cat-2", amount: 4000 }),
        ];

        const categories: Category[] = [
          { id: "cat-1", name: "Food", type: "expense", isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
          { id: "cat-2", name: "Transport", type: "expense", isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        ];

        const breakdown = calculateCategoryBreakdown(transactions, categories);

        expect(breakdown).toHaveLength(2);
        expect(breakdown[0].categoryName).toBe("Food"); // Sorted by amount
        expect(breakdown[0].percentage).toBe(60);
        expect(breakdown[1].percentage).toBe(40);
      });

      it("only includes expenses", () => {
        const transactions = [
          createTransaction({ type: "expense", categoryId: "cat-1", amount: 5000 }),
          createTransaction({ type: "income", categoryId: "cat-1", amount: 10000 }),
        ];

        const categories: Category[] = [
          { id: "cat-1", name: "Salary", type: "income", isSystem: false, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        ];

        const breakdown = calculateCategoryBreakdown(transactions, categories);

        expect(breakdown[0].amount.cents).toBe(5000);
      });
    });
  });

  describe("Time-based Analysis", () => {
    describe("groupByMonth", () => {
      it("groups transactions by month", () => {
        const transactions = [
          createTransaction({ date: new Date("2024-08-15") }),
          createTransaction({ date: new Date("2024-08-20") }),
          createTransaction({ date: new Date("2024-09-10") }),
        ];

        const groups = groupByMonth(transactions);

        expect(groups.get("2024-08")).toHaveLength(2);
        expect(groups.get("2024-09")).toHaveLength(1);
      });
    });

    describe("calculateMonthlyTotals", () => {
      it("calculates totals per month", () => {
        const transactions = [
          createTransaction({ date: new Date("2024-08-15"), type: "income", amount: 50000 }),
          createTransaction({ date: new Date("2024-08-20"), type: "expense", amount: 20000 }),
          createTransaction({ date: new Date("2024-09-10"), type: "expense", amount: 10000 }),
        ];

        const totals = calculateMonthlyTotals(transactions);

        expect(totals).toHaveLength(2);

        const aug = totals.find((t) => t.month === "2024-08");
        expect(aug?.income.cents).toBe(50000);
        expect(aug?.expenses.cents).toBe(20000);
        expect(aug?.net.cents).toBe(30000);

        const sep = totals.find((t) => t.month === "2024-09");
        expect(sep?.expenses.cents).toBe(10000);
      });

      it("sorts months chronologically", () => {
        const transactions = [
          createTransaction({ date: new Date("2024-09-15"), type: "expense", amount: 1000 }),
          createTransaction({ date: new Date("2024-07-15"), type: "expense", amount: 1000 }),
          createTransaction({ date: new Date("2024-08-15"), type: "expense", amount: 1000 }),
        ];

        const totals = calculateMonthlyTotals(transactions);

        expect(totals[0].month).toBe("2024-07");
        expect(totals[1].month).toBe("2024-08");
        expect(totals[2].month).toBe("2024-09");
      });
    });
  });

  describe("Cashflow Analysis", () => {
    describe("calculateCashflow", () => {
      it("calculates cashflow summary", () => {
        const transactions = [
          createTransaction({ type: "income", amount: 100000 }),
          createTransaction({ type: "expense", amount: 30000 }),
          createTransaction({ type: "expense", amount: 20000 }),
        ];

        const cashflow = calculateCashflow(transactions);

        expect(cashflow.totalIncome.cents).toBe(100000);
        expect(cashflow.totalExpenses.cents).toBe(50000);
        expect(cashflow.netCashflow.cents).toBe(50000);
        expect(cashflow.savingsRate).toBe(50);
        expect(cashflow.incomeTransactionCount).toBe(1);
        expect(cashflow.expenseTransactionCount).toBe(2);
      });

      it("handles zero income", () => {
        const transactions = [
          createTransaction({ type: "expense", amount: 10000 }),
        ];

        const cashflow = calculateCashflow(transactions);
        expect(cashflow.savingsRate).toBe(0);
      });
    });
  });

  describe("Validation", () => {
    describe("validateTransactionData", () => {
      it("validates valid transaction data", () => {
        const result = validateTransactionData({
          accountId: "acc-1",
          type: "expense",
          amount: 1000,
          description: "Test",
          date: new Date(),
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("rejects empty account ID", () => {
        const result = validateTransactionData({ accountId: "" });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Account ID is required");
      });

      it("rejects invalid transaction type", () => {
        const result = validateTransactionData({
          type: "invalid" as unknown as TransactionType,
        });
        expect(result.isValid).toBe(false);
      });

      it("rejects negative amount", () => {
        const result = validateTransactionData({ amount: -100 });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Amount cannot be negative");
      });

      it("rejects empty description", () => {
        const result = validateTransactionData({ description: "  " });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Description is required");
      });

      it("rejects long description", () => {
        const result = validateTransactionData({ description: "a".repeat(501) });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Description must be 500 characters or less");
      });

      it("validates transfer requires destination", () => {
        const result = validateTransactionData({
          type: "transfer",
          accountId: "acc-1",
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Transfer transactions require a destination account");
      });

      it("rejects transfer to same account", () => {
        const result = validateTransactionData({
          type: "transfer",
          accountId: "acc-1",
          transferToAccountId: "acc-1",
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Cannot transfer to the same account");
      });
    });

    describe("isValidTransactionType", () => {
      it("returns true for valid types", () => {
        expect(isValidTransactionType("income")).toBe(true);
        expect(isValidTransactionType("expense")).toBe(true);
        expect(isValidTransactionType("transfer")).toBe(true);
      });

      it("returns false for invalid types", () => {
        expect(isValidTransactionType("invalid")).toBe(false);
        expect(isValidTransactionType("")).toBe(false);
      });
    });
  });

  describe("Merchant Analysis", () => {
    describe("getTopMerchants", () => {
      it("returns top merchants by spend", () => {
        const transactions = [
          createTransaction({ type: "expense", merchantName: "Woolworths", amount: 10000 }),
          createTransaction({ type: "expense", merchantName: "Woolworths", amount: 5000 }),
          createTransaction({ type: "expense", merchantName: "Coles", amount: 8000 }),
          createTransaction({ type: "expense", merchantName: "Aldi", amount: 3000 }),
        ];

        const merchants = getTopMerchants(transactions, 2);

        expect(merchants).toHaveLength(2);
        expect(merchants[0].merchantName).toBe("Woolworths");
        expect(merchants[0].totalSpend.cents).toBe(15000);
        expect(merchants[0].transactionCount).toBe(2);
        expect(merchants[1].merchantName).toBe("Coles");
      });

      it("only includes expenses", () => {
        const transactions = [
          createTransaction({ type: "expense", merchantName: "Store", amount: 5000 }),
          createTransaction({ type: "income", merchantName: "Store", amount: 10000 }),
        ];

        const merchants = getTopMerchants(transactions);

        expect(merchants[0].totalSpend.cents).toBe(5000);
      });

      it("ignores transactions without merchant name", () => {
        const transactions = [
          createTransaction({ type: "expense", amount: 5000 }),
        ];

        const merchants = getTopMerchants(transactions);

        expect(merchants).toHaveLength(0);
      });

      it("calculates average transaction", () => {
        const transactions = [
          createTransaction({ type: "expense", merchantName: "Shop", amount: 1000 }),
          createTransaction({ type: "expense", merchantName: "Shop", amount: 3000 }),
        ];

        const merchants = getTopMerchants(transactions);

        expect(merchants[0].averageTransaction.cents).toBe(2000);
      });
    });
  });
});
