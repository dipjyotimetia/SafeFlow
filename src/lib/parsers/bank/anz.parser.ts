// ANZ Bank Statement Parser

import type { BankParser, ParseResult, ParsedTransaction } from '../types';

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
export class ANZParser implements BankParser {
  name = 'ANZ Bank';
  bankCode = 'anz';

  // Patterns to identify ANZ statements
  private readonly identifiers = [
    /ANZ/i,
    /Australia and New Zealand Banking/i,
    /anz\.com\.au/i,
    /ANZ Access Advantage/i,
    /ANZ Online Saver/i,
    /ANZ Plus/i,
    /ANZ Save/i,
  ];

  // Date patterns for Australian format
  private readonly datePatterns = [
    // DD/MM/YYYY or DD/MM/YY
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
    // DD MMM YYYY or DD MMM YY
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i,
    // DD-MM-YYYY
    /(\d{1,2})-(\d{1,2})-(\d{2,4})/,
  ];

  // Amount pattern - captures Australian currency format
  private readonly amountPattern = /\$?\s*([\d,]+\.\d{2})/;

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
    const statementPeriod = this.extractStatementPeriod(text);

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
        // Create a unique key to detect duplicates
        const key = `${transaction.date.toISOString()}_${transaction.description}_${transaction.amount}`;

