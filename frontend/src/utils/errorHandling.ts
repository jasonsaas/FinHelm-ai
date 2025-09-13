/**
 * Comprehensive Error Handling Utilities
 * 
 * This module provides centralized error handling, logging, and recovery utilities
 * for the FinHelm.ai application. It includes type-safe error classes, retry logic,
 * and integration with error monitoring services.
 */

/**
 * Base error class with additional context
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly userId?: string;
  public readonly sessionId?: string;

  /**
   * Create a new AppError
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param context - Additional error context
   */
  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    
    // Capture current user/session if available
    try {
      const user = localStorage.getItem('user');
      this.userId = user ? JSON.parse(user).id : undefined;
      this.sessionId = sessionStorage.getItem('sessionId') || undefined;
    } catch {
      // Ignore storage errors
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert error to plain object for logging/reporting
   * @returns Serializable error object
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      stack: this.stack,
    };
  }

  /**
   * Create an AppError from an unknown error
   * @param error - The original error
   * @param code - Error code to assign
   * @param context - Additional context
   * @returns AppError instance
   */
  static fromError(
    error: unknown, 
    code: string = 'WRAPPED_ERROR',
    context: Record<string, any> = {}
  ): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      const appError = new AppError(error.message, code, {
        originalName: error.name,
        ...context,
      });
      appError.stack = error.stack;
      return appError;
    }

    return new AppError(
      String(error) || 'Unknown error occurred',
      code,
      { originalError: error, ...context }
    );
  }
}

/**
 * Specific error classes for different error types
 */
export class NetworkError extends AppError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, context: Record<string, any> = {}) {
    super(message, 'VALIDATION_ERROR', { field, ...context });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context: Record<string, any> = {}) {
    super(message, 'AUTHENTICATION_ERROR', context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context: Record<string, any> = {}) {
    super(message, 'AUTHORIZATION_ERROR', context);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfter?: number, context: Record<string, any> = {}) {
    super(message, 'RATE_LIMIT_ERROR', { retryAfter, ...context });
    this.name = 'RateLimitError';
  }
}

export class ConvexError extends AppError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'CONVEX_ERROR', context);
    this.name = 'ConvexError';
  }
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error logging interface
 */
interface ErrorLogEntry {
  error: AppError;
  severity: ErrorSeverity;
  userId?: string;
  sessionId?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  context: Record<string, any>;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  isRetryable: (error) => {
    if (error instanceof NetworkError) return true;
    if (error instanceof RateLimitError) return true;
    if (error instanceof AppError) {
      return ['TIMEOUT_ERROR', 'SERVER_ERROR'].includes(error.code);
    }
    return false;
  },
};

/**
 * Error Logger Class
 */
