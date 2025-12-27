/**
 * Property Portfolio Hooks
 *
 * React hooks for fetching property portfolio data using Dexie's useLiveQuery
 * for reactive updates.
 */

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type {
  Property,
  PropertyLoan,
  PropertyExpense,
  PropertyRental,
  PropertyStatus,
  AustralianState,
} from "@/types";
import { normalizeToAnnual } from "@/lib/utils/expense-normalizer";

// ============ Property Hooks ============

/**
 * Get all properties with optional filters
 */
export function useProperties(filters?: {
  status?: PropertyStatus;
  state?: AustralianState;
  memberId?: string;
}) {
  const properties = useLiveQuery(async () => {
    let results: Property[];

    if (filters?.status) {
      results = await db.properties
        .where("status")
        .equals(filters.status)
        .toArray();
    } else {
      results = await db.properties.toArray();
    }

    // Apply additional filters
    if (filters?.state) {
      results = results.filter((p) => p.state === filters.state);
    }
    if (filters?.memberId) {
      results = results.filter((p) => p.memberId === filters.memberId);
    }

    // Sort by purchase date (newest first)
    return results.sort(
      (a, b) =>
        new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
  }, [filters?.status, filters?.state, filters?.memberId]);

  return {
    properties: properties || [],
    isLoading: properties === undefined,
  };
}

/**
 * Get a single property by ID
 */
export function useProperty(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null;
    return db.properties.get(id);
  }, [id]);
}

/**
 * Get a property with all its related data
 */
export function usePropertyWithRelated(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null;

    const [property, loans, expenses, rentals, depreciation, models] =
      await Promise.all([
        db.properties.get(id),
        db.propertyLoans.where("propertyId").equals(id).toArray(),
        db.propertyExpenses.where("propertyId").equals(id).toArray(),
        db.propertyRentals.where("propertyId").equals(id).toArray(),
        db.propertyDepreciation.where("propertyId").equals(id).toArray(),
        db.propertyModels.where("propertyId").equals(id).toArray(),
      ]);

    if (!property) return null;

    return {
      property,
      loans,
      expenses,
      rentals,
      depreciation,
      models,
    };
  }, [id]);
}

// ============ Portfolio Summary Hooks ============

/**
 * Get portfolio summary (total value, equity, LVR, etc.)
 * Optimized: only loads loans for active properties using indexed query
 */
export function usePropertyPortfolioSummary() {
  return useLiveQuery(async () => {
    const properties = await db.properties.where("status").equals("active").toArray();

    if (properties.length === 0) {
      return {
        propertyCount: 0,
        totalValue: 0,
        totalPurchasePrice: 0,
        totalDebt: 0,
        totalEquity: 0,
        averageLVR: 0,
        totalGrowth: 0,
      };
    }

    // Only fetch loans for active properties using indexed query
    const propertyIds = properties.map((p) => p.id);
    const loans = await db.propertyLoans
      .where("propertyId")
      .anyOf(propertyIds)
      .toArray();

    // Create a map for O(1) loan lookups
    const loansByPropertyId = new Map<string, PropertyLoan[]>();
    for (const loan of loans) {
      const existing = loansByPropertyId.get(loan.propertyId) || [];
      existing.push(loan);
      loansByPropertyId.set(loan.propertyId, existing);
    }

    let totalValue = 0;
    let totalPurchasePrice = 0;
    let totalDebt = 0;

    for (const property of properties) {
      totalValue += property.valuationAmount;
      totalPurchasePrice += property.purchasePrice;

      // Sum loans for this property using the map
      const propertyLoans = loansByPropertyId.get(property.id) || [];
      const propertyDebt = propertyLoans.reduce((sum, loan) => {
        const effectiveBalance =
          loan.currentBalance - (loan.offsetBalance || 0);
        return sum + Math.max(0, effectiveBalance);
      }, 0);
      totalDebt += propertyDebt;
    }

    const totalEquity = totalValue - totalDebt;
    const averageLVR = totalValue > 0 ? (totalDebt / totalValue) * 100 : 0;
    const totalGrowth = totalPurchasePrice > 0
      ? ((totalValue - totalPurchasePrice) / totalPurchasePrice) * 100
      : 0;

    return {
      propertyCount: properties.length,
      totalValue,
      totalPurchasePrice,
      totalDebt,
      totalEquity,
      averageLVR: Math.round(averageLVR * 100) / 100,
      totalGrowth: Math.round(totalGrowth * 100) / 100,
    };
  }, []);
}

