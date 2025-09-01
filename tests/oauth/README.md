# QuickBooks OAuth Testing Suite

This comprehensive testing suite ensures the reliability, security, and performance of the QuickBooks OAuth integration in FinHelm.ai.

## 📋 Test Structure

```
tests/oauth/
├── quickbooks-oauth-flow.test.ts     # Core OAuth flow testing
├── oauth-security.test.ts            # Security-focused OAuth tests
├── oauth-integration.test.ts         # Integration and E2E tests
├── oauth-test-utils.ts               # Testing utilities and mocks
├── oauth.config.ts                   # Test configuration and helpers
└── README.md                         # This documentation
```

## 🧪 Test Categories

### 1. Core OAuth Flow Tests (`quickbooks-oauth-flow.test.ts`)
- **Authorization URL Generation**: Validates proper OAuth URL construction
- **Token Exchange**: Tests authorization code to access token exchange
- **Token Refresh**: Validates refresh token flow and token renewal
- **Token Validation**: Ensures proper token format and expiration handling
- **Error Handling**: Tests various OAuth error scenarios
- **State Parameter Security**: Validates CSRF protection mechanisms

### 2. Security Tests (`oauth-security.test.ts`)
- **HTTPS Enforcement**: Ensures secure connections in production
- **Input Validation**: Tests against malicious inputs and injection attacks
- **Token Security**: Validates secure token handling and storage
- **CSRF Protection**: Tests state parameter implementation
- **Error Information Disclosure**: Ensures no sensitive data in error messages
- **Timing Attack Prevention**: Basic timing security validation

### 3. Integration Tests (`oauth-integration.test.ts`)
- **Complete OAuth Flow**: End-to-end OAuth implementation testing
- **Error Recovery**: Tests resilience and retry mechanisms
- **Performance Testing**: Validates response times and throughput
- **Data Synchronization**: Tests OAuth integration with data fetching
- **Cross-Environment**: Validates sandbox and production environments
- **Monitoring**: Tests metrics and observability features

## 🚀 Quick Start

### Run All OAuth Tests
```bash
npm run test:oauth
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:oauth:unit

# Security tests only
npm run test:oauth:security

# Integration tests only
npm run test:oauth:integration

# Performance tests
npm run test:oauth:performance
```

### Watch Mode for Development
```bash
npm run test:oauth:watch
```

### Generate Coverage Report
```bash
npm run test:oauth:coverage
```

## ⚙️ Test Configuration

### Environment Variables
Set these environment variables for testing:

```bash
# Required for OAuth tests
QB_CLIENT_ID=test-client-id
QB_CLIENT_SECRET=test-client-secret
QB_ENVIRONMENT=sandbox
QB_REDIRECT_URI=http://localhost:3000/callback

# Optional for enhanced testing
QB_OAUTH_BASE_URL=http://localhost:1080  # For mock server tests
QB_API_BASE_URL=http://localhost:1081    # For API mock tests
NODE_ENV=test
DEBUG=oauth:*                            # Enable OAuth debug logging
```

### Test Data Configuration
The test suite uses configurable parameters in `oauth.config.ts`:

```typescript
export const OAuth_TEST_CONFIG = {
  TIMEOUTS: {
    UNIT_TEST: 5000,
    INTEGRATION_TEST: 15000,
    E2E_TEST: 30000,
  },
  PERFORMANCE: {
    MAX_TOKEN_EXCHANGE_TIME: 2000,
    MAX_TOKEN_REFRESH_TIME: 1500,
  },
  // ... more configuration
};
```

## 🔧 Test Utilities

### Mock Data Generation
```typescript
import { TestDataFactory } from './oauth-test-utils';

// Generate test configuration
const config = TestDataFactory.createConfig({
  environment: 'sandbox',
  clientId: 'custom-client-id'
});

// Generate test tokens
const tokens = TestDataFactory.createTokens({
  realmId: 'custom-realm-id'
});
```

### Performance Testing
```typescript
import { PerformanceTestUtils } from './oauth-test-utils';

// Measure execution time
const { result, executionTime } = await PerformanceTestUtils.measureExecutionTime(
  () => integration.handleCallback('code', 'realm', 'state'),
  2000 // Max expected time in ms
);
```

### Security Testing
```typescript
import { SecurityTestUtils } from './oauth-test-utils';

// Generate malicious inputs for testing
const maliciousInputs = SecurityTestUtils.generateMaliciousInputs();

// Validate secure URL configuration
SecurityTestUtils.validateSecureUrl(authUrl);

// Check for secrets in logs
SecurityTestUtils.validateNoSecretsInLogs(logOutput);
```

## 📊 Performance Benchmarks

The test suite enforces these performance thresholds:

| Operation | Max Time | Description |
|-----------|----------|-------------|
| Auth URL Generation | 10ms | Creating OAuth authorization URLs |
| Token Exchange | 2000ms | Authorization code to access token |
| Token Refresh | 1500ms | Refreshing expired access tokens |
| API Calls | 5000ms | QuickBooks API requests |
| Concurrent Requests | 50 req/s | Minimum throughput requirement |

## 🔒 Security Test Coverage

### Input Validation Tests
- XSS injection attempts
- SQL injection patterns
- Path traversal attacks
- Code injection (template, LDAP, etc.)
- Buffer overflow attempts
- Unicode normalization attacks

### OAuth Security Tests
- HTTPS enforcement in production
- Client credential protection
- Token format validation
- State parameter entropy
- CSRF protection validation
- Error message sanitization

### Timing Attack Tests
- Constant-time token validation
- Consistent response timing
- No information leakage through timing

## 🚀 CI/CD Integration

### GitHub Actions Integration
The test suite integrates with the CI/CD pipeline in `.github/workflows/ci-cd.yml`:

```yaml
# OAuth-specific test job
test-oauth:
  name: OAuth Tests
  strategy:
    matrix:
      test-type: [unit, security, integration, performance]
  steps:
    - name: Run OAuth Tests
      run: npm run test:oauth:${{ matrix.test-type }}
```

### Test Reports
Tests generate JUnit-compatible reports for CI/CD:

```bash
npm run test:ci:oauth  # Generates oauth-test-results.xml
```

## 🐛 Debugging Tests

### Enable Debug Logging
```bash
DEBUG=oauth:* npm run test:oauth:watch
```

### Verbose Test Output
```bash
npm run test:oauth -- --reporter=verbose
```

### Test Specific Files
```bash
# Test only OAuth flow
npx vitest tests/oauth/quickbooks-oauth-flow.test.ts

# Test only security features
npx vitest tests/oauth/oauth-security.test.ts
```

## 📈 Test Metrics

The test suite collects and reports metrics:

```typescript
import { OAuthTestMetrics } from './oauth.config';

// Metrics are automatically collected during test runs
const report = OAuthTestMetrics.generateReport();
console.log(report);
```

Sample metrics report:
```
OAuth Test Metrics Report
========================
Total Tests: 156
Successful: 154 (98.7%)
Average Duration: 245.32ms

Operation Breakdown:
  token_exchange: 45 tests, 1234.56ms avg, 100.0% success
  token_refresh: 23 tests, 567.89ms avg, 100.0% success
  auth_url_generation: 88 tests, 8.45ms avg, 100.0% success
```

## 🔄 Continuous Integration

### Pre-commit Hooks
Add OAuth tests to your pre-commit hooks:

```bash
# .husky/pre-commit
npm run test:oauth:unit
npm run test:oauth:security
```

### Pull Request Checks
OAuth tests are automatically run on all pull requests targeting:
- `main` branch
- `develop` branch
- `feature/*` branches touching OAuth code

### Deployment Gates
All OAuth tests must pass before deployment to:
- Staging environment
- Production environment

## 📚 Additional Resources

### QuickBooks OAuth Documentation
- [Intuit OAuth 2.0 Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [QuickBooks API Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting)

### Security Best Practices
- [OWASP OAuth Security Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [RFC 6819: OAuth 2.0 Threat Model](https://tools.ietf.org/html/rfc6819)

### Testing Resources
- [Vitest Documentation](https://vitest.dev/)
- [Jest Testing Framework](https://jestjs.io/)

## 🤝 Contributing

When adding new OAuth functionality:

1. **Add corresponding tests** in the appropriate test file
2. **Update test utilities** if new mock data is needed
3. **Add performance benchmarks** for new operations
4. **Include security tests** for new endpoints or flows
5. **Update this documentation** with new test coverage

### Test Naming Convention
```typescript
describe('OAuth Feature', () => {
  describe('Happy Path', () => {
    it('should handle normal case successfully', () => {});
  });
  
  describe('Error Handling', () => {
    it('should handle specific error gracefully', () => {});
  });
  
  describe('Edge Cases', () => {
    it('should handle edge case properly', () => {});
  });
  
  describe('Security', () => {
    it('should prevent security issue', () => {});
  });
});
```

### Performance Test Requirements
New features must include performance tests with realistic thresholds:

```typescript
it('should complete operation within performance threshold', async () => {
  const { executionTime } = await PerformanceTestUtils.measureExecutionTime(
    () => newFeatureOperation(),
    EXPECTED_MAX_TIME_MS
  );
  
  expect(executionTime).toBeLessThan(EXPECTED_MAX_TIME_MS);
});
```

---

**Happy Testing! 🎉**

For questions or issues with the OAuth test suite, please create an issue in the repository or contact the development team.