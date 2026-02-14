import { describe, expect, it } from "vitest";
import { upParser } from "../bank/up.parser";

describe("Up Parser", () => {
  it("does not match generic 'up' text", () => {
    const text = `
      Payment status update
      Please top up your account balance
    `;
    expect(upParser.canParse(text)).toBe(false);
  });

  it("parses round-up transfers as transactions", () => {
    const statement = `
      Up Bank
      Statement Period: 01/01/2025 to 31/01/2025
      15 Jan Round Up Transfer 1.00 100.00
    `;

    const result = upParser.parse(statement);
    expect(result.success).toBe(true);
    expect(result.transactions.length).toBeGreaterThan(0);
    expect(result.transactions[0].description).toContain("Round Up Transfer");
  });
});
