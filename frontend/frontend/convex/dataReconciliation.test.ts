/**
 * FinHelm.ai Data Reconciliation Engine Tests
 * 
 * Comprehensive test suite for multi-stage fuzzy matching system
 * Tests performance targets, accuracy, and edge cases
 * 
 * @author FinHelm.ai Team
 * @version 1.0.0
 */

import { expect } from "@jest/globals";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

/**
 * Generate sample chart of accounts CSV data
 */
function generateAccountsCSV(recordCount: number = 100): string {
  const accountTypes = ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 'Accounts Payable', 'Other Current Liability', 'Equity', 'Income', 'Expense'];
  const classifications = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
  
  let csv = 'Account ID,Account Name,Account Type,Classification,Balance,Active\n';
  
  for (let i = 1; i <= recordCount; i++) {
    const accountId = (1000 + i * 10).toString();
    const accountName = `Account ${i}`;
    const accountType = accountTypes[i % accountTypes.length];
    const classification = classifications[i % classifications.length];
    const balance = (Math.random() * 100000).toFixed(2);
    const active = Math.random() > 0.1 ? 'true' : 'false';
    
    csv += `${accountId},"${accountName}","${accountType}","${classification}",${balance},${active}\n`;
  }
  
  return csv;
}

/**
 * Generate sample transactions CSV data
 */
function generateTransactionsCSV(recordCount: number = 1000): string {
  const transactionTypes = ['Invoice', 'Bill', 'Payment', 'JournalEntry', 'Deposit'];
  const descriptions = ['Office Supplies', 'Rent Payment', 'Client Payment', 'Utility Bill', 'Equipment Purchase'];
  
  let csv = 'Transaction ID,Date,Amount,Description,Account Name,Reference Number,Type\n';
  
  for (let i = 1; i <= recordCount; i++) {
    const transactionId = `TXN${i.toString().padStart(6, '0')}`;
    const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
    const amount = (Math.random() * 10000).toFixed(2);
    const description = descriptions[i % descriptions.length];
    const accountName = `Account ${Math.floor(Math.random() * 50) + 1}`;
    const referenceNumber = `REF${i.toString().padStart(4, '0')}`;
    const type = transactionTypes[i % transactionTypes.length];
    
    csv += `${transactionId},${date},${amount},"${description}","${accountName}",${referenceNumber},${type}\n`;
  }
  
  return csv;
}

/**
 * Generate CSV with intentional variations for fuzzy matching tests
 */
function generateFuzzyMatchCSV(): string {
  return `Account ID,Account Name,Account Type,Classification,Balance,Active
1000,"Cash and Cash Equivalents","Bank","Asset",25000.00,true
1100,"Accounts Receivable - Trade","Accounts Receivable","Asset",15000.00,true
1200,"Inventory - Raw Materials","Other Current Asset","Asset",8000.00,true
2000,"Accounts Payable - Vendors","Accounts Payable","Liability",12000.00,true
3000,"Common Stock","Equity","Equity",50000.00,true
4000,"Sales Revenue","Income","Revenue",75000.00,true
5000,"Cost of Goods Sold","Expense","Expense",30000.00,true`;
}

// ============================================================================
// UNIT TESTS
// ============================================================================

