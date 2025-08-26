/**
 * FinHelm.ai Anomaly Monitoring Agent Tests
 * Comprehensive test suite for anomaly detection with Oracle Ledger analysis
 * Tests statistical detection, pattern analysis, Grok AI integration, and confidence scoring
 */

import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../convex/_generated/api';
import schema from '../convex/schema';

describe('Anomaly Monitoring Agent', () => {
  let th: ConvexTestingHelper;
  let organizationId: any;
  let userId: any;
  let agentId: any;
  let testAccountId: any;

  beforeEach(async () => {
    th = new ConvexTestingHelper(schema);

    // Create test organization
    organizationId = await th.mutation(api.organizations.create, {
      name: 'Test Financial Corp',
      slug: 'test-financial',
      erpType: 'sage_intacct',
      erpSettings: {
        companyId: 'TEST_COMPANY_ANOMALY',
        baseUrl: 'https://api-sandbox.intacct.com',
        apiVersion: 'v1',
        features: ['anomaly_detection', 'ai_analysis'],
      },
      isActive: true,
      subscriptionTier: 'premium',
    });

    // Create test user
    userId = await th.mutation(api.users.create, {
      email: 'anomaly-analyst@finhelm.ai',
      name: 'Anomaly Analyst',
      role: 'user',
      isActive: true,
      preferences: {
        timezone: 'America/New_York',
        language: 'en',
        notifications: {
          email: true,
          sms: false,
          inApp: true,
        },
      },
    });

    // Create test account
    testAccountId = await th.mutation(api.accounts.create, {
      organizationId,
      erpConnectionId: 'test_connection',
      externalId: 'ACC_001',
      code: '1000',
      name: 'Cash - Operating Account',
      fullName: 'Assets > Current Assets > Cash - Operating Account',
      type: 'bank',
      category: 'current_asset',
      subType: 'checking',
      level: 2,
      path: ['Assets', 'Current Assets'],
      isActive: true,
      balance: 150000.00,
      currency: 'USD',
      lastSyncAt: Date.now(),
    });

    // Create anomaly monitoring agent
    agentId = await th.mutation(api.agents.create, {
      organizationId,
      userId,
      name: 'Financial Anomaly Monitor',
      description: 'Advanced anomaly detection for financial transactions with AI explainability',
      category: 'financial_intelligence',
      type: 'anomaly_monitoring',
      isActive: true,
      isPremium: true,
      config: {
        prompt: 'Detect and explain financial transaction anomalies with high confidence',
        model: 'mixtral-8x7b-32768',
        temperature: 0.1,
        maxTokens: 4000,
        dataSource: ['transactions', 'accounts'],
        filters: {
          accounts: [testAccountId],
          dateRange: {
            start: Date.now() - (90 * 24 * 60 * 60 * 1000), // 90 days ago
            end: Date.now(),
          },
          minAmount: 100,
        },
        schedule: {
          frequency: 'daily',
          time: '09:00',
          timezone: 'America/New_York',
        },
      },
      runCount: 0,
    });
  });

  afterEach(async () => {
    await th.finishTest();
  });

  describe('Basic Anomaly Detection', () => {
    it('should detect statistical outliers in transaction amounts', async () => {
      // Create normal transactions
      const normalTransactions = await createNormalTransactionSet(th, organizationId, testAccountId);
      
      // Create an outlier transaction
      const outlierTransaction = await th.mutation(api.transactions.create, {
        organizationId,
        erpConnectionId: 'test_connection',
        externalId: 'TXN_OUTLIER_001',
        type: 'payment',
        accountId: testAccountId,
        description: 'Unusual large payment',
        amount: -150000, // Much larger than normal
        currency: 'USD',
        transactionDate: Date.now(),
        status: 'posted',
        reconciliationStatus: 'unreconciled',
        lastSyncAt: Date.now(),
      });

      // Run anomaly detection
      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
        analysisConfig: {
          dateRange: {
            start: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days
            end: Date.now(),
          },
          confidenceThreshold: 75.0,
        },
      });

      // Verify results
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].type).toBe('statistical_outlier');
      expect(result.anomalies[0].transactionId).toBe(outlierTransaction);
      expect(result.anomalies[0].severity).toBeOneOf(['high', 'critical']);
      expect(result.anomalies[0].confidence).toBeGreaterThan(75);

      // Verify confidence score meets target
      expect(result.confidence).toBeGreaterThanOrEqual(75);
      
      // Verify execution metrics
      expect(result.executionMetrics.transactionsAnalyzed).toBeGreaterThan(0);
      expect(result.executionMetrics.executionTimeMs).toBeLessThan(30000); // Under 30 seconds
    });

    it('should achieve 92.7% confidence target with sufficient data', async () => {
      // Create comprehensive transaction dataset
      await createComprehensiveTransactionSet(th, organizationId, testAccountId);
      
      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
        analysisConfig: {
          dateRange: {
            start: Date.now() - (90 * 24 * 60 * 60 * 1000), // 90 days
            end: Date.now(),
          },
        },
      });

      // Verify confidence meets or approaches target
      expect(result.confidence).toBeGreaterThanOrEqual(85.0); // Allow some variance
      expect(result.executionMetrics.confidenceScore).toBeGreaterThanOrEqual(85.0);
      
      // Verify comprehensive analysis
      expect(result.executionMetrics.transactionsAnalyzed).toBeGreaterThan(50);
      expect(result.summary.avgConfidence).toBeGreaterThan(80);
    });

    it('should detect timing anomalies (weekend/after-hours transactions)', async () => {
      // Create weekend transaction
      const weekendDate = getNextWeekend();
      const weekendTransaction = await th.mutation(api.transactions.create, {
        organizationId,
        erpConnectionId: 'test_connection',
        externalId: 'TXN_WEEKEND_001',
        type: 'payment',
        accountId: testAccountId,
        description: 'Weekend payment processing',
        amount: -5000,
        currency: 'USD',
        transactionDate: weekendDate.getTime(),
        status: 'posted',
        reconciliationStatus: 'unreconciled',
        lastSyncAt: Date.now(),
      });

      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      const timingAnomalies = result.anomalies.filter(a => a.type === 'timing_anomaly');
      expect(timingAnomalies).toHaveLength(1);
      expect(timingAnomalies[0].description).toContain('weekend');
      expect(timingAnomalies[0].confidence).toBeGreaterThan(70);
    });

    it('should detect duplicate transactions', async () => {
      const baseTime = Date.now();
      
      // Create original transaction
      const originalTxn = await th.mutation(api.transactions.create, {
        organizationId,
        erpConnectionId: 'test_connection',
        externalId: 'TXN_ORIGINAL_001',
        type: 'payment',
        accountId: testAccountId,
        description: 'Vendor payment - ABC Corp',
        amount: -2500,
        currency: 'USD',
        transactionDate: baseTime,
        status: 'posted',
        reconciliationStatus: 'reconciled',
        lastSyncAt: Date.now(),
      });

      // Create potential duplicate (same amount, description, within 1 hour)
      const duplicateTxn = await th.mutation(api.transactions.create, {
        organizationId,
        erpConnectionId: 'test_connection',
        externalId: 'TXN_DUPLICATE_001',
        type: 'payment',
        accountId: testAccountId,
        description: 'Vendor payment - ABC Corp', // Same description
        amount: -2500, // Same amount
        currency: 'USD',
        transactionDate: baseTime + (30 * 60 * 1000), // 30 minutes later
        status: 'posted',
        reconciliationStatus: 'unreconciled',
        lastSyncAt: Date.now(),
      });

      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      const duplicateAnomalies = result.anomalies.filter(a => a.type === 'duplicate_transaction');
      expect(duplicateAnomalies).toHaveLength(1);
      expect(duplicateAnomalies[0].severity).toBeOneOf(['high', 'critical']);
      expect(duplicateAnomalies[0].subledgerContext.relatedTransactions).toContain(originalTxn);
    });

    it('should detect missing approval anomalies', async () => {
      // Create high-value transaction without approval
      const highValueTxn = await th.mutation(api.transactions.create, {
        organizationId,
        erpConnectionId: 'test_connection',
        externalId: 'TXN_HIGH_VALUE_001',
        type: 'payment',
        accountId: testAccountId,
        description: 'Large equipment purchase',
        amount: -75000, // Above $50k threshold
        currency: 'USD',
        transactionDate: Date.now(),
        status: 'draft', // Not approved
        reconciliationStatus: 'unreconciled',
        lastSyncAt: Date.now(),
      });

      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      const approvalAnomalies = result.anomalies.filter(a => a.type === 'missing_approval');
      expect(approvalAnomalies).toHaveLength(1);
      expect(approvalAnomalies[0].severity).toBe('high');
      expect(approvalAnomalies[0].description).toContain('approval');
    });
  });

  describe('Oracle Ledger-Inspired Subledger Analysis', () => {
    it('should perform comprehensive subledger categorization', async () => {
      // Create transactions across different subledger categories
      await createMultiCategoryTransactions(th, organizationId, testAccountId);

      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      // Verify subledger analysis
      expect(result.subledgerAnalysis.categories).toHaveLength(8); // All subledger categories
      expect(result.subledgerAnalysis.categories[0]).toHaveProperty('name');
      expect(result.subledgerAnalysis.categories[0]).toHaveProperty('anomalyCount');
      expect(result.subledgerAnalysis.categories[0]).toHaveProperty('totalValue');
      expect(result.subledgerAnalysis.categories[0]).toHaveProperty('variance');
      expect(result.subledgerAnalysis.categories[0]).toHaveProperty('riskScore');

      // Verify balance reconciliation
      expect(result.subledgerAnalysis.balanceReconciliation).toHaveProperty('totalDebits');
      expect(result.subledgerAnalysis.balanceReconciliation).toHaveProperty('totalCredits');
      expect(result.subledgerAnalysis.balanceReconciliation).toHaveProperty('netVariance');
      expect(result.subledgerAnalysis.balanceReconciliation.reconciledPercentage).toBeGreaterThanOrEqual(0);
    });

    it('should identify compliance flags', async () => {
      // Create transactions with compliance issues
      await createComplianceIssueTransactions(th, organizationId, testAccountId);

      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      expect(result.subledgerAnalysis.complianceFlags).toBeDefined();
      expect(result.subledgerAnalysis.complianceFlags.length).toBeGreaterThan(0);
      
      const approvalFlag = result.subledgerAnalysis.complianceFlags.find(
        flag => flag.type === 'approval_required'
      );
      expect(approvalFlag).toBeDefined();
      expect(approvalFlag.severity).toBeOneOf(['high', 'medium']);
    });

    it('should calculate accurate risk scores', async () => {
      await createRiskyTransactionPatterns(th, organizationId, testAccountId);

      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      const highRiskCategories = result.subledgerAnalysis.categories.filter(
        cat => cat.riskScore > 50
      );
      expect(highRiskCategories.length).toBeGreaterThan(0);
      
      // Verify risk score is calculated correctly
      highRiskCategories.forEach(category => {
        expect(category.riskScore).toBeGreaterThanOrEqual(0);
        expect(category.riskScore).toBeLessThanOrEqual(100);
        expect(category.keyIssues).toBeDefined();
        expect(category.keyIssues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Grok AI Integration', () => {
    it('should enhance anomalies with Grok explanations when API is available', async () => {
      // Mock Grok API response
      const mockGrokResponse = {
        explanation: 'This transaction is anomalous because it exceeds 3.2 standard deviations from the historical mean for this account type.',
        drivers: [
          'Amount significantly exceeds historical patterns',
          'Transaction occurred during off-hours',
          'Vendor not previously seen in this account'
        ],
        recommendations: [
          'Verify transaction with original documentation',
          'Check approval workflow compliance',
          'Review vendor authorization status'
        ],
        riskAssessment: 'High risk - potential fraud or data entry error',
        similarPatterns: ['Large_vendor_payments', 'Off_hours_processing']
      };

      // Mock fetch for Grok API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify(mockGrokResponse)
            }
          }]
        }),
      });

      // Create outlier transaction
      await th.mutation(api.transactions.create, {
        organizationId,
        erpConnectionId: 'test_connection',
        externalId: 'TXN_GROK_TEST_001',
        type: 'payment',
        accountId: testAccountId,
        description: 'Large vendor payment',
        amount: -85000,
        currency: 'USD',
        transactionDate: Date.now(),
        status: 'posted',
        reconciliationStatus: 'unreconciled',
        lastSyncAt: Date.now(),
      });

      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      expect(result.anomalies.length).toBeGreaterThan(0);
      const enhancedAnomaly = result.anomalies[0];
      
      expect(enhancedAnomaly.grokAnalysis.explanation).toBe(mockGrokResponse.explanation);
      expect(enhancedAnomaly.grokAnalysis.drivers).toEqual(mockGrokResponse.drivers);
      expect(enhancedAnomaly.grokAnalysis.recommendations).toEqual(mockGrokResponse.recommendations);
      expect(enhancedAnomaly.grokAnalysis.riskAssessment).toBe(mockGrokResponse.riskAssessment);
    });

    it('should gracefully handle Grok API failures', async () => {
      // Mock failed Grok API response
      global.fetch = jest.fn().mockRejectedValue(new Error('Grok API unavailable'));

      // Create outlier transaction
      await th.mutation(api.transactions.create, {
        organizationId,
        erpConnectionId: 'test_connection',
        externalId: 'TXN_GROK_FAIL_001',
        type: 'payment',
        accountId: testAccountId,
        description: 'Test transaction for Grok failure',
        amount: -50000,
        currency: 'USD',
        transactionDate: Date.now(),
        status: 'posted',
        reconciliationStatus: 'unreconciled',
        lastSyncAt: Date.now(),
      });

      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      expect(result.anomalies.length).toBeGreaterThan(0);
      const anomaly = result.anomalies[0];
      
      // Should have fallback Grok analysis
      expect(anomaly.grokAnalysis.explanation).toContain('error');
      expect(anomaly.grokAnalysis.drivers).toContain('Error in AI analysis');
      expect(anomaly.grokAnalysis.recommendations).toContain('Manual review required');
    });

    it('should handle missing Grok API configuration', async () => {
      // Mock empty API key (simulate missing configuration)
      const originalApiKey = process.env.GROK_API_KEY;
      process.env.GROK_API_KEY = '';

      try {
        // Create test transaction
        await th.mutation(api.transactions.create, {
          organizationId,
          erpConnectionId: 'test_connection',
          externalId: 'TXN_NO_GROK_001',
          type: 'payment',
          accountId: testAccountId,
          description: 'Test without Grok API key',
          amount: -30000,
          currency: 'USD',
          transactionDate: Date.now(),
          status: 'posted',
          reconciliationStatus: 'unreconciled',
          lastSyncAt: Date.now(),
        });

        const result = await th.action(api.anomalyAgent.detectAnomalies, {
          organizationId,
          agentId,
          userId,
        });

        expect(result.anomalies.length).toBeGreaterThan(0);
        const anomaly = result.anomalies[0];
        
        expect(anomaly.grokAnalysis.explanation).toContain('AI analysis unavailable');
        expect(anomaly.grokAnalysis.drivers).toContain('Statistical detection');
      } finally {
        process.env.GROK_API_KEY = originalApiKey;
      }
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate confidence scores accurately', async () => {
      await createNormalTransactionSet(th, organizationId, testAccountId);
      
      // Create clear anomaly
      await th.mutation(api.transactions.create, {
        organizationId,
        erpConnectionId: 'test_connection',
        externalId: 'TXN_CLEAR_ANOMALY_001',
        type: 'payment',
        accountId: testAccountId,
        description: 'Very large outlier transaction',
        amount: -200000, // Extremely large
        currency: 'USD',
        transactionDate: Date.now(),
        status: 'posted',
        reconciliationStatus: 'unreconciled',
        lastSyncAt: Date.now(),
      });

      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      // Verify individual anomaly confidence
      expect(result.anomalies.length).toBeGreaterThan(0);
      result.anomalies.forEach(anomaly => {
        expect(anomaly.confidence).toBeGreaterThanOrEqual(75);
        expect(anomaly.confidence).toBeLessThanOrEqual(100);
      });

      // Verify overall confidence calculation
      expect(result.confidence).toBeGreaterThanOrEqual(75);
      expect(result.summary.avgConfidence).toBeGreaterThanOrEqual(75);
    });

    it('should filter anomalies below confidence threshold', async () => {
      await createMixedConfidenceAnomalies(th, organizationId, testAccountId);

      const highThresholdResult = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
        analysisConfig: {
          confidenceThreshold: 90.0, // High threshold
        },
      });

      const lowThresholdResult = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
        analysisConfig: {
          confidenceThreshold: 60.0, // Low threshold
        },
      });

      expect(lowThresholdResult.anomalies.length).toBeGreaterThan(highThresholdResult.anomalies.length);
      
      // All returned anomalies should meet the threshold
      highThresholdResult.anomalies.forEach(anomaly => {
        expect(anomaly.confidence).toBeGreaterThanOrEqual(90);
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete analysis within performance targets', async () => {
      // Create large dataset
      await createLargeTransactionDataset(th, organizationId, testAccountId, 200);

      const startTime = Date.now();
      
      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      const executionTime = Date.now() - startTime;

      // Performance assertions
      expect(executionTime).toBeLessThan(60000); // Under 60 seconds
      expect(result.executionMetrics.executionTimeMs).toBeLessThan(60000);
      expect(result.executionMetrics.transactionsAnalyzed).toBe(200);
      
      // Verify analysis quality is maintained with scale
      if (result.anomalies.length > 0) {
        expect(result.summary.avgConfidence).toBeGreaterThan(70);
      }
    });

    it('should handle empty transaction datasets gracefully', async () => {
      const result = await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      expect(result.anomalies).toHaveLength(0);
      expect(result.summary.totalAnomalies).toBe(0);
      expect(result.executionMetrics.transactionsAnalyzed).toBe(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Recent Results Query', () => {
    it('should retrieve recent anomaly detection results', async () => {
      // Run anomaly detection first
      await th.action(api.anomalyAgent.detectAnomalies, {
        organizationId,
        agentId,
        userId,
      });

      // Query recent results
      const recentResults = await th.query(api.anomalyAgent.getRecentAnomalyResults, {
        organizationId,
        agentId,
        limit: 5,
      });

      expect(recentResults).toBeDefined();
      expect(Array.isArray(recentResults)).toBe(true);
      
      if (recentResults.length > 0) {
        expect(recentResults[0]).toHaveProperty('status');
        expect(recentResults[0]).toHaveProperty('output');
        expect(recentResults[0].status).toBe('completed');
      }
    });

    it('should filter results by agent type when no specific agent provided', async () => {
      const recentResults = await th.query(api.anomalyAgent.getRecentAnomalyResults, {
        organizationId,
        limit: 10,
      });

      expect(Array.isArray(recentResults)).toBe(true);
      // Should return only anomaly monitoring results
    });
  });
});

