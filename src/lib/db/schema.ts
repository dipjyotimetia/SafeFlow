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
};
