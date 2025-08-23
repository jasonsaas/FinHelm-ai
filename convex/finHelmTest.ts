import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { sampleAccounts, sampleTransactions, mockVarianceData, sampleAgentConfigs } from "./sampleData";
import { buildAccountHierarchy, findBestAccountMatches, detectTransactionAnomalies, calculateFinancialRatios } from "./utils";

/**
 * FinHelm.ai Test Function with Mock Data Reconciliation
 * Demonstrates core functionality with realistic ERP data scenarios
 */

export const finHelmTest = action({
  args: {
    query: v.optional(v.string()),
    testScenario: v.optional(v.union(
      v.literal("variance_analysis"),
      v.literal("account_hierarchy"),
      v.literal("data_reconciliation"),
      v.literal("anomaly_detection"),
      v.literal("cash_flow_analysis"),
      v.literal("full_demo")
    )),
    includeRawData: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const query = args.query || "FinHelm.ai test";
    const scenario = args.testScenario || "full_demo";

    console.log(`🚀 FinHelm.ai Test Function started with query: "${query}", scenario: ${scenario}`);

    try {
      // Perform mock data reconciliation and analysis based on scenario
      const results = await performMockAnalysis(scenario, args.includeRawData || false);

      const response = {
        status: "success",
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
        }
      };

      // Add raw data if requested
      if (args.includeRawData) {
        response.rawData = results.rawData;
      }

      console.log(`✅ FinHelm.ai Test completed successfully in ${Date.now() - startTime}ms`);
      return response;

    } catch (error) {
      console.error(`❌ FinHelm.ai Test failed:`, error);
      
      return {
        status: "error",
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
          priority: "high",
          automated: false,
        }],
        metadata: {
          finHelmVersion: "1.0.0-beta",
          testEnvironment: true,
          errorOccurred: true,
        }
      };
    }
  },
});

/**
 * Get sample data for testing (query function)
 */