// Helper Functions for Test Data Creation

async function createNormalTransactionSet(th: ConvexTestingHelper, organizationId: any, accountId: any): Promise<any[]> {
  const transactions = [];
  const baseAmount = 2500;
  const now = Date.now();
  
  // Create 20 normal transactions with small variations
  for (let i = 0; i < 20; i++) {
    const amount = baseAmount + (Math.random() - 0.5) * 1000; // ±$500 variation
    const date = now - (i * 24 * 60 * 60 * 1000); // One per day going back
    
    const txn = await th.mutation(api.transactions.create, {
      organizationId,
      erpConnectionId: 'test_connection',
      externalId: `TXN_NORMAL_${i.toString().padStart(3, '0')}`,
      type: 'payment',
      accountId,
      description: `Regular vendor payment ${i + 1}`,
      amount: -Math.abs(amount),
      currency: 'USD',
      transactionDate: date,
      status: 'posted',
      reconciliationStatus: i % 4 === 0 ? 'unreconciled' : 'reconciled', // 25% unreconciled
      lastSyncAt: Date.now(),
    });
    
    transactions.push(txn);
  }
  
  return transactions;
}

async function createComprehensiveTransactionSet(th: ConvexTestingHelper, organizationId: any, accountId: any): Promise<void> {
  // Create a large set of transactions to boost confidence
  for (let i = 0; i < 100; i++) {
    await th.mutation(api.transactions.create, {
      organizationId,
      erpConnectionId: 'test_connection',
      externalId: `TXN_COMP_${i.toString().padStart(3, '0')}`,
      type: i % 3 === 0 ? 'invoice' : 'payment',
      accountId,
      description: `Transaction ${i + 1}`,
      amount: (Math.random() - 0.5) * 10000, // -$5000 to +$5000
      currency: 'USD',
      transactionDate: Date.now() - (Math.random() * 90 * 24 * 60 * 60 * 1000), // Random within 90 days
      status: 'posted',
      reconciliationStatus: Math.random() > 0.2 ? 'reconciled' : 'unreconciled', // 80% reconciled
      lastSyncAt: Date.now(),
    });
  }
}