describe("Data Reconciliation Engine", () => {
  let t: ConvexTestingHelper<typeof api>;
  let companyId: Id<"companies">;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = new ConvexTestingHelper(api);
    
    // Create test user
    userId = await t.mutation(api["sampleData:createSampleUser"], {});
    
    // Create test company
    const companyResult = await t.mutation(api["sampleData:createSampleCompany"], {
      userId: userId
    });
    companyId = companyResult.companyId;
    
    // Create sample accounts
    await t.mutation(api["sampleData:createSampleAccounts"], {
      companyId: companyId
    });
  });

  describe("CSV Parsing", () => {
    test("should parse CSV with headers correctly", async () => {
      const csvData = `Name,Type,Balance
Cash,Bank,1000.00
Accounts Receivable,AR,5000.00`;
      
      const result = await t.action(api["dataReconciliation:parseCSVData"], {
        csvData,
        hasHeader: true
      });
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "csv_0",
        Name: "Cash",
        Type: "Bank",
        Balance: "1000.00"
      });
    });

    test("should parse CSV without headers", async () => {
      const csvData = `Cash,Bank,1000.00
Accounts Receivable,AR,5000.00`;
      
      const result = await t.action(api["dataReconciliation:parseCSVData"], {
        csvData,
        hasHeader: false
      });
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "csv_0",
        column_0: "Cash",
        column_1: "Bank",
        column_2: "1000.00"
      });
    });

    test("should handle custom delimiters", async () => {
      const csvData = `Name|Type|Balance
Cash|Bank|1000.00`;
      
      const result = await t.action(api["dataReconciliation:parseCSVData"], {
        csvData,
        delimiter: "|",
        hasHeader: true
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].Name).toBe("Cash");
    });
  });

  describe("Chart of Accounts Reconciliation", () => {
    test("should reconcile accounts with high confidence", async () => {
      const csvData = generateFuzzyMatchCSV();
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: {
          confidenceThreshold: 0.8,
          dryRun: true
        }
      });
      
      expect(result.totalRecords).toBe(7);
      expect(result.averageConfidence).toBeGreaterThan(0.6);
      expect(result.processingTimeMs).toBeLessThan(5000); // Should process in under 5 seconds
      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.length).toBeGreaterThan(0);
    });

    test("should handle exact matches in stage 1", async () => {
      // Create CSV with exact matches to existing accounts
      const csvData = `Account ID,Account Name,Account Type,Classification,Balance,Active
1000,"Assets","Other Current Asset","Asset",100000.00,true
1110,"Cash","Bank","Asset",25000.00,true`;
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { dryRun: true }
      });
      
      // Should find exact matches
      const exactMatches = result.matches.filter(m => m.stage === 1);
      expect(exactMatches.length).toBeGreaterThan(0);
      expect(exactMatches[0].confidence).toBe(1.0);
    });

    test("should perform fuzzy matching in stage 2", async () => {
      // Create CSV with slight variations
      const csvData = `Account ID,Account Name,Account Type,Classification,Balance,Active
1000,"Asset Account","Other Current Asset","Asset",100000.00,true
1110,"Cash Account","Bank","Asset",25000.00,true`;
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { 
          confidenceThreshold: 0.7,
          dryRun: true 
        }
      });
      
      // Should find fuzzy matches
      const fuzzyMatches = result.matches.filter(m => m.stage === 2);
      expect(fuzzyMatches.length).toBeGreaterThan(0);
      expect(fuzzyMatches[0].confidence).toBeGreaterThan(0.7);
      expect(fuzzyMatches[0].fuzzyMatches).toBeDefined();
    });
  });

  describe("Transaction Reconciliation", () => {
    test("should reconcile transactions with reference numbers", async () => {
      const csvData = `Transaction ID,Date,Amount,Description,Account Name,Reference Number,Type
TXN001,2024-01-15,1000.00,"Test Transaction","Cash","REF001","Payment"
TXN002,2024-01-16,2000.00,"Another Transaction","Assets","REF002","Invoice"`;
      
      const result = await t.action(api["dataReconciliation:reconcileTransactions"], {
        companyId,
        csvData,
        options: { dryRun: true }
      });
      
      expect(result.totalRecords).toBe(2);
      expect(result.processingTimeMs).toBeLessThan(3000);
      expect(result.auditTrail).toBeDefined();
    });

    test("should handle amount-based matching", async () => {
      const csvData = generateTransactionsCSV(50);
      
      const result = await t.action(api["dataReconciliation:reconcileTransactions"], {
        companyId,
        csvData,
        options: { 
          confidenceThreshold: 0.8,
          dryRun: true 
        }
      });
      
      expect(result.totalRecords).toBe(50);
      expect(result.processingTimeMs).toBeLessThan(10000); // Should process 50 records in under 10 seconds
    });
  });

  describe("Performance Tests", () => {
    test("should process large dataset within 60 seconds", async () => {
      const csvData = generateAccountsCSV(1000); // 1000 accounts
      const startTime = Date.now();
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { dryRun: true }
      });
      
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(60000); // Under 60 seconds
      expect(result.totalRecords).toBe(1000);
      expect(result.processingTimeMs).toBeLessThan(60000);
    });

    test("should handle batch reconciliation efficiently", async () => {
      const accountsCSV = generateAccountsCSV(100);
      const transactionsCSV = generateTransactionsCSV(200);
      
      const result = await t.action(api["dataReconciliation:batchReconciliation"], {
        companyId,
        datasets: [
          {
            type: "accounts",
            csvData: accountsCSV,
            options: { confidenceThreshold: 0.8 }
          },
          {
            type: "transactions", 
            csvData: transactionsCSV,
            options: { confidenceThreshold: 0.8 }
          }
        ],
        performanceTarget: 30 // 30 seconds target
      });
      
      expect(result.totalDatasets).toBe(2);
      expect(result.totalProcessingTimeSeconds).toBeLessThan(30);
      expect(result.performanceMetrics.targetMet).toBe(true);
      expect(result.performanceMetrics.totalRecordsProcessed).toBe(300);
    });
  });

  describe("Confidence and Accuracy Tests", () => {
    test("should achieve 92.7% confidence target", async () => {
      // Create CSV with high-quality matches
      const csvData = `Account ID,Account Name,Account Type,Classification,Balance,Active
1000,"Assets","Other Current Asset","Asset",100000.00,true
1100,"Current Assets","Other Current Asset","Asset",75000.00,true
1110,"Cash","Bank","Asset",25000.00,true
1200,"Accounts Receivable","Accounts Receivable","Asset",50000.00,true
2000,"Liabilities","Other Current Liability","Liability",30000.00,true`;
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { 
          confidenceThreshold: 0.85,
          dryRun: true 
        }
      });
      
      expect(result.averageConfidence).toBeGreaterThan(0.927); // 92.7% target
      expect(result.matchedRecords / result.totalRecords).toBeGreaterThan(0.8); // 80% match rate
    });

    test("should provide detailed fuzzy match information", async () => {
      const csvData = `Account ID,Account Name,Account Type,Classification,Balance,Active
1000,"Asset Account","Other Current Asset","Asset",100000.00,true`;
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { 
          confidenceThreshold: 0.7,
          dryRun: true 
        }
      });
      
      if (result.matches.length > 0) {
        const match = result.matches[0];
        expect(match.fuzzyMatches).toBeDefined();
        expect(match.fuzzyMatches.length).toBeGreaterThan(0);
        expect(match.fuzzyMatches[0]).toHaveProperty('field');
        expect(match.fuzzyMatches[0]).toHaveProperty('score');
        expect(match.fuzzyMatches[0]).toHaveProperty('algorithm');
      }
    });
  });

  describe("Audit Trail and Logging", () => {
    test("should create comprehensive audit trail", async () => {
      const csvData = generateAccountsCSV(10);
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { dryRun: false } // Store results
      });
      
      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.length).toBeGreaterThan(5); // Multiple audit entries
      
      // Check audit entry structure
      const auditEntry = result.auditTrail[0];
      expect(auditEntry).toHaveProperty('timestamp');
      expect(auditEntry).toHaveProperty('stage');
      expect(auditEntry).toHaveProperty('action');
      expect(auditEntry).toHaveProperty('details');
    });

    test("should store reconciliation results in database", async () => {
      const csvData = generateAccountsCSV(5);
      
      await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { dryRun: false }
      });
      
      // Check if results were stored
      const history = await t.query(api["dataReconciliation:getReconciliationHistory"], {
        companyId,
        limit: 1
      });
      
      expect(history.length).toBe(1);
      expect(history[0].syncType).toBe("reconciliation");
      expect(history[0].status).toBe("completed");
    });

    test("should provide reconciliation statistics", async () => {
      // Run a few reconciliations
      const csvData = generateAccountsCSV(5);
      
      await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { dryRun: false }
      });
      
      const stats = await t.query(api["dataReconciliation:getReconciliationStats"], {
        companyId
      });
      
      expect(stats.totalReconciliations).toBeGreaterThan(0);
      expect(stats.totalRecordsProcessed).toBeGreaterThan(0);
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('matchRate');
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle empty CSV data", async () => {
      const csvData = "Account ID,Account Name\n";
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { dryRun: true }
      });
      
      expect(result.totalRecords).toBe(0);
      expect(result.matchedRecords).toBe(0);
    });

    test("should handle malformed CSV data", async () => {
      const csvData = `Account ID,Account Name
1000,"Unclosed quote
1100,Normal Account`;
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { dryRun: true }
      });
      
      // Should still process what it can
      expect(result.totalRecords).toBeGreaterThan(0);
    });

    test("should handle very low confidence thresholds", async () => {
      const csvData = generateAccountsCSV(10);
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { 
          confidenceThreshold: 0.1, // Very low threshold
          dryRun: true 
        }
      });
      
      expect(result.matchedRecords).toBeGreaterThanOrEqual(0);
      expect(result.averageConfidence).toBeGreaterThanOrEqual(0.1);
    });

    test("should handle duplicate records in CSV", async () => {
      const csvData = `Account ID,Account Name,Account Type,Classification,Balance,Active
1000,"Cash","Bank","Asset",25000.00,true
1000,"Cash","Bank","Asset",25000.00,true
1100,"Assets","Other Current Asset","Asset",100000.00,true`;
      
      const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
        companyId,
        csvData,
        options: { dryRun: true }
      });
      
      expect(result.totalRecords).toBe(3);
      // Should handle duplicates gracefully
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Reconciliation Engine Integration", () => {
  let t: ConvexTestingHelper<typeof api>;
  let companyId: Id<"companies">;
  let userId: Id<"users">;

  beforeEach(async () => {
    t = new ConvexTestingHelper(api);
    
    // Create full sample dataset
    const dataset = await t.mutation(api["sampleData:createSampleDataset"], {});
    userId = dataset.userId;
    companyId = dataset.companyId;
    
    await t.mutation(api["sampleData:createSampleAccounts"], {
      companyId: companyId
    });
  });

  test("should integrate with existing accounts table", async () => {
    // Get existing accounts
    const existingAccounts = await t.query(api["dataReconciliation:getAccountsByCompany"], {
      companyId
    });
    
    expect(existingAccounts.length).toBeGreaterThan(0);
    
    // Create CSV that should match existing accounts
    const csvData = `Account ID,Account Name,Account Type,Classification,Balance,Active
1000,"Assets","Other Current Asset","Asset",100000.00,true
1110,"Cash","Bank","Asset",25000.00,true`;
    
    const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
      companyId,
      csvData,
      options: { dryRun: true }
    });
    
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].targetRecord).toHaveProperty('_id');
  });

  test("should work end-to-end with real data flow", async () => {
    // 1. Generate realistic CSV data
    const csvData = generateAccountsCSV(50);
    
    // 2. Run reconciliation
    const reconciliationResult = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
      companyId,
      csvData,
      options: { 
        confidenceThreshold: 0.8,
        dryRun: false // Store results
      }
    });
    
    // 3. Verify results were stored
    const history = await t.query(api["dataReconciliation:getReconciliationHistory"], {
      companyId,
      limit: 1
    });
    
    expect(history.length).toBe(1);
    expect(history[0].recordsProcessed).toBe(50);
    
    // 4. Check statistics
    const stats = await t.query(api["dataReconciliation:getReconciliationStats"], {
      companyId
    });
    
    expect(stats.totalReconciliations).toBe(1);
    expect(stats.totalRecordsProcessed).toBe(50);
  });
});

