// Google Drive Sync Backend
// Uses appDataFolder for privacy - hidden from user, app-exclusive access

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { EncryptedData } from "../encryption";
import type {
  SyncBackend,
  SyncBackendUser,
  GoogleDriveConfig,
  BackendConfig,
} from "./types";

const GOOGLE_API_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const APP_DATA_FOLDER = "appDataFolder";
const DATA_FILE_NAME = "safeflow-data.json";

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

// Type for Google Identity Services (loaded dynamically)
declare const google: {
  accounts: {
    oauth2: {
      initTokenClient: (config: any) => any;
      revoke: (token: string, callback: () => void) => void;
    };
  };
};

export class GoogleDriveBackend implements SyncBackend {
  readonly type = "google-drive" as const;
  readonly displayName = "Google Drive";
  readonly requiresAuth = true;

  private clientId: string | null = null;
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private user: SyncBackendUser | null = null;

  async initialize(config: BackendConfig): Promise<void> {
    if (config.type !== "google-drive") {
      throw new Error("Invalid config type for GoogleDriveBackend");
    }

    const googleConfig = config as GoogleDriveConfig;
    this.clientId = googleConfig.clientId;

    await this.loadGoogleIdentityServices();
  }

  private async loadGoogleIdentityServices(): Promise<void> {
    // Check if already loaded
    if (typeof google !== "undefined" && google.accounts?.oauth2) {
      this.initTokenClient();
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.onload = () => {
        try {
          this.initTokenClient();
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      script.onerror = () =>
        reject(new Error("Failed to load Google Identity Services"));
      document.head.appendChild(script);
    });
  }

  private initTokenClient(): void {
    if (!this.clientId) {
      throw new Error("Client ID not set");
    }

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: GOOGLE_API_SCOPE,
      callback: () => {}, // Set dynamically in authenticate
    });
  }

  async authenticate(): Promise<void> {
    if (!this.tokenClient) {
      throw new Error(
        "Google Auth not initialized. Call initialize() first."
      );
    }

    return new Promise((resolve, reject) => {
      this.tokenClient!.callback = async (response: {
        error?: string;
        error_description?: string;
        access_token: string;
        expires_in: number;
      }) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        this.accessToken = response.access_token;
        this.tokenExpiresAt = new Date(Date.now() + response.expires_in * 1000);

        // Get user info
        try {
          await this.fetchUserInfo();
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      // Check if token is still valid
      if (
        this.accessToken &&
        this.tokenExpiresAt &&
        this.tokenExpiresAt > new Date()
      ) {
        this.fetchUserInfo().then(() => resolve());
      } else {
        // Need new token
        this.tokenClient!.requestAccessToken({ prompt: "consent" });
      }
    });
  }

  private async fetchUserInfo(): Promise<void> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get user info");
    }

    const data = await response.json();
    this.user = {
      email: data.email,
      name: data.name,
    };
  }

  isAuthenticated(): boolean {
    return (
      !!this.accessToken &&
      !!this.tokenExpiresAt &&
      this.tokenExpiresAt > new Date()
    );
  }

  getUser(): SyncBackendUser | null {
    return this.user;
  }

  async signOut(): Promise<void> {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken, () => {});
      this.accessToken = null;
      this.tokenExpiresAt = null;
      this.user = null;
    }
  }

  private async driveRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3${endpoint}`,
      {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `Drive API error: ${response.status}`
      );
    }

    return response.json();
  }

  private async findDataFile(): Promise<DriveFile | null> {
    const result = await this.driveRequest<{ files: DriveFile[] }>(
      `/files?spaces=${APP_DATA_FOLDER}&q=name='${DATA_FILE_NAME}'&fields=files(id,name,modifiedTime,size)`
    );

    return result.files?.[0] || null;
  }

  async upload(data: EncryptedData): Promise<void> {
    const jsonData = JSON.stringify(data);
    const existingFile = await this.findDataFile();

    const metadata = {
      name: DATA_FILE_NAME,
      mimeType: "application/json",
      ...(existingFile ? {} : { parents: [APP_DATA_FOLDER] }),
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", new Blob([jsonData], { type: "application/json" }));

    const endpoint = existingFile
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

    const method = existingFile ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: form,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || "Failed to upload data");
    }
  }

  async download(): Promise<EncryptedData | null> {
    const file = await this.findDataFile();

    if (!file) {
      return null;
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download data");
    }

    const text = await response.text();
    return JSON.parse(text) as EncryptedData;
  }

  async getLastModified(): Promise<Date | null> {
    const file = await this.findDataFile();
    return file ? new Date(file.modifiedTime) : null;
  }

  async deleteData(): Promise<void> {
    const file = await this.findDataFile();

    if (file) {
      await this.driveRequest(`/files/${file.id}`, { method: "DELETE" });
    }
  }
}

// Singleton instance for backward compatibility
export const googleDriveBackend = new GoogleDriveBackend();
