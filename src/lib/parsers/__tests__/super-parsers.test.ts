import { describe, expect, it } from "vitest";
import { australianSuperParser } from "../super/australian-super.parser";
import { uniSuperParser } from "../super/unisuper.parser";

describe("Super parser amount extraction", () => {
  it("parses UniSuper transaction amount from the amount token, not the date token", () => {
    const text = `
      UniSuper
      Statement Period: 01/07/2024 to 30/06/2025
      Total Account Balance: $10,000.00
      15/01/2025 Account adjustment $456.78
    `;

    const result = uniSuperParser.parse(text);
    const imported = result.transactions.find((t) =>
      (t.description ?? "").toLowerCase().includes("account adjustment")
    );

    expect(imported).toBeDefined();
    expect(imported?.amount).toBe(45678);
  });

  it("parses Australian Super table amount from the amount token, not the date token", () => {
    const text = `
      Australian Super
      Statement Period: 01/07/2024 to 30/06/2025
      Total Account Balance: $9,000.00
      15/01/2025 Adjustment $321.09
    `;

    const result = australianSuperParser.parse(text);
    const imported = result.transactions.find((t) =>
      (t.description ?? "").toLowerCase().includes("adjustment")
    );

    expect(imported).toBeDefined();
    expect(imported?.amount).toBe(32109);
  });
});
