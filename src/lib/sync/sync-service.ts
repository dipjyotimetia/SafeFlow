// Sync service - orchestrates data sync with pluggable backends

import { db } from '@/lib/db';
import { encrypt, decrypt, hashPassword, verifyPassword, type EncryptedData } from './encryption';
import type { SyncBackend, SyncBackendType, BackendConfig } from './backends/types';
import { syncDataSchema } from '@/lib/schemas/sync.schema';
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

// Import for backward compatibility (legacy Google Drive sync)
import { uploadData, downloadData, getLastModified, getAuthState } from './google-drive';

// Re-export for backward compatibility
export { uploadData, downloadData, getLastModified, getAuthState };

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
  // Added missing tables
  budgets?: Budget[];
  familyMembers?: FamilyMember[];
  goals?: Goal[];
  priceHistory?: PriceHistoryEntry[];
  portfolioHistory?: PortfolioSnapshot[];
  // Property portfolio tables
  properties?: Property[];
  propertyLoans?: PropertyLoan[];
  propertyExpenses?: PropertyExpense[];
  propertyRentals?: PropertyRental[];
  propertyDepreciation?: PropertyDepreciation[];
  propertyModels?: PropertyModel[];
}

export interface SyncResult {
  success: boolean;
  direction: 'upload' | 'download' | 'none';
  message: string;
  timestamp?: Date;
}

const SYNC_VERSION = 1;
const SYNC_METADATA_ID = 'primary'; // Single record ID for sync metadata

// Timeout for network operations (60 seconds)
const SYNC_TIMEOUT_MS = 60 * 1000;

/**
 * Wrap a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param operation Description of the operation for error messages
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${Math.round(timeoutMs / 1000)} seconds`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function reviveIsoDates(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reviveIsoDates);
  }

  if (value && typeof value === 'object') {
    const revivedEntries = Object.entries(value).map(([key, nestedValue]) => {
      if (typeof nestedValue === 'string' && ISO_DATE_REGEX.test(nestedValue)) {
        return [key, new Date(nestedValue)];
      }
      return [key, reviveIsoDates(nestedValue)];
    });
    return Object.fromEntries(revivedEntries);
  }

  return value;
}

function parseAndValidateSyncData(json: string): SyncData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid sync payload: malformed JSON');
  }

  const validationResult = syncDataSchema.safeParse(reviveIsoDates(parsed));
  if (!validationResult.success) {
    throw new Error(`Invalid sync payload: ${validationResult.error.message}`);
  }

  return validationResult.data as SyncData;
}

/**
 * Import sync data with best-effort rollback protection.
 * Dexie transactions are already atomic, but this provides an additional
 * recovery guard for unexpected runtime failures.
 */
async function importDataWithRollback(data: SyncData): Promise<void> {
  const preImportSnapshot = await exportData();
  try {
    await importData(data);
  } catch (error) {
    try {
      await importData(preImportSnapshot);
    } catch (rollbackError) {
      console.error('[SyncService] Rollback failed:', rollbackError);
    }
    throw error;
  }
}

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
    budgets,
    familyMembers,
    goals,
    priceHistory,
    portfolioHistory,
    properties,
    propertyLoans,
    propertyExpenses,
    propertyRentals,
    propertyDepreciation,
    propertyModels,
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
    db.budgets.toArray(),
    db.familyMembers.toArray(),
    db.goals.toArray(),
    db.priceHistory.toArray(),
    db.portfolioHistory.toArray(),
    db.properties.toArray(),
    db.propertyLoans.toArray(),
    db.propertyExpenses.toArray(),
    db.propertyRentals.toArray(),
    db.propertyDepreciation.toArray(),
    db.propertyModels.toArray(),
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
    budgets,
    familyMembers,
    goals,
    priceHistory,
    portfolioHistory,
    properties,
    propertyLoans,
    propertyExpenses,
    propertyRentals,
    propertyDepreciation,
    propertyModels,
  };
}

