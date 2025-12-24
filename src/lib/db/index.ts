import { db } from './schema';
import { defaultCategories } from './seeds/categories.seed';
import type { Category } from '@/types';

export { db } from './schema';

// Track initialization to prevent race conditions
let initializationPromise: Promise<void> | null = null;

// Check if database has been initialized with default data
export async function initializeDatabase(): Promise<void> {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const categoryCount = await db.categories.count();

      if (categoryCount === 0) {
        console.log('Initializing database with default categories...');
        const now = new Date();

        const categoriesWithTimestamps: Category[] = defaultCategories.map((cat) => ({
          ...cat,
          createdAt: now,
          updatedAt: now,
        }));

        // Use bulkPut to handle any race condition gracefully (upserts instead of failing on duplicate)
        await db.categories.bulkPut(categoriesWithTimestamps);
        console.log(`Added ${categoriesWithTimestamps.length} default categories`);
      }

      // Initialize sync metadata if not exists
      const syncMetadata = await db.syncMetadata.get('sync-state');
      if (!syncMetadata) {
        await db.syncMetadata.put({
          id: 'sync-state',
          lastSyncVersion: 0,
          conflictState: 'none',
        });
      }
    } finally {
      // Reset for future calls (e.g., after database clear)
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

// Clear all data (for debugging/reset)
export async function clearDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.categories,
      db.transactions,
      db.holdings,
      db.investmentTransactions,
      db.taxItems,
      db.syncMetadata,
      db.importBatches,
      db.superannuationAccounts,
      db.superTransactions,
      db.chatConversations,
      db.categorizationQueue,
      db.merchantPatterns,
      db.budgets,
      db.familyMembers,
      db.goals,
      db.priceHistory,
      db.portfolioHistory,
      // Property tables
      db.properties,
      db.propertyLoans,
      db.propertyExpenses,
      db.propertyRentals,
      db.propertyDepreciation,
      db.propertyModels,
    ],
    async () => {
      await db.accounts.clear();
      await db.categories.clear();
      await db.transactions.clear();
      await db.holdings.clear();
      await db.investmentTransactions.clear();
      await db.taxItems.clear();
      await db.syncMetadata.clear();
      await db.importBatches.clear();
      await db.superannuationAccounts.clear();
      await db.superTransactions.clear();
      await db.chatConversations.clear();
      await db.categorizationQueue.clear();
      await db.merchantPatterns.clear();
      await db.budgets.clear();
      await db.familyMembers.clear();
      await db.goals.clear();
      await db.priceHistory.clear();
      await db.portfolioHistory.clear();
      // Property tables
      await db.properties.clear();
      await db.propertyLoans.clear();
      await db.propertyExpenses.clear();
      await db.propertyRentals.clear();
      await db.propertyDepreciation.clear();
      await db.propertyModels.clear();
    }
  );
}

// Export all data for backup
export async function exportAllData(): Promise<{
  version: number;
  timestamp: string;
  accounts: unknown[];
  categories: unknown[];
  transactions: unknown[];
  holdings: unknown[];
  investmentTransactions: unknown[];
  taxItems: unknown[];
  importBatches: unknown[];
  superannuationAccounts: unknown[];
  superTransactions: unknown[];
  chatConversations: unknown[];
  categorizationQueue: unknown[];
  merchantPatterns: unknown[];
  budgets: unknown[];
  familyMembers: unknown[];
  goals: unknown[];
  priceHistory: unknown[];
  portfolioHistory: unknown[];
  // Property tables
  properties: unknown[];
  propertyLoans: unknown[];
  propertyExpenses: unknown[];
  propertyRentals: unknown[];
  propertyDepreciation: unknown[];
  propertyModels: unknown[];
}> {
  const syncMetadata = await db.syncMetadata.get('sync-state');
  const version = (syncMetadata?.lastSyncVersion ?? 0) + 1;

  return {
    version,
    timestamp: new Date().toISOString(),
    accounts: await db.accounts.toArray(),
    categories: await db.categories.toArray(),
    transactions: await db.transactions.toArray(),
    holdings: await db.holdings.toArray(),
    investmentTransactions: await db.investmentTransactions.toArray(),
    taxItems: await db.taxItems.toArray(),
    importBatches: await db.importBatches.toArray(),
    superannuationAccounts: await db.superannuationAccounts.toArray(),
    superTransactions: await db.superTransactions.toArray(),
    chatConversations: await db.chatConversations.toArray(),
    categorizationQueue: await db.categorizationQueue.toArray(),
    merchantPatterns: await db.merchantPatterns.toArray(),
    budgets: await db.budgets.toArray(),
    familyMembers: await db.familyMembers.toArray(),
    goals: await db.goals.toArray(),
    priceHistory: await db.priceHistory.toArray(),
    portfolioHistory: await db.portfolioHistory.toArray(),
    // Property tables
    properties: await db.properties.toArray(),
    propertyLoans: await db.propertyLoans.toArray(),
    propertyExpenses: await db.propertyExpenses.toArray(),
    propertyRentals: await db.propertyRentals.toArray(),
    propertyDepreciation: await db.propertyDepreciation.toArray(),
    propertyModels: await db.propertyModels.toArray(),
  };
}
