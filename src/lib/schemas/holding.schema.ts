// Investment holdings validation schemas

import { z } from 'zod';
import {
  uuidSchema,
  positiveMoneySchema,
  moneyInCentsSchema,
  dateSchema,
  coercedDateSchema,
  timestampFieldsSchema,
  nonEmptyStringSchema,
  optionalStringSchema,
} from './common.schema';

// Holding types
export const holdingTypeSchema = z.enum(['etf', 'stock', 'crypto', 'managed-fund']);

// Investment transaction types
export const investmentTransactionTypeSchema = z.enum([
  'buy',
  'sell',
  'dividend',
  'distribution',
  'fee',
]);

// Full Holding schema (for database records)
export const holdingSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  symbol: nonEmptyStringSchema.max(20, 'Symbol must be 20 characters or less'),
  name: nonEmptyStringSchema.max(100, 'Name must be 100 characters or less'),
  type: holdingTypeSchema,
  units: z.number().min(0, 'Units cannot be negative'),
  costBasis: positiveMoneySchema,
  currentPrice: positiveMoneySchema.optional(),
  currentValue: positiveMoneySchema.optional(),
  lastPriceUpdate: dateSchema.optional(),
}).merge(timestampFieldsSchema);

// Schema for creating a new holding
export const holdingCreateSchema = z.object({
  accountId: uuidSchema,
  symbol: nonEmptyStringSchema.max(20, 'Symbol must be 20 characters or less'),
  name: nonEmptyStringSchema.max(100, 'Name must be 100 characters or less'),
  type: holdingTypeSchema,
  units: z.number().min(0, 'Units cannot be negative'),
  costBasis: positiveMoneySchema,
});

// Schema for updating an existing holding
export const holdingUpdateSchema = holdingCreateSchema.partial();

// Full InvestmentTransaction schema
export const investmentTransactionSchema = z.object({
  id: uuidSchema,
  holdingId: uuidSchema,
  type: investmentTransactionTypeSchema,
  units: z.number().min(0, 'Units cannot be negative'),
  pricePerUnit: positiveMoneySchema,
  totalAmount: positiveMoneySchema,
  fees: positiveMoneySchema.optional(),
  date: dateSchema,
  notes: optionalStringSchema,

  // Tax fields
  capitalGain: moneyInCentsSchema.optional(),
  holdingPeriod: z.number().int().min(0).optional(),
}).merge(timestampFieldsSchema);

// Schema for creating an investment transaction
export const investmentTransactionCreateSchema = z.object({
  holdingId: uuidSchema,
  type: investmentTransactionTypeSchema,
  units: z.number().min(0, 'Units cannot be negative'),
  pricePerUnit: positiveMoneySchema,
  totalAmount: positiveMoneySchema,
  fees: positiveMoneySchema.optional(),
  date: coercedDateSchema,
  notes: optionalStringSchema,
});

// Type exports
export type HoldingType = z.infer<typeof holdingTypeSchema>;
export type InvestmentTransactionType = z.infer<typeof investmentTransactionTypeSchema>;
export type Holding = z.infer<typeof holdingSchema>;
export type HoldingCreate = z.infer<typeof holdingCreateSchema>;
export type HoldingUpdate = z.infer<typeof holdingUpdateSchema>;
export type InvestmentTransaction = z.infer<typeof investmentTransactionSchema>;
export type InvestmentTransactionCreate = z.infer<typeof investmentTransactionCreateSchema>;