/**
 * Import data into IndexedDB (replaces all existing data)
 */
export async function importData(data: SyncData): Promise<void> {
  const validationResult = syncDataSchema.safeParse(data);
  if (!validationResult.success) {
    throw new Error(`Invalid sync data: ${validationResult.error.message}`);
  }

  const validatedData = validationResult.data as SyncData;

  // Validate version
  if (validatedData.version > SYNC_VERSION) {
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
      db.budgets,
      db.familyMembers,
      db.goals,
      db.priceHistory,
      db.portfolioHistory,
      db.properties,
      db.propertyLoans,
      db.propertyExpenses,
      db.propertyRentals,
      db.propertyDepreciation,
      db.propertyModels,
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
        db.budgets.clear(),
        db.familyMembers.clear(),
        db.goals.clear(),
        db.priceHistory.clear(),
        db.portfolioHistory.clear(),
        db.properties.clear(),
        db.propertyLoans.clear(),
        db.propertyExpenses.clear(),
        db.propertyRentals.clear(),
        db.propertyDepreciation.clear(),
        db.propertyModels.clear(),
      ]);

      // Import new data using bulkPut to handle conflicts gracefully (upsert behavior)
      // This prevents sync failures when records already exist
      if (validatedData.accounts?.length) await db.accounts.bulkPut(validatedData.accounts);
      if (validatedData.transactions?.length) await db.transactions.bulkPut(validatedData.transactions);
      if (validatedData.categories?.length) await db.categories.bulkPut(validatedData.categories);
      if (validatedData.holdings?.length) await db.holdings.bulkPut(validatedData.holdings);
      if (validatedData.investmentTransactions?.length) await db.investmentTransactions.bulkPut(validatedData.investmentTransactions);
      if (validatedData.taxItems?.length) await db.taxItems.bulkPut(validatedData.taxItems);
      if (validatedData.importBatches?.length) await db.importBatches.bulkPut(validatedData.importBatches);
      if (validatedData.superannuationAccounts?.length) await db.superannuationAccounts.bulkPut(validatedData.superannuationAccounts);
      if (validatedData.superTransactions?.length) await db.superTransactions.bulkPut(validatedData.superTransactions);
      if (validatedData.chatConversations?.length) await db.chatConversations.bulkPut(validatedData.chatConversations);
      if (validatedData.categorizationQueue?.length) await db.categorizationQueue.bulkPut(validatedData.categorizationQueue);
      if (validatedData.merchantPatterns?.length) await db.merchantPatterns.bulkPut(validatedData.merchantPatterns);
      if (validatedData.budgets?.length) await db.budgets.bulkPut(validatedData.budgets);
      if (validatedData.familyMembers?.length) await db.familyMembers.bulkPut(validatedData.familyMembers);
      if (validatedData.goals?.length) await db.goals.bulkPut(validatedData.goals);
      if (validatedData.priceHistory?.length) await db.priceHistory.bulkPut(validatedData.priceHistory);
      if (validatedData.portfolioHistory?.length) await db.portfolioHistory.bulkPut(validatedData.portfolioHistory);
      // Property tables (backward compatible - optional in older exports)
      if (validatedData.properties?.length) await db.properties.bulkPut(validatedData.properties);
      if (validatedData.propertyLoans?.length) await db.propertyLoans.bulkPut(validatedData.propertyLoans);
      if (validatedData.propertyExpenses?.length) await db.propertyExpenses.bulkPut(validatedData.propertyExpenses);
      if (validatedData.propertyRentals?.length) await db.propertyRentals.bulkPut(validatedData.propertyRentals);
      if (validatedData.propertyDepreciation?.length) await db.propertyDepreciation.bulkPut(validatedData.propertyDepreciation);
      if (validatedData.propertyModels?.length) await db.propertyModels.bulkPut(validatedData.propertyModels);
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
  } catch (error) {
    console.error('[SyncService] Failed to get sync metadata:', error);
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
      const data = parseAndValidateSyncData(decrypted);

      await importDataWithRollback(data);

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
    const data = parseAndValidateSyncData(decrypted);

    await importDataWithRollback(data);

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
  const data = parseAndValidateSyncData(json);
  await importDataWithRollback(data);
}

