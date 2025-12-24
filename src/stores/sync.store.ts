import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncStatus } from '@/types';
import { logError } from '@/lib/errors';
import {
  isEncryptionSetUp,
  exportLocalBackup,
  importLocalBackup,
  saveBackendConfig,
  loadBackendConfig,
  clearBackendConfig,
  syncWithBackend,
  forceUploadToBackend,
  forceDownloadFromBackend,
  backendRegistry,
  type SyncBackendType,
  type BackendConfig,
} from '@/lib/sync';

// Password auto-clear timeout (30 minutes of inactivity)
const PASSWORD_TIMEOUT_MS = 30 * 60 * 1000;

// Track the password timeout globally
let passwordTimeoutRef: ReturnType<typeof setTimeout> | null = null;

/**
 * Clear password timeout and reset timer
 */
function resetPasswordTimeout(clearFn: () => void) {
  // Clear existing timeout
  if (passwordTimeoutRef) {
    clearTimeout(passwordTimeoutRef);
    passwordTimeoutRef = null;
  }

  // Set new timeout
  passwordTimeoutRef = setTimeout(() => {
    clearFn();
    passwordTimeoutRef = null;
  }, PASSWORD_TIMEOUT_MS);
}

/**
 * Clear the password timeout
 */
function cancelPasswordTimeout() {
  if (passwordTimeoutRef) {
    clearTimeout(passwordTimeoutRef);
    passwordTimeoutRef = null;
  }
}

interface ConnectionUser {
  email?: string;
  name?: string;
}

interface SyncStore {
  // Connection state (backend-agnostic)
  activeBackendType: SyncBackendType | null;
  isConnected: boolean;
  connectionUser: ConnectionUser | null;

  // Sync state
  status: SyncStatus;
  lastSyncAt: Date | null;
  error: string | null;
  isAutoSyncEnabled: boolean;

  // Encryption
  encryptionPasswordSet: boolean;
  encryptionPassword: string | null; // Only stored in memory

  // Initialization
  initializeFromStorage: () => Promise<void>;

  // Connection actions
  connectProvider: (type: SyncBackendType, config: BackendConfig) => Promise<void>;
  disconnectProvider: () => Promise<void>;

  // Sync actions
  setStatus: (status: SyncStatus) => void;
  setError: (error: string | null) => void;
  toggleAutoSync: () => void;
  setEncryptionPassword: (password: string) => void;
  clearEncryptionPassword: () => void;

  // Sync operations
  sync: () => Promise<void>;
  uploadToCloud: () => Promise<void>;
  downloadFromCloud: () => Promise<void>;

  // Local backup operations
  exportBackup: () => Promise<string>;
  importBackup: (json: string) => Promise<void>;
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      // Initial state
      activeBackendType: null,
      isConnected: false,
      connectionUser: null,

      status: 'idle',
      lastSyncAt: null,
      error: null,
      isAutoSyncEnabled: true,

      encryptionPasswordSet: false,
      encryptionPassword: null,

      // Initialize from stored configuration
      initializeFromStorage: async () => {
        // Reset transient state on reload to prevent stuck states
        set({
          status: 'idle',
          error: null,
        });

        try {
          // Check if encryption is set up
          const encryptionSet = await isEncryptionSetUp();
          set({ encryptionPasswordSet: encryptionSet });

          // Load saved backend config
          const savedConfig = await loadBackendConfig();
          if (!savedConfig) {
            return;
          }

          const { type, config } = savedConfig;

          // Create and initialize backend
          const backend = await backendRegistry.createAndInitialize(config);

          // Check if backend is still authenticated
          if (backend.isAuthenticated()) {
            backendRegistry.setActive(backend);
            const user = backend.getUser();
            set({
              activeBackendType: type,
              isConnected: true,
              connectionUser: user ? { email: user.email, name: user.name } : null,
              error: null,
            });
          } else {
            // Backend exists but session expired - user needs to re-authenticate
            set({
              activeBackendType: type,
              isConnected: false,
              connectionUser: null,
              error: 'Session expired. Please reconnect to continue syncing.',
            });
          }
        } catch (error) {
          logError('SyncStore.initializeFromStorage', error);
          set({ error: 'Failed to restore sync connection' });
        }
      },

      // Connect to a provider
      connectProvider: async (type, config) => {
        const { setStatus, setError } = get();
        setStatus('syncing');
        setError(null);

        try {
          // Create and initialize backend
          const backend = await backendRegistry.createAndInitialize(config);

          // Authenticate with the backend
          await backend.authenticate();

          // Set as active backend
          backendRegistry.setActive(backend);

          // Save configuration for reconnection
          await saveBackendConfig(type, config);

          // Get user info
          const user = backend.getUser();

          set({
            activeBackendType: type,
            isConnected: true,
            connectionUser: user ? { email: user.email, name: user.name } : null,
            status: 'idle',
            error: null, // Clear any previous errors
          });
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Connection failed');
          set({ status: 'error' });
          throw error;
        }
      },