// ============ Loan Hooks ============

/**
 * Get loans for a property
 */
export function usePropertyLoans(propertyId: string | undefined) {
  const loans = useLiveQuery(async () => {
    if (!propertyId) return [];
    return db.propertyLoans.where("propertyId").equals(propertyId).toArray();
  }, [propertyId]);

  return {
    loans: loans || [],
    isLoading: loans === undefined,
  };
}

/**
 * Get total loan summary across all properties
 */
export function useLoanSummary() {
  return useLiveQuery(async () => {
    const loans = await db.propertyLoans.toArray();

    let totalOriginal = 0;
    let totalCurrent = 0;
    let totalOffset = 0;
    let totalLMI = 0;
    let weightedRate = 0;

    for (const loan of loans) {
      totalOriginal += loan.originalLoanAmount;
      totalCurrent += loan.currentBalance;
      totalOffset += loan.offsetBalance || 0;
      totalLMI += loan.lmiAmount || 0;
      weightedRate += loan.currentBalance * loan.interestRate;
    }

    const averageRate = totalCurrent > 0 ? weightedRate / totalCurrent : 0;
    const effectiveDebt = Math.max(0, totalCurrent - totalOffset);

    return {
      loanCount: loans.length,
      totalOriginal,
      totalCurrent,
      totalOffset,
      effectiveDebt,
      totalLMI,
      averageRate: Math.round(averageRate * 100) / 100,
      principalPaidOff: totalOriginal - totalCurrent,
    };
  }, []);
}

// ============ Expense Hooks ============

/**
 * Get expenses for a property
 */
export function usePropertyExpenses(propertyId: string | undefined) {
  const expenses = useLiveQuery(async () => {
    if (!propertyId) return [];
    return db.propertyExpenses.where("propertyId").equals(propertyId).toArray();
  }, [propertyId]);

  return {
    expenses: expenses || [],
    isLoading: expenses === undefined,
  };
}

/**
 * Get property expenses by financial year
 */
export function usePropertyExpensesByFY(financialYear: string) {
  return useLiveQuery(async () => {
    return db.propertyExpenses
      .where("financialYear")
      .equals(financialYear)
      .toArray();
  }, [financialYear]);
}

/**
 * Get expense summary for a property (annualized)
 */
export function usePropertyExpenseSummary(propertyId: string | undefined) {
  return useLiveQuery(async () => {
    if (!propertyId) return null;

    const expenses = await db.propertyExpenses
      .where("propertyId")
      .equals(propertyId)
      .toArray();

    // Calculate annualized expenses by category
    const byCategory: Record<string, number> = {};
    let totalAnnual = 0;

    for (const expense of expenses) {
      if (expense.isRecurring) {
        const annual = normalizeToAnnual(expense.amount, expense.frequency);
        totalAnnual += annual;

        if (byCategory[expense.category]) {
          byCategory[expense.category] += annual;
        } else {
          byCategory[expense.category] = annual;
        }
      }
    }

    return {
      byCategory,
      totalAnnual,
      totalMonthly: Math.round(totalAnnual / 12),
      totalWeekly: Math.round(totalAnnual / 52),
      expenseCount: expenses.length,
    };
  }, [propertyId]);
}

// ============ Rental Hooks ============

/**
 * Get rentals for a property
 */
export function usePropertyRentals(propertyId: string | undefined) {
  const rentals = useLiveQuery(async () => {
    if (!propertyId) return [];
    return db.propertyRentals
      .where("propertyId")
      .equals(propertyId)
      .toArray();
  }, [propertyId]);

  return {
    rentals: rentals || [],
    isLoading: rentals === undefined,
  };
}

/**
 * Get current active rental for a property
 */
export function useCurrentRental(propertyId: string | undefined) {
  return useLiveQuery(async () => {
    if (!propertyId) return null;

    const rentals = await db.propertyRentals
      .where("propertyId")
      .equals(propertyId)
      .toArray();

    const now = new Date();

    // Find current active rental (lease hasn't ended)
    const current = rentals.find(
      (r) => r.isCurrentlyOccupied && new Date(r.leaseEndDate) >= now
    );

    return current || null;
  }, [propertyId]);
}

/**
 * Get total rental income across all properties
 * Optimized: only loads rentals for active properties using indexed query
 */
