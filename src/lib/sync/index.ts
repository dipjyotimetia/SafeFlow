export {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateRandomKey,
  type EncryptedData,
} from './encryption';

export {
  initGoogleAuth,
  requestAccessToken,
  signOut,
  getAuthState,
  findDataFile,
  uploadData,
  downloadData,
  getLastModified,
  deleteDataFile,
  type GoogleAuthState,
  type DriveFile,
} from './google-drive';

export {
  exportData,
  importData,
  getSyncMetadata,
  saveSyncMetadata,
  setupEncryption,
  verifyEncryptionPassword,
  isEncryptionSetUp,
  syncWithDrive,
  forceUpload,
  forceDownload,
  exportLocalBackup,
  importLocalBackup,
  // Backend config persistence
  saveBackendConfig,
  loadBackendConfig,
  clearBackendConfig,
  // Backend-agnostic sync
  syncWithBackend,
  forceUploadToBackend,
  forceDownloadFromBackend,
  type SyncData,
  type SyncResult,
} from './sync-service';

// Backend registry and types
export {
  backendRegistry,
  getRequiredConfigFields,
  createBackendFromConfig,
  type SyncBackend,
  type SyncBackendType,
  type BackendConfig,
  type GoogleDriveConfig,
  type WebDAVConfig,
  type S3Config,
  type LocalFileConfig,
  type SyncBackendUser,
} from './backends';

// New sync architecture
export {
  syncProgressTracker,
  type SyncPhase,
  type SyncProgress,
  type SyncProgressListener,
} from './progress-tracker';

export {
  createSnapshot,
  restoreSnapshot,
  getLatestSnapshot,
  listSnapshots,
  deleteSnapshot,
  getSnapshotStorageUsed,
  clearAllSnapshots,
} from './rollback-manager';

export {
  detectConflicts,
  resolveConflict,
  resolveConflictManually,
  getResolvedData,
  batchResolveConflicts,
  needsSync,
  getRecordsToSync,
  incrementSyncVersion,
  type ConflictStrategy,
  type SyncConflict,
  type ConflictDetectionResult,
} from './conflict-resolver';

export {
  SyncEngine,
  createSyncEngine,
  type SyncEngineOptions,
  type SyncEngineResult,
} from './sync-engine';
