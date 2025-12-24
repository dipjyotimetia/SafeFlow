/**
 * Microburbs Market Data Provider
 *
 * Integration with Microburbs API for Australian suburb data.
 * https://www.microburbs.com.au/
 *
 * Free tier includes:
 * - Suburb demographics
 * - School ratings
 * - Basic property stats
 *
 * Note: This is a stub implementation - actual API integration
 * requires registering for an API key at Microburbs.
 */

import type { AustralianState } from "@/types";
import type {
  MarketDataProvider,
  MarketDataResult,
  SuburbStats,
} from "./provider";

// ============ API Configuration ============

interface MicroburbsConfig {
  apiKey: string;
  baseUrl: string;
  rateLimitPerMinute: number;
}

const DEFAULT_CONFIG: Omit<MicroburbsConfig, "apiKey"> = {
  baseUrl: "https://api.microburbs.com.au/v1",
  rateLimitPerMinute: 10, // Free tier limit (estimated)
};

// ============ API Response Types ============

interface MicroburbsSuburbResponse {
  suburb: {
    name: string;
    state: string;
    postcode: string;
    coordinates: { lat: number; lng: number };
  };
  demographics: {
    population: number;
    populationGrowth: number;
    medianAge: number;
    medianHouseholdIncome: number;
    ownerOccupied: number;
    renting: number;
  };
  property: {
    medianHousePrice?: number;
    medianUnitPrice?: number;
    houseGrowth1Year?: number;
    unitGrowth1Year?: number;
    averageDaysOnMarket?: number;
  };
  rental?: {
    medianWeeklyRentHouse?: number;
    medianWeeklyRentUnit?: number;
    vacancyRate?: number;
  };
  schools?: Array<{
    name: string;
    type: string;
    rating: number;
  }>;
}

// ============ Rate Limiting ============

class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxPerMinute: number) {
    this.maxRequests = maxPerMinute;
    this.windowMs = 60000; // 1 minute
  }

  canMakeRequest(): boolean {
    this.cleanup();
    return this.timestamps.length < this.maxRequests;
  }

  recordRequest(): void {
    this.timestamps.push(Date.now());
  }

  getRetryAfterMs(): number {
    if (this.timestamps.length === 0) return 0;
    const oldestInWindow = this.timestamps[0];
    return Math.max(0, oldestInWindow + this.windowMs - Date.now());
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
  }
}

// ============ Provider Implementation ============

export class MicroburbsProvider implements MarketDataProvider {
  readonly name = "Microburbs";
  readonly requiresApiKey = true;

  private config: MicroburbsConfig | null = null;
  private rateLimiter: RateLimiter | null = null;

  /**
   * Configure the provider with API key
   */
  configure(apiKey: string, options?: Partial<MicroburbsConfig>): void {
    this.config = {
      apiKey,
      ...DEFAULT_CONFIG,
      ...options,
    };
    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  async getSuburbStats(
    suburb: string,
    state: AustralianState
  ): Promise<MarketDataResult<SuburbStats>> {
    if (!this.config) {
      return {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Microburbs API not configured. Add API key in settings.",
        },
      };
    }

    if (!this.rateLimiter?.canMakeRequest()) {
      return {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Rate limit exceeded. Please wait before making more requests.",
          retryAfter: this.rateLimiter?.getRetryAfterMs(),
        },
      };
    }

    try {
      this.rateLimiter.recordRequest();

      const response = await this.fetchSuburb(suburb, state);
      return {
        success: true,
        data: this.mapResponse(response),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getNearbySuburbs(
    suburb: string,
    state: AustralianState,
    radiusKm: number = 5
  ): Promise<MarketDataResult<SuburbStats[]>> {
    if (!this.config) {
      return {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Microburbs API not configured",
        },
      };
    }

    if (!this.rateLimiter?.canMakeRequest()) {
      return {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Rate limit exceeded",
          retryAfter: this.rateLimiter?.getRetryAfterMs(),
        },
      };
    }

    try {
      this.rateLimiter.recordRequest();

      const response = await this.fetchNearby(suburb, state, radiusKm);
      return {
        success: true,
        data: response.map((r) => this.mapResponse(r)),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getStateMedians(
    state: AustralianState
  ): Promise<MarketDataResult<SuburbStats>> {
    // Microburbs may not have state-level data in free tier
    // Return a stub that indicates this needs paid tier
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "State median data requires Microburbs paid tier",
      },
    };
  }

  async searchSuburbs(
    query: string,
    state?: AustralianState
  ): Promise<MarketDataResult<Array<{ suburb: string; state: AustralianState; postcode: string }>>> {
    if (!this.config) {
      return {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Microburbs API not configured",
        },
      };
    }

    if (!this.rateLimiter?.canMakeRequest()) {
      return {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Rate limit exceeded",
          retryAfter: this.rateLimiter?.getRetryAfterMs(),
        },
      };
    }