export function useRentalIncomeSummary() {
  return useLiveQuery(async () => {
    const properties = await db.properties.where("status").equals("active").toArray();

    if (properties.length === 0) {
      return {
        totalWeeklyRent: 0,
        totalMonthlyRent: 0,
        totalAnnualRent: 0,
        occupiedCount: 0,
        vacantCount: 0,
        occupancyRate: 0,
      };
    }

    // Only fetch rentals for active properties using indexed query
    const propertyIds = properties.map((p) => p.id);
    const rentals = await db.propertyRentals
      .where("propertyId")
      .anyOf(propertyIds)
      .toArray();

    // Create a map for O(1) rental lookups
    const rentalsByPropertyId = new Map<string, PropertyRental[]>();
    for (const rental of rentals) {
      const existing = rentalsByPropertyId.get(rental.propertyId) || [];
      existing.push(rental);
      rentalsByPropertyId.set(rental.propertyId, existing);
    }

    let totalWeeklyRent = 0;
    let occupiedCount = 0;
    const now = new Date();

    for (const property of properties) {
      const propertyRentals = rentalsByPropertyId.get(property.id) || [];

      // Find current active rental
      const currentRental = propertyRentals.find(
        (r) => r.isCurrentlyOccupied && new Date(r.leaseEndDate) >= now
      );

      if (currentRental) {
        totalWeeklyRent += currentRental.weeklyRent;
        occupiedCount++;
      }
    }

    const totalProperties = properties.length;
    const occupancyRate = totalProperties > 0
      ? (occupiedCount / totalProperties) * 100
      : 0;

    return {
      totalWeeklyRent,
      totalMonthlyRent: Math.round((totalWeeklyRent * 52) / 12),
      totalAnnualRent: totalWeeklyRent * 52,
      occupiedCount,
      vacantCount: totalProperties - occupiedCount,
      occupancyRate: Math.round(occupancyRate),
    };
  }, []);
}

// ============ Depreciation Hooks ============

/**
 * Get depreciation records for a property
 */
export function usePropertyDepreciation(propertyId: string | undefined) {
  const depreciation = useLiveQuery(async () => {
    if (!propertyId) return [];
    return db.propertyDepreciation
      .where("propertyId")
      .equals(propertyId)
      .toArray();
  }, [propertyId]);

  return {
    depreciation: depreciation || [],
    isLoading: depreciation === undefined,
  };
}

/**
 * Get depreciation for a specific financial year
 */
export function useDepreciationByFY(
  propertyId: string | undefined,
  financialYear: string
) {
  return useLiveQuery(async () => {
    if (!propertyId) return null;

    const records = await db.propertyDepreciation
      .where("[propertyId+financialYear]")
      .equals([propertyId, financialYear])
      .toArray();

    return records[0] || null;
  }, [propertyId, financialYear]);
}

/**
 * Get total depreciation summary
 */
export function useDepreciationSummary(financialYear: string) {
  return useLiveQuery(async () => {
    const depreciation = await db.propertyDepreciation
      .where("financialYear")
      .equals(financialYear)
      .toArray();

    let totalDivision40 = 0;
    let totalDivision43 = 0;
    let totalDepreciation = 0;

    for (const record of depreciation) {
      totalDivision40 += record.division40Amount;
      totalDivision43 += record.division43Amount;
      totalDepreciation += record.totalDepreciation;
    }

    return {
      propertiesWithDepreciation: depreciation.length,
      totalDivision40,
      totalDivision43,
      totalDepreciation,
    };
  }, [financialYear]);
}

// ============ Model Hooks ============

/**
 * Get property models
 */
export function usePropertyModels(propertyId?: string) {
  const models = useLiveQuery(async () => {
    if (propertyId) {
      return db.propertyModels.where("propertyId").equals(propertyId).toArray();
    }
    return db.propertyModels.toArray();
  }, [propertyId]);

  return {
    models: models || [],
    isLoading: models === undefined,
  };
}

/**
 * Get a single model by ID
 */
export function usePropertyModel(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null;
    return db.propertyModels.get(id);
  }, [id]);
}

/**
 * Get standalone models (not linked to a property)
 */
export function useStandaloneModels() {
  const models = useLiveQuery(async () => {
    const allModels = await db.propertyModels.toArray();
    return allModels.filter((m) => !m.propertyId);
  }, []);

  return {
    models: models || [],
    isLoading: models === undefined,
  };
}

// ============ Tax Integration Hooks ============