// ============ Backend Configuration Persistence ============

const DEVICE_KEY_STORAGE = 'safeflow-device-key';

/**
 * Convert Uint8Array to base64 (matches encryption.ts pattern)
 */
function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(array)));
}

/**
 * Get or create a device-specific encryption key.
 * This key is used to encrypt backend credentials in IndexedDB.
 *
 * Security note: This provides defense-in-depth against casual IndexedDB snooping,
 * but is NOT XSS-proof. An XSS attacker can read both localStorage and IndexedDB.
 * For maximum security, implement Content Security Policy (CSP) headers.
 */
function getOrCreateDeviceKey(): string {
  if (typeof window === 'undefined') {
    throw new Error('Device key can only be accessed in browser');
  }

  let deviceKey = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!deviceKey) {
    // Generate a new device key (32 random bytes = 256 bits as base64)
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    deviceKey = arrayToBase64(bytes);
    localStorage.setItem(DEVICE_KEY_STORAGE, deviceKey);
  }
  return deviceKey;
}

/**
 * Encrypt backend configuration with device key
 */
async function encryptConfig(config: BackendConfig): Promise<string> {
  const deviceKey = getOrCreateDeviceKey();
  const encrypted = await encrypt(JSON.stringify(config), deviceKey);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt backend configuration with device key
 */
async function decryptConfig(encryptedConfig: string): Promise<BackendConfig> {
  const deviceKey = getOrCreateDeviceKey();
  const encrypted = JSON.parse(encryptedConfig) as EncryptedData;
  const decrypted = await decrypt(encrypted, deviceKey);
  return JSON.parse(decrypted) as BackendConfig;
}

/**
 * Save backend configuration to IndexedDB (encrypted with device key)
 * Credentials are encrypted before storage for XSS protection.
 */
export async function saveBackendConfig(
  type: SyncBackendType,
  config: BackendConfig
): Promise<void> {
  const encryptedConfig = await encryptConfig(config);
  await saveSyncMetadata({
    backendType: type,
    backendConfig: encryptedConfig,
  });
}

/**
 * Load saved backend configuration from IndexedDB (decrypted with device key)
 */
export async function loadBackendConfig(): Promise<{
  type: SyncBackendType;
  config: BackendConfig;
} | null> {
  const metadata = await getSyncMetadata();

  if (!metadata?.backendType || !metadata?.backendConfig) {
    return null;
  }

  try {
    // Try to decrypt (encrypted format)
    const config = await decryptConfig(metadata.backendConfig);
    return {
      type: metadata.backendType,
      config,
    };
  } catch {
    // Fallback: try parsing as plain JSON (legacy unencrypted format)
    try {
      const config = JSON.parse(metadata.backendConfig) as BackendConfig;
      // Re-save with encryption for future loads
      await saveBackendConfig(metadata.backendType, config);
      return {
        type: metadata.backendType,
        config,
      };
    } catch {
      console.error('[SyncService] Failed to parse backend config');
      // Clear corrupted config
      await clearBackendConfig();
      return null;
    }
  }
}

/**
 * Clear saved backend configuration
 */
export async function clearBackendConfig(): Promise<void> {
  await saveSyncMetadata({
    backendType: undefined,
    backendConfig: undefined,
  });
}

export async function saveInsecureHttpAcknowledgment(endpoint: string): Promise<void> {
  const normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint) return;

  await saveSyncMetadata({
    insecureHttpAcknowledged: true,
    insecureHttpAcknowledgedAt: new Date(),
    insecureHttpEndpoint: normalizedEndpoint,
  });
}

