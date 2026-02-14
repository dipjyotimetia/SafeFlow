// Shared parsing utilities for bank statement parsers
// Uses decimal.js for precise financial calculations

import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Transaction type for parsed transactions
export type ParsedTransactionType = 'income' | 'expense' | 'transfer';

// Month name mapping for date parsing
const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Date patterns for Australian formats
export const DATE_PATTERNS = {
  // DD/MM/YYYY or DD/MM/YY
  slashFormat: /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
  // DD MMM YYYY or DD MMM YY
  monthNameFormat: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{2,4})?/i,
  // DD-MM-YYYY
  dashFormat: /(\d{1,2})-(\d{1,2})-(\d{2,4})/,
  // YYYY-MM-DD (ISO format)
  isoFormat: /(\d{4})-(\d{2})-(\d{2})/,
};

// Amount pattern - captures Australian currency format with optional indicators
export const AMOUNT_PATTERN = /(-?\$?\s*[\d,]+\.\d{2})(?:\s*(DR|CR|D|C))?/gi;

// Keywords indicating DEBIT transactions (money OUT - expenses)
export const DEBIT_KEYWORDS = [
  /\bwithdrawal\b/i,
  /\bwithdrew\b/i,
  /\bpurchase\b/i,
  /\bbought\b/i,
  /\bpayment\s+to\b/i,
  /\bpaid\s+to\b/i,
  /\bdebit\b/i,
  /\btransfer\s+out\b/i,
  /\btransfer\s+to\b/i,
  /\bsent\s+to\b/i,
  /\beftpos\b/i,
  /\bpos\s+purchase\b/i,
  /\batm\s+withdrawal\b/i,
  /\batm\b/i,
  /\bfee\b/i,
  /\bfees\b/i,
  /\bcharge\b/i,
  /\bcharges\b/i,
  /\bdirect\s+debit\b/i,
  /\bbpay\b/i,
  /\bbill\s+payment\b/i,
  /\bpay\s+anyone\b/i,
  /\bosko\s+payment\b/i,
  /\bosko\s+to\b/i,
  /\bnpp\s+payment\b/i,
  /\bpaypal\s+payment\b/i,
  /\bonline\s+purchase\b/i,
  /\bcard\s+purchase\b/i,
  /\bvisa\s+purchase\b/i,
  /\bmastercard\s+purchase\b/i,
  /\bsubscription\b/i,
  /\bmonthly\s+fee\b/i,
  /\baccount\s+fee\b/i,
  /\bservice\s+fee\b/i,
  /\boverdrawn\s+fee\b/i,
  /\bdishonour\s+fee\b/i,
  /\bloan\s+repayment\b/i,
  /\bmortgage\b/i,
  /\brent\s+payment\b/i,
  /\butility\b/i,
  /\belectricity\b/i,
  /\bgas\s+bill\b/i,
  /\bwater\s+bill\b/i,
  /\bphone\s+bill\b/i,
  /\binternet\s+bill\b/i,
  /\binsurance\b/i,
];

// Keywords indicating CREDIT transactions (money IN - income)
export const CREDIT_KEYWORDS = [
  /\bdeposit\b/i,
  /\bdeposited\b/i,
  /\bcredit\b/i,
  /\bcredited\b/i,
  /\btransfer\s+in\b/i,
  /\btransfer\s+from\b/i,
  /\breceived\s+from\b/i,
  /\bfrom\s+.+\s+to\s+self\b/i,
  /\bsalary\b/i,
  /\bwage[s]?\b/i,
  /\bpay\s*(?:roll|slip)?\b/i,
  /\bpayroll\b/i,
  /\bincome\b/i,
  /\binterest\s+paid\b/i,
  /\binterest\s+credit\b/i,
  /\binterest\s+earned\b/i,
  /\bbonus\s+interest\b/i,
  /\brefund\b/i,
  /\brebate\b/i,
  /\bcashback\b/i,
  /\bcash\s+back\b/i,
  /\bdividend\b/i,
  /\bdistribution\b/i,
  /\btax\s+refund\b/i,
  /\bgst\s+refund\b/i,
  /\bclaim\s+paid\b/i,
  /\breimbursement\b/i,
  /\bpension\b/i,
  /\bcentrelink\b/i,
  /\bgovernment\s+payment\b/i,
  /\ballowance\b/i,
  /\bincoming\s+transfer\b/i,
  /\bosko\s+from\b/i,
  /\bnpp\s+from\b/i,
  /\bpaypal\s+received\b/i,
  /\bsold\b/i,
  /\bsale\s+proceeds\b/i,
  /\breversal\b/i,
  /\bcorrection\s+credit\b/i,
];

