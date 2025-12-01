// Bank parser exports

// Big 4 Banks
export { anzParser, ANZParser } from './anz.parser';
export { cbaParser, CBAParser } from './cba.parser';
export { westpacParser, WestpacParser } from './westpac.parser';
export { nabParser, NABParser } from './nab.parser';

// Digital Banks
export { ingParser, INGParser } from './ing.parser';
export { macquarieParser, MacquarieParser } from './macquarie.parser';
export { upParser, UpParser } from './up.parser';
export { bendigoParser, BendigoParser } from './bendigo.parser';

// Investment/Crypto Platforms
export { raizParser, RaizParser } from './raiz.parser';
export { coinspotParser, CoinSpotParser } from './coinspot.parser';
export { swyftxParser, SwyftxParser } from './swyftx.parser';

// Re-export types for convenience
export type { BankParser, ParseResult, ParsedTransaction } from '../types';
