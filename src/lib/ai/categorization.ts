import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { ollamaClient } from './ollama-client';
import { SYSTEM_PROMPTS, buildCategorizationPrompt } from './prompts';
import type {
  Transaction,
  Category,
  CategorizationQueueItem,
  CategorizationResult,
  CategorizationStatus,
} from '@/types';

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface ProcessingResult {
  processed: number;
  failed: number;
  errors: string[];
}

/**
 * Categorization service for AI-powered transaction categorization
 */
class CategorizationService {
  private isProcessing = false;
  private batchSize = 5; // Process transactions in batches

  /**
   * Queue transactions for background categorization
   */
  async queueForCategorization(transactionIds: string[]): Promise<void> {
    const now = new Date();
    const items: CategorizationQueueItem[] = transactionIds.map((id) => ({
      id: uuidv4(),
      transactionId: id,
      status: 'pending' as CategorizationStatus,
      createdAt: now,
    }));

    await db.categorizationQueue.bulkAdd(items);
  }

  /**
   * Get the current queue status
   */
  async getQueueStatus(): Promise<QueueStatus> {
    const all = await db.categorizationQueue.toArray();

    return {
      pending: all.filter((i) => i.status === 'pending').length,
      processing: all.filter((i) => i.status === 'processing').length,
      completed: all.filter((i) => i.status === 'completed').length,
      failed: all.filter((i) => i.status === 'failed').length,
    };
  }