class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 1000;

  /**
   * Log an error
   * @param error - The error to log
   * @param severity - Error severity level
   * @param context - Additional context
   */
  log(
    error: unknown, 
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Record<string, any> = {}
  ): void {
    const appError = error instanceof AppError ? error : AppError.fromError(error);
    
    const logEntry: ErrorLogEntry = {
      error: appError,
      severity,
      userId: appError.userId,
      sessionId: appError.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      context: { ...appError.context, ...context },
    };

    // Add to local logs
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console logging based on severity
    const logMethod = this.getConsoleMethod(severity);
    logMethod('Error logged:', logEntry);

    // Send to external monitoring service
    this.reportToMonitoring(logEntry);
  }

  /**
   * Get appropriate console method for severity
   */
  private getConsoleMethod(severity: ErrorSeverity): typeof console.log {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.info;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Report error to external monitoring service
   */
  private async reportToMonitoring(logEntry: ErrorLogEntry): Promise<void> {
    try {
      // In production, integrate with services like Sentry, LogRocket, etc.
      if (process.env.NODE_ENV === 'production') {
        // Example: Sentry.captureException(logEntry.error, { extra: logEntry.context });
        console.log('Would report to monitoring service:', logEntry);
      }
    } catch (reportingError) {
      console.error('Failed to report error to monitoring service:', reportingError);
    }
  }

  /**
   * Get recent error logs
   * @param limit - Maximum number of logs to return
   * @returns Recent error logs
   */
  getRecentLogs(limit: number = 10): ErrorLogEntry[] {
    return this.logs.slice(0, limit);
  }

  /**
   * Clear error logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get error statistics
   */
  getStats(): Record<string, any> {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const recentLogs = this.logs.filter(log => 
      new Date(log.timestamp).getTime() > oneDayAgo
    );

    const hourlyLogs = recentLogs.filter(log =>
      new Date(log.timestamp).getTime() > oneHourAgo
    );

    return {
      totalLogs: this.logs.length,
      last24Hours: recentLogs.length,
      lastHour: hourlyLogs.length,
      bySeverity: {
        low: this.logs.filter(log => log.severity === ErrorSeverity.LOW).length,
        medium: this.logs.filter(log => log.severity === ErrorSeverity.MEDIUM).length,
        high: this.logs.filter(log => log.severity === ErrorSeverity.HIGH).length,
        critical: this.logs.filter(log => log.severity === ErrorSeverity.CRITICAL).length,
      },
      byCode: this.logs.reduce((acc, log) => {
        acc[log.error.code] = (acc[log.error.code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

/**
 * Global error logger instance
 */
export const errorLogger = new ErrorLogger();

/**
 * Async function with retry logic and error handling
 * @param fn - Function to execute
 * @param config - Retry configuration
 * @returns Promise with result or throws error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!finalConfig.isRetryable?.(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitterDelay = delay + Math.random() * 1000;

      errorLogger.log(
        error,
        ErrorSeverity.LOW,
        { attempt, nextRetryDelay: jitterDelay }
      );

      await new Promise(resolve => setTimeout(resolve, jitterDelay));
    }
  }

  throw lastError;
}

/**
 * Safe async function wrapper that catches and logs errors
 * @param fn - Async function to wrap
 * @param fallback - Fallback value if function fails
 * @param severity - Error severity for logging
 * @returns Promise with result or fallback value
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    errorLogger.log(error, severity);
    return fallback;
  }
}

/**
 * Safe sync function wrapper that catches and logs errors
 * @param fn - Function to wrap
 * @param fallback - Fallback value if function fails
 * @param severity - Error severity for logging
 * @returns Result or fallback value
 */
export function safeSync<T>(
  fn: () => T,
  fallback: T,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): T {
  try {
    return fn();
  } catch (error) {
    errorLogger.log(error, severity);
    return fallback;
  }
}

/**
 * Handle common HTTP errors
 * @param response - Fetch Response object
 * @returns Promise that resolves or throws appropriate error
 */
export async function handleHttpError(response: Response): Promise<Response> {
  if (response.ok) {
    return response;
  }

  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  let context: Record<string, any> = {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
  };

  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorMessage;
    context = { ...context, ...errorData };
  } catch {
    // Ignore JSON parsing errors
  }

  switch (response.status) {
    case 400:
      throw new ValidationError(errorMessage, undefined, context);
    case 401:
      throw new AuthenticationError(errorMessage, context);
    case 403:
      throw new AuthorizationError(errorMessage, context);
    case 429:
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError(
        errorMessage,
        retryAfter ? parseInt(retryAfter) * 1000 : undefined,
        context
      );
    case 500:
    case 502:
    case 503:
    case 504:
      throw new NetworkError(errorMessage, context);
    default:
      throw new AppError(errorMessage, `HTTP_${response.status}`, context);
  }
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.log(
      event.reason,
      ErrorSeverity.HIGH,
      { type: 'unhandledrejection', promise: event.promise }
    );

    // Prevent default console error
    event.preventDefault();
  });

  // Handle uncaught exceptions
  window.addEventListener('error', (event) => {
    errorLogger.log(
      new AppError(event.message, 'UNCAUGHT_ERROR', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }),
      ErrorSeverity.HIGH
    );
  });

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      const target = event.target as Element;
      errorLogger.log(
        new AppError(
          `Failed to load resource: ${target.tagName}`,
          'RESOURCE_LOAD_ERROR',
          {
            tagName: target.tagName,
            src: target.getAttribute('src'),
            href: target.getAttribute('href'),
          }
        ),
        ErrorSeverity.MEDIUM
      );
    }
  }, true);
}

/**
 * Format error for display to users
 * @param error - Error to format
 * @returns User-friendly error message
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof AuthenticationError) {
    return 'Please log in to continue.';
  }

  if (error instanceof AuthorizationError) {
    return 'You do not have permission to perform this action.';
  }

  if (error instanceof RateLimitError) {
    return 'Too many requests. Please try again in a few moments.';
  }

  if (error instanceof NetworkError) {
    return 'Network error. Please check your connection and try again.';
  }

  if (error instanceof AppError) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

export default {
  AppError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ConvexError,
  ErrorSeverity,
  errorLogger,
  withRetry,
  safeAsync,
  safeSync,
  handleHttpError,
  setupGlobalErrorHandlers,
  formatErrorForUser,
};