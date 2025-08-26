import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import * as xml2js from 'xml2js';
import { SageIntacctIntegration } from '../../integrations/sage-intacct';

// Mock dependencies
vi.mock('axios');
vi.mock('xml2js');
const mockedAxios = vi.mocked(axios);
const mockedXml2js = vi.mocked(xml2js);

// Mock Convex client
const mockConvexClient = {
  action: vi.fn(),
};

describe('SageIntacctIntegration', () => {
  let integration: SageIntacctIntegration;
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    companyId: 'test-company-id',
    userId: 'test-user-id',
    userPassword: 'test-password',
    environment: 'sandbox' as const,
    preferredMethod: 'rest' as const,
  };

  beforeEach(() => {
    integration = new SageIntacctIntegration(mockConfig, 'http://localhost:3001');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('OAuth Authentication', () => {
    it('should authenticate with OAuth successfully', async () => {
      const mockTokenResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }
      };

      mockedAxios.post.mockResolvedValue(mockTokenResponse);

      const tokens = await integration.authenticateOAuth();

      expect(tokens).toEqual({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('oauth2/token'),
        expect.objectContaining({
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          scope: 'accounting',
        }),
        expect.any(Object)
      );
    });

    it('should handle OAuth authentication failure', async () => {
      mockedAxios.post.mockRejectedValue(new Error('OAuth failed'));

      await expect(integration.authenticateOAuth()).rejects.toThrow('OAuth authentication failed');
    });
  });

  describe('XML Gateway Authentication', () => {
    it('should authenticate with XML Gateway successfully', async () => {
      const mockXmlResponse = `
        <response>
          <operation>
            <result>
              <status>success</status>
              <data>
                <api>
                  <sessionid>test-session-id</sessionid>
                  <endpoint>https://api.intacct.com</endpoint>
                </api>
              </data>
            </result>
          </operation>
        </response>
      `;

      const mockParser = {
        parseStringPromise: vi.fn().mockResolvedValue({
          response: {
            operation: {
              result: {
                status: 'success',
                data: {
                  api: {
                    sessionid: 'test-session-id',
                    endpoint: 'https://api.intacct.com'
                  }
                }
              }
            }
          }
        })
      };

      mockedAxios.post.mockResolvedValue({ data: mockXmlResponse });
      integration['xmlParser'] = mockParser as any;

      const tokens = await integration.authenticateXMLGateway();

      expect(tokens).toEqual({
        sessionId: 'test-session-id',
        endpoint: 'https://api.intacct.com'
      });
    });

    it('should handle XML Gateway authentication failure', async () => {
      const mockErrorResponse = `
        <response>
          <operation>
            <result>
              <status>failure</status>
              <errormessage>Authentication failed</errormessage>
            </result>
          </operation>
        </response>
      `;

      const mockParser = {
        parseStringPromise: vi.fn().mockResolvedValue({
          response: {
            operation: {
              result: {
                status: 'failure',
                errormessage: 'Authentication failed'
              }
            }
          }
        })
      };

      mockedAxios.post.mockResolvedValue({ data: mockErrorResponse });
      integration['xmlParser'] = mockParser as any;

      await expect(integration.authenticateXMLGateway()).rejects.toThrow('XML Gateway authentication failed');
    });
  });

  describe('REST API Requests', () => {
    it('should make successful REST API request', async () => {
      const mockResponse = {
        data: {
          accounts: [
            {
              RECORDNO: '1',
              ACCOUNTNO: '1000',
              TITLE: 'Cash',
              ACCOUNTTYPE: 'balancesheet',
              STATUS: 'active',
              BALANCE: 1000,
              WHENMODIFIED: '2023-01-01T00:00:00Z',
              WHENCREATED: '2023-01-01T00:00:00Z'
            }
          ]
        }
      };

      mockedAxios.mockResolvedValue(mockResponse);

      const accounts = await integration.getChartOfAccounts({
        access_token: 'test-access-token'
      });

      expect(accounts).toHaveLength(1);
      expect(accounts[0].TITLE).toBe('Cash');
      expect(accounts[0].ACCOUNTTYPE).toBe('balancesheet');
    });

    it('should handle REST API rate limiting', async () => {
      const rateLimitError = {
        response: { status: 429, data: 'Rate limit exceeded' }
      };

      mockedAxios
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: { accounts: [] } });

      // Mock setTimeout
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((cb) => cb()) as any;

      const accounts = await integration.getChartOfAccounts({
        access_token: 'test-access-token'
      });

      expect(accounts).toEqual([]);
      expect(mockedAxios).toHaveBeenCalledTimes(2);

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('XML Gateway Requests', () => {
    beforeEach(() => {
      integration['sessionId'] = 'test-session-id';
    });

    it('should make successful XML request', async () => {
      const mockXmlResponse = `
        <response>
          <operation>
            <result>
              <status>success</status>
              <data>
                <glaccount>
                  <RECORDNO>1</RECORDNO>
                  <ACCOUNTNO>1000</ACCOUNTNO>
                  <TITLE>Cash</TITLE>
                  <ACCOUNTTYPE>balancesheet</ACCOUNTTYPE>
                  <STATUS>active</STATUS>
                </glaccount>
              </data>
            </result>
          </operation>
        </response>
      `;

      const mockParser = {
        parseStringPromise: vi.fn().mockResolvedValue({
          response: {
            operation: {
              result: {
                status: 'success',
                data: {
                  glaccount: {
                    RECORDNO: '1',
                    ACCOUNTNO: '1000',
                    TITLE: 'Cash',
                    ACCOUNTTYPE: 'balancesheet',
                    STATUS: 'active'
                  }
                }
              }
            }
          }
        })
      };

      mockedAxios.post.mockResolvedValue({ data: mockXmlResponse });
      integration['xmlParser'] = mockParser as any;

      const accounts = await integration.getChartOfAccounts({});

      expect(accounts).toHaveLength(1);
      expect(accounts[0].TITLE).toBe('Cash');
    });

    it('should handle XML request errors', async () => {
      const mockErrorResponse = `
        <response>
          <operation>
            <result>
              <status>failure</status>
              <errormessage>Invalid query</errormessage>
            </result>
          </operation>
        </response>
      `;

      const mockParser = {
        parseStringPromise: vi.fn().mockResolvedValue({
          response: {
            operation: {
              result: {
                status: 'failure',
                errormessage: 'Invalid query'
              }
            }
          }
        })
      };

      mockedAxios.post.mockResolvedValue({ data: mockErrorResponse });
      integration['xmlParser'] = mockParser as any;

      await expect(integration.getChartOfAccounts({})).rejects.toThrow('Sage Intacct XML error: Invalid query');
    });
  });

  describe('Multi-Entity Data Handling', () => {
    it('should filter data by entity correctly', async () => {
      const mockAccounts = [
        {
          RECORDNO: '1',
          ACCOUNTNO: '1000',
          TITLE: 'Cash',
          ACCOUNTTYPE: 'balancesheet',
          STATUS: 'active',
          DEPT: 'SALES',
          LOCATION: 'NYC',
          WHENMODIFIED: '2023-01-01T00:00:00Z'
        },
        {
          RECORDNO: '2',
          ACCOUNTNO: '2000',
          TITLE: 'Revenue',
          ACCOUNTTYPE: 'incomestatement',
          STATUS: 'active',
          DEPT: 'MARKETING',
          LOCATION: 'SF',
          WHENMODIFIED: '2023-01-01T00:00:00Z'
        }
      ];

      const mappedAccounts = integration['mapAccountsForSync'](mockAccounts, ['SALES']);

      expect(mappedAccounts).toHaveLength(1);
      expect(mappedAccounts[0].code).toBe('1000');
      expect(mappedAccounts[0].department).toBe('SALES');
    });

    it('should handle multi-entity transactions correctly', async () => {
      const mockTransactions = [
        {
          RECORDNO: '1',
          DEPT: 'SALES',
          LOCATION: 'NYC',
          ENTRIES: [
            {
              ACCOUNTNO: '1000',
              TRX_AMOUNT: 100,
              DESCRIPTION: 'Test transaction',
              CURRENCY: 'USD',
              ENTRY_DATE: '2023-01-01'
            }
          ],
          WHENMODIFIED: '2023-01-01T00:00:00Z'
        }
      ];

      const mappedTransactions = integration['mapTransactionsForSync'](mockTransactions, 'GL', ['SALES']);

      expect(mappedTransactions).toHaveLength(1);
      expect(mappedTransactions[0].departmentId).toBe('SALES');
      expect(mappedTransactions[0].locationId).toBe('NYC');
    });
  });

  describe('Data Synchronization', () => {
    it('should sync multi-entity data to Convex', async () => {
      const mockSyncResult = {
        syncJobId: 'test-job-id',
        results: { inserted: 15, updated: 8, skipped: 2, errors: [] }
      };

      mockConvexClient.action.mockResolvedValue(mockSyncResult);
      integration['convexClient'] = mockConvexClient as any;

      // Mock API responses for different data types
      mockedAxios.mockResolvedValueOnce({ data: { accounts: [] } });
      mockedAxios.post.mockResolvedValueOnce({ data: '<response><operation><result><status>success</status><data><glbatch></glbatch></data></result></operation></response>' });
      mockedAxios.post.mockResolvedValueOnce({ data: '<response><operation><result><status>success</status><data><apbill></apbill></data></result></operation></response>' });
      mockedAxios.post.mockResolvedValueOnce({ data: '<response><operation><result><status>success</status><data><arinvoice></arinvoice></data></result></operation></response>' });

      const mockParser = {
        parseStringPromise: vi.fn().mockResolvedValue({
          response: {
            operation: {
              result: {
                status: 'success',
                data: {}
              }
            }
          }
        })
      };
      integration['xmlParser'] = mockParser as any;

      const result = await integration.syncToConvex(
        'test-org-id',
        'test-connection-id',
        { access_token: 'test-token' },
        {
          syncAccounts: true,
          syncTransactions: true,
          syncAP: true,
          syncAR: true,
          entityFilter: ['SALES', 'MARKETING']
        }
      );

      expect(result.syncJobId).toBe('test-job-id');
      expect(result.results.inserted).toBe(15);
      expect(mockConvexClient.action).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          organizationId: 'test-org-id',
          erpConnectionId: 'test-connection-id',
          dataType: 'full',
        })
      );
    });

    it('should handle sync errors gracefully', async () => {
      mockConvexClient.action.mockRejectedValue(new Error('Convex sync failed'));
      integration['convexClient'] = mockConvexClient as any;

      mockedAxios.mockResolvedValue({ data: { accounts: [] } });

      await expect(
        integration.syncToConvex('test-org-id', 'test-connection-id', { access_token: 'test-token' })
      ).rejects.toThrow('Convex sync failed');
    });
  });

  describe('Account Code Normalization', () => {
    it('should normalize account codes for fuzzy matching', () => {
      const testData = [
        { code: 'ACC-001', name: 'Test Account 1' },
        { code: 'ACC_002', name: 'Test Account 2' },
        { code: 'ACC.003', name: 'Test Account 3' },
        { code: '0001000', name: 'Test Account 4' },
      ];

      const normalized = integration['normalizeAccountCodes'](testData);

      expect(normalized[0].normalizedCode).toBe('acc001');
      expect(normalized[1].normalizedCode).toBe('acc002');
      expect(normalized[2].normalizedCode).toBe('acc003');
      expect(normalized[3].normalizedCode).toBe('1000');
    });
  });

  describe('Connection Testing', () => {
    it('should test REST connection successfully', async () => {
      mockedAxios.mockResolvedValue({
        data: { company: { name: 'Test Company' } }
      });

      const isConnected = await integration.testConnection({
        access_token: 'test-access-token'
      });

      expect(isConnected).toBe(true);
    });

    it('should test XML Gateway connection successfully', async () => {
      integration['sessionId'] = 'test-session-id';

      const mockParser = {
        parseStringPromise: vi.fn().mockResolvedValue({
          response: {
            operation: {
              result: {
                status: 'success',
                data: { user: [{ id: '1', name: 'Test User' }] }
              }
            }
          }
        })
      };

      mockedAxios.post.mockResolvedValue({ data: '<response></response>' });
      integration['xmlParser'] = mockParser as any;

      const isConnected = await integration.testConnection({});

      expect(isConnected).toBe(true);
    });

    it('should handle connection test failure', async () => {
      mockedAxios.mockRejectedValue(new Error('Connection failed'));

      const isConnected = await integration.testConnection({
        access_token: 'test-access-token'
      });

      expect(isConnected).toBe(false);
    });
  });

  describe('Authentication Fallback', () => {
    it('should fallback from REST to XML Gateway when REST fails', async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error('REST auth failed'))
        .mockResolvedValueOnce({ data: '<response></response>' });

      const mockParser = {
        parseStringPromise: vi.fn().mockResolvedValue({
          response: {
            operation: {
              result: {
                status: 'success',
                data: {
                  api: {
                    sessionid: 'test-session-id',
                    endpoint: 'https://api.intacct.com'
                  }
                }
              }
            }
          }
        })
      };

      integration['xmlParser'] = mockParser as any;

      const tokens = await integration.authenticate();

      expect(tokens.sessionId).toBe('test-session-id');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // One failed REST call, one successful XML call
    });

    it('should fallback from XML Gateway to REST when XML fails', async () => {
      const xmlConfig = { ...mockConfig, preferredMethod: 'xml' as const };
      const xmlIntegration = new SageIntacctIntegration(xmlConfig, 'http://localhost:3001');

      mockedAxios.post
        .mockRejectedValueOnce(new Error('XML auth failed'))
        .mockResolvedValueOnce({
          data: {
            access_token: 'test-access-token',
            token_type: 'Bearer',
            expires_in: 3600
          }
        });

      const tokens = await xmlIntegration.authenticate();

      expect(tokens.access_token).toBe('test-access-token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      mockConvexClient.action.mockResolvedValue({
        syncJobId: 'test-job-id',
        results: { inserted: 5000, updated: 0, skipped: 0, errors: [] }
      });
      integration['convexClient'] = mockConvexClient as any;

      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        RECORDNO: String(i + 1),
        ACCOUNTNO: `${1000 + i}`,
        TITLE: `Account ${i + 1}`,
        ACCOUNTTYPE: 'balancesheet',
        STATUS: 'active',
        BALANCE: Math.random() * 10000,
        WHENMODIFIED: '2023-01-01T00:00:00Z'
      }));

      mockedAxios.mockResolvedValue({ data: { accounts: largeDataset } });

      await integration.syncToConvex(
        'test-org-id',
        'test-connection-id',
        { access_token: 'test-token' },
        { syncAccounts: true, syncTransactions: false }
      );

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Error Recovery', () => {
    it('should retry on temporary failures', async () => {
      const tempError = {
        response: {
          status: 500,
          data: 'Internal server error'
        }
      };

      mockedAxios
        .mockRejectedValueOnce(tempError)
        .mockRejectedValueOnce(tempError)
        .mockResolvedValueOnce({ data: { accounts: [] } });

      // Mock setTimeout for retries
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((cb) => cb()) as any;

      const accounts = await integration.getChartOfAccounts({
        access_token: 'test-access-token'
      });

      expect(accounts).toEqual([]);
      expect(mockedAxios).toHaveBeenCalledTimes(3);

      global.setTimeout = originalSetTimeout;
    });
  });
});