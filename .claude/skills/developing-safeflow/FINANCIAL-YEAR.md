# Australian Financial Year

Australian financial year runs **July 1 to June 30**.

## FY Format

Format: `"YYYY-YY"` (e.g., `"2024-25"` = July 1, 2024 - June 30, 2025)

## Utility Functions

Location: `src/lib/utils/financial-year.ts`

### Get Current FY

```typescript
import { getCurrentFinancialYear } from '@/lib/utils/financial-year';

const fy = getCurrentFinancialYear();  // "2024-25"
```

### Get FY for a Date

```typescript
import { getFinancialYearForDate } from '@/lib/utils/financial-year';

const fy = getFinancialYearForDate(new Date('2024-12-15'));  // "2024-25"
const fy2 = getFinancialYearForDate(new Date('2024-05-15')); // "2023-24"
```

### Get FY Date Range

```typescript
import { getFinancialYearDates } from '@/lib/utils/financial-year';

const { start, end } = getFinancialYearDates('2024-25');
// start: July 1, 2024
// end: June 30, 2025, 23:59:59.999
```

### Check if Date in FY

```typescript
import { isDateInFinancialYear } from '@/lib/utils/financial-year';

isDateInFinancialYear(new Date('2024-12-01'), '2024-25');  // true
isDateInFinancialYear(new Date('2024-05-01'), '2024-25');  // false
```

### Get FY Options

```typescript
import { getFinancialYearOptions } from '@/lib/utils/financial-year';

const options = getFinancialYearOptions(5);
// ["2024-25", "2023-24", "2022-23", "2021-22", "2020-21"]
```

### Get Quarters

```typescript
import { getFinancialQuarters } from '@/lib/utils/financial-year';

const quarters = getFinancialQuarters('2024-25');
// [
//   { quarter: 1, label: 'Q1 (Jul-Sep)', start: Date, end: Date },
//   { quarter: 2, label: 'Q2 (Oct-Dec)', start: Date, end: Date },
//   { quarter: 3, label: 'Q3 (Jan-Mar)', start: Date, end: Date },
//   { quarter: 4, label: 'Q4 (Apr-Jun)', start: Date, end: Date },
// ]
```

### Get Months in FY

```typescript
import { getFinancialYearMonths } from '@/lib/utils/financial-year';

const months = getFinancialYearMonths('2024-25');
// [
//   { month: 6, year: 2024, label: 'Jul 2024', start: Date, end: Date },
//   { month: 7, year: 2024, label: 'Aug 2024', start: Date, end: Date },
//   // ... through June 2025
// ]
```

### Parse and Validate

```typescript
import { parseFinancialYear } from '@/lib/utils/financial-year';

parseFinancialYear('2024-25');  // "2024-25" (valid)
parseFinancialYear('2024-26');  // null (invalid - should be 25)
parseFinancialYear('invalid');  // null
```

## ATO Tax Categories

Deduction categories for tax tracking (D1-D10):

| Code | Category |
|------|----------|
| D1 | Work car expenses |
| D2 | Work travel expenses |
| D3 | Work clothing/uniforms |
| D4 | Self-education expenses |
| D5 | Home office expenses |
| D6 | Tools and equipment |
| D7 | Professional subscriptions |
| D8 | Union fees |
| D9 | Working from home |
| D10 | Other deductions |

### Using Tax Categories

```typescript
// Categories can have optional atoCode
interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  atoCode?: string;  // e.g., "D5" for home office
  isActive: boolean;
}

// Tax items linked to transactions
interface TaxItem {
  id: string;
  financialYear: string;  // "2024-25"
  atoCategory: string;    // "D5"
  transactionId: string;
  amount: number;         // in cents
  description?: string;
}
```

## Superannuation Limits

Annual contribution caps (2024-25):

| Type | Limit |
|------|-------|
| Concessional (before-tax) | $30,000 |
| Non-concessional (after-tax) | $120,000 |
| Bring-forward (non-concessional) | $360,000 over 3 years |

```typescript
// Super contribution types
type SuperContributionType =
  | 'employer_sg'              // Employer Super Guarantee (11.5%)
  | 'salary_sacrifice'         // Before-tax voluntary
  | 'personal_concessional'    // Personal deductible
  | 'personal_non_concessional'// After-tax
  | 'spouse'                   // Spouse contribution
  | 'government_cocontribution';
```

## GST Utilities

Location: `src/lib/utils/gst.ts`

```typescript
import { calculateGST, extractGST } from '@/lib/utils/gst';

// Add GST to amount (10%)
calculateGST(10000);  // 1000 (cents)

// Extract GST from GST-inclusive amount
extractGST(11000);    // 1000 (cents)
```

## Querying by Financial Year

```typescript
import { getFinancialYearDates } from '@/lib/utils/financial-year';
import { db } from '@/lib/db';

async function getTransactionsForFY(fy: string) {
  const { start, end } = getFinancialYearDates(fy);

  return db.transactions
    .where('date')
    .between(start, end, true, true)
    .toArray();
}
```
