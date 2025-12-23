'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Cloud,
  CloudOff,
  Download,
  Upload,
  Key,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
  Server,
  Database,
  FileBox,
} from 'lucide-react';
import { useSyncStore } from '@/stores/sync.store';
import { toast } from 'sonner';
import {
  backendRegistry,
  getRequiredConfigFields,
  type SyncBackendType,
  type BackendConfig,
  type GoogleDriveConfig,
  type WebDAVConfig,
  type S3Config,
  type LocalFileConfig,
} from '@/lib/sync';

// Password validation utilities
interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

const MAX_PASSWORD_LENGTH = 128;
const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validate path doesn't contain traversal attempts
 */
function isValidPath(path: string): boolean {
  // Disallow path traversal
  if (path.includes('..')) return false;
  // Must start with / for WebDAV paths
  return true;
}

function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('At least 12 characters');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Maximum ${MAX_PASSWORD_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('One number');
  }
  if (!SPECIAL_CHARS_REGEX.test(password)) {
    errors.push('One special character (!@#$%^&*...)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const PROVIDER_ICONS: Record<SyncBackendType, React.ReactNode> = {
  'google-drive': <Cloud className="h-4 w-4" />,
  'webdav': <Server className="h-4 w-4" />,
  's3': <Database className="h-4 w-4" />,
  'local-file': <FileBox className="h-4 w-4" />,
};

const PROVIDER_DESCRIPTIONS: Record<SyncBackendType, string> = {
  'google-drive': 'Sync via your Google Drive account',
  'webdav': 'Connect to Nextcloud, Synology, or other WebDAV servers',
  's3': 'Use S3-compatible storage (Backblaze B2, Cloudflare R2, MinIO)',
  'local-file': 'Sync to a local file on your device',
};

export function CloudSyncCard() {
  const [selectedProvider, setSelectedProvider] = useState<SyncBackendType | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);

  // Password dialog state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Optimized Zustand selectors with shallow comparison to minimize re-renders
  const connectionState = useSyncStore(
    useShallow((state) => ({
      activeBackendType: state.activeBackendType,
      isConnected: state.isConnected,
      connectionUser: state.connectionUser,
    }))
  );

  const syncState = useSyncStore(
    useShallow((state) => ({
      status: state.status,
      lastSyncAt: state.lastSyncAt,
      error: state.error,
      isAutoSyncEnabled: state.isAutoSyncEnabled,
    }))
  );

  const encryptionState = useSyncStore(
    useShallow((state) => ({
      encryptionPasswordSet: state.encryptionPasswordSet,
      encryptionPassword: state.encryptionPassword,
    }))
  );

  // Actions don't need to be in selectors - they're stable references
  const initializeFromStorage = useSyncStore((state) => state.initializeFromStorage);
  const connectProvider = useSyncStore((state) => state.connectProvider);
  const disconnectProvider = useSyncStore((state) => state.disconnectProvider);
  const toggleAutoSync = useSyncStore((state) => state.toggleAutoSync);
  const setEncryptionPassword = useSyncStore((state) => state.setEncryptionPassword);
  const sync = useSyncStore((state) => state.sync);
  const uploadToCloud = useSyncStore((state) => state.uploadToCloud);
  const downloadFromCloud = useSyncStore((state) => state.downloadFromCloud);

  // Destructure for convenience
  const { activeBackendType, isConnected, connectionUser } = connectionState;
  const { status, lastSyncAt, error, isAutoSyncEnabled } = syncState;
  const { encryptionPasswordSet, encryptionPassword } = encryptionState;

  const isSyncing = status === 'syncing';

  // Password validation state
  const passwordValidation = useMemo(() => validatePassword(password), [password]);

  // Initialize from storage on mount
  useEffect(() => {
    initializeFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear password state when dialog closes
  const handlePasswordDialogChange = useCallback((open: boolean) => {
    setShowPasswordDialog(open);
    if (!open) {
      setPassword('');
      setConfirmPassword('');
    }
  }, []);

  const availableBackends = backendRegistry.getAvailableBackends();
  const configFields = selectedProvider ? getRequiredConfigFields(selectedProvider) : [];

  const handleProviderSelect = (value: string) => {
    setSelectedProvider(value as SyncBackendType);
    setConfigValues({});
  };

  const handleConfigChange = (field: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [field]: value }));
  };

  const buildConfig = (): BackendConfig | null => {
    if (!selectedProvider) return null;

    switch (selectedProvider) {
      case 'google-drive':
        if (!configValues.clientId?.trim()) return null;
        return {
          type: 'google-drive',
          clientId: configValues.clientId.trim(),
        } satisfies GoogleDriveConfig;

      case 'webdav': {
        const serverUrl = configValues.serverUrl?.trim();
        const username = configValues.username?.trim();
        const password = configValues.password;
        const path = configValues.path?.trim() || '/safeflow/sync.json';

        // Validate required fields
        if (!serverUrl || !username || !password) return null;

        // Validate URL format
        if (!isValidUrl(serverUrl)) {
          toast.error('Invalid server URL format');
          return null;
        }

        // Validate path for traversal attempts
        if (!isValidPath(path)) {
          toast.error('Invalid path: contains forbidden characters');
          return null;
        }

        return {
          type: 'webdav',
          serverUrl,
          username,
          password,
          path,
        } satisfies WebDAVConfig;
      }

      case 's3': {
        const endpoint = configValues.endpoint?.trim();
        const bucket = configValues.bucket?.trim();
        const accessKeyId = configValues.accessKeyId?.trim();
        const secretAccessKey = configValues.secretAccessKey;
        const region = configValues.region?.trim() || 'auto';
        const path = configValues.path?.trim() || 'safeflow-sync.json';

        // Validate required fields
        if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;

        // Validate endpoint URL format
        if (!isValidUrl(endpoint)) {
          toast.error('Invalid S3 endpoint URL format');
          return null;
        }

        // Validate path for traversal attempts
        if (!isValidPath(path)) {
          toast.error('Invalid path: contains forbidden characters');
          return null;
        }

        return {
          type: 's3',
          endpoint,
          bucket,
          accessKeyId,
          secretAccessKey,
          region,
          path,
        } satisfies S3Config;
      }

      case 'local-file':
        return {
          type: 'local-file',
        } satisfies LocalFileConfig;

      default:
        return null;
    }
  };

  const validateConfig = (): boolean => {
    if (!selectedProvider) return false;

    const requiredFields = configFields.filter((f) => f.required);
    return requiredFields.every((f) => configValues[f.name]?.trim());
  };

  const handleConnect = async () => {
    const config = buildConfig();
    if (!config) return;

    setIsConnecting(true);
    try {
      await connectProvider(selectedProvider!, config);
      toast.success(`Connected to ${availableBackends.find((b) => b.type === selectedProvider)?.displayName}`);
      setSelectedProvider(null);
      setConfigValues({});
    } catch (err) {
      console.error('[CloudSyncCard] Connection failed:', err);
      toast.error(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (isSyncing) {
      toast.error('Cannot disconnect while sync is in progress');
      return;
    }
    await disconnectProvider();
    toast.success('Disconnected from sync provider');
  };

  const handleSetPassword = () => {
    if (!passwordValidation.isValid) {
      toast.error('Password does not meet requirements');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setEncryptionPassword(password);
    handlePasswordDialogChange(false);
    toast.success('Encryption password set');
  };

  const handleSync = async () => {
    if (!encryptionPassword) {
      setShowPasswordDialog(true);
      return;
    }

    await sync();

    // Check state after async operation completes (avoid stale closure)
    const currentState = useSyncStore.getState();
    if (currentState.status === 'synced') {
      toast.success('Data synced successfully');
    } else if (currentState.error) {
      toast.error(currentState.error);
    }
  };

  const handleUpload = async () => {
    if (!encryptionPassword) {
      setShowPasswordDialog(true);
      return;
    }

    await uploadToCloud();

    // Check state after async operation completes (avoid stale closure)
    const currentState = useSyncStore.getState();
    if (currentState.status === 'synced') {
      toast.success('Data uploaded to cloud');
    } else if (currentState.error) {
      toast.error(currentState.error);
    }
  };

  const handleDownload = async () => {
    if (!encryptionPassword) {
      setShowPasswordDialog(true);
      return;
    }

    await downloadFromCloud();

    // Check state after async operation completes (avoid stale closure)
    const currentState = useSyncStore.getState();
    if (currentState.error) {
      toast.error(currentState.error);
    }
    // Note: successful download triggers page reload, so no success toast needed
  };

  const getProviderDisplayName = (type: SyncBackendType | null): string => {
    if (!type) return 'Unknown';
    return availableBackends.find((b) => b.type === type)?.displayName || type;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Cloud Sync
          </CardTitle>
          <CardDescription>
            Sync your data securely across devices using your preferred cloud storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Not Connected - Provider Selection */}
          {!isConnected && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Choose Sync Provider</Label>
                <Select
                  value={selectedProvider || ''}
                  onValueChange={handleProviderSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sync provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBackends.map((backend) => (
                      <SelectItem key={backend.type} value={backend.type}>
                        <div className="flex items-center gap-2">
                          {PROVIDER_ICONS[backend.type]}
                          <span>{backend.displayName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProvider && (
                  <p className="text-sm text-muted-foreground">
                    {PROVIDER_DESCRIPTIONS[selectedProvider]}
                  </p>
                )}
              </div>

              {/* Dynamic Configuration Form */}
              {selectedProvider && configFields.length > 0 && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium text-sm">Configuration</h4>
                  {configFields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        id={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={configValues[field.name] || ''}
                        onChange={(e) => handleConfigChange(field.name, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Connect Button */}
              {selectedProvider && (
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !validateConfig()}
                  className="w-full"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      {PROVIDER_ICONS[selectedProvider]}
                      <span className="ml-2">Connect to {getProviderDisplayName(selectedProvider)}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Connected State */}
          {isConnected && (
            <>
              {/* Connection Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {activeBackendType && PROVIDER_ICONS[activeBackendType]}
                    <p className="font-medium">{getProviderDisplayName(activeBackendType)}</p>
                    <Badge variant="default" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                  {connectionUser?.email && (
                    <p className="text-sm text-muted-foreground">{connectionUser.email}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isSyncing}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>

              {/* Encryption Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Encryption</p>
                    {encryptionPasswordSet && encryptionPassword ? (
                      <Badge variant="default" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : encryptionPasswordSet ? (
                      <Badge variant="secondary" className="text-xs">
                        <Key className="h-3 w-3 mr-1" />
                        Set
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Not Set
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AES-256-GCM encryption for your data
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  {encryptionPassword ? 'Change' : 'Set Password'}
                </Button>
              </div>

              {/* Sync Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Sync Status</p>
                  <div className="flex items-center gap-2" role="status" aria-live="polite">
                    {status === 'synced' && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Synced</span>
                      </>
                    )}
                    {status === 'syncing' && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-600">Syncing...</span>
                      </>
                    )}
                    {status === 'error' && (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">Error</span>
                      </>
                    )}
                    {status === 'idle' && (
                      <>
                        <CloudOff className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Not synced</span>
                      </>
                    )}
                  </div>
                  {lastSyncAt && (
                    <p className="text-xs text-muted-foreground">
                      Last sync: {new Date(lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing || !encryptionPassword}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Now
                </Button>
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sync Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Auto Sync</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync when data changes
                  </p>
                </div>
                <Switch
                  checked={isAutoSyncEnabled}
                  onCheckedChange={toggleAutoSync}
                />
              </div>

              {/* Manual Sync Buttons */}
              {encryptionPassword && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleUpload}
                    disabled={isSyncing}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload to Cloud
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDownload}
                    disabled={isSyncing}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download from Cloud
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={handlePasswordDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {encryptionPassword ? 'Change' : 'Set'} Encryption Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              This password encrypts your data before syncing to the cloud.
              Keep it safe - if you forget it, you won&apos;t be able to recover your cloud data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {/* Password requirements */}
              {password.length > 0 && (
                <div className="text-xs space-y-1">
                  <p className="text-muted-foreground font-medium">Requirements:</p>
                  <ul className="space-y-0.5">
                    <li className={password.length >= 12 && password.length <= MAX_PASSWORD_LENGTH ? 'text-green-600' : 'text-muted-foreground'}>
                      {password.length >= 12 && password.length <= MAX_PASSWORD_LENGTH ? '✓' : '○'} 12-{MAX_PASSWORD_LENGTH} characters
                    </li>
                    <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                      {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                      {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
                    </li>
                    <li className={/[0-9]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                      {/[0-9]/.test(password) ? '✓' : '○'} One number
                    </li>
                    <li className={SPECIAL_CHARS_REGEX.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                      {SPECIAL_CHARS_REGEX.test(password) ? '✓' : '○'} One special character
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSetPassword}
              disabled={!passwordValidation.isValid || password !== confirmPassword}
            >
              Set Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
