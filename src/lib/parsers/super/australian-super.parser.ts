// Australian Super Statement Parser

import type { SuperParser, SuperParseResult, ParsedSuperTransaction, ParsedSuperAccount } from './types';
import type { SuperTransactionType } from '@/types';

/**
 * Parser for Australian Super member statements
 *
 * Australian Super statement formats typically include:
 * - Member number
 * - Account balance with preservation breakdown
 * - Contribution summary
 * - Investment options and performance
 * - Insurance details
 */
export class AustralianSuperParser implements SuperParser {
  name = 'Australian Super';
  provider = 'australian-super' as const;

  // Patterns to identify Australian Super statements
  private readonly identifiers = [
    /Australian\s*Super/i,
    /australiansuper\.com/i,
    /AustralianSuper/i,
    /Your\s+super\s+statement/i,
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
      errors.push('Could not extract balance or transactions from the document. Please ensure this is a valid Australian Super statement.');
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
      /Your\s+member\s+number[:\s]+(\d{6,12})/i,
      /Account\s+Number[:\s]+(\d{6,12})/i,
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
      /Account\s+Type[:\s]+(Accumulation|Choice Income|Retirement|Division\s+\d+)/i,
      /(Accumulation\s+Account|Super\s+Account|Pension\s+Account)/i,
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
      /You(?:'re| are)\s+invested\s+in[:\s]+([A-Za-z\s]+?)(?:\n|$)/i,
      /(Balanced|High Growth|Conservative|Indexed Diversified|Stable|Socially Aware)/i,
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
      /Your\s+employer[:\s]+([A-Za-z\s&]+?)(?:\n|$)/i,
      /Contributions?\s+from[:\s]+([A-Za-z\s&]+?)(?:\n|$)/i,
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
      /Your\s+(?:super\s+)?balance[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
      /Account\s+Balance[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
      /Closing\s+Balance[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
      /Balance\s+as\s+at[^$]*\$?([\d,]+(?:\.\d{2})?)/i,
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
      provider: 'australian-super',
      providerName: 'Australian Super',
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
      /Statement\s+(?:Period|for)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /(\d{1,2}\s+\w+\s+\d{4})\s*(?:to|-)\s*(\d{1,2}\s+\w+\s+\d{4})/i,
      /Period[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /as\s+at\s+(\d{1,2}\s+\w+\s+\d{4})/i,
      /for\s+the\s+(?:financial\s+)?year\s+ended?\s+(\d{1,2}\s+\w+\s+\d{4})/i,
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
          // Single date - assume year-end statement
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

    // Contribution patterns specific to Australian Super
    const contributionPatterns: Array<{ pattern: RegExp; type: SuperTransactionType }> = [
      { pattern: /Employer\s+(?:SG|Super(?:annuation)?|Contribution)[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'employer-sg' },
      { pattern: /Super\s+Guarantee[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'employer-sg' },
      { pattern: /SG\s+Contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'employer-sg' },
      { pattern: /Compulsory\s+(?:employer\s+)?contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'employer-sg' },
      { pattern: /Voluntary\s+employer\s+contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'employer-additional' },
      { pattern: /Salary\s+Sacrifice[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'salary-sacrifice' },
      { pattern: /Before[- ]?tax\s+contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'salary-sacrifice' },
      { pattern: /Concessional\s+contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'personal-concessional' },
      { pattern: /Personal\s+deductible\s+contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'personal-concessional' },
      { pattern: /After[- ]?tax\s+contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'personal-non-concessional' },
      { pattern: /Non[- ]?concessional\s+contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'personal-non-concessional' },
      { pattern: /Personal\s+contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'personal-non-concessional' },
      { pattern: /Government\s+co[- ]?contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'government-co-contribution' },
      { pattern: /Low\s+income\s+super[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'government-co-contribution' },
      { pattern: /Spouse\s+contribution[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'spouse-contribution' },
      { pattern: /Investment\s+(?:earnings?|returns?)[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'earnings' },
      { pattern: /Investment\s+growth[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'earnings' },
      { pattern: /Net\s+investment\s+return[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'earnings' },
      { pattern: /(?:Admin(?:istration)?|Management)\s+Fee[s]?[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'fees' },
      { pattern: /Member\s+Fee[s]?[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'fees' },
      { pattern: /Indirect\s+cost[s]?[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'fees' },
      { pattern: /Insurance\s+(?:Premium[s]?|cost[s]?)[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'insurance' },
      { pattern: /Life\s+insurance[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'insurance' },
      { pattern: /TPD\s+insurance[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'insurance' },
      { pattern: /Income\s+protection[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'insurance' },
      { pattern: /Contributions?\s+tax[:\s]+\$?([\d,]+(?:\.\d{2})?)/i, type: 'fees' },
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

    // Try to parse transaction table if present
    const tableTransactions = this.parseTransactionTable(text, date);
    for (const t of tableTransactions) {
      const isDuplicate = transactions.some(
        (existing) => existing.type === t.type && Math.abs(existing.amount - t.amount) < 100
      );
      if (!isDuplicate) {
        transactions.push(t);
      }
    }

    return transactions;
  }

  private parseTransactionTable(text: string, defaultDate: Date): ParsedSuperTransaction[] {
    const transactions: ParsedSuperTransaction[] = [];
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

    for (const line of lines) {
      // Skip header lines
      if (/^(Date|Description|Type|Amount|Transaction)/i.test(line)) continue;

      // Try to match transaction line with date
      for (const datePattern of this.datePatterns) {
        const dateMatch = line.match(datePattern);
        if (dateMatch) {
          const date = this.parseDate(dateMatch[0]) ?? defaultDate;
          const amountMatch = line.match(/\$?([\d,]+(?:\.\d{2})?)/);

          if (amountMatch) {
            const amount = this.parseAmount(amountMatch[1]);
            if (amount > 0) {
              const type = this.determineTransactionType(line);
              transactions.push({
                date,
                type,
                amount: ['fees', 'insurance'].includes(type) ? -amount : amount,
                description: line.replace(dateMatch[0], '').replace(amountMatch[0], '').trim().substring(0, 100),
                rawText: line,
              });
            }
          }
          break;
        }
      }
    }

    return transactions;
  }

  private determineTransactionType(text: string): SuperTransactionType {
    const lowerText = text.toLowerCase();

    if (/employer|sg|super\s*guarantee|compulsory/i.test(lowerText)) return 'employer-sg';
    if (/voluntary\s*employer/i.test(lowerText)) return 'employer-additional';
    if (/salary\s*sacrifice|before[- ]?tax/i.test(lowerText)) return 'salary-sacrifice';
    if (/concessional|deductible/i.test(lowerText) && !/non/i.test(lowerText)) return 'personal-concessional';
    if (/personal|after[- ]?tax|non[- ]?concessional/i.test(lowerText)) return 'personal-non-concessional';
    if (/government|co[- ]?contribution|low\s*income/i.test(lowerText)) return 'government-co-contribution';
    if (/spouse/i.test(lowerText)) return 'spouse-contribution';
    if (/earning|return|investment.*growth/i.test(lowerText)) return 'earnings';
    if (/admin|management|member.*fee|indirect/i.test(lowerText)) return 'fees';
    if (/insurance|premium|life|tpd|income\s*protection/i.test(lowerText)) return 'insurance';
    if (/withdrawal|pension|lump\s*sum|benefit/i.test(lowerText)) return 'withdrawal';
    if (/rollover.*in|transfer.*from/i.test(lowerText)) return 'rollover-in';
    if (/rollover.*out|transfer.*to/i.test(lowerText)) return 'rollover-out';

    return 'employer-sg'; // Default
  }

  private getTransactionDescription(type: SuperTransactionType): string {
    const descriptions: Record<SuperTransactionType, string> = {
      'employer-sg': 'Employer Super Guarantee',
      'employer-additional': 'Employer Voluntary Contribution',
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

    // DD-MM-YYYY
    match = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
    if (match) {
      let year = parseInt(match[3]);
      if (year < 100) year += year > 50 ? 1900 : 2000;
      return new Date(year, parseInt(match[2]) - 1, parseInt(match[1]));
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
export const australianSuperParser = new AustralianSuperParser();
