// Raiz Invest Statement Parser

import type { BankParser, ParseResult, ParsedTransaction, ParsedTransactionType } from '../types';
import {
  extractDateFromLine,
  extractAmounts,
  extractStatementPeriod,
  cleanDescription,
  shouldSkipLine,
  createTransactionKey,
  normalizeDateToStatementPeriod,
  toCents,
  Decimal,
} from '../utils';

/**
 * Parser for Raiz Invest statements (Australia)
 *
 * Raiz is a micro-investing platform that handles:
 * - Deposits (money in)
 * - Withdrawals (money out)
 * - Investment returns/dividends
 * - Fees
 */
export class RaizParser implements BankParser {
  name = 'Raiz Invest';
  bankCode = 'raiz';

  // Patterns to identify Raiz statements
  private readonly identifiers = [
    /Raiz/i,
    /Raiz Invest/i,
    /raizinvest\.com\.au/i,
    /Raiz Rewards/i,
    /Round Up/i,
    /Micro-investing/i,
  ];

  // Additional Raiz-specific skip patterns
  private readonly raizSkipPatterns = [
    /^Portfolio\s+Summary/i,
    /^Investment\s+Breakdown/i,
    /^Asset\s+Allocation/i,
    /^ETF\s+Holdings/i,
  ];

  // Keywords for investment-specific transactions
  private readonly depositKeywords = [
    /deposit/i,
    /round[\s-]?up/i,
    /recurring/i,
    /transfer\s+in/i,
    /top[\s-]?up/i,
  ];

  private readonly withdrawalKeywords = [
    /withdraw/i,
    /transfer\s+out/i,
    /redemption/i,
  ];

  private readonly returnKeywords = [
    /dividend/i,
    /distribution/i,
    /return/i,
    /interest/i,
    /rebate/i,
  ];

  private readonly feeKeywords = [
    /fee/i,
    /charge/i,
    /management/i,
    /admin/i,
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
      errors.push('No transactions found in the document. Please ensure this is a valid Raiz Invest statement.');
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
      /Account(?:\s+Name)?[:\s]+([A-Z][A-Za-z\s]+?)(?:\n|Account)/i,
      /Portfolio[:\s]+([A-Za-z\s]+?)(?:\n|Account)/i,
      /(Raiz\s+(?:Conservative|Moderately Conservative|Moderate|Moderately Aggressive|Aggressive|Emerald|Sapphire))/i,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        name = match[1].trim();
        break;
      }
    }

    // Try to find account/member number
    const numberPatterns = [
      /Member(?:\s+Number)?[:\s]+[\d\s-]*(\d{4})\b/i,
      /Account(?:\s+Number)?[:\s]+[\d\s-]*(\d{4})\b/i,
      /Customer\s+ID[:\s]+\d*(\d{4})\b/i,
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

    // Skip Raiz-specific non-transaction lines
    if (this.raizSkipPatterns.some((pattern) => pattern.test(line))) {
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

    // Determine transaction type and sign based on keywords
    let balance: number | undefined;
    const baseAmount = amounts.length >= 2 ? amounts[0].value : amounts[0].value;

    if (amounts.length >= 2) {
      // Last amount might be balance
      balance = toCents(amounts[amounts.length - 1].value);
    }

    const { signedAmount, type } = this.analyzeRaizTransaction(remainingText, baseAmount);

    if (signedAmount.isZero()) {
      return null;
    }

    // Extract description
    const description = cleanDescription(remainingText);

    if (!description) {
      return null;
    }

    return {
      date,
      description,
      amount: toCents(signedAmount),
      type,
      balance,
      rawText: line,
    };
  }

  /**
   * Analyze Raiz transaction to determine type and sign
   */
  private analyzeRaizTransaction(text: string, amount: Decimal): { signedAmount: Decimal; type: ParsedTransactionType } {
    // Deposits are transfers (money moving between accounts)
    for (const pattern of this.depositKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.abs(), type: 'transfer' };
      }
    }

    // Returns/dividends are income
    for (const pattern of this.returnKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.abs(), type: 'income' };
      }
    }

    // Withdrawals are transfers (money moving out)
    for (const pattern of this.withdrawalKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.negated(), type: 'transfer' };
      }
    }

    // Fees are expenses
    for (const pattern of this.feeKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.negated(), type: 'expense' };
      }
    }

    // Default to transfer (deposit) for investment platforms
    return { signedAmount: amount.abs(), type: 'transfer' };
  }
}

// Export singleton instance
export const raizParser = new RaizParser();
