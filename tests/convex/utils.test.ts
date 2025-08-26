import { describe, it, expect } from 'vitest';
import {
  fuzzyMatchScore,
  normalizeAccountCode,
  findBestAccountMatches,
  detectTransactionAnomalies,
  calculateFinancialRatios,
} from '../../convex/utils';

describe('Utility Functions', () => {
  describe('fuzzyMatchScore', () => {
    it('should return 1.0 for identical strings', () => {
      expect(fuzzyMatchScore('cash', 'cash')).toBe(1.0);
      expect(fuzzyMatchScore('Cash Account', 'Cash Account')).toBe(1.0);
    });

    it('should return high score for similar strings', () => {
      const score = fuzzyMatchScore('Cash Account', 'Cash Accounts');
      expect(score).toBeGreaterThan(0.8);
      expect(score).toBeLessThan(1.0);
    });

    it('should normalize strings before comparison', () => {
      const score1 = fuzzyMatchScore('Cash-Account', 'Cash Account');
      const score2 = fuzzyMatchScore('Cash_Account', 'Cash Account');
      const score3 = fuzzyMatchScore('CASH ACCOUNT', 'cash account');
      
      expect(score1).toBeGreaterThan(0.9);
      expect(score2).toBeGreaterThan(0.9);
      expect(score3).toBe(1.0);
    });

    it('should return low score for dissimilar strings', () => {
      const score = fuzzyMatchScore('Cash', 'Revenue');
      expect(score).toBeLessThan(0.3);
    });

    it('should handle empty strings', () => {
      expect(fuzzyMatchScore('', '')).toBe(1.0);
      expect(fuzzyMatchScore('cash', '')).toBeLessThan(1.0);
      expect(fuzzyMatchScore('', 'cash')).toBeLessThan(1.0);
    });
  });

  describe('normalizeAccountCode', () => {
    it('should normalize account codes correctly', () => {
      expect(normalizeAccountCode('ACC-001')).toBe('acc001');
      expect(normalizeAccountCode('ACC_002')).toBe('acc002');
      expect(normalizeAccountCode('ACC.003')).toBe('acc003');
      expect(normalizeAccountCode('ACC 004')).toBe('acc004');
    });

    it('should remove leading zeros', () => {
      expect(normalizeAccountCode('0001000')).toBe('1000');
      expect(normalizeAccountCode('00123')).toBe('123');
    });

    it('should handle mixed cases and special characters', () => {
      expect(normalizeAccountCode('GL-ACC-001')).toBe('glacc001');
      expect(normalizeAccountCode('A/R_123')).toBe('ar123');
    });
  });

  describe('findBestAccountMatches (Enhanced 90% Threshold)', () => {
    const sourceAccounts = [
      {
        code: 'ACC-001',
        name: 'Cash and Cash Equivalents',
        fullName: 'Assets:Current Assets:Cash and Cash Equivalents',
        type: 'bank'
      },
      {
        code: 'ACC-002',
        name: 'Accounts Receivable',
        fullName: 'Assets:Current Assets:Accounts Receivable',
        type: 'accounts_receivable'
      },
      {
        code: 'REV-001',
        name: 'Product Revenue',
        fullName: 'Revenue:Product Revenue',
        type: 'revenue'
      }
    ];

    const targetAccounts = [
      {
        code: 'ACC001',
        name: 'Cash & Cash Equivalents',
        fullName: 'Assets:Current Assets:Cash & Cash Equivalents',
        type: 'bank'
      },
      {
        code: 'A/R',
        name: 'Accounts Receivable',
        fullName: 'Assets:Current Assets:A/R',
        type: 'accounts_receivable'
      },
      {
        code: 'REV001',
        name: 'Revenue - Products',
        fullName: 'Revenue:Product Sales',
        type: 'revenue'
      }
    ];

    it('should find high-confidence matches above 90% threshold', () => {
      const matches = findBestAccountMatches(sourceAccounts, targetAccounts, 0.9);
      
      expect(matches.length).toBeGreaterThan(0);
      
      // Should match the cash accounts with high confidence
      const cashMatch = matches.find(m => m.source.code === 'ACC-001');
      expect(cashMatch).toBeDefined();
      expect(cashMatch!.score).toBeGreaterThanOrEqual(0.9);
      expect(cashMatch!.target.code).toBe('ACC001');
      
      // Should include detailed match factors
      expect(cashMatch!.matchFactors).toBeDefined();
      expect(cashMatch!.matchFactors.codeScore).toBeGreaterThan(0);
      expect(cashMatch!.matchFactors.nameScore).toBeGreaterThan(0);
      expect(cashMatch!.matchFactors.hierarchyScore).toBeGreaterThan(0);
    });

    it('should prioritize exact code matches', () => {
      const exactCodeSource = [
        { code: 'CASH001', name: 'Cash Account', fullName: 'Assets:Cash', type: 'bank' }
      ];
      const exactCodeTarget = [
        { code: 'CASH001', name: 'Different Name', fullName: 'Different:Path', type: 'expense' }
      ];

      const matches = findBestAccountMatches(exactCodeSource, exactCodeTarget, 0.9);
      
      expect(matches.length).toBe(1);
      expect(matches[0].score).toBeGreaterThanOrEqual(0.9);
      expect(matches[0].matchFactors.codeScore).toBe(1.0);
    });

    it('should handle hierarchical account matching', () => {
      const hierarchicalSource = [
        {
          code: 'EXP-001',
          name: 'Job Materials',
          fullName: 'Job Expenses:Job Materials:Decks and Patios',
          type: 'expense'
        }
      ];
      const hierarchicalTarget = [
        {
          code: 'EXP001',
          name: 'Materials',
          fullName: 'Job Expenses:Job Materials:Deck Materials',
          type: 'expense'
        }
      ];

      const matches = findBestAccountMatches(hierarchicalSource, hierarchicalTarget, 0.85);
      
      expect(matches.length).toBe(1);
      expect(matches[0].matchFactors.hierarchyScore).toBeGreaterThan(0.7);
    });

    it('should respect the 90% threshold', () => {
      const lowQualitySource = [
        { code: 'UNKNOWN', name: 'Unknown Account', fullName: 'Unknown:Path', type: 'other' }
      ];

      const matches = findBestAccountMatches(lowQualitySource, targetAccounts, 0.9);
      
      // Should not match due to low similarity scores
      expect(matches.length).toBe(0);
    });

    it('should sort matches by confidence score', () => {
      const matches = findBestAccountMatches(sourceAccounts, targetAccounts, 0.7);
      
      // Ensure matches are sorted in descending order by score
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
      }
    });

    it('should handle account type matching bonus', () => {
      const sameTypeSource = [
        { code: 'BANK001', name: 'Bank Account', fullName: 'Assets:Bank', type: 'bank' }
      ];
      const sameTypeTarget = [
        { code: 'BANK002', name: 'Banking Account', fullName: 'Assets:Banking', type: 'bank' }
      ];

      const matches = findBestAccountMatches(sameTypeSource, sameTypeTarget, 0.8);
      
      expect(matches.length).toBe(1);
      expect(matches[0].matchFactors.typeScore).toBe(1.0);
    });
  });

  describe('detectTransactionAnomalies', () => {
    const normalTransactions = [
      { id: '1', accountCode: 'CASH', amount: 1000, transactionDate: Date.now(), type: 'deposit' },
      { id: '2', accountCode: 'CASH', amount: 1100, transactionDate: Date.now(), type: 'deposit' },
      { id: '3', accountCode: 'CASH', amount: 900, transactionDate: Date.now(), type: 'deposit' },
      { id: '4', accountCode: 'CASH', amount: 1050, transactionDate: Date.now(), type: 'deposit' },
      { id: '5', accountCode: 'CASH', amount: 950, transactionDate: Date.now(), type: 'deposit' },
    ];

    it('should detect amount anomalies using statistical analysis', () => {
      const anomalousTransactions = [
        ...normalTransactions,
        { id: '6', accountCode: 'CASH', amount: 10000, transactionDate: Date.now(), type: 'deposit' }, // Outlier
      ];

      const anomalies = detectTransactionAnomalies(anomalousTransactions);
      
      expect(anomalies.length).toBeGreaterThan(0);
      
      const amountAnomaly = anomalies.find(a => a.anomalyType === 'amount');
      expect(amountAnomaly).toBeDefined();
      expect(amountAnomaly!.transactionId).toBe('6');
      expect(amountAnomaly!.confidence).toBeGreaterThan(0.8);
    });

    it('should use historical data when provided', () => {
      const historicalData = [
        {
          accountCode: 'CASH',
          avgAmount: 1000,
          stdDev: 100,
          frequency: 50
        }
      ];

      const transactionsWithHistoricalContext = [
        { id: '1', accountCode: 'CASH', amount: 2000, transactionDate: Date.now(), type: 'deposit' }
      ];

      const anomalies = detectTransactionAnomalies(transactionsWithHistoricalContext, historicalData);
      
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].description).toContain('historical average');
    });

    it('should classify anomaly severity correctly', () => {
      const extremeTransactions = [
        ...normalTransactions,
        { id: '6', accountCode: 'CASH', amount: 50000, transactionDate: Date.now(), type: 'deposit' }, // Extreme outlier
      ];

      const anomalies = detectTransactionAnomalies(extremeTransactions);
      const extremeAnomaly = anomalies.find(a => a.transactionId === '6');
      
      expect(extremeAnomaly).toBeDefined();
      expect(extremeAnomaly!.severity).toBe('high');
    });

    it('should sort anomalies by confidence', () => {
      const multipleAnomalies = [
        ...normalTransactions,
        { id: '6', accountCode: 'CASH', amount: 5000, transactionDate: Date.now(), type: 'deposit' },
        { id: '7', accountCode: 'CASH', amount: 20000, transactionDate: Date.now(), type: 'deposit' },
      ];

      const anomalies = detectTransactionAnomalies(multipleAnomalies);
      
      // Should be sorted by confidence (highest first)
      for (let i = 1; i < anomalies.length; i++) {
        expect(anomalies[i - 1].confidence).toBeGreaterThanOrEqual(anomalies[i].confidence);
      }
    });

    it('should handle empty transaction list', () => {
      const anomalies = detectTransactionAnomalies([]);
      expect(anomalies).toEqual([]);
    });

    it('should handle single transaction gracefully', () => {
      const singleTransaction = [
        { id: '1', accountCode: 'CASH', amount: 1000, transactionDate: Date.now(), type: 'deposit' }
      ];

      const anomalies = detectTransactionAnomalies(singleTransaction);
      expect(anomalies).toEqual([]);
    });
  });

  describe('calculateFinancialRatios', () => {
    const sampleBalances = {
      currentAssets: 100000,
      currentLiabilities: 50000,
      totalDebt: 200000,
      totalEquity: 300000,
      revenue: 500000,
      costOfGoodsSold: 200000,
      netIncome: 50000,
    };

    it('should calculate financial ratios correctly', () => {
      const ratios = calculateFinancialRatios(sampleBalances);

      expect(ratios.currentRatio).toBe(2.0); // 100000/50000
      expect(ratios.quickRatio).toBe(1.6); // (100000*0.8)/50000
      expect(ratios.debtToEquity).toBeCloseTo(0.667, 2); // 200000/300000
      expect(ratios.grossMargin).toBe(0.6); // (500000-200000)/500000
      expect(ratios.netMargin).toBe(0.1); // 50000/500000
    });

    it('should handle zero denominators safely', () => {
      const zeroBalances = {
        currentAssets: 100000,
        currentLiabilities: 0,
        totalDebt: 200000,
        totalEquity: 0,
        revenue: 0,
        costOfGoodsSold: 200000,
        netIncome: 50000,
      };

      const ratios = calculateFinancialRatios(zeroBalances);

      expect(ratios.currentRatio).toBe(0);
      expect(ratios.quickRatio).toBe(0);
      expect(ratios.debtToEquity).toBe(0);
      expect(ratios.grossMargin).toBe(0);
      expect(ratios.netMargin).toBe(0);
    });

    it('should handle negative values appropriately', () => {
      const negativeBalances = {
        currentAssets: 100000,
        currentLiabilities: 150000, // More liabilities than assets
        totalDebt: 200000,
        totalEquity: 100000,
        revenue: 500000,
        costOfGoodsSold: 600000, // Higher COGS than revenue
        netIncome: -50000, // Net loss
      };

      const ratios = calculateFinancialRatios(negativeBalances);

      expect(ratios.currentRatio).toBeCloseTo(0.667, 2);
      expect(ratios.debtToEquity).toBe(2.0);
      expect(ratios.grossMargin).toBe(-0.2); // Negative gross margin
      expect(ratios.netMargin).toBe(-0.1); // Negative net margin
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      const startTime = Date.now();

      // Generate large dataset
      const largeSourceAccounts = Array.from({ length: 1000 }, (_, i) => ({
        code: `ACC-${String(i).padStart(3, '0')}`,
        name: `Account ${i}`,
        fullName: `Category:Subcategory:Account ${i}`,
        type: 'expense'
      }));

      const largeTargetAccounts = Array.from({ length: 1000 }, (_, i) => ({
        code: `ACC${String(i).padStart(3, '0')}`,
        name: `Account ${i} Modified`,
        fullName: `Category:Subcategory:Account ${i} Modified`,
        type: 'expense'
      }));

      const matches = findBestAccountMatches(largeSourceAccounts, largeTargetAccounts, 0.8);

      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should handle large transaction anomaly detection efficiently', () => {
      const startTime = Date.now();

      // Generate large transaction dataset
      const largeTransactions = Array.from({ length: 10000 }, (_, i) => ({
        id: String(i),
        accountCode: `ACC-${i % 100}`, // 100 different accounts
        amount: Math.random() * 1000 + (i % 10 === 0 ? 10000 : 0), // Add some outliers
        transactionDate: Date.now() - (i * 1000),
        type: 'expense'
      }));

      const anomalies = detectTransactionAnomalies(largeTransactions);

      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(anomalies.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in account names', () => {
      const specialCharAccounts = [
        { code: 'A&B-001', name: 'A&B Company (Pty) Ltd.', fullName: 'Entities:A&B Company (Pty) Ltd.', type: 'other' }
      ];
      const targetAccounts = [
        { code: 'AB001', name: 'AB Company Pty Ltd', fullName: 'Entities:AB Company Pty Ltd', type: 'other' }
      ];

      const matches = findBestAccountMatches(specialCharAccounts, targetAccounts, 0.8);
      
      expect(matches.length).toBe(1);
      expect(matches[0].score).toBeGreaterThan(0.8);
    });

    it('should handle very long account names', () => {
      const longNameSource = [{
        code: 'LONG001',
        name: 'Very Long Account Name That Exceeds Normal Length Limits And Contains Multiple Words And Descriptions',
        fullName: 'Category:Subcategory:Very Long Account Name That Exceeds Normal Length Limits',
        type: 'expense'
      }];
      const longNameTarget = [{
        code: 'LONG001',
        name: 'Very Long Account Name That Exceeds Normal Length Limits And Contains Multiple Words',
        fullName: 'Category:Subcategory:Very Long Account Name That Exceeds Normal Length',
        type: 'expense'
      }];

      const matches = findBestAccountMatches(longNameSource, longNameTarget, 0.8);
      
      expect(matches.length).toBe(1);
      expect(matches[0].score).toBeGreaterThan(0.9);
    });

    it('should handle unicode characters', () => {
      const unicodeAccounts = [
        { code: 'UNI001', name: 'Café & Résturant', fullName: 'Entities:Café & Résturant', type: 'revenue' }
      ];
      const targetAccounts = [
        { code: 'UNI001', name: 'Cafe & Restaurant', fullName: 'Entities:Cafe & Restaurant', type: 'revenue' }
      ];

      const matches = findBestAccountMatches(unicodeAccounts, targetAccounts, 0.8);
      
      expect(matches.length).toBe(1);
      expect(matches[0].score).toBeGreaterThan(0.8);
    });
  });
});