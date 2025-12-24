/**
 * Market Data Module
 *
 * Provides external market data integration for property analysis.
 *
 * Usage:
 *
 * ```typescript
 * import {
 *   setMarketDataProvider,
 *   getMarketDataProvider,
 *   localMarketData,
 *   microburbsProvider,
 * } from '@/lib/market-data';
 *
 * // Use local (user-entered) data by default
 * setMarketDataProvider(localMarketData);
 *
 * // Or configure Microburbs with API key
 * microburbsProvider.configure('your-api-key');
 * setMarketDataProvider(microburbsProvider);
 *
 * // Fetch suburb data
 * const provider = getMarketDataProvider();
 * if (provider) {
 *   const result = await provider.getSuburbStats('Bondi', 'NSW');
 *   if (result.success) {
 *     console.log(result.data);
 *   }
 * }
 * ```
 */

// Provider interface and registry
export {
  type MarketDataProvider,
  type SuburbStats,
  type SuburbComparison,
  type MarketDataError,
  type MarketDataResult,
  setMarketDataProvider,
  getMarketDataProvider,
  hasMarketDataProvider,
  compareToMedian,
  compareYieldToSuburb,
  calculateVacancyRisk,
  estimateGrowthPotential,
} from "./provider";

// Provider implementations
export { LocalMarketDataProvider, localMarketData, type LocalSuburbData } from "./local";
export { MicroburbsProvider, microburbsProvider } from "./microburbs";
