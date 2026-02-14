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
  const ACCOUNTS = {
    PRIMARY: "11111111-1111-4111-8111-111111111111",
    DEST_B: "22222222-2222-4222-8222-222222222222",
    DEST_C: "33333333-3333-4333-8333-333333333333",
  } as const;

  const createAccount = async (
    id: string,
    name: string,
    balance: number
  ) => {
    const now = new Date();
    await db.accounts.add({
      id,
      name,
      type: "bank",
      balance,
      currency: "AUD",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  };

  beforeEach(async () => {
    await clearDatabase();
  });

  it("keeps one same-key transaction when incoming count exceeds existing duplicate count", async () => {
    const now = new Date();
    const accountId = ACCOUNTS.PRIMARY;

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

  it("reconciles balances when updating a transaction amount/type", async () => {
    await createAccount(ACCOUNTS.PRIMARY, "Primary", 10_000);

    const txId = await useTransactionStore.getState().createTransaction({
      accountId: ACCOUNTS.PRIMARY,
      type: "expense",
      amount: 500,
      description: "Coffee",
      date: new Date("2025-01-03T00:00:00.000Z"),
    });

    let account = await db.accounts.get(ACCOUNTS.PRIMARY);
    expect(account?.balance).toBe(9_500);

    await useTransactionStore.getState().updateTransaction(txId, {
      type: "income",
      amount: 700,
    });

    account = await db.accounts.get(ACCOUNTS.PRIMARY);
    expect(account?.balance).toBe(10_700);
  });

  it("reconciles both accounts for transfer create/update/delete", async () => {
    await createAccount(ACCOUNTS.PRIMARY, "Source", 10_000);
    await createAccount(ACCOUNTS.DEST_B, "Dest B", 2_000);
    await createAccount(ACCOUNTS.DEST_C, "Dest C", 500);

    const txId = await useTransactionStore.getState().createTransaction({
      accountId: ACCOUNTS.PRIMARY,
      type: "transfer",
      amount: 1_000,
      description: "Move cash",
      transferToAccountId: ACCOUNTS.DEST_B,
      date: new Date("2025-01-04T00:00:00.000Z"),
    });

    let accountA = await db.accounts.get(ACCOUNTS.PRIMARY);
    let accountB = await db.accounts.get(ACCOUNTS.DEST_B);
    let accountC = await db.accounts.get(ACCOUNTS.DEST_C);
    expect(accountA?.balance).toBe(9_000);
    expect(accountB?.balance).toBe(3_000);
    expect(accountC?.balance).toBe(500);

    await useTransactionStore.getState().updateTransaction(txId, {
      amount: 400,
      transferToAccountId: ACCOUNTS.DEST_C,
    });

    accountA = await db.accounts.get(ACCOUNTS.PRIMARY);
    accountB = await db.accounts.get(ACCOUNTS.DEST_B);
    accountC = await db.accounts.get(ACCOUNTS.DEST_C);
    expect(accountA?.balance).toBe(9_600);
    expect(accountB?.balance).toBe(2_000);
    expect(accountC?.balance).toBe(900);

    await useTransactionStore.getState().deleteTransaction(txId);

    accountA = await db.accounts.get(ACCOUNTS.PRIMARY);
    accountB = await db.accounts.get(ACCOUNTS.DEST_B);
    accountC = await db.accounts.get(ACCOUNTS.DEST_C);
    expect(accountA?.balance).toBe(10_000);
    expect(accountB?.balance).toBe(2_000);
    expect(accountC?.balance).toBe(500);
  });

  it("restores balances when deleting a batch import", async () => {
    await createAccount(ACCOUNTS.PRIMARY, "Primary", 1_000);

    await useTransactionStore.getState().importTransactions(
      [
        {
          accountId: ACCOUNTS.PRIMARY,
          type: "income",
          amount: 300,
          description: "Salary",
          date: new Date("2025-01-10T00:00:00.000Z"),
        },
        {
          accountId: ACCOUNTS.PRIMARY,
          type: "expense",
          amount: 100,
          description: "Lunch",
          date: new Date("2025-01-11T00:00:00.000Z"),
        },
      ],
      "batch-1",
      "pdf"
    );

    let account = await db.accounts.get(ACCOUNTS.PRIMARY);
    expect(account?.balance).toBe(1_200);

    const deletedCount = await useTransactionStore.getState().deleteImportBatch("batch-1");
    expect(deletedCount).toBe(2);

    account = await db.accounts.get(ACCOUNTS.PRIMARY);
    expect(account?.balance).toBe(1_000);
  });

  it("restores all account balances when bulk deleting mixed transactions", async () => {
    await createAccount(ACCOUNTS.PRIMARY, "Primary", 10_000);
    await createAccount(ACCOUNTS.DEST_B, "Savings", 2_000);

    const store = useTransactionStore.getState();
    const incomeId = await store.createTransaction({
      accountId: ACCOUNTS.PRIMARY,
      type: "income",
      amount: 500,
      description: "Refund",
      date: new Date("2025-01-12T00:00:00.000Z"),
    });
    const transferId = await store.createTransaction({
      accountId: ACCOUNTS.PRIMARY,
      type: "transfer",
      amount: 300,
      transferToAccountId: ACCOUNTS.DEST_B,
      description: "Savings transfer",
      date: new Date("2025-01-13T00:00:00.000Z"),
    });
    const expenseId = await store.createTransaction({
      accountId: ACCOUNTS.PRIMARY,
      type: "expense",
      amount: 100,
      description: "Groceries",
      date: new Date("2025-01-14T00:00:00.000Z"),
    });

    let accountA = await db.accounts.get(ACCOUNTS.PRIMARY);
    let accountB = await db.accounts.get(ACCOUNTS.DEST_B);
    expect(accountA?.balance).toBe(10_100);
    expect(accountB?.balance).toBe(2_300);

    await store.deleteTransactions([incomeId, transferId, expenseId]);

    accountA = await db.accounts.get(ACCOUNTS.PRIMARY);
    accountB = await db.accounts.get(ACCOUNTS.DEST_B);
    expect(accountA?.balance).toBe(10_000);
    expect(accountB?.balance).toBe(2_000);
  });
});
