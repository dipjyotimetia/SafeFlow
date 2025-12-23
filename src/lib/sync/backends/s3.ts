// S3-Compatible Sync Backend
// Works with AWS S3, Backblaze B2, Cloudflare R2, MinIO, and other S3-compatible services

import type { EncryptedData } from "../encryption";
import type {
  SyncBackend,
  SyncBackendUser,
  S3Config,
  BackendConfig,
} from "./types";

const DEFAULT_PATH = "safeflow-sync.json";

/**
 * AWS Signature V4 signing implementation for browser use.
 * Based on AWS documentation for S3 REST API authentication.
 */
async function signRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body: string | null,
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  service: string = "s3"
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);

  // Canonical headers
  const signedHeaders = ["host", "x-amz-content-sha256", "x-amz-date"];
  headers["host"] = url.host;
  headers["x-amz-date"] = amzDate;

  // Hash the payload
  const payloadHash = await sha256(body || "");
  headers["x-amz-content-sha256"] = payloadHash;

  // Create canonical request
  const canonicalUri = url.pathname;
  const canonicalQueryString = url.searchParams.toString();
  const canonicalHeaders = signedHeaders
    .map((h) => `${h}:${headers[h]}`)
    .join("\n") + "\n";
  const signedHeadersStr = signedHeaders.join(";");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeadersStr,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256(canonicalRequest);

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");

  // Calculate signature
  const kDate = await hmacSHA256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, service);
  const kSigning = await hmacSHA256(kService, "aws4_request");
  const signature = await hmacSHA256Hex(kSigning, stringToSign);

  // Build authorization header
  headers["Authorization"] = [
    `${algorithm} Credential=${accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeadersStr}`,
    `Signature=${signature}`,
  ].join(", ");

  return headers;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSHA256(
  key: string | ArrayBuffer,
  message: string
): Promise<ArrayBuffer> {
  const keyData =
    typeof key === "string" ? new TextEncoder().encode(key) : key;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

async function hmacSHA256Hex(
  key: ArrayBuffer,
  message: string
): Promise<string> {
  const result = await hmacSHA256(key, message);
  return Array.from(new Uint8Array(result))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class S3Backend implements SyncBackend {
  readonly type = "s3" as const;
  readonly displayName = "S3-Compatible Storage";
  readonly requiresAuth = true;

  private endpoint: string | null = null;
  private bucket: string | null = null;
  private accessKeyId: string | null = null;
  private secretAccessKey: string | null = null;
  private region: string = "auto";
  private path: string = DEFAULT_PATH;
  private authenticated = false;

  async initialize(config: BackendConfig): Promise<void> {
    if (config.type !== "s3") {
      throw new Error("Invalid config type for S3Backend");
    }

    const s3Config = config as S3Config;
    this.endpoint = s3Config.endpoint.replace(/\/$/, "");
    this.bucket = s3Config.bucket;
    this.accessKeyId = s3Config.accessKeyId;
    this.secretAccessKey = s3Config.secretAccessKey;
    this.region = s3Config.region || "auto";
    this.path = s3Config.path || DEFAULT_PATH;
  }

  async authenticate(): Promise<void> {
    if (!this.endpoint || !this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new Error("S3 not initialized. Call initialize() with credentials first.");
    }

    // Test connection with a HEAD request to the bucket
    try {
      const url = new URL(`${this.endpoint}/${this.bucket}`);
      const headers = await signRequest(
        "HEAD",
        url,
        {},
        null,
        this.accessKeyId,
        this.secretAccessKey,
        this.region
      );

      const response = await fetch(url.toString(), {
        method: "HEAD",
        headers,
      });

      if (response.status === 403) {
        throw new Error("Invalid S3 credentials");
      }

      if (response.status === 404) {
        throw new Error("Bucket not found");
      }

      if (!response.ok && response.status !== 200) {
        throw new Error(`S3 connection failed: ${response.status}`);
      }

      this.authenticated = true;
    } catch (error) {
      this.authenticated = false;
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getUser(): SyncBackendUser | null {
    if (!this.authenticated || !this.accessKeyId) {
      return null;
    }

    return {
      name: `${this.accessKeyId.substring(0, 8)}...`,
    };
  }

  async signOut(): Promise<void> {
    this.authenticated = false;
    this.secretAccessKey = null;
  }

  private getObjectUrl(): URL {
    return new URL(`${this.endpoint}/${this.bucket}/${this.path}`);
  }

  async upload(data: EncryptedData): Promise<void> {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    const jsonData = JSON.stringify(data);
    const url = this.getObjectUrl();

    const headers = await signRequest(
      "PUT",
      url,
      { "Content-Type": "application/json" },
      jsonData,
      this.accessKeyId!,
      this.secretAccessKey!,
      this.region
    );

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers,
      body: jsonData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to upload data: ${response.status} - ${text}`);
    }
  }

  async download(): Promise<EncryptedData | null> {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    const url = this.getObjectUrl();

    const headers = await signRequest(
      "GET",
      url,
      {},
      null,
      this.accessKeyId!,
      this.secretAccessKey!,
      this.region
    );

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

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

    const url = this.getObjectUrl();

    const headers = await signRequest(
      "HEAD",
      url,
      {},
      null,
      this.accessKeyId!,
      this.secretAccessKey!,
      this.region
    );

    const response = await fetch(url.toString(), {
      method: "HEAD",
      headers,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get object info: ${response.status}`);
    }

    const lastModified = response.headers.get("Last-Modified");
    return lastModified ? new Date(lastModified) : null;
  }

  async deleteData(): Promise<void> {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    const url = this.getObjectUrl();

    const headers = await signRequest(
      "DELETE",
      url,
      {},
      null,
      this.accessKeyId!,
      this.secretAccessKey!,
      this.region
    );

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers,
    });

    // 204 = deleted, 404 = already gone, both are OK
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete data: ${response.status}`);
    }
  }
}

// Singleton instance
export const s3Backend = new S3Backend();
