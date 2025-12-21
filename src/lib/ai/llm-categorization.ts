import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { ollamaClient } from './ollama-client';
import {
  SYSTEM_PROMPTS,
  buildCategorizationPrompt,
  buildSingleCategorizationPrompt,
} from './prompts';
import type { Transaction, Category, MerchantPattern, CategorizationResult } from '@/types';

// Default model to use for categorization
const DEFAULT_MODEL = 'llama3.1:8b';
const DEFAULT_HOST = 'http://127.0.0.1:11434';

interface TransactionCounts {
  total: number;
  categorized: number;
  uncategorized: number;
}

interface LLMCategorizationResponse {
  index: number;
  categoryName: string | null;
  confidence: number;
}

interface SingleLLMResponse {
  categoryName: string | null;
  confidence: number;
}

/**
 * Simple merchant name normalization
 */
function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .split(' ')
    .slice(0, 3) // Take first 3 words
    .join(' ');
}

/**
 * Parse JSON from LLM response, handling markdown code blocks
 */
function parseJSONResponse<T>(response: string): T | null {
  try {
    // Try direct parse first
    return JSON.parse(response);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Fall through to next attempt
      }
    }

    // Try finding JSON array or object in response
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // Fall through
      }
    }

    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Fall through
      }
    }

    return null;
  }
}

/**
 * LLM-powered categorization service
 */
class LLMCategorizationService {
  private batchSize = 15; // Transactions per LLM call
  private minConfidence = 0.7;

  /**
   * Check if Ollama is available for categorization
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Ensure client is configured with correct settings
      ollamaClient.updateConfig({
        host: DEFAULT_HOST,
        model: DEFAULT_MODEL,
      });

      const health = await ollamaClient.checkHealth();
      return health.connected && health.modelReady;
    } catch {
      return false;
    }
  }

  /**
   * Get transaction counts
   */
  async getTransactionCounts(): Promise<TransactionCounts> {
    const all = await db.transactions.toArray();
    const uncategorized = all.filter((t) => !t.categoryId).length;

    return {
      total: all.length,
      uncategorized,
      categorized: all.length - uncategorized,
    };
  }

  /**
   * Categorize transactions using LLM with caching
   */
  async categorizeTransactions(
    transactions: Transaction[]
  ): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>();

    if (transactions.length === 0) return results;

    // Get categories for mapping
    const categories = await db.categories.filter((c) => c.isActive).toArray();
    const categoryByName = new Map(
      categories.map((c) => [c.name.toLowerCase(), c])
    );

    // Step 1: Check cached patterns first
    const uncachedTransactions: Transaction[] = [];

    for (const tx of transactions) {
      const cached = await this.checkCachedPattern(tx.description, categoryByName);
      if (cached) {
        results.set(tx.id, cached);
      } else {
        uncachedTransactions.push(tx);
      }
    }

    if (uncachedTransactions.length === 0) return results;

    // Step 2: Check LLM availability
    const isAvailable = await this.checkAvailability();
    if (!isAvailable) {
      console.warn('LLM unavailable, using cached patterns only');
      return results;
    }

    // Step 3: Process remaining with LLM in batches
    const categoryNames = categories.map((c) => c.name);

    for (let i = 0; i < uncachedTransactions.length; i += this.batchSize) {
      const batch = uncachedTransactions.slice(i, i + this.batchSize);

      try {
        const batchResults = await this.categorizeBatch(
          batch,
          categoryNames,
          categoryByName
        );

        for (const [id, result] of batchResults) {
          results.set(id, result);

          // Cache the pattern for future use
          const tx = batch.find((t) => t.id === id);
          if (tx && result.categoryId) {
            await this.cachePattern(tx.description, result);
          }
        }
      } catch (error) {
        console.error('Batch categorization failed:', error);
        // Continue with next batch
      }
    }