        if (!seenTransactions.has(key)) {
          seenTransactions.add(key);
          transactions.push(transaction);
        }
      }
    }

    // Sort by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (transactions.length === 0) {
      errors.push('No transactions found in the document. Please ensure this is a valid ANZ bank statement.');
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
      /ANZ\s+(Access Advantage|Online Saver|Plus|Save|Everyday|Smart Choice)/i,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        name = match[1].trim();
        break;
      }
    }

    // Try to find account number (last 4 digits only for privacy)
    const numberPatterns = [
      /Account(?:\s+Number)?[:\s]+[\d\s-]*(\d{4})\b/i,
      /Account[:\s]+\*{4,}(\d{4})/i,
      /(?:BSB[:\s]+\d{3}[\s-]?\d{3}[,\s]+)?(?:Account[:\s]+)?(\d{4})\b/,
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

  private extractStatementPeriod(text: string): { start: Date; end: Date } | undefined {
    // Common patterns for statement period
    const periodPatterns = [
      /Statement\s+Period[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}\s+\w+\s+\d{4})\s*(?:to|-)\s*(\d{1,2}\s+\w+\s+\d{4})/i,
      /Period[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ];

    for (const pattern of periodPatterns) {
      const match = text.match(pattern);
      if (match) {
        const start = this.parseDate(match[1], new Date().getFullYear());
        const end = this.parseDate(match[2], new Date().getFullYear());
        if (start && end) {
          return { start, end };
        }
      }
    }

    return undefined;
  }

  private parseTransactionLine(line: string, defaultYear: number): ParsedTransaction | null {
    // Skip header lines and non-transaction lines
    const skipPatterns = [
      /^Date\s+Description/i,
      /^Opening Balance/i,
      /^Closing Balance/i,
      /^Balance Carried Forward/i,
      /^Statement Period/i,
      /^Page\s+\d+/i,
      /^BSB/i,
      /^Account Number/i,
    ];

    if (skipPatterns.some((pattern) => pattern.test(line))) {
      return null;
    }

    // Try to extract date from the beginning of the line
    let date: Date | null = null;
    let remainingLine = line;

    for (const pattern of this.datePatterns) {
      const match = line.match(pattern);
      if (match && match.index !== undefined && match.index < 15) {
        date = this.parseDate(match[0], defaultYear);
        if (date) {
          remainingLine = line.substring(match.index + match[0].length).trim();
          break;
        }
      }
    }

    if (!date) {
      return null;
    }

    // Extract amounts from the line
    const amounts = this.extractAmounts(remainingLine);

    if (amounts.length === 0) {
      return null;
    }

    // Determine debit, credit, and balance based on position and format
    // ANZ typically shows: Description | Debit | Credit | Balance
    let amount = 0;
    let balance: number | undefined;

    if (amounts.length >= 2) {
      // Multiple amounts - likely has debit/credit and balance
      // Last amount is usually balance
      balance = amounts[amounts.length - 1].value;

      // Check for debit (money out) vs credit (money in)
      // Debits are negative, credits are positive
      for (let i = 0; i < amounts.length - 1; i++) {
        const amt = amounts[i];
        if (amt.isDebit || (i === 0 && amounts.length === 3)) {
          amount = -amt.value; // Debit is negative
        } else {
          amount = amt.value; // Credit is positive
        }
      }
    } else if (amounts.length === 1) {
      // Single amount - determine direction from context
      amount = this.determineAmountSign(remainingLine, amounts[0].value);
    }

    if (amount === 0) {
      return null;
    }

    // Extract description (text before first amount)
    const description = this.extractDescription(remainingLine);

    if (!description) {
      return null;
    }

    return {
      date,
      description,
      amount: Math.round(amount * 100), // Convert to cents
      balance: balance ? Math.round(balance * 100) : undefined,
      rawText: line,
    };
  }

  private parseDate(dateStr: string, defaultYear: number): Date | null {
    // DD/MM/YYYY or DD/MM/YY
    let match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
      let year = parseInt(match[3]);
      if (year < 100) {
        year += year > 50 ? 1900 : 2000;
      }
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[1]);
      return new Date(year, month, day);
    }

    // DD MMM YYYY
    match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{2,4})?/i);
    if (match) {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      let year = match[3] ? parseInt(match[3]) : defaultYear;
      if (year < 100) {
        year += year > 50 ? 1900 : 2000;
      }
      const month = months[match[2].toLowerCase().substring(0, 3)];
      const day = parseInt(match[1]);
      return new Date(year, month, day);
    }

    // DD-MM-YYYY
    match = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
    if (match) {
      let year = parseInt(match[3]);
      if (year < 100) {
        year += year > 50 ? 1900 : 2000;
      }
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[1]);
      return new Date(year, month, day);
    }

    return null;
  }

  private extractAmounts(text: string): Array<{ value: number; isDebit: boolean }> {
    const amounts: Array<{ value: number; isDebit: boolean }> = [];

    // Pattern to find amounts with optional debit/credit indicators
    const amountRegex = /(-?\$?\s*[\d,]+\.\d{2})(?:\s*(DR|CR|D|C))?/gi;

    let match;
    while ((match = amountRegex.exec(text)) !== null) {
      const amountStr = match[1].replace(/[$,\s]/g, '');
      const value = Math.abs(parseFloat(amountStr));
      const indicator = match[2]?.toUpperCase();

      // DR/D indicates debit (money out), CR/C indicates credit (money in)
      const isDebit = indicator === 'DR' || indicator === 'D' || amountStr.startsWith('-');

      if (!isNaN(value) && value > 0) {
        amounts.push({ value, isDebit });
      }
    }

    return amounts;
  }

  private determineAmountSign(text: string, amount: number): number {
    // Look for keywords that indicate debit or credit
    const debitKeywords = [
      /withdrawal/i,
      /purchase/i,
      /payment/i,
      /debit/i,
      /transfer out/i,
      /eftpos/i,
      /atm/i,
      /fee/i,
      /charge/i,
      /direct debit/i,
    ];

    const creditKeywords = [
      /deposit/i,
      /credit/i,
      /transfer in/i,
      /salary/i,
      /wages/i,
      /interest paid/i,
      /refund/i,
    ];

    for (const pattern of debitKeywords) {
      if (pattern.test(text)) {
        return -amount;
      }
    }

    for (const pattern of creditKeywords) {
      if (pattern.test(text)) {
        return amount;
      }
    }

    // Default to debit (expense) as most transactions are expenses
    return -amount;
  }

  private extractDescription(text: string): string {
    // Remove amounts and clean up the description
    let description = text
      .replace(/\$?\s*[\d,]+\.\d{2}\s*(DR|CR|D|C)?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit length
    if (description.length > 200) {
      description = description.substring(0, 197) + '...';
    }

    return description;
  }
}

// Export singleton instance
export const anzParser = new ANZParser();
