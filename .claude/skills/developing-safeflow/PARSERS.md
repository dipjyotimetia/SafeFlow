# PDF Parsing System

Bank and superannuation statement parsing with auto-detection and extensible parser registries.

## Architecture

```
PDF File
    ↓
Web Worker (pdf.worker.ts)
    ↓ (text extraction)
Parser Registry (registry.ts)
    ↓ (auto-detection)
Bank Parser (*.parser.ts)
    ↓
ParseResult
```

## Core Types

```typescript
// src/lib/parsers/types.ts
export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;        // In cents, positive=credit, negative=debit
  type?: 'income' | 'expense' | 'transfer';
  balance?: number;      // Running balance if available
  reference?: string;
  rawText?: string;      // Original text for debugging
}

export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  accountName?: string;
  accountNumber?: string;  // Last 4 digits only
  statementPeriod?: { start: Date; end: Date };
  errors: string[];
  warnings: string[];
}

export interface BankParser {
  name: string;
  bankCode: string;

  canParse(text: string): boolean;
  parse(text: string): ParseResult;
}
```

## Supported Banks

| Bank | Parser | Detection Pattern |
|------|--------|-------------------|
| ANZ | `anz.parser.ts` | "ANZ", "Australia and New Zealand Banking" |
| CBA | `cba.parser.ts` | "Commonwealth Bank", "CommBank" |
| Westpac | `westpac.parser.ts` | "Westpac" |
| NAB | `nab.parser.ts` | "National Australia Bank" |
| ING | `ing.parser.ts` | "ING" |
| Macquarie | `macquarie.parser.ts` | "Macquarie" |
| Bendigo | `bendigo.parser.ts` | "Bendigo Bank" |
| UP Bank | `up.parser.ts` | "Up Bank" |
| Raiz | `raiz.parser.ts` | "Raiz" |
| CoinSpot | `coinspot.parser.ts` | "CoinSpot" |
| Swyftx | `swyftx.parser.ts` | "Swyftx" |

## Adding a New Parser

### Step 1: Create Parser File

```typescript
// src/lib/parsers/bank/newbank.parser.ts
import { BaseParser } from './base.parser';

class NewBankParser extends BaseParser {
  constructor() {
    super({
      name: 'New Bank',
      bankCode: 'newbank',
      // Regex patterns to identify this bank's statements
      identifiers: [
        /New Bank/i,
        /newbank\.com\.au/i,
      ],
      // Lines to skip (bank-specific headers, footers)
      skipPatterns: [
        /^Transaction\s+Details$/i,
        /^Opening\s+Balance$/i,
      ],
      // Patterns to extract account name (capture group 1)
      accountNamePatterns: [
        /Account:\s*(.+?)(?:\s+\d|$)/i,
      ],
      // Patterns to extract last 4 digits of account number
      accountNumberPatterns: [
        /\*{4,}(\d{4})/,
        /Account.*?(\d{4})$/,
      ],
    });
  }

  // Override for bank-specific transaction format (optional)
  // Default implementation handles most Australian bank formats
  protected parseTransactionLine(line: string, defaultYear: number): ParsedTransaction | null {
    // Call base implementation first - handles most cases
    const result = super.parseTransactionLine(line, defaultYear);
    if (result) return result;

    // Add bank-specific parsing logic here if needed
    // Example: Custom format DD-MMM Description $Amount
    const match = line.match(/(\d{2}-\w{3})\s+(.+?)\s+\$([\d,]+\.\d{2})/);
    if (!match) return null;

    // Use utility functions from ../utils
    const { extractDateFromLine, toCents, analyzeTransaction } = require('../utils');
    // ... custom parsing logic

    return null;
  }
}

export const newBankParser = new NewBankParser();
```

### Step 2: Register Parser

```typescript
// src/lib/parsers/bank/index.ts
import { anzParser } from './anz.parser';
import { cbaParser } from './cba.parser';
import { newBankParser } from './newbank.parser';  // Add import

export const bankParsers = [
  anzParser,
  cbaParser,
  // ... other parsers
  newBankParser,  // Add to array
];
```

## BaseParser Configuration

```typescript
interface BankParserConfig {
  name: string;              // Display name (e.g., "Commonwealth Bank")
  bankCode: string;          // Short code (e.g., "cba")
  identifiers: RegExp[];     // Patterns to detect this bank's statements
  skipPatterns?: RegExp[];   // Bank-specific lines to ignore
  accountNamePatterns?: RegExp[];   // Extract account name (capture group 1)
  accountNumberPatterns?: RegExp[]; // Extract last 4 digits (capture group 1)
}
```