    return results;
  }

  /**
   * Check if we have a cached pattern for this transaction
   */
  private async checkCachedPattern(
    description: string,
    _categoryByName: Map<string, Category>
  ): Promise<CategorizationResult | null> {
    const normalized = normalizeMerchant(description);
    if (normalized.length < 2) return null;

    try {
      const pattern = await db.merchantPatterns
        .where('normalizedName')
        .equals(normalized)
        .first();

      if (pattern && pattern.confidence >= this.minConfidence) {
        // Verify category still exists
        const category = await db.categories.get(pattern.categoryId);
        if (category && category.isActive) {
          // Update usage count
          await db.merchantPatterns.update(pattern.id, {
            usageCount: pattern.usageCount + 1,
            lastUsed: new Date(),
          });

          return {
            categoryId: pattern.categoryId,
            confidence: pattern.confidence,
            reasoning: `Cached pattern: "${normalized}"`,
          };
        }
      }
    } catch (error) {
      console.error('Pattern cache lookup failed:', error);
    }

    return null;
  }

  /**
   * Categorize a batch of transactions via LLM
   */
  private async categorizeBatch(
    transactions: Transaction[],
    categoryNames: string[],
    categoryByName: Map<string, Category>
  ): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>();

    const transactionData = transactions.map((t, i) => ({
      index: i + 1,
      description: t.description,
      amount: t.amount,
      type: t.type,
    }));

    const prompt = buildCategorizationPrompt(transactionData, categoryNames);

    try {
      const response = await ollamaClient.generate(
        prompt,
        SYSTEM_PROMPTS.transactionCategorizer
      );

      const parsed = parseJSONResponse<LLMCategorizationResponse[]>(response);

      if (!parsed || !Array.isArray(parsed)) {
        console.warn('Invalid LLM response format');
        return results;
      }

      for (const item of parsed) {
        if (
          !item ||
          typeof item.index !== 'number' ||
          item.index < 1 ||
          item.index > transactions.length ||
          !item.categoryName
        ) {
          continue;
        }

        const tx = transactions[item.index - 1];
        if (!tx || !tx.id) {
          console.warn('Transaction not found for index:', item.index);
          continue;
        }

        const category = categoryByName.get(item.categoryName.toLowerCase());

        if (category && item.confidence >= this.minConfidence) {
          results.set(tx.id, {
            categoryId: category.id,
            confidence: item.confidence,
            reasoning: `LLM categorization: "${item.categoryName}"`,
          });
        }
      }
    } catch (error) {
      console.error('LLM categorization failed:', error);
    }

    return results;
  }

  /**
   * Cache a categorization result for future lookups
   */
  private async cachePattern(
    description: string,
    result: CategorizationResult
  ): Promise<void> {
    const normalized = normalizeMerchant(description);
    if (normalized.length < 2 || !result.categoryId) return;

    try {
      const existing = await db.merchantPatterns
        .where('normalizedName')
        .equals(normalized)
        .first();

      const category = await db.categories.get(result.categoryId);

      if (existing) {
        // Update existing pattern
        await db.merchantPatterns.update(existing.id, {
          categoryId: result.categoryId,
          categoryName: category?.name || existing.categoryName,
          confidence: Math.max(existing.confidence, result.confidence),
          usageCount: existing.usageCount + 1,
          lastUsed: new Date(),
        });
      } else {
        // Create new pattern
        const pattern: MerchantPattern = {
          id: uuidv4(),
          normalizedName: normalized,
          originalExamples: [description],
          categoryId: result.categoryId,
          categoryName: category?.name || '',
          confidence: result.confidence * 0.9, // Slightly lower for first cache
          usageCount: 1,
          userConfirmed: false,
          lastUsed: new Date(),
          createdAt: new Date(),
        };

        await db.merchantPatterns.add(pattern);
      }
    } catch (error) {
      console.error('Failed to cache pattern:', error);
    }
  }

  /**
   * Learn from user correction (highest priority)
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

      const normalized = normalizeMerchant(transaction.description);
      if (normalized.length < 2) return;

      const existing = await db.merchantPatterns
        .where('normalizedName')
        .equals(normalized)
        .first();

      if (existing) {
        await db.merchantPatterns.update(existing.id, {
          categoryId: newCategoryId,
          categoryName: category.name,
          confidence: 1.0, // User confirmed = max confidence
          userConfirmed: true,
          lastUsed: new Date(),
        });
      } else {
        const pattern: MerchantPattern = {
          id: uuidv4(),
          normalizedName: normalized,
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
   * Force recategorization of transactions
   */
  async forceRecategorize(includeAlreadyCategorized: boolean): Promise<number> {
    let transactions: Transaction[];

    if (includeAlreadyCategorized) {
      transactions = await db.transactions.toArray();
      // Clear existing categories for recategorization
      const now = new Date();
      await Promise.all(
        transactions.map((t) =>
          db.transactions.update(t.id, {
            categoryId: undefined,
            updatedAt: now,
          })
        )
      );
    } else {
      transactions = await db.transactions
        .filter((t) => !t.categoryId)
        .toArray();
    }

    if (transactions.length === 0) return 0;

    const results = await this.categorizeTransactions(transactions);

    // Apply categorizations
    const now = new Date();
    await Promise.all(
      Array.from(results.entries()).map(([txId, result]) =>
        db.transactions.update(txId, {
          categoryId: result.categoryId,
          updatedAt: now,
        })
      )
    );

    return results.size;
  }

  /**
   * Categorize a single transaction (for inline categorization)
   */
  async categorizeSingle(
    transaction: Transaction
  ): Promise<CategorizationResult | null> {
    const categories = await db.categories.filter((c) => c.isActive).toArray();
    const categoryByName = new Map(
      categories.map((c) => [c.name.toLowerCase(), c])
    );

    // Check cache first
    const cached = await this.checkCachedPattern(
      transaction.description,
      categoryByName
    );
    if (cached) return cached;

    // Check LLM availability
    const isAvailable = await this.checkAvailability();
    if (!isAvailable) return null;

    // Call LLM for single transaction
    const categoryNames = Array.from(categoryByName.values()).map((c) => c.name);
    const prompt = buildSingleCategorizationPrompt(
      transaction.description,
      transaction.amount,
      transaction.type,
      categoryNames
    );

    try {
      const response = await ollamaClient.generate(
        prompt,
        SYSTEM_PROMPTS.transactionCategorizer
      );

      const parsed = parseJSONResponse<SingleLLMResponse>(response);

      if (!parsed || !parsed.categoryName) return null;

      const category = categoryByName.get(parsed.categoryName.toLowerCase());
      if (!category || parsed.confidence < this.minConfidence) return null;

      const result: CategorizationResult = {
        categoryId: category.id,
        confidence: parsed.confidence,
        reasoning: `LLM categorization: "${parsed.categoryName}"`,
      };

      // Cache for future
      await this.cachePattern(transaction.description, result);

      return result;
    } catch (error) {
      console.error('Single categorization failed:', error);
      return null;
    }
  }
}

// Singleton instance
export const llmCategorizationService = new LLMCategorizationService();
