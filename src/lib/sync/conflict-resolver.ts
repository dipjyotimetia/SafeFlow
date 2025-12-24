/**
 * Conflict Resolver for Sync Operations
 *
 * Detects and resolves conflicts between local and remote data.
 * Supports automatic resolution strategies and manual conflict resolution.
 */

import type { Versionable } from "@/types";

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy =
  | "local-wins" // Always prefer local changes
  | "remote-wins" // Always prefer remote changes
  | "newest-wins" // Prefer whichever was updated more recently
  | "manual"; // Require user intervention

/**
 * Represents a conflict between local and remote records
 */
export interface SyncConflict<T extends Versionable = Versionable> {
  id: string;
  entityType: string;
  entityId: string;
  local: T;
  remote: T;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: "local" | "remote" | "merged";
  mergedData?: T;
}

/**
 * Result of conflict detection
 */
export interface ConflictDetectionResult<T extends Versionable = Versionable> {
  /** Records that exist only locally (need to upload) */
  localOnly: T[];
  /** Records that exist only remotely (need to download) */
  remoteOnly: T[];
  /** Records that have conflicts (need resolution) */
  conflicts: SyncConflict<T>[];
  /** Records that are identical (no action needed) */
  identical: T[];
}

/**
 * Detect conflicts between local and remote records
 */
export function detectConflicts<T extends Versionable & { id: string }>(
  localRecords: T[],
  remoteRecords: T[],
  entityType: string
): ConflictDetectionResult<T> {
  const localMap = new Map(localRecords.map((r) => [r.id, r]));
  const remoteMap = new Map(remoteRecords.map((r) => [r.id, r]));

  const localOnly: T[] = [];
  const remoteOnly: T[] = [];
  const conflicts: SyncConflict<T>[] = [];
  const identical: T[] = [];

  // Check all local records
  for (const [id, local] of localMap) {
    const remote = remoteMap.get(id);

    if (!remote) {
      // Only exists locally
      localOnly.push(local);
    } else if (areRecordsEqual(local, remote)) {
      // Records are identical
      identical.push(local);
    } else {
      // Records differ - potential conflict
      conflicts.push({
        id: `conflict-${entityType}-${id}`,
        entityType,
        entityId: id,
        local,
        remote,
        detectedAt: new Date(),
      });
    }
  }

  // Check for remote-only records
  for (const [id, remote] of remoteMap) {
    if (!localMap.has(id)) {
      remoteOnly.push(remote);
    }
  }

  return {
    localOnly,
    remoteOnly,
    conflicts,
    identical,
  };
}

/**
 * Check if two records are equal (ignoring sync metadata)
 */
function areRecordsEqual<T extends Versionable>(a: T, b: T): boolean {
  // Create copies without sync-related fields for comparison
  const normalize = (record: T): Omit<T, "syncVersion" | "updatedAt"> => {
    const { syncVersion: _sv, updatedAt: _ua, ...rest } = record as T & {
      syncVersion?: number;
      updatedAt?: Date;
    };
    return rest as Omit<T, "syncVersion" | "updatedAt">;
  };

  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  // Deep compare
  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}

/**
 * Resolve a conflict using the specified strategy
 */
export function resolveConflict<T extends Versionable>(
  conflict: SyncConflict<T>,
  strategy: ConflictStrategy
): T {
  switch (strategy) {
    case "local-wins":
      return {
        ...conflict.local,
        syncVersion: Math.max(
          conflict.local.syncVersion ?? 0,
          conflict.remote.syncVersion ?? 0
        ) + 1,
      };

    case "remote-wins":
      return {
        ...conflict.remote,
        syncVersion: Math.max(
          conflict.local.syncVersion ?? 0,
          conflict.remote.syncVersion ?? 0
        ) + 1,
      };

    case "newest-wins":
      const localTime = conflict.local.updatedAt?.getTime() ?? 0;
      const remoteTime = conflict.remote.updatedAt?.getTime() ?? 0;
      const winner = localTime >= remoteTime ? conflict.local : conflict.remote;
      return {
        ...winner,
        syncVersion: Math.max(
          conflict.local.syncVersion ?? 0,
          conflict.remote.syncVersion ?? 0
        ) + 1,
      };

    case "manual":
      // For manual resolution, we need user input
      // Return the local version as a placeholder - UI should handle this
      throw new Error(
        "Manual resolution required - use resolveConflictManually()"
      );

    default:
      throw new Error(`Unknown conflict strategy: ${strategy}`);
  }
}

/**
 * Resolve a conflict with manually provided merged data
 */
export function resolveConflictManually<T extends Versionable>(
  conflict: SyncConflict<T>,
  choice: "local" | "remote" | "merged",
  mergedData?: T
): SyncConflict<T> {
  const resolved: SyncConflict<T> = {
    ...conflict,
    resolvedAt: new Date(),
    resolution: choice,
  };

  if (choice === "merged") {
    if (!mergedData) {
      throw new Error("Merged data required when resolution is 'merged'");
    }
    resolved.mergedData = {
      ...mergedData,
      syncVersion: Math.max(
        conflict.local.syncVersion ?? 0,
        conflict.remote.syncVersion ?? 0
      ) + 1,
      updatedAt: new Date(),
    };
  }

  return resolved;
}

/**
 * Get the resolved data from a conflict
 */
export function getResolvedData<T extends Versionable>(
  conflict: SyncConflict<T>
): T {
  if (!conflict.resolution) {
    throw new Error("Conflict has not been resolved");
  }

  switch (conflict.resolution) {
    case "local":
      return {
        ...conflict.local,
        syncVersion: Math.max(
          conflict.local.syncVersion ?? 0,
          conflict.remote.syncVersion ?? 0
        ) + 1,
      };

    case "remote":
      return {
        ...conflict.remote,
        syncVersion: Math.max(
          conflict.local.syncVersion ?? 0,
          conflict.remote.syncVersion ?? 0
        ) + 1,
      };

    case "merged":
      if (!conflict.mergedData) {
        throw new Error("Merged data missing from resolved conflict");
      }
      return conflict.mergedData;

    default:
      throw new Error(`Unknown resolution: ${conflict.resolution}`);
  }
}

/**
 * Batch resolve conflicts with a single strategy
 */
export function batchResolveConflicts<T extends Versionable>(
  conflicts: SyncConflict<T>[],
  strategy: Exclude<ConflictStrategy, "manual">
): T[] {
  return conflicts.map((conflict) => resolveConflict(conflict, strategy));
}

/**
 * Check if a record needs to be synced (has changes since last sync version)
 */
export function needsSync<T extends Versionable & { syncVersion?: number }>(
  record: T,
  lastSyncVersion: number
): boolean {
  const recordVersion = record.syncVersion ?? 0;
  return recordVersion > lastSyncVersion;
}

/**
 * Get all records that need to be synced
 */
export function getRecordsToSync<T extends Versionable & { syncVersion?: number }>(
  records: T[],
  lastSyncVersion: number
): T[] {
  return records.filter((record) => needsSync(record, lastSyncVersion));
}

/**
 * Increment sync version for a record
 */
export function incrementSyncVersion<T extends Versionable>(
  record: T,
  currentMaxVersion: number
): T {
  return {
    ...record,
    syncVersion: currentMaxVersion + 1,
    updatedAt: new Date(),
  };
}