/**
 * Get property tax summary for a financial year
 * Optimized: only loads rentals for active properties using indexed query
 */
export function usePropertyTaxSummary(financialYear: string) {
  return useLiveQuery(async () => {
    const properties = await db.properties.where("status").equals("active").toArray();

    if (properties.length === 0) {
      return {
        financialYear,
        totalRentalIncome: 0,
        totalDeductibleExpenses: 0,
        totalDepreciation: 0,
        totalGstClaimed: 0,
        netRentalIncome: 0,
        isNegativelyGeared: false,
        expensesByCategory: {},
        propertyCount: 0,
      };
    }

    const propertyIds = properties.map((p) => p.id);

    const [expenses, depreciation, rentals] = await Promise.all([
      db.propertyExpenses.where("financialYear").equals(financialYear).toArray(),
      db.propertyDepreciation
        .where("financialYear")
        .equals(financialYear)
        .toArray(),
      // Only fetch rentals for active properties using indexed query
      db.propertyRentals.where("propertyId").anyOf(propertyIds).toArray(),
    ]);

    // Create a map for O(1) rental lookups
    const rentalsByPropertyId = new Map<string, PropertyRental[]>();
    for (const rental of rentals) {
      const existing = rentalsByPropertyId.get(rental.propertyId) || [];
      existing.push(rental);
      rentalsByPropertyId.set(rental.propertyId, existing);
    }

    // Calculate total rental income (assuming full year occupancy for FY)
    let totalRentalIncome = 0;

    for (const property of properties) {
      const propertyRentals = rentalsByPropertyId.get(property.id) || [];

      // Use most recent rental rate
      const sortedRentals = propertyRentals.sort(
        (a, b) =>
          new Date(b.leaseStartDate).getTime() -
          new Date(a.leaseStartDate).getTime()
      );

      if (sortedRentals.length > 0) {
        totalRentalIncome += sortedRentals[0].weeklyRent * 52;
      }
    }

    // Calculate deductible expenses
    let totalDeductibleExpenses = 0;
    let totalGstClaimed = 0;
    const expensesByCategory: Record<string, number> = {};

    for (const expense of expenses) {
      if (expense.isDeductible) {
        const annual = expense.isRecurring
          ? normalizeToAnnual(expense.amount, expense.frequency)
          : expense.amount;

        totalDeductibleExpenses += annual;

        if (expense.gstAmount) {
          totalGstClaimed += expense.isRecurring
            ? normalizeToAnnual(expense.gstAmount, expense.frequency)
            : expense.gstAmount;
        }

        const category = expense.atoCategory || expense.category;
        if (expensesByCategory[category]) {
          expensesByCategory[category] += annual;
        } else {
          expensesByCategory[category] = annual;
        }
      }
    }

    // Calculate total depreciation
    let totalDepreciation = 0;
    for (const record of depreciation) {
      totalDepreciation += record.totalDepreciation;
    }

    // Net rental income/loss
    const netRentalIncome =
      totalRentalIncome - totalDeductibleExpenses - totalDepreciation;

    return {
      financialYear,
      totalRentalIncome,
      totalDeductibleExpenses,
      totalDepreciation,
      totalGstClaimed,
      netRentalIncome,
      isNegativelyGeared: netRentalIncome < 0,
      expensesByCategory,
      propertyCount: properties.length,
    };
  }, [financialYear]);
}

// ============ Portfolio Analytics Hooks ============

/**
 * Geographic and property type diversification breakdown
 * Returns percentage allocation by state and property type
 */
