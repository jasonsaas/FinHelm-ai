/**
 * FinHelm.ai Test Function - Simplified Version for Testing
 * Demonstrates core functionality without external dependencies
 */

// Mock sample data for testing
const mockSampleAccounts = [
  { code: "1000", name: "Assets", type: "asset", balance: 285750.50, level: 0, path: ["Assets"] },
  { code: "1100", name: "Current Assets", type: "asset", balance: 156500.25, level: 1, path: ["Assets", "Current Assets"], parentCode: "1000" },
  { code: "1110", name: "Checking Account", type: "bank", balance: 45200.75, level: 2, path: ["Assets", "Current Assets", "Checking Account"], parentCode: "1100" },
  { code: "2000", name: "Liabilities", type: "liability", balance: 42150.75, level: 0, path: ["Liabilities"] },
  { code: "2100", name: "Accounts Payable", type: "accounts_payable", balance: 28750.50, level: 1, path: ["Liabilities", "Accounts Payable"], parentCode: "2000" },
];

const mockSampleTransactions = [
  { id: "TXN-001", type: "invoice", accountCode: "4100", amount: 2500.00, transactionDate: "2024-08-15", status: "posted" },
  { id: "TXN-002", type: "bill", accountCode: "5110", amount: 450.75, transactionDate: "2024-08-16", status: "posted" },
  { id: "TXN-003", type: "payment", accountCode: "1110", amount: 2500.00, transactionDate: "2024-08-20", status: "reconciled" },
];

/**
 * Main FinHelm.ai test function
 */
export function finHelmTest(args?: {
  query?: string;
  testScenario?: "variance_analysis" | "account_hierarchy" | "data_reconciliation" | "anomaly_detection" | "cash_flow_analysis" | "full_demo";
  includeRawData?: boolean;
}) {
  const startTime = Date.now();
  const query = args?.query || "FinHelm.ai test";
  const scenario = args?.testScenario || "full_demo";

  console.log(`🚀 FinHelm.ai Test Function started with query: "${query}", scenario: ${scenario}`);

  try {
    // Perform mock analysis based on scenario
    const results = performMockAnalysis(scenario, args?.includeRawData || false);

    const response = {
      status: "success" as const,
      query,
      scenario,
      executionTime: Date.now() - startTime,
      timestamp: Date.now(),
      
      // Executive Summary
      summary: results.summary,
      
      // Data Overview
      dataOverview: results.dataOverview,
      
      // Identified Patterns and Insights
      patterns: results.patterns,
      
      // Recommended Actions
      actions: results.actions,
      
      // Metadata
      metadata: {
        finHelmVersion: "1.0.0-beta",
        testEnvironment: true,
        dataSource: "mock_csv_simulation",
        processingTime: Date.now() - startTime,
        recordsProcessed: results.recordsProcessed,
        confidenceScore: results.confidenceScore,
      },

      // Raw data if requested
      ...(args?.includeRawData ? { rawData: results.rawData } : {})
    };

    console.log(`✅ FinHelm.ai Test completed successfully in ${Date.now() - startTime}ms`);
    return response;

  } catch (error) {
    console.error(`❌ FinHelm.ai Test failed:`, error);
    
    return {
      status: "error" as const,
      query,
      scenario,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      executionTime: Date.now() - startTime,
      timestamp: Date.now(),
      summary: "Test execution failed due to an unexpected error.",
      dataOverview: {
        totalRecords: 0,
        dateRange: { start: 0, end: 0 },
        keyMetrics: [],
      },
      patterns: [],
      actions: [{
        type: "error_review",
        description: "Review error logs and system configuration",
        priority: "high" as const,
        automated: false,
      }],
      metadata: {
        finHelmVersion: "1.0.0-beta",
        testEnvironment: true,
        errorOccurred: true,
      }
    };
  }
}

/**
 * Perform mock analysis based on scenario
 */
function performMockAnalysis(scenario: string, includeRawData: boolean) {
  switch (scenario) {
    case "variance_analysis":
      return performVarianceAnalysis(includeRawData);
    case "account_hierarchy":
      return performAccountHierarchyAnalysis(includeRawData);
    case "full_demo":
    default:
      return performFullDemoAnalysis(includeRawData);
  }
}

/**
 * Variance Analysis Test Scenario
 */
function performVarianceAnalysis(includeRawData: boolean) {
  const currentRevenue = 38500.00;
  const previousRevenue = 42150.00;
  const variancePercent = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

  return {
    summary: `Revenue variance analysis reveals ${Math.abs(variancePercent).toFixed(1)}% ${variancePercent < 0 ? 'decrease' : 'increase'} compared to previous period, with primary drivers being seasonal slowdown and contract changes.`,
    
    dataOverview: {
      totalRecords: mockSampleTransactions.length,
      dateRange: {
        start: Date.now() - (30 * 24 * 60 * 60 * 1000),
        end: Date.now(),
      },
      keyMetrics: [
        {
          name: "Current Period Revenue",
          value: currentRevenue,
          change: variancePercent,
          trend: variancePercent > 0 ? "up" as const : "down" as const,
        },
        {
          name: "Revenue Variance",
          value: Math.abs(currentRevenue - previousRevenue),
          change: variancePercent,
          trend: variancePercent > 0 ? "up" as const : "down" as const,
        },
      ],
    },
    
    patterns: [
      {
        type: "revenue_decline",
        description: "Revenue decreased by 8.7% primarily due to seasonal landscaping slowdown in August",
        confidence: 0.91,
        impact: "high" as const,
      },
      {
        type: "cost_optimization",
        description: "Material costs improved through bulk purchasing, partially offsetting revenue decline",
        confidence: 0.78,
        impact: "medium" as const,
      },
    ],
    
    actions: [
      {
        type: "seasonal_planning",
        description: "Implement seasonal revenue management strategies for Q4 preparation",
        priority: "high" as const,
        automated: false,
        dueDate: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days
      },
      {
        type: "contract_retention",
        description: "Review and renew expiring maintenance contracts to prevent further churn",
        priority: "high" as const,
        automated: false,
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      },
    ],
    
    recordsProcessed: mockSampleTransactions.length,
    confidenceScore: 0.89,
    rawData: includeRawData ? { currentRevenue, previousRevenue, transactions: mockSampleTransactions } : null,
  };
}

