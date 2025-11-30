// CoinGecko API service for cryptocurrency prices

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  last_updated: string;
}

// Map common symbols to CoinGecko IDs
const SYMBOL_TO_ID: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  bnb: 'binancecoin',
  sol: 'solana',
  ada: 'cardano',
  xrp: 'ripple',
  dot: 'polkadot',
  doge: 'dogecoin',
  avax: 'avalanche-2',
  shib: 'shiba-inu',
  matic: 'matic-network',
  link: 'chainlink',
  uni: 'uniswap',
  atom: 'cosmos',
  ltc: 'litecoin',
};

/**
 * Get CoinGecko ID from symbol
 */
export function getCoinGeckoId(symbol: string): string {
  return SYMBOL_TO_ID[symbol.toLowerCase()] || symbol.toLowerCase();
}

/**
 * Fetch price for a single cryptocurrency
 */
export async function fetchCryptoPrice(symbol: string): Promise<CoinGeckoPrice | null> {
  const id = getCoinGeckoId(symbol);

  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${id}&vs_currencies=aud&include_24hr_change=true&include_last_updated_at=true`
    );

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data[id]) {
      return null;
    }

    return {
      id,
      symbol: symbol.toUpperCase(),
      name: id,
      current_price: data[id].aud,
      price_change_24h: 0,
      price_change_percentage_24h: data[id].aud_24h_change || 0,
      last_updated: new Date(data[id].last_updated_at * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Failed to fetch crypto price:', error);
    return null;
  }
}

/**
 * Fetch prices for multiple cryptocurrencies
 */
export async function fetchCryptoPrices(symbols: string[]): Promise<Map<string, CoinGeckoPrice>> {
  const ids = symbols.map(getCoinGeckoId);
  const results = new Map<string, CoinGeckoPrice>();

  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=aud&ids=${ids.join(',')}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`
    );

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status);
      return results;
    }

    const data: CoinGeckoPrice[] = await response.json();

    for (const coin of data) {
      const originalSymbol = symbols.find(
        (s) => getCoinGeckoId(s) === coin.id
      );
      if (originalSymbol) {
        results.set(originalSymbol.toUpperCase(), {
          ...coin,
          symbol: originalSymbol.toUpperCase(),
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
  }

  return results;
}

/**
 * Search for cryptocurrencies by name or symbol
 */
export async function searchCrypto(query: string): Promise<Array<{ id: string; name: string; symbol: string }>> {
  try {
    const response = await fetch(`${COINGECKO_API}/search?query=${encodeURIComponent(query)}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.coins?.slice(0, 10) || [];
  } catch (error) {
    console.error('Failed to search crypto:', error);
    return [];
  }
}