## BaseParser Methods

### Methods You Can Override

```typescript
// Override for custom account extraction
protected extractAccountInfo(text: string): { name?: string; number?: string }

// Override for custom transaction parsing
protected parseTransactionLine(line: string, defaultYear: number): ParsedTransaction | null

// Check if line should be skipped
protected shouldSkipLine(line: string): boolean
```

### Inherited Behavior (No Override Needed)

```typescript
// Automatically handled by base class:
canParse(text)       // Uses identifiers from config
parse(text)          // Extracts transactions, handles duplicates, sorts by date
```

## Parser Utilities

Import from `src/lib/parsers/utils`:

```typescript
import {
  extractDateFromLine,    // Parse date from line start, returns { date, remainingText }
  extractAmounts,         // Extract all monetary amounts from text
  extractStatementPeriod, // Find statement date range
  analyzeTransaction,     // Determine type (income/expense) and sign
  cleanDescription,       // Normalize transaction description
  shouldSkipLine,         // Check for common skip patterns
  createTransactionKey,   // Generate unique key for duplicate detection
  toCents,                // Convert Decimal to cents (integer)
  Decimal,                // Decimal.js for precise calculations
} from '../utils';
```

### Amount Extraction

```typescript
const amounts = extractAmounts("Transfer $1,500.00 CR Balance $2,345.67");
// Returns: [
//   { value: Decimal(1500), isCredit: true, isDebit: false },
//   { value: Decimal(2345.67), isCredit: false, isDebit: false }
// ]
```

### Transaction Analysis

```typescript
const analysis = analyzeTransaction(
  "SALARY PAYMENT",      // description
  new Decimal(5000),     // amount
  false,                 // explicitlyDebit
  true                   // explicitlyCredit
);
// Returns: { type: 'income', signedAmount: Decimal(5000) }
```

## Parser Registry

```typescript
// src/lib/parsers/registry.ts
import { bankParsers } from './bank';
import type { BankParser, ParseResult } from './types';

export function detectParser(text: string): BankParser | null {
  for (const parser of bankParsers) {
    if (parser.canParse(text)) {
      return parser;
    }
  }
  return null;
}

export function parseStatement(text: string): ParseResult {
  const parser = detectParser(text);

  if (!parser) {
    return {
      success: false,
      transactions: [],
      errors: ['Could not detect bank from statement'],
      warnings: [],
    };
  }

  return parser.parse(text);
}
```

## Web Worker Usage

```typescript
// src/hooks/use-pdf-parser.ts
import { useState, useCallback } from 'react';
import { parseStatement } from '@/lib/parsers/registry';
import type { ParseResult } from '@/lib/parsers/types';

export function usePdfParser() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    const worker = new Worker(
      new URL('@/workers/pdf.worker.ts', import.meta.url)
    );

    return new Promise<ParseResult>((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.type === 'content') {
          // Text extracted, now parse
          const parseResult = parseStatement(e.data.content.fullText);
          setResult(parseResult);
          setIsProcessing(false);
          worker.terminate();
          resolve(parseResult);
        } else if (e.data.type === 'error') {
          setError(e.data.error);
          setIsProcessing(false);
          worker.terminate();
          reject(new Error(e.data.error));
        }
      };

      worker.onerror = (err) => {
        setError(err.message);
        setIsProcessing(false);
        worker.terminate();
        reject(err);
      };

      file.arrayBuffer().then(buffer => {
        worker.postMessage({ type: 'parse', fileData: buffer, fileName: file.name });
      });
    });
  }, []);

  return { parseFile, isProcessing, result, error };
}
```

## Testing a Parser

```typescript
// Create test with sample statement text
const sampleText = `
New Bank Statement
Account: Savings ****1234
Period: 01/12/2024 - 31/12/2024

01/12/2024 SALARY PAYMENT 5000.00C
05/12/2024 WOOLWORTHS -150.50
`;

const parser = new NewBankParser();
console.log(parser.canParse(sampleText));  // true
console.log(parser.parse(sampleText));     // ParseResult
```

---

## Superannuation Parsers

Location: `src/lib/parsers/super/`

### Supported Super Funds

| Provider | Parser | Detection Pattern |
|----------|--------|-------------------|
| AustralianSuper | `australian-super.parser.ts` | "AustralianSuper", "Australian Super" |
| UniSuper | `unisuper.parser.ts` | "UniSuper" |

### Super Parser Types

