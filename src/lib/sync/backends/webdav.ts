// WebDAV Sync Backend
// Compatible with Nextcloud, ownCloud, Synology NAS, and other WebDAV servers

import type { EncryptedData } from "../encryption";
import type {
  SyncBackend,
  SyncBackendUser,
  WebDAVConfig,
  BackendConfig,
} from "./types";

const DEFAULT_PATH = "/safeflow/sync.json";
const NETWORK_TIMEOUT_MS = 30000; // 30 seconds

export class WebDAVBackend implements SyncBackend {
  readonly type = "webdav" as const;
  readonly displayName = "WebDAV";
  readonly requiresAuth = true;

  private serverUrl: string | null = null;
  private username: string | null = null;
  private password: string | null = null;
  private path: string = DEFAULT_PATH;
  private authenticated = false;

  async initialize(config: BackendConfig): Promise<void> {
    if (config.type !== "webdav") {
      throw new Error("Invalid config type for WebDAVBackend");
    }

    const webdavConfig = config as WebDAVConfig;
    this.serverUrl = webdavConfig.serverUrl.replace(/\/$/, ""); // Remove trailing slash
    this.username = webdavConfig.username;
    this.password = webdavConfig.password;
    this.path = webdavConfig.path || DEFAULT_PATH;
  }

  async authenticate(): Promise<void> {
    if (!this.serverUrl || !this.username || !this.password) {
      throw new Error(
        "WebDAV not initialized. Call initialize() with credentials first."
      );
    }

    // Test connection with PROPFIND request
    try {
      const response = await this.request("PROPFIND", "/", {
        headers: {
          Depth: "0",
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid WebDAV credentials");
      }

      if (!response.ok && response.status !== 404) {
        throw new Error(`WebDAV connection failed: ${response.status}`);
      }

      this.authenticated = true;

      // Ensure the parent directory exists
      await this.ensureDirectory();
    } catch (error) {
      this.authenticated = false;
      throw error;
    }
  }

  private async ensureDirectory(): Promise<void> {
    const dir = this.path.substring(0, this.path.lastIndexOf("/"));
    if (!dir) return;

    const response = await this.request("MKCOL", dir);

    // 201 = created, 405 = already exists, both are OK
    if (!response.ok && response.status !== 405) {
      // If parent doesn't exist, try to create recursively
      if (response.status === 409) {
        const parts = dir.split("/").filter(Boolean);
        let currentPath = "";

        for (const part of parts) {
          currentPath += "/" + part;
          const mkcolResponse = await this.request("MKCOL", currentPath);
          if (!mkcolResponse.ok && mkcolResponse.status !== 405) {
            console.warn(
              `Could not create directory: ${currentPath}`
            );
          }
        }
      }
    }
  }

  private async request(
    method: string,
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.serverUrl}${path}`;
    const authHeader = `Basic ${btoa(`${this.username}:${this.password}`)}`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        ...options,
        headers: {
          ...options.headers,
          Authorization: authHeader,
        },
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Network timeout after ${NETWORK_TIMEOUT_MS / 1000}s`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getUser(): SyncBackendUser | null {
    if (!this.authenticated || !this.username) {
      return null;
    }

    return {
      email: this.username,
      name: this.username,
    };
  }

  async signOut(): Promise<void> {
    this.authenticated = false;
    // Clear credentials from memory
    this.password = null;
  }

  async upload(data: EncryptedData): Promise<void> {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    const jsonData = JSON.stringify(data);

    const response = await this.request("PUT", this.path, {
      headers: {
        "Content-Type": "application/json",
      },
      body: jsonData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload data: ${response.status}`);
    }
  }

  async download(): Promise<EncryptedData | null> {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    const response = await this.request("GET", this.path);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to download data: ${response.status}`);
    }

    const text = await response.text();
    return JSON.parse(text) as EncryptedData;
  }

  async getLastModified(): Promise<Date | null> {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    const response = await this.request("PROPFIND", this.path, {
      headers: {
        Depth: "0",
        "Content-Type": "application/xml",
      },
      body: `<?xml version="1.0" encoding="utf-8" ?>
        <D:propfind xmlns:D="DAV:">
          <D:prop>
            <D:getlastmodified/>
          </D:prop>
        </D:propfind>`,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get file info: ${response.status}`);
    }

    const xml = await response.text();

    // Parse the last modified date from XML response
    const match = xml.match(/<D:getlastmodified>([^<]+)<\/D:getlastmodified>/i);
    if (match) {
      return new Date(match[1]);
    }

    return null;
  }

  async deleteData(): Promise<void> {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    const response = await this.request("DELETE", this.path);

    // 204 = deleted, 404 = already gone, both are OK
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete data: ${response.status}`);
    }
  }
}

// Singleton instance
export const webdavBackend = new WebDAVBackend();
