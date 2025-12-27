'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  Loader2,
  CheckCircle2,
  FileDown,
  FileUp,
  Trash2,
  TrendingUp,
  Palette,
  Eye,
  Bot,
  AlertCircle,
  Server,
  RefreshCw,
} from 'lucide-react';
import { useSyncStore } from '@/stores/sync.store';
import { useUIStore } from '@/stores/ui.store';
import { useAIStore } from '@/stores/ai.store';
import { toast } from 'sonner';
import { CloudSyncCard } from '@/components/settings/cloud-sync-card';

export default function SettingsPage() {
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset confirmation checkbox when dialog closes
  const handleClearDialogChange = useCallback((open: boolean) => {
    setShowClearDataDialog(open);
    if (!open) {
      setConfirmClearData(false);
    }
  }, []);

  const { exportBackup, importBackup } = useSyncStore();

  // UI Store
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const transactionViewMode = useUIStore((state) => state.transactionViewMode);
  const setTransactionViewMode = useUIStore((state) => state.setTransactionViewMode);
  const autoRefreshPrices = useUIStore((state) => state.autoRefreshPrices);
  const setAutoRefreshPrices = useUIStore((state) => state.setAutoRefreshPrices);
  const clearAllData = useUIStore((state) => state.clearAllData);

  // AI Store
  const aiSettings = useAIStore((state) => state.settings);
  const updateAISettings = useAIStore((state) => state.updateSettings);
  const connectionStatus = useAIStore((state) => state.connectionStatus);
  const connectionError = useAIStore((state) => state.connectionError);
  const isModelReady = useAIStore((state) => state.isModelReady);
  const checkConnection = useAIStore((state) => state.checkConnection);
  const availableModels = useAIStore((state) => state.availableModels);

  // Local state for AI settings form - use key-based reset pattern
  // State is initialized with the current value and only updates on user interaction
  const [ollamaHost, setOllamaHost] = useState(() => aiSettings.ollamaHost);
  const [selectedModel, setSelectedModel] = useState(() => aiSettings.model);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

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
      await clearAllData();
    } catch {
      toast.error('Failed to clear data');
      setIsClearing(false);
    }
  };

  const handleSaveAISettings = () => {
    updateAISettings({
      ollamaHost,
      model: selectedModel,
    });
    toast.success('AI settings saved');
  };

  const handleTestConnection = async () => {
    await checkConnection();
    if (connectionStatus === 'connected') {
      toast.success('Connected to Ollama');
    }
  };

  return (
    <>
      <Header title="Settings" />
      <div className="p-6 space-y-6 max-w-3xl">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how SafeFlow looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Choose between light, dark, or system theme
                </p>
              </div>
              <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Display Preferences
            </CardTitle>
            <CardDescription>
              Configure how data is displayed throughout the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Transaction View</p>
                <p className="text-sm text-muted-foreground">
                  How transactions are displayed on the transactions page
                </p>
              </div>
              <Select
                value={transactionViewMode}
                onValueChange={(v) => setTransactionViewMode(v as 'list' | 'grouped')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List View</SelectItem>
                  <SelectItem value="grouped">Grouped by Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
              <Switch
                checked={autoRefreshPrices}
                onCheckedChange={setAutoRefreshPrices}
              />
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Price data is fetched from Yahoo Finance (ASX stocks/ETFs) and CoinGecko (cryptocurrencies).
                Prices are stored locally and a 30-day history is kept for trend charts.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              Configure the local AI assistant powered by Ollama
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Connection Status</p>
                <div className="flex items-center gap-2">
                  {connectionStatus === 'connected' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Connected</span>
                      {isModelReady && (
                        <Badge variant="secondary" className="text-xs">
                          Model Ready
                        </Badge>
                      )}
                    </>
                  ) : connectionStatus === 'connecting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-blue-600">Connecting...</span>
                    </>
                  ) : connectionStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Error</span>
                    </>
                  ) : (
                    <>
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Disconnected</span>
                    </>
                  )}
                </div>
                {connectionError && (
                  <p className="text-xs text-destructive">{connectionError}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleTestConnection}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Test
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ollamaHost">Ollama Host URL</Label>
              <Input
                id="ollamaHost"
                placeholder="http://127.0.0.1:11434"
                value={ollamaHost}
                onChange={(e) => setOllamaHost(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The URL where Ollama is running. Default is http://127.0.0.1:11434
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              {availableModels.length > 0 ? (
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="model"
                  placeholder="llama3.1:8b"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                The Ollama model to use for AI features. Run &quot;ollama pull llama3.1:8b&quot; to download.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Auto-categorize transactions</p>
                <p className="text-sm text-muted-foreground">
                  Automatically categorize imported transactions using AI
                </p>
              </div>
              <Switch
                checked={aiSettings.autoCategorize}
                onCheckedChange={(checked) => updateAISettings({ autoCategorize: checked })}
              />
            </div>

            <Button onClick={handleSaveAISettings} className="w-full">
              Save AI Settings
            </Button>
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
      <AlertDialog open={showClearDataDialog} onOpenChange={handleClearDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  This will permanently delete all your local data including:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                  <li>All accounts and transactions</li>
                  <li>Investment holdings and price history</li>
                  <li>Superannuation records</li>
                  <li>Categories and budgets</li>
                  <li>Tax records and CGT data</li>
                  <li>All imported bank statements</li>
                </ul>
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    We strongly recommend exporting a backup before proceeding.
                  </p>
                </div>
                <div className="flex items-start gap-2 pt-2">
                  <Checkbox
                    id="confirm-delete"
                    checked={confirmClearData}
                    onCheckedChange={(checked) => setConfirmClearData(checked === true)}
                    disabled={isClearing}
                  />
                  <label
                    htmlFor="confirm-delete"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    I understand this action cannot be undone and I want to delete all my data
                  </label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={isClearing || !confirmClearData}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
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
