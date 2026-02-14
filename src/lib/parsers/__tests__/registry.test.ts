import { describe, expect, it } from "vitest";
import { ParserRegistry } from "../registry";
import type { BankParser, PDFContent } from "../types";

const sampleContent: PDFContent = {
  pages: [],
  fullText: "Sample statement text",
};

function buildResult(success: boolean, transactions: number) {
  return {
    success,
    transactions: Array.from({ length: transactions }, (_, index) => ({
      date: new Date(2025, 0, index + 1),
      description: `tx-${index}`,
      amount: 1000,
      type: "expense" as const,
    })),
    errors: success ? [] : ["parse failed"],
    warnings: [],
  };
}

describe("ParserRegistry", () => {
  it("chooses the strongest parse result among multiple matching parsers", () => {
    const registry = new ParserRegistry();

    const broadParser: BankParser = {
      name: "Broad parser",
      bankCode: "broad",
      canParse: () => true,
      parse: () => buildResult(false, 0),
    };

    const strongParser: BankParser = {
      name: "Strong parser",
      bankCode: "strong",
      canParse: () => true,
      parse: () => buildResult(true, 3),
    };

    registry.register(broadParser);
    registry.register(strongParser);

    const result = registry.parse(sampleContent);
    expect(result.success).toBe(true);
    expect(result.transactions).toHaveLength(3);
  });

  it("returns a structured error when no parser can detect the statement", () => {
    const registry = new ParserRegistry();
    registry.register({
      name: "Never matches",
      bankCode: "never",
      canParse: () => false,
      parse: () => buildResult(false, 0),
    });

    const result = registry.parse(sampleContent);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Unable to detect bank format");
  });
});
