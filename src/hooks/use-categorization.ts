'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { categorizationService, type QueueStatus } from '@/lib/ai/categorization';
import { useAIStore } from '@/stores/ai.store';
import { toast } from 'sonner';

interface TransactionCounts {
  total: number;
  uncategorized: number;
  categorized: number;
}

interface UseCategorization {
  status: QueueStatus;
  transactionCounts: TransactionCounts;
  isProcessing: boolean;
  processQueue: () => Promise<void>;
  retryFailed: () => Promise<void>;
  clearCompleted: () => Promise<void>;
  forceRecategorize: (includeAlreadyCategorized: boolean) => Promise<void>;
}

const POLL_INTERVAL = 5000; // 5 seconds

export function useCategorization(): UseCategorization {
  const [status, setStatus] = useState<QueueStatus>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [transactionCounts, setTransactionCounts] = useState<TransactionCounts>({
    total: 0,
    uncategorized: 0,
    categorized: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  const { connectionStatus, isModelReady, settings } = useAIStore();
  const isAIReady = connectionStatus === 'connected' && isModelReady;

  // Fetch queue status and transaction counts
  const fetchStatus = useCallback(async () => {
    try {
      const [queueStatus, txCounts] = await Promise.all([
        categorizationService.getQueueStatus(),
        categorizationService.getTransactionCounts(),
      ]);
      setStatus(queueStatus);
      setTransactionCounts(txCounts);
    } catch (error) {
      console.error('Failed to fetch categorization queue status:', error);
    }
  }, []);

  // Process the queue
  const processQueue = useCallback(async () => {
    if (!isAIReady || !settings.autoCategorize || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const result = await categorizationService.processQueue();

      if (result.processed > 0) {
        toast.success(`Categorized ${result.processed} transaction(s)`);
      }

      if (result.failed > 0) {
        toast.warning(`Failed to categorize ${result.failed} transaction(s)`);
      }

      // Refresh status
      await fetchStatus();
    } catch (error) {
      console.error('Failed to process categorization queue:', error);
      toast.error('Failed to process categorization queue');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [isAIReady, settings.autoCategorize, fetchStatus]);

  // Retry failed items
  const retryFailed = useCallback(async () => {
    try {
      const count = await categorizationService.retryFailed();
      if (count > 0) {
        toast.info(`Retrying ${count} failed categorization(s)`);
        await fetchStatus();
        await processQueue();
      }
    } catch (error) {
      console.error('Failed to retry categorization:', error);
    }
  }, [fetchStatus, processQueue]);

  // Clear completed items
  const clearCompleted = useCallback(async () => {
    try {
      const count = await categorizationService.clearCompletedItems();
      if (count > 0) {
        toast.success(`Cleared ${count} completed item(s)`);
        await fetchStatus();
      }
    } catch (error) {
      console.error('Failed to clear completed items:', error);
    }
  }, [fetchStatus]);

  // Force recategorization
  const forceRecategorize = useCallback(
    async (includeAlreadyCategorized: boolean) => {
      try {
        const count = await categorizationService.forceRecategorize(
          undefined,
          includeAlreadyCategorized
        );
        if (count > 0) {
          toast.info(
            `Queued ${count} transaction(s) for ${includeAlreadyCategorized ? 're-' : ''}categorization`
          );
          await fetchStatus();
          // Automatically start processing if AI is ready
          if (isAIReady && !processingRef.current) {
            processQueue();
          }
        } else {
          toast.info('No transactions to categorize');
        }
      } catch (error) {
        console.error('Failed to force recategorization:', error);
        toast.error('Failed to queue transactions for categorization');
      }
    },
    [fetchStatus, isAIReady, processQueue]
  );

  // Poll for status and process queue
  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(async () => {
      await fetchStatus();

      // Auto-process if there are pending items and AI is ready
      const currentStatus = await categorizationService.getQueueStatus();
      if (
        currentStatus.pending > 0 &&
        isAIReady &&
        settings.autoCategorize &&
        !processingRef.current
      ) {
        processQueue();
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchStatus, isAIReady, settings.autoCategorize, processQueue]);

  return {
    status,
    transactionCounts,
    isProcessing,
    processQueue,
    retryFailed,
    clearCompleted,
    forceRecategorize,
  };
}

/**
 * Simpler hook for just displaying categorization status
 */
export function useCategorizationStatus(): {
  hasPending: boolean;
  pendingCount: number;
  isProcessing: boolean;
} {
  const { status, isProcessing } = useCategorization();

  return {
    hasPending: status.pending > 0,
    pendingCount: status.pending,
    isProcessing,
  };
}
