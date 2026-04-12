# AI Integration (Ollama)

Local LLM integration for transaction categorization using Ollama.

## Configuration

Default connection: `http://127.0.0.1:11434`
Default model: `llama3.1:8b`

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/ai/ollama-client.ts` | HTTP client for Ollama API |
| `src/lib/ai/llm-categorization.ts` | Transaction categorization service |
| `src/lib/ai/prompts.ts` | System prompts and prompt builders |
| `src/lib/ai/context-builder.ts` | Financial context for AI |
| `src/stores/ai.store.ts` | Chat and model state |

## LLM Categorization Service

Location: `src/lib/ai/llm-categorization.ts`

### Check Availability

```typescript
import { llmCategorizationService } from '@/lib/ai/llm-categorization';

const isAvailable = await llmCategorizationService.checkAvailability();
// true if Ollama connected and model ready
```

### Categorize Transactions (Batch)

```typescript
const uncategorizedTxns = await db.transactions
  .filter(t => !t.categoryId)
  .toArray();

const results = await llmCategorizationService.categorizeTransactions(uncategorizedTxns);
// Map<transactionId, CategorizationResult>

// Apply results
for (const [txId, result] of results) {
  await db.transactions.update(txId, {
    categoryId: result.categoryId,
    updatedAt: new Date(),
  });
}
```

### Categorize Single Transaction

```typescript
const result = await llmCategorizationService.categorizeSingle(transaction);

if (result && result.confidence >= 0.7) {
  await db.transactions.update(transaction.id, {
    categoryId: result.categoryId,
  });
}
```

### Force Recategorization

```typescript
// Only uncategorized transactions
const count = await llmCategorizationService.forceRecategorize(false);

// All transactions (clears existing categories first)
const count = await llmCategorizationService.forceRecategorize(true);
```

## Merchant Pattern Learning

The system learns from categorizations and user corrections.

### Pattern Caching

Patterns are stored in `merchantPatterns` table:

```typescript
interface MerchantPattern {
  id: string;
  normalizedName: string;      // e.g., "woolworths"
  originalExamples: string[];  // ["WOOLWORTHS 1234", "Woolworths Sydney"]
  categoryId: string;
  categoryName: string;
  confidence: number;          // 0-1, higher = more reliable
  usageCount: number;
  userConfirmed: boolean;      // true if user manually set category
  lastUsed: Date;
  createdAt: Date;
}
```

### Merchant Normalization

```typescript
// Internal normalization function
function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
    .replace(/\s+/g, ' ')          // Collapse whitespace
    .trim()
    .split(' ')
    .slice(0, 3)                   // First 3 words
    .join(' ');
}

// "WOOLWORTHS/SYDNEY 1234" -> "woolworths sydney 1234"
```

### Learning from User Corrections

When user manually changes a category, it creates a high-confidence pattern:

```typescript
await llmCategorizationService.learnFromUserCorrection(
  transactionId,
  newCategoryId
);
// Creates pattern with confidence: 1.0, userConfirmed: true
```

## Categorization Flow

1. **Check cached patterns first** - Fast lookup by normalized merchant name
2. **Check LLM availability** - Skip if Ollama not running
3. **Batch LLM calls** - Process 15 transactions per request
4. **Cache results** - Store patterns for future lookups
5. **Apply confidence threshold** - Only accept confidence >= 0.7

## Ollama Client

```typescript
// src/lib/ai/ollama-client.ts
class OllamaClient {
  updateConfig(config: { host?: string; model?: string }): void;

  async checkHealth(): Promise<{ connected: boolean; modelReady: boolean }>;

  async generate(prompt: string, system?: string): Promise<string>;

  async chat(messages: ChatMessage[]): Promise<string>;

  async listModels(): Promise<string[]>;

  async pullModel(modelName: string): Promise<void>;
}

export const ollamaClient = new OllamaClient();
```

## Response Parsing

LLM responses can be JSON or markdown-wrapped JSON:

```typescript
function parseJSONResponse<T>(response: string): T | null {
  try {
    return JSON.parse(response);
  } catch {
    // Try extracting from markdown code block
    const match = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return JSON.parse(match[1]);

    // Try finding JSON array/object
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);

    return null;
  }
}
```

## AI Store

```typescript
// src/stores/ai.store.ts
interface AIStore {
  isConnected: boolean;
  currentModel: string;
  conversations: ChatConversation[];

  checkConnection: () => Promise<boolean>;
  setModel: (model: string) => void;
  sendMessage: (message: string) => Promise<string>;
  clearConversation: () => void;
}

export const useAIStore = create<AIStore>((set, get) => ({
  // ... implementation
}));
```

## Chat Widget

Located at `src/components/ai/chat-widget.tsx`. Provides floating chat interface for financial insights.

### Context Building

```typescript
// src/lib/ai/context-builder.ts
async function buildFinancialContext(): Promise<string> {
  const accounts = await db.accounts.where('isActive').equals(1).toArray();
  const recentTransactions = await db.transactions.orderBy('date').reverse().limit(50).toArray();

  return `
    User has ${accounts.length} accounts with total balance $X.
    Recent spending patterns: ...
  `;
}
```

## Error Handling

```typescript
try {
  const result = await llmCategorizationService.categorizeTransactions(txns);
} catch (error) {
  if (error.message.includes('ECONNREFUSED')) {
    // Ollama not running
    toast.error('Please start Ollama to use AI categorization');
  }
}
```
