// Yahoo Finance API service for stocks and ETFs
// Uses the free Yahoo Finance API endpoints

export interface YahooQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: number;
  currency: string;
}

// Common Australian ETFs and stocks with their Yahoo symbols
const ASX_SYMBOLS: Record<string, string> = {
  // Popular ETFs
  VAS: 'VAS.AX',
  VGS: 'VGS.AX',
  VTS: 'VTS.AX',
  IVV: 'IVV.AX',
  IOZ: 'IOZ.AX',
  NDQ: 'NDQ.AX',
  DHHF: 'DHHF.AX',
  VDHG: 'VDHG.AX',
  A200: 'A200.AX',
  STW: 'STW.AX',
  // Micro-investing apps
  RAIZ: 'RAIZ.AX',
  SPACESHIP: 'SPACESHIP.AX',
};

/**
 * Get Yahoo Finance symbol for ASX stocks
 */
export function getYahooSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  // Check if it's a known ASX symbol
  if (ASX_SYMBOLS[upper]) {
    return ASX_SYMBOLS[upper];
  }
  // If it ends with .AX, use as-is
  if (upper.endsWith('.AX')) {
    return upper;
  }
  // Assume ASX stock, add .AX suffix
  return `${upper}.AX`;
}

/**
 * Fetch quote for a single stock/ETF
 * Uses the Yahoo Finance quote endpoint
 */
export async function fetchStockPrice(symbol: string): Promise<YahooQuote | null> {
  const yahooSymbol = getYahooSymbol(symbol);

  try {
    // Using Yahoo Finance chart API for quote data
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
    );

    if (!response.ok) {
      console.error('Yahoo Finance API error:', response.status);
      return null;
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return null;
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const previousClose = meta.chartPreviousClose || meta.previousClose;
    const currentPrice = meta.regularMarketPrice;

    return {
      symbol: symbol.toUpperCase(),
      shortName: meta.shortName || symbol,
      regularMarketPrice: currentPrice,
      regularMarketChange: currentPrice - previousClose,
      regularMarketChangePercent: ((currentPrice - previousClose) / previousClose) * 100,
      regularMarketTime: meta.regularMarketTime,
      currency: meta.currency || 'AUD',
    };
  } catch (error) {
    console.error('Failed to fetch stock price:', error);
    return null;
  }
}

/**
 * Fetch quotes for multiple stocks/ETFs
 */
export async function fetchStockPrices(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const results = new Map<string, YahooQuote>();

  // Fetch prices in parallel with a limit
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map((symbol) => fetchStockPrice(symbol));
    const batchResults = await Promise.all(promises);

    for (let j = 0; j < batch.length; j++) {
      const quote = batchResults[j];
      if (quote) {
        results.set(batch[j].toUpperCase(), quote);
      }
    }

    // Add small delay between batches to avoid rate limiting
    if (i + batchSize < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Search for stocks/ETFs
 */
export async function searchStocks(query: string): Promise<Array<{ symbol: string; name: string; exchange: string }>> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (
      data.quotes?.map((q: { symbol: string; shortname: string; exchange: string }) => ({
        symbol: q.symbol,
        name: q.shortname || q.symbol,
        exchange: q.exchange,
      })) || []
    );
  } catch (error) {
    console.error('Failed to search stocks:', error);
    return [];
  }
}
