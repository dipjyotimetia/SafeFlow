/**
 * Market Data Provider Interface
 *
 * Provides a pluggable interface for fetching external market data
 * from various Australian property data providers.
 *
 * Implementations:
 * - LocalMarketData: User-entered data (default, no API)
 * - MicroburbsProvider: Free tier suburb data
 * - ProptechDataProvider: Paid comprehensive data (future)
 */

import type { AustralianState } from "@/types";

// ============ Types ============

export interface SuburbStats {
  suburb: string;
  state: AustralianState;
  postcode: string;

  // Price data
  medianHousePrice?: number;      // cents
  medianUnitPrice?: number;       // cents
  houseYield?: number;            // percentage (e.g., 4.5)
  unitYield?: number;             // percentage

  // Rental data
  medianWeeklyRentHouse?: number; // cents
  medianWeeklyRentUnit?: number;  // cents
  vacancyRate?: number;           // percentage (e.g., 1.2)

  // Market indicators
  daysOnMarket?: number;          // average days to sell
  auctionClearanceRate?: number;  // percentage
  listingsCount?: number;         // current active listings

  // Growth metrics
  annualGrowthHouse?: number;     // percentage
  annualGrowthUnit?: number;      // percentage
  fiveYearGrowthHouse?: number;   // percentage
  fiveYearGrowthUnit?: number;    // percentage

  // Demographics (useful for rental demand)
  population?: number;
  populationGrowthRate?: number;  // percentage
  medianHouseholdIncome?: number; // cents annual
  ownerOccupiedPercentage?: number;

  // Last updated
  dataAsOf?: Date;
  source?: string;
}

export interface SuburbComparison {
  targetSuburb: SuburbStats;
  nearbySuburbs: SuburbStats[];
  stateMedians: {
    housePrice: number;
    unitPrice: number;
    houseYield: number;
    unitYield: number;
    vacancyRate: number;
  };
}

export interface MarketDataError {
  code: 'RATE_LIMITED' | 'NOT_FOUND' | 'API_ERROR' | 'NETWORK_ERROR' | 'UNAUTHORIZED';
  message: string;
  retryAfter?: number; // milliseconds
}

export type MarketDataResult<T> =
  | { success: true; data: T }
  | { success: false; error: MarketDataError };

// ============ Provider Interface ============

export interface MarketDataProvider {
  /** Provider name for display */
  readonly name: string;

  /** Whether this provider requires API key */
  readonly requiresApiKey: boolean;

  /** Check if provider is configured and ready */
  isConfigured(): boolean;

  /** Get suburb statistics */
  getSuburbStats(
    suburb: string,
    state: AustralianState
  ): Promise<MarketDataResult<SuburbStats>>;

  /** Get nearby suburbs for comparison */
  getNearbySuburbs(
    suburb: string,
    state: AustralianState,
    radiusKm?: number
  ): Promise<MarketDataResult<SuburbStats[]>>;

  /** Get state median prices for comparison */
  getStateMedians(
    state: AustralianState
  ): Promise<MarketDataResult<SuburbStats>>;

  /** Search suburbs by name (for autocomplete) */
  searchSuburbs(
    query: string,
    state?: AustralianState
  ): Promise<MarketDataResult<Array<{ suburb: string; state: AustralianState; postcode: string }>>>;
}

// ============ Provider Registry ============

let currentProvider: MarketDataProvider | null = null;

/**
 * Set the active market data provider
 */
export function setMarketDataProvider(provider: MarketDataProvider): void {
  currentProvider = provider;
}

/**
 * Get the current market data provider
 */
export function getMarketDataProvider(): MarketDataProvider | null {
  return currentProvider;
}

/**
 * Check if a market data provider is configured
 */
export function hasMarketDataProvider(): boolean {
  return currentProvider !== null && currentProvider.isConfigured();
}

// ============ Helper Functions ============

/**
 * Compare property value to suburb median
 */
export function compareToMedian(
  propertyValue: number,
  suburbMedian: number | undefined,
  _propertyType: 'house' | 'unit'
): {
  difference: number;        // cents (positive = above median)
  differencePercent: number; // percentage
  isAboveMedian: boolean;
  comparison: 'above' | 'below' | 'at' | 'unknown';
} {
  if (!suburbMedian || suburbMedian <= 0) {
    return {
      difference: 0,
      differencePercent: 0,
      isAboveMedian: false,
      comparison: 'unknown',
    };
  }

  const difference = propertyValue - suburbMedian;
  const differencePercent = (difference / suburbMedian) * 100;

  return {
    difference,
    differencePercent: Math.round(differencePercent * 10) / 10,
    isAboveMedian: difference > 0,
    comparison: Math.abs(differencePercent) < 5 ? 'at' : difference > 0 ? 'above' : 'below',
  };
}

