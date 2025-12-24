// Local File Sync Backend
// Uses the File System Access API for user-managed local folder storage
// User selects a folder (e.g., Dropbox, iCloud Drive) and app creates sync file there

import type { EncryptedData } from "../encryption";
import type { SyncBackend, SyncBackendUser, BackendConfig } from "./types";

const DEFAULT_FILENAME = "safeflow-sync.encrypted.json";

/**
 * Check if File System Access API is supported (including directory picker)
 */
function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "showDirectoryPicker" in window
  );
}

export class LocalFileBackend implements SyncBackend {
  readonly type = "local-file" as const;
  readonly displayName = "Local Folder";
  readonly requiresAuth = true; // Requires user to pick a folder

  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private fileHandle: FileSystemFileHandle | null = null;
  private directoryName: string | null = null;
  private lastModified: Date | null = null;

  async initialize(_config: BackendConfig): Promise<void> {
    if (!isFileSystemAccessSupported()) {
      throw new Error(
        "File System Access API not supported in this browser. Please use Chrome, Edge, or Opera."
      );
    }
  }

  async authenticate(): Promise<void> {
    try {
      // Let user pick a directory (e.g., their Dropbox or iCloud folder)
      this.directoryHandle = await window.showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
      });

      this.directoryName = this.directoryHandle.name;

      // Get or create the sync file in that directory
      this.fileHandle = await this.directoryHandle.getFileHandle(
        DEFAULT_FILENAME,
        { create: true }
      );

      // Get last modified time if file has content
      const file = await this.fileHandle.getFile();
      if (file.size > 0) {
        this.lastModified = new Date(file.lastModified);
      } else {
        this.lastModified = null;
      }
    } catch (error: unknown) {
      if ((error as Error).name === "AbortError") {
        throw new Error("Folder selection cancelled");
      }
      throw error;
    }
  }

  /**
   * Get the selected directory name for display
   */
  getDirectoryName(): string | null {
    return this.directoryName;
  }

  isAuthenticated(): boolean {
    return this.fileHandle !== null && this.directoryHandle !== null;
  }

  getUser(): SyncBackendUser | null {
    if (!this.directoryHandle) {
      return null;
    }

    return {
      name: `${this.directoryHandle.name}/${DEFAULT_FILENAME}`,
    };
  }

  async signOut(): Promise<void> {
    this.directoryHandle = null;
    this.fileHandle = null;
    this.directoryName = null;
    this.lastModified = null;
  }

  async upload(data: EncryptedData): Promise<void> {
    if (!this.fileHandle || !this.directoryHandle) {
      throw new Error("No folder selected. Call authenticate() first.");
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
    if (!this.fileHandle || !this.directoryHandle) {
      throw new Error("No folder selected. Call authenticate() first.");
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
    if (!this.fileHandle || !this.directoryHandle) {
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
    if (!this.fileHandle || !this.directoryHandle) {
      throw new Error("No folder selected");
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
    showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
  }

  interface DirectoryPickerOptions {
    id?: string;
    mode?: "read" | "readwrite";
    startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
  }

  interface FileSystemDirectoryHandle {
    readonly kind: "directory";
    readonly name: string;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
    queryPermission(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
    requestPermission(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  }

  interface FileSystemHandle {
    readonly kind: "file" | "directory";
    readonly name: string;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: "file";
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
