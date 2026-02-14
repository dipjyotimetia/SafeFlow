// Parser exports and initialization

export * from './types';
export { parserRegistry } from './registry';

// Bank parsers
export {
  // Big 4 Banks
  anzParser,
  ANZParser,
  cbaParser,
  CBAParser,
  westpacParser,
  WestpacParser,
  nabParser,
  NABParser,
  // Digital Banks
  ingParser,
  INGParser,
  macquarieParser,
  MacquarieParser,
  upParser,
  UpParser,
  bendigoParser,
  BendigoParser,
  // Investment/Crypto
  raizParser,
  RaizParser,
  coinspotParser,
  CoinSpotParser,
  swyftxParser,
  SwyftxParser,
} from './bank';

// Super parsers
export {
  uniSuperParser,
  UniSuperParser,
  australianSuperParser,
  AustralianSuperParser,
  findSuperParser,
  parseSuperStatement,
  getAvailableSuperParsers,
} from './super';
export type { SuperParser, SuperParseResult, ParsedSuperTransaction, ParsedSuperAccount } from './super';

// Parsing utilities
export {
  parseAustralianDate,
  parseAustralianAmount,
  extractAmounts,
  toCents,
  fromCents,
  Decimal,
  determineTransactionSign,
  cleanDescription,
  extractStatementPeriod,
  normalizeDateToStatementPeriod,
  shouldSkipLine,
  extractDateFromLine,
  createTransactionKey,
} from './utils';

// Register all parsers
import { parserRegistry } from './registry';
import {
  anzParser,
  cbaParser,
  westpacParser,
  nabParser,
  ingParser,
  macquarieParser,
  upParser,
  bendigoParser,
  raizParser,
  coinspotParser,
  swyftxParser,
} from './bank';

// Auto-register all bank parsers
// Big 4 Banks
parserRegistry.register(anzParser);
parserRegistry.register(cbaParser);
parserRegistry.register(westpacParser);
parserRegistry.register(nabParser);

// Digital Banks
parserRegistry.register(ingParser);
parserRegistry.register(macquarieParser);
parserRegistry.register(upParser);
parserRegistry.register(bendigoParser);

// Investment/Crypto Platforms
parserRegistry.register(raizParser);
parserRegistry.register(coinspotParser);
parserRegistry.register(swyftxParser);
