import { db } from "@/lib/db";
import {
  getCurrentFinancialYear,
  getFinancialYearDates,
} from "@/lib/utils/financial-year";
import type { FinancialContext } from "@/types";

/**
 * Format cents to dollars for display
 */
function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

/**
 * Build a comprehensive financial context for AI prompts
 */
export async function buildFinancialContext(): Promise<FinancialContext> {
  const [
    accountsSummary,
    recentSpending,
    topCategories,
    portfolioSummary,
    taxSummary,
    recentTransactions,
    merchantPatterns,
  ] = await Promise.all([
    buildAccountsSummary(),
    buildRecentSpending(),
    buildTopCategories(),
    buildPortfolioSummary(),
    buildTaxSummary(),
    buildRecentTransactionsList(),
    buildMerchantPatterns(),
  ]);

  return {
    accountsSummary,
    recentSpending,
    topCategories,
    portfolioSummary,
    taxSummary,
    recentTransactions,
    merchantPatterns,
  };
}

/**
 * Build a concise context string from the financial context
 */
export async function buildContextString(): Promise<string> {
  const context = await buildFinancialContext();

  const parts: string[] = [];

  if (context.accountsSummary) {
    parts.push(`ACCOUNTS:\n${context.accountsSummary}`);
  }

  if (context.recentSpending) {
    parts.push(`RECENT SPENDING:\n${context.recentSpending}`);
  }

  if (context.topCategories) {
    parts.push(`TOP SPENDING CATEGORIES:\n${context.topCategories}`);
  }

  if (context.recentTransactions) {
    parts.push(`RECENT TRANSACTIONS:\n${context.recentTransactions}`);
  }

  if (context.merchantPatterns) {
    parts.push(`MERCHANT PATTERNS:\n${context.merchantPatterns}`);
  }

  if (context.portfolioSummary) {
    parts.push(`INVESTMENTS:\n${context.portfolioSummary}`);
  }

  if (context.taxSummary) {
    parts.push(`TAX CONTEXT:\n${context.taxSummary}`);
  }

  return parts.join("\n\n");
}

/**
 * Build accounts summary
 */
async function buildAccountsSummary(): Promise<string> {
  const accounts = await db.accounts.filter((a) => a.isActive).toArray();

  if (accounts.length === 0) {
    return "No accounts set up yet.";
  }

  let totalAssets = 0;
  let totalLiabilities = 0;

  const byType: Record<string, { count: number; balance: number }> = {};

  for (const account of accounts) {
    if (!byType[account.type]) {
      byType[account.type] = { count: 0, balance: 0 };
    }
    byType[account.type].count++;
    byType[account.type].balance += account.balance;

    if (account.type === "credit" || account.type === "liability") {
      totalLiabilities += Math.abs(account.balance);
    } else {
      totalAssets += account.balance;
    }
  }

  const lines: string[] = [];
  lines.push(`Total accounts: ${accounts.length}`);
  lines.push(`Total assets: ${formatDollars(totalAssets)}`);
  lines.push(`Total liabilities: ${formatDollars(totalLiabilities)}`);
  lines.push(`Net worth: ${formatDollars(totalAssets - totalLiabilities)}`);

  lines.push("\nBy type:");
  for (const [type, data] of Object.entries(byType)) {
    lines.push(
      `- ${type}: ${data.count} account(s), ${formatDollars(data.balance)}`,
    );
  }

  return lines.join("\n");
}

/**
 * Build recent spending summary (last 30 days)
 */
async function buildRecentSpending(): Promise<string> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await db.transactions
    .where("date")
    .above(thirtyDaysAgo)
    .toArray();

  if (transactions.length === 0) {
    return "No transactions in the last 30 days.";
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const t of transactions) {
    if (t.type === "income") {
      totalIncome += t.amount;
      incomeCount++;
    } else if (t.type === "expense") {
      totalExpenses += t.amount;
      expenseCount++;
    }
  }

  const lines: string[] = [];
  lines.push("Last 30 days:");
  lines.push(
    `- Income: ${formatDollars(totalIncome)} (${incomeCount} transactions)`,
  );
  lines.push(
    `- Expenses: ${formatDollars(totalExpenses)} (${expenseCount} transactions)`,
  );
  lines.push(`- Net: ${formatDollars(totalIncome - totalExpenses)}`);
  lines.push(
    `- Daily average spending: ${formatDollars(Math.round(totalExpenses / 30))}`,
  );

  return lines.join("\n");
}

