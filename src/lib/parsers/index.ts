// Parser exports and initialization

export * from './types';
export { parserRegistry } from './registry';
export { anzParser, ANZParser } from './bank';

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

// Register all parsers
import { parserRegistry } from './registry';
import { anzParser } from './bank';

// Auto-register ANZ parser
parserRegistry.register(anzParser);
