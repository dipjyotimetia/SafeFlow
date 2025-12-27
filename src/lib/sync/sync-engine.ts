/**
 * Sync Engine - Core orchestrator for sync operations
 *
 * Coordinates the entire sync process including:
 * - Snapshot creation for rollback
 * - Data export/import
 * - Encryption/decryption
 * - Conflict detection and resolution
 * - Progress tracking
 */

import type { SyncBackend } from "./backends/types";
import type { SyncData } from "./sync-service";
import type { ConflictStrategy, SyncConflict } from "./conflict-resolver";
import { encrypt, decrypt, type EncryptedData } from "./encryption";
import { syncProgressTracker } from "./progress-tracker";
import { createSnapshot, restoreSnapshot, getLatestSnapshot } from "./rollback-manager";
import { exportData, importData, getSyncMetadata, saveSyncMetadata } from "./sync-service";
import { syncDataSchema } from "@/lib/schemas/sync.schema";

const SYNC_VERSION = 1;
const NETWORK_TIMEOUT_MS = 30000; // 30 seconds

export interface SyncEngineOptions {
  /** Conflict resolution strategy */
  conflictStrategy: ConflictStrategy;
  /** Whether to create a snapshot before sync */
  createSnapshot: boolean;
  /** Whether to validate data with Zod before import */
  validateData: boolean;
  /** Network timeout in milliseconds */
  timeoutMs: number;
}

export interface SyncEngineResult {
  success: boolean;
  direction: "upload" | "download" | "bidirectional" | "none";
  message: string;
  timestamp: Date;
  conflicts?: SyncConflict[];
  snapshotId?: string;
  recordsUploaded?: number;
  recordsDownloaded?: number;
}

const DEFAULT_OPTIONS: SyncEngineOptions = {
  conflictStrategy: "newest-wins",
  createSnapshot: true,
  validateData: true,
  timeoutMs: NETWORK_TIMEOUT_MS,
};

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Main sync engine class
 */
export class SyncEngine {
  private backend: SyncBackend;
  private password: string;
  private options: SyncEngineOptions;

