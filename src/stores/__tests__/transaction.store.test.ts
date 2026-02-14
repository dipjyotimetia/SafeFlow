import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/llm-categorization", () => ({
  llmCategorizationService: {
    checkAvailability: vi.fn(async () => false),
    categorizeTransactions: vi.fn(async () => new Map()),
    learnFromUserCorrection: vi.fn(async () => undefined),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { clearDatabase, db } from "@/lib/db";
import { useTransactionStore } from "../transaction.store";

describe("Transaction store bulk import", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("keeps one same-key transaction when incoming count exceeds existing duplicate count", async () => {
    const now = new Date();
    const accountId = "acct-1";

    await db.accounts.add({
      id: accountId,
      name: "Test Account",
      type: "bank",
      balance: 0,
      currency: "AUD",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.transactions.add({
      id: "existing-1",
      accountId,
      type: "expense",
      amount: 500,
      description: "Coffee Shop",
      date: new Date("2025-01-01T00:00:00.000Z"),
      importSource: "pdf",
      isReconciled: false,
      createdAt: now,
      updatedAt: now,
    });

    const result = await useTransactionStore.getState().bulkImport([
      {
        accountId,
        type: "expense",
        amount: 500,
        description: "Coffee Shop",
        date: "2025-01-01T00:00:00.000Z",
      },
      {
        accountId,
        type: "expense",
        amount: 500,
        description: "Coffee Shop",
        date: "2025-01-01T00:00:00.000Z",
      },
    ]);

    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(1);

    const all = await db.transactions.where("accountId").equals(accountId).toArray();
    expect(all).toHaveLength(2); // 1 pre-existing + 1 newly imported
  });
});
