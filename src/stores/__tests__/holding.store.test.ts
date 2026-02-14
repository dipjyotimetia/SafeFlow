import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prices", () => ({
  fetchPrices: vi.fn(async () => new Map()),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { clearDatabase, db } from "@/lib/db";
import { useHoldingStore } from "../holding.store";

describe("Holding store transaction integrity", () => {
  const INVESTMENT_ACCOUNT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  beforeEach(async () => {
    await clearDatabase();
  });

  async function createAccount(id: string) {
    const now = new Date();
    await db.accounts.add({
      id,
      name: "Investment Account",
      type: "investment",
      balance: 0,
      currency: "AUD",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  it("records correct total amount for non-trade dividend transactions", async () => {
    await createAccount(INVESTMENT_ACCOUNT_ID);
    const store = useHoldingStore.getState();
    const holdingId = await store.createHolding({
      accountId: INVESTMENT_ACCOUNT_ID,
      symbol: "AAA",
      name: "AAA ETF",
      type: "etf",
      units: 10,
      costBasis: 10_000,
    });

    const txId = await store.addTransaction({
      holdingId,
      type: "dividend",
      units: 0,
      pricePerUnit: 500,
      fees: 0,
      date: new Date("2025-02-01T00:00:00.000Z"),
    });

    const tx = await db.investmentTransactions.get(txId);
    const holding = await db.holdings.get(holdingId);

    expect(tx?.totalAmount).toBe(500);
    expect(tx?.units).toBe(0);
    expect(holding?.units).toBe(10);
    expect(holding?.costBasis).toBe(10_000);
  });

  it("restores original cost basis when deleting a sell transaction", async () => {
    await createAccount(INVESTMENT_ACCOUNT_ID);
    const store = useHoldingStore.getState();
    const holdingId = await store.createHolding({
      accountId: INVESTMENT_ACCOUNT_ID,
      symbol: "BBB",
      name: "BBB ETF",
      type: "etf",
      units: 10,
      costBasis: 1_000,
    });

    const sellTxId = await store.addTransaction({
      holdingId,
      type: "sell",
      units: 2,
      pricePerUnit: 300,
      fees: 0,
      date: new Date("2025-02-02T00:00:00.000Z"),
    });

    let holding = await db.holdings.get(holdingId);
    const sellTx = await db.investmentTransactions.get(sellTxId);
    expect(holding?.units).toBe(8);
    expect(holding?.costBasis).toBe(800);
    expect(sellTx?.costBasisReduction).toBe(200);

    await store.deleteTransaction(sellTxId);

    holding = await db.holdings.get(holdingId);
    expect(holding?.units).toBe(10);
    expect(holding?.costBasis).toBe(1_000);
  });

  it("reverses fee cost basis impact on delete", async () => {
    await createAccount(INVESTMENT_ACCOUNT_ID);
    const store = useHoldingStore.getState();
    const holdingId = await store.createHolding({
      accountId: INVESTMENT_ACCOUNT_ID,
      symbol: "CCC",
      name: "CCC ETF",
      type: "etf",
      units: 5,
      costBasis: 5_000,
    });

    const feeTxId = await store.addTransaction({
      holdingId,
      type: "fee",
      units: 0,
      pricePerUnit: 120,
      fees: 0,
      date: new Date("2025-02-03T00:00:00.000Z"),
    });

    let holding = await db.holdings.get(holdingId);
    expect(holding?.costBasis).toBe(4_880);

    await store.deleteTransaction(feeTxId);

    holding = await db.holdings.get(holdingId);
    expect(holding?.costBasis).toBe(5_000);
  });

  it("recomputes holding deterministically when deleting earlier sell in mixed sequence", async () => {
    await createAccount(INVESTMENT_ACCOUNT_ID);
    const store = useHoldingStore.getState();
    const holdingId = await store.createHolding({
      accountId: INVESTMENT_ACCOUNT_ID,
      symbol: "DDD",
      name: "DDD ETF",
      type: "etf",
      units: 10,
      costBasis: 1_000,
    });

    const firstSellId = await store.addTransaction({
      holdingId,
      type: "sell",
      units: 4,
      pricePerUnit: 200,
      fees: 0,
      date: new Date("2025-02-01T00:00:00.000Z"),
    });

    await store.addTransaction({
      holdingId,
      type: "buy",
      units: 6,
      pricePerUnit: 150,
      fees: 0,
      date: new Date("2025-02-05T00:00:00.000Z"),
    });

    await store.addTransaction({
      holdingId,
      type: "sell",
      units: 3,
      pricePerUnit: 250,
      fees: 0,
      date: new Date("2025-02-10T00:00:00.000Z"),
    });

    await store.deleteTransaction(firstSellId);

    const holding = await db.holdings.get(holdingId);
    expect(holding?.units).toBe(13);
    expect(holding?.costBasis).toBe(1_544);
  });
});
