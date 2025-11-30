// Superannuation PDF Parser Types

import type { SuperTransactionType, SuperProvider } from '@/types';

export interface ParsedSuperTransaction {
  date: Date;
  type: SuperTransactionType;
  amount: number; // In cents (positive for contributions, negative for fees/withdrawals)
  description?: string;
  employerName?: string;
  rawText?: string;
}

export interface ParsedSuperAccount {
  provider: SuperProvider;
  providerName: string;
  memberNumber?: string;
  accountName?: string;
  investmentOption?: string;
  employerName?: string;
  totalBalance: number; // In cents
  preservedBalance?: number;
  restrictedNonPreserved?: number;
  unrestrictedNonPreserved?: number;
}

export interface SuperParseResult {
  success: boolean;
  account: ParsedSuperAccount;
  transactions: ParsedSuperTransaction[];
  statementPeriod?: {
    start: Date;
    end: Date;
  };
  errors: string[];
  warnings: string[];
}

export interface SuperParser {
  name: string;
  provider: SuperProvider;

  /**
   * Check if this parser can handle the given PDF content
   */
  canParse(text: string): boolean;

  /**
   * Parse the PDF text content and extract super data
   */
  parse(text: string): SuperParseResult;
}