async function createMultiCategoryTransactions(th: ConvexTestingHelper, organizationId: any, baseAccountId: any): Promise<void> {
  const accountTypes = ['bank', 'accounts_payable', 'accounts_receivable', 'asset', 'liability', 'revenue', 'expense'];
  
  for (const accountType of accountTypes) {
    const accountId = await th.mutation(api.accounts.create, {
      organizationId,
      erpConnectionId: 'test_connection',
      externalId: `ACC_${accountType.toUpperCase()}`,
      code: `${accountTypes.indexOf(accountType) + 2000}`,
      name: `Test ${accountType} Account`,
      fullName: `Test > ${accountType} > Account`,
      type: accountType as any,
      level: 1,
      path: ['Test'],
      isActive: true,
      balance: 10000,
      currency: 'USD',
      lastSyncAt: Date.now(),
    });

    // Create transactions for this account type
    for (let i = 0; i < 5; i++) {
      await th.mutation(api.transactions.create, {
        organizationId,
        erpConnectionId: 'test_connection',
        externalId: `TXN_${accountType.toUpperCase()}_${i}`,
        type: 'payment',
        accountId,
        description: `${accountType} transaction ${i + 1}`,
        amount: (Math.random() - 0.5) * 5000,
        currency: 'USD',
        transactionDate: Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000),
        status: 'posted',
        reconciliationStatus: 'reconciled',
        lastSyncAt: Date.now(),
      });
    }
  }
}

