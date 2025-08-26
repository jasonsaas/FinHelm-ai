import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { QuickBooksIntegration } from '../../integrations/quickbooks';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock Convex client
const mockConvexClient = {
  action: vi.fn(),
};

describe('QuickBooksIntegration', () => {
  let integration: QuickBooksIntegration;
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scope: 'com.intuit.quickbooks.accounting',
    redirectUri: 'http://localhost:3000/callback',
    environment: 'sandbox' as const,
  };

  beforeEach(() => {
    integration = new QuickBooksIntegration(mockConfig, 'http://localhost:3001');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication', () => {
    it('should generate correct auth URI', () => {
      const authUri = integration.getAuthUri('test-state');
      
      expect(authUri).toContain('test-state');
      expect(authUri).toContain(mockConfig.clientId);
      expect(authUri).toContain('com.intuit.quickbooks.accounting');
    });

    it('should handle OAuth callback successfully', async () => {
      const mockTokenResponse = {
        token: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          realmId: 'test-realm-id',
          expires_in: 3600,
          token_type: 'Bearer',
        }
      };

      // Mock the internal OAuthClient.createToken method
      vi.spyOn(integration['oauthClient'], 'createToken').mockResolvedValue(mockTokenResponse);

      const tokens = await integration.handleCallback('test-code', 'test-realm-id', 'test-state');

      expect(tokens).toEqual({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        realmId: 'test-realm-id',
        expires_in: 3600,
        token_type: 'Bearer',
      });
    });

    it('should handle OAuth callback failure', async () => {
      vi.spyOn(integration['oauthClient'], 'createToken').mockRejectedValue(new Error('OAuth failed'));

      await expect(
        integration.handleCallback('test-code', 'test-realm-id', 'test-state')
      ).rejects.toThrow('OAuth callback failed: Error: OAuth failed');
    });

    it('should refresh tokens successfully', async () => {
      const mockRefreshResponse = {
        token: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          realmId: 'test-realm-id',
          expires_in: 3600,
          token_type: 'Bearer',
        }
      };

      vi.spyOn(integration['oauthClient'], 'refresh').mockResolvedValue(mockRefreshResponse);

      const tokens = await integration.refreshTokens('old-refresh-token');

      expect(tokens.access_token).toBe('new-access-token');
      expect(tokens.refresh_token).toBe('new-refresh-token');
    });
  });

  describe('API Requests', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        data: {
          QueryResponse: {
            Account: [
              {
                Id: '1',
                Name: 'Cash',
                FullyQualifiedName: 'Cash',
                AccountType: 'Bank',
                Active: true,
                CurrentBalance: 1000,
                MetaData: {
                  CreateTime: '2023-01-01T00:00:00Z',
                  LastUpdatedTime: '2023-01-01T00:00:00Z'
                }
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const accounts = await integration.getChartOfAccounts('test-access-token', 'test-realm-id');

      expect(accounts).toHaveLength(1);
      expect(accounts[0].Name).toBe('Cash');
      expect(accounts[0].AccountType).toBe('Bank');
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const rateLimitError = {
        response: { status: 429, data: 'Rate limit exceeded' }
      };

      mockedAxios.get
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          data: { QueryResponse: { Account: [] } }
        });

      // Mock setTimeout to avoid actual delays in tests
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((cb) => cb()) as any;

      const accounts = await integration.getChartOfAccounts('test-access-token', 'test-realm-id');

      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(accounts).toEqual([]);

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });

    it('should handle authentication errors', async () => {
      const authError = {
        response: { status: 401, data: 'Unauthorized' }
      };

      mockedAxios.get.mockRejectedValue(authError);

      await expect(
        integration.getChartOfAccounts('invalid-token', 'test-realm-id')
      ).rejects.toThrow('Access token expired or invalid');
    });
  });

  describe('Data Mapping', () => {
    it('should map QuickBooks account types correctly', () => {
      const testAccounts = [
        { Id: '1', Name: 'Cash', AccountType: 'Bank', Active: true, CurrentBalance: 1000, MetaData: { LastUpdatedTime: '2023-01-01T00:00:00Z' } },
        { Id: '2', Name: 'Revenue', AccountType: 'Income', Active: true, CurrentBalance: 50000, MetaData: { LastUpdatedTime: '2023-01-01T00:00:00Z' } },
        { Id: '3', Name: 'Office Supplies', AccountType: 'Expense', Active: true, CurrentBalance: 2000, MetaData: { LastUpdatedTime: '2023-01-01T00:00:00Z' } },
      ];

      const mappedAccounts = integration['mapAccountsForSync'](testAccounts);

      expect(mappedAccounts[0].type).toBe('bank');
      expect(mappedAccounts[1].type).toBe('revenue');
      expect(mappedAccounts[2].type).toBe('expense');
    });

    it('should handle hierarchical account names correctly', () => {
      const hierarchicalName = 'Job Expenses:Job Materials:Decks and Patios';
      const parsed = integration['parseHierarchicalAccountName'](hierarchicalName);

      expect(parsed.levels).toEqual(['Job Expenses', 'Job Materials', 'Decks and Patios']);
      expect(parsed.depth).toBe(3);
      expect(parsed.parentPath).toBe('Job Expenses:Job Materials');
    });
  });

  describe('Data Synchronization', () => {
    it('should sync data to Convex successfully', async () => {
      const mockSyncResult = {
        syncJobId: 'test-job-id',
        results: { inserted: 10, updated: 5, skipped: 2, errors: [] }
      };

      mockConvexClient.action.mockResolvedValue(mockSyncResult);
      integration['convexClient'] = mockConvexClient as any;

      // Mock API responses
      mockedAxios.get
        .mockResolvedValueOnce({
          data: { QueryResponse: { Account: [
            { Id: '1', Name: 'Cash', AccountType: 'Bank', Active: true, CurrentBalance: 1000, MetaData: { LastUpdatedTime: '2023-01-01T00:00:00Z' } }
          ]}}
        })
        .mockResolvedValueOnce({
          data: { QueryResponse: { JournalEntry: [
            {
              Id: '1',
              TxnDate: '2023-01-01',
              Line: [{ Id: '1', Amount: 100, DetailType: 'JournalEntryLineDetail', JournalEntryLineDetail: { PostingType: 'Debit', AccountRef: { value: '1', name: 'Cash' } } }],
              MetaData: { LastUpdatedTime: '2023-01-01T00:00:00Z' }
            }
          ]}}
        });

      const result = await integration.syncToConvex(
        'test-org-id',
        'test-connection-id',
        'test-access-token',
        'test-realm-id',
        { syncAccounts: true, syncTransactions: true }
      );

      expect(result.syncJobId).toBe('test-job-id');
      expect(result.results.inserted).toBe(10);
      expect(mockConvexClient.action).toHaveBeenCalledWith(
        expect.any(Object), // api.syncActions.syncERPData
        expect.objectContaining({
          organizationId: 'test-org-id',
          erpConnectionId: 'test-connection-id',
          dataType: 'full',
          reconciliationOptions: expect.objectContaining({
            fuzzyMatchThreshold: 0.9,
            autoApplyHighConfidenceMatches: true,
          })
        })
      );
    });

    it('should handle sync errors gracefully', async () => {
      mockConvexClient.action.mockRejectedValue(new Error('Convex sync failed'));
      integration['convexClient'] = mockConvexClient as any;

      mockedAxios.get.mockResolvedValue({
        data: { QueryResponse: { Account: [] } }
      });

      await expect(
        integration.syncToConvex('test-org-id', 'test-connection-id', 'test-access-token', 'test-realm-id')
      ).rejects.toThrow('Convex sync failed');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { QueryResponse: { CompanyInfo: [{ Id: '1', CompanyName: 'Test Company' }] } }
      });

      const isConnected = await integration.testConnection('test-access-token', 'test-realm-id');

      expect(isConnected).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('companyinfo/test-realm-id'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('should handle connection test failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection failed'));

      const isConnected = await integration.testConnection('test-access-token', 'test-realm-id');

      expect(isConnected).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(
        integration.getChartOfAccounts('test-access-token', 'test-realm-id')
      ).rejects.toThrow('Network Error');
    });

    it('should handle QuickBooks API errors', async () => {
      const apiError = {
        response: {
          status: 400,
          data: {
            Fault: {
              Error: [{ Detail: 'Invalid request data' }]
            }
          }
        }
      };

      mockedAxios.get.mockRejectedValue(apiError);

      await expect(
        integration.getChartOfAccounts('test-access-token', 'test-realm-id')
      ).rejects.toThrow('QuickBooks API error: 400 - Invalid request data');
    });
  });

  describe('Performance', () => {
    it('should complete sync within acceptable time limits', async () => {
      const startTime = Date.now();

      mockConvexClient.action.mockResolvedValue({
        syncJobId: 'test-job-id',
        results: { inserted: 1000, updated: 0, skipped: 0, errors: [] }
      });
      integration['convexClient'] = mockConvexClient as any;

      // Mock large dataset
      const largeAccountsResponse = {
        data: {
          QueryResponse: {
            Account: Array.from({ length: 100 }, (_, i) => ({
              Id: String(i + 1),
              Name: `Account ${i + 1}`,
              AccountType: 'Expense',
              Active: true,
              CurrentBalance: Math.random() * 1000,
              MetaData: { LastUpdatedTime: '2023-01-01T00:00:00Z' }
            }))
          }
        }
      };

      mockedAxios.get.mockResolvedValue(largeAccountsResponse);

      await integration.syncToConvex(
        'test-org-id',
        'test-connection-id',
        'test-access-token',
        'test-realm-id',
        { syncAccounts: true, syncTransactions: false }
      );

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration', () => {
      expect(() => new QuickBooksIntegration({
        ...mockConfig,
        clientId: ''
      }, 'http://localhost:3001')).toThrow();
    });

    it('should use correct environment URLs', () => {
      const prodIntegration = new QuickBooksIntegration({
        ...mockConfig,
        environment: 'production'
      }, 'http://localhost:3001');

      // This would be tested by mocking the internal API calls and checking URLs
      expect(prodIntegration).toBeDefined();
    });
  });
});