// Keywords indicating TRANSFER transactions (between own accounts)
export const TRANSFER_KEYWORDS = [
  /\btransfer\s+(?:to|from)\s+(?:my|own|self|savings?|cheque|transaction)\b/i,
  /\btfr\s+(?:to|from)\s+(?:my|own|savings?|cheque)\b/i,
  /\binternal\s+transfer\b/i,
  /\baccount\s+transfer\b/i,
  /\bbetween\s+accounts?\b/i,
  /\bsweep\b/i,
  /\bround[\s-]?up\b/i,
  /\bsavings\s+transfer\b/i,
  /\bgoal\s+transfer\b/i,
  /\bpocket\s+transfer\b/i,
  /\bsaver\s+transfer\b/i,
  /\blink(?:ed)?\s+account\b/i,
];

// Common statement lines to skip
export const SKIP_PATTERNS = [
  /^Date\s+(Description|Transaction|Details)/i,
  /^Transaction\s+Date/i,
  /^Opening\s+Balance/i,
  /^Closing\s+Balance/i,
  /^Balance\s+Carried\s+Forward/i,
  /^Balance\s+Brought\s+Forward/i,
  /^Statement\s+Period/i,
  /^Page\s+\d+/i,
  /^BSB\s*:/i,
  /^Account\s+(Number|No\.?)\s*:/i,
  /^Credit\s+Limit/i,
  /^Available\s+(Balance|Credit|Funds)/i,
  /^Pending\s+Transactions?/i,
  /^Total\s+(Debits?|Credits?)/i,
  /^Interest\s+Rate/i,
  /^Statement\s+Number/i,
  /^ABN\s*:/i,
  /^\s*Debit\s+Credit\s+Balance/i,
  /^\s*Date\s+Debit\s+Credit/i,
];

/**
 * Parse an Australian date string into a Date object
 * Supports DD/MM/YYYY, DD MMM YYYY, DD-MM-YYYY, YYYY-MM-DD formats
 */
export function parseAustralianDate(dateStr: string, defaultYear?: number): Date | null {
  const currentYear = defaultYear ?? new Date().getFullYear();

  // Try DD/MM/YYYY or DD/MM/YY
  let match = dateStr.match(DATE_PATTERNS.slashFormat);
  if (match) {
    let year = parseInt(match[3]);
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }
    const month = parseInt(match[2]) - 1;
    const day = parseInt(match[1]);
    if (isValidDate(year, month, day)) {
      return new Date(year, month, day);
    }
  }

  // Try DD MMM YYYY
  match = dateStr.match(DATE_PATTERNS.monthNameFormat);
  if (match) {
    let year = match[3] ? parseInt(match[3]) : currentYear;
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }
    const monthName = match[2].toLowerCase().substring(0, 3);
    const month = MONTH_MAP[monthName];
    const day = parseInt(match[1]);
    if (month !== undefined && isValidDate(year, month, day)) {
      return new Date(year, month, day);
    }
  }

  // Try DD-MM-YYYY
  match = dateStr.match(DATE_PATTERNS.dashFormat);
  if (match) {
    let year = parseInt(match[3]);
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }
    const month = parseInt(match[2]) - 1;
    const day = parseInt(match[1]);
    if (isValidDate(year, month, day)) {
      return new Date(year, month, day);
    }
  }

  // Try YYYY-MM-DD (ISO format)
  match = dateStr.match(DATE_PATTERNS.isoFormat);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const day = parseInt(match[3]);
    if (isValidDate(year, month, day)) {
      return new Date(year, month, day);
    }
  }

  return null;
}

/**
 * Validate date components
 */
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 0 || month > 11) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  // Check for valid day in month
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
}

/**
 * Parse an Australian amount string into a Decimal
 * Handles formats like "$1,234.56", "1234.56", "-$50.00"
 */
