/**
 * Local Market Data Provider
 *
 * Default provider that uses user-entered market data stored locally.
 * No external API calls - all data is manually entered by the user.
 *
 * This is useful for:
 * - Users without API access
 * - Storing custom research data
 * - Overriding API data with personal knowledge
 */

import { db } from "@/lib/db";
import type { AustralianState } from "@/types";
import type {
  MarketDataProvider,
  MarketDataResult,
  SuburbStats,
} from "./provider";

// ============ Local Storage Schema ============

/**
 * User-entered suburb data stored in IndexedDB
 */
export interface LocalSuburbData {
  id: string; // `${suburb}-${state}-${postcode}`
  suburb: string;
  state: AustralianState;
  postcode: string;

  // User-entered values
  medianHousePrice?: number;
  medianUnitPrice?: number;
  weeklyRentHouse?: number;
  weeklyRentUnit?: number;
  vacancyRate?: number;
  notes?: string;

  // Metadata
  enteredAt: Date;
  updatedAt: Date;
  source?: string; // Where user got the data
}

// ============ Provider Implementation ============

export class LocalMarketDataProvider implements MarketDataProvider {
  readonly name = "Local (User-Entered)";
  readonly requiresApiKey = false;

  isConfigured(): boolean {
    return true; // Always available
  }

  async getSuburbStats(
    suburb: string,
    state: AustralianState,
  ): Promise<MarketDataResult<SuburbStats>> {
    try {
      // Search for matching suburb in local storage
      const localData = await this.findLocalSuburb(suburb, state);

      if (!localData) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `No local data found for ${suburb}, ${state}. Add data manually in settings.`,
          },
        };
      }

      return {
        success: true,
        data: this.localToSuburbStats(localData),
      };
    } catch {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: "Failed to read local market data",
        },
      };
    }
  }

  async getNearbySuburbs(
    suburb: string,
    state: AustralianState,
  ): Promise<MarketDataResult<SuburbStats[]>> {
    try {
      // Get all suburbs in the same state
      const allLocal = await this.getAllLocalSuburbs(state);

      // Filter out the target suburb
      const nearby = allLocal.filter(
        (s) => s.suburb.toLowerCase() !== suburb.toLowerCase(),
      );

      return {
        success: true,
        data: nearby.map((s) => this.localToSuburbStats(s)),
      };
    } catch {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: "Failed to read local market data",
        },
      };
    }
  }

  async getStateMedians(
    state: AustralianState,
  ): Promise<MarketDataResult<SuburbStats>> {
    try {
      const allLocal = await this.getAllLocalSuburbs(state);

      if (allLocal.length === 0) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `No local data found for ${state}`,
          },
        };
      }

      // Calculate medians from local data
      const housePrices = allLocal
        .map((s) => s.medianHousePrice)
        .filter((p): p is number => p !== undefined);
      const unitPrices = allLocal
        .map((s) => s.medianUnitPrice)
        .filter((p): p is number => p !== undefined);

      return {
        success: true,
        data: {
          suburb: `${state} State Median`,
          state,
          postcode: "",
          medianHousePrice: this.median(housePrices),
          medianUnitPrice: this.median(unitPrices),
          source: "Local (calculated from user entries)",
          dataAsOf: new Date(),
        },
      };
    } catch {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: "Failed to calculate state medians",
        },
      };
    }
  }

  async searchSuburbs(
    query: string,
    state?: AustralianState,
  ): Promise<
    MarketDataResult<
      Array<{ suburb: string; state: AustralianState; postcode: string }>
    >
  > {
    try {
      const allLocal = state
        ? await this.getAllLocalSuburbs(state)
        : await this.getAllLocalSuburbsAllStates();

      const matches = allLocal
        .filter(
          (s) =>
            s.suburb.toLowerCase().includes(query.toLowerCase()) ||
            s.postcode.includes(query),
        )
        .map((s) => ({
          suburb: s.suburb,
          state: s.state,
          postcode: s.postcode,
        }));

      return { success: true, data: matches };
    } catch {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: "Failed to search local suburbs",
        },
      };
    }
  }

  // ============ Local Storage Operations ============

  private async findLocalSuburb(
    suburb: string,
    state: AustralianState,
  ): Promise<LocalSuburbData | undefined> {
    try {
      const all = await db.marketData.toArray();
      return all.find(
        (s: LocalSuburbData) =>
          s.suburb.toLowerCase() === suburb.toLowerCase() && s.state === state,
      );
    } catch (error) {
      console.error("Failed to find local suburb:", error);
      return undefined;
    }
  }

  private async getAllLocalSuburbs(
    state: AustralianState,
  ): Promise<LocalSuburbData[]> {
    try {
      const all = await db.marketData.toArray();
      return all.filter((s: LocalSuburbData) => s.state === state);
    } catch (error) {
      console.error("Failed to fetch local suburbs:", error);
      return [];
    }
  }

  private async getAllLocalSuburbsAllStates(): Promise<LocalSuburbData[]> {
    try {
      return await db.marketData.toArray();
    } catch (error) {
      console.error("Failed to fetch all local suburbs:", error);
      return [];
    }
  }

  private localToSuburbStats(local: LocalSuburbData): SuburbStats {
    // Calculate yields from entered data
    let houseYield: number | undefined;
    let unitYield: number | undefined;

    if (local.medianHousePrice && local.weeklyRentHouse) {
      houseYield =
        ((local.weeklyRentHouse * 52) / local.medianHousePrice) * 100;
    }
    if (local.medianUnitPrice && local.weeklyRentUnit) {
      unitYield = ((local.weeklyRentUnit * 52) / local.medianUnitPrice) * 100;
    }

    return {
      suburb: local.suburb,
      state: local.state,
      postcode: local.postcode,
      medianHousePrice: local.medianHousePrice,
      medianUnitPrice: local.medianUnitPrice,
      medianWeeklyRentHouse: local.weeklyRentHouse,
      medianWeeklyRentUnit: local.weeklyRentUnit,
      houseYield: houseYield ? Math.round(houseYield * 100) / 100 : undefined,
      unitYield: unitYield ? Math.round(unitYield * 100) / 100 : undefined,
      vacancyRate: local.vacancyRate,
      source: local.source || "User-entered",
      dataAsOf: local.updatedAt,
    };
  }

  private median(values: number[]): number | undefined {
    if (values.length === 0) return undefined;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
}

// ============ Singleton Export ============

export const localMarketData = new LocalMarketDataProvider();
