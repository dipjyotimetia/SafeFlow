'use client';

import { useState, useRef } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Loader2,
  CheckCircle2,
  FileDown,
  FileUp,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useSyncStore } from '@/stores/sync.store';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { CloudSyncCard } from '@/components/settings/cloud-sync-card';

export default function SettingsPage() {
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { exportBackup, importBackup } = useSyncStore();

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
        {/* Cloud Sync - Multi-backend support */}
        <CloudSyncCard />

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
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
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
              syncing to cloud storage.
            </p>
          </CardContent>
        </Card>
      </div>

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
