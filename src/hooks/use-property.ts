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
  PropertyDepreciation,
  PropertyModel,
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
 */
export function usePropertyPortfolioSummary() {
  return useLiveQuery(async () => {
    const [properties, loans] = await Promise.all([
      db.properties.where("status").equals("active").toArray(),
      db.propertyLoans.toArray(),
    ]);

    let totalValue = 0;
    let totalPurchasePrice = 0;
    let totalDebt = 0;

    for (const property of properties) {
      totalValue += property.valuationAmount;
      totalPurchasePrice += property.purchasePrice;

      // Sum loans for this property
      const propertyLoans = loans.filter((l) => l.propertyId === property.id);
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
 */
export function useRentalIncomeSummary() {
  return useLiveQuery(async () => {
    const [properties, rentals] = await Promise.all([
      db.properties.where("status").equals("active").toArray(),
      db.propertyRentals.toArray(),
    ]);

    let totalWeeklyRent = 0;
    let occupiedCount = 0;
    const now = new Date();

    for (const property of properties) {
      const propertyRentals = rentals.filter(
        (r) => r.propertyId === property.id
      );

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
 */
export function usePropertyTaxSummary(financialYear: string) {
  return useLiveQuery(async () => {
    const [properties, expenses, depreciation, rentals] = await Promise.all([
      db.properties.where("status").equals("active").toArray(),
      db.propertyExpenses.where("financialYear").equals(financialYear).toArray(),
      db.propertyDepreciation
        .where("financialYear")
        .equals(financialYear)
        .toArray(),
      db.propertyRentals.toArray(),
    ]);

    // Calculate total rental income (assuming full year occupancy for FY)
    let totalRentalIncome = 0;
    const now = new Date();

    for (const property of properties) {
      const propertyRentals = rentals.filter(
        (r) => r.propertyId === property.id
      );

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
