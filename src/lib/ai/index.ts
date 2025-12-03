export { ollamaClient, type OllamaConfig, type HealthCheckResult } from './ollama-client';
export {
  SYSTEM_PROMPTS,
  buildSpendingAnalysisPrompt,
  buildBudgetPrompt,
  buildTaxPrompt,
  buildInvestmentPrompt,
  buildCategorizationPrompt,
  buildSingleCategorizationPrompt,
} from './prompts';
export { buildFinancialContext, buildContextString, buildSpendingContext } from './context-builder';
export { llmCategorizationService } from './llm-categorization';
