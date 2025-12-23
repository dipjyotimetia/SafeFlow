'use client';

import { useState, useRef } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  FileDown,
  FileUp,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useSyncStore } from '@/stores/sync.store';
import { toast } from 'sonner';
import { db } from '@/lib/db';

export default function SettingsPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isAuthenticated,
    user,
    status,
    lastSyncAt,
    error,
    isAutoSyncEnabled,
    encryptionPasswordSet,
    encryptionPassword,
    signInWithGoogle,
    signOutFromGoogle,
    toggleAutoSync,
    setEncryptionPassword,
    sync,
    uploadToCloud,
    downloadFromCloud,
    exportBackup,
    importBackup,
  } = useSyncStore();

  const isSyncing = status === 'syncing';

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Connected to Google Drive');
    } catch {
      toast.error('Failed to connect to Google');
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutFromGoogle();
    toast.success('Disconnected from Google Drive');
  };

  const handleSetPassword = () => {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setEncryptionPassword(password);
    setShowPasswordDialog(false);
    setPassword('');
    setConfirmPassword('');
    toast.success('Encryption password set');
  };

  const handleSync = async () => {
    if (!encryptionPassword) {
      setShowPasswordDialog(true);
      return;
    }

    await sync();

    if (status === 'synced') {
      toast.success('Data synced successfully');
    }
  };

  const handleUpload = async () => {
    if (!encryptionPassword) {
      setShowPasswordDialog(true);
      return;
    }

    await uploadToCloud();

    if (status === 'synced') {
      toast.success('Data uploaded to cloud');
    }
  };

  const handleDownload = async () => {
    if (!encryptionPassword) {
      setShowPasswordDialog(true);
      return;
    }

    await downloadFromCloud();
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportBackup();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safeflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported');
    } catch {
      toast.error('Failed to export backup');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importBackup(text);
      toast.success('Backup imported');
    } catch {
      toast.error('Failed to import backup');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      await db.delete();
      localStorage.clear();
      window.location.reload();
    } catch {
      toast.error('Failed to clear data');
      setIsClearing(false);
    }
  };

  return (
    <>
      <Header title="Settings" />
      <div className="p-6 space-y-6 max-w-3xl">
        {/* Cloud Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Cloud Sync
            </CardTitle>
            <CardDescription>
              Sync your data securely across devices using Google Drive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Google Account */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Google Account</p>
                {isAuthenticated && user ? (
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not connected</p>
                )}
              </div>
              {isAuthenticated ? (
                <Button variant="outline" onClick={handleGoogleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button onClick={handleGoogleSignIn} disabled={isSyncing}>
                  <Cloud className="h-4 w-4 mr-2" />
                  Connect Google
                </Button>
              )}
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
            {isAuthenticated && (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Sync Status</p>
                  <div className="flex items-center gap-2">
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
            )}

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
            {isAuthenticated && encryptionPassword && (
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
          </CardContent>
        </Card>

        {/* Investment Price Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Investment Prices
            </CardTitle>
            <CardDescription>
              Configure automatic price refresh for your investments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Auto-refresh on page load</p>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh prices when visiting the Investments page if data is stale (over 1 hour old)
                </p>
              </div>
              <Badge variant="default" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Price data is fetched from Yahoo Finance (ASX stocks/ETFs) and CoinGecko (cryptocurrencies).
                Prices are stored locally and a 30-day history is kept for trend charts.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Local Backup */}
        <Card>
          <CardHeader>
            <CardTitle>Local Backup</CardTitle>
            <CardDescription>
              Export or import your data as a local file (unencrypted)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleExportBackup}>
                <FileDown className="h-4 w-4 mr-2" />
                Export Backup
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="h-4 w-4 mr-2" />
                Import Backup
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportBackup}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Local backups are not encrypted. Store them securely.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that will affect your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Clear All Data</p>
                <p className="text-sm text-muted-foreground">
                  Delete all local data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowClearDataDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About SafeFlow AU</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Version 1.0.0
            </p>
            <p className="text-sm text-muted-foreground">
              Privacy-first family finance app for Australian couples.
              All data is stored locally in your browser and encrypted before
              syncing to Google Drive.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Password Dialog */}
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {encryptionPassword ? 'Change' : 'Set'} Encryption Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              This password encrypts your data before syncing to Google Drive.
              Keep it safe - if you forget it, you won&apos;t be able to recover your cloud data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPassword('');
              setConfirmPassword('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSetPassword}>
              Set Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Data Dialog */}
      <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your local data including accounts,
              transactions, categories, and settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Delete All Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
