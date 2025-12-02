// Commonwealth Bank (CBA) Statement Parser

import { BaseParser } from './base.parser';

/**
 * Parser for Commonwealth Bank statements (Australia)
 *
 * CBA statement formats typically include:
 * - Date (DD MMM or DD/MM/YYYY)
 * - Description
 * - Debit/Credit amount
 * - Balance
 */
export class CBAParser extends BaseParser {
  constructor() {
    super({
      name: 'Commonwealth Bank',
      bankCode: 'cba',
      identifiers: [
        /Commonwealth Bank/i,
        /CommBank/i,
        /commbank\.com\.au/i,
        /NetBank/i,
        /CBA/i,
        /Smart Access/i,
        /Goal Saver/i,
        /NetBank Saver/i,
        /Everyday Account/i,
        /Complete Access/i,
        /Streamline/i,
      ],
      skipPatterns: [
        /^Transaction\s+Details/i,
        /^Your\s+Transactions/i,
        /^Account\s+Summary/i,
        /^Rewards\s+Points/i,
      ],
      accountNamePatterns: [
        /Account(?:\s+Name)?[:\s]+([A-Z][A-Za-z\s]+?)(?:\n|Account|BSB)/i,
        /(Smart Access|Goal Saver|NetBank Saver|Everyday Account|Complete Access|Streamline)/i,
      ],
      accountNumberPatterns: [
        /Account(?:\s+Number)?[:\s]+[\d\s-]*(\d{4})\b/i,
        /Account[:\s]+\*{4,}(\d{4})/i,
        /BSB[:\s]+\d{3}[\s-]?\d{3}[\s,]+Account[:\s]+\d*(\d{4})\b/i,
      ],
    });
  }
}

// Export singleton instance
export const cbaParser = new CBAParser();