export function usePortfolioDiversification() {
  return useLiveQuery(async () => {
    const properties = await db.properties
      .where("status")
      .equals("active")
      .toArray();

    if (properties.length === 0) {
      return {
        byState: {} as Record<AustralianState, { count: number; value: number; percentage: number }>,
        byType: {} as Record<string, { count: number; value: number; percentage: number }>,
        totalValue: 0,
        propertyCount: 0,
        concentrationRisk: {
          topStatePercentage: 0,
          topState: null as AustralianState | null,
          isHighlyConcentrated: false, // > 80% in one state
        },
      };
    }

    // Calculate total portfolio value
    const totalValue = properties.reduce((sum, p) => sum + p.valuationAmount, 0);

    // Group by state
    const byState: Record<string, { count: number; value: number; percentage: number }> = {};
    for (const property of properties) {
      if (!byState[property.state]) {
        byState[property.state] = { count: 0, value: 0, percentage: 0 };
      }
      byState[property.state].count++;
      byState[property.state].value += property.valuationAmount;
    }

    // Calculate percentages for states
    for (const state of Object.keys(byState)) {
      byState[state].percentage =
        totalValue > 0
          ? Math.round((byState[state].value / totalValue) * 10000) / 100
          : 0;
    }

    // Group by property type
    const byType: Record<string, { count: number; value: number; percentage: number }> = {};
    for (const property of properties) {
      if (!byType[property.propertyType]) {
        byType[property.propertyType] = { count: 0, value: 0, percentage: 0 };
      }
      byType[property.propertyType].count++;
      byType[property.propertyType].value += property.valuationAmount;
    }

    // Calculate percentages for types
    for (const type of Object.keys(byType)) {
      byType[type].percentage =
        totalValue > 0
          ? Math.round((byType[type].value / totalValue) * 10000) / 100
          : 0;
    }

    // Find concentration risk (top state)
    let topState: AustralianState | null = null;
    let topStatePercentage = 0;
    for (const [state, data] of Object.entries(byState)) {
      if (data.percentage > topStatePercentage) {
        topStatePercentage = data.percentage;
        topState = state as AustralianState;
      }
    }

    return {
      byState: byState as Record<AustralianState, { count: number; value: number; percentage: number }>,
      byType,
      totalValue,
      propertyCount: properties.length,
      concentrationRisk: {
        topStatePercentage,
        topState,
        isHighlyConcentrated: topStatePercentage > 80,
      },
    };
  }, []);
}

/**
 * Weighted average portfolio yield
 * Calculates gross and net rental yields across the entire portfolio
 */
export function usePortfolioYield() {
  return useLiveQuery(async () => {
    const properties = await db.properties
      .where("status")
      .equals("active")
      .toArray();

    if (properties.length === 0) {
      return {
        weightedGrossYield: 0,
        weightedNetYield: 0,
        totalAnnualRent: 0,
        totalAnnualExpenses: 0,
        totalPropertyValue: 0,
        yieldByProperty: [] as Array<{
          propertyId: string;
          address: string;
          grossYield: number;
          netYield: number;
          annualRent: number;
          annualExpenses: number;
          value: number;
        }>,
      };
    }

    const propertyIds = properties.map((p) => p.id);

    // Fetch rentals and expenses for all active properties
    const [rentals, expenses] = await Promise.all([
      db.propertyRentals.where("propertyId").anyOf(propertyIds).toArray(),
      db.propertyExpenses.where("propertyId").anyOf(propertyIds).toArray(),
    ]);

    // Create maps for O(1) lookups
    const rentalsByPropertyId = new Map<string, PropertyRental[]>();
    for (const rental of rentals) {
      const existing = rentalsByPropertyId.get(rental.propertyId) || [];
      existing.push(rental);
      rentalsByPropertyId.set(rental.propertyId, existing);
    }

    const expensesByPropertyId = new Map<string, PropertyExpense[]>();
    for (const expense of expenses) {
      const existing = expensesByPropertyId.get(expense.propertyId) || [];
      existing.push(expense);
      expensesByPropertyId.set(expense.propertyId, existing);
    }

    let totalPropertyValue = 0;
    let totalAnnualRent = 0;
    let totalAnnualExpenses = 0;
    const yieldByProperty: Array<{
      propertyId: string;
      address: string;
      grossYield: number;
      netYield: number;
      annualRent: number;
      annualExpenses: number;
      value: number;
    }> = [];

    const now = new Date();

    for (const property of properties) {
      const propertyRentals = rentalsByPropertyId.get(property.id) || [];
      const propertyExpenses = expensesByPropertyId.get(property.id) || [];

      // Find current active rental
      const currentRental = propertyRentals.find(
        (r) => r.isCurrentlyOccupied && new Date(r.leaseEndDate) >= now
      );

      const annualRent = currentRental ? currentRental.weeklyRent * 52 : 0;

      // Calculate annualized expenses
      let annualExpenses = 0;
      for (const expense of propertyExpenses) {
        if (expense.isRecurring) {
          annualExpenses += normalizeToAnnual(expense.amount, expense.frequency);
        }
      }

      const value = property.valuationAmount;
      const grossYield = value > 0 ? (annualRent / value) * 100 : 0;
      const netYield = value > 0 ? ((annualRent - annualExpenses) / value) * 100 : 0;

      totalPropertyValue += value;
      totalAnnualRent += annualRent;
      totalAnnualExpenses += annualExpenses;

      yieldByProperty.push({
        propertyId: property.id,
        address: property.address,
        grossYield: Math.round(grossYield * 100) / 100,
        netYield: Math.round(netYield * 100) / 100,
        annualRent,
        annualExpenses,
        value,
      });
    }

    // Calculate weighted averages
    const weightedGrossYield =
      totalPropertyValue > 0
        ? (totalAnnualRent / totalPropertyValue) * 100
        : 0;
    const weightedNetYield =
      totalPropertyValue > 0
        ? ((totalAnnualRent - totalAnnualExpenses) / totalPropertyValue) * 100
        : 0;

    // Sort by gross yield (highest first)
    yieldByProperty.sort((a, b) => b.grossYield - a.grossYield);

    return {
      weightedGrossYield: Math.round(weightedGrossYield * 100) / 100,
      weightedNetYield: Math.round(weightedNetYield * 100) / 100,
      totalAnnualRent,
      totalAnnualExpenses,
      totalPropertyValue,
      yieldByProperty,
    };
  }, []);
}

