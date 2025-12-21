'use client';

import { useEffect, useState, useRef } from 'react';
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

const POLL_INTERVAL = 15000; // 15 seconds when active
const AI_CHECK_INTERVAL = 30000; // 30 seconds when active
const INACTIVE_MULTIPLIER = 4; // Poll 4x slower when tab inactive (60s / 120s)
const MIN_FETCH_INTERVAL = 5000; // Don't fetch more than once per 5 seconds

export function useCategorization(): UseCategorization {
  const [transactionCounts, setTransactionCounts] = useState<TransactionCounts>({
    total: 0,
    uncategorized: 0,
    categorized: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const processingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const countsIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const aiIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Check AI availability
  const checkAiStatus = async () => {
    try {
      const available = await llmCategorizationService.checkAvailability();
      console.log('[AI Status] Available:', available);
      setAiAvailable(available);
    } catch (error) {
      console.error('[AI Status] Error checking availability:', error);
      setAiAvailable(false);
    }
  };

  // Fetch transaction counts with deduplication
  const fetchCounts = async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      return; // Skip if fetched recently
    }
    lastFetchRef.current = now;

    try {
      const txCounts = await llmCategorizationService.getTransactionCounts();
      setTransactionCounts(txCounts);
    } catch (error) {
      console.error('Failed to fetch transaction counts:', error);
    }
  };

  // Force recategorization using LLM
  const forceRecategorize = async (includeAlreadyCategorized: boolean) => {
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
  };

  // Track page visibility for adaptive polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fetch counts on mount and set up adaptive polling based on visibility
  useEffect(() => {
    fetchCounts();
    checkAiStatus();

    // Clear existing intervals
    if (countsIntervalRef.current) clearInterval(countsIntervalRef.current);
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);

    // Set up new intervals based on visibility
    const countsInterval = isVisible ? POLL_INTERVAL : POLL_INTERVAL * INACTIVE_MULTIPLIER;
    const aiInterval = isVisible ? AI_CHECK_INTERVAL : AI_CHECK_INTERVAL * INACTIVE_MULTIPLIER;

    countsIntervalRef.current = setInterval(fetchCounts, countsInterval);
    aiIntervalRef.current = setInterval(checkAiStatus, aiInterval);

    return () => {
      if (countsIntervalRef.current) clearInterval(countsIntervalRef.current);
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    };
  }, [isVisible]);

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
