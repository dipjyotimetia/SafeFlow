// Price service - unified interface for fetching asset prices

import { fetchCryptoPrice, fetchCryptoPrices, searchCrypto } from './coingecko';
import { fetchStockPrice, fetchStockPrices, searchStocks } from './yahoo-finance';
import type { HoldingType } from '@/types';

export interface PriceResult {
  symbol: string;
  name: string;
  price: number; // In cents (AUD)
  change24hPercent: number;
  lastUpdated: Date;
}

/**
 * Fetch price for a single asset
 */
export async function fetchPrice(symbol: string, type: HoldingType): Promise<PriceResult | null> {
  if (type === 'crypto') {
    const result = await fetchCryptoPrice(symbol);
    if (!result) return null;

    return {
      symbol: result.symbol,
      name: result.name,
      price: Math.round((result.current_price ?? 0) * 100),
      change24hPercent: result.price_change_percentage_24h ?? 0,
      lastUpdated: result.last_updated ? new Date(result.last_updated) : new Date(),
    };
  }

  // Stocks and ETFs
  const result = await fetchStockPrice(symbol);
  if (!result) return null;

  return {
    symbol: result.symbol,
    name: result.shortName,
    price: Math.round((result.regularMarketPrice ?? 0) * 100),
    change24hPercent: result.regularMarketChangePercent ?? 0,
    lastUpdated: result.regularMarketTime ? new Date(result.regularMarketTime * 1000) : new Date(),
  };
}

/**
 * Fetch prices for multiple assets
 */
export async function fetchPrices(
  holdings: Array<{ symbol: string; type: HoldingType }>
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  // Separate by type
  const cryptoSymbols = holdings.filter((h) => h.type === 'crypto').map((h) => h.symbol);
  const stockSymbols = holdings.filter((h) => h.type !== 'crypto').map((h) => h.symbol);

  // Fetch in parallel
  const [cryptoPrices, stockPrices] = await Promise.all([
    cryptoSymbols.length > 0 ? fetchCryptoPrices(cryptoSymbols) : new Map(),
    stockSymbols.length > 0 ? fetchStockPrices(stockSymbols) : new Map(),
  ]);

  // Process crypto prices
  for (const [symbol, price] of cryptoPrices) {
    results.set(symbol, {
      symbol: price.symbol,
      name: price.name,
      price: Math.round((price.current_price ?? 0) * 100),
      change24hPercent: price.price_change_percentage_24h ?? 0,
      lastUpdated: price.last_updated ? new Date(price.last_updated) : new Date(),
    });
  }

  // Process stock prices
  for (const [symbol, price] of stockPrices) {
    results.set(symbol, {
      symbol: price.symbol,
      name: price.shortName,
      price: Math.round((price.regularMarketPrice ?? 0) * 100),
      change24hPercent: price.regularMarketChangePercent ?? 0,
      lastUpdated: price.regularMarketTime ? new Date(price.regularMarketTime * 1000) : new Date(),
    });
  }

  return results;
}

/**
 * Search for assets
 */
export async function searchAssets(
  query: string,
  type: HoldingType
): Promise<Array<{ symbol: string; name: string; type: HoldingType }>> {
  if (type === 'crypto') {
    const results = await searchCrypto(query);
    return results.map((r) => ({
      symbol: r.symbol.toUpperCase(),
      name: r.name,
      type: 'crypto' as const,
    }));
  }

  const results = await searchStocks(query);
  return results.map((r) => ({
    symbol: r.symbol.replace('.AX', ''),
    name: r.name,
    type: type,
  }));
}

// Re-export for convenience
export { fetchCryptoPrice, fetchCryptoPrices, searchCrypto } from './coingecko';
export { fetchStockPrice, fetchStockPrices, searchStocks } from './yahoo-finance';