/**
 * Equity extraction calculator
 * Calculates usable equity per property and total accessible equity
 * Based on 80% LVR for available equity (conservative lending threshold)
 */
export function useEquityExtraction(targetLVR: number = 80) {
  return useLiveQuery(async () => {
    const properties = await db.properties
      .where("status")
      .equals("active")
      .toArray();

    if (properties.length === 0) {
      return {
        totalUsableEquity: 0,
        totalCurrentEquity: 0,
        totalPropertyValue: 0,
        totalCurrentDebt: 0,
        equityByProperty: [] as Array<{
          propertyId: string;
          address: string;
          propertyValue: number;
          currentDebt: number;
          currentEquity: number;
          currentLVR: number;
          maxDebtAtTargetLVR: number;
          usableEquity: number;
          canExtractEquity: boolean;
        }>,
        targetLVR,
      };
    }

    const propertyIds = properties.map((p) => p.id);

    // Fetch loans for all active properties
    const loans = await db.propertyLoans
      .where("propertyId")
      .anyOf(propertyIds)
      .toArray();

    // Create map for O(1) lookups
    const loansByPropertyId = new Map<string, PropertyLoan[]>();
    for (const loan of loans) {
      const existing = loansByPropertyId.get(loan.propertyId) || [];
      existing.push(loan);
      loansByPropertyId.set(loan.propertyId, existing);
    }

    let totalUsableEquity = 0;
    let totalCurrentEquity = 0;
    let totalPropertyValue = 0;
    let totalCurrentDebt = 0;

    const equityByProperty: Array<{
      propertyId: string;
      address: string;
      propertyValue: number;
      currentDebt: number;
      currentEquity: number;
      currentLVR: number;
      maxDebtAtTargetLVR: number;
      usableEquity: number;
      canExtractEquity: boolean;
    }> = [];

    for (const property of properties) {
      const propertyLoans = loansByPropertyId.get(property.id) || [];

      // Calculate effective debt (current balance minus offset)
      const currentDebt = propertyLoans.reduce((sum, loan) => {
        const effectiveBalance = loan.currentBalance - (loan.offsetBalance || 0);
        return sum + Math.max(0, effectiveBalance);
      }, 0);

      const propertyValue = property.valuationAmount;
      const currentEquity = propertyValue - currentDebt;
      const currentLVR = propertyValue > 0 ? (currentDebt / propertyValue) * 100 : 0;

      // Calculate max debt at target LVR (e.g., 80%)
      const maxDebtAtTargetLVR = (propertyValue * targetLVR) / 100;

      // Usable equity is the difference between max debt and current debt
      const usableEquity = Math.max(0, maxDebtAtTargetLVR - currentDebt);
      const canExtractEquity = usableEquity > 0;

      totalPropertyValue += propertyValue;
      totalCurrentDebt += currentDebt;
      totalCurrentEquity += currentEquity;
      totalUsableEquity += usableEquity;

      equityByProperty.push({
        propertyId: property.id,
        address: property.address,
        propertyValue,
        currentDebt,
        currentEquity,
        currentLVR: Math.round(currentLVR * 100) / 100,
        maxDebtAtTargetLVR,
        usableEquity,
        canExtractEquity,
      });
    }

    // Sort by usable equity (highest first)
    equityByProperty.sort((a, b) => b.usableEquity - a.usableEquity);

    return {
      totalUsableEquity,
      totalCurrentEquity,
      totalPropertyValue,
      totalCurrentDebt,
      equityByProperty,
      targetLVR,
    };
  }, [targetLVR]);
}