  constructor(
    backend: SyncBackend,
    password: string,
    options: Partial<SyncEngineOptions> = {}
  ) {
    this.backend = backend;
    this.password = password;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Perform a full sync operation
   */
  async sync(): Promise<SyncEngineResult> {
    let snapshotId: string | undefined;

    try {
      // Reset progress
      syncProgressTracker.reset();

      // Verify backend authentication
      if (!this.backend.isAuthenticated()) {
        throw new Error(`Not authenticated with ${this.backend.displayName}`);
      }

      // Create snapshot if enabled
      if (this.options.createSnapshot) {
        syncProgressTracker.setPhase("snapshot");
        snapshotId = await createSnapshot("pre-sync");
      }

      // Determine sync direction
      const metadata = await getSyncMetadata();
      const localVersion = metadata?.lastSyncVersion ?? 0;
      const remoteModified = await this.backend.getLastModified();
      const localLastSync = metadata?.lastSyncAt
        ? new Date(metadata.lastSyncAt)
        : null;

      let direction: "upload" | "download" | "none" = "none";

      if (!remoteModified) {
        direction = "upload";
      } else if (!localLastSync) {
        direction = "download";
      } else if (remoteModified > localLastSync) {
        direction = "download";
      } else {
        direction = "upload";
      }

      if (direction === "upload") {
        return await this.performUpload(localVersion, snapshotId);
      } else if (direction === "download") {
        return await this.performDownload(localVersion, snapshotId);
      }

      syncProgressTracker.setPhase("complete", "Already in sync");
      return {
        success: true,
        direction: "none",
        message: "Already in sync",
        timestamp: new Date(),
        snapshotId,
      };
    } catch (error) {
      syncProgressTracker.setPhase("error", this.getErrorMessage(error));

      // Attempt rollback if we have a snapshot
      if (snapshotId) {
        try {
          await restoreSnapshot(snapshotId);
          console.log("[SyncEngine] Rolled back to snapshot:", snapshotId);
        } catch (rollbackError) {
          console.error("[SyncEngine] Rollback failed:", rollbackError);
        }
      }

      return {
        success: false,
        direction: "none",
        message: this.getErrorMessage(error),
        timestamp: new Date(),
        snapshotId,
      };
    }
  }

  /**
   * Force upload local data
   */
  async forceUpload(): Promise<SyncEngineResult> {
    let snapshotId: string | undefined;

    try {
      syncProgressTracker.reset();

      if (this.options.createSnapshot) {
        syncProgressTracker.setPhase("snapshot");
        snapshotId = await createSnapshot("pre-sync");
      }

      const metadata = await getSyncMetadata();
      const localVersion = metadata?.lastSyncVersion ?? 0;

      return await this.performUpload(localVersion, snapshotId);
    } catch (error) {
      syncProgressTracker.setPhase("error", this.getErrorMessage(error));
      return {
        success: false,
        direction: "upload",
        message: this.getErrorMessage(error),
        timestamp: new Date(),
        snapshotId,
      };
    }
  }

  /**
   * Force download remote data
   */
  async forceDownload(): Promise<SyncEngineResult> {
    let snapshotId: string | undefined;

    try {
      syncProgressTracker.reset();

      if (this.options.createSnapshot) {
        syncProgressTracker.setPhase("snapshot");
        snapshotId = await createSnapshot("pre-sync");
      }

      const metadata = await getSyncMetadata();
      const localVersion = metadata?.lastSyncVersion ?? 0;

      return await this.performDownload(localVersion, snapshotId);
    } catch (error) {
      syncProgressTracker.setPhase("error", this.getErrorMessage(error));

      // Attempt rollback
      if (snapshotId) {
        try {
          await restoreSnapshot(snapshotId);
        } catch (rollbackError) {
          console.error("[SyncEngine] Rollback failed:", rollbackError);
        }
      }

      return {
        success: false,
        direction: "download",
        message: this.getErrorMessage(error),
        timestamp: new Date(),
        snapshotId,
      };
    }
  }

  /**
   * Rollback to the latest snapshot
   */
  async rollback(): Promise<boolean> {
    try {
      const snapshot = await getLatestSnapshot();
      if (!snapshot) {
        throw new Error("No snapshot available for rollback");
      }

      syncProgressTracker.setPhase("import", "Restoring from snapshot...");
      await restoreSnapshot(snapshot.id);
      syncProgressTracker.setPhase("complete", "Rollback complete");

      return true;
    } catch (error) {
      syncProgressTracker.setPhase("error", this.getErrorMessage(error));
      return false;
    }
  }

  private async performUpload(
    localVersion: number,
    snapshotId?: string
  ): Promise<SyncEngineResult> {
    // Export data
    syncProgressTracker.setPhase("export");
    const data = await exportData();

    // Encrypt data
    syncProgressTracker.setPhase("encrypt");
    const encrypted = await encrypt(JSON.stringify(data), this.password);

    // Upload with timeout
    syncProgressTracker.setPhase("upload");
    const { timeoutId } = createTimeoutController(this.options.timeoutMs);

    try {
      await this.backend.upload(encrypted);
    } finally {
      clearTimeout(timeoutId);
    }

    // Update metadata
    await saveSyncMetadata({
      lastSyncAt: new Date(),
      lastSyncVersion: localVersion + 1,
    });

    syncProgressTracker.setPhase("complete", "Upload complete");

    return {
      success: true,
      direction: "upload",
      message: `Data uploaded to ${this.backend.displayName}`,
      timestamp: new Date(),
      snapshotId,
      recordsUploaded: this.countRecords(data),
    };
  }

  private async performDownload(
    localVersion: number,
    snapshotId?: string
  ): Promise<SyncEngineResult> {
    // Download with timeout
    syncProgressTracker.setPhase("download");
    const { timeoutId } = createTimeoutController(this.options.timeoutMs);

    let encrypted: EncryptedData | null;
    try {
      encrypted = await this.backend.download();
    } finally {
      clearTimeout(timeoutId);
    }

    if (!encrypted) {
      return {
        success: false,
        direction: "none",
        message: `No data found on ${this.backend.displayName}`,
        timestamp: new Date(),
        snapshotId,
      };
    }

    // Decrypt data
    syncProgressTracker.setPhase("decrypt");
    const decrypted = await decrypt(encrypted, this.password);

    // Validate data
    syncProgressTracker.setPhase("validate");
    let data: SyncData;

    if (this.options.validateData) {
      const parseResult = syncDataSchema.safeParse(JSON.parse(decrypted));
      if (!parseResult.success) {
        throw new Error(
          `Invalid sync data: ${parseResult.error.message}`
        );
      }
      data = parseResult.data as SyncData;
    } else {
      data = JSON.parse(decrypted);
    }

    // Check version compatibility
    if (data.version > SYNC_VERSION) {
      throw new Error(
        "Data was exported from a newer version. Please update the app."
      );
    }

    // Import data
    syncProgressTracker.setPhase("import");
    await importData(data);

    // Update metadata
    await saveSyncMetadata({
      lastSyncAt: new Date(),
      lastSyncVersion: localVersion + 1,
    });

    syncProgressTracker.setPhase("complete", "Download complete");

    return {
      success: true,
      direction: "download",
      message: `Data downloaded from ${this.backend.displayName}`,
      timestamp: new Date(),
      snapshotId,
      recordsDownloaded: this.countRecords(data),
    };
  }

  private countRecords(data: SyncData): number {
    let count = 0;
    count += data.accounts?.length ?? 0;
    count += data.transactions?.length ?? 0;
    count += data.categories?.length ?? 0;
    count += data.holdings?.length ?? 0;
    count += data.investmentTransactions?.length ?? 0;
    count += data.taxItems?.length ?? 0;
    count += data.importBatches?.length ?? 0;
    count += data.superannuationAccounts?.length ?? 0;
    count += data.superTransactions?.length ?? 0;
    count += data.chatConversations?.length ?? 0;
    count += data.categorizationQueue?.length ?? 0;
    count += data.merchantPatterns?.length ?? 0;
    count += data.budgets?.length ?? 0;
    count += data.familyMembers?.length ?? 0;
    count += data.goals?.length ?? 0;
    count += data.priceHistory?.length ?? 0;
    count += data.portfolioHistory?.length ?? 0;
    count += data.properties?.length ?? 0;
    count += data.propertyLoans?.length ?? 0;
    count += data.propertyExpenses?.length ?? 0;
    count += data.propertyRentals?.length ?? 0;
    count += data.propertyDepreciation?.length ?? 0;
    count += data.propertyModels?.length ?? 0;
    return count;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // Categorize common errors
      const message = error.message;

      if (message.includes("abort") || message.includes("timeout")) {
        return "Network timeout. Please check your connection and try again.";
      }

      if (message.includes("NetworkError") || message.includes("Failed to fetch")) {
        return "Network error. Please check your internet connection.";
      }

      if (message.includes("decrypt") || message.includes("encryption")) {
        return "Decryption failed. Please check your password.";
      }

      if (message.includes("auth") || message.includes("401")) {
        return "Authentication failed. Please reconnect your sync account.";
      }

      return message;
    }

    return "An unexpected error occurred during sync.";
  }
}

/**
 * Create a sync engine instance
 */
export function createSyncEngine(
  backend: SyncBackend,
  password: string,
  options?: Partial<SyncEngineOptions>
): SyncEngine {
  return new SyncEngine(backend, password, options);
}