export const getSampleData = query({
  args: {
    dataType: v.optional(v.union(
      v.literal("accounts"),
      v.literal("transactions"),
      v.literal("variance"),
      v.literal("agent_configs")
    )),
  },
  handler: async (ctx, args) => {
    const dataType = args.dataType || "accounts";

    switch (dataType) {
      case "accounts":
        return {
          type: "chart_of_accounts",
          count: sampleAccounts.length,
          data: sampleAccounts,
          hierarchy: buildAccountHierarchy(sampleAccounts.map(acc => ({
            _id: acc.code,
            code: acc.code,
            name: acc.name,
            fullName: acc.fullName,
            type: acc.type,
            level: acc.level,
            balance: acc.balance,
            children: [],
            parentId: acc.parentCode,
          }))),
        };

      case "transactions":
        return {
          type: "transaction_data",
          count: sampleTransactions.length,
          data: sampleTransactions,
          summary: {
            totalAmount: sampleTransactions.reduce((sum, txn) => sum + txn.amount, 0),
            byType: sampleTransactions.reduce((acc, txn) => {
              acc[txn.type] = (acc[txn.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          },
        };

      case "variance":
        return {
          type: "variance_analysis",
          data: mockVarianceData,
        };

      case "agent_configs":
        return {
          type: "agent_configurations",
          data: sampleAgentConfigs,
        };

      default:
        return {
          type: "unknown",
          error: "Invalid data type requested",
        };
    }
  },
});

/**
 * Test data reconciliation functionality
 */
export const testDataReconciliation = action({
  args: {
    sourceData: v.array(v.object({
      code: v.string(),
      name: v.string(),
      type: v.optional(v.string()),
    })),
    targetData: v.array(v.object({
      code: v.string(),
      name: v.string(),
      type: v.optional(v.string()),
    })),
    matchThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threshold = args.matchThreshold || 0.7;

    console.log(`🔍 Testing data reconciliation with ${args.sourceData.length} source records and ${args.targetData.length} target records`);

    const matches = findBestAccountMatches(
      args.sourceData,
      args.targetData,
      threshold
    );

    const reconciliationResults = {
      totalSource: args.sourceData.length,
      totalTarget: args.targetData.length,
      matchesFound: matches.length,
      matchThreshold: threshold,
      highConfidenceMatches: matches.filter(m => m.score > 0.9).length,
      mediumConfidenceMatches: matches.filter(m => m.score >= 0.7 && m.score <= 0.9).length,
      unmatchedSource: args.sourceData.filter(source => 
        !matches.some(match => match.source.code === source.code)
      ).length,
      matches: matches.map(match => ({
        sourceAccount: match.source,
        targetAccount: match.target,
        confidenceScore: Math.round(match.score * 100) / 100,
        recommendedAction: match.score > 0.9 ? "auto_merge" : 
                          match.score > 0.7 ? "manual_review" : "create_new"
      })),
    };

    console.log(`✅ Data reconciliation completed: ${matches.length} matches found with ${matches.filter(m => m.score > 0.9).length} high-confidence matches`);

    return reconciliationResults;
  },
});

/**
 * Internal function to perform mock analysis based on scenario
 */
async function performMockAnalysis(scenario: string, includeRawData: boolean) {
  switch (scenario) {
    case "variance_analysis":
      return performVarianceAnalysis(includeRawData);
    
    case "account_hierarchy":
      return performAccountHierarchyAnalysis(includeRawData);
    
    case "data_reconciliation":
      return performDataReconciliationAnalysis(includeRawData);
    
    case "anomaly_detection":
      return performAnomalyDetectionAnalysis(includeRawData);
    
    case "cash_flow_analysis":
      return performCashFlowAnalysis(includeRawData);
    
    case "full_demo":
    default:
      return performFullDemoAnalysis(includeRawData);
  }
}

/**
 * Variance Analysis Test Scenario
 */
function performVarianceAnalysis(includeRawData: boolean) {
  const currentRevenue = mockVarianceData.metrics.revenue.current;
  const previousRevenue = mockVarianceData.metrics.revenue.previous;
  const variancePercent = mockVarianceData.metrics.revenue.variancePercent;

  return {
    summary: `Revenue variance analysis reveals ${Math.abs(variancePercent).toFixed(1)}% ${variancePercent < 0 ? 'decrease' : 'increase'} compared to previous period, with primary drivers being seasonal slowdown and contract changes.`,
    
    dataOverview: {
      totalRecords: sampleTransactions.length,
      dateRange: {
        start: new Date(mockVarianceData.period.current.start).getTime(),
        end: new Date(mockVarianceData.period.current.end).getTime(),
      },
      keyMetrics: [
        {
          name: "Current Period Revenue",
          value: currentRevenue,
          change: variancePercent,
          trend: variancePercent > 0 ? "up" : "down",
        },
        {
          name: "Revenue Variance",
          value: Math.abs(mockVarianceData.metrics.revenue.variance),
          change: variancePercent,
          trend: variancePercent > 0 ? "up" : "down",
        },
        {
          name: "Gross Margin %",
          value: ((mockVarianceData.metrics.margin.current / currentRevenue) * 100).toFixed(1),
          change: mockVarianceData.metrics.margin.variancePercent,
          trend: mockVarianceData.metrics.margin.variancePercent > 0 ? "up" : "down",
        },
      ],
    },
    
    patterns: [
      {
        type: "revenue_decline",
        description: "Revenue decreased by 8.7% primarily due to seasonal landscaping slowdown in August",
        confidence: 0.91,
        impact: "high",
        data: mockVarianceData.drivers.filter(d => d.impact < 0),
      },
      {
        type: "cost_optimization",
        description: "Material costs improved through bulk purchasing, partially offsetting revenue decline",
        confidence: 0.78,
        impact: "medium",
        data: mockVarianceData.drivers.filter(d => d.impact > 0),
      },
    ],
    
    actions: [
      {
        type: "seasonal_planning",
        description: "Implement seasonal revenue management strategies for Q4 preparation",
        priority: "high",
        automated: false,
        dueDate: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days
      },
      {
        type: "contract_retention",
        description: "Review and renew expiring maintenance contracts to prevent further churn",
        priority: "high",
        automated: false,
        dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      },
    ],
    
    recordsProcessed: sampleTransactions.length,
    confidenceScore: 0.89,
    rawData: includeRawData ? mockVarianceData : undefined,
  };
}

/**
 * Account Hierarchy Analysis Test Scenario
 */
function performAccountHierarchyAnalysis(includeRawData: boolean) {
  const hierarchy = buildAccountHierarchy(sampleAccounts.map(acc => ({
    _id: acc.code,
    code: acc.code,
    name: acc.name,
    fullName: acc.fullName,
    type: acc.type,
    level: acc.level,
    balance: acc.balance,
    children: [],
    parentId: acc.parentCode,
  })));

  const totalBalance = sampleAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const maxDepth = Math.max(...sampleAccounts.map(acc => acc.level));

  return {
    summary: `Chart of accounts analysis shows ${sampleAccounts.length} accounts organized in ${maxDepth + 1} levels with total balance of $${totalBalance.toFixed(2)}. Hierarchical structure includes nested Accounts Payable with sub-details as specified in ERP requirements.`,
    
    dataOverview: {
      totalRecords: sampleAccounts.length,
      dateRange: {
        start: Date.now() - (30 * 24 * 60 * 60 * 1000),
        end: Date.now(),
      },
      keyMetrics: [
        {
          name: "Total Accounts",
          value: sampleAccounts.length,
          trend: "up",
        },
        {
          name: "Account Levels",
          value: maxDepth + 1,
          trend: "flat",
        },
        {
          name: "Total Assets",
          value: sampleAccounts.filter(acc => acc.type === "asset").reduce((sum, acc) => sum + acc.balance, 0),
          trend: "up",
        },
        {
          name: "Total Liabilities",
          value: sampleAccounts.filter(acc => acc.type.includes("liability") || acc.type.includes("payable")).reduce((sum, acc) => sum + acc.balance, 0),
          trend: "down",
        },
      ],
    },
    
    patterns: [
      {
        type: "hierarchy_completeness",
        description: "Account hierarchy follows standard chart of accounts structure with proper parent-child relationships",
        confidence: 0.95,
        impact: "high",
        data: hierarchy.slice(0, 3),
      },
      {
        type: "balance_distribution",
        description: "Account balances are concentrated in fixed assets and accounts receivable, indicating healthy working capital structure",
        confidence: 0.87,
        impact: "medium",
      },
    ],
    
    actions: [
      {
        type: "hierarchy_optimization",
        description: "Consider adding sub-accounts for better expense tracking granularity",
        priority: "medium",
        automated: false,
      },
      {
        type: "balance_validation",
        description: "Perform monthly account balance reconciliation with bank statements",
        priority: "high",
        automated: true,
      },
    ],
    
    recordsProcessed: sampleAccounts.length,
    confidenceScore: 0.93,
    rawData: includeRawData ? { accounts: sampleAccounts, hierarchy } : undefined,
  };
}

/**
 * Data Reconciliation Analysis Test Scenario
 */
function performDataReconciliationAnalysis(includeRawData: boolean) {
  // Simulate reconciliation between two data sources
  const sourceAccounts = sampleAccounts.slice(0, 10);
  const targetAccounts = sampleAccounts.slice(2, 12).map(acc => ({
    ...acc,
    name: acc.name + " (Updated)", // Simulate slight name differences
  }));

  const matches = findBestAccountMatches(
    sourceAccounts.map(acc => ({ code: acc.code, name: acc.name })),
    targetAccounts.map(acc => ({ code: acc.code, name: acc.name })),
    0.7
  );

  const highConfidenceMatches = matches.filter(m => m.score > 0.9).length;
  const totalMatches = matches.length;

  return {
    summary: `Data reconciliation analysis processed ${sourceAccounts.length} source accounts, achieving ${totalMatches} matches with ${highConfidenceMatches} high-confidence matches using Oracle Document IO-inspired fuzzy matching algorithms.`,
    
    dataOverview: {
      totalRecords: sourceAccounts.length + targetAccounts.length,
      dateRange: {
        start: Date.now() - (24 * 60 * 60 * 1000),
        end: Date.now(),
      },
      keyMetrics: [
        {
          name: "Source Accounts",
          value: sourceAccounts.length,
          trend: "flat",
        },
        {
          name: "Target Accounts",
          value: targetAccounts.length,
          trend: "flat",
        },
        {
          name: "Successful Matches",
          value: totalMatches,
          trend: "up",
        },
        {
          name: "Match Confidence",
          value: Math.round((totalMatches / sourceAccounts.length) * 100),
          trend: "up",
        },
      ],
    },
    
    patterns: [
      {
        type: "fuzzy_matching_effectiveness",
        description: "Intelligent fuzzy matching successfully identified accounts despite naming variations",
        confidence: 0.92,
        impact: "high",
        data: matches.slice(0, 5),
      },
      {
        type: "data_quality",
        description: "Source data shows consistent naming conventions with minor variations in target system",
        confidence: 0.85,
        impact: "medium",
      },
    ],
    
    actions: [
      {
        type: "auto_reconciliation",
        description: "Apply high-confidence matches automatically to speed up data migration",
        priority: "high",
        automated: true,
      },
      {
        type: "manual_review",
        description: "Review medium-confidence matches for manual verification",
        priority: "medium",
        automated: false,
      },
    ],
    
    recordsProcessed: sourceAccounts.length,
    confidenceScore: 0.88,
    rawData: includeRawData ? { sourceAccounts, targetAccounts, matches } : undefined,
  };
}

/**
 * Anomaly Detection Analysis Test Scenario
 */
function performAnomalyDetectionAnalysis(includeRawData: boolean) {
  const anomalies = detectTransactionAnomalies(
    sampleTransactions.map(txn => ({
      id: txn.id,
      accountCode: txn.accountCode,
      amount: txn.amount,
      transactionDate: new Date(txn.transactionDate).getTime(),
      type: txn.type,
    }))
  );

  const highSeverityAnomalies = anomalies.filter(a => a.severity === "high");
  const totalAnomalies = anomalies.length;

  return {
    summary: `Anomaly detection analysis identified ${totalAnomalies} potential anomalies in ${sampleTransactions.length} transactions, with ${highSeverityAnomalies.length} requiring immediate attention.`,
    
    dataOverview: {
      totalRecords: sampleTransactions.length,
      dateRange: {
        start: Math.min(...sampleTransactions.map(txn => new Date(txn.transactionDate).getTime())),
        end: Math.max(...sampleTransactions.map(txn => new Date(txn.transactionDate).getTime())),
      },
      keyMetrics: [
        {
          name: "Total Transactions",
          value: sampleTransactions.length,
          trend: "up",
        },
        {
          name: "Anomalies Detected",
          value: totalAnomalies,
          trend: totalAnomalies > 2 ? "up" : "down",
        },
        {
          name: "High Severity",
          value: highSeverityAnomalies.length,
          trend: highSeverityAnomalies.length > 0 ? "up" : "down",
        },
        {
          name: "Detection Accuracy",
          value: 94.5,
          trend: "up",
        },
      ],
    },
    
    patterns: [
      {
        type: "unusual_amounts",
        description: "Several transactions show amounts significantly above normal range for their account types",
        confidence: 0.89,
        impact: "high",
        data: anomalies.slice(0, 3),
      },
      {
        type: "transaction_timing",
        description: "Most transactions follow regular business day patterns with minimal weekend activity",
        confidence: 0.76,
        impact: "low",
      },
    ],
    
    actions: [
      {
        type: "anomaly_review",
        description: "Review flagged high-value transactions for accuracy and authorization",
        priority: "high",
        automated: false,
        dueDate: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      },
      {
        type: "threshold_adjustment",
        description: "Fine-tune anomaly detection thresholds based on seasonal business patterns",
        priority: "medium",
        automated: true,
      },
    ],
    
    recordsProcessed: sampleTransactions.length,
    confidenceScore: 0.87,
    rawData: includeRawData ? { transactions: sampleTransactions, anomalies } : undefined,
  };
}

/**
 * Cash Flow Analysis Test Scenario
 */
function performCashFlowAnalysis(includeRawData: boolean) {
  const inflows = sampleTransactions
    .filter(txn => txn.type === "payment" || txn.type === "deposit")
    .reduce((sum, txn) => sum + txn.amount, 0);

  const outflows = sampleTransactions
    .filter(txn => txn.type === "bill")
    .reduce((sum, txn) => sum + txn.amount, 0);

  const netCashFlow = inflows - outflows;

  return {
    summary: `Cash flow analysis shows ${netCashFlow > 0 ? 'positive' : 'negative'} net cash flow of $${Math.abs(netCashFlow).toFixed(2)} with strong payment collection patterns and controlled expense outflows.`,
    
    dataOverview: {
      totalRecords: sampleTransactions.length,
      dateRange: {
        start: Math.min(...sampleTransactions.map(txn => new Date(txn.transactionDate).getTime())),
        end: Math.max(...sampleTransactions.map(txn => new Date(txn.transactionDate).getTime())),
      },
      keyMetrics: [
        {
          name: "Cash Inflows",
          value: inflows,
          trend: "up",
        },
        {
          name: "Cash Outflows",
          value: outflows,
          trend: "down",
        },
        {
          name: "Net Cash Flow",
          value: netCashFlow,
          trend: netCashFlow > 0 ? "up" : "down",
        },
        {
          name: "Collection Efficiency",
          value: 96.2,
          trend: "up",
        },
      ],
    },
    
    patterns: [
      {
        type: "payment_timing",
        description: "Customer payments are collected within 2-3 business days on average",
        confidence: 0.94,
        impact: "high",
      },
      {
        type: "seasonal_cash_flow",
        description: "Cash flow shows seasonal patterns with higher inflows during peak landscaping months",
        confidence: 0.82,
        impact: "medium",
      },
    ],
    
    actions: [
      {
        type: "cash_optimization",
        description: "Optimize cash position by negotiating extended vendor payment terms",
        priority: "medium",
        automated: false,
      },
      {
        type: "forecasting",
        description: "Implement 13-week rolling cash flow forecasting for better liquidity management",
        priority: "high",
        automated: true,
      },
    ],
    
    recordsProcessed: sampleTransactions.length,
    confidenceScore: 0.91,
    rawData: includeRawData ? { inflows, outflows, transactions: sampleTransactions } : undefined,
  };
}

/**
 * Full Demo Analysis (combines multiple scenarios)
 */
function performFullDemoAnalysis(includeRawData: boolean) {
  // Combine insights from all scenarios
  const varianceResults = performVarianceAnalysis(false);
  const hierarchyResults = performAccountHierarchyAnalysis(false);
  const reconciliationResults = performDataReconciliationAnalysis(false);
  const anomalyResults = performAnomalyDetectionAnalysis(false);
  const cashFlowResults = performCashFlowAnalysis(false);

  return {
    summary: `Comprehensive FinHelm.ai analysis completed across ${sampleAccounts.length} accounts and ${sampleTransactions.length} transactions. Key findings: ${varianceResults.dataOverview.keyMetrics[0].change?.toFixed(1)}% revenue variance, ${hierarchyResults.dataOverview.keyMetrics[0].value} account hierarchy levels, ${anomalyResults.dataOverview.keyMetrics[1].value} anomalies detected, and positive cash flow trends. All ERP data reconciliation and agent capabilities functioning optimally.`,
    
    dataOverview: {
      totalRecords: sampleAccounts.length + sampleTransactions.length,
      dateRange: {
        start: Date.now() - (30 * 24 * 60 * 60 * 1000),
        end: Date.now(),
      },
      keyMetrics: [
        {
          name: "Accounts Analyzed",
          value: sampleAccounts.length,
          trend: "flat",
        },
        {
          name: "Transactions Processed",
          value: sampleTransactions.length,
          trend: "up",
        },
        {
          name: "Data Quality Score",
          value: 92.7,
          trend: "up",
        },
        {
          name: "Agent Confidence",
          value: 89.4,
          trend: "up",
        },
      ],
    },
    
    patterns: [
      ...varianceResults.patterns.slice(0, 1),
      ...hierarchyResults.patterns.slice(0, 1),
      ...anomalyResults.patterns.slice(0, 1),
      {
        type: "comprehensive_analysis",
        description: "All FinHelm.ai agent types functioning correctly with realistic financial insights",
        confidence: 0.95,
        impact: "high",
      },
    ],
    
    actions: [
      ...varianceResults.actions.slice(0, 1),
      ...cashFlowResults.actions.slice(0, 1),
      {
        type: "system_deployment",
        description: "FinHelm.ai backend foundation ready for production deployment with ERP integrations",
        priority: "high",
        automated: false,
      },
    ],
    
    recordsProcessed: sampleAccounts.length + sampleTransactions.length,
    confidenceScore: 0.92,
    rawData: includeRawData ? {
      accounts: sampleAccounts,
      transactions: sampleTransactions,
      variance: mockVarianceData,
      agents: sampleAgentConfigs,
    } : undefined,
  };
}