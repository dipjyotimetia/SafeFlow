/**
 * Rollback Manager for Sync Operations
 *
 * Creates snapshots before sync and enables rollback if sync fails.
 * Automatically cleans up old snapshots to manage storage.
 */

import { db } from "@/lib/db";
import { exportData, importData } from "./sync-service";
import type { SyncSnapshot } from "@/types";
import { v4 as uuidv4 } from "uuid";

const MAX_SNAPSHOTS = 3;
const SNAPSHOT_EXPIRY_DAYS = 7;

/**
 * Compress a JSON string using browser's CompressionStream API
 */
async function compressData(data: string): Promise<string> {
  // Check if CompressionStream is available (modern browsers)
  if (typeof CompressionStream !== "undefined") {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(data));
        controller.close();
      },
    });

    const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
    const reader = compressedStream.getReader();
    const chunks: Uint8Array[] = [];

    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        chunks.push(result.value);
      }
    }

    // Combine chunks and convert to base64
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to base64 in chunks to avoid stack overflow with large data
    const CHUNK_SIZE = 8192;
    let binary = "";
    for (let i = 0; i < combined.length; i += CHUNK_SIZE) {
      const chunk = combined.subarray(i, Math.min(i + CHUNK_SIZE, combined.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  }

  // Fallback: store uncompressed
  return data;
}

/**
 * Decompress data compressed with compressData
 */
async function decompressData(compressed: string): Promise<string> {
  // Check if DecompressionStream is available
  if (typeof DecompressionStream !== "undefined") {
    try {
      // Convert base64 to Uint8Array
      const binary = atob(compressed);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });

      const decompressedStream = stream.pipeThrough(
        new DecompressionStream("gzip")
      );
      const reader = decompressedStream.getReader();
      const chunks: Uint8Array[] = [];

      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          chunks.push(result.value);
        }
      }

      // Combine and decode
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      return new TextDecoder().decode(combined);
    } catch {
      // If decompression fails, assume it's uncompressed
      return compressed;
    }
  }

  // Fallback: assume uncompressed
  return compressed;
}

/**
 * Create a snapshot of current data before sync
 */
export async function createSnapshot(
  reason: SyncSnapshot["reason"] = "pre-sync"
): Promise<string> {
  const data = await exportData();
  const jsonData = JSON.stringify(data);
  const compressedData = await compressData(jsonData);

  const snapshot: SyncSnapshot = {
    id: uuidv4(),
    data: compressedData,
    createdAt: new Date(),
    sizeBytes: compressedData.length,
    reason,
  };

  await db.syncSnapshots.add(snapshot);

  // Cleanup old snapshots
  await cleanupOldSnapshots();

  return snapshot.id;
}

/**
 * Restore data from a snapshot (rollback)
 */
export async function restoreSnapshot(snapshotId: string): Promise<void> {
  const snapshot = await db.syncSnapshots.get(snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const jsonData = await decompressData(snapshot.data);
  const data = JSON.parse(jsonData);

  await importData(data);
}

/**
 * Get the most recent snapshot
 */
export async function getLatestSnapshot(): Promise<SyncSnapshot | null> {
  const snapshots = await db.syncSnapshots
    .orderBy("createdAt")
    .reverse()
    .limit(1)
    .toArray();

  return snapshots[0] || null;
}

/**
 * List all available snapshots
 */
export async function listSnapshots(): Promise<SyncSnapshot[]> {
  return db.syncSnapshots.orderBy("createdAt").reverse().toArray();
}

/**
 * Delete a specific snapshot
 */
export async function deleteSnapshot(snapshotId: string): Promise<void> {
  await db.syncSnapshots.delete(snapshotId);
}

/**
 * Cleanup old snapshots (keep only MAX_SNAPSHOTS most recent, delete expired)
 * Combines both checks into a single pass to avoid race conditions
 */
async function cleanupOldSnapshots(): Promise<void> {
  const allSnapshots = await db.syncSnapshots
    .orderBy("createdAt")
    .reverse()
    .toArray();

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - SNAPSHOT_EXPIRY_DAYS);

  // Identify snapshots to delete: beyond MAX count OR older than expiry
  const toDelete = allSnapshots.filter(
    (snapshot, index) =>
      index >= MAX_SNAPSHOTS || snapshot.createdAt < expiryDate
  );

  if (toDelete.length > 0) {
    await db.syncSnapshots.bulkDelete(toDelete.map((s) => s.id));
  }
}

/**
 * Get total storage used by snapshots
 */
export async function getSnapshotStorageUsed(): Promise<number> {
  const snapshots = await db.syncSnapshots.toArray();
  return snapshots.reduce((total, snapshot) => total + snapshot.sizeBytes, 0);
}

/**
 * Clear all snapshots
 */
export async function clearAllSnapshots(): Promise<void> {
  await db.syncSnapshots.clear();
}