/**
 * Compare property yield to suburb average
 */
export function compareYieldToSuburb(
  propertyYield: number,
  suburbYield: number | undefined
): {
  difference: number;      // percentage points
  isAboveAverage: boolean;
  comparison: 'above' | 'below' | 'at' | 'unknown';
} {
  if (!suburbYield || suburbYield <= 0) {
    return {
      difference: 0,
      isAboveAverage: false,
      comparison: 'unknown',
    };
  }

  const difference = propertyYield - suburbYield;

  return {
    difference: Math.round(difference * 100) / 100,
    isAboveAverage: difference > 0,
    comparison: Math.abs(difference) < 0.2 ? 'at' : difference > 0 ? 'above' : 'below',
  };
}

/**
 * Calculate vacancy risk score based on vacancy rate
 */
export function calculateVacancyRisk(
  vacancyRate: number | undefined
): {
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  weeksVacantPerYear: number;
  incomeImpactPercent: number;
} {
  if (vacancyRate === undefined) {
    return {
      riskLevel: 'unknown',
      weeksVacantPerYear: 0,
      incomeImpactPercent: 0,
    };
  }

  const weeksVacantPerYear = Math.round((vacancyRate / 100) * 52 * 10) / 10;
  const incomeImpactPercent = Math.round(vacancyRate * 10) / 10;

  let riskLevel: 'low' | 'medium' | 'high';
  if (vacancyRate < 2) {
    riskLevel = 'low';
  } else if (vacancyRate < 4) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  return {
    riskLevel,
    weeksVacantPerYear,
    incomeImpactPercent,
  };
}

/**
 * Estimate market growth potential based on indicators
 */
export function estimateGrowthPotential(stats: SuburbStats): {
  score: number; // 1-10
  factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral' }>;
  recommendation: string;
} {
  const factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral' }> = [];
  let score = 5; // Start neutral

  // Vacancy rate factor
  if (stats.vacancyRate !== undefined) {
    if (stats.vacancyRate < 1.5) {
      score += 1;
      factors.push({ factor: 'Very low vacancy rate', impact: 'positive' });
    } else if (stats.vacancyRate > 4) {
      score -= 1;
      factors.push({ factor: 'High vacancy rate', impact: 'negative' });
    } else {
      factors.push({ factor: 'Moderate vacancy rate', impact: 'neutral' });
    }
  }

  // Population growth factor
  if (stats.populationGrowthRate !== undefined) {
    if (stats.populationGrowthRate > 2) {
      score += 1;
      factors.push({ factor: 'Strong population growth', impact: 'positive' });
    } else if (stats.populationGrowthRate < 0) {
      score -= 1;
      factors.push({ factor: 'Declining population', impact: 'negative' });
    }
  }

  // Historical growth factor
  if (stats.fiveYearGrowthHouse !== undefined) {
    if (stats.fiveYearGrowthHouse > 40) {
      score += 1;
      factors.push({ factor: 'Strong 5-year capital growth', impact: 'positive' });
    } else if (stats.fiveYearGrowthHouse < 10) {
      score -= 1;
      factors.push({ factor: 'Weak historical growth', impact: 'negative' });
    }
  }

  // Days on market factor
  if (stats.daysOnMarket !== undefined) {
    if (stats.daysOnMarket < 30) {
      score += 1;
      factors.push({ factor: 'Quick sales (under 30 days)', impact: 'positive' });
    } else if (stats.daysOnMarket > 90) {
      score -= 1;
      factors.push({ factor: 'Slow market (90+ days to sell)', impact: 'negative' });
    }
  }

  // Clamp score between 1-10
  score = Math.max(1, Math.min(10, score));

  let recommendation: string;
  if (score >= 7) {
    recommendation = 'Strong market fundamentals suggest good growth potential';
  } else if (score >= 5) {
    recommendation = 'Mixed indicators - conduct further research';
  } else {
    recommendation = 'Caution advised - review market conditions carefully';
  }

  return { score, factors, recommendation };
}
