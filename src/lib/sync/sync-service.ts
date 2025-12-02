// Sync service - orchestrates data sync with Google Drive

import { db } from '@/lib/db';
import { encrypt, decrypt, type EncryptedData, hashPassword, verifyPassword } from './encryption';
import { uploadData, downloadData, getLastModified, getAuthState } from './google-drive';
import type {
  Account,
  Transaction,
  Category,
  Holding,
  InvestmentTransaction,
  TaxItem,
  ImportBatch,
  SyncMetadata,
  SuperannuationAccount,
  SuperTransaction,
  ChatConversation,
  CategorizationQueueItem,
  MerchantPattern,
} from '@/types';

export interface SyncData {
  version: number;
  exportedAt: string;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  holdings: Holding[];
  investmentTransactions: InvestmentTransaction[];
  taxItems: TaxItem[];
  importBatches: ImportBatch[];
  superannuationAccounts: SuperannuationAccount[];
  superTransactions: SuperTransaction[];
  chatConversations: ChatConversation[];
  categorizationQueue: CategorizationQueueItem[];
  merchantPatterns: MerchantPattern[];
}

export interface SyncResult {
  success: boolean;
  direction: 'upload' | 'download' | 'none';
  message: string;
  timestamp?: Date;
}

const SYNC_VERSION = 1;
const SYNC_METADATA_ID = 'primary'; // Single record ID for sync metadata

/**
 * Export all data from IndexedDB
 */
export async function exportData(): Promise<SyncData> {
  const [
    accounts,
    transactions,
    categories,
    holdings,
    investmentTransactions,
    taxItems,
    importBatches,
    superannuationAccounts,
    superTransactions,
    chatConversations,
    categorizationQueue,
    merchantPatterns,
  ] = await Promise.all([
    db.accounts.toArray(),
    db.transactions.toArray(),
    db.categories.toArray(),
    db.holdings.toArray(),
    db.investmentTransactions.toArray(),
    db.taxItems.toArray(),
    db.importBatches.toArray(),
    db.superannuationAccounts.toArray(),
    db.superTransactions.toArray(),
    db.chatConversations.toArray(),
    db.categorizationQueue.toArray(),
    db.merchantPatterns.toArray(),
  ]);

  return {
    version: SYNC_VERSION,
    exportedAt: new Date().toISOString(),
    accounts,
    transactions,
    categories,
    holdings,
    investmentTransactions,
    taxItems,
    importBatches,
    superannuationAccounts,
    superTransactions,
    chatConversations,
    categorizationQueue,
    merchantPatterns,
  };
}

/**
 * Import data into IndexedDB (replaces all existing data)
 */
export async function importData(data: SyncData): Promise<void> {
  // Validate version
  if (data.version > SYNC_VERSION) {
    throw new Error('Data was exported from a newer version of the app. Please update the app first.');
  }

  // Clear existing data and import new data in a transaction
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.transactions,
      db.categories,
      db.holdings,
      db.investmentTransactions,
      db.taxItems,
      db.importBatches,
      db.superannuationAccounts,
      db.superTransactions,
      db.chatConversations,
      db.categorizationQueue,
      db.merchantPatterns,
    ],
    async () => {
      // Clear all tables
      await Promise.all([
        db.accounts.clear(),
        db.transactions.clear(),
        db.categories.clear(),
        db.holdings.clear(),
        db.investmentTransactions.clear(),
        db.taxItems.clear(),
        db.importBatches.clear(),
        db.superannuationAccounts.clear(),
        db.superTransactions.clear(),
        db.chatConversations.clear(),
        db.categorizationQueue.clear(),
        db.merchantPatterns.clear(),
      ]);

      // Import new data (handle backward compatibility for older exports)
      if (data.accounts?.length) await db.accounts.bulkAdd(data.accounts);
      if (data.transactions?.length) await db.transactions.bulkAdd(data.transactions);
      if (data.categories?.length) await db.categories.bulkAdd(data.categories);
      if (data.holdings?.length) await db.holdings.bulkAdd(data.holdings);
      if (data.investmentTransactions?.length) await db.investmentTransactions.bulkAdd(data.investmentTransactions);
      if (data.taxItems?.length) await db.taxItems.bulkAdd(data.taxItems);
      if (data.importBatches?.length) await db.importBatches.bulkAdd(data.importBatches);
      if (data.superannuationAccounts?.length) await db.superannuationAccounts.bulkAdd(data.superannuationAccounts);
      if (data.superTransactions?.length) await db.superTransactions.bulkAdd(data.superTransactions);
      if (data.chatConversations?.length) await db.chatConversations.bulkAdd(data.chatConversations);
      if (data.categorizationQueue?.length) await db.categorizationQueue.bulkAdd(data.categorizationQueue);
      if (data.merchantPatterns?.length) await db.merchantPatterns.bulkAdd(data.merchantPatterns);
    }
  );
}

/**
 * Get sync metadata from IndexedDB
 */
export async function getSyncMetadata(): Promise<SyncMetadata | null> {
  try {
    const metadata = await db.syncMetadata.get(SYNC_METADATA_ID);
    return metadata || null;
  } catch {
    return null;
  }
}

/**
 * Save sync metadata to IndexedDB
 */
export async function saveSyncMetadata(metadata: Partial<SyncMetadata>): Promise<void> {
  const existing = await getSyncMetadata();

  const updated: SyncMetadata = {
    id: SYNC_METADATA_ID,
    lastSyncVersion: existing?.lastSyncVersion ?? 0,
    ...existing,
    ...metadata,
  };

  await db.syncMetadata.put(updated);
}

/**
 * Set up encryption password and store hash
 */
