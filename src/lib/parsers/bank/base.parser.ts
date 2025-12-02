// Abstract base parser for Australian bank statements
// Provides common functionality that can be shared across bank-specific parsers

import type { BankParser, ParseResult, ParsedTransaction, ParsedTransactionType } from '../types';
import {
  extractDateFromLine,
  extractAmounts,
  extractStatementPeriod,
  analyzeTransaction,
  cleanDescription,
  shouldSkipLine,
  createTransactionKey,
  toCents,
  Decimal,
} from '../utils';

/**
 * Configuration for a bank parser
 */
export interface BankParserConfig {
  /** Display name of the bank */
  name: string;
  /** Short code for the bank (e.g., 'cba', 'anz') */
  bankCode: string;
  /** Regex patterns to identify this bank's statements */
  identifiers: RegExp[];
  /** Additional patterns for lines to skip (bank-specific) */
  skipPatterns?: RegExp[];
  /** Patterns to extract account name */
  accountNamePatterns?: RegExp[];
  /** Patterns to extract account number (should capture last 4 digits) */
  accountNumberPatterns?: RegExp[];
}

/**
 * Abstract base class for Australian bank statement parsers
 *
 * Subclasses should:
 * 1. Call super() with their configuration
 * 2. Optionally override parseTransactionLine for bank-specific formats
 * 3. Optionally override extractAccountInfo for bank-specific account extraction
 */
export abstract class BaseParser implements BankParser {
  readonly name: string;
  readonly bankCode: string;

  protected readonly identifiers: RegExp[];
  protected readonly skipPatterns: RegExp[];
  protected readonly accountNamePatterns: RegExp[];
  protected readonly accountNumberPatterns: RegExp[];

  constructor(config: BankParserConfig) {
    this.name = config.name;
    this.bankCode = config.bankCode;
    this.identifiers = config.identifiers;
    this.skipPatterns = config.skipPatterns || [];
    this.accountNamePatterns = config.accountNamePatterns || [];
    this.accountNumberPatterns = config.accountNumberPatterns || [];
  }

  /**
   * Check if this parser can handle the given PDF content
   */
  canParse(text: string): boolean {
    return this.identifiers.some((pattern) => pattern.test(text));
  }

  /**
   * Parse the PDF text content and extract transactions
   * Can be overridden for completely custom parsing logic
   */
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
      errors.push(`No transactions found in the document. Please ensure this is a valid ${this.name} statement.`);
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

  /**
   * Extract account information from the statement text
   * Override for bank-specific extraction logic
   */
  protected extractAccountInfo(text: string): { name?: string; number?: string } {
    let name: string | undefined;
    let number: string | undefined;

    // Try to find account name using configured patterns
    for (const pattern of this.accountNamePatterns) {
      const match = text.match(pattern);
      if (match) {
        name = match[1]?.trim();
        break;
      }
    }

    // Try to find account number (last 4 digits only for privacy)
    for (const pattern of this.accountNumberPatterns) {
      const match = text.match(pattern);
      if (match) {
        number = match[1];
        break;
      }
    }

    return { name, number };
  }

  /**
   * Parse a single transaction line
   * Override for bank-specific parsing logic
   */
  protected parseTransactionLine(line: string, defaultYear: number): ParsedTransaction | null {
    // Skip header lines and non-transaction lines
    if (shouldSkipLine(line)) {
      return null;
    }

    // Skip bank-specific non-transaction lines
    if (this.skipPatterns.some((pattern) => pattern.test(line))) {
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

    // Extract description
    const description = cleanDescription(remainingText);

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
   * Helper method to check if a line should be skipped
   * Combines base skip logic with bank-specific patterns
   */
  protected shouldSkipLine(line: string): boolean {
    if (shouldSkipLine(line)) {
      return true;
    }
    return this.skipPatterns.some((pattern) => pattern.test(line));
  }
}