export async function hasInsecureHttpAcknowledgment(endpoint: string): Promise<boolean> {
  const normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint) return false;

  const metadata = await getSyncMetadata();
  return Boolean(
    metadata?.insecureHttpAcknowledged &&
    metadata?.insecureHttpEndpoint &&
    metadata.insecureHttpEndpoint === normalizedEndpoint
  );
}

// ============ Backend-Agnostic Sync Functions ============

/**
 * Sync data with any backend
 */
export async function syncWithBackend(
  backend: SyncBackend,
  password: string
): Promise<SyncResult> {
  if (!backend.isAuthenticated()) {
    return {
      success: false,
      direction: 'none',
      message: `Not authenticated with ${backend.displayName}`,
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

  // Get remote last modified time (with timeout)
  const remoteModified = await withTimeout(
    backend.getLastModified(),
    SYNC_TIMEOUT_MS,
    'Checking remote status'
  );
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
      await withTimeout(
        backend.upload(encrypted),
        SYNC_TIMEOUT_MS,
        'Uploading data'
      );

      await saveSyncMetadata({
        lastSyncAt: new Date(),
        lastSyncVersion: localVersion + 1,
      });

      return {
        success: true,
        direction: 'upload',
        message: `Data uploaded to ${backend.displayName}`,
        timestamp: new Date(),
      };
    } else if (direction === 'download') {
      // Download and decrypt remote data (with timeout)
      const encrypted = await withTimeout(
        backend.download(),
        SYNC_TIMEOUT_MS,
        'Downloading data'
      );
      if (!encrypted) {
        return {
          success: false,
          direction: 'none',
          message: `No data found on ${backend.displayName}`,
        };
      }

      const decrypted = await decrypt(encrypted, password);
      const data = parseAndValidateSyncData(decrypted);

      await importDataWithRollback(data);

      await saveSyncMetadata({
        lastSyncAt: new Date(),
        lastSyncVersion: localVersion + 1,
      });

      return {
        success: true,
        direction: 'download',
        message: `Data downloaded from ${backend.displayName}`,
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
 * Force upload local data to any backend
 */
export async function forceUploadToBackend(
  backend: SyncBackend,
  password: string
): Promise<SyncResult> {
  if (!backend.isAuthenticated()) {
    return {
      success: false,
      direction: 'none',
      message: `Not authenticated with ${backend.displayName}`,
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
    await withTimeout(
      backend.upload(encrypted),
      SYNC_TIMEOUT_MS,
      'Uploading data'
    );

    const metadata = await getSyncMetadata();
    await saveSyncMetadata({
      lastSyncAt: new Date(),
      lastSyncVersion: (metadata?.lastSyncVersion || 0) + 1,
    });

    return {
      success: true,
      direction: 'upload',
      message: `Data uploaded to ${backend.displayName}`,
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
 * Force download data from any backend
 */
export async function forceDownloadFromBackend(
  backend: SyncBackend,
  password: string
): Promise<SyncResult> {
  if (!backend.isAuthenticated()) {
    return {
      success: false,
      direction: 'none',
      message: `Not authenticated with ${backend.displayName}`,
    };
  }

  try {
    const encrypted = await withTimeout(
      backend.download(),
      SYNC_TIMEOUT_MS,
      'Downloading data'
    );
    if (!encrypted) {
      return {
        success: false,
        direction: 'none',
        message: `No data found on ${backend.displayName}`,
      };
    }

    const decrypted = await decrypt(encrypted, password);
    const data = parseAndValidateSyncData(decrypted);

    await importDataWithRollback(data);

    const metadata = await getSyncMetadata();
    await saveSyncMetadata({
      lastSyncAt: new Date(),
      lastSyncVersion: (metadata?.lastSyncVersion || 0) + 1,
    });

    return {
      success: true,
      direction: 'download',
      message: `Data downloaded from ${backend.displayName}`,
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
