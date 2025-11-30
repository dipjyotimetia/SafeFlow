// Super parsers index

export { uniSuperParser, UniSuperParser } from './unisuper.parser';
export { australianSuperParser, AustralianSuperParser } from './australian-super.parser';
export type { SuperParser, SuperParseResult, ParsedSuperTransaction, ParsedSuperAccount } from './types';

import { uniSuperParser } from './unisuper.parser';
import { australianSuperParser } from './australian-super.parser';
import type { SuperParser, SuperParseResult } from './types';

// Registry of all super parsers
const superParsers: SuperParser[] = [
  uniSuperParser,
  australianSuperParser,
];

/**
 * Find a super parser that can handle the given text
 */
export function findSuperParser(text: string): SuperParser | undefined {
  return superParsers.find((parser) => parser.canParse(text));
}

/**
 * Parse super statement text using auto-detected or specified parser
 */
export function parseSuperStatement(text: string, parserName?: string): SuperParseResult {
  let parser: SuperParser | undefined;

  if (parserName) {
    parser = superParsers.find((p) => p.name.toLowerCase() === parserName.toLowerCase());
  } else {
    parser = findSuperParser(text);
  }

  if (!parser) {
    return {
      success: false,
      account: {
        provider: 'other',
        providerName: 'Unknown',
        totalBalance: 0,
        preservedBalance: 0,
        restrictedNonPreserved: 0,
        unrestrictedNonPreserved: 0,
      },
      transactions: [],
      errors: ['Could not detect super fund provider. Please ensure this is a valid UniSuper or Australian Super statement.'],
      warnings: [],
    };
  }

  return parser.parse(text);
}

/**
 * Get list of available super parsers
 */
export function getAvailableSuperParsers(): Array<{ name: string; provider: string }> {
  return superParsers.map((p) => ({ name: p.name, provider: p.provider }));
}
