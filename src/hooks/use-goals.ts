"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { GoalProgress, GoalType, GoalStatus } from "@/types";
import { calculateMonthsToTarget } from "@/lib/utils/projections";
import { differenceInMonths, addMonths } from "date-fns";

interface UseGoalsOptions {
  status?: GoalStatus;
  type?: GoalType;
  memberId?: string;
}

function isGoalVisibleToMember(goalMemberId: string | undefined, memberId?: string): boolean {
  if (!memberId) return true;
  if (!goalMemberId || goalMemberId === "household") return true;
  return goalMemberId === memberId;
}

function isAccountVisibleToGoal(
  account: { memberId?: string; visibility?: "private" | "shared" },
  goalMemberId?: string
): boolean {
  if (!goalMemberId || goalMemberId === "household") {
    return true;
  }

  if (account.memberId === goalMemberId) {
    return true;
  }

  if (account.visibility === "shared" || !account.memberId) {
    return true;
  }

  return false;
}

function getGoalStatus(goal: {
  isActive: boolean;
  status?: GoalStatus;
  targetAmount: number;
  currentAmount: number;
}): GoalStatus {
  if (goal.status) return goal.status;
  if (goal.isActive) return "active";
  return goal.currentAmount >= goal.targetAmount ? "achieved" : "paused";
}

/**
 * Get all goals with optional filtering
 */
export function useGoals(options: UseGoalsOptions = {}) {
  const { status, type, memberId } = options;

  const goals = useLiveQuery(async () => {
    let results = await db.goals.toArray();

    if (status) {
      results = results.filter((g) => getGoalStatus(g) === status);
    }

    if (type) {
      results = results.filter((g) => g.type === type);
    }

    if (memberId) {
      results = results.filter((g) => isGoalVisibleToMember(g.memberId, memberId));
    }

    return results.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }, [status, type, memberId]);

  return {
    goals: goals ?? [],
    isLoading: goals === undefined,
  };
}

/**
 * Get a single goal by ID
 */
export function useGoal(id: string | null) {
  const goal = useLiveQuery(async () => {
    if (!id) return null;
    return db.goals.get(id);
  }, [id]);

  return {
    goal: goal ?? null,
    isLoading: goal === undefined,
  };
}

/**
 * Get goal progress with current value calculation
 */
export function useGoalProgress(goalId: string | null) {
  const progress = useLiveQuery(async () => {
    if (!goalId) return null;

    const goal = await db.goals.get(goalId);
    if (!goal) return null;

    const [accounts, holdings, superAccounts] = await Promise.all([
      db.accounts.filter((a) => a.isActive).toArray(),
      db.holdings.toArray(),
      db.superannuationAccounts.toArray(),
    ]);

    const visibleAccounts = accounts.filter((a) =>
      isAccountVisibleToGoal(a, goal.memberId)
    );
    const visibleAccountMap = new Map(visibleAccounts.map((a) => [a.id, a]));
    const visibleAccountIds = new Set(visibleAccounts.map((a) => a.id));
    const visibleHoldings = holdings.filter((h) => visibleAccountIds.has(h.accountId));
    const visibleHoldingMap = new Map(visibleHoldings.map((h) => [h.id, h]));

    // Calculate current amount based on linked accounts/holdings
    let currentAmount = 0;

    if (goal.linkedAccountIds && goal.linkedAccountIds.length > 0) {
      currentAmount += goal.linkedAccountIds.reduce((sum, id) => {
        const account = visibleAccountMap.get(id);
        return sum + (account?.balance || 0);
      }, 0);
    }

    if (goal.linkedHoldingIds && goal.linkedHoldingIds.length > 0) {
      currentAmount += goal.linkedHoldingIds.reduce((sum, id) => {
        const holding = visibleHoldingMap.get(id);
        return sum + (holding?.currentValue || 0);
      }, 0);
    }

    // For retirement goals, include super
    if (goal.includeSuperannuation) {
      currentAmount += superAccounts.reduce(
        (sum, s) => sum + s.totalBalance,
        0,
      );
    }

    // If no linked items, calculate from all positive balance accounts (net worth)
    if (
      !goal.linkedAccountIds?.length &&
      !goal.linkedHoldingIds?.length &&
      !goal.includeSuperannuation
    ) {
      currentAmount = visibleAccounts
        .filter((a) =>
          ["bank", "cash", "investment", "crypto", "asset"].includes(a.type),
        )
        .reduce((sum, a) => sum + (a.balance || 0), 0);
    }

    const progressPercent =
      goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
    const remainingAmount = goal.targetAmount - currentAmount;

    // Calculate projected completion date
    let projectedCompletionDate: Date | undefined;
    let monthsToTarget: number | undefined;

    if (goal.monthlyContribution && goal.monthlyContribution > 0) {
      const months = calculateMonthsToTarget(
        currentAmount,
        goal.targetAmount,
        goal.monthlyContribution,
        goal.expectedReturnRate || 0,
      );

      if (months !== null) {
        monthsToTarget = months;
        projectedCompletionDate = addMonths(new Date(), months);
      }
    }

    // Check if on track
    let onTrack = true;
    if (goal.targetDate) {
      const monthsRemaining = differenceInMonths(goal.targetDate, new Date());
      if (monthsRemaining > 0 && monthsToTarget !== undefined) {
        onTrack = monthsToTarget <= monthsRemaining;
      } else if (monthsRemaining <= 0) {
        onTrack = currentAmount >= goal.targetAmount;
      }
    }

    return {
      goal,
      currentAmount,
      progressPercent: Math.round(progressPercent * 100) / 100,
      remainingAmount,
      projectedCompletionDate,
      monthsToTarget,
      onTrack,
    } as GoalProgress;
  }, [goalId]);

  return {
    progress: progress ?? null,
    isLoading: progress === undefined,
  };
}

