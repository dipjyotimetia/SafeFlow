export { ollamaClient, type OllamaConfig, type HealthCheckResult } from './ollama-client';
export { SYSTEM_PROMPTS, buildCategorizationPrompt, buildSpendingAnalysisPrompt, buildBudgetPrompt, buildTaxPrompt, buildInvestmentPrompt } from './prompts';
export { buildFinancialContext, buildContextString, buildSpendingContext } from './context-builder';
export { categorizationService, type QueueStatus, type ProcessingResult } from './categorization';
