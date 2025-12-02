'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { FileUp, FileText, CheckCircle2, AlertCircle, Loader2, Landmark } from 'lucide-react';
import { FileDropZone, TransactionPreview } from '@/components/import';
import { CategorizationStatusCard } from '@/components/ai';
import { usePDFParser, useAccounts, useSuperAccounts } from '@/hooks';
import { useTransactionStore } from '@/stores/transaction.store';
import { useSuperannuationStore } from '@/stores/superannuation.store';
import { parserRegistry, parseSuperStatement, getAvailableSuperParsers } from '@/lib/parsers';
import type { ParsedTransaction } from '@/lib/parsers/types';
import type { SuperParseResult } from '@/lib/parsers/super/types';
import type { TransactionType, SuperTransactionType } from '@/types';
import { toast } from 'sonner';

type ImportStep = 'upload' | 'preview' | 'complete';
type ImportType = 'bank' | 'super';

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('bank');
  const [step, setStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>('auto');
  const [selectedSuperFund, setSelectedSuperFund] = useState<string>('auto');
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [targetSuperAccountId, setTargetSuperAccountId] = useState<string>('');
  const [selectedTransactions, setSelectedTransactions] = useState<ParsedTransaction[]>([]);
  const [superParseResult, setSuperParseResult] = useState<SuperParseResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [superParsing, setSuperParsing] = useState(false);
  const [superError, setSuperError] = useState<string | null>(null);

  const { accounts } = useAccounts();
  const { accounts: superAccounts } = useSuperAccounts();
  const { bulkImport } = useTransactionStore();
  const { bulkImportTransactions: bulkImportSuperTransactions, createAccount: createSuperAccount } = useSuperannuationStore();
  const {
    isLoading: isParsing,
    progress,
    progressMessage,
    error: parseError,
    parseResult,
    parseFile,
    reset: resetParser,
  } = usePDFParser();

  const availableBanks = parserRegistry.getAll();

  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      await parseFile(file, selectedBank === 'auto' ? undefined : selectedBank);
    },
    [parseFile, selectedBank]
  );

  const handleBankChange = useCallback(
    async (bank: string) => {
      setSelectedBank(bank);
      if (selectedFile) {
        await parseFile(selectedFile, bank === 'auto' ? undefined : bank);
      }
    },
    [parseFile, selectedFile]
  );

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setStep('upload');
    setSelectedTransactions([]);
    setImportedCount(0);
    resetParser();
  }, [resetParser]);

  const handleContinueToPreview = useCallback(() => {
    if (parseResult?.transactions) {
      setSelectedTransactions(parseResult.transactions);
      setStep('preview');
    }
  }, [parseResult]);

  const handleImport = useCallback(async () => {
    if (!targetAccountId || selectedTransactions.length === 0) {
      toast.error('Please select an account and at least one transaction');
      return;
    }

    setIsImporting(true);
    try {
      // Convert parsed transactions to our transaction format
      // Use the parser's type field directly - it already analyzes the transaction
      // Convert 'transfer' type to 'expense' since transfers aren't aggregated in reports
      const transactionsToImport = selectedTransactions.map((t) => ({
        accountId: targetAccountId,
        type: (t.type === 'transfer' ? 'expense' : t.type) as TransactionType,
        amount: Math.abs(t.amount),
        description: t.description,
        date: t.date.toISOString(),
        notes: t.reference || undefined,
      }));

      const result = await bulkImport(transactionsToImport);
      setImportedCount(result.imported);
      setStep('complete');
      toast.success(`Imported ${result.imported} transactions`);
      if (result.skipped > 0) {
        toast.info(`Skipped ${result.skipped} duplicate transactions`);
      }
    } catch (error) {
      toast.error('Failed to import transactions');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [targetAccountId, selectedTransactions, bulkImport]);

  const handleStartOver = useCallback(() => {
    setStep('upload');
    setSelectedFile(null);
    setSelectedBank('auto');
    setSelectedSuperFund('auto');
    setTargetAccountId('');
    setTargetSuperAccountId('');
    setSelectedTransactions([]);
    setSuperParseResult(null);
    setImportedCount(0);
    setSuperError(null);
    resetParser();
  }, [resetParser]);

  // Super statement handlers
  const availableSuperFunds = getAvailableSuperParsers();

  const handleSuperFileSelect = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      setSuperParsing(true);
      setSuperError(null);
      setSuperParseResult(null);

      try {
        // Read PDF file as text using pdf.js
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => {
              if ('str' in item && typeof item.str === 'string') {
                return item.str;
              }
              return '';
            })
            .join(' ');
          fullText += pageText + '\n';
        }

        const result = parseSuperStatement(
          fullText,
          selectedSuperFund === 'auto' ? undefined : selectedSuperFund
        );
        setSuperParseResult(result);
      } catch (error) {
        console.error('Super PDF parse error:', error);
        setSuperError(error instanceof Error ? error.message : 'Failed to parse PDF');
      } finally {
        setSuperParsing(false);
      }
    },
    [selectedSuperFund]
  );

  const handleSuperFundChange = useCallback(
    async (fund: string) => {
      setSelectedSuperFund(fund);
      if (selectedFile && importType === 'super') {
        await handleSuperFileSelect(selectedFile);
      }
    },
    [selectedFile, importType, handleSuperFileSelect]
  );

  const handleSuperContinueToPreview = useCallback(() => {
    if (superParseResult?.success) {
      setStep('preview');
    }
  }, [superParseResult]);

  const handleSuperImport = useCallback(async () => {
    if (!superParseResult?.success) {
      toast.error('No valid super statement to import');
      return;
    }

    setIsImporting(true);
    try {
      let accountId = targetSuperAccountId;

      // Create new account if needed
      if (!accountId && superParseResult.account) {
        accountId = await createSuperAccount({
          provider: superParseResult.account.provider as 'unisuper' | 'australian-super' | 'other',
          providerName: superParseResult.account.providerName,
          memberNumber: superParseResult.account.memberNumber || '',
          accountName: superParseResult.account.accountName,
          totalBalance: superParseResult.account.totalBalance,
          preservedBalance: superParseResult.account.preservedBalance,
          restrictedNonPreserved: superParseResult.account.restrictedNonPreserved,
          unrestrictedNonPreserved: superParseResult.account.unrestrictedNonPreserved,
        });
        toast.success(`Created new ${superParseResult.account.providerName} account`);
      }

      if (!accountId) {
        toast.error('Please select or create a super account');
        return;
      }

      // Import transactions
      if (superParseResult.transactions.length > 0) {
        const transactionsToImport = superParseResult.transactions.map((t) => ({
          superAccountId: accountId,
          type: t.type as SuperTransactionType,
          amount: t.amount,
          description: t.description,
          date: t.date,
        }));

        const result = await bulkImportSuperTransactions(transactionsToImport);
        setImportedCount(result.imported);
        toast.success(`Imported ${result.imported} super transactions`);
        if (result.skipped > 0) {
          toast.info(`Skipped ${result.skipped} duplicate transactions`);
        }
      } else {
        setImportedCount(0);
        toast.info('Account updated, no new transactions found');
      }

      setStep('complete');
    } catch (error) {
      toast.error('Failed to import super statement');
      console.error('Super import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [superParseResult, targetSuperAccountId, createSuperAccount, bulkImportSuperTransactions]);

  const handleSuperClear = useCallback(() => {
    setSelectedFile(null);
    setSuperParseResult(null);
    setSuperError(null);
    setStep('upload');
  }, []);

  const handleImportTypeChange = useCallback((type: ImportType) => {
    setImportType(type);
    setStep('upload');
    setSelectedFile(null);
    setSelectedTransactions([]);
    setSuperParseResult(null);
    setSuperError(null);
    setImportedCount(0);
    resetParser();
  }, [resetParser]);

  return (
    <>
      <Header title="Import Statements" />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Import Statements</h2>
          <p className="text-sm text-muted-foreground">
            Upload PDF statements to automatically import transactions
          </p>
        </div>

        {/* Import Type Tabs */}
        <Tabs value={importType} onValueChange={(v) => handleImportTypeChange(v as ImportType)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Bank Statements
            </TabsTrigger>
            <TabsTrigger value="super" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Super Statements
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Step Indicator */}
        <div className="flex items-center gap-4">
          <Badge variant={step === 'upload' ? 'default' : 'secondary'}>
            1. Upload
          </Badge>
          <div className="h-px flex-1 bg-border" />
          <Badge variant={step === 'preview' ? 'default' : 'secondary'}>
            2. Preview
          </Badge>
          <div className="h-px flex-1 bg-border" />
          <Badge variant={step === 'complete' ? 'default' : 'secondary'}>
            3. Complete
          </Badge>
        </div>

        {/* AI Categorization Status - always visible for bank imports */}
        {importType === 'bank' && <CategorizationStatusCard className="mb-6" />}

        {/* Upload Step */}
        {step === 'upload' && importType === 'bank' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Upload Bank PDF</CardTitle>
                <CardDescription>
                  Select your bank and upload your statement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bank Selection */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">
                      Bank (optional)
                    </label>
                    <Select value={selectedBank} onValueChange={handleBankChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-detect" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        {availableBanks.map((bank) => (
                          <SelectItem key={bank.bankCode} value={bank.bankCode}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* File Drop Zone */}
                <FileDropZone
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  onClear={handleClear}
                  disabled={isParsing}
                />

                {/* Progress */}
                {isParsing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{progressMessage}</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                {/* Parse Error */}
                {parseError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{parseError}</AlertDescription>
                  </Alert>
                )}

                {/* Parse Result */}
                {parseResult && !isParsing && (
                  <div className="space-y-4">
                    {parseResult.success ? (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle>Statement Parsed</AlertTitle>
                        <AlertDescription>
                          Found {parseResult.transactions.length} transactions
                          {parseResult.accountName && ` from ${parseResult.accountName}`}
                          {parseResult.statementPeriod && (
                            <span className="block text-xs mt-1">
                              Period:{' '}
                              {parseResult.statementPeriod.start.toLocaleDateString()} -{' '}
                              {parseResult.statementPeriod.end.toLocaleDateString()}
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Parse Failed</AlertTitle>
                        <AlertDescription>
                          {parseResult.errors.join('. ')}
                        </AlertDescription>
                      </Alert>
                    )}

                    {parseResult.warnings.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Warnings</AlertTitle>
                        <AlertDescription>
                          {parseResult.warnings.join('. ')}
                        </AlertDescription>
                      </Alert>
                    )}

                    {parseResult.success && (
                      <Button onClick={handleContinueToPreview} className="w-full">
                        Continue to Preview
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supported Banks */}
            <Card>
              <CardHeader>
                <CardTitle>Supported Banks & Platforms</CardTitle>
                <CardDescription>
                  We support these Australian banks and financial platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Big 4 Banks */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Big 4 Banks</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { name: 'ANZ', supported: true },
                      { name: 'Commonwealth Bank', supported: true },
                      { name: 'Westpac', supported: true },
                      { name: 'NAB', supported: true },
                    ].map((bank) => (
                      <div
                        key={bank.name}
                        className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{bank.name}</span>
                        <Badge variant="default" className="ml-auto text-xs">
                          Ready
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Digital Banks */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Digital Banks</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { name: 'ING Australia', supported: true },
                      { name: 'Macquarie Bank', supported: true },
                      { name: 'Up Bank', supported: true },
                      { name: 'Bendigo Bank', supported: true },
                    ].map((bank) => (
                      <div
                        key={bank.name}
                        className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{bank.name}</span>
                        <Badge variant="default" className="ml-auto text-xs">
                          Ready
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Investment/Crypto Platforms */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Investment & Crypto</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { name: 'Raiz Invest', supported: true },
                      { name: 'CoinSpot', supported: true },
                      { name: 'Swyftx', supported: true },
                    ].map((platform) => (
                      <div
                        key={platform.name}
                        className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{platform.name}</span>
                        <Badge variant="default" className="ml-auto text-xs">
                          Ready
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Super Upload Step */}
        {step === 'upload' && importType === 'super' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Upload Super Statement PDF</CardTitle>
                <CardDescription>
                  Upload your superannuation statement to import account details and transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Super Fund Selection */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">
                      Super Fund (optional)
                    </label>
                    <Select value={selectedSuperFund} onValueChange={handleSuperFundChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-detect" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        {availableSuperFunds.map((fund) => (
                          <SelectItem key={fund.provider} value={fund.name}>
                            {fund.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* File Drop Zone */}
                <FileDropZone
                  onFileSelect={handleSuperFileSelect}
                  selectedFile={selectedFile}
                  onClear={handleSuperClear}
                  disabled={superParsing}
                />

                {/* Progress */}
                {superParsing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Parsing super statement...</span>
                    </div>
                    <Progress value={50} />
                  </div>
                )}

                {/* Parse Error */}
                {superError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{superError}</AlertDescription>
                  </Alert>
                )}

                {/* Parse Result */}
                {superParseResult && !superParsing && (
                  <div className="space-y-4">
                    {superParseResult.success ? (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle>Statement Parsed</AlertTitle>
                        <AlertDescription>
                          <span className="font-medium">{superParseResult.account.providerName}</span>
                          {superParseResult.account.memberNumber && (
                            <span> - Member #{superParseResult.account.memberNumber}</span>
                          )}
                          <span className="block text-xs mt-1">
                            Balance: ${superParseResult.account.totalBalance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="block text-xs">
                            {superParseResult.transactions.length} transaction(s) found
                          </span>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Parse Failed</AlertTitle>
                        <AlertDescription>
                          {superParseResult.errors.join('. ')}
                        </AlertDescription>
                      </Alert>
                    )}

                    {superParseResult.warnings.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Warnings</AlertTitle>
                        <AlertDescription>
                          {superParseResult.warnings.join('. ')}
                        </AlertDescription>
                      </Alert>
                    )}

                    {superParseResult.success && (
                      <Button onClick={handleSuperContinueToPreview} className="w-full">
                        Continue to Preview
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supported Super Funds */}
            <Card>
              <CardHeader>
                <CardTitle>Supported Super Funds</CardTitle>
                <CardDescription>
                  We currently support these Australian super funds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'UniSuper', supported: true },
                    { name: 'Australian Super', supported: true },
                    { name: 'REST Super', supported: false },
                    { name: 'Hostplus', supported: false },
                  ].map((fund) => (
                    <div
                      key={fund.name}
                      className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50"
                    >
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{fund.name}</span>
                      {fund.supported ? (
                        <Badge variant="default" className="ml-auto text-xs">
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Soon
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Preview Step - Bank */}
        {step === 'preview' && importType === 'bank' && parseResult && (
          <Card>
            <CardHeader>
              <CardTitle>Preview & Import</CardTitle>
              <CardDescription>
                Review the transactions and select which ones to import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Import to Account *
                </label>
                <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {accounts.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    No accounts found. Please create an account first.
                  </p>
                )}
              </div>

              {/* Transaction Preview */}
              <TransactionPreview
                transactions={parseResult.transactions}
                onSelectionChange={setSelectedTransactions}
              />

              {/* Actions */}
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleClear}>
                  Back
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={
                    !targetAccountId ||
                    selectedTransactions.length === 0 ||
                    isImporting
                  }
                  className="flex-1"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${selectedTransactions.length} Transactions`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Step - Super */}
        {step === 'preview' && importType === 'super' && superParseResult && (
          <Card>
            <CardHeader>
              <CardTitle>Preview & Import Super Statement</CardTitle>
              <CardDescription>
                Review the account details and transactions before importing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Info */}
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3 mb-3">
                  <Landmark className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold">{superParseResult.account.providerName}</h3>
                    {superParseResult.account.memberNumber && (
                      <p className="text-sm text-muted-foreground">
                        Member #{superParseResult.account.memberNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Balance</p>
                    <p className="font-semibold text-lg">
                      ${superParseResult.account.totalBalance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Preserved</p>
                    <p className="font-medium">
                      ${(superParseResult.account.preservedBalance ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Restricted Non-Preserved</p>
                    <p className="font-medium">
                      ${(superParseResult.account.restrictedNonPreserved ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unrestricted Non-Preserved</p>
                    <p className="font-medium">
                      ${(superParseResult.account.unrestrictedNonPreserved ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Account Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Import to Super Account (optional)
                </label>
                <Select value={targetSuperAccountId} onValueChange={setTargetSuperAccountId}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Create new account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Create new account</SelectItem>
                    {superAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.providerName} {account.memberNumber && `(#${account.memberNumber})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select an existing account to update, or leave blank to create a new one
                </p>
              </div>

              {/* Transactions Preview */}
              {superParseResult.transactions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">
                    Transactions ({superParseResult.transactions.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Description</th>
                          <th className="text-right p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {superParseResult.transactions.map((t, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{t.date.toLocaleDateString('en-AU')}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-xs">
                                {t.type.replace(/-/g, ' ')}
                              </Badge>
                            </td>
                            <td className="p-2">{t.description}</td>
                            <td className={`p-2 text-right font-medium ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleSuperClear}>
                  Back
                </Button>
                <Button
                  onClick={handleSuperImport}
                  disabled={isImporting}
                  className="flex-1"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import Super Statement`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <>
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
                  <h3 className="text-2xl font-semibold">Import Complete!</h3>
                  <p className="text-muted-foreground">
                    {importType === 'bank'
                      ? `Successfully imported ${importedCount} transactions`
                      : importedCount > 0
                        ? `Successfully imported super account with ${importedCount} transactions`
                        : 'Successfully imported super account'
                    }
                  </p>
                  <div className="flex justify-center gap-4 pt-4">
                    <Button variant="outline" onClick={handleStartOver}>
                      Import Another
                    </Button>
                    <Button onClick={() => (window.location.href = importType === 'bank' ? '/transactions' : '/superannuation')}>
                      {importType === 'bank' ? 'View Transactions' : 'View Superannuation'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </>
        )}
      </div>
    </>
  );
}