/**
 * Get progress for all active goals
 */
export function useAllGoalProgress(memberId?: string) {
  const allProgress = useLiveQuery(async () => {
    let goals = await db.goals.filter((g) => g.isActive).toArray();

    if (memberId) {
      goals = goals.filter((g) => isGoalVisibleToMember(g.memberId, memberId));
    }

    const progressList: GoalProgress[] = [];

    // Get all accounts, holdings, and super for calculations
    const [accounts, holdings, superAccounts] = await Promise.all([
      db.accounts.filter((a) => a.isActive).toArray(),
      db.holdings.toArray(),
      db.superannuationAccounts.toArray(),
    ]);

    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const holdingMap = new Map(holdings.map((h) => [h.id, h]));
    const totalSuper = superAccounts.reduce(
      (sum, s) => sum + s.totalBalance,
      0,
    );

    for (const goal of goals) {
      let currentAmount = 0;

      const visibleAccounts = accounts.filter((a) =>
        isAccountVisibleToGoal(a, goal.memberId)
      );
      const visibleAccountIds = new Set(visibleAccounts.map((a) => a.id));

      if (goal.linkedAccountIds && goal.linkedAccountIds.length > 0) {
        for (const id of goal.linkedAccountIds) {
          const account = accountMap.get(id);
          if (account && visibleAccountIds.has(account.id)) {
            currentAmount += account.balance || 0;
          }
        }
      }

      if (goal.linkedHoldingIds && goal.linkedHoldingIds.length > 0) {
        for (const id of goal.linkedHoldingIds) {
          const holding = holdingMap.get(id);
          if (holding && visibleAccountIds.has(holding.accountId)) {
            currentAmount += holding.currentValue || 0;
          }
        }
      }

      if (goal.includeSuperannuation) {
        currentAmount += totalSuper;
      }

      // Default to net worth if no linked items
      if (
        !goal.linkedAccountIds?.length &&
        !goal.linkedHoldingIds?.length &&
        !goal.includeSuperannuation
      ) {
        currentAmount = visibleAccounts
          .filter((a) =>
            ["bank", "cash", "investment", "crypto", "asset"].includes(a.type),
          )
          .reduce((sum, a) => sum + (a.balance || 0), 0);
      }

      const progressPercent =
        goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
      const remainingAmount = goal.targetAmount - currentAmount;

      let projectedCompletionDate: Date | undefined;
      let monthsToTarget: number | undefined;

      if (goal.monthlyContribution && goal.monthlyContribution > 0) {
        const months = calculateMonthsToTarget(
          currentAmount,
          goal.targetAmount,
          goal.monthlyContribution,
          goal.expectedReturnRate || 0,
        );

        if (months !== null) {
          monthsToTarget = months;
          projectedCompletionDate = addMonths(new Date(), months);
        }
      }

      let onTrack = true;
      if (goal.targetDate) {
        const monthsRemaining = differenceInMonths(goal.targetDate, new Date());
        if (monthsRemaining > 0 && monthsToTarget !== undefined) {
          onTrack = monthsToTarget <= monthsRemaining;
        }
      }

      progressList.push({
        goal,
        currentAmount,
        progressPercent: Math.round(progressPercent * 100) / 100,
        remainingAmount,
        projectedCompletionDate,
        monthsToTarget,
        onTrack,
      });
    }

    return progressList;
  }, [memberId]);

  return {
    progress: allProgress ?? [],
    isLoading: allProgress === undefined,
  };
}
