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
  type SyncData,
  type SyncResult,
} from './sync-service';
