import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Category,
  Transaction,
  Holding,
  InvestmentTransaction,
  TaxItem,
  SyncMetadata,
  ImportBatch,
  SuperannuationAccount,
  SuperTransaction,
  ChatConversation,
  CategorizationQueueItem,
  MerchantPattern,
  Budget,
  FamilyMember,
  Goal,
  PriceHistoryEntry,
  PortfolioSnapshot,
  Property,
  PropertyLoan,
  PropertyExpense,
  PropertyRental,
  PropertyDepreciation,
  PropertyModel,
  SyncSnapshot,
  TaxLot,
} from '@/types';

export class SafeFlowDB extends Dexie {
  accounts!: Table<Account>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;
  holdings!: Table<Holding>;
  investmentTransactions!: Table<InvestmentTransaction>;
  taxItems!: Table<TaxItem>;
  syncMetadata!: Table<SyncMetadata>;
  importBatches!: Table<ImportBatch>;
  superannuationAccounts!: Table<SuperannuationAccount>;
  superTransactions!: Table<SuperTransaction>;
  chatConversations!: Table<ChatConversation>;
  categorizationQueue!: Table<CategorizationQueueItem>;
  merchantPatterns!: Table<MerchantPattern>;
  budgets!: Table<Budget>;
  familyMembers!: Table<FamilyMember>;
  goals!: Table<Goal>;
  priceHistory!: Table<PriceHistoryEntry>;
  portfolioHistory!: Table<PortfolioSnapshot>;
  properties!: Table<Property>;
  propertyLoans!: Table<PropertyLoan>;
  propertyExpenses!: Table<PropertyExpense>;
  propertyRentals!: Table<PropertyRental>;
  propertyDepreciation!: Table<PropertyDepreciation>;
  propertyModels!: Table<PropertyModel>;
  syncSnapshots!: Table<SyncSnapshot>;
  taxLots!: Table<TaxLot>;

  constructor() {
    super('safeflow-db');

    this.version(1).stores({
      accounts: 'id, type, isActive, createdAt',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions: 'id, accountId, categoryId, type, date, importBatchId, [accountId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
    });

    // Version 2: Add superannuation tables
    this.version(2).stores({
      accounts: 'id, type, isActive, createdAt',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions: 'id, accountId, categoryId, type, date, importBatchId, [accountId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
      superannuationAccounts: 'id, provider, memberNumber, createdAt',
      superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]',
    });

