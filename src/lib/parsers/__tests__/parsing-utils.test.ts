import { describe, expect, it } from "vitest";
import { normalizeDateToStatementPeriod } from "../utils";

describe("normalizeDateToStatementPeriod", () => {
  const statementPeriod = {
    start: new Date(2024, 11, 15), // 15 Dec 2024
    end: new Date(2025, 0, 15), // 15 Jan 2025
  };

  it("re-anchors yearless Dec dates into the statement period year", () => {
    const parsedWithDefaultYear = new Date(2025, 11, 20); // 20 Dec 2025
    const normalized = normalizeDateToStatementPeriod(
      parsedWithDefaultYear,
      "20 Dec Groceries 25.00 1000.00",
      statementPeriod
    );

    expect(normalized.getFullYear()).toBe(2024);
    expect(normalized.getMonth()).toBe(11);
    expect(normalized.getDate()).toBe(20);
  });

  it("does not override dates when the line contains an explicit year", () => {
    const parsedDate = new Date(2025, 11, 20); // 20 Dec 2025
    const normalized = normalizeDateToStatementPeriod(
      parsedDate,
      "20 Dec 2025 Groceries 25.00 1000.00",
      statementPeriod
    );

    expect(normalized.getFullYear()).toBe(2025);
  });
});
