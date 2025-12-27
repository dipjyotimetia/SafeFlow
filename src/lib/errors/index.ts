// Centralized error handling utilities for SafeFlow

/**
 * Error codes for categorizing errors
 */
export enum ErrorCode {
  // Database errors
  DB_OPERATION_FAILED = 'DB_OPERATION_FAILED',
  DB_NOT_FOUND = 'DB_NOT_FOUND',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_STATE = 'INVALID_STATE',

  // Sync errors
  SYNC_FAILED = 'SYNC_FAILED',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',

  // Parser errors
  PARSE_FAILED = 'PARSE_FAILED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  INVALID_FILE = 'INVALID_FILE',

  // AI errors
  AI_CONNECTION_FAILED = 'AI_CONNECTION_FAILED',
  AI_CATEGORIZATION_FAILED = 'AI_CATEGORIZATION_FAILED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_FAILED = 'AUTH_FAILED',
  API_ERROR = 'API_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for SafeFlow with additional context
 */
export class SafeFlowError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, unknown>;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'SafeFlowError';
    this.code = code;
    this.context = options?.context;
    this.originalError = options?.cause;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SafeFlowError);
    }
  }

  /**
   * Create a JSON representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Patterns to detect and redact sensitive data in error messages
 */
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  { pattern: /(?:api[_-]?key|token|bearer|auth)[=:\s]+["']?[\w\-./]+["']?/gi, replacement: '[REDACTED_TOKEN]' },
  // Passwords
  { pattern: /(?:password|passwd|pwd)[=:\s]+["']?[^"'\s]+["']?/gi, replacement: '[REDACTED_PASSWORD]' },
  // File paths that might contain usernames
  { pattern: /\/Users\/[^/\s]+/g, replacement: '/Users/[REDACTED]' },
  { pattern: /C:\\Users\\[^\\]+/g, replacement: 'C:\\Users\\[REDACTED]' },
  // Email addresses
  { pattern: /[\w.+-]+@[\w.-]+\.\w+/g, replacement: '[REDACTED_EMAIL]' },
  // URLs with credentials
  { pattern: /:\/\/[^:]+:[^@]+@/g, replacement: '://[REDACTED]:[REDACTED]@' },
];

/**
 * Sanitize a string by removing sensitive data patterns
 */
function sanitizeString(str: string): string {
  let result = str;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Sanitize an error message and stack trace
 */
function sanitizeError(error: Error): { message: string; stack?: string } {
  return {
    message: sanitizeString(error.message),
    stack: error.stack ? sanitizeString(error.stack) : undefined,
  };
}

/**
 * Log an error with consistent formatting
 * Sanitizes sensitive data before logging
 */
export function logError(context: string, error: unknown): void {
  const errorObj = normalizeError(error);
  const sanitized = sanitizeError(errorObj);
  const timestamp = new Date().toISOString();

  console.error(`[SafeFlow:${context}] ${timestamp}`, {
    message: sanitized.message,
    code: errorObj instanceof SafeFlowError ? errorObj.code : ErrorCode.UNKNOWN_ERROR,
    context: errorObj instanceof SafeFlowError ? errorObj.context : undefined,
    // Only include sanitized stack in development
    ...(process.env.NODE_ENV === 'development' && { stack: sanitized.stack }),
  });
}

/**
 * Normalize any error-like value to an Error object
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error(String(error));
}

/**
 * Extract a user-friendly message from an error
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof SafeFlowError) {
    return error.message;
  }
  if (error instanceof Error) {
    // Clean up common error messages
    const message = error.message;

    // Handle Dexie errors
    if (message.includes('Dexie')) {
      return 'A database error occurred. Please try again.';
    }

    // Handle network errors
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return 'Network error. Please check your connection.';
    }

    return message;
  }
  return 'An unexpected error occurred.';
}

/**
 * Check if an error is of a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof SafeFlowError && error.code === code;
}

/**
 * Create a SafeFlowError from an unknown error
 */
export function wrapError(
  error: unknown,
  code: ErrorCode,
  context?: string
): SafeFlowError {
  const normalizedError = normalizeError(error);

  return new SafeFlowError(
    context ? `${context}: ${normalizedError.message}` : normalizedError.message,
    code,
    {
      cause: normalizedError instanceof Error ? normalizedError : undefined,
      context: context ? { operation: context } : undefined,
    }
  );
}

/**
 * Handle store errors consistently
 * Logs the error and re-throws a SafeFlowError
 */
export function handleStoreError(context: string, error: unknown): never {
  logError(context, error);

  if (error instanceof SafeFlowError) {
    throw error;
  }

  throw wrapError(error, ErrorCode.DB_OPERATION_FAILED, context);
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  context: string,
  errors: Array<{ path: string; message: string }>
): never {
  const message = errors.map((e) => `${e.path}: ${e.message}`).join('; ');

  throw new SafeFlowError(
    `Validation failed for ${context}: ${message}`,
    ErrorCode.VALIDATION_FAILED,
    { context: { validationErrors: errors } }
  );
}

/**
 * Try-catch wrapper that converts errors to SafeFlowError
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  errorCode: ErrorCode,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw wrapError(error, errorCode, context);
  }
}

/**
 * Try-catch wrapper for sync functions
 */
export function safeSync<T>(
  fn: () => T,
  errorCode: ErrorCode,
  context?: string
): T {
  try {
    return fn();
  } catch (error) {
    throw wrapError(error, errorCode, context);
  }
}
