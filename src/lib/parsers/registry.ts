// Bank parser registry - manages all available parsers

import type { BankParser, ParseResult, PDFContent } from "./types";

export class ParserRegistry {
  private parsers: BankParser[] = [];

  register(parser: BankParser): void {
    // Prevent duplicate registration
    if (!this.parsers.find((p) => p.bankCode === parser.bankCode)) {
      this.parsers.push(parser);
    }
  }

  getAll(): BankParser[] {
    return [...this.parsers];
  }

  getByBankCode(code: string): BankParser | undefined {
    return this.parsers.find((p) => p.bankCode === code);
  }

  /**
   * Find all parsers that can handle the given content
   */
  findParsers(text: string): BankParser[] {
    return this.parsers.filter((parser) => parser.canParse(text));
  }

  /**
   * Score a parse result for parser auto-detection
   */
  private scoreParseResult(result: ParseResult): number {
    const successScore = result.success ? 1000 : 0;
    const transactionScore = result.transactions.length * 10;
    const errorPenalty = result.errors.length * 50;
    const warningPenalty = result.warnings.length * 5;
    return successScore + transactionScore - errorPenalty - warningPenalty;
  }

  /**
   * Parse PDF content using the appropriate parser
   */
  parse(content: PDFContent, preferredBank?: string): ParseResult {
    const text = content.fullText;

    // Try preferred bank first if specified
    if (preferredBank) {
      const parser = this.getByBankCode(preferredBank);
      if (parser && parser.canParse(text)) {
        return parser.parse(text);
      }
    }

    // Auto-detect bank by evaluating all candidates
    const candidates = this.findParsers(text);

    if (candidates.length === 0) {
      return {
        success: false,
        transactions: [],
        errors: [
          "Unable to detect bank format. Please select your bank manually or ensure you uploaded a valid bank statement.",
        ],
        warnings: [],
      };
    }

    // Fast path: only one candidate
    if (candidates.length === 1) {
      return candidates[0].parse(text);
    }

    // Evaluate all candidate parsers and choose the strongest result
    let bestResult: ParseResult | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const parser of candidates) {
      try {
        const result = parser.parse(text);
        const score = this.scoreParseResult(result);
        if (score > bestScore) {
          bestScore = score;
          bestResult = result;
        }
      } catch {
        // Ignore failed parser and continue to other candidates
      }
    }

    if (!bestResult) {
      return {
        success: false,
        transactions: [],
        errors: [
          "Detected a statement format but failed to parse transactions. Please try selecting your institution manually.",
        ],
        warnings: [],
      };
    }

    return bestResult;
  }
}

// Singleton instance
export const parserRegistry = new ParserRegistry();
