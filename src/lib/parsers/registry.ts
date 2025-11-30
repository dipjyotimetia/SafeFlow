// Bank parser registry - manages all available parsers

import type { BankParser, ParseResult, PDFContent } from './types';

class ParserRegistry {
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
   * Find the first parser that can handle the given content
   */
  findParser(text: string): BankParser | undefined {
    return this.parsers.find((parser) => parser.canParse(text));
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

    // Auto-detect bank
    const parser = this.findParser(text);
    if (!parser) {
      return {
        success: false,
        transactions: [],
        errors: ['Unable to detect bank format. Please select your bank manually or ensure you uploaded a valid bank statement.'],
        warnings: [],
      };
    }

    return parser.parse(text);
  }
}

// Singleton instance
export const parserRegistry = new ParserRegistry();
