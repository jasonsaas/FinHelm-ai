import {
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
  formatErrorForUser,
} from '../../utils/errorHandling';

/**
 * Test Suite for Error Handling Utilities
 * Comprehensive tests for error classes, logging, retry logic, and HTTP error handling
 */

describe('Error Handling Utilities', () => {
  beforeEach(() => {
    // Clear error logs before each test
    errorLogger.clearLogs();
    
    // Mock localStorage and sessionStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AppError', () => {
    test('should create error with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.context).toEqual({});
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('AppError');
    });

    test('should create error with custom code and context', () => {
      const context = { field: 'email', value: 'invalid' };
      const error = new AppError('Validation failed', 'VALIDATION_ERROR', context);
      
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.context).toEqual(context);
    });

    test('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 'TEST_CODE', { data: 'test' });
      const json = error.toJSON();
      
      expect(json.name).toBe('AppError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_CODE');
      expect(json.context).toEqual({ data: 'test' });
      expect(json.timestamp).toBeDefined();
    });

    test('should create from existing AppError', () => {
      const originalError = new AppError('Original', 'ORIGINAL');
      const wrappedError = AppError.fromError(originalError, 'NEW_CODE');
      
      expect(wrappedError).toBe(originalError); // Should return same instance
    });

    test('should create from regular Error', () => {
      const originalError = new Error('Regular error');
      const appError = AppError.fromError(originalError, 'WRAPPED');
      
      expect(appError.message).toBe('Regular error');
      expect(appError.code).toBe('WRAPPED');
      expect(appError.context.originalName).toBe('Error');
    });

    test('should create from unknown error type', () => {
      const appError = AppError.fromError('String error', 'STRING_ERROR');
      
      expect(appError.message).toBe('String error');
      expect(appError.code).toBe('STRING_ERROR');
      expect(appError.context.originalError).toBe('String error');
    });

    test('should capture user and session ID from storage', () => {
      const mockUser = { id: 'user-123' };
      const mockSessionId = 'session-456';
      
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockUser));
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(mockSessionId);
      
      const error = new AppError('Test with context');
      
      expect(error.userId).toBe('user-123');
      expect(error.sessionId).toBe('session-456');
    });
  });

  describe('Specific Error Classes', () => {
    test('NetworkError should have correct properties', () => {
      const error = new NetworkError('Network failed', { status: 500 });
      
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Network failed');
      expect(error.context.status).toBe(500);
    });

    test('ValidationError should include field context', () => {
      const error = new ValidationError('Invalid email', 'email', { value: 'invalid' });
      
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.context.field).toBe('email');
      expect(error.context.value).toBe('invalid');
    });

    test('AuthenticationError should have default message', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('RateLimitError should include retry after', () => {
      const error = new RateLimitError('Rate limited', 60);
      
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.context.retryAfter).toBe(60);
    });
  });

  describe('ErrorLogger', () => {
    test('should log errors correctly', () => {
      const error = new AppError('Test log');
      errorLogger.log(error, ErrorSeverity.HIGH);
      
      const logs = errorLogger.getRecentLogs(1);
      expect(logs).toHaveLength(1);
      expect(logs[0].error).toBe(error);
      expect(logs[0].severity).toBe(ErrorSeverity.HIGH);
    });

    test('should maintain log size limit', () => {
      // Create more logs than the limit (which is 1000 by default)
      for (let i = 0; i < 1005; i++) {
        errorLogger.log(new AppError(`Error ${i}`));
      }
      
      const logs = errorLogger.getRecentLogs(2000);
      expect(logs.length).toBe(1000); // Should be capped at maxLogs
    });

    test('should provide error statistics', () => {
      errorLogger.log(new AppError('Error 1'), ErrorSeverity.LOW);
      errorLogger.log(new AppError('Error 2'), ErrorSeverity.HIGH);
      errorLogger.log(new NetworkError('Network error'));
      
      const stats = errorLogger.getStats();
      
      expect(stats.totalLogs).toBe(3);
      expect(stats.bySeverity.low).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.byCode['UNKNOWN_ERROR']).toBe(2);
      expect(stats.byCode['NETWORK_ERROR']).toBe(1);
    });

    test('should clear logs', () => {
      errorLogger.log(new AppError('Test'));
      expect(errorLogger.getRecentLogs()).toHaveLength(1);
      
      errorLogger.clearLogs();
      expect(errorLogger.getRecentLogs()).toHaveLength(0);
    });
  });

  describe('withRetry', () => {
    test('should succeed on first attempt', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(successFn);
      
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    test('should retry on retryable errors', async () => {
      const failTwiceFn = jest.fn()
        .mockRejectedValueOnce(new NetworkError('Network failed'))
        .mockRejectedValueOnce(new NetworkError('Network failed again'))
        .mockResolvedValue('success');
      
      const result = await withRetry(failTwiceFn, { baseDelay: 10 });
      
      expect(result).toBe('success');
      expect(failTwiceFn).toHaveBeenCalledTimes(3);
    });

    test('should not retry on non-retryable errors', async () => {
      const authErrorFn = jest.fn().mockRejectedValue(new AuthenticationError());
      
      await expect(withRetry(authErrorFn)).rejects.toThrow(AuthenticationError);
      expect(authErrorFn).toHaveBeenCalledTimes(1);
    });

    test('should exhaust retry attempts', async () => {
      const alwaysFailFn = jest.fn().mockRejectedValue(new NetworkError('Always fails'));
      
      await expect(
        withRetry(alwaysFailFn, { maxAttempts: 2, baseDelay: 10 })
      ).rejects.toThrow('Always fails');
      
      expect(alwaysFailFn).toHaveBeenCalledTimes(2);
    });

    test('should use custom retry logic', async () => {
      const customError = new AppError('Custom', 'CUSTOM_CODE');
      const failFn = jest.fn().mockRejectedValue(customError);
      
      const isRetryable = jest.fn().mockReturnValue(true);
      
      await expect(
        withRetry(failFn, { maxAttempts: 2, baseDelay: 10, isRetryable })
      ).rejects.toThrow('Custom');
      
      expect(failFn).toHaveBeenCalledTimes(2);
      expect(isRetryable).toHaveBeenCalledWith(customError);
    });
  });

  describe('safeAsync', () => {
    test('should return result on success', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      
      const result = await safeAsync(successFn, 'fallback');
      
      expect(result).toBe('success');
    });

    test('should return fallback on error', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));
      
      const result = await safeAsync(failFn, 'fallback');
      
      expect(result).toBe('fallback');
    });

    test('should log error', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      
      await safeAsync(failFn, 'fallback', ErrorSeverity.HIGH);
      
      const logs = errorLogger.getRecentLogs(1);
      expect(logs).toHaveLength(1);
      expect(logs[0].severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('safeSync', () => {
    test('should return result on success', () => {
      const successFn = jest.fn().mockReturnValue('success');
      
      const result = safeSync(successFn, 'fallback');
      
      expect(result).toBe('success');
    });

    test('should return fallback on error', () => {
      const failFn = jest.fn().mockImplementation(() => {
        throw new Error('Failed');
      });
      
      const result = safeSync(failFn, 'fallback');
      
      expect(result).toBe('fallback');
    });
  });

  describe('handleHttpError', () => {
    const createMockResponse = (
      status: number,
      statusText: string,
      body?: any
    ): Response => {
      const response = {
        ok: status >= 200 && status < 300,
        status,
        statusText,
        url: 'https://api.example.com/test',
        headers: new Headers(),
        json: jest.fn().mockResolvedValue(body),
      } as unknown as Response;
      
      return response;
    };

    test('should return response for success status', async () => {
      const response = createMockResponse(200, 'OK');
      
      const result = await handleHttpError(response);
      
      expect(result).toBe(response);
    });

    test('should throw ValidationError for 400', async () => {
      const response = createMockResponse(400, 'Bad Request');
      
      await expect(handleHttpError(response)).rejects.toThrow(ValidationError);
    });

    test('should throw AuthenticationError for 401', async () => {
      const response = createMockResponse(401, 'Unauthorized');
      
      await expect(handleHttpError(response)).rejects.toThrow(AuthenticationError);
    });

    test('should throw AuthorizationError for 403', async () => {
      const response = createMockResponse(403, 'Forbidden');
      
      await expect(handleHttpError(response)).rejects.toThrow(AuthorizationError);
    });

    test('should throw RateLimitError for 429 with retry-after', async () => {
      const response = createMockResponse(429, 'Too Many Requests');
      response.headers.set('Retry-After', '60');
      
      await expect(handleHttpError(response)).rejects.toThrow(RateLimitError);
      
      try {
        await handleHttpError(response);
      } catch (error) {
        if (error instanceof RateLimitError) {
          expect(error.context.retryAfter).toBe(60000); // Should be in milliseconds
        }
      }
    });

    test('should throw NetworkError for 5xx errors', async () => {
      const response = createMockResponse(500, 'Internal Server Error');
      
      await expect(handleHttpError(response)).rejects.toThrow(NetworkError);
    });

    test('should include response body in error context', async () => {
      const errorBody = { message: 'Custom error message', field: 'email' };
      const response = createMockResponse(400, 'Bad Request', errorBody);
      
      try {
        await handleHttpError(response);
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.message).toBe('Custom error message');
          expect(error.context.field).toBe('email');
        }
      }
    });
  });

  describe('formatErrorForUser', () => {
    test('should format validation errors', () => {
      const error = new ValidationError('Email is required');
      
      const message = formatErrorForUser(error);
      
      expect(message).toBe('Email is required');
    });

    test('should format authentication errors', () => {
      const error = new AuthenticationError('Token expired');
      
      const message = formatErrorForUser(error);
      
      expect(message).toBe('Please log in to continue.');
    });

    test('should format authorization errors', () => {
      const error = new AuthorizationError('Access denied');
      
      const message = formatErrorForUser(error);
      
      expect(message).toBe('You do not have permission to perform this action.');
    });

    test('should format rate limit errors', () => {
      const error = new RateLimitError('Too many requests');
      
      const message = formatErrorForUser(error);
      
      expect(message).toBe('Too many requests. Please try again in a few moments.');
    });

    test('should format network errors', () => {
      const error = new NetworkError('Connection failed');
      
      const message = formatErrorForUser(error);
      
      expect(message).toBe('Network error. Please check your connection and try again.');
    });

    test('should format generic errors', () => {
      const error = new Error('Unknown error');
      
      const message = formatErrorForUser(error);
      
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });
  });
});