export async function setupEncryption(password: string): Promise<void> {
  const { hash, salt } = await hashPassword(password);

  await saveSyncMetadata({
    encryptionKeyHash: `${salt}:${hash}`,
  });
}

/**
 * Verify encryption password
 */
export async function verifyEncryptionPassword(password: string): Promise<boolean> {
  const metadata = await getSyncMetadata();
  if (!metadata?.encryptionKeyHash) {
    return false;
  }

  const [salt, hash] = metadata.encryptionKeyHash.split(':');
  return verifyPassword(password, hash, salt);
}

/**
 * Check if encryption is set up
 */
export async function isEncryptionSetUp(): Promise<boolean> {
  const metadata = await getSyncMetadata();
  return !!metadata?.encryptionKeyHash;
}

/**
 * Sync data with Google Drive
 */
export async function syncWithDrive(password: string): Promise<SyncResult> {
  const authState = getAuthState();
  if (!authState.isSignedIn) {
    return {
      success: false,
      direction: 'none',
      message: 'Not signed in to Google',
    };
  }

  // Verify password
  if (await isEncryptionSetUp()) {
    const isValid = await verifyEncryptionPassword(password);
    if (!isValid) {
      return {
        success: false,
        direction: 'none',
        message: 'Invalid encryption password',
      };
    }
  } else {
    // Set up encryption with this password
    await setupEncryption(password);
  }

  const metadata = await getSyncMetadata();
  const localVersion = metadata?.lastSyncVersion || 0;

  // Get remote last modified time
  const remoteModified = await getLastModified();
  const localLastSync = metadata?.lastSyncAt ? new Date(metadata.lastSyncAt) : null;

  // Determine sync direction
  let direction: 'upload' | 'download' | 'none' = 'none';

  if (!remoteModified) {
    // No remote data, upload local
    direction = 'upload';
  } else if (!localLastSync) {
    // Never synced before, download remote
    direction = 'download';
  } else if (remoteModified > localLastSync) {
    // Remote is newer, download
    direction = 'download';
  } else {
    // Local is newer or same, upload
    direction = 'upload';
  }

  try {
    if (direction === 'upload') {
      // Export and encrypt local data
      const data = await exportData();
      const encrypted = await encrypt(JSON.stringify(data), password);
      await uploadData(JSON.stringify(encrypted));

      await saveSyncMetadata({
        lastSyncAt: new Date(),
        lastSyncVersion: localVersion + 1,
      });

      return {
        success: true,
        direction: 'upload',
        message: 'Data uploaded to Google Drive',
        timestamp: new Date(),
      };
    } else if (direction === 'download') {
      // Download and decrypt remote data
      const encryptedJson = await downloadData();
      if (!encryptedJson) {
        return {
          success: false,
          direction: 'none',
          message: 'No data found on Google Drive',
        };
      }

      const encrypted: EncryptedData = JSON.parse(encryptedJson);
      const decrypted = await decrypt(encrypted, password);
      const data: SyncData = JSON.parse(decrypted);

      await importData(data);

      await saveSyncMetadata({
        lastSyncAt: new Date(),
        lastSyncVersion: localVersion + 1,
      });

      return {
        success: true,
        direction: 'download',
        message: 'Data downloaded from Google Drive',
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      direction: 'none',
      message: 'Already in sync',
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      direction,
      message: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/**
 * Force upload local data to Google Drive
 */
export async function forceUpload(password: string): Promise<SyncResult> {
  const authState = getAuthState();
  if (!authState.isSignedIn) {
    return {
      success: false,
      direction: 'none',
      message: 'Not signed in to Google',
    };
  }

  if (!(await isEncryptionSetUp())) {
    await setupEncryption(password);
  } else {
    const isValid = await verifyEncryptionPassword(password);
    if (!isValid) {
      return {
        success: false,
        direction: 'none',
        message: 'Invalid encryption password',
      };
    }
  }

  try {
    const data = await exportData();
    const encrypted = await encrypt(JSON.stringify(data), password);
    await uploadData(JSON.stringify(encrypted));

    const metadata = await getSyncMetadata();
    await saveSyncMetadata({
      lastSyncAt: new Date(),
      lastSyncVersion: (metadata?.lastSyncVersion || 0) + 1,
    });

    return {
      success: true,
      direction: 'upload',
      message: 'Data uploaded to Google Drive',
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      direction: 'upload',
      message: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Force download data from Google Drive
 */
export async function forceDownload(password: string): Promise<SyncResult> {
  const authState = getAuthState();
  if (!authState.isSignedIn) {
    return {
      success: false,
      direction: 'none',
      message: 'Not signed in to Google',
    };
  }

  try {
    const encryptedJson = await downloadData();
    if (!encryptedJson) {
      return {
        success: false,
        direction: 'none',
        message: 'No data found on Google Drive',
      };
    }

    const encrypted: EncryptedData = JSON.parse(encryptedJson);
    const decrypted = await decrypt(encrypted, password);
    const data: SyncData = JSON.parse(decrypted);

    await importData(data);

    const metadata = await getSyncMetadata();
    await saveSyncMetadata({
      lastSyncAt: new Date(),
      lastSyncVersion: (metadata?.lastSyncVersion || 0) + 1,
    });

    return {
      success: true,
      direction: 'download',
      message: 'Data downloaded from Google Drive',
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      direction: 'download',
      message: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

/**
 * Export data as unencrypted JSON for local backup
 */
export async function exportLocalBackup(): Promise<string> {
  const data = await exportData();
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from local backup file
 */
export async function importLocalBackup(json: string): Promise<void> {
  const data: SyncData = JSON.parse(json);
  await importData(data);
}