    // Version 3: Add AI chat and categorization tables
    this.version(3).stores({
      accounts: 'id, type, isActive, createdAt',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions: 'id, accountId, categoryId, type, date, importBatchId, [accountId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
      superannuationAccounts: 'id, provider, memberNumber, createdAt',
      superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]',
      chatConversations: 'id, createdAt, updatedAt',
      categorizationQueue: 'id, transactionId, status, createdAt',
    });

    // Version 4: Add merchant pattern learning table
    this.version(4).stores({
      accounts: 'id, type, isActive, createdAt',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions: 'id, accountId, categoryId, type, date, importBatchId, [accountId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
      superannuationAccounts: 'id, provider, memberNumber, createdAt',
      superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]',
      chatConversations: 'id, createdAt, updatedAt',
      categorizationQueue: 'id, transactionId, status, createdAt',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed',
    });

    // Version 5: Add budgets and family members tables
    this.version(5).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions: 'id, accountId, categoryId, type, date, importBatchId, memberId, [accountId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
      superannuationAccounts: 'id, provider, memberNumber, createdAt',
      superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]',
      chatConversations: 'id, createdAt, updatedAt',
      categorizationQueue: 'id, transactionId, status, createdAt',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed',
      budgets: 'id, categoryId, memberId, period, isActive, createdAt',
      familyMembers: 'id, isActive, createdAt',
    });

    // Version 6: Add compound indexes for query optimization
    // These indexes enable efficient filtering by common query patterns
    this.version(6).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions:
        'id, accountId, categoryId, type, date, importBatchId, memberId, [accountId+date], [categoryId+date], [type+date], [memberId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
      superannuationAccounts: 'id, provider, memberNumber, createdAt',
      superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]',
      chatConversations: 'id, createdAt, updatedAt',
      categorizationQueue: 'id, transactionId, status, createdAt',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed',
      budgets: 'id, categoryId, memberId, period, isActive, createdAt',
      familyMembers: 'id, isActive, createdAt',
    });

    // Version 7: Add goals table and investment transaction index for dividend queries
    this.version(7).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions:
        'id, accountId, categoryId, type, date, importBatchId, memberId, [accountId+date], [categoryId+date], [type+date], [memberId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date, [type+date]',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
      superannuationAccounts: 'id, provider, memberNumber, createdAt',
      superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]',
      chatConversations: 'id, createdAt, updatedAt',
      categorizationQueue: 'id, transactionId, status, createdAt',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed',
      budgets: 'id, categoryId, memberId, period, isActive, createdAt',
      familyMembers: 'id, isActive, createdAt',
      goals: 'id, type, status, targetDate, createdAt',
    });

    // Version 8: Add price history table for investment charts
    this.version(8).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions:
        'id, accountId, categoryId, type, date, importBatchId, memberId, [accountId+date], [categoryId+date], [type+date], [memberId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date, [type+date]',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
      superannuationAccounts: 'id, provider, memberNumber, createdAt',
      superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]',
      chatConversations: 'id, createdAt, updatedAt',
      categorizationQueue: 'id, transactionId, status, createdAt',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed',
      budgets: 'id, categoryId, memberId, period, isActive, createdAt',
      familyMembers: 'id, isActive, createdAt',
      goals: 'id, type, status, targetDate, createdAt',
      priceHistory: 'id, holdingId, date, [holdingId+date]',
    });

    // Version 9: Add portfolio history table for portfolio performance tracking
    this.version(9).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions:
        'id, accountId, categoryId, type, date, importBatchId, memberId, [accountId+date], [categoryId+date], [type+date], [memberId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date, [type+date]',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
      superannuationAccounts: 'id, provider, memberNumber, createdAt',
      superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]',
      chatConversations: 'id, createdAt, updatedAt',
      categorizationQueue: 'id, transactionId, status, createdAt',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed',
      budgets: 'id, categoryId, memberId, period, isActive, createdAt',
      familyMembers: 'id, isActive, createdAt',
      goals: 'id, type, status, targetDate, createdAt',
      priceHistory: 'id, holdingId, date, [holdingId+date]',
      portfolioHistory: 'id, date',
    });

    // Version 10: Add property portfolio tables
    this.version(10).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility',
      categories: 'id, type, parentId, atoCode, isActive',
      transactions:
        'id, accountId, categoryId, type, date, importBatchId, memberId, [accountId+date], [categoryId+date], [type+date], [memberId+date]',
      holdings: 'id, accountId, symbol, type',
      investmentTransactions: 'id, holdingId, type, date, [type+date]',
      taxItems: 'id, financialYear, atoCategory, transactionId',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt',
      superannuationAccounts: 'id, provider, memberNumber, createdAt',
      superTransactions: 'id, superAccountId, type, date, financialYear, [superAccountId+date]',
      chatConversations: 'id, createdAt, updatedAt',
      categorizationQueue: 'id, transactionId, status, createdAt',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed',
      budgets: 'id, categoryId, memberId, period, isActive, createdAt',
      familyMembers: 'id, isActive, createdAt',
      goals: 'id, type, status, targetDate, createdAt',
      priceHistory: 'id, holdingId, date, [holdingId+date]',
      portfolioHistory: 'id, date',
      // Property portfolio tables
      properties: 'id, state, status, purpose, memberId, createdAt, [state+status]',
      propertyLoans: 'id, propertyId, lender, createdAt',
      propertyExpenses: 'id, propertyId, category, financialYear, isRecurring, [propertyId+category], [propertyId+financialYear]',
      propertyRentals: 'id, propertyId, leaseStartDate, leaseEndDate, [propertyId+leaseStartDate]',
      propertyDepreciation: 'id, propertyId, financialYear, [propertyId+financialYear]',
      propertyModels: 'id, propertyId, isActive, createdAt',
    });

    // Version 11: Add syncVersion and isDeleted indexes for incremental sync
    // Also add symbol index for holdings and date indexes for investment/super transactions
    this.version(11).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility, syncVersion, isDeleted',
      categories: 'id, type, parentId, atoCode, isActive, syncVersion, isDeleted',
      transactions:
        'id, accountId, categoryId, type, date, importBatchId, memberId, syncVersion, isDeleted, [accountId+date], [categoryId+date], [type+date], [memberId+date]',
      holdings: 'id, accountId, symbol, type, syncVersion, isDeleted',
      investmentTransactions: 'id, holdingId, type, date, syncVersion, isDeleted, [type+date], [holdingId+date]',
      taxItems: 'id, financialYear, atoCategory, transactionId, syncVersion, isDeleted',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt, syncVersion, isDeleted',
      superannuationAccounts: 'id, provider, memberNumber, createdAt, syncVersion, isDeleted',
      superTransactions: 'id, superAccountId, type, date, financialYear, syncVersion, isDeleted, [superAccountId+date], [superAccountId+financialYear]',
      chatConversations: 'id, createdAt, updatedAt, syncVersion, isDeleted',
      categorizationQueue: 'id, transactionId, status, createdAt, syncVersion, isDeleted',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed, syncVersion, isDeleted',
      budgets: 'id, categoryId, memberId, period, isActive, createdAt, syncVersion, isDeleted',
      familyMembers: 'id, isActive, createdAt, syncVersion, isDeleted',
      goals: 'id, type, status, targetDate, createdAt, syncVersion, isDeleted',
      priceHistory: 'id, holdingId, date, syncVersion, isDeleted, [holdingId+date]',
      portfolioHistory: 'id, date, syncVersion, isDeleted',
      // Property portfolio tables
      properties: 'id, state, status, purpose, memberId, createdAt, syncVersion, isDeleted, [state+status]',
      propertyLoans: 'id, propertyId, lender, createdAt, syncVersion, isDeleted',
      propertyExpenses: 'id, propertyId, category, financialYear, isRecurring, syncVersion, isDeleted, [propertyId+category], [propertyId+financialYear]',
      propertyRentals: 'id, propertyId, leaseStartDate, leaseEndDate, syncVersion, isDeleted, [propertyId+leaseStartDate]',
      propertyDepreciation: 'id, propertyId, financialYear, syncVersion, isDeleted, [propertyId+financialYear]',
      propertyModels: 'id, propertyId, isActive, createdAt, syncVersion, isDeleted',
      // New table for sync snapshots (rollback capability)
      syncSnapshots: 'id, createdAt',
    });

    // Version 12: Add missing performance indexes
    // - date index on investmentTransactions/superTransactions for date range queries
    // - [categoryId+period] compound index on budgets for efficient filtering
    this.version(12).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility, syncVersion, isDeleted',
      categories: 'id, type, parentId, atoCode, isActive, syncVersion, isDeleted',
      transactions:
        'id, accountId, categoryId, type, date, importBatchId, memberId, syncVersion, isDeleted, [accountId+date], [categoryId+date], [type+date], [memberId+date]',
      holdings: 'id, accountId, symbol, type, syncVersion, isDeleted',
      // Added date index for date range queries
      investmentTransactions: 'id, holdingId, type, date, syncVersion, isDeleted, [type+date], [holdingId+date]',
      taxItems: 'id, financialYear, atoCategory, transactionId, syncVersion, isDeleted',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt, syncVersion, isDeleted',
      superannuationAccounts: 'id, provider, memberNumber, createdAt, syncVersion, isDeleted',
      // Added date index for date range queries
      superTransactions: 'id, superAccountId, type, date, financialYear, syncVersion, isDeleted, [superAccountId+date], [superAccountId+financialYear]',
      chatConversations: 'id, createdAt, updatedAt, syncVersion, isDeleted',
      categorizationQueue: 'id, transactionId, status, createdAt, syncVersion, isDeleted',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed, syncVersion, isDeleted',
      // Added [categoryId+period] compound index for efficient budget filtering
      budgets: 'id, categoryId, memberId, period, isActive, createdAt, syncVersion, isDeleted, [categoryId+period]',
      familyMembers: 'id, isActive, createdAt, syncVersion, isDeleted',
      goals: 'id, type, status, targetDate, createdAt, syncVersion, isDeleted',
      priceHistory: 'id, holdingId, date, syncVersion, isDeleted, [holdingId+date]',
      portfolioHistory: 'id, date, syncVersion, isDeleted',
      // Property portfolio tables
      properties: 'id, state, status, purpose, memberId, createdAt, syncVersion, isDeleted, [state+status]',
      propertyLoans: 'id, propertyId, lender, createdAt, syncVersion, isDeleted',
      propertyExpenses: 'id, propertyId, category, financialYear, isRecurring, syncVersion, isDeleted, [propertyId+category], [propertyId+financialYear]',
      propertyRentals: 'id, propertyId, leaseStartDate, leaseEndDate, syncVersion, isDeleted, [propertyId+leaseStartDate]',
      propertyDepreciation: 'id, propertyId, financialYear, syncVersion, isDeleted, [propertyId+financialYear]',
      propertyModels: 'id, propertyId, isActive, createdAt, syncVersion, isDeleted',
      syncSnapshots: 'id, createdAt',
    });

    // Version 13: Add taxLots table for FIFO/LIFO/Specific ID cost basis tracking
    this.version(13).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility, syncVersion, isDeleted',
      categories: 'id, type, parentId, atoCode, isActive, syncVersion, isDeleted',
      transactions:
        'id, accountId, categoryId, type, date, importBatchId, memberId, syncVersion, isDeleted, [accountId+date], [categoryId+date], [type+date], [memberId+date]',
      holdings: 'id, accountId, symbol, type, syncVersion, isDeleted',
      investmentTransactions: 'id, holdingId, type, date, syncVersion, isDeleted, [type+date], [holdingId+date]',
      taxItems: 'id, financialYear, atoCategory, transactionId, syncVersion, isDeleted',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt, syncVersion, isDeleted',
      superannuationAccounts: 'id, provider, memberNumber, createdAt, syncVersion, isDeleted',
      superTransactions: 'id, superAccountId, type, date, financialYear, syncVersion, isDeleted, [superAccountId+date], [superAccountId+financialYear]',
      chatConversations: 'id, createdAt, updatedAt, syncVersion, isDeleted',
      categorizationQueue: 'id, transactionId, status, createdAt, syncVersion, isDeleted',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed, syncVersion, isDeleted',
      budgets: 'id, categoryId, memberId, period, isActive, createdAt, syncVersion, isDeleted, [categoryId+period]',
      familyMembers: 'id, isActive, createdAt, syncVersion, isDeleted',
      goals: 'id, type, status, targetDate, createdAt, syncVersion, isDeleted',
      priceHistory: 'id, holdingId, date, syncVersion, isDeleted, [holdingId+date]',
      portfolioHistory: 'id, date, syncVersion, isDeleted',
      properties: 'id, state, status, purpose, memberId, createdAt, syncVersion, isDeleted, [state+status]',
      propertyLoans: 'id, propertyId, lender, createdAt, syncVersion, isDeleted',
      propertyExpenses: 'id, propertyId, category, financialYear, isRecurring, syncVersion, isDeleted, [propertyId+category], [propertyId+financialYear]',
      propertyRentals: 'id, propertyId, leaseStartDate, leaseEndDate, syncVersion, isDeleted, [propertyId+leaseStartDate]',
      propertyDepreciation: 'id, propertyId, financialYear, syncVersion, isDeleted, [propertyId+financialYear]',
      propertyModels: 'id, propertyId, isActive, createdAt, syncVersion, isDeleted',
      syncSnapshots: 'id, createdAt',
      // New table for tax lot tracking (FIFO/LIFO/Specific ID)
      taxLots: 'id, holdingId, purchaseDate, remainingUnits, transactionId, syncVersion, isDeleted, [holdingId+purchaseDate]',
    });

    // Version 14: Add compound indexes [syncVersion+isDeleted] for efficient incremental sync queries
    // This enables fast filtering of records that have changed since last sync and are not deleted
    this.version(14).stores({
      accounts: 'id, type, isActive, createdAt, memberId, visibility, syncVersion, isDeleted, [syncVersion+isDeleted]',
      categories: 'id, type, parentId, atoCode, isActive, syncVersion, isDeleted, [syncVersion+isDeleted]',
      transactions:
        'id, accountId, categoryId, type, date, importBatchId, memberId, syncVersion, isDeleted, [accountId+date], [categoryId+date], [type+date], [memberId+date], [syncVersion+isDeleted]',
      holdings: 'id, accountId, symbol, type, syncVersion, isDeleted, [syncVersion+isDeleted]',
      investmentTransactions: 'id, holdingId, type, date, syncVersion, isDeleted, [type+date], [holdingId+date], [syncVersion+isDeleted]',
      taxItems: 'id, financialYear, atoCategory, transactionId, syncVersion, isDeleted, [syncVersion+isDeleted]',
      syncMetadata: 'id',
      importBatches: 'id, source, importedAt, syncVersion, isDeleted, [syncVersion+isDeleted]',
      superannuationAccounts: 'id, provider, memberNumber, createdAt, syncVersion, isDeleted, [syncVersion+isDeleted]',
      superTransactions: 'id, superAccountId, type, date, financialYear, syncVersion, isDeleted, [superAccountId+date], [superAccountId+financialYear], [syncVersion+isDeleted]',
      chatConversations: 'id, createdAt, updatedAt, syncVersion, isDeleted, [syncVersion+isDeleted]',
      categorizationQueue: 'id, transactionId, status, createdAt, syncVersion, isDeleted, [syncVersion+isDeleted]',
      merchantPatterns: 'id, normalizedName, categoryId, confidence, lastUsed, userConfirmed, syncVersion, isDeleted, [syncVersion+isDeleted]',
      budgets: 'id, categoryId, memberId, period, isActive, createdAt, syncVersion, isDeleted, [categoryId+period], [syncVersion+isDeleted]',
      familyMembers: 'id, isActive, createdAt, syncVersion, isDeleted, [syncVersion+isDeleted]',
      goals: 'id, type, status, targetDate, createdAt, syncVersion, isDeleted, [syncVersion+isDeleted]',
      priceHistory: 'id, holdingId, date, syncVersion, isDeleted, [holdingId+date], [syncVersion+isDeleted]',
      portfolioHistory: 'id, date, syncVersion, isDeleted, [syncVersion+isDeleted]',
      properties: 'id, state, status, purpose, memberId, createdAt, syncVersion, isDeleted, [state+status], [syncVersion+isDeleted]',
      propertyLoans: 'id, propertyId, lender, createdAt, syncVersion, isDeleted, [syncVersion+isDeleted]',
      propertyExpenses: 'id, propertyId, category, financialYear, isRecurring, syncVersion, isDeleted, [propertyId+category], [propertyId+financialYear], [syncVersion+isDeleted]',
      propertyRentals: 'id, propertyId, leaseStartDate, leaseEndDate, syncVersion, isDeleted, [propertyId+leaseStartDate], [syncVersion+isDeleted]',
      propertyDepreciation: 'id, propertyId, financialYear, syncVersion, isDeleted, [propertyId+financialYear], [syncVersion+isDeleted]',
      propertyModels: 'id, propertyId, isActive, createdAt, syncVersion, isDeleted, [syncVersion+isDeleted]',
      syncSnapshots: 'id, createdAt',
      taxLots: 'id, holdingId, purchaseDate, remainingUnits, transactionId, syncVersion, isDeleted, [holdingId+purchaseDate], [syncVersion+isDeleted]',
    });
  }
}

export const db = new SafeFlowDB();

// Re-export types for convenience
export type {
  Account,
  Category,
  Transaction,
  Holding,
  InvestmentTransaction,
  TaxItem,
  SyncMetadata,
  ImportBatch,
  SuperannuationAccount,
  SuperTransaction,
  ChatConversation,
  CategorizationQueueItem,
  MerchantPattern,
  Budget,
  FamilyMember,
  Goal,
  PriceHistoryEntry,
  PortfolioSnapshot,
  Property,
  PropertyLoan,
  PropertyExpense,
  PropertyRental,
  PropertyDepreciation,
  PropertyModel,
  SyncSnapshot,
  TaxLot,
};
