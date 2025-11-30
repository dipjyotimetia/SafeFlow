import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncStatus } from '@/types';
import {
  initGoogleAuth,
  requestAccessToken,
  signOut,
  getAuthState,
  syncWithDrive,
  forceUpload,
  forceDownload,
  isEncryptionSetUp,
  getSyncMetadata,
  exportLocalBackup,
  importLocalBackup,
} from '@/lib/sync';

interface User {
  email: string;
  name?: string;
  picture?: string;
}

interface SyncStore {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;
  isGoogleInitialized: boolean;

  // Sync state
  status: SyncStatus;
  lastSyncAt: Date | null;
  error: string | null;
  isAutoSyncEnabled: boolean;

  // Encryption
  encryptionPasswordSet: boolean;
  encryptionPassword: string | null; // Only stored in memory

  // Initialization
  initGoogle: (clientId: string) => Promise<void>;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signOutFromGoogle: () => Promise<void>;

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
      isAuthenticated: false,
      user: null,
      isGoogleInitialized: false,

      status: 'idle',
      lastSyncAt: null,
      error: null,
      isAutoSyncEnabled: true,

      encryptionPasswordSet: false,
      encryptionPassword: null,

      // Initialization
      initGoogle: async (clientId) => {
        if (get().isGoogleInitialized) return;

        try {
          await initGoogleAuth(clientId);
          set({ isGoogleInitialized: true });

          // Check if already authenticated
          const authState = getAuthState();
          if (authState.isSignedIn) {
            set({
              isAuthenticated: true,
              user: { email: authState.userEmail || '' },
            });
          }

          // Check encryption setup
          set({ encryptionPasswordSet: isEncryptionSetUp() });
        } catch (error) {
          console.error('Failed to initialize Google Auth:', error);
          set({ error: 'Failed to initialize Google Auth' });
        }
      },

      // Auth actions
      signInWithGoogle: async () => {
        const { setStatus, setError } = get();
        setStatus('syncing');
        setError(null);

        try {
          const authState = await requestAccessToken();
          set({
            isAuthenticated: true,
            user: { email: authState.userEmail || '' },
            status: 'idle',
          });
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Sign in failed');
          set({ status: 'error' });
        }
      },

      signOutFromGoogle: async () => {
        try {
          await signOut();
        } catch (error) {
          console.error('Sign out error:', error);
        }

        set({
          isAuthenticated: false,
          user: null,
          status: 'idle',
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
      },

      clearEncryptionPassword: () => {
        set({ encryptionPassword: null });
      },

      // Sync operations
      sync: async () => {
        const { setStatus, setError, isAuthenticated, encryptionPassword } = get();

        if (!isAuthenticated) {
          setError('Not signed in to Google');
          return;
        }

        if (!encryptionPassword) {
          setError('Encryption password required');
          return;
        }

        setStatus('syncing');
        setError(null);

        try {
          const result = await syncWithDrive(encryptionPassword);

          if (result.success) {
            set({
              lastSyncAt: result.timestamp || new Date(),
              status: 'synced',
              encryptionPasswordSet: true,
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
        const { setStatus, setError, isAuthenticated, encryptionPassword } = get();

        if (!isAuthenticated) {
          setError('Not signed in to Google');
          return;
        }

        if (!encryptionPassword) {
          setError('Encryption password required');
          return;
        }

        setStatus('syncing');
        setError(null);

        try {
          const result = await forceUpload(encryptionPassword);

          if (result.success) {
            set({
              lastSyncAt: result.timestamp || new Date(),
              status: 'synced',
              encryptionPasswordSet: true,
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
        const { setStatus, setError, isAuthenticated, encryptionPassword } = get();

        if (!isAuthenticated) {
          setError('Not signed in to Google');
          return;
        }

        if (!encryptionPassword) {
          setError('Encryption password required');
          return;
        }

        setStatus('syncing');
        setError(null);

        try {
          const result = await forceDownload(encryptionPassword);

          if (result.success) {
            set({
              lastSyncAt: result.timestamp || new Date(),
              status: 'synced',
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
        } catch (error) {
          throw new Error('Invalid backup file');
        }
      },
    }),
    {
      name: 'safeflow-sync',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        lastSyncAt: state.lastSyncAt,
        isAutoSyncEnabled: state.isAutoSyncEnabled,
        encryptionPasswordSet: state.encryptionPasswordSet,
        // Note: encryptionPassword is NOT persisted for security
      }),
    }
  )
);
