'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { llmCategorizationService } from '@/lib/ai/llm-categorization';
import { toast } from 'sonner';

interface TransactionCounts {
  total: number;
  uncategorized: number;
  categorized: number;
}

interface UseCategorization {
  transactionCounts: TransactionCounts;
  isProcessing: boolean;
  aiAvailable: boolean;
  forceRecategorize: (includeAlreadyCategorized: boolean) => Promise<void>;
  checkAiStatus: () => Promise<void>;
}

const POLL_INTERVAL = 15000; // 15 seconds
const AI_CHECK_INTERVAL = 30000; // 30 seconds

export function useCategorization(): UseCategorization {
  const [transactionCounts, setTransactionCounts] = useState<TransactionCounts>({
    total: 0,
    uncategorized: 0,
    categorized: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const processingRef = useRef(false);

  // Check AI availability
  const checkAiStatus = useCallback(async () => {
    try {
      const available = await llmCategorizationService.checkAvailability();
      console.log('[AI Status] Available:', available);
      setAiAvailable(available);
    } catch (error) {
      console.error('[AI Status] Error checking availability:', error);
      setAiAvailable(false);
    }
  }, []);

  // Fetch transaction counts
  const fetchCounts = useCallback(async () => {
    try {
      const txCounts = await llmCategorizationService.getTransactionCounts();
      setTransactionCounts(txCounts);
    } catch (error) {
      console.error('Failed to fetch transaction counts:', error);
    }
  }, []);

  // Force recategorization using LLM
  const forceRecategorize = useCallback(
    async (includeAlreadyCategorized: boolean) => {
      if (processingRef.current) return;

      // Check AI availability first
      const available = await llmCategorizationService.checkAvailability();
      if (!available) {
        toast.error('AI is not available. Please start Ollama and try again.');
        return;
      }

      processingRef.current = true;
      setIsProcessing(true);

      try {
        toast.info(
          `Processing transactions for ${includeAlreadyCategorized ? 're-' : ''}categorization...`
        );

        const categorizedCount = await llmCategorizationService.forceRecategorize(
          includeAlreadyCategorized
        );

        if (categorizedCount > 0) {
          toast.success(`AI categorized ${categorizedCount} transaction(s)`);
        } else {
          toast.info('No transactions were categorized');
        }

        await fetchCounts();
      } catch (error) {
        console.error('Failed to recategorize:', error);
        toast.error('Failed to categorize transactions');
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    },
    [fetchCounts]
  );

  // Fetch counts on mount and set up polling
  useEffect(() => {
    fetchCounts();
    checkAiStatus();

    const countsInterval = setInterval(fetchCounts, POLL_INTERVAL);
    const aiInterval = setInterval(checkAiStatus, AI_CHECK_INTERVAL);

    return () => {
      clearInterval(countsInterval);
      clearInterval(aiInterval);
    };
  }, [fetchCounts, checkAiStatus]);

  return {
    transactionCounts,
    isProcessing,
    aiAvailable,
    forceRecategorize,
    checkAiStatus,
  };
}

/**
 * Simpler hook for just displaying categorization status
 */
export function useCategorizationStatus(): {
  uncategorizedCount: number;
  isProcessing: boolean;
  aiAvailable: boolean;
} {
  const { transactionCounts, isProcessing, aiAvailable } = useCategorization();

  return {
    uncategorizedCount: transactionCounts.uncategorized,
    isProcessing,
    aiAvailable,
  };
}