export function parseAustralianAmount(amountStr: string): Decimal {
  // Remove currency symbol, spaces, and commas
  const cleaned = amountStr.replace(/[$,\s]/g, '');

  try {
    return new Decimal(cleaned);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Result from extracting amounts with context
 */
export interface ExtractedAmount {
  value: Decimal;
  isDebit: boolean;
  isCredit: boolean;
  hasExplicitIndicator: boolean; // True if DR/CR/D/C was found
  position: number; // Position in the text
}

/**
 * Extract all amounts from a text string
 * Returns array of amounts with debit/credit indicators
 */
export function extractAmounts(text: string): ExtractedAmount[] {
  const amounts: ExtractedAmount[] = [];

  // Reset regex state
  const regex = new RegExp(AMOUNT_PATTERN.source, AMOUNT_PATTERN.flags);

  let match;
  while ((match = regex.exec(text)) !== null) {
    const amountStr = match[1].replace(/[$,\s]/g, '');
    const indicator = match[2]?.toUpperCase();

    try {
      const value = new Decimal(amountStr).abs();

      if (value.greaterThan(0)) {
        const hasNegativePrefix = amountStr.startsWith('-');
        const hasExplicitIndicator = !!indicator || hasNegativePrefix;

        // DR/D or negative prefix indicates debit
        const isDebit = indicator === 'DR' || indicator === 'D' || hasNegativePrefix;
        // CR/C indicates credit
        const isCredit = indicator === 'CR' || indicator === 'C';

        amounts.push({
          value,
          isDebit,
          isCredit,
          hasExplicitIndicator,
          position: match.index,
        });
      }
    } catch {
      // Skip invalid amounts
    }
  }

  return amounts;
}

/**
 * Convert Decimal to cents (integer) for storage
 */
export function toCents(amount: Decimal): number {
  return amount.times(100).round().toNumber();
}

/**
 * Convert cents (integer) to Decimal
 */
export function fromCents(cents: number): Decimal {
  return new Decimal(cents).dividedBy(100);
}

/**
 * Analyze transaction text and determine type and sign
 * Returns the transaction type and properly signed amount
 */
export function analyzeTransaction(
  text: string,
  amount: Decimal,
  explicitlyDebit: boolean = false,
  explicitlyCredit: boolean = false
): { type: ParsedTransactionType; signedAmount: Decimal } {
  // First check for explicit DR/CR indicators
  if (explicitlyDebit) {
    return { type: 'expense', signedAmount: amount.negated().abs().negated() };
  }
  if (explicitlyCredit) {
    return { type: 'income', signedAmount: amount.abs() };
  }

  // Check for transfer keywords first (transfers can be either direction)
  for (const pattern of TRANSFER_KEYWORDS) {
    if (pattern.test(text)) {
      // For transfers, we need to determine direction from additional context
      const isOutgoing = /\bto\s+(?:my|own|savings?|saver)\b/i.test(text) ||
                        /\btransfer\s+out\b/i.test(text);
      const isIncoming = /\bfrom\s+(?:my|own|savings?|saver)\b/i.test(text) ||
                        /\btransfer\s+in\b/i.test(text);

      if (isOutgoing && !isIncoming) {
        return { type: 'transfer', signedAmount: amount.negated().abs().negated() };
      } else if (isIncoming && !isOutgoing) {
        return { type: 'transfer', signedAmount: amount.abs() };
      }
      // If unclear, treat as expense (money leaving this account)
      return { type: 'transfer', signedAmount: amount.negated().abs().negated() };
    }
  }

  // Check for debit (expense) keywords
  for (const pattern of DEBIT_KEYWORDS) {
    if (pattern.test(text)) {
      return { type: 'expense', signedAmount: amount.negated().abs().negated() };
    }
  }

  // Check for credit (income) keywords
  for (const pattern of CREDIT_KEYWORDS) {
    if (pattern.test(text)) {
      return { type: 'income', signedAmount: amount.abs() };
    }
  }

  // Default: if amount is already negative, it's an expense; otherwise, guess expense
  // (most transactions are expenses)
  if (amount.isNegative()) {
    return { type: 'expense', signedAmount: amount };
  }

  // Default to expense as most transactions are expenses
  return { type: 'expense', signedAmount: amount.negated().abs().negated() };
}

/**
 * Determine transaction sign based on keywords in text
 * Returns positive for credits, negative for debits
 * @deprecated Use analyzeTransaction instead for better type detection
 */
export function determineTransactionSign(text: string, amount: Decimal): Decimal {
  const result = analyzeTransaction(text, amount);
  return result.signedAmount;
}

/**
 * Clean and truncate a transaction description
 */
export function cleanDescription(text: string, maxLength = 200): string {
  // Remove amounts and DR/CR indicators
  let description = text
    .replace(/-?\$?\s*[\d,]+\.\d{2}\s*(DR|CR|D|C)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate if necessary
  if (description.length > maxLength) {
    description = description.substring(0, maxLength - 3) + '...';
  }

  return description;
}

/**
 * Extract statement period from text
 */
export function extractStatementPeriod(text: string): { start: Date; end: Date } | undefined {
  const periodPatterns = [
    /Statement\s+Period[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}\s+\w+\s+\d{4})\s*(?:to|-)\s*(\d{1,2}\s+\w+\s+\d{4})/i,
    /Period[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /From\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+To\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];

  for (const pattern of periodPatterns) {
    const match = text.match(pattern);
    if (match) {
      const start = parseAustralianDate(match[1]);
      const end = parseAustralianDate(match[2]);
      if (start && end) {
        return { start, end };
      }
    }
  }

  return undefined;
}

/**
 * Check if a line should be skipped (headers, footers, etc.)
 */
export function shouldSkipLine(line: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(line));
}

/**
 * Extract date from the beginning of a line
 * Returns the date and remaining text after the date
 */
export function extractDateFromLine(
  line: string,
  defaultYear?: number
): { date: Date; remainingText: string } | null {
  const allPatterns = [
    DATE_PATTERNS.slashFormat,
    DATE_PATTERNS.monthNameFormat,
    DATE_PATTERNS.dashFormat,
    DATE_PATTERNS.isoFormat,
  ];

  for (const pattern of allPatterns) {
    const match = line.match(pattern);
    // Date should be near the beginning of the line (within first 20 chars)
    if (match && match.index !== undefined && match.index < 20) {
      const date = parseAustralianDate(match[0], defaultYear);
      if (date) {
        const remainingText = line.substring(match.index + match[0].length).trim();
        return { date, remainingText };
      }
    }
  }

  return null;
}

function hasExplicitYearInLine(line: string): boolean {
  const slashMatch = line.match(DATE_PATTERNS.slashFormat);
  if (slashMatch && slashMatch[3]) {
    return true;
  }

  const dashMatch = line.match(DATE_PATTERNS.dashFormat);
  if (dashMatch && dashMatch[3]) {
    return true;
  }

  const monthNameMatch = line.match(DATE_PATTERNS.monthNameFormat);
  if (monthNameMatch && monthNameMatch[3]) {
    return true;
  }

  const isoMatch = line.match(DATE_PATTERNS.isoFormat);
  return !!isoMatch;
}

/**
 * Align a parsed transaction date to a statement period when the line has no explicit year.
 */
export function normalizeDateToStatementPeriod(
  date: Date,
  rawLine: string,
  statementPeriod?: { start: Date; end: Date }
): Date {
  if (!statementPeriod || hasExplicitYearInLine(rawLine)) {
    return date;
  }

  const candidates: Date[] = [];
  for (const yearOffset of [-1, 0, 1]) {
    const candidate = new Date(date);
    candidate.setFullYear(candidate.getFullYear() + yearOffset);
    candidates.push(candidate);
  }

  const inRange = candidates.find(
    (candidate) =>
      candidate.getTime() >= statementPeriod.start.getTime() &&
      candidate.getTime() <= statementPeriod.end.getTime()
  );
  if (inRange) {
    return inRange;
  }

  // Fall back to the candidate closest to the statement period bounds.
  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    let distance = 0;
    if (candidate.getTime() < statementPeriod.start.getTime()) {
      distance = statementPeriod.start.getTime() - candidate.getTime();
    } else if (candidate.getTime() > statementPeriod.end.getTime()) {
      distance = candidate.getTime() - statementPeriod.end.getTime();
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best;
}

/**
 * Create a unique key for duplicate detection
 */
export function createTransactionKey(date: Date, description: string, amountCents: number): string {
  return `${date.toISOString().split('T')[0]}_${description.toLowerCase().replace(/\s+/g, '_')}_${amountCents}`;
}

/**
 * Detect if a transaction is likely a transfer between own accounts
 */
export function isLikelyTransfer(text: string): boolean {
  return TRANSFER_KEYWORDS.some((pattern) => pattern.test(text));
}

/**
 * Detect if a transaction is likely a credit (money in)
 */
export function isLikelyCredit(text: string): boolean {
  return CREDIT_KEYWORDS.some((pattern) => pattern.test(text));
}

/**
 * Detect if a transaction is likely a debit (money out)
 */
export function isLikelyDebit(text: string): boolean {
  return DEBIT_KEYWORDS.some((pattern) => pattern.test(text));
}

// Re-export Decimal for use in parsers
export { Decimal };