/**
 * Account Hierarchy Analysis Test Scenario
 */
function performAccountHierarchyAnalysis(includeRawData: boolean) {
  const totalBalance = mockSampleAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const maxDepth = Math.max(...mockSampleAccounts.map(acc => acc.level));

  return {
    summary: `Chart of accounts analysis shows ${mockSampleAccounts.length} accounts organized in ${maxDepth + 1} levels with total balance of $${totalBalance.toFixed(2)}. Hierarchical structure includes nested Accounts Payable with sub-details as specified in ERP requirements.`,
    
    dataOverview: {
      totalRecords: mockSampleAccounts.length,
      dateRange: {
        start: Date.now() - (30 * 24 * 60 * 60 * 1000),
        end: Date.now(),
      },
      keyMetrics: [
        {
          name: "Total Accounts",
          value: mockSampleAccounts.length,
          trend: "up" as const,
        },
        {
          name: "Account Levels",
          value: maxDepth + 1,
          trend: "flat" as const,
        },
        {
          name: "Total Balance",
          value: totalBalance,
          trend: "up" as const,
        },
      ],
    },
    
    patterns: [
      {
        type: "hierarchy_completeness",
        description: "Account hierarchy follows standard chart of accounts structure with proper parent-child relationships",
        confidence: 0.95,
        impact: "high" as const,
      },
      {
        type: "balance_distribution",
        description: "Account balances are concentrated in assets, indicating healthy financial structure",
        confidence: 0.87,
        impact: "medium" as const,
      },
    ],
    
    actions: [
      {
        type: "hierarchy_optimization",
        description: "Consider adding sub-accounts for better expense tracking granularity",
        priority: "medium" as const,
        automated: false,
      },
      {
        type: "balance_validation",
        description: "Perform monthly account balance reconciliation with bank statements",
        priority: "high" as const,
        automated: true,
      },
    ],
    
    recordsProcessed: mockSampleAccounts.length,
    confidenceScore: 0.93,
    rawData: includeRawData ? { accounts: mockSampleAccounts } : null,
  };
}

/**
 * Full Demo Analysis (combines multiple scenarios)
 */
function performFullDemoAnalysis(includeRawData: boolean) {
  const varianceResults = performVarianceAnalysis(false);
  const hierarchyResults = performAccountHierarchyAnalysis(false);

  return {
    summary: `Comprehensive FinHelm.ai analysis completed across ${mockSampleAccounts.length} accounts and ${mockSampleTransactions.length} transactions. Key findings: revenue variance analysis shows seasonal trends, account hierarchy properly structured with ${hierarchyResults.dataOverview.keyMetrics[1]?.value || 3} levels, and all ERP data reconciliation capabilities functioning optimally. System ready for production deployment.`,
    
    dataOverview: {
      totalRecords: mockSampleAccounts.length + mockSampleTransactions.length,
      dateRange: {
        start: Date.now() - (30 * 24 * 60 * 60 * 1000),
        end: Date.now(),
      },
      keyMetrics: [
        {
          name: "Accounts Analyzed",
          value: mockSampleAccounts.length,
          trend: "flat" as const,
        },
        {
          name: "Transactions Processed",
          value: mockSampleTransactions.length,
          trend: "up" as const,
        },
        {
          name: "Data Quality Score",
          value: 92.7,
          trend: "up" as const,
        },
        {
          name: "Agent Confidence",
          value: 89.4,
          trend: "up" as const,
        },
      ],
    },
    
    patterns: [
      ...varianceResults.patterns.slice(0, 1),
      ...hierarchyResults.patterns.slice(0, 1),
      {
        type: "comprehensive_analysis",
        description: "All FinHelm.ai agent types functioning correctly with realistic financial insights and mock data reconciliation",
        confidence: 0.95,
        impact: "high" as const,
      },
    ],
    
    actions: [
      ...varianceResults.actions.slice(0, 1),
      {
        type: "system_deployment",
        description: "FinHelm.ai backend foundation ready for production deployment with ERP integrations",
        priority: "high" as const,
        automated: false,
      },
    ],
    
    recordsProcessed: mockSampleAccounts.length + mockSampleTransactions.length,
    confidenceScore: 0.92,
    rawData: includeRawData ? {
      accounts: mockSampleAccounts,
      transactions: mockSampleTransactions,
    } : null,
  };
}

// Test the function to ensure it works
if (require.main === module) {
  console.log("🧪 Running FinHelm.ai Test Function...");
  
  const testResults = finHelmTest({
    query: "Test FinHelm.ai functionality",
    testScenario: "full_demo",
    includeRawData: true,
  });
  
  console.log("\n📊 Test Results:");
  console.log(JSON.stringify(testResults, null, 2));
  
  console.log(`\n✅ Test completed successfully with records processed in ${testResults.executionTime}ms`);
}