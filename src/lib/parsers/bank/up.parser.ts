// Up Bank Statement Parser

import type { BankParser, ParseResult, ParsedTransaction } from '../types';
import {
  extractDateFromLine,
  extractAmounts,
  extractStatementPeriod,
  analyzeTransaction,
  shouldSkipLine,
  createTransactionKey,
  normalizeDateToStatementPeriod,
  toCents,
  Decimal,
} from '../utils';

/**
 * Parser for Up Bank statements (Australia)
 *
 * Up Bank is a digital neobank with modern statement formats.
 * Key features:
 * - Often includes emojis in transaction descriptions
 * - Clean, modern format
 * - Round-up transactions
 */
export class UpParser implements BankParser {
  name = 'Up Bank';
  bankCode = 'up';

  // Patterns to identify Up Bank statements
  private readonly identifiers = [
    /\bUp Bank\b/i,
    /up\.com\.au/i,
    /Up Banking/i,
    /Up Saver/i,
    /Up Everyday/i,
  ];

  // Additional Up-specific skip patterns
  private readonly upSkipPatterns = [
    /^Instant\s+Transfer/i,
    /^Cover\s+from/i,
  ];

  canParse(text: string): boolean {
    return this.identifiers.some((pattern) => pattern.test(text));
  }

  parse(text: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract account information
    const accountInfo = this.extractAccountInfo(text);

    // Extract statement period
    const statementPeriod = extractStatementPeriod(text);

    // Split into lines and process
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

    let currentYear = new Date().getFullYear();
    if (statementPeriod?.end) {
      currentYear = statementPeriod.end.getFullYear();
    }

    // Track for duplicate detection
    const seenTransactions = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Try to parse as transaction line
      const transaction = this.parseTransactionLine(line, currentYear);

      if (transaction) {
        transaction.date = normalizeDateToStatementPeriod(
          transaction.date,
          transaction.rawText ?? line,
          statementPeriod
        );
        const key = createTransactionKey(transaction.date, transaction.description, transaction.amount);

        if (!seenTransactions.has(key)) {
          seenTransactions.add(key);
          transactions.push(transaction);
        }
      }
    }

    // Sort by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (transactions.length === 0) {
      errors.push('No transactions found in the document. Please ensure this is a valid Up Bank statement.');
    }

    return {
      success: transactions.length > 0,
      transactions,
      accountName: accountInfo.name,
      accountNumber: accountInfo.number,
      statementPeriod,
      errors,
      warnings,
    };
  }

  private extractAccountInfo(text: string): { name?: string; number?: string } {
    let name: string | undefined;
    let number: string | undefined;

    // Try to find account name
    const namePatterns = [
      /Account(?:\s+Name)?[:\s]+([A-Z][A-Za-z\s]+?)(?:\n|Account|BSB)/i,
      /(Up Saver|Up Everyday|Spending|Savers)/i,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        name = match[1].trim();
        break;
      }
    }

    // Try to find account number (last 4 digits only for privacy)
    // Up Bank BSB is 633-123
    const numberPatterns = [
      /Account(?:\s+Number)?[:\s]+[\d\s-]*(\d{4})\b/i,
      /Account[:\s]+\*{4,}(\d{4})/i,
      /BSB[:\s]+633[\s-]?123[\s,]+(?:Account|Acc)[:\s]+\d*(\d{4})\b/i,
    ];

    for (const pattern of numberPatterns) {
      const match = text.match(pattern);
      if (match) {
        number = match[1];
        break;
      }
    }

    return { name, number };
  }

  private parseTransactionLine(line: string, defaultYear: number): ParsedTransaction | null {
    // Skip header lines and non-transaction lines
    if (shouldSkipLine(line)) {
      return null;
    }

    // Skip Up-specific non-transaction lines (but not round-up transactions)
    // Round-ups are valid transactions we want to capture
    if (this.upSkipPatterns.some((pattern) => pattern.test(line))) {
      return null;
    }

    // Try to extract date from the beginning of the line
    const dateResult = extractDateFromLine(line, defaultYear);

    if (!dateResult) {
      return null;
    }

    const { date, remainingText } = dateResult;

    // Extract amounts from the line
    const amounts = extractAmounts(remainingText);

    if (amounts.length === 0) {
      return null;
    }

    // Determine transaction amount and balance
    let transactionAmount = new Decimal(0);
    let balance: number | undefined;
    let explicitlyDebit = false;
    let explicitlyCredit = false;

    if (amounts.length >= 2) {
      // Last amount is usually balance
      balance = toCents(amounts[amounts.length - 1].value);

      // First amount(s) are transaction amount(s)
      for (let i = 0; i < amounts.length - 1; i++) {
        const amt = amounts[i];
        if (amt.isDebit) {
          transactionAmount = amt.value;
          explicitlyDebit = true;
        } else if (amt.isCredit) {
          transactionAmount = amt.value;
          explicitlyCredit = true;
        } else {
          transactionAmount = amt.value;
        }
      }
    } else if (amounts.length === 1) {
      // Single amount
      transactionAmount = amounts[0].value;
      explicitlyDebit = amounts[0].isDebit;
      explicitlyCredit = amounts[0].isCredit;
    }

    if (transactionAmount.isZero()) {
      return null;
    }

    // Extract description - preserve emojis for Up Bank
    const description = this.cleanDescriptionWithEmojis(remainingText);

    if (!description) {
      return null;
    }

    // Analyze transaction to determine type and sign
    const analysis = analyzeTransaction(
      description,
      transactionAmount,
      explicitlyDebit,
      explicitlyCredit
    );

    return {
      date,
      description,
      amount: toCents(analysis.signedAmount),
      type: analysis.type,
      balance,
      rawText: line,
    };
  }

  /**
   * Clean description while preserving emojis (Up Bank uses them)
   */
  private cleanDescriptionWithEmojis(text: string, maxLength = 200): string {
    // Remove amounts but keep emojis
    let description = text
      .replace(/\$?\s*[\d,]+\.\d{2}\s*(DR|CR|D|C)?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Truncate if necessary
    if (description.length > maxLength) {
      description = description.substring(0, maxLength - 3) + '...';
    }

    return description;
  }
}

// Export singleton instance
export const upParser = new UpParser();
