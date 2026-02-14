// UniSuper Statement Parser

import type { SuperParser, SuperParseResult, ParsedSuperTransaction, ParsedSuperAccount } from './types';
import type { SuperTransactionType } from '@/types';

/**
 * Parser for UniSuper member statements
 *
 * UniSuper statement formats typically include:
 * - Member number
 * - Account balance
 * - Contribution breakdown (employer, salary sacrifice, personal)
 * - Investment option and returns
 * - Insurance details
 */
export class UniSuperParser implements SuperParser {
  name = 'UniSuper';
  provider = 'unisuper' as const;

  // Patterns to identify UniSuper statements
  private readonly identifiers = [
    /UniSuper/i,
    /unisuper\.com\.au/i,
    /Universal Super Holdings/i,
    /UniSuper Management/i,
    /Member Statement/i,
  ];

  // Date patterns for Australian format
  private readonly datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i,
    /(\d{1,2})-(\d{1,2})-(\d{2,4})/,
  ];

  canParse(text: string): boolean {
    return this.identifiers.some((pattern) => pattern.test(text));
  }

  parse(text: string): SuperParseResult {
    const transactions: ParsedSuperTransaction[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract account information
    const account = this.extractAccountInfo(text);

    // Extract statement period
    const statementPeriod = this.extractStatementPeriod(text);

    // Extract transactions
    const extractedTransactions = this.extractTransactions(text, statementPeriod?.end);
    transactions.push(...extractedTransactions);

    if (account.totalBalance === 0 && transactions.length === 0) {
      errors.push('Could not extract balance or transactions from the document. Please ensure this is a valid UniSuper statement.');
    }

    return {
      success: errors.length === 0,
      account,
      transactions,
      statementPeriod,
      errors,
      warnings,
    };
  }

  private extractAccountInfo(text: string): ParsedSuperAccount {
    let memberNumber: string | undefined;
    let accountName: string | undefined;
    let investmentOption: string | undefined;
    let employerName: string | undefined;
    let totalBalance = 0;
    let preservedBalance: number | undefined;
    let restrictedNonPreserved: number | undefined;
    let unrestrictedNonPreserved: number | undefined;

    // Extract member number
    const memberPatterns = [
      /Member\s+(?:Number|No\.?)[:\s]+(\d{6,12})/i,
      /Member\s+ID[:\s]+(\d{6,12})/i,
      /Member[:\s]+(\d{6,12})/i,
    ];

    for (const pattern of memberPatterns) {
      const match = text.match(pattern);
      if (match) {
        memberNumber = match[1];
        break;
      }
    }

    // Extract account name/type
    const accountPatterns = [
      /Account\s+Type[:\s]+(Accumulation|Defined Benefit|Pension)/i,
      /(Accumulation\s+\d?|Personal\s+Account|DBD)/i,
    ];

    for (const pattern of accountPatterns) {
      const match = text.match(pattern);
      if (match) {
        accountName = match[1].trim();
        break;
      }
    }

    // Extract investment option
    const optionPatterns = [
      /Investment\s+(?:Option|Choice)[:\s]+([A-Za-z\s]+?)(?:\n|$)/i,
      /(Balanced|Conservative|Growth|High Growth|Cash|Sustainable)/i,
    ];

    for (const pattern of optionPatterns) {
      const match = text.match(pattern);
      if (match) {
        investmentOption = match[1].trim();
        break;
      }
    }

    // Extract employer name
    const employerPatterns = [
      /Employer[:\s]+([A-Za-z\s&]+?)(?:\n|ABN|$)/i,
      /Contributing\s+Employer[:\s]+([A-Za-z\s&]+?)(?:\n|$)/i,
    ];

    for (const pattern of employerPatterns) {
      const match = text.match(pattern);
      if (match) {
        employerName = match[1].trim();
        break;
      }
    }

    // Extract total balance
    const balancePatterns = [
      /Total\s+(?:Account\s+)?Balance[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
      /Account\s+Balance[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
      /Closing\s+Balance[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = text.match(pattern);
      if (match) {
        totalBalance = this.parseAmount(match[1]);
        break;
      }
    }

    // Extract preservation components
    const preservedMatch = text.match(/Preserved[:\s]+\$?([\d,]+(?:\.\d{2})?)/i);
    if (preservedMatch) {
      preservedBalance = this.parseAmount(preservedMatch[1]);
    }

    const restrictedMatch = text.match(/Restricted\s+Non[- ]Preserved[:\s]+\$?([\d,]+(?:\.\d{2})?)/i);
    if (restrictedMatch) {
      restrictedNonPreserved = this.parseAmount(restrictedMatch[1]);
    }

    const unrestrictedMatch = text.match(/Unrestricted\s+Non[- ]Preserved[:\s]+\$?([\d,]+(?:\.\d{2})?)/i);
    if (unrestrictedMatch) {
      unrestrictedNonPreserved = this.parseAmount(unrestrictedMatch[1]);
    }

    return {
      provider: 'unisuper',
      providerName: 'UniSuper',
      memberNumber,
      accountName,
      investmentOption,
      employerName,
      totalBalance,
      preservedBalance: preservedBalance ?? totalBalance,
      restrictedNonPreserved: restrictedNonPreserved ?? 0,
      unrestrictedNonPreserved: unrestrictedNonPreserved ?? 0,
    };
  }

  private extractStatementPeriod(text: string): { start: Date; end: Date } | undefined {
    const periodPatterns = [
      /Statement\s+Period[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}\s+\w+\s+\d{4})\s*(?:to|-)\s*(\d{1,2}\s+\w+\s+\d{4})/i,
      /Period[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /for\s+the\s+year\s+ended?\s+(\d{1,2}\s+\w+\s+\d{4})/i,
    ];

    for (const pattern of periodPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          const start = this.parseDate(match[1]);
          const end = this.parseDate(match[2]);
          if (start && end) {
            return { start, end };
          }
        } else {
          // Year-end only - assume full financial year
          const end = this.parseDate(match[1]);
          if (end) {
            const start = new Date(end.getFullYear() - 1, 6, 1); // July 1 of previous year
            return { start, end };
          }
        }
      }
    }

    return undefined;
  }

  private extractTransactions(text: string, defaultDate?: Date): ParsedSuperTransaction[] {
    const transactions: ParsedSuperTransaction[] = [];
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

    // Look for contribution sections
    const contributionPatterns: Array<{ pattern: RegExp; type: SuperTransactionType }> = [
      { pattern: /Employer\s+(?:SG|Super(?:annuation)?|Contribution)[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'employer-sg' },
      { pattern: /Super\s+Guarantee[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'employer-sg' },
      { pattern: /SG\s+Contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'employer-sg' },
      { pattern: /Salary\s+Sacrifice[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'salary-sacrifice' },
      { pattern: /Pre[- ]?Tax\s+Contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'salary-sacrifice' },
      { pattern: /Personal\s+(?:Deductible\s+)?Contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'personal-concessional' },
      { pattern: /Member\s+Contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'personal-non-concessional' },
      { pattern: /After[- ]?Tax\s+Contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'personal-non-concessional' },
      { pattern: /Government\s+Co[- ]?Contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'government-co-contribution' },
      { pattern: /Spouse\s+Contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'spouse-contribution' },
      { pattern: /Investment\s+(?:Earnings?|Returns?)[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'earnings' },
      { pattern: /Credited\s+Earnings?[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'earnings' },
      { pattern: /(?:Admin(?:istration)?|Management)\s+Fee[s]?[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'fees' },
      { pattern: /Insurance\s+Premium[s]?[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'insurance' },
      { pattern: /Tax\s+(?:on\s+)?Contribution[s]?[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'fees' },
    ];

    const date = defaultDate ?? new Date();

    for (const { pattern, type } of contributionPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = this.parseAmount(match[1]);
        if (amount > 0) {
          transactions.push({
            date,
            type,
            amount: ['fees', 'insurance'].includes(type) ? -amount : amount,
            description: this.getTransactionDescription(type),
          });
        }
      }
    }

    // Also try to extract individual transaction lines
    for (const line of lines) {
      const transaction = this.parseTransactionLine(line, date);
      if (transaction) {
        // Check for duplicates
        const isDuplicate = transactions.some(
          (t) => t.type === transaction.type && Math.abs(t.amount - transaction.amount) < 100
        );
        if (!isDuplicate) {
          transactions.push(transaction);
        }
      }
    }

    return transactions;
  }

  private parseTransactionLine(line: string, defaultDate: Date): ParsedSuperTransaction | null {
    // Try to match transaction patterns with dates
    for (const datePattern of this.datePatterns) {
      const dateMatch = line.match(datePattern);
      if (dateMatch) {
        const date = this.parseDate(dateMatch[0]) ?? defaultDate;
        const amountMatch = this.extractAmountMatchFromLine(line, dateMatch[0]);

        if (amountMatch) {
          const amount = this.parseAmount(amountMatch);
          if (amount > 0) {
            const type = this.determineTransactionType(line);
            return {
              date,
              type,
              amount: ['fees', 'insurance'].includes(type) ? -amount : amount,
              description: line
                .replace(dateMatch[0], '')
                .replace(amountMatch, '')
                .trim(),
              rawText: line,
            };
          }
        }
      }
    }

    return null;
  }

  private extractAmountMatchFromLine(line: string, dateToken: string): string | null {
    const withoutDate = line.replace(dateToken, ' ');
    const matches = Array.from(withoutDate.matchAll(/\$?\s*([\d,]+(?:\.\d{2})?)/g));
    if (matches.length === 0) {
      return null;
    }

    // Prefer currency-looking numbers to avoid capturing day/month values.
    const preferred = matches.filter(
      (match) =>
        match[0].includes('$') || match[1].includes(',') || match[1].includes('.')
    );
    const selected = (preferred.length > 0 ? preferred : matches).at(-1);
    return selected?.[1] ?? null;
  }

  private determineTransactionType(text: string): SuperTransactionType {
    const lowerText = text.toLowerCase();

    if (/employer|sg|super\s*guarantee/i.test(lowerText)) return 'employer-sg';
    if (/salary\s*sacrifice|pre[- ]?tax/i.test(lowerText)) return 'salary-sacrifice';
    if (/personal.*concessional|deductible/i.test(lowerText)) return 'personal-concessional';
    if (/personal|member|after[- ]?tax|non[- ]?concessional/i.test(lowerText)) return 'personal-non-concessional';
    if (/government|co[- ]?contribution/i.test(lowerText)) return 'government-co-contribution';
    if (/spouse/i.test(lowerText)) return 'spouse-contribution';
    if (/earning|return|investment/i.test(lowerText)) return 'earnings';
    if (/admin|management|fee/i.test(lowerText)) return 'fees';
    if (/insurance|premium/i.test(lowerText)) return 'insurance';
    if (/withdrawal|pension|lump\s*sum/i.test(lowerText)) return 'withdrawal';
    if (/rollover\s*(in|from)/i.test(lowerText)) return 'rollover-in';
    if (/rollover\s*(out|to)/i.test(lowerText)) return 'rollover-out';

    return 'employer-sg'; // Default
  }

  private getTransactionDescription(type: SuperTransactionType): string {
    const descriptions: Record<SuperTransactionType, string> = {
      'employer-sg': 'Employer Super Guarantee',
      'employer-additional': 'Employer Additional Contribution',
      'salary-sacrifice': 'Salary Sacrifice Contribution',
      'personal-concessional': 'Personal Deductible Contribution',
      'personal-non-concessional': 'Personal After-Tax Contribution',
      'government-co-contribution': 'Government Co-Contribution',
      'spouse-contribution': 'Spouse Contribution',
      'earnings': 'Investment Earnings',
      'fees': 'Administration Fee',
      'insurance': 'Insurance Premium',
      'withdrawal': 'Withdrawal',
      'rollover-in': 'Rollover In',
      'rollover-out': 'Rollover Out',
    };
    return descriptions[type] || type;
  }

  private parseDate(dateStr: string): Date | null {
    // DD/MM/YYYY or DD/MM/YY
    let match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
      let year = parseInt(match[3]);
      if (year < 100) year += year > 50 ? 1900 : 2000;
      return new Date(year, parseInt(match[2]) - 1, parseInt(match[1]));
    }

    // DD MMM YYYY
    match = dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{2,4})?/i);
    if (match) {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      let year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
      if (year < 100) year += year > 50 ? 1900 : 2000;
      return new Date(year, months[match[2].toLowerCase().substring(0, 3)], parseInt(match[1]));
    }

    return null;
  }

  private parseAmount(amountStr: string): number {
    const cleaned = amountStr.replace(/[$,\s]/g, '');
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : Math.round(value * 100); // Convert to cents
  }
}

// Export singleton instance
export const uniSuperParser = new UniSuperParser();