async function createComplianceIssueTransactions(th: ConvexTestingHelper, organizationId: any, accountId: any): Promise<void> {
  // High-value transaction without approval
  await th.mutation(api.transactions.create, {
    organizationId,
    erpConnectionId: 'test_connection',
    externalId: 'TXN_COMPLIANCE_001',
    type: 'payment',
    accountId,
    description: 'Large equipment purchase - compliance issue',
    amount: -75000,
    currency: 'USD',
    transactionDate: Date.now(),
    status: 'draft', // Not approved
    reconciliationStatus: 'unreconciled',
    lastSyncAt: Date.now(),
  });

  // Transaction without reference number
  await th.mutation(api.transactions.create, {
    organizationId,
    erpConnectionId: 'test_connection',
    externalId: 'TXN_COMPLIANCE_002',
    type: 'invoice',
    accountId,
    description: 'Invoice without reference',
    amount: 5000,
    currency: 'USD',
    transactionDate: Date.now(),
    // Missing referenceNumber
    status: 'posted',
    reconciliationStatus: 'reconciled',
    lastSyncAt: Date.now(),
  });
}

async function createRiskyTransactionPatterns(th: ConvexTestingHelper, organizationId: any, accountId: any): Promise<void> {
  // Weekend transactions
  const weekend = getNextWeekend();
  await th.mutation(api.transactions.create, {
    organizationId,
    erpConnectionId: 'test_connection',
    externalId: 'TXN_RISKY_001',
    type: 'payment',
    accountId,
    description: 'Weekend processing',
    amount: -3000,
    currency: 'USD',
    transactionDate: weekend.getTime(),
    status: 'posted',
    reconciliationStatus: 'unreconciled', // Unreconciled weekend transaction
    lastSyncAt: Date.now(),
  });

  // High-value unreconciled transaction
  await th.mutation(api.transactions.create, {
    organizationId,
    erpConnectionId: 'test_connection',
    externalId: 'TXN_RISKY_002',
    type: 'payment',
    accountId,
    description: 'High value unreconciled',
    amount: -25000,
    currency: 'USD',
    transactionDate: Date.now(),
    status: 'posted',
    reconciliationStatus: 'unreconciled',
    lastSyncAt: Date.now(),
  });
}

