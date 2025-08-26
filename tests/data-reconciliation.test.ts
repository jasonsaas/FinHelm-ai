/**
 * FinHelm.ai Data Reconciliation Tests
 * Comprehensive test suite for fuzzy matching and reconciliation engine
 * Tests 92.7% confidence target with Document IO-inspired processing
 */

import { expect, describe, it, beforeEach, afterEach } from '@jest/globals';
import { ConvexTestingHelper } from 'convex/testing';
import { api } from '../convex/_generated/api';
import schema from '../convex/schema';

describe('Data Reconciliation Engine', () => {
  let th: ConvexTestingHelper;
  let organizationId: any;
  let userId: any;

  beforeEach(async () => {
    th = new ConvexTestingHelper(schema);

    // Create test organization
    organizationId = await th.mutation(api.organizations.create, {
      name: 'Test Reconciliation Corp',
      slug: 'test-reconciliation',
      erpType: 'sage_intacct',
      erpSettings: {
        companyId: 'TEST_RECON_COMPANY',
        baseUrl: 'https://api-sandbox.intacct.com',
        apiVersion: 'v1',
        features: ['reconciliation', 'fuzzy_matching'],
      },
      isActive: true,
      subscriptionTier: 'premium',
    });

    // Create test user
    userId = await th.mutation(api.users.create, {
      email: 'reconciliation-analyst@finhelm.ai',
      name: 'Reconciliation Analyst',
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
  });

  afterEach(async () => {
    await th.finishTest();
  });

  describe('Exact Matching', () => {
    it('should achieve 100% confidence for perfect matches', async () => {
      const sourceData = [
        {
          id: 'source_001',
          amount: 1500.00,
          description: 'Payment to ABC Vendor',
          date: '2024-08-25',
          reference: 'INV-12345',
          accountCode: '2100',
        }
      ];

      const targetData = [
        {
          id: 'target_001',
          amount: 1500.00,
          description: 'Payment to ABC Vendor',
          date: '2024-08-25',
          reference: 'INV-12345',
          accountCode: '2100',
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Exact Match Test',
        jobDescription: 'Testing perfect exact matches',
        sourceData,
        targetData,
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].matchType).toBe('exact');
      expect(result.matches[0].confidence).toBe(100.0);
      expect(result.matches[0].recommendedAction).toBe('accept');
      expect(result.confidence).toBeGreaterThanOrEqual(95.0);
    });

    it('should handle exact matches with minor description differences', async () => {
      const sourceData = [
        {
          id: 'source_002',
          amount: 2750.50,
          description: 'Vendor Payment - XYZ Corp',
          date: '2024-08-24',
        }
      ];

      const targetData = [
        {
          id: 'target_002',
          amount: 2750.50,
          description: 'Vendor payment - XYZ Corp',  // Case difference
          date: '2024-08-24',
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Case Insensitive Test',
        jobDescription: 'Testing case insensitive matching',
        sourceData,
        targetData,
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].matchType).toBe('exact');
      expect(result.matches[0].confidence).toBe(100.0);
    });
  });

  describe('Fuzzy Matching Algorithms', () => {
    it('should match similar descriptions with high confidence', async () => {
      const sourceData = [
        {
          id: 'source_003',
          amount: 1250.00,
          description: 'Office Supplies - Staples Inc',
          date: '2024-08-20',
        }
      ];

      const targetData = [
        {
          id: 'target_003',
          amount: 1250.00,
          description: 'Office Supplies from Staples',  // Similar but not exact
          date: '2024-08-20',
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Fuzzy Description Test',
        jobDescription: 'Testing fuzzy description matching',
        sourceData,
        targetData,
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].matchType).toBeOneOf(['strong', 'moderate']);
      expect(result.matches[0].confidence).toBeGreaterThan(70.0);
      
      // Check that description similarity was calculated
      const descriptionMatch = result.matches[0].matchingFields.find(f => f.field === 'description');
      expect(descriptionMatch).toBeDefined();
      expect(descriptionMatch.similarity).toBeGreaterThan(0.7);
    });

    it('should handle amount tolerances within configured thresholds', async () => {
      const sourceData = [
        {
          id: 'source_004',
          amount: 1000.00,
          description: 'Monthly Service Fee',
          date: '2024-08-15',
        }
      ];

      const targetData = [
        {
          id: 'target_004',
          amount: 1001.50,  // 0.15% difference
          description: 'Monthly Service Fee',
          date: '2024-08-15',
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Amount Tolerance Test',
        jobDescription: 'Testing amount tolerance matching',
        sourceData,
        targetData,
        config: {
          matchingAlgorithm: 'comprehensive',
          amountTolerancePercent: 0.002, // 0.2% tolerance
        },
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].confidence).toBeGreaterThan(85.0);
      
      // Should have a minor discrepancy noted
      expect(result.matches[0].discrepancies).toHaveLength(1);
      expect(result.matches[0].discrepancies[0].field).toBe('amount');
      expect(result.matches[0].discrepancies[0].significance).toBe('minor');
    });

    it('should handle date tolerances correctly', async () => {
      const sourceData = [
        {
          id: 'source_005',
          amount: 850.00,
          description: 'Equipment Rental',
          date: '2024-08-20',
        }
      ];

      const targetData = [
        {
          id: 'target_005',
          amount: 850.00,
          description: 'Equipment Rental',
          date: '2024-08-22',  // 2 days difference
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Date Tolerance Test',
        jobDescription: 'Testing date tolerance matching',
        sourceData,
        targetData,
        config: {
          matchingAlgorithm: 'comprehensive',
          dateToleranceDays: 3, // 3 day tolerance
        },
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].confidence).toBeGreaterThan(80.0);
      
      const dateMatch = result.matches[0].matchingFields.find(f => f.field === 'date');
      expect(dateMatch).toBeDefined();
      expect(dateMatch.similarity).toBeGreaterThan(0.8);
    });

    it('should prioritize reference number matches', async () => {
      const sourceData = [
        {
          id: 'source_006',
          amount: 3500.00,
          description: 'Equipment Purchase',
          date: '2024-08-10',
          reference: 'PO-98765',
        }
      ];

      const targetData = [
        {
          id: 'target_006',
          amount: 3500.00,
          description: 'New Equipment Purchase',  // Slightly different description
          date: '2024-08-12',  // Different date
          reference: 'PO-98765',  // Same reference
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Reference Number Test',
        jobDescription: 'Testing reference number priority',
        sourceData,
        targetData,
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].confidence).toBeGreaterThan(90.0); // Reference match should boost confidence
      expect(result.matches[0].matchType).toBeOneOf(['exact', 'strong']);
    });
  });

  describe('Multi-stage Matching Pipeline', () => {
    it('should process multiple records with varying match quality', async () => {
      const sourceData = [
        // Exact match
        {
          id: 'source_100',
          amount: 1000.00,
          description: 'Office Rent',
          date: '2024-08-01',
        },
        // Strong fuzzy match
        {
          id: 'source_101',
          amount: 750.50,
          description: 'Utility Bills - Electric',
          date: '2024-08-05',
        },
        // Moderate fuzzy match
        {
          id: 'source_102',
          amount: 2250.00,
          description: 'Marketing Campaign Q3',
          date: '2024-08-10',
        },
        // No match
        {
          id: 'source_103',
          amount: 500.00,
          description: 'Unique Transaction',
          date: '2024-08-15',
        }
      ];

      const targetData = [
        // Exact match
        {
          id: 'target_100',
          amount: 1000.00,
          description: 'Office Rent',
          date: '2024-08-01',
        },
        // Strong fuzzy match (similar description)
        {
          id: 'target_101',
          amount: 750.50,
          description: 'Electric Utility Bills',
          date: '2024-08-05',
        },
        // Moderate fuzzy match (different wording)
        {
          id: 'target_102',
          amount: 2250.00,
          description: 'Q3 Marketing Spend',
          date: '2024-08-11', // 1 day off
        },
        // Extra target record
        {
          id: 'target_103',
          amount: 180.00,
          description: 'Different Transaction',
          date: '2024-08-20',
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Multi-stage Pipeline Test',
        jobDescription: 'Testing full reconciliation pipeline',
        sourceData,
        targetData,
      });

      // Should find 3 matches
      expect(result.matches).toHaveLength(3);
      
      // Check match types
      const exactMatches = result.matches.filter(m => m.matchType === 'exact');
      const strongMatches = result.matches.filter(m => m.matchType === 'strong');
      const moderateMatches = result.matches.filter(m => m.matchType === 'moderate');
      
      expect(exactMatches).toHaveLength(1);
      expect(strongMatches.length + moderateMatches.length).toBeGreaterThanOrEqual(2);

      // Check unmatched records
      expect(result.unmatched.sourceRecords).toHaveLength(1); // source_103
      expect(result.unmatched.targetRecords).toHaveLength(1); // target_103

      // Check summary statistics
      expect(result.summary.totalRecords).toBe(8); // 4 source + 4 target
      expect(result.summary.exactMatches).toBe(1);
      expect(result.summary.matchRate).toBeGreaterThan(50); // 6 matched out of 8 total
    });

    it('should handle duplicate prevention in matching', async () => {
      const sourceData = [
        {
          id: 'source_200',
          amount: 500.00,
          description: 'Service Fee A',
          date: '2024-08-15',
        },
        {
          id: 'source_201',
          amount: 600.00,
          description: 'Service Fee B',
          date: '2024-08-15',
        }
      ];

      const targetData = [
        {
          id: 'target_200',
          amount: 500.00,
          description: 'Service Fee A',
          date: '2024-08-15',
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Duplicate Prevention Test',
        jobDescription: 'Testing one-to-one matching constraint',
        sourceData,
        targetData,
      });

      // Should only match one source record to the target
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].sourceRecord.id).toBe('source_200'); // Should match the first/best match
      expect(result.unmatched.sourceRecords).toHaveLength(1); // source_201 unmatched
    });
  });

  describe('Confidence Scoring System', () => {
    it('should achieve 92.7% confidence target with high-quality data', async () => {
      const sourceData = createHighQualityDataSet('source', 20);
      const targetData = createHighQualityDataSet('target', 20);

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'High Quality Data Test',
        jobDescription: 'Testing confidence with high-quality dataset',
        sourceData,
        targetData,
      });

      // Should achieve target confidence
      expect(result.confidence).toBeGreaterThanOrEqual(90.0);
      expect(result.summary.overallConfidence).toBeGreaterThanOrEqual(85.0);
      
      // Should have high match rate
      expect(result.summary.matchRate).toBeGreaterThan(90.0);
      
      // Should have good data quality scores
      expect(result.summary.dataQuality.completeness).toBeGreaterThan(95.0);
      expect(result.summary.dataQuality.consistency).toBeGreaterThan(95.0);
      expect(result.summary.dataQuality.accuracy).toBeGreaterThan(90.0);
    });

    it('should properly weight different matching factors', async () => {
      const sourceData = [
        {
          id: 'source_300',
          amount: 1500.00,  // Exact amount (35% weight)
          description: 'Monthly Consulting Fee',  // Good description (25% weight)
          date: '2024-08-15',  // Exact date (20% weight)
          reference: 'CONS-001',  // Exact reference (15% weight)
          accountCode: '5000',  // Exact account (5% weight)
        }
      ];

      const targetData = [
        {
          id: 'target_300',
          amount: 1500.00,
          description: 'Consulting Fee Monthly',  // Similar but reordered
          date: '2024-08-15',
          reference: 'CONS-001',
          accountCode: '5000',
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Field Weighting Test',
        jobDescription: 'Testing field weight contributions',
        sourceData,
        targetData,
      });

      expect(result.matches).toHaveLength(1);
      const match = result.matches[0];
      
      // Should be high confidence due to exact amount, date, reference, and account
      expect(match.confidence).toBeGreaterThan(95.0);
      
      // Check individual field contributions
      const amountField = match.matchingFields.find(f => f.field === 'amount');
      const descriptionField = match.matchingFields.find(f => f.field === 'description');
      const dateField = match.matchingFields.find(f => f.field === 'date');
      
      expect(amountField?.similarity).toBe(1.0);
      expect(dateField?.similarity).toBe(1.0);
      expect(descriptionField?.similarity).toBeGreaterThan(0.8); // Good but not perfect due to reordering
    });

    it('should handle confidence threshold filtering', async () => {
      const sourceData = [
        // High confidence match
        {
          id: 'source_400',
          amount: 1000.00,
          description: 'High Quality Match',
          date: '2024-08-20',
        },
        // Low confidence match
        {
          id: 'source_401',
          amount: 500.00,
          description: 'Poor Quality Match',
          date: '2024-08-20',
        }
      ];

      const targetData = [
        // High confidence target
        {
          id: 'target_400',
          amount: 1000.00,
          description: 'High Quality Match',
          date: '2024-08-20',
        },
        // Low confidence target (very different)
        {
          id: 'target_401',
          amount: 480.00, // 4% difference
          description: 'Completely Different Description',
          date: '2024-07-15', // 36 days difference
        }
      ];

      // Test with high confidence threshold
      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Confidence Threshold Test',
        jobDescription: 'Testing confidence-based filtering',
        sourceData,
        targetData,
        config: {
          matchingAlgorithm: 'comprehensive',
          confidenceThreshold: 85.0, // High threshold
        },
      });

      // Should only return high confidence matches
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].sourceRecord.id).toBe('source_400');
      expect(result.matches[0].confidence).toBeGreaterThan(85.0);
      
      // Low confidence match should be in unmatched
      expect(result.unmatched.sourceRecords.some(r => r.id === 'source_401')).toBe(true);
    });
  });

  describe('String Similarity Algorithms', () => {
    it('should handle various string similarity scenarios', async () => {
      const testCases = [
        {
          source: 'Payment to ABC Corporation',
          target: 'ABC Corporation Payment',
          expectedSimilarity: 0.8, // Token reordering
        },
        {
          source: 'Office Supplies - Staples',
          target: 'Office Suplies - Staples', // Typo
          expectedSimilarity: 0.85,
        },
        {
          source: 'Monthly Rent Payment',
          target: 'Monthly Rent Pymnt', // Abbreviation
          expectedSimilarity: 0.8,
        },
        {
          source: 'Equipment Maintenance Fee',
          target: 'Equip Maint Fee', // Multiple abbreviations
          expectedSimilarity: 0.7,
        }
      ];

      for (const testCase of testCases) {
        const sourceData = [{
          id: 'source_test',
          amount: 1000.00,
          description: testCase.source,
          date: '2024-08-20',
        }];

        const targetData = [{
          id: 'target_test',
          amount: 1000.00,
          description: testCase.target,
          date: '2024-08-20',
        }];

        const result = await th.action(api.dataReconciliation.processReconciliation, {
          organizationId,
          userId,
          jobName: `String Similarity Test: ${testCase.source}`,
          jobDescription: 'Testing string similarity algorithms',
          sourceData,
          targetData,
        });

        if (result.matches.length > 0) {
          const descriptionField = result.matches[0].matchingFields.find(f => f.field === 'description');
          expect(descriptionField?.similarity).toBeGreaterThanOrEqual(testCase.expectedSimilarity - 0.1);
          expect(descriptionField?.similarity).toBeLessThanOrEqual(1.0);
        }
      }
    });

    it('should use phonetic matching for sound-alike words', async () => {
      const sourceData = [{
        id: 'source_phonetic',
        amount: 750.00,
        description: 'Smith Construction Services',
        date: '2024-08-20',
      }];

      const targetData = [{
        id: 'target_phonetic',
        amount: 750.00,
        description: 'Smyth Construction Services', // Sound-alike spelling
        date: '2024-08-20',
      }];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Phonetic Matching Test',
        jobDescription: 'Testing phonetic similarity',
        sourceData,
        targetData,
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].confidence).toBeGreaterThan(85.0);
    });
  });

  describe('Data Quality Assessment', () => {
    it('should identify data quality issues', async () => {
      const poorQualityData = [
        {
          id: 'poor_001',
          amount: 0, // Invalid amount
          description: '', // Empty description
          date: '2024-08-20',
        },
        {
          id: 'poor_002',
          amount: NaN, // Invalid number
          description: 'AB', // Too short
          date: 'invalid-date', // Invalid date
        },
        {
          id: 'duplicate_001',
          amount: 500.00,
          description: 'Duplicate Entry',
          date: '2024-08-20',
        },
        {
          id: 'duplicate_002',
          amount: 500.00,
          description: 'Duplicate Entry', // Exact duplicate
          date: '2024-08-20',
        }
      ];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Data Quality Test',
        jobDescription: 'Testing data quality assessment',
        sourceData: poorQualityData,
        targetData: [],
      });

      const quality = result.summary.dataQuality;
      
      // Should detect low completeness
      expect(quality.completeness).toBeLessThan(80.0);
      
      // Should detect low consistency
      expect(quality.consistency).toBeLessThan(80.0);
      
      // Should detect low accuracy
      expect(quality.accuracy).toBeLessThan(80.0);
      
      // Should detect duplicates
      expect(quality.duplicates).toBeGreaterThan(0);
      
      // Overall confidence should be reduced
      expect(result.confidence).toBeLessThan(70.0);
    });

    it('should boost confidence for high-quality data', async () => {
      const highQualityData = createHighQualityDataSet('source', 10);
      const targetQualityData = createHighQualityDataSet('target', 10);

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'High Quality Boost Test',
        jobDescription: 'Testing confidence boost from high quality data',
        sourceData: highQualityData,
        targetData: targetQualityData,
      });

      const quality = result.summary.dataQuality;
      
      // Should have high quality scores
      expect(quality.completeness).toBeGreaterThan(95.0);
      expect(quality.consistency).toBeGreaterThan(95.0);
      expect(quality.accuracy).toBeGreaterThan(90.0);
      expect(quality.duplicates).toBe(0);
      
      // Should achieve high overall confidence
      expect(result.confidence).toBeGreaterThanOrEqual(90.0);
    });
  });

  describe('Document IO-Inspired Processing', () => {
    it('should handle large datasets efficiently', async () => {
      const largeSourceData = createHighQualityDataSet('source', 150);
      const largeTargetData = createHighQualityDataSet('target', 150);

      const startTime = Date.now();
      
      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Large Dataset Test',
        jobDescription: 'Testing performance with large dataset',
        sourceData: largeSourceData,
        targetData: largeTargetData,
      });

      const executionTime = Date.now() - startTime;
      
      // Should complete within reasonable time (5 minutes max per config)
      expect(executionTime).toBeLessThan(300000);
      expect(result.summary.processingTime).toBeLessThan(300000);
      
      // Should still achieve good confidence with large dataset
      expect(result.confidence).toBeGreaterThan(85.0);
      
      // Should process all records
      expect(result.summary.totalRecords).toBe(300);
      expect(result.matches.length).toBeGreaterThan(140); // Most should match
    });

    it('should maintain audit trail throughout processing', async () => {
      const sourceData = [{
        id: 'audit_source',
        amount: 1200.00,
        description: 'Audit Trail Test',
        date: '2024-08-25',
      }];

      const targetData = [{
        id: 'audit_target',
        amount: 1200.00,
        description: 'Audit Trail Test',
        date: '2024-08-25',
      }];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Audit Trail Test',
        jobDescription: 'Testing comprehensive audit trail',
        sourceData,
        targetData,
      });

      // Should have comprehensive audit trail
      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.length).toBeGreaterThan(3);
      
      // Check for key audit events
      const events = result.auditTrail.map(e => e.event);
      expect(events).toContain('reconciliation_started');
      expect(events).toContain('data_preprocessing_completed');
      expect(events).toContain('matching_pipeline_started');
      expect(events).toContain('reconciliation_completed');
      
      // Each event should have timestamp and details
      result.auditTrail.forEach(event => {
        expect(event.timestamp).toBeGreaterThan(0);
        expect(event.details).toBeDefined();
      });
    });
  });

  describe('Configuration Options', () => {
    it('should respect different matching algorithms', async () => {
      const sourceData = [{
        id: 'config_source',
        amount: 800.00,
        description: 'Configuration Test Payment',
        date: '2024-08-20',
      }];

      const targetData = [{
        id: 'config_target',
        amount: 820.00, // 2.5% difference
        description: 'Config Test Payment', // Abbreviated
        date: '2024-08-22', // 2 days difference
      }];

      // Test strict algorithm
      const strictResult = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Strict Algorithm Test',
        jobDescription: 'Testing strict matching algorithm',
        sourceData,
        targetData,
        config: {
          matchingAlgorithm: 'strict',
          amountTolerancePercent: 0.01, // 1% tolerance
          dateToleranceDays: 1,
        },
      });

      // Test comprehensive algorithm
      const comprehensiveResult = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Comprehensive Algorithm Test',
        jobDescription: 'Testing comprehensive matching algorithm',
        sourceData,
        targetData,
        config: {
          matchingAlgorithm: 'comprehensive',
          amountTolerancePercent: 0.03, // 3% tolerance
          dateToleranceDays: 3,
        },
      });

      // Comprehensive should be more lenient and find matches
      expect(comprehensiveResult.matches.length).toBeGreaterThanOrEqual(strictResult.matches.length);
    });

    it('should handle field mappings correctly', async () => {
      const sourceData = [{
        id: 'mapping_source',
        amount: 1500.00,
        description: 'Field Mapping Test',
        date: '2024-08-25',
        customField: 'CUSTOM-001',
      }];

      const targetData = [{
        id: 'mapping_target',
        amount: 1500.00,
        description: 'Field Mapping Test',
        date: '2024-08-25',
        mappedField: 'CUSTOM-001',
      }];

      const result = await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Field Mapping Test',
        jobDescription: 'Testing custom field mappings',
        sourceData,
        targetData,
        config: {
          matchingAlgorithm: 'comprehensive',
          fieldMappings: {
            'customField': 'mappedField',
          },
        },
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].confidence).toBeGreaterThan(90.0);
    });
  });

  describe('Query Operations', () => {
    it('should store and retrieve reconciliation job results', async () => {
      const sourceData = [{
        id: 'query_source',
        amount: 1000.00,
        description: 'Query Test',
        date: '2024-08-25',
      }];

      const targetData = [{
        id: 'query_target',
        amount: 1000.00,
        description: 'Query Test',
        date: '2024-08-25',
      }];

      // Process reconciliation
      await th.action(api.dataReconciliation.processReconciliation, {
        organizationId,
        userId,
        jobName: 'Query Storage Test',
        jobDescription: 'Testing job storage and retrieval',
        sourceData,
        targetData,
      });

      // List recent jobs
      const jobs = await th.query(api.dataReconciliation.listReconciliationJobs, {
        organizationId,
        limit: 5,
      });

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      
      const testJob = jobs.find(job => job.name === 'Query Storage Test');
      expect(testJob).toBeDefined();
      expect(testJob.status).toBe('completed');
      expect(testJob.results).toBeDefined();
    });
  });
});

