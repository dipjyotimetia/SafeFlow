/**
 * Progress Tracker for Sync Operations
 *
 * Provides event-based progress updates for long-running sync operations.
 * Enables UI to show progress bars and status messages.
 */

export type SyncPhase =
  | "idle"
  | "snapshot"
  | "export"
  | "encrypt"
  | "upload"
  | "download"
  | "decrypt"
  | "validate"
  | "import"
  | "conflict-resolution"
  | "complete"
  | "error";

export interface SyncProgress {
  /** Current phase of the sync operation */
  phase: SyncPhase;
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  message: string;
  /** Optional details for debugging */
  details?: string;
  /** Number of items processed */
  itemsProcessed?: number;
  /** Total items to process */
  itemsTotal?: number;
  /** Timestamp of this update */
  timestamp: Date;
}

export type SyncProgressListener = (progress: SyncProgress) => void;

/**
 * Progress Tracker singleton for managing sync progress updates
 */
class ProgressTracker {
  private listeners: Set<SyncProgressListener> = new Set();
  private currentProgress: SyncProgress = {
    phase: "idle",
    progress: 0,
    message: "Ready to sync",
    timestamp: new Date(),
  };

  /**
   * Subscribe to progress updates
   */
  subscribe(listener: SyncProgressListener): () => void {
    this.listeners.add(listener);
    // Immediately send current state
    listener(this.currentProgress);
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  /**
   * Update progress and notify all listeners
   */
  update(progress: Partial<SyncProgress>): void {
    this.currentProgress = {
      ...this.currentProgress,
      ...progress,
      timestamp: new Date(),
    };
    this.notifyListeners();
  }

  /**
   * Set phase with default message
   */
  setPhase(phase: SyncPhase, message?: string): void {
    const defaultMessages: Record<SyncPhase, string> = {
      idle: "Ready to sync",
      snapshot: "Creating backup snapshot...",
      export: "Exporting local data...",
      encrypt: "Encrypting data...",
      upload: "Uploading to cloud...",
      download: "Downloading from cloud...",
      decrypt: "Decrypting data...",
      validate: "Validating data...",
      import: "Importing data...",
      "conflict-resolution": "Resolving conflicts...",
      complete: "Sync complete",
      error: "Sync failed",
    };

    this.update({
      phase,
      message: message ?? defaultMessages[phase],
      progress: this.getDefaultProgress(phase),
    });
  }

  /**
   * Update item progress within a phase
   */
  updateItemProgress(processed: number, total: number): void {
    const phaseProgress = this.getPhaseProgress();
    const itemProgress = total > 0 ? (processed / total) * phaseProgress.range : 0;

    this.update({
      progress: Math.min(100, phaseProgress.base + itemProgress),
      itemsProcessed: processed,
      itemsTotal: total,
    });
  }

  /**
   * Reset tracker to idle state
   */
  reset(): void {
    this.currentProgress = {
      phase: "idle",
      progress: 0,
      message: "Ready to sync",
      timestamp: new Date(),
    };
    this.notifyListeners();
  }

  /**
   * Get current progress
   */
  getProgress(): SyncProgress {
    return { ...this.currentProgress };
  }

  private notifyListeners(): void {
    const progress = { ...this.currentProgress };
    this.listeners.forEach((listener) => {
      try {
        listener(progress);
      } catch (error) {
        console.error("[ProgressTracker] Listener error:", error);
      }
    });
  }

  private getDefaultProgress(phase: SyncPhase): number {
    const progressMap: Record<SyncPhase, number> = {
      idle: 0,
      snapshot: 5,
      export: 15,
      encrypt: 30,
      upload: 50,
      download: 50,
      decrypt: 70,
      validate: 80,
      import: 90,
      "conflict-resolution": 95,
      complete: 100,
      error: 0,
    };
    return progressMap[phase];
  }

  private getPhaseProgress(): { base: number; range: number } {
    const phaseRanges: Record<SyncPhase, { base: number; range: number }> = {
      idle: { base: 0, range: 0 },
      snapshot: { base: 0, range: 5 },
      export: { base: 5, range: 10 },
      encrypt: { base: 15, range: 15 },
      upload: { base: 30, range: 20 },
      download: { base: 30, range: 20 },
      decrypt: { base: 50, range: 20 },
      validate: { base: 70, range: 10 },
      import: { base: 80, range: 15 },
      "conflict-resolution": { base: 95, range: 5 },
      complete: { base: 100, range: 0 },
      error: { base: 0, range: 0 },
    };
    return phaseRanges[this.currentProgress.phase];
  }
}

// Export singleton instance
export const syncProgressTracker = new ProgressTracker();

// Export for testing
export { ProgressTracker };