/**
 * Cross-collateralization risk analysis
 * Identifies properties with cross-secured loans and calculates risk exposure
 */
export function useCrossCollateralizationRisk() {
  return useLiveQuery(async () => {
    const properties = await db.properties
      .where("status")
      .equals("active")
      .toArray();

    if (properties.length === 0) {
      return {
        hasCrossCollateralization: false,
        crossSecuredGroups: [] as Array<{
          lender: string;
          propertyIds: string[];
          totalValue: number;
          totalDebt: number;
        }>,
        riskLevel: "low" as "low" | "medium" | "high",
        independentProperties: 0,
        crossSecuredProperties: 0,
      };
    }

    const propertyIds = properties.map((p) => p.id);
    const loans = await db.propertyLoans
      .where("propertyId")
      .anyOf(propertyIds)
      .toArray();

    // Group loans by lender to identify potential cross-collateralization
    const loansByLender = new Map<string, PropertyLoan[]>();
    for (const loan of loans) {
      const existing = loansByLender.get(loan.lender) || [];
      existing.push(loan);
      loansByLender.set(loan.lender, existing);
    }

    // Create property lookup map
    const propertyMap = new Map<string, Property>();
    for (const property of properties) {
      propertyMap.set(property.id, property);
    }

    const crossSecuredGroups: Array<{
      lender: string;
      propertyIds: string[];
      totalValue: number;
      totalDebt: number;
    }> = [];

    const crossSecuredPropertyIds = new Set<string>();

    // Identify cross-secured groups (multiple properties with same lender)
    for (const [lender, lenderLoans] of loansByLender) {
      const uniquePropertyIds = [...new Set(lenderLoans.map((l) => l.propertyId))];

      if (uniquePropertyIds.length > 1) {
        let totalValue = 0;
        let totalDebt = 0;

        for (const propId of uniquePropertyIds) {
          const property = propertyMap.get(propId);
          if (property) {
            totalValue += property.valuationAmount;
          }
          crossSecuredPropertyIds.add(propId);
        }

        for (const loan of lenderLoans) {
          const effectiveBalance = loan.currentBalance - (loan.offsetBalance || 0);
          totalDebt += Math.max(0, effectiveBalance);
        }

        crossSecuredGroups.push({
          lender,
          propertyIds: uniquePropertyIds,
          totalValue,
          totalDebt,
        });
      }
    }

    const crossSecuredProperties = crossSecuredPropertyIds.size;
    const independentProperties = properties.length - crossSecuredProperties;
    const hasCrossCollateralization = crossSecuredGroups.length > 0;

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" = "low";
    if (crossSecuredProperties > 0) {
      const crossSecuredPercentage =
        (crossSecuredProperties / properties.length) * 100;
      if (crossSecuredPercentage > 50) {
        riskLevel = "high";
      } else if (crossSecuredPercentage > 25) {
        riskLevel = "medium";
      }
    }

    return {
      hasCrossCollateralization,
      crossSecuredGroups,
      riskLevel,
      independentProperties,
      crossSecuredProperties,
    };
  }, []);
}

/**
 * Portfolio cashflow summary
 * Calculates monthly cashflow position across all properties (before and after tax)
 */
