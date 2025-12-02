// Account validation schemas

import { z } from 'zod';
import {
  uuidSchema,
  moneyInCentsSchema,
  currencySchema,
  timestampFieldsSchema,
  nonEmptyStringSchema,
  optionalStringSchema,
  metadataSchema,
} from './common.schema';

// Account types
export const accountTypeSchema = z.enum([
  'bank',
  'credit',
  'investment',
  'crypto',
  'cash',
  'asset',
  'liability',
]);

// Full Account schema (for database records)
export const accountSchema = z.object({
  id: uuidSchema,
  name: nonEmptyStringSchema.max(100, 'Name must be 100 characters or less'),
  type: accountTypeSchema,
  institution: optionalStringSchema,
  balance: moneyInCentsSchema,
  currency: currencySchema,
  isActive: z.boolean(),
  metadata: metadataSchema,
}).merge(timestampFieldsSchema);

// Schema for creating a new account
export const accountCreateSchema = z.object({
  name: nonEmptyStringSchema.max(100, 'Name must be 100 characters or less'),
  type: accountTypeSchema,
  institution: optionalStringSchema,
  balance: moneyInCentsSchema.default(0),
  isActive: z.boolean().default(true),
  metadata: metadataSchema,
});

// Schema for updating an existing account
export const accountUpdateSchema = accountCreateSchema.partial();

// Type exports
export type AccountType = z.infer<typeof accountTypeSchema>;
export type Account = z.infer<typeof accountSchema>;
export type AccountCreate = z.infer<typeof accountCreateSchema>;
export type AccountUpdate = z.infer<typeof accountUpdateSchema>;
