// Sync Backend Types
// Abstract interface for pluggable sync storage providers

import type { EncryptedData } from "../encryption";

export type SyncBackendType = "google-drive" | "webdav" | "s3" | "local-file";

export interface SyncVersion {
  id: string;
  timestamp: Date;
  size?: number;
}

export interface SyncBackendConfig {
  type: SyncBackendType;
}

export interface GoogleDriveConfig extends SyncBackendConfig {
  type: "google-drive";
  clientId: string;
}

export interface WebDAVConfig extends SyncBackendConfig {
  type: "webdav";
  serverUrl: string;
  username: string;
  password: string;
  path?: string; // Default: /safeflow/sync.json
}

export interface S3Config extends SyncBackendConfig {
  type: "s3";
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  path?: string; // Default: safeflow-sync.json
}

export interface LocalFileConfig extends SyncBackendConfig {
  type: "local-file";
  // No additional config needed - user picks file via File System API
}

export type BackendConfig =
  | GoogleDriveConfig
  | WebDAVConfig
  | S3Config
  | LocalFileConfig;

export interface SyncBackendUser {
  email?: string;
  name?: string;
}

/**
 * Abstract interface for all sync storage backends.
 * Each backend must implement these methods to be compatible with the sync system.
 */
export interface SyncBackend {
  /** Backend type identifier */
  readonly type: SyncBackendType;

  /** Human-readable name for UI display */
  readonly displayName: string;

  /** Whether this backend requires authentication */
  readonly requiresAuth: boolean;

  // ============ Authentication ============

  /**
   * Initialize the backend with configuration.
   * Called before any other operations.
   */
  initialize(config: BackendConfig): Promise<void>;

  /**
   * Trigger authentication flow (e.g., OAuth popup, login form).
   * Resolves when user is authenticated.
   */
  authenticate(): Promise<void>;

  /**
   * Check if the backend is currently authenticated and ready.
   */
  isAuthenticated(): boolean;

  /**
   * Get current authenticated user info (if applicable).
   */
  getUser(): SyncBackendUser | null;

  /**
   * Sign out and clear stored credentials.
   */
  signOut(): Promise<void>;

  // ============ Core Operations ============

  /**
   * Upload encrypted data to the backend.
   * @param data - Encrypted data to upload
   */
  upload(data: EncryptedData): Promise<void>;

  /**
   * Download encrypted data from the backend.
   * @returns Encrypted data, or null if no data exists
   */
  download(): Promise<EncryptedData | null>;

  /**
   * Get the last modified timestamp of stored data.
   * @returns Date of last modification, or null if no data exists
   */
  getLastModified(): Promise<Date | null>;

  /**
   * Delete stored data from the backend.
   */
  deleteData(): Promise<void>;

  // ============ Optional Capabilities ============

  /**
   * Whether this backend supports version history.
   */
  supportsVersionHistory?: boolean;

  /**
   * List available versions (if supported).
   */
  listVersions?(): Promise<SyncVersion[]>;

  /**
   * Download a specific version (if supported).
   * @param versionId - Version identifier
   */
  downloadVersion?(versionId: string): Promise<EncryptedData>;
}