```typescript
// src/lib/parsers/super/types.ts
export interface ParsedSuperTransaction {
  date: Date;
  type: SuperTransactionType;
  amount: number;        // In cents (positive for contributions, negative for fees)
  description?: string;
  employerName?: string;
  rawText?: string;
}

export interface ParsedSuperAccount {
  provider: SuperProvider;
  providerName: string;
  memberNumber?: string;
  accountName?: string;
  investmentOption?: string;
  employerName?: string;
  totalBalance: number;  // In cents
  preservedBalance?: number;
  restrictedNonPreserved?: number;
  unrestrictedNonPreserved?: number;
}

export interface SuperParseResult {
  success: boolean;
  account: ParsedSuperAccount;
  transactions: ParsedSuperTransaction[];
  statementPeriod?: { start: Date; end: Date };
  errors: string[];
  warnings: string[];
}

export interface SuperParser {
  name: string;
  provider: SuperProvider;
  canParse(text: string): boolean;
  parse(text: string): SuperParseResult;
}
```

### Using Super Parsers

```typescript
import { parseSuperStatement, findSuperParser, getAvailableSuperParsers } from '@/lib/parsers/super';

// Auto-detect and parse
const result = parseSuperStatement(pdfText);

// Get specific parser
const parser = findSuperParser(pdfText);
if (parser) {
  console.log(`Detected: ${parser.name}`);
  const result = parser.parse(pdfText);
}

// List available parsers
const parsers = getAvailableSuperParsers();
// [{ name: 'UniSuper', provider: 'unisuper' }, { name: 'AustralianSuper', provider: 'australian-super' }]
```

### Adding a New Super Parser

#### Step 1: Create Parser File

```typescript
// src/lib/parsers/super/restsuper.parser.ts
import type { SuperProvider } from '@/types';
import type { SuperParser, SuperParseResult, ParsedSuperTransaction } from './types';

export class RestSuperParser implements SuperParser {
  name = 'Rest Super';
  provider: SuperProvider = 'rest';

  canParse(text: string): boolean {
    return /rest\s*super/i.test(text) || /restsuper\.com\.au/i.test(text);
  }

  parse(text: string): SuperParseResult {
    const result: SuperParseResult = {
      success: false,
      account: {
        provider: 'rest',
        providerName: 'Rest Super',
        totalBalance: 0,
      },
      transactions: [],
      errors: [],
      warnings: [],
    };

    try {
      // Extract account info
      result.account.memberNumber = this.extractMemberNumber(text);
      result.account.totalBalance = this.extractBalance(text);

      // Parse transactions
      result.transactions = this.parseTransactions(text);
      result.success = result.transactions.length > 0;
    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private extractMemberNumber(text: string): string | undefined {
    const match = text.match(/member\s*(?:number|no\.?)\s*:?\s*(\d+)/i);
    return match?.[1];
  }

  private extractBalance(text: string): number {
    const match = text.match(/total\s*balance\s*\$?([\d,]+\.?\d*)/i);
    if (match) {
      return Math.round(parseFloat(match[1].replace(/,/g, '')) * 100);
    }
    return 0;
  }

  private parseTransactions(text: string): ParsedSuperTransaction[] {
    // Implement transaction parsing logic
    return [];
  }
}

export const restSuperParser = new RestSuperParser();
```

#### Step 2: Add Provider Type

```typescript
// src/types/index.ts
export type SuperProvider =
  | 'unisuper'
  | 'australian-super'
  | 'rest'  // Add new provider
  | 'other';
```

#### Step 3: Register Parser

```typescript
// src/lib/parsers/super/index.ts
import { restSuperParser } from './restsuper.parser';

const superParsers: SuperParser[] = [
  uniSuperParser,
  australianSuperParser,
  restSuperParser,  // Add to registry
];
```

### Transaction Type Mapping

| Transaction Type | Description |
|-----------------|-------------|
| `employer-sg` | Employer Super Guarantee (11.5%) |
| `employer-additional` | Employer additional contributions |
| `salary-sacrifice` | Before-tax salary sacrifice |
| `personal-concessional` | Tax-deductible personal contributions |
| `personal-non-concessional` | After-tax contributions |
| `spouse-contribution` | Contributions from spouse |
| `government-co-contribution` | Government matching |
| `rollover-in` | Transfer from another fund |
| `rollover-out` | Transfer to another fund |
| `withdrawal` | Benefit payment |
| `fees` | Management and admin fees |
| `insurance` | Insurance premiums |
| `earnings` | Investment returns |