      // Disconnect from current provider
      disconnectProvider: async () => {
        try {
          const backend = backendRegistry.getActive();
          if (backend) {
            await backend.signOut();
          }
        } catch (error) {
          logError('SyncStore.disconnectProvider', error);
        }

        // Clear stored config
        await clearBackendConfig();

        // Clear registry
        backendRegistry.clearActive();

        set({
          activeBackendType: null,
          isConnected: false,
          connectionUser: null,
          status: 'idle',
          error: null,
          encryptionPassword: null,
        });
      },

      // Sync actions
      setStatus: (status) => set({ status }),
      setError: (error) => set({ error }),
      toggleAutoSync: () =>
        set((state) => ({ isAutoSyncEnabled: !state.isAutoSyncEnabled })),

      setEncryptionPassword: (password) => {
        set({
          encryptionPassword: password,
          encryptionPasswordSet: true,
        });
        // Start auto-clear timeout
        resetPasswordTimeout(() => {
          set({ encryptionPassword: null });
        });
      },

      clearEncryptionPassword: () => {
        cancelPasswordTimeout();
        set({ encryptionPassword: null });
      },

      // Sync operations
      sync: async () => {
        const { setStatus, setError, encryptionPassword } = get();

        // Check backend authentication state (not just isConnected flag)
        const backend = backendRegistry.getActive();
        if (!backend || !backend.isAuthenticated()) {
          setError('Not connected or session expired. Please reconnect.');
          set({ isConnected: false });
          return;
        }

        if (!encryptionPassword) {
          setError('Encryption password required');
          return;
        }

        // Reset password timeout on activity
        resetPasswordTimeout(() => {
          set({ encryptionPassword: null });
        });

        setStatus('syncing');
        setError(null);

        try {
          const result = await syncWithBackend(backend, encryptionPassword);

          if (result.success) {
            set({
              lastSyncAt: result.timestamp || new Date(),
              status: 'synced',
              encryptionPasswordSet: true,
              error: null, // Clear any previous errors
            });
          } else {
            setError(result.message);
            set({ status: 'error' });
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Sync failed');
          set({ status: 'error' });
        }
      },

      uploadToCloud: async () => {
        const { setStatus, setError, encryptionPassword } = get();

        // Check backend authentication state (not just isConnected flag)
        const backend = backendRegistry.getActive();
        if (!backend || !backend.isAuthenticated()) {
          setError('Not connected or session expired. Please reconnect.');
          set({ isConnected: false });
          return;
        }

        if (!encryptionPassword) {
          setError('Encryption password required');
          return;
        }

        // Reset password timeout on activity
        resetPasswordTimeout(() => {
          set({ encryptionPassword: null });
        });

        setStatus('syncing');
        setError(null);

        try {
          const result = await forceUploadToBackend(backend, encryptionPassword);

          if (result.success) {
            set({
              lastSyncAt: result.timestamp || new Date(),
              status: 'synced',
              encryptionPasswordSet: true,
              error: null, // Clear any previous errors
            });
          } else {
            setError(result.message);
            set({ status: 'error' });
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Upload failed');
          set({ status: 'error' });
        }
      },

      downloadFromCloud: async () => {
        const { setStatus, setError, encryptionPassword } = get();

        // Check backend authentication state (not just isConnected flag)
        const backend = backendRegistry.getActive();
        if (!backend || !backend.isAuthenticated()) {
          setError('Not connected or session expired. Please reconnect.');
          set({ isConnected: false });
          return;
        }

        if (!encryptionPassword) {
          setError('Encryption password required');
          return;
        }

        // Reset password timeout on activity
        resetPasswordTimeout(() => {
          set({ encryptionPassword: null });
        });

        setStatus('syncing');
        setError(null);

        try {
          const result = await forceDownloadFromBackend(backend, encryptionPassword);

          if (result.success) {
            set({
              lastSyncAt: result.timestamp || new Date(),
              status: 'synced',
              error: null, // Clear any previous errors
            });
            // Reload page to reflect new data
            window.location.reload();
          } else {
            setError(result.message);
            set({ status: 'error' });
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Download failed');
          set({ status: 'error' });
        }
      },

      // Local backup operations
      exportBackup: async () => {
        return exportLocalBackup();
      },

      importBackup: async (json) => {
        try {
          await importLocalBackup(json);
          // Reload to reflect imported data
          window.location.reload();
        } catch {
          throw new Error('Invalid backup file');
        }
      },
    }),
    {
      name: 'safeflow-sync',
      partialize: (state) => ({
        activeBackendType: state.activeBackendType,
        isConnected: state.isConnected,
        connectionUser: state.connectionUser,
        lastSyncAt: state.lastSyncAt,
        isAutoSyncEnabled: state.isAutoSyncEnabled,
        encryptionPasswordSet: state.encryptionPasswordSet,
        // Note: status is NOT persisted to prevent stuck "syncing" state on reload
        // Note: error is NOT persisted as it's transient
        // Note: encryptionPassword is NOT persisted for security
      }),
    }
  )
);
