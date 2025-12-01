import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { ollamaClient } from './ollama-client';
import {
  SYSTEM_PROMPTS,
  buildBatchCategorizationPrompt,
  parseBatchCategorizationResponse,
} from './prompts';
import { normalizeMerchantName, groupByMerchant } from './merchant-normalizer';
import { AUSTRALIAN_MERCHANTS, findMerchantMapping } from './australian-merchants';
import type {
  Transaction,
  Category,
  CategorizationQueueItem,
  CategorizationResult,
  CategorizationStatus,
  MerchantPattern,
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
  tier1Matches: number; // From merchant pattern cache
  tier2Matches: number; // From keyword/Australian merchants
  tier3Matches: number; // From AI
}

interface CategoryMatchResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
  tier: 'pattern-cache' | 'australian-merchants' | 'keyword' | 'ai';
}

/**
 * Categorization service with tiered processing for efficiency
 *
 * Tier 1: Merchant Pattern Cache (learned from past categorizations)
 * Tier 2: Australian Merchant Database + Keyword Matching
 * Tier 3: Batch AI Categorization (only for uncertain cases)
 */
class CategorizationService {
  private isProcessing = false;
  private batchSize = 10; // Process more transactions per batch
  private aiBatchSize = 8; // Number of transactions per AI call
  private minConfidenceForAuto = 0.75; // Minimum confidence to auto-apply

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
   * Process the categorization queue with tiered approach
   */
  async processQueue(): Promise<ProcessingResult> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0, errors: ['Already processing'], tier1Matches: 0, tier2Matches: 0, tier3Matches: 0 };
    }

    this.isProcessing = true;
    const result: ProcessingResult = {
      processed: 0,
      failed: 0,
      errors: [],
      tier1Matches: 0,
      tier2Matches: 0,
      tier3Matches: 0,
    };

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

      // Get all transactions at once
      const transactionIds = pendingItems.map((i) => i.transactionId);
      const transactions = await db.transactions
        .where('id')
        .anyOf(transactionIds)
        .toArray();

      // Build transaction map for quick lookup
      const txMap = new Map(transactions.map((t) => [t.id, t]));

      // Get categories once
      const categories = await db.categories.filter((c) => c.isActive).toArray();
      const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
      const categoryIdMap = new Map(categories.map((c) => [c.id, c]));

      // Get merchant patterns
      const patterns = await db.merchantPatterns.toArray();
      const patternMap = new Map(patterns.map((p) => [p.normalizedName, p]));

      // Process each item with tiered approach
      const needsAI: Array<{ item: CategorizationQueueItem; transaction: Transaction }> = [];

      for (const item of pendingItems) {
        const transaction = txMap.get(item.transactionId);

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

        // Try tiered categorization
        const normalizedMerchant = normalizeMerchantName(transaction.description);

        // Tier 1: Check merchant pattern cache
        const pattern = patternMap.get(normalizedMerchant);
        if (pattern && pattern.confidence >= 0.8) {
          const category = categoryIdMap.get(pattern.categoryId);
          if (category) {
            await this.applyCategorization(item, transaction, {
              categoryId: pattern.categoryId,
              categoryName: category.name,
              confidence: pattern.confidence,
              reasoning: `Learned pattern: "${normalizedMerchant}"`,
              tier: 'pattern-cache',
            });
            await this.updatePatternUsage(pattern.id);
            result.processed++;
            result.tier1Matches++;
            continue;
          }
        }

        // Tier 2: Check Australian merchant database
        const merchantMatch = findMerchantMapping(normalizedMerchant);
        if (merchantMatch && merchantMatch.confidence >= 0.8) {
          const category = categoryMap.get(merchantMatch.category.toLowerCase());
          if (category) {
            await this.applyCategorization(item, transaction, {
              categoryId: category.id,
              categoryName: category.name,
              confidence: merchantMatch.confidence,
              reasoning: `Australian merchant: "${normalizedMerchant}"`,
              tier: 'australian-merchants',
            });
            // Learn this pattern for future
            await this.learnPattern(normalizedMerchant, transaction.description, category.id, category.name, merchantMatch.confidence);
            result.processed++;
            result.tier2Matches++;
            continue;
          }
        }

        // Tier 2b: Keyword matching fallback
        const keywordMatch = this.keywordCategorization(transaction, categories);
        if (keywordMatch && keywordMatch.confidence >= 0.7) {
          const category = categoryIdMap.get(keywordMatch.categoryId);
          if (category) {
            await this.applyCategorization(item, transaction, {
              categoryId: keywordMatch.categoryId,
              categoryName: category.name,
              confidence: keywordMatch.confidence,
              reasoning: keywordMatch.reasoning,
              tier: 'keyword',
            });
            // Learn this pattern
            await this.learnPattern(normalizedMerchant, transaction.description, category.id, category.name, keywordMatch.confidence * 0.9);
            result.processed++;
            result.tier2Matches++;
            continue;
          }
        }

        // If no match found, queue for AI processing
        needsAI.push({ item, transaction });
      }

      // Tier 3: Batch AI categorization for remaining items
      if (needsAI.length > 0) {
        const aiResults = await this.batchAICategorization(
          needsAI.map((n) => n.transaction),
          categories
        );

        for (let i = 0; i < needsAI.length; i++) {
          const { item, transaction } = needsAI[i];
          const aiResult = aiResults[i];

          if (aiResult) {
            const category = categoryMap.get(aiResult.category.toLowerCase()) ||
              categories.find((c) => c.name.toLowerCase().includes(aiResult.category.toLowerCase()));

            if (category) {
              await this.applyCategorization(item, transaction, {
                categoryId: category.id,
                categoryName: category.name,
                confidence: aiResult.confidence,
                reasoning: aiResult.reasoning,
                tier: 'ai',
              });

              // Learn from AI result
              const normalizedMerchant = normalizeMerchantName(transaction.description);
              if (aiResult.confidence >= 0.7) {
                await this.learnPattern(normalizedMerchant, transaction.description, category.id, category.name, aiResult.confidence * 0.8);
              }

              result.processed++;
              result.tier3Matches++;
            } else {
              // Couldn't find matching category
              await db.categorizationQueue.update(item.id, {
                status: 'failed',
                error: `AI suggested unknown category: ${aiResult.category}`,
                processedAt: new Date(),
              });
              result.failed++;
            }
          } else {
            await db.categorizationQueue.update(item.id, {
              status: 'failed',
              error: 'AI categorization failed',
              processedAt: new Date(),
            });
            result.failed++;
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Apply categorization result to queue item and transaction
   */
  private async applyCategorization(
    item: CategorizationQueueItem,
    transaction: Transaction,
    match: CategoryMatchResult
  ): Promise<void> {
    const now = new Date();

    // Update queue item
    await db.categorizationQueue.update(item.id, {
      status: 'completed',
      suggestedCategoryId: match.categoryId,
      confidence: match.confidence,
      reasoning: `[${match.tier}] ${match.reasoning}`,
      processedAt: now,
    });

    // Update transaction if confidence is high enough
    if (match.confidence >= this.minConfidenceForAuto) {
      await db.transactions.update(transaction.id, {
        categoryId: match.categoryId,
        updatedAt: now,
      });
    }
  }

  /**
   * Batch AI categorization for multiple transactions
   */
  private async batchAICategorization(
    transactions: Transaction[],
    categories: Category[]
  ): Promise<Array<{ category: string; confidence: number; reasoning: string } | null>> {
    if (transactions.length === 0) return [];

    // Process in smaller batches for AI
    const results: Array<{ category: string; confidence: number; reasoning: string } | null> = [];

    for (let i = 0; i < transactions.length; i += this.aiBatchSize) {
      const batch = transactions.slice(i, i + this.aiBatchSize);
      const batchPrompt = buildBatchCategorizationPrompt(
        batch.map((t) => ({
          id: t.id,
          description: t.description,
          amount: t.type === 'expense' ? -t.amount : t.amount,
        }))
      );

      try {
        const response = await ollamaClient.generate(batchPrompt, SYSTEM_PROMPTS.categorization);
        const parsed = parseBatchCategorizationResponse(response);

        if (parsed) {
          // Map results back to transactions
          const resultMap = new Map(parsed.map((p) => [p.id, p]));
          for (const tx of batch) {
            const result = resultMap.get(tx.id);
            if (result) {
              results.push({
                category: result.category,
                confidence: result.confidence,
                reasoning: result.reasoning,
              });
            } else {
              results.push(null);
            }
          }
        } else {
          // Batch parsing failed, try individual fallback
          for (const tx of batch) {
            const fallback = this.keywordCategorization(tx, categories);
            if (fallback) {
              const cat = categories.find((c) => c.id === fallback.categoryId);
              results.push({
                category: cat?.name || 'Other Expense',
                confidence: fallback.confidence * 0.8,
                reasoning: fallback.reasoning,
              });
            } else {
              results.push({
                category: 'Other Expense',
                confidence: 0.3,
                reasoning: 'Fallback - AI batch failed',
              });
            }
          }
        }
      } catch (error) {
        // AI call failed, use fallback for entire batch
        for (const tx of batch) {
          const fallback = this.keywordCategorization(tx, categories);
          if (fallback) {
            const cat = categories.find((c) => c.id === fallback.categoryId);
            results.push({
              category: cat?.name || 'Other Expense',
              confidence: fallback.confidence * 0.7,
              reasoning: `Fallback: ${fallback.reasoning}`,
            });
          } else {
            results.push({
              category: 'Other Expense',
              confidence: 0.2,
              reasoning: 'Fallback - AI unavailable',
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Keyword-based categorization fallback
   */
  private keywordCategorization(
    transaction: Transaction,
    categories: Category[]
  ): CategorizationResult | null {
    const description = transaction.description.toLowerCase();

    // Enhanced keyword mapping with Australian merchants
    const keywordMap: Record<string, { keywords: string[]; confidence: number }> = {
      'groceries': { keywords: ['woolworths', 'coles', 'aldi', 'iga', 'supermarket', 'grocery', 'foodworks', 'harris farm'], confidence: 0.85 },
      'fuel': { keywords: ['bp', 'shell', 'caltex', 'ampol', 'petrol', 'fuel', '7-eleven', '7eleven', 'united petroleum', 'puma', 'coles express'], confidence: 0.85 },
      'transport': { keywords: ['uber trip', 'didi', 'ola', 'taxi', 'opal', 'myki', 'go card', 'translink', 'toll', 'linkt', 'etoll'], confidence: 0.85 },
      'dining out': { keywords: ['restaurant', 'cafe', 'coffee', 'mcdonald', 'kfc', 'subway', 'hungry jack', 'uber eats', 'menulog', 'doordash', 'deliveroo', 'domino', 'pizza'], confidence: 0.85 },
      'utilities': { keywords: ['electricity', 'energy', 'gas', 'water', 'telstra', 'optus', 'vodafone', 'tpg', 'iinet', 'nbn', 'origin', 'agl', 'sydney water'], confidence: 0.85 },
      'subscriptions': { keywords: ['netflix', 'spotify', 'disney', 'stan', 'binge', 'kayo', 'youtube premium', 'apple music', 'amazon prime'], confidence: 0.90 },
      'insurance': { keywords: ['insurance', 'nrma', 'allianz', 'aami', 'suncorp', 'gio', 'youi', 'budget direct', 'medibank', 'bupa', 'hcf', 'nib'], confidence: 0.85 },
      'healthcare': { keywords: ['pharmacy', 'chemist', 'medical', 'doctor', 'hospital', 'dental', 'dentist', 'medicare', 'specsavers', 'pathology'], confidence: 0.80 },
      'shopping': { keywords: ['amazon', 'ebay', 'kmart', 'target', 'big w', 'jb hi-fi', 'jb hifi', 'bunnings', 'officeworks', 'harvey norman', 'myer', 'david jones'], confidence: 0.80 },
      'salary': { keywords: ['salary', 'wage', 'payroll', 'pay slip'], confidence: 0.90 },
      'government payments': { keywords: ['centrelink', 'services australia', 'ato', 'tax refund'], confidence: 0.90 },
      'transfer': { keywords: ['transfer', 'bpay', 'pay anyone', 'osko', 'payid'], confidence: 0.80 },
      'fees & charges': { keywords: ['fee', 'atm fee', 'account fee', 'service fee', 'overdrawn', 'dishonour'], confidence: 0.85 },
      'cash withdrawal': { keywords: ['atm withdrawal', 'cash withdrawal', 'cash out'], confidence: 0.90 },
      'gambling': { keywords: ['sportsbet', 'tab', 'bet365', 'ladbrokes', 'pointsbet', 'lotto', 'lottery', 'casino'], confidence: 0.90 },
      'entertainment': { keywords: ['cinema', 'movie', 'hoyts', 'event cinemas', 'ticketek', 'ticketmaster', 'gym', 'fitness'], confidence: 0.80 },
      'travel': { keywords: ['qantas', 'virgin australia', 'jetstar', 'flight centre', 'airbnb', 'booking.com', 'expedia', 'hotel'], confidence: 0.85 },
      'personal care': { keywords: ['hairdresser', 'barber', 'beauty', 'nail', 'spa', 'massage', 'mecca', 'sephora'], confidence: 0.80 },
      'pets': { keywords: ['petbarn', 'pet stock', 'vet', 'veterinary', 'pet circle'], confidence: 0.85 },
      'education': { keywords: ['tafe', 'university', 'school', 'college', 'hecs', 'childcare', 'kindy'], confidence: 0.80 },
    };

    // Find best matching category
    let bestMatch: { categoryName: string; confidence: number; keyword: string } | null = null;

    for (const [categoryName, { keywords, confidence }] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (description.includes(keyword)) {
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { categoryName, confidence, keyword };
          }
        }
      }
    }

    if (bestMatch) {
      const category = categories.find(
        (c) => c.name.toLowerCase() === bestMatch!.categoryName ||
          c.name.toLowerCase().includes(bestMatch!.categoryName.split(' ')[0])
      );

      if (category) {
        return {
          categoryId: category.id,
          confidence: bestMatch.confidence,
          reasoning: `Keyword match: "${bestMatch.keyword}"`,
        };
      }
    }

    return null;
  }

  /**
   * Learn from a categorization result
   */
  private async learnPattern(
    normalizedName: string,
    originalDescription: string,
    categoryId: string,
    categoryName: string,
    confidence: number
  ): Promise<void> {
    if (!normalizedName || normalizedName.length < 2) return;

    try {
      const existing = await db.merchantPatterns
        .where('normalizedName')
        .equals(normalizedName)
        .first();

      if (existing) {
        // Update existing pattern
        const newConfidence = Math.min(0.99, existing.confidence + 0.05);
        const examples = existing.originalExamples || [];
        if (!examples.includes(originalDescription)) {
          examples.push(originalDescription);
          // Keep only last 5 examples
          while (examples.length > 5) examples.shift();
        }

        await db.merchantPatterns.update(existing.id, {
          confidence: newConfidence,
          usageCount: existing.usageCount + 1,
          lastUsed: new Date(),
          originalExamples: examples,
          // Update category if different and new confidence is higher
          ...(categoryId !== existing.categoryId && confidence > existing.confidence
            ? { categoryId, categoryName }
            : {}),
        });
      } else {
        // Create new pattern
        const pattern: MerchantPattern = {
          id: uuidv4(),
          normalizedName,
          originalExamples: [originalDescription],
          categoryId,
          categoryName,
          confidence: confidence * 0.8, // Start with slightly lower confidence
          usageCount: 1,
          userConfirmed: false,
          lastUsed: new Date(),
          createdAt: new Date(),
        };

        await db.merchantPatterns.add(pattern);
      }
    } catch (error) {
      console.error('Failed to learn pattern:', error);
    }
  }

  /**
   * Update pattern usage (when pattern is used for categorization)
   */
  private async updatePatternUsage(patternId: string): Promise<void> {
    try {
      const pattern = await db.merchantPatterns.get(patternId);
      if (pattern) {
        await db.merchantPatterns.update(patternId, {
          usageCount: pattern.usageCount + 1,
          lastUsed: new Date(),
          confidence: Math.min(0.99, pattern.confidence + 0.02),
        });
      }
    } catch (error) {
      console.error('Failed to update pattern usage:', error);
    }
  }

  /**
   * Learn from user correction - highest priority learning
   */
  async learnFromUserCorrection(
    transactionId: string,
    newCategoryId: string
  ): Promise<void> {
    try {
      const transaction = await db.transactions.get(transactionId);
      if (!transaction) return;

      const category = await db.categories.get(newCategoryId);
      if (!category) return;

      const normalizedName = normalizeMerchantName(transaction.description);
      if (!normalizedName || normalizedName.length < 2) return;

      const existing = await db.merchantPatterns
        .where('normalizedName')
        .equals(normalizedName)
        .first();

      if (existing) {
        // Update to user-confirmed pattern
        await db.merchantPatterns.update(existing.id, {
          categoryId: newCategoryId,
          categoryName: category.name,
          confidence: 1.0, // User confirmed = maximum confidence
          userConfirmed: true,
          lastUsed: new Date(),
        });
      } else {
        // Create user-confirmed pattern
        const pattern: MerchantPattern = {
          id: uuidv4(),
          normalizedName,
          originalExamples: [transaction.description],
          categoryId: newCategoryId,
          categoryName: category.name,
          confidence: 1.0,
          usageCount: 1,
          userConfirmed: true,
          lastUsed: new Date(),
          createdAt: new Date(),
        };

        await db.merchantPatterns.add(pattern);
      }
    } catch (error) {
      console.error('Failed to learn from user correction:', error);
    }
  }

  /**
   * Get learned patterns statistics
   */
  async getPatternStats(): Promise<{
    total: number;
    userConfirmed: number;
    averageConfidence: number;
  }> {
    const patterns = await db.merchantPatterns.toArray();
    const userConfirmed = patterns.filter((p) => p.userConfirmed).length;
    const avgConfidence = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;

    return {
      total: patterns.length,
      userConfirmed,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
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
   */
  async forceRecategorize(
    transactionIds?: string[],
    includeAlreadyCategorized: boolean = false
  ): Promise<number> {
    let transactions: Transaction[];

    if (transactionIds && transactionIds.length > 0) {
      transactions = await db.transactions
        .where('id')
        .anyOf(transactionIds)
        .toArray();
    } else if (includeAlreadyCategorized) {
      transactions = await db.transactions.toArray();
    } else {
      transactions = await db.transactions
        .filter((t) => !t.categoryId)
        .toArray();
    }

    if (transactions.length === 0) {
      return 0;
    }

    // Filter out transactions already in queue
    const existingQueueItems = await db.categorizationQueue.toArray();
    const queuedTransactionIds = new Set(existingQueueItems.map((i) => i.transactionId));

    const transactionsToQueue = transactions.filter(
      (t) => !queuedTransactionIds.has(t.id)
    );

    // Reset completed/failed items if forcing
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

    // Clear category if including already categorized
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
   * Get transaction counts
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

  /**
   * Categorize a single transaction (legacy method for compatibility)
   */
  async categorizeTransaction(
    transaction: Transaction,
    categories: Category[]
  ): Promise<CategorizationResult> {
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
    const categoryIdMap = new Map(categories.map((c) => [c.id, c]));

    // Try tiers
    const normalizedMerchant = normalizeMerchantName(transaction.description);

    // Tier 1: Pattern cache
    const pattern = await db.merchantPatterns
      .where('normalizedName')
      .equals(normalizedMerchant)
      .first();

    if (pattern && pattern.confidence >= 0.8) {
      return {
        categoryId: pattern.categoryId,
        confidence: pattern.confidence,
        reasoning: `Learned pattern: "${normalizedMerchant}"`,
      };
    }

    // Tier 2: Australian merchants
    const merchantMatch = findMerchantMapping(normalizedMerchant);
    if (merchantMatch) {
      const category = categoryMap.get(merchantMatch.category.toLowerCase());
      if (category) {
        return {
          categoryId: category.id,
          confidence: merchantMatch.confidence,
          reasoning: `Australian merchant: "${normalizedMerchant}"`,
        };
      }
    }

    // Tier 2b: Keywords
    const keywordResult = this.keywordCategorization(transaction, categories);
    if (keywordResult && keywordResult.confidence >= 0.6) {
      return keywordResult;
    }

    // Tier 3: AI (single)
    try {
      const results = await this.batchAICategorization([transaction], categories);
      if (results[0]) {
        const category = categoryMap.get(results[0].category.toLowerCase()) ||
          categories.find((c) => c.name.toLowerCase().includes(results[0]!.category.toLowerCase()));
        if (category) {
          return {
            categoryId: category.id,
            confidence: results[0].confidence,
            reasoning: results[0].reasoning,
          };
        }
      }
    } catch {
      // AI failed, use fallback
    }

    // Final fallback
    const uncategorized = categories.find(
      (c) => c.name.toLowerCase() === 'other expense' || c.name.toLowerCase() === 'uncategorized'
    );

    return {
      categoryId: uncategorized?.id || categories[0]?.id || '',
      confidence: 0.1,
      reasoning: 'No match found',
    };
  }
}

// Singleton instance
export const categorizationService = new CategorizationService();
