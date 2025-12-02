// Sync data validation schemas

import { z } from 'zod';
import { accountSchema } from './account.schema';
import { transactionSchema } from './transaction.schema';
import { holdingSchema, investmentTransactionSchema } from './holding.schema';
import { superannuationAccountSchema, superTransactionSchema } from './super.schema';
import {
  uuidSchema,
  dateSchema,
  timestampFieldsSchema,
  nonEmptyStringSchema,
  optionalStringSchema,
} from './common.schema';

// Category schema (simplified - used in sync)
export const categorySchema = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema,
  type: z.enum(['income', 'expense', 'transfer']),
  icon: optionalStringSchema,
  color: optionalStringSchema,
  parentId: uuidSchema.optional(),
  atoCode: optionalStringSchema,
  isSystem: z.boolean(),
  isActive: z.boolean(),
}).merge(timestampFieldsSchema);

// Import batch schema
export const importBatchSchema = z.object({
  id: uuidSchema,
  source: nonEmptyStringSchema,
  fileName: z.string(),
  transactionCount: z.number().int().min(0),
  importedAt: dateSchema,
  status: z.enum(['pending', 'completed', 'partial', 'failed']),
  errors: z.array(z.string()).optional(),
});

// Tax item schema
export const taxItemSchema = z.object({
  id: uuidSchema,
  transactionId: uuidSchema.optional(),
  investmentTransactionId: uuidSchema.optional(),
  financialYear: z.string(),
  atoCategory: nonEmptyStringSchema,
  amount: z.number().int(),
  description: nonEmptyStringSchema,
  isDeduction: z.boolean(),
  gstClaimed: z.number().int().optional(),
  notes: optionalStringSchema,
}).merge(timestampFieldsSchema);

// Chat conversation schema
export const chatMessageSchema = z.object({
  id: uuidSchema,
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: dateSchema,
});

export const chatConversationSchema = z.object({
  id: uuidSchema,
  title: optionalStringSchema,
  messages: z.array(chatMessageSchema),
}).merge(timestampFieldsSchema);

// Categorization queue item schema
export const categorizationQueueItemSchema = z.object({
  id: uuidSchema,
  transactionId: uuidSchema,
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  suggestedCategoryId: uuidSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  reasoning: optionalStringSchema,
  error: optionalStringSchema,
  createdAt: dateSchema,
  processedAt: dateSchema.optional(),
});

// Merchant pattern schema
export const merchantPatternSchema = z.object({
  id: uuidSchema,
  normalizedName: nonEmptyStringSchema,
  originalExamples: z.array(z.string()),
  categoryId: uuidSchema,
  categoryName: nonEmptyStringSchema,
  confidence: z.number().min(0).max(1),
  usageCount: z.number().int().min(0),
  userConfirmed: z.boolean(),
  lastUsed: dateSchema,
  createdAt: dateSchema,
});

// Full SyncData schema for validating imported data
export const syncDataSchema = z.object({
  version: z.number().int().min(1),
  exportedAt: z.string().datetime(),
  accounts: z.array(accountSchema),
  transactions: z.array(transactionSchema),
  categories: z.array(categorySchema),
  holdings: z.array(holdingSchema),
  investmentTransactions: z.array(investmentTransactionSchema),
  taxItems: z.array(taxItemSchema),
  importBatches: z.array(importBatchSchema),
  // Optional fields for backward compatibility with older exports
  superannuationAccounts: z.array(superannuationAccountSchema).optional().default([]),
  superTransactions: z.array(superTransactionSchema).optional().default([]),
  chatConversations: z.array(chatConversationSchema).optional().default([]),
  categorizationQueue: z.array(categorizationQueueItemSchema).optional().default([]),
  merchantPatterns: z.array(merchantPatternSchema).optional().default([]),
});

// Sync metadata schema
export const syncMetadataSchema = z.object({
  id: uuidSchema,
  lastSyncAt: dateSchema.optional(),
  lastSyncVersion: z.number().int().min(0),
  driveFileId: optionalStringSchema,
  conflictState: z.enum(['none', 'pending', 'resolved']).optional(),
  encryptionKeyHash: optionalStringSchema,
});

// Type exports
export type Category = z.infer<typeof categorySchema>;
export type ImportBatch = z.infer<typeof importBatchSchema>;
export type TaxItem = z.infer<typeof taxItemSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatConversation = z.infer<typeof chatConversationSchema>;
export type CategorizationQueueItem = z.infer<typeof categorizationQueueItemSchema>;
export type MerchantPattern = z.infer<typeof merchantPatternSchema>;
export type SyncData = z.infer<typeof syncDataSchema>;
export type SyncMetadata = z.infer<typeof syncMetadataSchema>;
