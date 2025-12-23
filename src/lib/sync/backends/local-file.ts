// Local File Sync Backend
// Uses the File System Access API for user-managed local file storage
// User can sync this file with their preferred tool (Dropbox, iCloud, Syncthing, etc.)

import type { EncryptedData } from "../encryption";
import type { SyncBackend, SyncBackendUser, BackendConfig } from "./types";

const DEFAULT_FILENAME = "safeflow-sync.encrypted.json";

/**
 * Check if File System Access API is supported
 */
function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "showSaveFilePicker" in window &&
    "showOpenFilePicker" in window
  );
}

export class LocalFileBackend implements SyncBackend {
  readonly type = "local-file" as const;
  readonly displayName = "Local File";
  readonly requiresAuth = true; // Requires user to pick a file

  private fileHandle: FileSystemFileHandle | null = null;
  private lastModified: Date | null = null;

  async initialize(_config: BackendConfig): Promise<void> {
    if (!isFileSystemAccessSupported()) {
      throw new Error(
        "File System Access API not supported in this browser. Please use Chrome, Edge, or Opera."
      );
    }
  }

  async authenticate(): Promise<void> {
    // Prompt user to select or create a file
    try {
      // Try to open existing file first
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "SafeFlow Sync File",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
        multiple: false,
      });

      this.fileHandle = handle;

      // Get last modified time
      const file = await handle.getFile();
      this.lastModified = new Date(file.lastModified);
    } catch (error: unknown) {
      // User cancelled or file doesn't exist, try to create new
      if ((error as Error).name === "AbortError") {
        // User cancelled - offer to create new file
        try {
          this.fileHandle = await window.showSaveFilePicker({
            suggestedName: DEFAULT_FILENAME,
            types: [
              {
                description: "SafeFlow Sync File",
                accept: {
                  "application/json": [".json"],
                },
              },
            ],
          });
          this.lastModified = null;
        } catch (saveError: unknown) {
          if ((saveError as Error).name === "AbortError") {
            throw new Error("File selection cancelled");
          }
          throw saveError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Alternative: directly create a new sync file
   */
  async createNewFile(): Promise<void> {
    if (!isFileSystemAccessSupported()) {
      throw new Error("File System Access API not supported");
    }

    this.fileHandle = await window.showSaveFilePicker({
      suggestedName: DEFAULT_FILENAME,
      types: [
        {
          description: "SafeFlow Sync File",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    });
    this.lastModified = null;
  }

  /**
   * Alternative: open an existing sync file
   */
  async openExistingFile(): Promise<void> {
    if (!isFileSystemAccessSupported()) {
      throw new Error("File System Access API not supported");
    }

    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: "SafeFlow Sync File",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
      multiple: false,
    });

    this.fileHandle = handle;
    const file = await handle.getFile();
    this.lastModified = new Date(file.lastModified);
  }

  isAuthenticated(): boolean {
    return this.fileHandle !== null;
  }

  getUser(): SyncBackendUser | null {
    if (!this.fileHandle) {
      return null;
    }

    return {
      name: this.fileHandle.name,
    };
  }

  async signOut(): Promise<void> {
    this.fileHandle = null;
    this.lastModified = null;
  }

  async upload(data: EncryptedData): Promise<void> {
    if (!this.fileHandle) {
      throw new Error("No file selected. Call authenticate() first.");
    }

    const jsonData = JSON.stringify(data, null, 2);

    // Request write permission if needed
    const permission = await this.fileHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      const newPermission = await this.fileHandle.requestPermission({
        mode: "readwrite",
      });
      if (newPermission !== "granted") {
        throw new Error("Write permission denied");
      }
    }

    const writable = await this.fileHandle.createWritable();
    await writable.write(jsonData);
    await writable.close();

    this.lastModified = new Date();
  }

  async download(): Promise<EncryptedData | null> {
    if (!this.fileHandle) {
      throw new Error("No file selected. Call authenticate() first.");
    }

    try {
      const file = await this.fileHandle.getFile();

      if (file.size === 0) {
        return null;
      }

      const text = await file.text();
      this.lastModified = new Date(file.lastModified);

      return JSON.parse(text) as EncryptedData;
    } catch (error: unknown) {
      // File might be empty or invalid JSON
      if (
        error instanceof SyntaxError ||
        (error as Error).message.includes("JSON")
      ) {
        return null;
      }
      throw error;
    }
  }

  async getLastModified(): Promise<Date | null> {
    if (!this.fileHandle) {
      return null;
    }

    try {
      const file = await this.fileHandle.getFile();
      this.lastModified = new Date(file.lastModified);
      return this.lastModified;
    } catch {
      return this.lastModified;
    }
  }

  async deleteData(): Promise<void> {
    if (!this.fileHandle) {
      throw new Error("No file selected");
    }

    // Write empty object to file (can't actually delete with FSAA)
    const writable = await this.fileHandle.createWritable();
    await writable.write("{}");
    await writable.close();
  }

  /**
   * Get the file name for display
   */
  getFileName(): string | null {
    return this.fileHandle?.name || null;
  }
}

// Singleton instance
export const localFileBackend = new LocalFileBackend();

// Add type declarations for File System Access API
declare global {
  interface Window {
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
    showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  }

  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
  }

  interface OpenFilePickerOptions {
    multiple?: boolean;
    types?: FilePickerAcceptType[];
  }

  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }

  interface FileSystemFileHandle {
    name: string;
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
    queryPermission(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
    requestPermission(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: string | Blob | BufferSource): Promise<void>;
    close(): Promise<void>;
  }
}
