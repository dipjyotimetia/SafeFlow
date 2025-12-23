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
};