    try {
      this.rateLimiter.recordRequest();

      const results = await this.searchApi(query, state);
      return { success: true, data: results };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============ API Methods (Stubs - Replace with actual API calls) ============

  private async fetchSuburb(
    suburb: string,
    state: AustralianState
  ): Promise<MicroburbsSuburbResponse> {
    // TODO: Replace with actual API call when API key available
    // const url = `${this.config!.baseUrl}/suburbs/${state}/${encodeURIComponent(suburb)}`;
    // const response = await fetch(url, {
    //   headers: { 'Authorization': `Bearer ${this.config!.apiKey}` }
    // });
    // return response.json();

    // Stub response for development
    throw new Error(
      `Microburbs API integration pending. Suburb: ${suburb}, State: ${state}`
    );
  }

  private async fetchNearby(
    suburb: string,
    state: AustralianState,
    radiusKm: number
  ): Promise<MicroburbsSuburbResponse[]> {
    // TODO: Replace with actual API call
    throw new Error(
      `Microburbs nearby API pending. Suburb: ${suburb}, State: ${state}, Radius: ${radiusKm}km`
    );
  }

  private async searchApi(
    query: string,
    state?: AustralianState
  ): Promise<Array<{ suburb: string; state: AustralianState; postcode: string }>> {
    // TODO: Replace with actual API call
    throw new Error(
      `Microburbs search API pending. Query: ${query}, State: ${state || "all"}`
    );
  }

  // ============ Response Mapping ============

  private mapResponse(response: MicroburbsSuburbResponse): SuburbStats {
    const { suburb, demographics, property, rental } = response;

    // Calculate yields if we have price and rent data
    let houseYield: number | undefined;
    let unitYield: number | undefined;

    if (property.medianHousePrice && rental?.medianWeeklyRentHouse) {
      houseYield =
        ((rental.medianWeeklyRentHouse * 52) / property.medianHousePrice) * 100;
    }
    if (property.medianUnitPrice && rental?.medianWeeklyRentUnit) {
      unitYield =
        ((rental.medianWeeklyRentUnit * 52) / property.medianUnitPrice) * 100;
    }

    return {
      suburb: suburb.name,
      state: suburb.state as AustralianState,
      postcode: suburb.postcode,

      // Convert dollars to cents for consistency with app
      medianHousePrice: property.medianHousePrice
        ? property.medianHousePrice * 100
        : undefined,
      medianUnitPrice: property.medianUnitPrice
        ? property.medianUnitPrice * 100
        : undefined,
      medianWeeklyRentHouse: rental?.medianWeeklyRentHouse
        ? rental.medianWeeklyRentHouse * 100
        : undefined,
      medianWeeklyRentUnit: rental?.medianWeeklyRentUnit
        ? rental.medianWeeklyRentUnit * 100
        : undefined,

      houseYield: houseYield
        ? Math.round(houseYield * 100) / 100
        : undefined,
      unitYield: unitYield
        ? Math.round(unitYield * 100) / 100
        : undefined,
      vacancyRate: rental?.vacancyRate,

      daysOnMarket: property.averageDaysOnMarket,
      annualGrowthHouse: property.houseGrowth1Year,
      annualGrowthUnit: property.unitGrowth1Year,

      population: demographics.population,
      populationGrowthRate: demographics.populationGrowth,
      medianHouseholdIncome: demographics.medianHouseholdIncome * 100, // to cents
      ownerOccupiedPercentage: demographics.ownerOccupied,

      source: "Microburbs",
      dataAsOf: new Date(),
    };
  }

  private handleError(error: unknown): MarketDataResult<never> {
    if (error instanceof Error) {
      if (error.message.includes("401") || error.message.includes("403")) {
        return {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired Microburbs API key",
          },
        };
      }
      if (error.message.includes("404")) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Suburb not found in Microburbs database",
          },
        };
      }
      if (error.message.includes("429")) {
        return {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Microburbs API rate limit exceeded",
            retryAfter: 60000, // 1 minute
          },
        };
      }
      if (error.message.includes("network") || error.message.includes("fetch")) {
        return {
          success: false,
          error: {
            code: "NETWORK_ERROR",
            message: "Unable to connect to Microburbs API",
          },
        };
      }
    }

    return {
      success: false,
      error: {
        code: "API_ERROR",
        message: error instanceof Error ? error.message : "Unknown API error",
      },
    };
  }
}

// ============ Singleton Export ============

export const microburbsProvider = new MicroburbsProvider();
