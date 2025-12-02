// Common Zod schemas shared across the application

import { z } from 'zod';

// Money is stored in cents (integers) to avoid floating-point issues
export const moneyInCentsSchema = z.number().int({ message: 'Amount must be a whole number (cents)' });

// Positive money amount (for amounts that should never be negative)
export const positiveMoneySchema = moneyInCentsSchema.min(0, { message: 'Amount cannot be negative' });

// Currency is always AUD for this application
export const currencySchema = z.literal('AUD');

// UUID validation
export const uuidSchema = z.string().uuid({ message: 'Invalid ID format' });

// Date validation - accepts Date objects
export const dateSchema = z.date({ message: 'Invalid date' });

// Date that can be coerced from string
export const coercedDateSchema = z.coerce.date({ message: 'Invalid date format' });

// Financial year format: "2024-25"
export const financialYearSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Financial year must be in format "YYYY-YY" (e.g., "2024-25")')
  .refine(
    (fy) => {
      const [startYearStr, endYearStr] = fy.split('-');
      const startYear = parseInt(startYearStr, 10);
      const expectedEndYear = (startYear + 1) % 100;
      return parseInt(endYearStr, 10) === expectedEndYear;
    },
    { message: 'End year must be start year + 1' }
  );

// Common timestamp fields
export const timestampFieldsSchema = z.object({
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

// Optional metadata object
export const metadataSchema = z.record(z.string(), z.unknown()).optional();

// Common string validations
export const nonEmptyStringSchema = z.string().min(1, { message: 'This field is required' });
export const optionalStringSchema = z.string().optional();

// Tags array
export const tagsSchema = z.array(z.string()).optional();

// Date range for filtering
export const dateRangeSchema = z.object({
  from: dateSchema,
  to: dateSchema,
}).refine(
  (range) => range.from <= range.to,
  { message: 'Start date must be before or equal to end date' }
);