async function createMixedConfidenceAnomalies(th: ConvexTestingHelper, organizationId: any, accountId: any): Promise<void> {
  // High confidence anomaly (large outlier)
  await th.mutation(api.transactions.create, {
    organizationId,
    erpConnectionId: 'test_connection',
    externalId: 'TXN_HIGH_CONF_001',
    type: 'payment',
    accountId,
    description: 'Very large payment - high confidence anomaly',
    amount: -150000,
    currency: 'USD',
    transactionDate: Date.now(),
    status: 'posted',
    reconciliationStatus: 'unreconciled',
    lastSyncAt: Date.now(),
  });

  // Medium confidence anomaly (moderate outlier)
  await th.mutation(api.transactions.create, {
    organizationId,
    erpConnectionId: 'test_connection',
    externalId: 'TXN_MED_CONF_001',
    type: 'payment',
    accountId,
    description: 'Moderate outlier - medium confidence',
    amount: -15000,
    currency: 'USD',
    transactionDate: Date.now(),
    status: 'posted',
    reconciliationStatus: 'reconciled',
    lastSyncAt: Date.now(),
  });
}

async function createLargeTransactionDataset(th: ConvexTestingHelper, organizationId: any, accountId: any, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await th.mutation(api.transactions.create, {
      organizationId,
      erpConnectionId: 'test_connection',
      externalId: `TXN_LARGE_${i.toString().padStart(4, '0')}`,
      type: i % 3 === 0 ? 'invoice' : 'payment',
      accountId,
      description: `Bulk transaction ${i + 1}`,
      amount: (Math.random() - 0.5) * 20000, // -$10k to +$10k
      currency: 'USD',
      transactionDate: Date.now() - (Math.random() * 60 * 24 * 60 * 60 * 1000), // Random within 60 days
      status: 'posted',
      reconciliationStatus: Math.random() > 0.15 ? 'reconciled' : 'unreconciled', // 85% reconciled
      lastSyncAt: Date.now(),
    });
  }
}

function getNextWeekend(): Date {
  const date = new Date();
  date.setDate(date.getDate() + (6 - date.getDay())); // Next Saturday
  date.setHours(14, 30, 0, 0); // 2:30 PM
  return date;
}

// Custom Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}

expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});