# Cloud Sync System

Encrypted cloud sync with pluggable storage backends.

## Architecture

```
Local Data (IndexedDB)
        ↓
   Sync Service (exportData/importData)
        ↓
   Encryption (AES-256-GCM)
        ↓
   Sync Backend (upload/download)
        ↓
   Cloud Storage (Google Drive, WebDAV, S3, Local File)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/sync/sync-service.ts` | Orchestrates export, import, sync |
| `src/lib/sync/encryption.ts` | AES-256-GCM encryption/decryption |
| `src/lib/sync/backends/types.ts` | Backend interface definition |
| `src/lib/sync/backends/google-drive.ts` | Google Drive backend |
| `src/lib/sync/backends/webdav.ts` | WebDAV backend (Nextcloud, etc.) |
| `src/lib/sync/backends/s3.ts` | S3-compatible backend (AWS, Backblaze, R2) |
| `src/lib/sync/backends/local-file.ts` | Local file backend |
| `src/stores/sync.store.ts` | Sync state management |

## Available Backends

| Backend | Authentication | Use Case |
|---------|---------------|----------|
| Google Drive | OAuth 2.0 | Personal cloud sync |
| WebDAV | Username/Password | Self-hosted (Nextcloud, ownCloud) |
| S3 | Access Key/Secret | Cloud object storage (AWS, B2, R2) |
| Local File | File picker | Manual backup/restore |

## Backend Interface

All backends implement the `SyncBackend` interface:

```typescript
interface SyncBackend {
  readonly type: SyncBackendType;
  readonly displayName: string;
  readonly requiresAuth: boolean;

  // Authentication
  initialize(config: BackendConfig): Promise<void>;
  authenticate(): Promise<void>;
  isAuthenticated(): boolean;
  getUser(): SyncBackendUser | null;
  signOut(): Promise<void>;

  // Core Operations
  upload(data: EncryptedData): Promise<void>;
  download(): Promise<EncryptedData | null>;
  getLastModified(): Promise<Date | null>;
  deleteData(): Promise<void>;

  // Optional
  supportsVersionHistory?: boolean;
  listVersions?(): Promise<SyncVersion[]>;
  downloadVersion?(versionId: string): Promise<EncryptedData>;
}
```

## Backend Configurations

### Google Drive

```typescript
const config: GoogleDriveConfig = {
  type: 'google-drive',
  clientId: 'your-google-client-id',
};
```

Uses `appDataFolder` - hidden from user, app-exclusive access.

### WebDAV

```typescript
const config: WebDAVConfig = {
  type: 'webdav',
  serverUrl: 'https://nextcloud.example.com',
  username: 'user',
  password: 'password',
  path: '/safeflow/sync.json',  // optional
};
```

Compatible with Nextcloud, ownCloud, Synology, and other WebDAV servers.

### S3-Compatible

```typescript
const config: S3Config = {
  type: 's3',
  endpoint: 'https://s3.amazonaws.com',  // or B2, R2, MinIO
  bucket: 'my-bucket',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',  // optional
  path: 'safeflow-sync.json',  // optional
};
```

Uses AWS Signature V4 for authentication.

### Local File

```typescript
const config: LocalFileConfig = {
  type: 'local-file',
  // No additional config - uses File System Access API
};
```

User selects file via native file picker. Chrome/Edge/Opera only.

## Encryption

All data is encrypted locally before upload using **AES-256-GCM**:

```typescript
// Key derivation: PBKDF2 with SHA-256, 100,000 iterations
// IV: 12 bytes random per encryption
// Salt: 16 bytes random per encryption

interface EncryptedData {
  ciphertext: string;  // base64
  iv: string;          // base64
  salt: string;        // base64
  version: number;
}
```

### Encryption Functions

```typescript
import { encrypt, decrypt, hashPassword, verifyPassword } from '@/lib/sync/encryption';

// Encrypt data
const encrypted = await encrypt(JSON.stringify(data), password);

// Decrypt data
const decrypted = await decrypt(encrypted, password);
const data = JSON.parse(decrypted);

// Store password hash for verification
const { hash, salt } = await hashPassword(password);

// Verify password
const isValid = await verifyPassword(password, storedHash, salt);
```

## Sync Service Usage

### Setup and Configuration

```typescript
import { syncService } from '@/lib/sync/sync-service';

// Set encryption password
await syncService.setupEncryption('user-password');

// Verify password
const isValid = await syncService.verifyEncryptionPassword('user-password');

// Configure backend
await syncService.setBackend({
  type: 'google-drive',
  clientId: 'your-client-id',
});

// Authenticate
await syncService.authenticate();
```

