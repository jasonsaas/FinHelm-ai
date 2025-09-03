import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuickBooksIntegration, QuickBooksConfig } from '../../integrations/quickbooks';
import { ConvexHttpClient } from 'convex/browser';
import axios from 'axios';

// Mock external dependencies
vi.mock('intuit-oauth');
vi.mock('convex/browser');
vi.mock('axios');

const mockAxios = vi.mocked(axios);
const mockOAuthClient = {
  authorizeUri: vi.fn(),
  createToken: vi.fn(),
  refresh: vi.fn(),
  setToken: vi.fn(),
};

const mockConvexClient = {
  action: vi.fn(),
  mutation: vi.fn(),
  query: vi.fn(),
};

vi.mocked(require('intuit-oauth')).mockImplementation(() => mockOAuthClient);
vi.mocked(ConvexHttpClient).mockImplementation(() => mockConvexClient as any);

describe('QuickBooks Data Synchronization E2E Tests', () => {
  let integration: QuickBooksIntegration;
  
  const mockConfig: QuickBooksConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scope: 'com.intuit.quickbooks.accounting',
    redirectUri: 'http://localhost:3000/callback',
    environment: 'sandbox',
  };

  const mockTokens = {
    access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.test-access-token',
    refresh_token: 'refresh_token_12345',
    realmId: '4620816365291273400',
    expires_in: 3600,
    token_type: 'Bearer',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    integration = new QuickBooksIntegration(mockConfig, 'http://localhost:3001');
    
    // Mock successful HTTP GET responses by default
    mockAxios.get = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Invoice Fetching Tests', () => {
    it('should fetch invoices with correct API calls', async () => {
      const mockInvoiceResponse = {
        data: {
          QueryResponse: {
            Invoice: [
              {
                Id: 'INV-001',
                TxnDate: '2024-01-15',
                Line: [
                  {
                    Id: '1',
                    Amount: 1500.00,
                    DetailType: 'SalesItemLineDetail',
                    SalesItemLineDetail: {
                      ItemRef: { value: '1', name: 'Consulting Services' },
                      Qty: 1,
                      UnitPrice: 1500.00,
                    },
                  },
                ],
                DocNumber: 'INV-001',
                CustomerRef: { value: '1', name: 'Acme Corp' },
                TotalAmt: 1500.00,
                Balance: 750.00, // Partially paid
                DueDate: '2024-02-14',
                MetaData: {
                  CreateTime: '2024-01-15T10:00:00Z',
                  LastUpdatedTime: '2024-01-15T10:00:00Z',
                },
              },
              {
                Id: 'INV-002',
                TxnDate: '2024-01-20',
                Line: [
                  {
                    Id: '2',
                    Amount: 2500.00,
                    DetailType: 'SalesItemLineDetail',
                    SalesItemLineDetail: {
                      ItemRef: { value: '2', name: 'Software License' },
                      Qty: 1,
                      UnitPrice: 2500.00,
                    },
                  },
                ],
                DocNumber: 'INV-002',
                CustomerRef: { value: '2', name: 'TechStart Inc' },
                TotalAmt: 2500.00,
                Balance: 0.00, // Fully paid
                DueDate: '2024-02-19',
                MetaData: {
                  CreateTime: '2024-01-20T14:30:00Z',
                  LastUpdatedTime: '2024-01-25T09:15:00Z',
                },
              },
            ],
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockInvoiceResponse);

      const invoices = await integration.getTransactions(
        mockTokens.access_token,
        mockTokens.realmId,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/v3/company/4620816365291273400/query'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.test-access-token',
            'Accept': 'application/json',
          }),
          timeout: 30000,
        })
      );

      expect(invoices.length).toBeGreaterThan(0);
      expect(invoices[0].Id).toBe('INV-001');
      expect(invoices[0].TotalAmt).toBe(1500.00);
    });

    it('should handle invoice fetching with pagination', async () => {
      // Mock paginated responses
      const firstPageResponse = {
        data: {
          QueryResponse: {
            Invoice: Array.from({ length: 100 }, (_, i) => ({
              Id: `INV-${String(i + 1).padStart(3, '0')}`,
              TxnDate: '2024-01-15',
              Line: [{
                Id: '1',
                Amount: 1000 + i,
                DetailType: 'SalesItemLineDetail',
              }],
              DocNumber: `INV-${String(i + 1).padStart(3, '0')}`,
              TotalAmt: 1000 + i,
              Balance: 0,
              MetaData: {
                CreateTime: '2024-01-15T10:00:00Z',
                LastUpdatedTime: '2024-01-15T10:00:00Z',
              },
            })),
            maxResults: 100,
            startPosition: 1,
          },
        },
      };

      mockAxios.get.mockResolvedValue(firstPageResponse);

      const invoices = await integration.getTransactions(
        mockTokens.access_token,
        mockTokens.realmId,
        undefined,
        undefined,
        100
      );

      expect(invoices.length).toBe(100);
      expect(invoices[0].Id).toBe('INV-001');
      expect(invoices[99].Id).toBe('INV-100');
    });
  });

  describe('Bill Retrieval Tests', () => {
    it('should fetch bills from QuickBooks API', async () => {
      const mockBillResponse = {
        data: {
          QueryResponse: {
            Bill: [
              {
                Id: 'BILL-001',
                TxnDate: '2024-01-10',
                Line: [
                  {
                    Id: '1',
                    Amount: 850.00,
                    DetailType: 'AccountBasedExpenseLineDetail',
                    AccountBasedExpenseLineDetail: {
                      AccountRef: { value: '41', name: 'Office Supplies' },
                      BillableStatus: 'NotBillable',
                    },
                  },
                ],
                DocNumber: 'BILL-001',
                VendorRef: { value: '1', name: 'Office Supply Co' },
                TotalAmt: 850.00,
                Balance: 850.00, // Unpaid
                DueDate: '2024-02-09',
                MetaData: {
                  CreateTime: '2024-01-10T11:00:00Z',
                  LastUpdatedTime: '2024-01-10T11:00:00Z',
                },
              },
              {
                Id: 'BILL-002',
                TxnDate: '2024-01-12',
                Line: [
                  {
                    Id: '2',
                    Amount: 1200.00,
                    DetailType: 'AccountBasedExpenseLineDetail',
                    AccountBasedExpenseLineDetail: {
                      AccountRef: { value: '42', name: 'Utilities' },
                      BillableStatus: 'NotBillable',
                    },
                  },
                ],
                DocNumber: 'BILL-002',
                VendorRef: { value: '2', name: 'Electric Company' },
                TotalAmt: 1200.00,
                Balance: 0.00, // Paid
                DueDate: '2024-02-11',
                MetaData: {
                  CreateTime: '2024-01-12T09:30:00Z',
                  LastUpdatedTime: '2024-01-18T14:45:00Z',
                },
              },
            ],
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockBillResponse);

      const bills = await integration.getTransactions(
        mockTokens.access_token,
        mockTokens.realmId,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(bills.length).toBeGreaterThan(0);
      expect(bills[0].Id).toBe('BILL-001');
      expect(bills[0].TotalAmt).toBe(850.00);
      expect(bills[1].Balance).toBe(0.00); // Paid bill
    });

    it('should handle bills with multiple line items', async () => {
      const mockComplexBillResponse = {
        data: {
          QueryResponse: {
            Bill: [
              {
                Id: 'BILL-COMPLEX-001',
                TxnDate: '2024-01-15',
                Line: [
                  {
                    Id: '1',
                    Amount: 500.00,
                    DetailType: 'AccountBasedExpenseLineDetail',
                    AccountBasedExpenseLineDetail: {
                      AccountRef: { value: '61', name: 'Equipment' },
                    },
                  },
                  {
                    Id: '2',
                    Amount: 300.00,
                    DetailType: 'AccountBasedExpenseLineDetail',
                    AccountBasedExpenseLineDetail: {
                      AccountRef: { value: '62', name: 'Maintenance' },
                    },
                  },
                  {
                    Id: '3',
                    Amount: 150.00,
                    DetailType: 'AccountBasedExpenseLineDetail',
                    AccountBasedExpenseLineDetail: {
                      AccountRef: { value: '63', name: 'Labor' },
                    },
                  },
                ],
                DocNumber: 'BILL-COMPLEX-001',
                VendorRef: { value: '5', name: 'Service Provider Inc' },
                TotalAmt: 950.00,
                Balance: 950.00,
                DueDate: '2024-02-14',
                MetaData: {
                  CreateTime: '2024-01-15T16:00:00Z',
                  LastUpdatedTime: '2024-01-15T16:00:00Z',
                },
              },
            ],
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockComplexBillResponse);

      const bills = await integration.getTransactions(
        mockTokens.access_token,
        mockTokens.realmId
      );

      expect(bills[0].Line.length).toBe(3);
      expect(bills[0].Line[0].Amount).toBe(500.00);
      expect(bills[0].Line[1].Amount).toBe(300.00);
      expect(bills[0].Line[2].Amount).toBe(150.00);
      expect(bills[0].TotalAmt).toBe(950.00);
    });
  });

  describe('Cash Position Calculation', () => {
    it('should calculate accurate cash position from account balances', async () => {
      const mockAccountsResponse = {
        data: {
          QueryResponse: {
            Account: [
              {
                Id: '1',
                Name: 'Checking Account',
                AccountType: 'Bank',
                CurrentBalance: 50000.00,
                Active: true,
                Classification: 'Asset',
                MetaData: { LastUpdatedTime: '2024-01-31T23:59:59Z' },
              },
              {
                Id: '2',
                Name: 'Savings Account',
                AccountType: 'Bank',
                CurrentBalance: 25000.00,
                Active: true,
                Classification: 'Asset',
                MetaData: { LastUpdatedTime: '2024-01-31T23:59:59Z' },
              },
              {
                Id: '3',
                Name: 'Money Market',
                AccountType: 'Bank',
                CurrentBalance: 15000.00,
                Active: true,
                Classification: 'Asset',
                MetaData: { LastUpdatedTime: '2024-01-31T23:59:59Z' },
              },
              {
                Id: '4',
                Name: 'Accounts Receivable',
                AccountType: 'Accounts Receivable',
                CurrentBalance: 12500.00, // Money owed to us
                Active: true,
                Classification: 'Asset',
                MetaData: { LastUpdatedTime: '2024-01-31T23:59:59Z' },
              },
              {
                Id: '5',
                Name: 'Credit Card',
                AccountType: 'Credit Card',
                CurrentBalance: -3500.00, // Money we owe
                Active: true,
                Classification: 'Liability',
                MetaData: { LastUpdatedTime: '2024-01-31T23:59:59Z' },
              },
            ],
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockAccountsResponse);

      const accounts = await integration.getChartOfAccounts(
        mockTokens.access_token,
        mockTokens.realmId
      );

      // Calculate total cash position
      const cashAccounts = accounts.filter(account => account.AccountType === 'Bank');
      const totalCash = cashAccounts.reduce((sum, account) => sum + account.CurrentBalance, 0);
      
      expect(totalCash).toBe(90000.00); // 50K + 25K + 15K
      expect(cashAccounts.length).toBe(3);
      
      // Verify individual account balances
      expect(accounts.find(acc => acc.Name === 'Checking Account')?.CurrentBalance).toBe(50000.00);
      expect(accounts.find(acc => acc.Name === 'Savings Account')?.CurrentBalance).toBe(25000.00);
      expect(accounts.find(acc => acc.Name === 'Money Market')?.CurrentBalance).toBe(15000.00);
    });

    it('should handle negative cash positions correctly', async () => {
      const mockNegativeCashResponse = {
        data: {
          QueryResponse: {
            Account: [
              {
                Id: '1',
                Name: 'Checking Account',
                AccountType: 'Bank',
                CurrentBalance: -2500.00, // Overdrawn
                Active: true,
                Classification: 'Asset',
                MetaData: { LastUpdatedTime: '2024-01-31T23:59:59Z' },
              },
              {
                Id: '2',
                Name: 'Savings Account',
                AccountType: 'Bank',
                CurrentBalance: 1000.00,
                Active: true,
                Classification: 'Asset',
                MetaData: { LastUpdatedTime: '2024-01-31T23:59:59Z' },
              },
            ],
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockNegativeCashResponse);

      const accounts = await integration.getChartOfAccounts(
        mockTokens.access_token,
        mockTokens.realmId
      );

      const cashAccounts = accounts.filter(account => account.AccountType === 'Bank');
      const totalCash = cashAccounts.reduce((sum, account) => sum + account.CurrentBalance, 0);

      expect(totalCash).toBe(-1500.00); // -2500 + 1000
      expect(accounts.find(acc => acc.Name === 'Checking Account')?.CurrentBalance).toBe(-2500.00);
    });
  });

  describe('13-Week Forecast Accuracy', () => {
    it('should provide data for accurate 13-week cash flow forecast', async () => {
      // Mock historical transaction data for forecast calculation
      const mockForecastDataResponse = {
        data: {
          QueryResponse: {
            Invoice: generateMockInvoices(13 * 7), // 91 days of invoices
            Bill: generateMockBills(13 * 7), // 91 days of bills
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockForecastDataResponse);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31'); // ~13 weeks

      const transactions = await integration.getTransactions(
        mockTokens.access_token,
        mockTokens.realmId,
        startDate,
        endDate
      );

      // Verify we have sufficient data for 13-week forecast
      expect(transactions.length).toBeGreaterThanOrEqual(13 * 7); // At least 91 transactions
      
      // Group transactions by week for forecast validation
      const weeklyData = groupTransactionsByWeek(transactions);
      expect(Object.keys(weeklyData).length).toBeGreaterThanOrEqual(13);
      
      // Validate data quality for forecasting
      transactions.forEach(transaction => {
        expect(transaction.TxnDate).toBeDefined();
        expect(transaction.Line).toBeDefined();
        expect(transaction.Line.length).toBeGreaterThan(0);
        transaction.Line.forEach(line => {
          expect(line.Amount).toBeTypeOf('number');
          expect(line.Amount).toBeGreaterThan(0);
        });
      });
    });

    it('should handle seasonal variations in forecast data', async () => {
      const mockSeasonalData = generateSeasonalTransactionData();
      
      mockAxios.get.mockResolvedValue({
        data: { QueryResponse: mockSeasonalData },
      });

      const transactions = await integration.getTransactions(
        mockTokens.access_token,
        mockTokens.realmId,
        new Date('2023-01-01'),
        new Date('2023-12-31')
      );

      // Verify seasonal patterns are captured
      const monthlyTotals = calculateMonthlyTotals(transactions);
      
      // Check that we have data for all 12 months
      expect(Object.keys(monthlyTotals).length).toBe(12);
      
      // Verify significant variations (seasonal businesses often have 2-3x variations)
      const amounts = Object.values(monthlyTotals);
      const max = Math.max(...amounts);
      const min = Math.min(...amounts);
      const variation = max / min;
      
      expect(variation).toBeGreaterThan(1.0); // Some seasonal variation expected
      expect(variation).toBeLessThan(10.0); // But not unrealistic
    });

    it('should handle forecast edge cases', async () => {
      // Test with minimal data
      const mockMinimalData = {
        data: {
          QueryResponse: {
            Invoice: [generateMockInvoice('INV-001', 1000)],
            Bill: [generateMockBill('BILL-001', 500)],
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockMinimalData);

      const transactions = await integration.getTransactions(
        mockTokens.access_token,
        mockTokens.realmId,
        new Date('2024-01-01'),
        new Date('2024-01-07')
      );

      // Should handle minimal data gracefully
      expect(transactions.length).toBe(2);
      expect(transactions[0].Line[0].Amount).toBe(1000);
      expect(transactions[1].Line[0].Amount).toBe(500);
    });
  });

  describe('Data Sync Integration Tests', () => {
    it('should successfully sync complete dataset to Convex', async () => {
      // Mock comprehensive data responses
      const mockAccountsResponse = {
        data: {
          QueryResponse: {
            Account: [
              generateMockAccount('1', 'Cash', 'Bank', 50000),
              generateMockAccount('2', 'AR', 'Accounts Receivable', 25000),
              generateMockAccount('3', 'Revenue', 'Income', 100000),
            ],
          },
        },
      };

      const mockTransactionsResponse = {
        data: {
          QueryResponse: {
            Invoice: [generateMockInvoice('INV-001', 2500)],
            Bill: [generateMockBill('BILL-001', 1500)],
            JournalEntry: [generateMockJournalEntry('JE-001', 500)],
          },
        },
      };

      // Mock API calls in sequence
      mockAxios.get
        .mockResolvedValueOnce(mockAccountsResponse) // getChartOfAccounts call
        .mockResolvedValueOnce(mockTransactionsResponse) // First getTransactions call (Invoice)
        .mockResolvedValueOnce(mockTransactionsResponse) // Second getTransactions call (Bill)
        .mockResolvedValueOnce(mockTransactionsResponse); // Third getTransactions call (JournalEntry)

      // Mock Convex sync response
      mockConvexClient.action.mockResolvedValue({
        syncJobId: 'sync-job-12345',
        results: {
          inserted: 15,
          updated: 5,
          skipped: 2,
          errors: [],
        },
      });

      const syncResult = await integration.syncToConvex(
        'org-12345',
        'qb-connection-67890',
        mockTokens.access_token,
        mockTokens.realmId,
        {
          syncAccounts: true,
          syncTransactions: true,
          fuzzyMatchThreshold: 0.85,
          autoApplyHighConfidenceMatches: true,
        }
      );

      expect(syncResult.syncJobId).toBe('sync-job-12345');
      expect(syncResult.results.inserted).toBe(15);
      expect(syncResult.results.updated).toBe(5);
      expect(syncResult.results.skipped).toBe(2);
      expect(syncResult.results.errors).toHaveLength(0);

      // Verify Convex action was called with correct parameters
      expect(mockConvexClient.action).toHaveBeenCalledWith(
        expect.anything(), // api.syncActions.syncERPData
        expect.objectContaining({
          organizationId: 'org-12345',
          erpConnectionId: 'qb-connection-67890',
          dataType: 'full',
          reconciliationOptions: expect.objectContaining({
            fuzzyMatchThreshold: 0.85,
            autoApplyHighConfidenceMatches: true,
            skipDuplicates: true,
          }),
        })
      );
    });

    it('should handle partial sync failures gracefully', async () => {
      // Mock successful accounts fetch but failed transactions fetch
      mockAxios.get
        .mockResolvedValueOnce({
          data: { QueryResponse: { Account: [generateMockAccount('1', 'Cash', 'Bank', 10000)] } },
        })
        .mockRejectedValue(new Error('Network error during transaction sync'));

      // Mock Convex sync to handle partial data
      mockConvexClient.action.mockResolvedValue({
        syncJobId: 'partial-sync-12345',
        results: {
          inserted: 5,
          updated: 0,
          skipped: 0,
          errors: ['Failed to sync transaction data: Network error'],
        },
      });

      await expect(
        integration.syncToConvex(
          'org-12345',
          'qb-connection-67890',
          mockTokens.access_token,
          mockTokens.realmId,
          { syncAccounts: true, syncTransactions: true }
        )
      ).rejects.toThrow('Network error during transaction sync');
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = {
        data: {
          QueryResponse: {
            Account: Array.from({ length: 500 }, (_, i) => 
              generateMockAccount(String(i + 1), `Account ${i + 1}`, 'Expense', Math.random() * 10000)
            ),
          },
        },
      };

      mockAxios.get.mockResolvedValue(largeDataset);

      const startTime = Date.now();
      
      const accounts = await integration.getChartOfAccounts(
        mockTokens.access_token,
        mockTokens.realmId
      );

      const executionTime = Date.now() - startTime;

      expect(accounts.length).toBe(500);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should respect API rate limits', async () => {
      // Mock rate limit response followed by successful response
      const rateLimitError = {
        response: { status: 429, data: 'Rate limit exceeded' },
      };

      mockAxios.get
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({
          data: { QueryResponse: { Account: [] } },
        });

      // Mock setTimeout to avoid actual delays in tests
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((cb) => cb()) as any;

      const accounts = await integration.getChartOfAccounts(
        mockTokens.access_token,
        mockTokens.realmId
      );

      expect(mockAxios.get).toHaveBeenCalledTimes(3);
      expect(accounts).toEqual([]);

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });
});

// Helper functions for generating mock data
function generateMockInvoices(count: number) {
  return Array.from({ length: count }, (_, i) => 
    generateMockInvoice(`INV-${String(i + 1).padStart(3, '0')}`, 1000 + i * 100)
  );
}

function generateMockBills(count: number) {
  return Array.from({ length: count }, (_, i) => 
    generateMockBill(`BILL-${String(i + 1).padStart(3, '0')}`, 500 + i * 50)
  );
}

function generateMockInvoice(id: string, amount: number) {
  return {
    Id: id,
    TxnDate: '2024-01-15',
    Line: [{
      Id: '1',
      Amount: amount,
      DetailType: 'SalesItemLineDetail',
    }],
    DocNumber: id,
    TotalAmt: amount,
    Balance: amount * 0.3, // 30% unpaid
    MetaData: {
      CreateTime: '2024-01-15T10:00:00Z',
      LastUpdatedTime: '2024-01-15T10:00:00Z',
    },
  };
}

function generateMockBill(id: string, amount: number) {
  return {
    Id: id,
    TxnDate: '2024-01-15',
    Line: [{
      Id: '1',
      Amount: amount,
      DetailType: 'AccountBasedExpenseLineDetail',
      AccountBasedExpenseLineDetail: {
        AccountRef: { value: '41', name: 'Expenses' },
      },
    }],
    DocNumber: id,
    TotalAmt: amount,
    Balance: amount * 0.8, // 80% unpaid
    MetaData: {
      CreateTime: '2024-01-15T10:00:00Z',
      LastUpdatedTime: '2024-01-15T10:00:00Z',
    },
  };
}

function generateMockJournalEntry(id: string, amount: number) {
  return {
    Id: id,
    TxnDate: '2024-01-15',
    Line: [{
      Id: '1',
      Amount: amount,
      DetailType: 'JournalEntryLineDetail',
      JournalEntryLineDetail: {
        PostingType: 'Debit',
        AccountRef: { value: '1', name: 'Cash' },
      },
    }],
    DocNumber: id,
    MetaData: {
      CreateTime: '2024-01-15T10:00:00Z',
      LastUpdatedTime: '2024-01-15T10:00:00Z',
    },
  };
}

function generateMockAccount(id: string, name: string, type: string, balance: number) {
  return {
    Id: id,
    Name: name,
    AccountType: type,
    CurrentBalance: balance,
    Active: true,
    Classification: type === 'Bank' ? 'Asset' : type,
    MetaData: { LastUpdatedTime: '2024-01-31T23:59:59Z' },
  };
}

function groupTransactionsByWeek(transactions: any[]) {
  const weeks: Record<string, any[]> = {};
  
  transactions.forEach(txn => {
    const date = new Date(txn.TxnDate);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = [];
    }
    weeks[weekKey].push(txn);
  });
  
  return weeks;
}

function calculateMonthlyTotals(transactions: any[]) {
  const monthlyTotals: Record<string, number> = {};
  
  transactions.forEach(txn => {
    const date = new Date(txn.TxnDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = 0;
    }
    
    txn.Line?.forEach((line: any) => {
      monthlyTotals[monthKey] += line.Amount || 0;
    });
  });
  
  return monthlyTotals;
}

function generateSeasonalTransactionData() {
  const data = { Invoice: [], Bill: [] };
  
  // Generate seasonal data with higher amounts in Q4 (holiday season)
  for (let month = 1; month <= 12; month++) {
    const baseAmount = month >= 10 ? 2000 : 1000; // Higher in Q4
    const transactionsPerMonth = month >= 10 ? 50 : 25; // More transactions in Q4
    
    for (let i = 0; i < transactionsPerMonth; i++) {
      data.Invoice.push(generateMockInvoice(
        `INV-${month}-${String(i + 1).padStart(2, '0')}`,
        baseAmount + (Math.random() * 1000)
      ));
      
      data.Bill.push(generateMockBill(
        `BILL-${month}-${String(i + 1).padStart(2, '0')}`,
        baseAmount * 0.6 + (Math.random() * 500)
      ));
    }
  }
  
  return data;
}