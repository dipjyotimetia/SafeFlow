"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  calculateMonthlyCashflow,
  analyzeCashflowTrend,
  forecastCashflow,
  detectRecurringPatterns,
  calculateExpenseBreakdown,
  convertRentalsToMonthlyIncome,
  type MonthlyCashflowEntry,
  type CashflowTrend,
  type CashflowForecast,
  type RecurringPattern,
  type CashflowCategorySummary,
} from "@/domain/services/cashflow.service";
import { subMonths, format } from "date-fns";

/**
 * Comprehensive cashflow analysis hook.
 *
 * Aggregates data from bank transactions, investment dividends, and property
 * rental income into a unified monthly cashflow view.
 *
 * @param months - Number of months of history to analyse (default 12)
 * @param memberId - Optional family member filter
 */
export function useCashflowAnalysis(months: number = 12, memberId?: string) {
  const data = useLiveQuery(
    async () => {
      const now = new Date();
      const startDate = subMonths(now, months);

      // Fetch bank transactions within the date range
      const [transactions, investmentTransactions, categories, accounts] =
        await Promise.all([
          db.transactions
            .where("date")
            .between(startDate, now, true, true)
            .toArray(),
          db.investmentTransactions
            .where("date")
            .between(startDate, now, true, true)
            .toArray(),
          db.categories.toArray(),
          memberId ? db.accounts.toArray() : Promise.resolve([]),
        ]);

      // Member filtering
      let filteredTransactions = transactions;
      let filteredInvestmentTransactions = investmentTransactions;

      if (memberId) {
        const accountMap = new Map(
          accounts.map((a) => [
            a.id,
            { memberId: a.memberId, visibility: a.visibility },
          ])
        );

        filteredTransactions = transactions.filter((t) => {
          if (t.memberId === memberId) return true;
          const acct = accountMap.get(t.accountId);
          if (!acct) return false;
          if (acct.memberId === memberId) return true;
          if (acct.visibility === "shared" || !acct.memberId) return true;
          return false;
        });

        // For investments, filter by visible holdings
        const holdings = await db.holdings.toArray();
        const visibleHoldingIds = new Set(
          holdings
            .filter((h) => {
              const acct = accountMap.get(h.accountId);
              if (!acct) return false;
              if (acct.memberId === memberId) return true;
              if (acct.visibility === "shared" || !acct.memberId) return true;
              return false;
            })
            .map((h) => h.id)
        );
        filteredInvestmentTransactions = investmentTransactions.filter((t) =>
          visibleHoldingIds.has(t.holdingId)
        );
      }

      // Fetch property rental income for active rentals
      let rentalIncome: Array<{ month: string; amount: number }> = [];
      try {
        const properties = await db.properties
          .where("status")
          .equals("active")
          .toArray();

        if (properties.length > 0) {
          const propertyIds = properties.map((p) => p.id);
          const rentals = await db.propertyRentals
            .where("propertyId")
            .anyOf(propertyIds)
            .toArray();

          // Generate month keys for the range
          const monthKeys: string[] = [];
          for (let i = 0; i < months; i++) {
            const d = subMonths(now, i);
            monthKeys.push(format(d, "yyyy-MM"));
          }

          rentalIncome = convertRentalsToMonthlyIncome(rentals, monthKeys);
        }
      } catch {
        // Property tables may not exist yet — ignore
      }

      // Category lookup
      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

      // Calculate monthly cashflow
      const monthlyEntries = calculateMonthlyCashflow(
        filteredTransactions,
        filteredInvestmentTransactions,
        rentalIncome,
        categoryMap
      );

      // Analyze trend
      const trend = analyzeCashflowTrend(monthlyEntries);

      // Forecast
      const forecast = forecastCashflow(monthlyEntries, 6);

      // Current and previous month for category breakdown
      const currentMonthKey = format(now, "yyyy-MM");
      const previousMonthKey = format(subMonths(now, 1), "yyyy-MM");

      const expenseBreakdown = calculateExpenseBreakdown(
        filteredTransactions,
        categoryMap,
        currentMonthKey,
        previousMonthKey
      );

      // Detect recurring patterns
      const recurring = detectRecurringPatterns(filteredTransactions);

      return {
        monthlyEntries,
        trend,
        forecast,
        expenseBreakdown,
        recurring,
        currentMonthKey,
      };
    },
    [months, memberId]
  );

  return {
    monthlyEntries: data?.monthlyEntries ?? ([] as MonthlyCashflowEntry[]),
    trend: data?.trend ?? ({
      direction: "stable",
      averageNetCashflow: 0,
      averageIncome: 0,
      averageExpenses: 0,
      overallSavingsRate: 0,
      bestMonth: null,
      worstMonth: null,
      surplusMonths: 0,
      deficitMonths: 0,
    } as CashflowTrend),
    forecast: data?.forecast ?? ({ projections: [], confidence: "low" } as CashflowForecast),
    expenseBreakdown: data?.expenseBreakdown ?? ([] as CashflowCategorySummary[]),
    recurring: data?.recurring ?? ([] as RecurringPattern[]),
    currentMonthKey: data?.currentMonthKey ?? format(new Date(), "yyyy-MM"),
    isLoading: data === undefined,
  };
}
