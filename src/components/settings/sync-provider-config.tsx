'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Cloud,
  Server,
  HardDrive,
  FileJson,
  CheckCircle2,
  Settings2,
  Loader2,
} from 'lucide-react';
import type { SyncBackendType } from '@/types';
import { backendRegistry, getRequiredConfigFields } from '@/lib/sync/backends';

interface SyncProviderConfigProps {
  currentProvider: SyncBackendType | null;
  isConnected: boolean;
  onProviderChange: (provider: SyncBackendType, config: Record<string, string>) => Promise<void>;
}

const providerIcons: Record<SyncBackendType, React.ReactNode> = {
  'google-drive': <Cloud className="h-5 w-5" />,
  'webdav': <Server className="h-5 w-5" />,
  's3': <HardDrive className="h-5 w-5" />,
  'local-file': <FileJson className="h-5 w-5" />,
};

const providerDescriptions: Record<SyncBackendType, string> = {
  'google-drive': 'Sync via Google Drive appDataFolder (hidden, app-exclusive)',
  'webdav': 'Sync to Nextcloud, ownCloud, Synology NAS, or any WebDAV server',
  's3': 'Sync to AWS S3, Backblaze B2, Cloudflare R2, or MinIO',
  'local-file': 'Save encrypted file locally (sync with your preferred tool)',
};

export function SyncProviderConfig({
  currentProvider,
  isConnected,
  onProviderChange,
}: SyncProviderConfigProps) {
  const [selectedProvider, setSelectedProvider] = useState<SyncBackendType | null>(currentProvider);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBackends = backendRegistry.getAvailableBackends();

  const handleProviderSelect = (provider: SyncBackendType) => {
    setSelectedProvider(provider);
    setConfigValues({});
    setError(null);

    const fields = getRequiredConfigFields(provider);
    if (fields.length > 0) {
      setShowConfigDialog(true);
    } else {
      // Local file - no config needed, directly connect
      handleConnect(provider, {});
    }
  };

  const handleConnect = async (provider: SyncBackendType, config: Record<string, string>) => {
    setIsConnecting(true);
    setError(null);

    try {
      await onProviderChange(provider, config);
      setShowConfigDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConfigSubmit = () => {
    if (!selectedProvider) return;

    const fields = getRequiredConfigFields(selectedProvider);
    const missingRequired = fields.filter(
      (f) => f.required && !configValues[f.name]?.trim()
    );

    if (missingRequired.length > 0) {
      setError(`Missing required fields: ${missingRequired.map((f) => f.label).join(', ')}`);
      return;
    }

    handleConnect(selectedProvider, configValues);
  };

  const configFields = selectedProvider ? getRequiredConfigFields(selectedProvider) : [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Sync Provider
          </CardTitle>
          <CardDescription>
            Choose where to store your encrypted backup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Provider Status */}
          {currentProvider && isConnected && (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                {providerIcons[currentProvider]}
                <div>
                  <p className="font-medium">
                    {availableBackends.find((b) => b.type === currentProvider)?.displayName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Connected
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Select Provider</Label>
            <Select
              value={selectedProvider || ''}
              onValueChange={(value) => handleProviderSelect(value as SyncBackendType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a sync provider..." />
              </SelectTrigger>
              <SelectContent>
                {availableBackends.map((backend) => (
                  <SelectItem key={backend.type} value={backend.type}>
                    <div className="flex items-center gap-2">
                      {providerIcons[backend.type]}
                      <span>{backend.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider Descriptions */}
          {selectedProvider && (
            <p className="text-sm text-muted-foreground">
              {providerDescriptions[selectedProvider]}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProvider && providerIcons[selectedProvider]}
              Configure {selectedProvider && availableBackends.find((b) => b.type === selectedProvider)?.displayName}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider && providerDescriptions[selectedProvider]}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {configFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id={field.name}
                  type={field.type === 'password' ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={configValues[field.name] || ''}
                  onChange={(e) =>
                    setConfigValues((prev) => ({
                      ...prev,
                      [field.name]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfigDialog(false)}
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfigSubmit}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