/**
 * Build recent transactions list (last 20 transactions)
 */
async function buildRecentTransactionsList(): Promise<string | undefined> {
  const transactions = await db.transactions
    .orderBy("date")
    .reverse()
    .limit(20)
    .toArray();

  if (transactions.length === 0) {
    return undefined;
  }

  // Get categories for lookup
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Get accounts for lookup
  const accounts = await db.accounts.toArray();
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const lines: string[] = ["Last 20 transactions:"];

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const dateStr = t.date.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const merchant = t.merchantName || t.description;
    const category = t.categoryId ? categoryMap.get(t.categoryId) : null;
    const account = accountMap.get(t.accountId) || "Unknown";
    const typeIndicator = t.type === "income" ? "+" : "-";

    const categoryStr = category ? ` (${category})` : "";
    lines.push(
      `${i + 1}. ${dateStr} - ${merchant} - ${typeIndicator}${formatDollars(t.amount)}${categoryStr} [${account}]`,
    );
  }

  return lines.join("\n");
}

/**
 * Normalize merchant name for grouping
 */
function normalizeMerchantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(" ")[0]; // Take first word for grouping (e.g., "woolworths" from "woolworths metro sydney")
}

/**
 * Build merchant spending patterns (last 60 days)
 */
async function buildMerchantPatterns(): Promise<string | undefined> {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const transactions = await db.transactions
    .where("date")
    .above(sixtyDaysAgo)
    .filter((t) => t.type === "expense")
    .toArray();

  if (transactions.length === 0) {
    return undefined;
  }

  // Group by normalized merchant name
  const merchantGroups: Record<
    string,
    { displayName: string; total: number; count: number }
  > = {};

  for (const t of transactions) {
    const rawName = t.merchantName || t.description;
    const normalizedName = normalizeMerchantName(rawName);

    if (!merchantGroups[normalizedName]) {
      merchantGroups[normalizedName] = {
        displayName: rawName, // Keep first occurrence as display name
        total: 0,
        count: 0,
      };
    }
    merchantGroups[normalizedName].total += t.amount;
    merchantGroups[normalizedName].count++;
  }

  // Sort by total and take top 10
  const sorted = Object.values(merchantGroups)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (sorted.length === 0) {
    return undefined;
  }

  const lines: string[] = ["Top 10 merchants (last 60 days):"];
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const avgPerTxn = Math.round(m.total / m.count);
    lines.push(
      `${i + 1}. ${m.displayName}: ${formatDollars(m.total)} (${m.count} txn, avg ${formatDollars(avgPerTxn)})`,
    );
  }

  return lines.join("\n");
}

/**
 * Build top spending categories
 */