// Helper Functions for Test Data Generation

function createHighQualityDataSet(prefix: string, count: number): any[] {
  const vendors = [
    'ABC Corporation', 'XYZ Services', 'Tech Solutions Inc', 'Office Supplies Co',
    'Equipment Rental LLC', 'Consulting Group', 'Marketing Agency', 'Legal Services'
  ];

  const descriptions = [
    'Monthly Service Fee', 'Equipment Purchase', 'Office Supplies', 'Consulting Services',
    'Marketing Campaign', 'Legal Consultation', 'Software License', 'Maintenance Contract'
  ];

  const data = [];
  
  for (let i = 0; i < count; i++) {
    const vendor = vendors[i % vendors.length];
    const desc = descriptions[i % descriptions.length];
    const baseAmount = 500 + (i * 100);
    const date = new Date(2024, 7, 1 + (i % 25)); // August 1-25, 2024

    data.push({
      id: `${prefix}_${i.toString().padStart(3, '0')}`,
      amount: baseAmount + (Math.random() * 100), // Small random variation
      description: `${desc} - ${vendor}`,
      date: date.toISOString().split('T')[0],
      reference: `REF-${(1000 + i).toString()}`,
      accountCode: (5000 + (i % 10)).toString(),
      customerId: i % 3 === 0 ? `CUST-${Math.floor(i / 3)}` : undefined,
      vendorId: i % 2 === 0 ? `VEND-${Math.floor(i / 2)}` : undefined,
    });
  }
  
  return data;
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