  /**
   * Process the categorization queue
   */
  async processQueue(): Promise<ProcessingResult> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0, errors: ['Already processing'] };
    }

    this.isProcessing = true;
    const result: ProcessingResult = { processed: 0, failed: 0, errors: [] };

    try {
      // Get pending items
      const pendingItems = await db.categorizationQueue
        .where('status')
        .equals('pending')
        .limit(this.batchSize)
        .toArray();

      if (pendingItems.length === 0) {
        return result;
      }

      // Mark as processing
      await Promise.all(
        pendingItems.map((item) =>
          db.categorizationQueue.update(item.id, { status: 'processing' })
        )
      );

      // Get categories once
      const categories = await db.categories
        .filter((c) => c.isActive)
        .toArray();

      // Process each item
      for (const item of pendingItems) {
        try {
          const transaction = await db.transactions.get(item.transactionId);

          if (!transaction) {
            await db.categorizationQueue.update(item.id, {
              status: 'failed',
              error: 'Transaction not found',
              processedAt: new Date(),
            });
            result.failed++;
            continue;
          }

          // Skip if already categorized
          if (transaction.categoryId) {
            await db.categorizationQueue.update(item.id, {
              status: 'completed',
              processedAt: new Date(),
            });
            result.processed++;
            continue;
          }

          // Categorize the transaction
          const categorization = await this.categorizeTransaction(
            transaction,
            categories
          );

          // Update the queue item
          await db.categorizationQueue.update(item.id, {
            status: 'completed',
            suggestedCategoryId: categorization.categoryId,
            confidence: categorization.confidence,
            reasoning: categorization.reasoning,
            processedAt: new Date(),
          });

          // Update the transaction if confidence is high enough (> 0.7)
          if (categorization.confidence > 0.7) {
            await db.transactions.update(transaction.id, {
              categoryId: categorization.categoryId,
              updatedAt: new Date(),
            });
          }

          result.processed++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(errorMessage);

          await db.categorizationQueue.update(item.id, {
            status: 'failed',
            error: errorMessage,
            processedAt: new Date(),
          });
          result.failed++;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Categorize a single transaction
   */
  async categorizeTransaction(
    transaction: Transaction,
    categories: Category[]
  ): Promise<CategorizationResult> {
    // Determine amount sign based on transaction type
    const amount =
      transaction.type === 'expense' ? -transaction.amount : transaction.amount;

    // Build the prompt
    const prompt = buildCategorizationPrompt(
      transaction.description,
      amount,
      categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))
    );

    try {
      // Get AI response
      const response = await ollamaClient.generate(
        prompt,
        SYSTEM_PROMPTS.categorization
      );

      // Parse JSON response
      const parsed = this.parseCategorizationResponse(response, categories);
      return parsed;
    } catch (error) {
      // Fallback to simple keyword matching
      return this.fallbackCategorization(transaction, categories);
    }
  }

  /**
   * Parse the AI categorization response
   */
  private parseCategorizationResponse(
    response: string,
    categories: Category[]
  ): CategorizationResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate category exists
      const categoryExists = categories.some((c) => c.id === parsed.categoryId);
      if (!categoryExists) {
        throw new Error('Invalid category ID');
      }

      return {
        categoryId: parsed.categoryId,
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch {
      throw new Error('Failed to parse categorization response');
    }
  }

  /**
   * Fallback categorization using simple keyword matching
   */
  private fallbackCategorization(
    transaction: Transaction,
    categories: Category[]
  ): CategorizationResult {
    const description = transaction.description.toLowerCase();

    // Simple keyword mapping
    const keywordMap: Record<string, string[]> = {
      groceries: ['woolworths', 'coles', 'aldi', 'iga', 'supermarket', 'grocery'],
      transport: ['uber', 'lyft', 'taxi', 'fuel', 'petrol', 'shell', 'bp', 'caltex', 'ampol'],
      utilities: ['electricity', 'gas', 'water', 'internet', 'telstra', 'optus', 'vodafone'],
      entertainment: ['netflix', 'spotify', 'disney', 'cinema', 'movies', 'theatre'],
      dining: ['restaurant', 'cafe', 'coffee', 'mcdonald', 'kfc', 'subway', 'hungry jack'],
      insurance: ['insurance', 'nrma', 'allianz', 'aami', 'suncorp'],
      health: ['pharmacy', 'chemist', 'medical', 'doctor', 'hospital', 'dental'],
      shopping: ['amazon', 'ebay', 'kmart', 'target', 'big w', 'jb hi-fi'],
      salary: ['salary', 'wage', 'payroll', 'pay'],
      transfer: ['transfer', 'bpay', 'pay anyone'],
    };

    // Find matching category
    for (const [categoryName, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (description.includes(keyword)) {
          const matchedCategory = categories.find(
            (c) => c.name.toLowerCase().includes(categoryName)
          );
          if (matchedCategory) {
            return {
              categoryId: matchedCategory.id,
              confidence: 0.5, // Lower confidence for fallback
              reasoning: `Matched keyword: "${keyword}"`,
            };
          }
        }
      }
    }

    // No match found - return uncategorized with low confidence
    const uncategorized = categories.find(
      (c) => c.name.toLowerCase() === 'uncategorized' || c.name.toLowerCase() === 'other'
    );

    return {
      categoryId: uncategorized?.id || categories[0]?.id || '',
      confidence: 0.1,
      reasoning: 'No matching keywords found',
    };
  }

  /**
   * Clear completed items from the queue
   */
  async clearCompletedItems(): Promise<number> {
    const completed = await db.categorizationQueue
      .where('status')
      .equals('completed')
      .toArray();

    await db.categorizationQueue.bulkDelete(completed.map((i) => i.id));
    return completed.length;
  }

  /**
   * Clear all items from the queue
   */
  async clearQueue(): Promise<void> {
    await db.categorizationQueue.clear();
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<number> {
    const failed = await db.categorizationQueue
      .where('status')
      .equals('failed')
      .toArray();

    await Promise.all(
      failed.map((item) =>
        db.categorizationQueue.update(item.id, {
          status: 'pending',
          error: undefined,
          processedAt: undefined,
        })
      )
    );

    return failed.length;
  }

  /**
   * Force recategorization of transactions
   * @param transactionIds - specific IDs to recategorize, or undefined for bulk operations
   * @param includeAlreadyCategorized - if true, also recategorize transactions that already have a category
   * @returns number of transactions queued for recategorization
   */
  async forceRecategorize(
    transactionIds?: string[],
    includeAlreadyCategorized: boolean = false
  ): Promise<number> {
    let transactions: Transaction[];

    if (transactionIds && transactionIds.length > 0) {
      // Specific transactions requested
      transactions = await db.transactions
        .where('id')
        .anyOf(transactionIds)
        .toArray();
    } else if (includeAlreadyCategorized) {
      // All transactions
      transactions = await db.transactions.toArray();
    } else {
      // Only uncategorized transactions
      transactions = await db.transactions
        .filter((t) => !t.categoryId)
        .toArray();
    }

    if (transactions.length === 0) {
      return 0;
    }

    // Filter out transactions that are already in the queue
    const existingQueueItems = await db.categorizationQueue.toArray();
    const queuedTransactionIds = new Set(existingQueueItems.map((i) => i.transactionId));

    const transactionsToQueue = transactions.filter(
      (t) => !queuedTransactionIds.has(t.id)
    );

    // For transactions already in queue but with 'completed' or 'failed' status,
    // reset them to pending if we're forcing recategorization
    const itemsToReset = existingQueueItems.filter(
      (item) =>
        (item.status === 'completed' || item.status === 'failed') &&
        transactions.some((t) => t.id === item.transactionId)
    );

    if (itemsToReset.length > 0) {
      await Promise.all(
        itemsToReset.map((item) =>
          db.categorizationQueue.update(item.id, {
            status: 'pending',
            error: undefined,
            processedAt: undefined,
            suggestedCategoryId: undefined,
            confidence: undefined,
            reasoning: undefined,
          })
        )
      );
    }

    // Clear the category from transactions if we're forcing recategorization
    if (includeAlreadyCategorized) {
      const now = new Date();
      await Promise.all(
        transactions.map((t) =>
          db.transactions.update(t.id, {
            categoryId: undefined,
            updatedAt: now,
          })
        )
      );
    }

    // Queue new transactions
    if (transactionsToQueue.length > 0) {
      await this.queueForCategorization(transactionsToQueue.map((t) => t.id));
    }

    return transactionsToQueue.length + itemsToReset.length;
  }

  /**
   * Get total transaction counts for UI display
   */
  async getTransactionCounts(): Promise<{
    total: number;
    uncategorized: number;
    categorized: number;
  }> {
    const all = await db.transactions.toArray();
    const uncategorized = all.filter((t) => !t.categoryId).length;

    return {
      total: all.length,
      uncategorized,
      categorized: all.length - uncategorized,
    };
  }
}

// Singleton instance
export const categorizationService = new CategorizationService();
