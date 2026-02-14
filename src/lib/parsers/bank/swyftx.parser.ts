// Swyftx Crypto Exchange Statement Parser

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
 * Parser for Swyftx statements (Australian crypto exchange)
 *
 * Swyftx statements typically include:
 * - Date/Time
 * - Transaction type (Buy, Sell, Deposit, Withdrawal, Staking, Trade)
 * - Cryptocurrency symbol
 * - Amount in crypto
 * - AUD value
 * - Fees
 */
export class SwyftxParser implements BankParser {
  name = 'Swyftx';
  bankCode = 'swyftx';

  // Patterns to identify Swyftx statements
  private readonly identifiers = [
    /Swyftx/i,
    /swyftx\.com\.au/i,
    /swyftx\.com/i,
  ];

  // Additional Swyftx-specific skip patterns
  private readonly swyftxSkipPatterns = [
    /^Portfolio\s+Summary/i,
    /^Asset\s+Holdings/i,
    /^Tax\s+Report/i,
    /^Staking\s+Rewards\s+Summary/i,
  ];

  // Transaction type keywords
  private readonly depositKeywords = [
    /deposit/i,
    /aud\s+deposit/i,
    /bank\s+transfer/i,
    /payid/i,
    /osko/i,
  ];

  private readonly withdrawalKeywords = [
    /withdraw/i,
    /aud\s+withdraw/i,
    /bank\s+payout/i,
  ];

  private readonly buyKeywords = [
    /\bbuy\b/i,
    /purchase/i,
    /market\s+buy/i,
    /instant\s+buy/i,
  ];

  private readonly sellKeywords = [
    /\bsell\b/i,
    /market\s+sell/i,
    /instant\s+sell/i,
  ];

  private readonly stakingKeywords = [
    /staking/i,
    /stake\s+reward/i,
    /earn/i,
  ];

  private readonly feeKeywords = [
    /fee/i,
    /trading\s+fee/i,
    /spread/i,
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
      errors.push('No transactions found in the document. Please ensure this is a valid Swyftx statement.');
    }

    // Add warning about crypto tax implications
    if (transactions.length > 0) {
      warnings.push('Note: Crypto transactions may have capital gains tax implications. Please consult a tax professional.');
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

    // Try to find account name/email
    const namePatterns = [
      /Account[:\s]+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/i,
      /User[:\s]+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/i,
      /Email[:\s]+([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/i,
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Mask email for privacy
        const email = match[1];
        const [user, domain] = email.split('@');
        name = `${user.substring(0, 3)}***@${domain}`;
        break;
      }
    }

    // Try to find user ID
    const numberPatterns = [
      /User\s*ID[:\s]+(\d{4,})/i,
      /Account\s*ID[:\s]+(\d{4,})/i,
      /Member[:\s]+(\d{4,})/i,
    ];

    for (const pattern of numberPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Only keep last 4 digits
        const fullNumber = match[1];
        number = fullNumber.slice(-4);
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

    // Skip Swyftx-specific non-transaction lines
    if (this.swyftxSkipPatterns.some((pattern) => pattern.test(line))) {
      return null;
    }

    // Try to extract date from the beginning of the line
    const dateResult = extractDateFromLine(line, defaultYear);

    if (!dateResult) {
      return null;
    }

    const { date, remainingText } = dateResult;

    // Extract amounts from the line (look for AUD amounts)
    const amounts = extractAmounts(remainingText);

    if (amounts.length === 0) {
      return null;
    }

    // For crypto, we focus on the AUD value
    let baseAmount = new Decimal(0);

    // Find the most likely AUD amount
    const audMatch = remainingText.match(/\$?\s*([\d,]+\.\d{2})\s*AUD/i);
    if (audMatch) {
      baseAmount = new Decimal(audMatch[1].replace(/,/g, ''));
    } else if (amounts.length > 0) {
      // Use the first reasonable amount
      baseAmount = amounts[0].value;
    }

    // Analyze transaction to determine sign and type
    const { signedAmount, type } = this.analyzeCryptoTransaction(remainingText, baseAmount);

    if (signedAmount.isZero()) {
      return null;
    }

    // Extract description with crypto info
    let description = cleanDescription(remainingText);

    // Try to extract crypto symbol
    const cryptoMatch = remainingText.match(/\b(BTC|ETH|XRP|LTC|BCH|ADA|DOT|LINK|SOL|DOGE|SHIB|MATIC|AVAX|UNI|ATOM|[A-Z]{3,5})\b/);
    if (cryptoMatch && !description.includes(cryptoMatch[1])) {
      description = `${cryptoMatch[1]} - ${description}`;
    }

    if (!description) {
      return null;
    }

    return {
      date,
      description,
      amount: toCents(signedAmount),
      type,
      rawText: line,
    };
  }

  /**
   * Analyze crypto transaction to determine sign and type
   */
  private analyzeCryptoTransaction(text: string, amount: Decimal): { signedAmount: Decimal; type: ParsedTransactionType } {
    // Deposits are transfers (AUD going into crypto account)
    for (const pattern of this.depositKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.abs(), type: 'transfer' };
      }
    }

    // Sells result in AUD (income from selling crypto)
    for (const pattern of this.sellKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.abs(), type: 'income' };
      }
    }

    // Staking rewards are income
    for (const pattern of this.stakingKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.abs(), type: 'income' };
      }
    }

    // Withdrawals are transfers (AUD leaving account)
    for (const pattern of this.withdrawalKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.negated(), type: 'transfer' };
      }
    }

    // Buys spend AUD (expense - buying crypto)
    for (const pattern of this.buyKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.negated(), type: 'expense' };
      }
    }

    // Fees are expenses
    for (const pattern of this.feeKeywords) {
      if (pattern.test(text)) {
        return { signedAmount: amount.negated(), type: 'expense' };
      }
    }

    // Default to expense (buying crypto)
    return { signedAmount: amount.negated(), type: 'expense' };
  }
}

// Export singleton instance
export const swyftxParser = new SwyftxParser();