export function usePortfolioCashflow() {
  return useLiveQuery(async () => {
    const properties = await db.properties
      .where("status")
      .equals("active")
      .toArray();

    if (properties.length === 0) {
      return {
        monthlyRentalIncome: 0,
        monthlyLoanRepayments: 0,
        monthlyExpenses: 0,
        monthlyCashflowBeforeTax: 0,
        annualCashflowBeforeTax: 0,
        positiveCashflowProperties: 0,
        negativeCashflowProperties: 0,
        cashflowByProperty: [] as Array<{
          propertyId: string;
          address: string;
          monthlyRent: number;
          monthlyRepayment: number;
          monthlyExpenses: number;
          monthlyCashflow: number;
          isPositive: boolean;
        }>,
      };
    }

    const propertyIds = properties.map((p) => p.id);

    const [loans, rentals, expenses] = await Promise.all([
      db.propertyLoans.where("propertyId").anyOf(propertyIds).toArray(),
      db.propertyRentals.where("propertyId").anyOf(propertyIds).toArray(),
      db.propertyExpenses.where("propertyId").anyOf(propertyIds).toArray(),
    ]);

    // Create maps for O(1) lookups
    const loansByPropertyId = new Map<string, PropertyLoan[]>();
    for (const loan of loans) {
      const existing = loansByPropertyId.get(loan.propertyId) || [];
      existing.push(loan);
      loansByPropertyId.set(loan.propertyId, existing);
    }

    const rentalsByPropertyId = new Map<string, PropertyRental[]>();
    for (const rental of rentals) {
      const existing = rentalsByPropertyId.get(rental.propertyId) || [];
      existing.push(rental);
      rentalsByPropertyId.set(rental.propertyId, existing);
    }

    const expensesByPropertyId = new Map<string, PropertyExpense[]>();
    for (const expense of expenses) {
      const existing = expensesByPropertyId.get(expense.propertyId) || [];
      existing.push(expense);
      expensesByPropertyId.set(expense.propertyId, existing);
    }

    let totalMonthlyRent = 0;
    let totalMonthlyRepayments = 0;
    let totalMonthlyExpenses = 0;
    let positiveCashflowProperties = 0;
    let negativeCashflowProperties = 0;

    const cashflowByProperty: Array<{
      propertyId: string;
      address: string;
      monthlyRent: number;
      monthlyRepayment: number;
      monthlyExpenses: number;
      monthlyCashflow: number;
      isPositive: boolean;
    }> = [];

    const now = new Date();

    for (const property of properties) {
      const propertyLoans = loansByPropertyId.get(property.id) || [];
      const propertyRentals = rentalsByPropertyId.get(property.id) || [];
      const propertyExpenses = expensesByPropertyId.get(property.id) || [];

      // Monthly rent from current active rental
      const currentRental = propertyRentals.find(
        (r) => r.isCurrentlyOccupied && new Date(r.leaseEndDate) >= now
      );
      const monthlyRent = currentRental
        ? Math.round((currentRental.weeklyRent * 52) / 12)
        : 0;

      // Monthly loan repayments (convert from repaymentAmount based on frequency)
      // Note: If repaymentFrequency is missing, we assume the amount is monthly.
      // This is a safe default but may be incorrect if data was entered as weekly/fortnightly.
      const monthlyRepayment = propertyLoans.reduce((sum, loan) => {
        if (!loan.repaymentAmount || loan.repaymentAmount <= 0) return sum;
        const monthlyAmount = loan.repaymentFrequency
          ? normalizeToAnnual(loan.repaymentAmount, loan.repaymentFrequency) / 12
          : loan.repaymentAmount;
        return sum + Math.round(monthlyAmount);
      }, 0);

      // Monthly expenses (recurring only)
      let monthlyExpenses = 0;
      for (const expense of propertyExpenses) {
        if (expense.isRecurring) {
          const annual = normalizeToAnnual(expense.amount, expense.frequency);
          monthlyExpenses += Math.round(annual / 12);
        }
      }

      const monthlyCashflow = monthlyRent - monthlyRepayment - monthlyExpenses;
      const isPositive = monthlyCashflow >= 0;

      if (isPositive) {
        positiveCashflowProperties++;
      } else {
        negativeCashflowProperties++;
      }

      totalMonthlyRent += monthlyRent;
      totalMonthlyRepayments += monthlyRepayment;
      totalMonthlyExpenses += monthlyExpenses;

      cashflowByProperty.push({
        propertyId: property.id,
        address: property.address,
        monthlyRent,
        monthlyRepayment,
        monthlyExpenses,
        monthlyCashflow,
        isPositive,
      });
    }

    // Sort by cashflow (best first)
    cashflowByProperty.sort((a, b) => b.monthlyCashflow - a.monthlyCashflow);

    const monthlyCashflowBeforeTax =
      totalMonthlyRent - totalMonthlyRepayments - totalMonthlyExpenses;

    return {
      monthlyRentalIncome: totalMonthlyRent,
      monthlyLoanRepayments: totalMonthlyRepayments,
      monthlyExpenses: totalMonthlyExpenses,
      monthlyCashflowBeforeTax,
      annualCashflowBeforeTax: monthlyCashflowBeforeTax * 12,
      positiveCashflowProperties,
      negativeCashflowProperties,
      cashflowByProperty,
    };
  }, []);
}
