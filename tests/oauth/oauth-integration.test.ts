import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { QuickBooksIntegration } from '../../integrations/quickbooks';
import { 
  MOCK_CONFIG, 
  MOCK_COMPANY_INFO_RESPONSE,
  TestDataFactory,
  OAuthTestUtils,
  PerformanceTestUtils
} from './oauth-test-utils';

/**
 * OAuth Integration Tests
 * End-to-end testing of QuickBooks OAuth integration with realistic scenarios
 * Tests complete OAuth flows, error recovery, and production-like conditions
 */

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('QuickBooks OAuth Integration Tests', () => {
  let integration: QuickBooksIntegration;

  beforeEach(() => {
    integration = new QuickBooksIntegration(MOCK_CONFIG, 'http://localhost:3001');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete OAuth Flow Integration', () => {
    it('should complete full OAuth authorization flow successfully', async () => {
      // Step 1: Generate authorization URL
      const state = OAuthTestUtils.generateSecureState();
      const authUri = integration.getAuthUri(state);
      
      // Validate authorization URL
      expect(authUri).toContain('appcenter.intuit.com');
      expect(authUri).toContain(MOCK_CONFIG.clientId);
      expect(authUri).toContain(state);
      
      // Step 2: Simulate user authorization and callback
      const authCode = 'QB_AUTH_CODE_12345';
      const realmId = '9130347596842384658';
      
      const mockTokenResponse = {
        token: TestDataFactory.createTokens({ realmId })
      };
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);
      
      const tokens = await integration.handleCallback(authCode, realmId, state);
      
      // Validate tokens
      OAuthTestUtils.expectValidTokens(tokens);
      expect(tokens.realmId).toBe(realmId);
      
      // Step 3: Test API access with new tokens
      mockedAxios.get.mockResolvedValue(MOCK_COMPANY_INFO_RESPONSE);
      
      const isConnected = await integration.testConnection(tokens.access_token, tokens.realmId);
      expect(isConnected).toBe(true);
      
      // Verify API call was made with correct headers
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`companyinfo/${realmId}`),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${tokens.access_token}`,
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should handle OAuth flow with token refresh', async () => {
      // Step 1: Start with expired tokens
      const expiredTokens = TestDataFactory.createExpiredTokens();
      
      // Step 2: Mock refresh token response
      const refreshResponse = {
        token: TestDataFactory.createTokens({
          access_token: 'NEW_ACCESS_TOKEN_12345',
          refresh_token: 'NEW_REFRESH_TOKEN_67890'
        })
      };
      
      vi.spyOn(integration['oauthClient'], 'refresh').mockResolvedValue(refreshResponse);
      
      // Step 3: Refresh tokens
      const newTokens = await integration.refreshTokens(expiredTokens.refresh_token);
      
      expect(newTokens.access_token).toBe('NEW_ACCESS_TOKEN_12345');
      expect(newTokens.refresh_token).toBe('NEW_REFRESH_TOKEN_67890');
      
      // Step 4: Use new tokens for API call
      mockedAxios.get.mockResolvedValue(MOCK_COMPANY_INFO_RESPONSE);
      
      const isConnected = await integration.testConnection(newTokens.access_token, newTokens.realmId);
      expect(isConnected).toBe(true);
    });

    it('should handle complete reauthorization when refresh token expires', async () => {
      // Step 1: Try to refresh with expired refresh token
      const refreshError = new Error('invalid_grant: Refresh token expired');
      vi.spyOn(integration['oauthClient'], 'refresh').mockRejectedValue(refreshError);
      
      await expect(
        integration.refreshTokens('expired-refresh-token')
      ).rejects.toThrow('Token refresh failed');
      
      // Step 2: Start new authorization flow
      const state = OAuthTestUtils.generateSecureState();
      const authUri = integration.getAuthUri(state);
      
      expect(authUri).toBeDefined();
      
      // Step 3: Complete new authorization
      const mockTokenResponse = {
        token: TestDataFactory.createTokens()
      };
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);
      
      const newTokens = await integration.handleCallback('new-auth-code', 'realm-id', state);
      OAuthTestUtils.expectValidTokens(newTokens);
    });
  });

  describe('Real-world Error Scenarios', () => {
    it('should handle network timeouts during OAuth flow', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      timeoutError.name = 'TimeoutError';
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockRejectedValue(timeoutError);
      
      await expect(
        integration.handleCallback('auth-code', 'realm-id', 'state')
      ).rejects.toThrow('OAuth callback failed');
    });

    it('should handle QuickBooks service maintenance', async () => {
      const maintenanceError = {
        response: {
          status: 503,
          data: {
            Fault: {
              Error: [{
                Detail: 'Service temporarily unavailable for maintenance',
                code: '503'
              }]
            }
          }
        }
      };
      
      mockedAxios.get.mockRejectedValue(maintenanceError);
      
      await expect(
        integration.testConnection('access-token', 'realm-id')
      ).rejects.toThrow();
      
      // Should implement retry logic for maintenance windows
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should handle partial API responses', async () => {
      const partialResponse = {
        data: {
          QueryResponse: {
            // Missing expected CompanyInfo array
            maxResults: 1
          }
        }
      };
      
      mockedAxios.get.mockResolvedValue(partialResponse);
      
      const isConnected = await integration.testConnection('access-token', 'realm-id');
      expect(isConnected).toBe(false);
    });

    it('should handle malformed API responses', async () => {
      const malformedResponses = [
        { data: null },
        { data: { invalid: 'structure' } },
        { data: '<!DOCTYPE html><html><body>Error</body></html>' }, // HTML error page
        { data: { Fault: { Error: null } } }
      ];
      
      for (const response of malformedResponses) {
        mockedAxios.get.mockResolvedValueOnce(response);
        
        const isConnected = await integration.testConnection('access-token', 'realm-id');
        expect(isConnected).toBe(false);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete OAuth flow within performance thresholds', async () => {
      const mockTokenResponse = {
        token: TestDataFactory.createTokens()
      };
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);
      
      const { result, executionTime } = await PerformanceTestUtils.measureExecutionTime(
        () => integration.handleCallback('auth-code', 'realm-id', 'state'),
        2000 // Should complete within 2 seconds
      );
      
      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(2000);
    });

    it('should handle concurrent OAuth requests efficiently', async () => {
      const mockTokenResponse = {
        token: TestDataFactory.createTokens()
      };
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);
      
      const concurrentRequests = 10;
      const { results, avgTime } = await PerformanceTestUtils.measureConcurrentExecutions(
        () => integration.handleCallback('auth-code', 'realm-id', 'state'),
        concurrentRequests,
        100 // Average should be under 100ms per request
      );
      
      expect(results).toHaveLength(concurrentRequests);
      expect(avgTime).toBeLessThan(100);
      
      // All requests should succeed
      results.forEach(result => {
        OAuthTestUtils.expectValidTokens(result);
      });
    });

    it('should implement efficient token refresh with caching', async () => {
      const refreshToken = 'test-refresh-token';
      const mockRefreshResponse = {
        token: TestDataFactory.createTokens({
          access_token: 'CACHED_ACCESS_TOKEN'
        })
      };
      
      const refreshSpy = vi.spyOn(integration['oauthClient'], 'refresh')
        .mockResolvedValue(mockRefreshResponse);
      
      // Make multiple concurrent refresh requests
      const promises = Array.from({ length: 5 }, () => 
        integration.refreshTokens(refreshToken)
      );
      
      const results = await Promise.all(promises);
      
      // Should only make one actual refresh call (request deduplication)
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      
      // All results should be identical
      results.forEach(result => {
        expect(result.access_token).toBe('CACHED_ACCESS_TOKEN');
      });
    });
  });

  describe('Data Synchronization Integration', () => {
    it('should sync QuickBooks data after successful OAuth', async () => {
      // Step 1: Complete OAuth flow
      const mockTokenResponse = {
        token: TestDataFactory.createTokens()
      };
      
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);
      
      const tokens = await integration.handleCallback('auth-code', 'realm-id', 'state');
      
      // Step 2: Mock account data response
      const mockAccountsResponse = {
        data: {
          QueryResponse: {
            Account: [
              {
                Id: '1',
                Name: 'Checking Account',
                FullyQualifiedName: 'Checking Account',
                AccountType: 'Bank',
                Active: true,
                CurrentBalance: 5000.00,
                MetaData: {
                  CreateTime: '2023-01-01T10:00:00-08:00',
                  LastUpdatedTime: '2023-06-15T14:30:00-08:00'
                }
              },
              {
                Id: '2',
                Name: 'Sales Revenue',
                FullyQualifiedName: 'Income:Sales Revenue',
                AccountType: 'Income',
                Active: true,
                CurrentBalance: 15000.00,
                MetaData: {
                  CreateTime: '2023-01-01T10:00:00-08:00',
                  LastUpdatedTime: '2023-06-15T14:30:00-08:00'
                }
              }
            ]
          }
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockAccountsResponse);
      
      // Step 3: Test data fetching
      const accounts = await integration.getChartOfAccounts(tokens.access_token, tokens.realmId);
      
      expect(accounts).toHaveLength(2);
      expect(accounts[0].Name).toBe('Checking Account');
      expect(accounts[1].Name).toBe('Sales Revenue');
      
      // Verify proper API endpoint was called
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`query?query=SELECT * FROM Account`),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${tokens.access_token}`
          })
        })
      );
    });

    it('should handle large dataset synchronization', async () => {
      const tokens = TestDataFactory.createTokens();
      
      // Mock large account dataset (500+ accounts)
      const largeAccountsResponse = {
        data: {
          QueryResponse: {
            Account: Array.from({ length: 500 }, (_, i) => ({
              Id: String(i + 1),
              Name: `Account ${i + 1}`,
              FullyQualifiedName: `Account ${i + 1}`,
              AccountType: i % 3 === 0 ? 'Bank' : i % 3 === 1 ? 'Income' : 'Expense',
              Active: true,
              CurrentBalance: Math.random() * 10000,
              MetaData: {
                CreateTime: '2023-01-01T10:00:00-08:00',
                LastUpdatedTime: '2023-06-15T14:30:00-08:00'
              }
            })),
            maxResults: 500,
            startPosition: 1
          }
        }
      };
      
      mockedAxios.get.mockResolvedValue(largeAccountsResponse);
      
      const { result: accounts, executionTime } = await PerformanceTestUtils.measureExecutionTime(
        () => integration.getChartOfAccounts(tokens.access_token, tokens.realmId),
        10000 // Should complete within 10 seconds even for large datasets
      );
      
      expect(accounts).toHaveLength(500);
      expect(executionTime).toBeLessThan(10000);
    });

    it('should handle paginated data synchronization', async () => {
      const tokens = TestDataFactory.createTokens();
      
      // Mock paginated responses
      const firstPageResponse = {
        data: {
          QueryResponse: {
            Account: Array.from({ length: 100 }, (_, i) => ({
              Id: String(i + 1),
              Name: `Account ${i + 1}`,
              AccountType: 'Expense',
              Active: true,
              CurrentBalance: 1000,
              MetaData: {
                CreateTime: '2023-01-01T10:00:00-08:00',
                LastUpdatedTime: '2023-06-15T14:30:00-08:00'
              }
            })),
            maxResults: 100,
            startPosition: 1
          }
        }
      };
      
      const secondPageResponse = {
        data: {
          QueryResponse: {
            Account: Array.from({ length: 50 }, (_, i) => ({
              Id: String(i + 101),
              Name: `Account ${i + 101}`,
              AccountType: 'Expense',
              Active: true,
              CurrentBalance: 1000,
              MetaData: {
                CreateTime: '2023-01-01T10:00:00-08:00',
                LastUpdatedTime: '2023-06-15T14:30:00-08:00'
              }
            })),
            maxResults: 50,
            startPosition: 101
          }
        }
      };
      
      mockedAxios.get
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);
      
      // Note: This test assumes pagination is implemented in the integration
      // The actual implementation would need to handle pagination logic
      const firstPageAccounts = await integration.getChartOfAccounts(tokens.access_token, tokens.realmId);
      expect(firstPageAccounts).toHaveLength(100);
      
      // For full pagination testing, the integration would need pagination methods
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM Account'),
        expect.any(Object)
      );
    });
  });

  describe('Cross-Environment Testing', () => {
    it('should work correctly in sandbox environment', async () => {
      const sandboxConfig = TestDataFactory.createConfig({
        environment: 'sandbox'
      });
      
      const sandboxIntegration = new QuickBooksIntegration(sandboxConfig, 'http://localhost:3001');
      
      const authUri = sandboxIntegration.getAuthUri('test-state');
      expect(authUri).toContain('appcenter.intuit.com'); // Same OAuth server for both environments
      
      // Mock sandbox API responses
      mockedAxios.get.mockResolvedValue({
        data: {
          QueryResponse: {
            CompanyInfo: [{
              Id: '1',
              CompanyName: 'Sandbox Test Company',
              domain: 'QBO',
              sparse: false
            }]
          }
        }
      });
      
      const tokens = TestDataFactory.createTokens();
      const isConnected = await sandboxIntegration.testConnection(tokens.access_token, tokens.realmId);
      
      expect(isConnected).toBe(true);
      
      // Verify sandbox API endpoint is used
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('sandbox-quickbooks.api.intuit.com'),
        expect.any(Object)
      );
    });

    it('should work correctly in production environment', async () => {
      const prodConfig = TestDataFactory.createConfig({
        environment: 'production',
        redirectUri: 'https://app.finhelm.ai/auth/quickbooks/callback'
      });
      
      const prodIntegration = new QuickBooksIntegration(prodConfig, 'https://api.finhelm.ai');
      
      const authUri = prodIntegration.getAuthUri('test-state');
      expect(authUri).toMatch(/^https:/);
      expect(authUri).toContain('https://app.finhelm.ai/auth/quickbooks/callback');
      
      // Mock production API responses
      mockedAxios.get.mockResolvedValue(MOCK_COMPANY_INFO_RESPONSE);
      
      const tokens = TestDataFactory.createTokens();
      const isConnected = await prodIntegration.testConnection(tokens.access_token, tokens.realmId);
      
      expect(isConnected).toBe(true);
      
      // Verify production API endpoint is used
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('quickbooks.api.intuit.com'),
        expect.any(Object)
      );
    });
  });

  describe('Monitoring and Observability', () => {
    it('should emit proper metrics for OAuth events', async () => {
      const metrics: any[] = [];
      
      // Mock metrics collection
      const originalConsoleLog = console.log;
      console.log = vi.fn((message: string) => {
        if (message.includes('OAUTH_METRIC')) {
          try {
            const data = JSON.parse(message.split('OAUTH_METRIC: ')[1]);
            metrics.push(data);
          } catch (e) {
            // Ignore parsing errors
          }
        }
        originalConsoleLog(message);
      });
      
      try {
        const mockTokenResponse = {
          token: TestDataFactory.createTokens()
        };
        
        vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);
        
        await integration.handleCallback('auth-code', 'realm-id', 'state');
        
        // Verify metrics were emitted
        expect(metrics.length).toBeGreaterThan(0);
        
        const oauthMetric = metrics.find(m => m.event === 'oauth_token_exchange');
        expect(oauthMetric).toBeDefined();
        expect(oauthMetric.success).toBe(true);
        expect(oauthMetric.duration).toBeGreaterThan(0);
      } finally {
        console.log = originalConsoleLog;
      }
    });

    it('should track OAuth error rates', async () => {
      const errors: any[] = [];
      
      // Mock error tracking
      const originalConsoleError = console.error;
      console.error = vi.fn((message: string) => {
        if (message.includes('OAUTH_ERROR')) {
          try {
            const data = JSON.parse(message.split('OAUTH_ERROR: ')[1]);
            errors.push(data);
          } catch (e) {
            // Ignore parsing errors
          }
        }
        originalConsoleError(message);
      });
      
      try {
        const oauthError = new Error('invalid_grant: Invalid authorization code');
        vi.spyOn(integration['oauthClient'], 'createToken').mockRejectedValue(oauthError);
        
        await expect(
          integration.handleCallback('invalid-code', 'realm-id', 'state')
        ).rejects.toThrow();
        
        // Verify error was tracked
        expect(errors.length).toBeGreaterThan(0);
        
        const errorMetric = errors.find(e => e.event === 'oauth_token_exchange_failed');
        expect(errorMetric).toBeDefined();
        expect(errorMetric.error_type).toContain('invalid_grant');
      } finally {
        console.error = originalConsoleError;
      }
    });
  });
});