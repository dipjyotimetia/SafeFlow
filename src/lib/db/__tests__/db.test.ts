import { describe, it, expect, beforeEach } from 'vitest';
import { db, clearDatabase, exportAllData } from '../index';
import type { Account, Transaction } from '@/types';

describe('Database Operations', () => {
  beforeEach(async () => {
    // Clear database before each test
    await clearDatabase();
  });

  describe('clearDatabase', () => {
    it('should clear all tables', async () => {
      // Add some test data
      const accountId = 'test-account-1';
      await db.accounts.add({
        id: accountId,
        name: 'Test Account',
        type: 'bank',
        balance: 10000,
        currency: 'AUD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.transactions.add({
        id: 'test-transaction-1',
        accountId,
        type: 'expense',
        amount: 5000,
        description: 'Test Transaction',
        date: new Date(),
        isReconciled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.categories.add({
        id: 'test-category-1',
        name: 'Test Category',
        type: 'expense',
        isActive: true,
      });

      // Verify data exists
      expect(await db.accounts.count()).toBe(1);
      expect(await db.transactions.count()).toBe(1);
      expect(await db.categories.count()).toBe(1);

      // Clear the database
      await clearDatabase();

      // Verify all tables are empty
      expect(await db.accounts.count()).toBe(0);
      expect(await db.transactions.count()).toBe(0);
      expect(await db.categories.count()).toBe(0);
      expect(await db.holdings.count()).toBe(0);
      expect(await db.investmentTransactions.count()).toBe(0);
      expect(await db.taxItems.count()).toBe(0);
      expect(await db.syncMetadata.count()).toBe(0);
      expect(await db.importBatches.count()).toBe(0);
      expect(await db.superannuationAccounts.count()).toBe(0);
      expect(await db.superTransactions.count()).toBe(0);
      expect(await db.chatConversations.count()).toBe(0);
      expect(await db.categorizationQueue.count()).toBe(0);
      expect(await db.merchantPatterns.count()).toBe(0);
    });
  });

  describe('exportAllData', () => {
    it('should export all tables', async () => {
      // Add test data to multiple tables
      const accountId = 'export-test-account';
      await db.accounts.add({
        id: accountId,
        name: 'Export Test Account',
        type: 'bank',
        balance: 50000,
        currency: 'AUD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.categories.add({
        id: 'export-test-category',
        name: 'Export Test Category',
        type: 'expense',
        isActive: true,
      });

      await db.transactions.add({
        id: 'export-test-transaction',
        accountId,
        type: 'expense',
        amount: 2500,
        description: 'Export Test Transaction',
        date: new Date(),
        isReconciled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Export data
      const exported = await exportAllData();

      // Verify structure contains all tables
      expect(exported).toHaveProperty('accounts');
      expect(exported).toHaveProperty('transactions');
      expect(exported).toHaveProperty('categories');
      expect(exported).toHaveProperty('holdings');
      expect(exported).toHaveProperty('investmentTransactions');
      expect(exported).toHaveProperty('taxItems');
      expect(exported).toHaveProperty('importBatches');
      expect(exported).toHaveProperty('superannuationAccounts');
      expect(exported).toHaveProperty('superTransactions');
      expect(exported).toHaveProperty('chatConversations');
      expect(exported).toHaveProperty('categorizationQueue');
      expect(exported).toHaveProperty('merchantPatterns');

      // Verify data is present
      expect(exported.accounts).toHaveLength(1);
      expect(exported.transactions).toHaveLength(1);
      expect(exported.categories).toHaveLength(1);
      expect(exported.accounts[0].name).toBe('Export Test Account');
    });

    it('should export without errors', async () => {
      const exported = await exportAllData();

      // exportAllData returns the raw data object
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('object');
    });
  });

  describe('Account CRUD', () => {
    it('should create an account', async () => {
      const account: Account = {
        id: 'crud-test-account',
        name: 'CRUD Test Account',
        type: 'bank',
        balance: 100000,
        currency: 'AUD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.accounts.add(account);

      const retrieved = await db.accounts.get(account.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('CRUD Test Account');
      expect(retrieved?.balance).toBe(100000);
    });

    it('should update an account', async () => {
      const account: Account = {
        id: 'update-test-account',
        name: 'Original Name',
        type: 'bank',
        balance: 50000,
        currency: 'AUD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.accounts.add(account);
      await db.accounts.update(account.id, { name: 'Updated Name', balance: 75000 });

      const retrieved = await db.accounts.get(account.id);
      expect(retrieved?.name).toBe('Updated Name');
      expect(retrieved?.balance).toBe(75000);
    });

    it('should delete an account', async () => {
      const account: Account = {
        id: 'delete-test-account',
        name: 'Delete Test Account',
        type: 'bank',
        balance: 0,
        currency: 'AUD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.accounts.add(account);
      expect(await db.accounts.get(account.id)).toBeDefined();

      await db.accounts.delete(account.id);
      expect(await db.accounts.get(account.id)).toBeUndefined();
    });
  });

  describe('Transaction operations', () => {
    it('should create a transaction linked to an account', async () => {
      const accountId = 'txn-account';
      await db.accounts.add({
        id: accountId,
        name: 'Transaction Test Account',
        type: 'bank',
        balance: 100000,
        currency: 'AUD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const transaction: Transaction = {
        id: 'txn-test-1',
        accountId,
        type: 'expense',
        amount: 5000,
        description: 'Groceries',
        date: new Date(),
        isReconciled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.transactions.add(transaction);

      const retrieved = await db.transactions.get(transaction.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.accountId).toBe(accountId);
      expect(retrieved?.amount).toBe(5000);
    });

    it('should query transactions by account', async () => {
      const accountId1 = 'account-1';
      const accountId2 = 'account-2';

      await db.accounts.bulkAdd([
        {
          id: accountId1,
          name: 'Account 1',
          type: 'bank',
          balance: 100000,
          currency: 'AUD',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: accountId2,
          name: 'Account 2',
          type: 'credit',
          balance: -50000,
          currency: 'AUD',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await db.transactions.bulkAdd([
        {
          id: 'txn-1',
          accountId: accountId1,
          type: 'expense',
          amount: 1000,
          description: 'Transaction 1',
          date: new Date(),
          isReconciled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'txn-2',
          accountId: accountId1,
          type: 'income',
          amount: 2000,
          description: 'Transaction 2',
          date: new Date(),
          isReconciled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'txn-3',
          accountId: accountId2,
          type: 'expense',
          amount: 3000,
          description: 'Transaction 3',
          date: new Date(),
          isReconciled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const account1Txns = await db.transactions.where('accountId').equals(accountId1).toArray();
      const account2Txns = await db.transactions.where('accountId').equals(accountId2).toArray();

      expect(account1Txns).toHaveLength(2);
      expect(account2Txns).toHaveLength(1);
    });
  });

  describe('Bulk operations', () => {
    it('should bulk delete transactions atomically', async () => {
      const accountId = 'bulk-delete-account';
      await db.accounts.add({
        id: accountId,
        name: 'Bulk Delete Test',
        type: 'bank',
        balance: 100000,
        currency: 'AUD',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add multiple transactions
      const transactionIds = ['bulk-1', 'bulk-2', 'bulk-3'];
      await db.transactions.bulkAdd(
        transactionIds.map((id) => ({
          id,
          accountId,
          type: 'expense' as const,
          amount: 1000,
          description: `Transaction ${id}`,
          date: new Date(),
          isReconciled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );

      expect(await db.transactions.count()).toBe(3);

      // Bulk delete
      await db.transactions.bulkDelete(transactionIds);

      expect(await db.transactions.count()).toBe(0);
    });
  });
});
