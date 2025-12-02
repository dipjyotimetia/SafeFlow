// ANZ Bank Statement Parser

import { BaseParser } from './base.parser';
import type { ParsedTransaction } from '../types';
import {
  extractDateFromLine,
  extractAmounts,
  analyzeTransaction,
  cleanDescription,
  shouldSkipLine,
  toCents,
  Decimal,
} from '../utils';

/**
 * Parser for ANZ Bank statements (Australia)
 *
 * ANZ statement formats vary but typically include:
 * - Date (DD/MM/YYYY or DD MMM YYYY)
 * - Description
 * - Debit amount (money out)
 * - Credit amount (money in)
 * - Balance
 */
export class ANZParser extends BaseParser {
  constructor() {
    super({
      name: 'ANZ Bank',
      bankCode: 'anz',
      identifiers: [
        /ANZ/i,
        /Australia and New Zealand Banking/i,
        /anz\.com\.au/i,
        /ANZ Access Advantage/i,
        /ANZ Online Saver/i,
        /ANZ Plus/i,
        /ANZ Save/i,
      ],
      accountNamePatterns: [
        /Account(?:\s+Name)?[:\s]+([A-Z][A-Za-z\s]+?)(?:\n|Account|BSB)/i,
        /ANZ\s+(Access Advantage|Online Saver|Plus|Save|Everyday|Smart Choice)/i,
      ],
      accountNumberPatterns: [
        /Account(?:\s+Number)?[:\s]+[\d\s-]*(\d{4})\b/i,
        /Account[:\s]+\*{4,}(\d{4})/i,
        /(?:BSB[:\s]+\d{3}[\s-]?\d{3}[,\s]+)?(?:Account[:\s]+)?(\d{4})\b/,
      ],
    });
  }

  /**
   * Override parseTransactionLine for ANZ-specific 3-column format handling
   */
  protected override parseTransactionLine(line: string, defaultYear: number): ParsedTransaction | null {
    // Skip header lines and non-transaction lines
    if (shouldSkipLine(line)) {
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

    // ANZ-specific: Handle 3-column format (Debit | Credit | Balance)
    let transactionAmount = new Decimal(0);
    let balance: number | undefined;
    let explicitlyDebit = false;
    let explicitlyCredit = false;

    if (amounts.length >= 2) {
      // Multiple amounts - likely has debit/credit and balance
      // Last amount is usually balance
      balance = toCents(amounts[amounts.length - 1].value);

      // Check for debit (money out) vs credit (money in)
      for (let i = 0; i < amounts.length - 1; i++) {
        const amt = amounts[i];

        if (amt.isDebit) {
          transactionAmount = amt.value;
          explicitlyDebit = true;
        } else if (amt.isCredit) {
          transactionAmount = amt.value;
          explicitlyCredit = true;
        } else if (i === 0 && amounts.length === 3) {
          // First column in 3-column format is usually debit
          transactionAmount = amt.value;
          explicitlyDebit = true;
        } else {
          transactionAmount = amt.value;
        }
      }
    } else if (amounts.length === 1) {
      // Single amount - will analyze based on description
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
}

// Export singleton instance
export const anzParser = new ANZParser();