// ============================================================================
// PERFORMANCE BENCHMARKS
// ============================================================================

describe("Performance Benchmarks", () => {
  let t: ConvexTestingHelper<typeof api>;
  let companyId: Id<"companies">;

  beforeEach(async () => {
    t = new ConvexTestingHelper(api);
    const dataset = await t.mutation(api["sampleData:createSampleDataset"], {});
    companyId = dataset.companyId;
    await t.mutation(api["sampleData:createSampleAccounts"], { companyId });
  });

  test("Benchmark: 100 records should process in under 5 seconds", async () => {
    const csvData = generateAccountsCSV(100);
    const startTime = Date.now();
    
    const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
      companyId,
      csvData,
      options: { dryRun: true }
    });
    
    const totalTime = Date.now() - startTime;
    
    console.log(`Processed ${result.totalRecords} records in ${totalTime}ms`);
    console.log(`Average confidence: ${result.averageConfidence.toFixed(3)}`);
    console.log(`Match rate: ${(result.matchedRecords / result.totalRecords * 100).toFixed(1)}%`);
    
    expect(totalTime).toBeLessThan(5000);
    expect(result.averageConfidence).toBeGreaterThan(0.6);
  });

  test("Benchmark: 1000 records should process in under 60 seconds", async () => {
    const csvData = generateAccountsCSV(1000);
    const startTime = Date.now();
    
    const result = await t.action(api["dataReconciliation:reconcileChartOfAccounts"], {
      companyId,
      csvData,
      options: { dryRun: true }
    });
    
    const totalTime = Date.now() - startTime;
    
    console.log(`Processed ${result.totalRecords} records in ${totalTime}ms`);
    console.log(`Records per second: ${(result.totalRecords / (totalTime / 1000)).toFixed(1)}`);
    
    expect(totalTime).toBeLessThan(60000);
    expect(result.totalRecords).toBe(1000);
  });
});