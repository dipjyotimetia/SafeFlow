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
