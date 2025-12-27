// Transaction validation schemas

import { z } from 'zod';
import {
  uuidSchema,
  positiveMoneySchema,
  dateSchema,
  coercedDateSchema,
  timestampFieldsSchema,
  nonEmptyStringSchema,
  optionalStringSchema,
  tagsSchema,
} from './common.schema';

// Transaction types
export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer']);

// Import sources
export const importSourceSchema = z.enum([
  'manual',
  'pdf',
  // Big 4 Banks
  'anz-pdf',
  'cba-pdf',
  'westpac-pdf',
  'nab-pdf',
  // Digital Banks
  'ing-pdf',
  'macquarie-pdf',
  'up-pdf',
  'bendigo-pdf',
  // Investment/Crypto
  'raiz-pdf',
  'coinspot-pdf',
  'swyftx-pdf',
]);

// Full Transaction schema (for database records)
export const transactionSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  categoryId: uuidSchema.optional(),
  type: transactionTypeSchema,
  amount: positiveMoneySchema,
  description: nonEmptyStringSchema.max(500, 'Description must be 500 characters or less'),
  merchantName: optionalStringSchema,
  date: dateSchema,

  // Transfer-specific
  transferToAccountId: uuidSchema.optional(),

  // Import metadata
  importSource: importSourceSchema.optional(),
  importBatchId: uuidSchema.optional(),
  importedAt: dateSchema.optional(),
  originalDescription: optionalStringSchema,

  // Tax fields
  isDeductible: z.boolean().optional(),
  gstAmount: positiveMoneySchema.optional(),
  atoCategory: optionalStringSchema,

  // Metadata
  notes: optionalStringSchema,
  tags: tagsSchema,
  isReconciled: z.boolean(),
}).merge(timestampFieldsSchema);

// Schema for creating a new transaction
export const transactionCreateSchema = z.object({
  accountId: uuidSchema,
  type: transactionTypeSchema,
  amount: positiveMoneySchema,
  description: nonEmptyStringSchema.max(500, 'Description must be 500 characters or less'),
  date: coercedDateSchema,
  categoryId: uuidSchema.optional(),
  merchantName: optionalStringSchema,
  transferToAccountId: uuidSchema.optional(),
  notes: optionalStringSchema,
  isDeductible: z.boolean().optional(),
  gstAmount: positiveMoneySchema.optional(),
  atoCategory: optionalStringSchema,
});

// Schema for updating an existing transaction
export const transactionUpdateSchema = transactionCreateSchema.partial();

// Schema for bulk import transactions
export const transactionImportSchema = z.object({
  accountId: uuidSchema,
  type: transactionTypeSchema,
  amount: positiveMoneySchema,
  description: nonEmptyStringSchema,
  date: coercedDateSchema,
  categoryId: uuidSchema.optional(),
  merchantName: optionalStringSchema,
  originalDescription: optionalStringSchema,
  notes: optionalStringSchema,
});

// Array schema for bulk import
export const transactionBulkImportSchema = z.array(transactionImportSchema);

// Type exports
export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type ImportSource = z.infer<typeof importSourceSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionCreate = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;
export type TransactionImport = z.infer<typeof transactionImportSchema>;