### Sync Operations

```typescript
// Smart sync (checks timestamps, syncs in correct direction)
const result = await syncService.syncWithBackend();
// Returns: { direction: 'upload' | 'download' | 'none', success: boolean }

// Force upload local data to cloud
await syncService.forceUpload();

// Force download cloud data to local
await syncService.forceDownload();

// Export local backup (unencrypted, for download)
const backupJson = await syncService.exportLocalBackup();

// Import local backup
await syncService.importLocalBackup(backupJson);
```

### Data Export/Import

```typescript
// Export all local data
const exportedData = await syncService.exportData();
// Returns object with all 17 tables: accounts, transactions, holdings, etc.

// Import data (replaces local)
await syncService.importData(exportedData);
```

## Sync Store

```typescript
import { useSyncStore } from '@/stores/sync.store';

function SyncSettings() {
  const {
    isAuthenticated,
    isSyncing,
    lastSyncTime,
    backendType,
    error,
    sync,
    signOut,
  } = useSyncStore();

  return (
    <div>
      <p>Last sync: {lastSyncTime?.toLocaleString()}</p>
      <p>Backend: {backendType}</p>
      <button onClick={sync} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  );
}
```

## Security Considerations

### What's Protected
- All data encrypted with user password before upload
- Password never leaves device
- Salt and IV unique per encryption
- 100,000 PBKDF2 iterations for key derivation

### Credentials Storage
- Google Drive: OAuth tokens in memory (session only)
- WebDAV: Credentials in memory (cleared on signOut)
- S3: Access keys in memory (cleared on signOut)
- Sync metadata: Stored in IndexedDB (password hash, not password)

### Best Practices
- Use strong encryption password (minimum 12 characters)
- Don't reuse sync password for other services
- Clear session after use on shared devices
- Use OAuth (Google Drive) when possible for better security

## Adding a New Backend

### Step 1: Define Config Type

```typescript
// src/lib/sync/backends/types.ts
export interface MyCloudConfig extends SyncBackendConfig {
  type: 'my-cloud';
  apiKey: string;
  endpoint: string;
}

export type BackendConfig =
  | GoogleDriveConfig
  | ...
  | MyCloudConfig;
```

### Step 2: Implement Backend

```typescript
// src/lib/sync/backends/my-cloud.ts
import type { SyncBackend, EncryptedData, MyCloudConfig } from './types';

export class MyCloudBackend implements SyncBackend {
  readonly type = 'my-cloud' as const;
  readonly displayName = 'My Cloud';
  readonly requiresAuth = true;

  private config: MyCloudConfig | null = null;
  private authenticated = false;

  async initialize(config: MyCloudConfig): Promise<void> {
    this.config = config;
  }

  async authenticate(): Promise<void> {
    // Implement authentication logic
    this.authenticated = true;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getUser(): SyncBackendUser | null {
    return null;
  }

  async signOut(): Promise<void> {
    this.authenticated = false;
    this.config = null;
  }

  async upload(data: EncryptedData): Promise<void> {
    if (!this.config) throw new Error('Not initialized');
    // Implement upload
  }

  async download(): Promise<EncryptedData | null> {
    if (!this.config) throw new Error('Not initialized');
    // Implement download
    return null;
  }

  async getLastModified(): Promise<Date | null> {
    // Implement last modified check
    return null;
  }

  async deleteData(): Promise<void> {
    // Implement delete
  }
}

export const myCloudBackend = new MyCloudBackend();
```

### Step 3: Register Backend

```typescript
// src/lib/sync/backends/index.ts
import { myCloudBackend } from './my-cloud';

export function createBackend(type: SyncBackendType): SyncBackend {
  switch (type) {
    case 'google-drive': return googleDriveBackend;
    case 'webdav': return webDAVBackend;
    case 's3': return s3Backend;
    case 'local-file': return localFileBackend;
    case 'my-cloud': return myCloudBackend;  // Add here
    default: throw new Error(`Unknown backend: ${type}`);
  }
}
```

## Error Handling

```typescript
try {
  await syncService.syncWithBackend();
} catch (error) {
  if (error.message.includes('401') || error.message.includes('403')) {
    // Authentication failed - need to re-authenticate
    await syncService.authenticate();
  } else if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
    // Network error - retry later
    toast.error('Network error. Please try again.');
  } else if (error.message.includes('decrypt')) {
    // Wrong password
    toast.error('Incorrect encryption password.');
  }
}
```
