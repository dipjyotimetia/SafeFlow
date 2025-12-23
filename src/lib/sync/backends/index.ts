// Sync Backend Registry
// Central hub for managing and accessing sync storage backends

export * from "./types";
export { GoogleDriveBackend, googleDriveBackend } from "./google-drive";
export { WebDAVBackend, webdavBackend } from "./webdav";
export { S3Backend, s3Backend } from "./s3";
export { LocalFileBackend, localFileBackend } from "./local-file";

import type { SyncBackend, SyncBackendType, BackendConfig } from "./types";
import { GoogleDriveBackend } from "./google-drive";
import { WebDAVBackend } from "./webdav";
import { S3Backend } from "./s3";
import { LocalFileBackend } from "./local-file";

/**
 * Backend registry for creating and managing sync backends
 */
class BackendRegistry {
  private backends = new Map<SyncBackendType, () => SyncBackend>();
  private activeBackend: SyncBackend | null = null;

  constructor() {
    // Register all available backends
    this.register("google-drive", () => new GoogleDriveBackend());
    this.register("webdav", () => new WebDAVBackend());
    this.register("s3", () => new S3Backend());
    this.register("local-file", () => new LocalFileBackend());
  }

  /**
   * Register a new backend type
   */
  register(type: SyncBackendType, factory: () => SyncBackend): void {
    this.backends.set(type, factory);
  }

  /**
   * Get list of available backend types
   */
  getAvailableBackends(): Array<{
    type: SyncBackendType;
    displayName: string;
    requiresAuth: boolean;
  }> {
    return [
      {
        type: "google-drive",
        displayName: "Google Drive",
        requiresAuth: true,
      },
      {
        type: "webdav",
        displayName: "WebDAV (Nextcloud, Synology, etc.)",
        requiresAuth: true,
      },
      {
        type: "s3",
        displayName: "S3-Compatible (Backblaze, R2, MinIO)",
        requiresAuth: true,
      },
      {
        type: "local-file",
        displayName: "Local File",
        requiresAuth: true, // User must pick file
      },
    ];
  }

  /**
   * Create a new backend instance
   */
  create(type: SyncBackendType): SyncBackend {
    const factory = this.backends.get(type);
    if (!factory) {
      throw new Error(`Unknown backend type: ${type}`);
    }
    return factory();
  }

  /**
   * Create and initialize a backend with configuration
   */
  async createAndInitialize(config: BackendConfig): Promise<SyncBackend> {
    const backend = this.create(config.type);
    await backend.initialize(config);
    return backend;
  }

  /**
   * Set the active backend
   */
  setActive(backend: SyncBackend): void {
    this.activeBackend = backend;
  }

  /**
   * Get the currently active backend
   */
  getActive(): SyncBackend | null {
    return this.activeBackend;
  }

  /**
   * Clear the active backend
   */
  clearActive(): void {
    this.activeBackend = null;
  }
}

// Singleton registry instance
export const backendRegistry = new BackendRegistry();

/**
 * Helper function to create a backend from saved configuration
 */
export async function createBackendFromConfig(
  config: BackendConfig
): Promise<SyncBackend> {
  return backendRegistry.createAndInitialize(config);
}

/**
 * Helper to check if a backend type requires additional configuration
 */
export function getRequiredConfigFields(
  type: SyncBackendType
): Array<{
  name: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
}> {
  switch (type) {
    case "google-drive":
      return [
        {
          name: "clientId",
          label: "Google Client ID",
          type: "text",
          required: true,
          placeholder: "xxx.apps.googleusercontent.com",
        },
      ];

    case "webdav":
      return [
        {
          name: "serverUrl",
          label: "Server URL",
          type: "url",
          required: true,
          placeholder: "https://nextcloud.example.com/remote.php/webdav",
        },
        {
          name: "username",
          label: "Username",
          type: "text",
          required: true,
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
        },
        {
          name: "path",
          label: "File Path",
          type: "text",
          required: false,
          placeholder: "/safeflow/sync.json",
        },
      ];

    case "s3":
      return [
        {
          name: "endpoint",
          label: "S3 Endpoint",
          type: "url",
          required: true,
          placeholder: "https://s3.us-west-000.backblazeb2.com",
        },
        {
          name: "bucket",
          label: "Bucket Name",
          type: "text",
          required: true,
        },
        {
          name: "accessKeyId",
          label: "Access Key ID",
          type: "text",
          required: true,
        },
        {
          name: "secretAccessKey",
          label: "Secret Access Key",
          type: "password",
          required: true,
        },
        {
          name: "region",
          label: "Region",
          type: "text",
          required: false,
          placeholder: "auto",
        },
        {
          name: "path",
          label: "Object Key",
          type: "text",
          required: false,
          placeholder: "safeflow-sync.json",
        },
      ];

    case "local-file":
      // No config needed - user picks file via File System API
      return [];

    default:
      return [];
  }
}