async function buildTopCategories(): Promise<string> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const transactions = await db.transactions
    .where("date")
    .above(thirtyDaysAgo)
    .filter((t) => t.type === "expense" && t.categoryId != null)
    .toArray();

  if (transactions.length === 0) {
    return "No categorized expenses in the last 30 days.";
  }

  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Group by category
  const byCategoryId: Record<string, number> = {};
  for (const t of transactions) {
    if (t.categoryId) {
      byCategoryId[t.categoryId] = (byCategoryId[t.categoryId] || 0) + t.amount;
    }
  }

  // Sort by amount and take top 5
  const sorted = Object.entries(byCategoryId)
    .map(([id, amount]) => ({ name: categoryMap.get(id) || "Unknown", amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const lines: string[] = ["Top 5 spending categories (last 30 days):"];
  for (let i = 0; i < sorted.length; i++) {
    lines.push(
      `${i + 1}. ${sorted[i].name}: ${formatDollars(sorted[i].amount)}`,
    );
  }

  return lines.join("\n");
}

/**
 * Build investment portfolio summary
 */
async function buildPortfolioSummary(): Promise<string | undefined> {
  const holdings = await db.holdings.toArray();

  if (holdings.length === 0) {
    return undefined;
  }

  let totalValue = 0;
  let totalCostBasis = 0;
  const byType: Record<string, number> = {};

  for (const holding of holdings) {
    const value = holding.currentValue || holding.costBasis;
    totalValue += value;
    totalCostBasis += holding.costBasis;

    byType[holding.type] = (byType[holding.type] || 0) + value;
  }

  const unrealizedGain = totalValue - totalCostBasis;
  const gainPercent =
    totalCostBasis > 0
      ? ((unrealizedGain / totalCostBasis) * 100).toFixed(1)
      : "0";

  const lines: string[] = [];
  lines.push(`Total holdings: ${holdings.length}`);
  lines.push(`Portfolio value: ${formatDollars(totalValue)}`);
  lines.push(`Cost basis: ${formatDollars(totalCostBasis)}`);
  lines.push(
    `Unrealized gain/loss: ${formatDollars(unrealizedGain)} (${gainPercent}%)`,
  );

  lines.push("\nAllocation by type:");
  for (const [type, value] of Object.entries(byType)) {
    const percent =
      totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : "0";
    lines.push(`- ${type}: ${formatDollars(value)} (${percent}%)`);
  }

  return lines.join("\n");
}

/**
 * Build tax summary for current financial year
 */
async function buildTaxSummary(): Promise<string | undefined> {
  const fy = getCurrentFinancialYear();
  const { start, end } = getFinancialYearDates(fy);

  // Get deductible transactions using indexed date query for better performance
  const transactions = await db.transactions
    .where("date")
    .between(start, end, true, true)
    .filter((t) => t.isDeductible === true)
    .toArray();

  if (transactions.length === 0) {
    return undefined;
  }

  // Group by ATO category
  const byAtoCategory: Record<
    string,
    { total: number; transactions: typeof transactions }
  > = {};
  let totalDeductions = 0;

  for (const t of transactions) {
    const category = t.atoCategory || "Uncategorized";
    if (!byAtoCategory[category]) {
      byAtoCategory[category] = { total: 0, transactions: [] };
    }
    byAtoCategory[category].total += t.amount;
    byAtoCategory[category].transactions.push(t);
    totalDeductions += t.amount;
  }

  const lines: string[] = [];
  lines.push(`Financial Year: ${fy}`);
  lines.push(`Total potential deductions: ${formatDollars(totalDeductions)}`);

  lines.push("\nBy ATO category:");
  for (const [category, data] of Object.entries(byAtoCategory)) {
    lines.push(
      `- ${category}: ${formatDollars(data.total)} (${data.transactions.length} items)`,
    );
  }

  // Add recent deductible transaction examples (last 10)
  const recentDeductible = transactions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  if (recentDeductible.length > 0) {
    lines.push("\nRecent deductible transactions:");
    for (const t of recentDeductible) {
      const dateStr = t.date.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "2-digit",
      });
      const atoCategory = t.atoCategory ? `[${t.atoCategory}]` : "";
      const description = t.merchantName || t.description;
      lines.push(
        `- ${dateStr}: ${description} - ${formatDollars(t.amount)} ${atoCategory}`,
      );
    }
  }

  return lines.join("\n");
}

/**
 * Build spending context for a specific period
 */
export async function buildSpendingContext(
  startDate: Date,
  endDate: Date,
): Promise<string> {
  const transactions = await db.transactions
    .where("date")
    .between(startDate, endDate)
    .toArray();

  if (transactions.length === 0) {
    return "No transactions found for this period.";
  }

  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Calculate totals
  let totalIncome = 0;
  let totalExpenses = 0;
  const byCategory: Record<
    string,
    { name: string; amount: number; count: number }
  > = {};

  for (const t of transactions) {
    if (t.type === "income") {
      totalIncome += t.amount;
    } else if (t.type === "expense") {
      totalExpenses += t.amount;

      if (t.categoryId) {
        if (!byCategory[t.categoryId]) {
          byCategory[t.categoryId] = {
            name: categoryMap.get(t.categoryId) || "Unknown",
            amount: 0,
            count: 0,
          };
        }
        byCategory[t.categoryId].amount += t.amount;
        byCategory[t.categoryId].count++;
      }
    }
  }

  const lines: string[] = [];
  lines.push(
    `Period: ${startDate.toLocaleDateString("en-AU")} to ${endDate.toLocaleDateString("en-AU")}`,
  );
  lines.push(`Total transactions: ${transactions.length}`);
  lines.push(`Total income: ${formatDollars(totalIncome)}`);
  lines.push(`Total expenses: ${formatDollars(totalExpenses)}`);
  lines.push(`Net: ${formatDollars(totalIncome - totalExpenses)}`);

  const sortedCategories = Object.values(byCategory)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  if (sortedCategories.length > 0) {
    lines.push("\nSpending by category:");
    for (const cat of sortedCategories) {
      lines.push(
        `- ${cat.name}: ${formatDollars(cat.amount)} (${cat.count} transactions)`,
      );
    }
  }

  return lines.join("\n");
}
