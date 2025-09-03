import { v } from "convex/values";
import { action, query } from "../_generated/server";
import { api } from "../_generated/api";
import { calculateFinancialRatios, getDateRange } from "../utils";

/**
 * Enhanced AI Financial Analyst with GPT-4 Integration
 * Provides advanced financial insights, cash flow analysis, and predictive analytics
 */

// Type definitions for analysis results
export interface FinancialInsight {
  type: 'cash_flow' | 'anomaly' | 'vendor_optimization' | 'revenue_recognition';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionRequired: boolean;
  recommendations: string[];
  data: any;
}

export interface CashFlowAnalysis {
  currentCashPosition: number;
  projectedCashFlow: number[];
  cashRunwayMonths: number;
  burnRate: number;
  seasonalAdjustments: number[];
  riskFactors: string[];
  recommendations: string[];
}

export interface AnomalyDetection {
  anomalies: Array<{
    transactionId: string;
    type: 'spending' | 'revenue' | 'timing' | 'pattern';
    severity: 'high' | 'medium' | 'low';
    description: string;
    expectedValue: number;
    actualValue: number;
    deviation: number;
    flaggedAt: number;
  }>;
  totalAnomalies: number;
  highSeverityCount: number;
}

// GPT-4 Integration for Financial Analysis
export const analyzeFinancialData = action({
  args: {
    organizationId: v.id("organizations"),
    analysisType: v.union(
      v.literal("cash_flow"),
      v.literal("anomaly_detection"),
      v.literal("vendor_optimization"),
      v.literal("revenue_recognition")
    ),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
    parameters: v.optional(v.object({
      includeProjections: v.optional(v.boolean()),
      sensitivityAnalysis: v.optional(v.boolean()),
      benchmarkComparison: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    console.log(`Starting financial analysis: ${args.analysisType} for org ${args.organizationId}`);
    
    const dateRange = args.dateRange || getDateRange("quarter", 0);
    
    // Get financial data from database
    const transactions = await ctx.runQuery(api.transactionActions.getTransactionsByOrg, {
      organizationId: args.organizationId,
      dateRange,
    });
    
    const accounts = await ctx.runQuery(api.accountActions.getAccountHierarchy, {
      organizationId: args.organizationId,
    });
    
    // Process analysis based on type
    let insights: FinancialInsight[];
    
    switch (args.analysisType) {
      case "cash_flow":
        insights = await performCashFlowAnalysis(ctx, {
          organizationId: args.organizationId,
          transactions,
          accounts,
          dateRange,
          parameters: args.parameters,
        });
        break;
        
      case "anomaly_detection":
        insights = await performAnomalyDetection(ctx, {
          organizationId: args.organizationId,
          transactions,
          dateRange,
        });
        break;
        
      case "vendor_optimization":
        insights = await performVendorOptimization(ctx, {
          organizationId: args.organizationId,
          transactions,
          dateRange,
        });
        break;
        
      case "revenue_recognition":
        insights = await performRevenueRecognitionAnalysis(ctx, {
          organizationId: args.organizationId,
          transactions,
          accounts,
          dateRange,
        });
        break;
        
      default:
        throw new Error(`Unknown analysis type: ${args.analysisType}`);
    }
    
    console.log(`Financial analysis completed: ${insights.length} insights generated`);
    return {
      analysisType: args.analysisType,
      dateRange,
      insights,
      generatedAt: Date.now(),
    };
  },
});

// Cash Flow Analysis with GPT-4 Enhanced Insights
async function performCashFlowAnalysis(
  ctx: any,
  params: {
    organizationId: string;
    transactions: any[];
    accounts: any[];
    dateRange: { start: number; end: number };
    parameters?: any;
  }
): Promise<FinancialInsight[]> {
  
  // Calculate current cash position
  const cashAccounts = params.accounts.filter(acc => 
    acc.type === 'bank' || acc.type === 'cash' || acc.name.toLowerCase().includes('cash')
  );
  
  const currentCashPosition = cashAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  
  // Calculate historical cash flow patterns
  const cashFlowHistory = calculateHistoricalCashFlow(params.transactions, params.dateRange);
  
  // Generate GPT-4 enhanced insights
  const gptPrompt = generateCashFlowPrompt(currentCashPosition, cashFlowHistory, params.accounts);
  const gptInsights = await callGPT4ForAnalysis(gptPrompt, "cash_flow_analysis");
  
  // Calculate projections and risk factors
  const projections = calculateCashFlowProjections(cashFlowHistory);
  const burnRate = calculateBurnRate(params.transactions);
  const cashRunway = currentCashPosition > 0 ? currentCashPosition / Math.abs(burnRate) : 0;
  
  const insights: FinancialInsight[] = [
    {
      type: 'cash_flow',
      title: 'Cash Flow Analysis',
      description: `Current cash position: $${currentCashPosition.toLocaleString()}. ${cashRunway < 6 ? 'CRITICAL: ' : ''}Cash runway: ${cashRunway.toFixed(1)} months`,
      confidence: 0.92,
      impact: cashRunway < 6 ? 'high' : cashRunway < 12 ? 'medium' : 'low',
      actionRequired: cashRunway < 6,
      recommendations: [
        ...gptInsights.recommendations,
        ...(cashRunway < 6 ? [
          "Immediate cash conservation measures recommended",
          "Accelerate collections and delay non-critical payments",
          "Consider emergency funding options"
        ] : []),
      ],
      data: {
        currentCashPosition,
        cashRunway,
        burnRate,
        projections,
        seasonalFactors: gptInsights.seasonalFactors || [],
      }
    }
  ];
  
  // Add anomaly insights if cash flow shows irregularities
  if (gptInsights.anomalies && gptInsights.anomalies.length > 0) {
    insights.push({
      type: 'anomaly',
      title: 'Cash Flow Anomalies Detected',
      description: `${gptInsights.anomalies.length} unusual patterns identified in cash flow`,
      confidence: 0.87,
      impact: 'medium',
      actionRequired: true,
      recommendations: [
        "Review identified cash flow anomalies",
        "Investigate underlying causes of irregular patterns",
        "Implement monitoring for similar patterns"
      ],
      data: { anomalies: gptInsights.anomalies }
    });
  }
  
  return insights;
}

// Anomaly Detection with Machine Learning
async function performAnomalyDetection(
  ctx: any,
  params: {
    organizationId: string;
    transactions: any[];
    dateRange: { start: number; end: number };
  }
): Promise<FinancialInsight[]> {
  
  const anomalies = detectTransactionAnomalies(params.transactions);
  
  // Use GPT-4 to analyze and explain anomalies
  const gptPrompt = generateAnomalyPrompt(anomalies, params.transactions);
  const gptAnalysis = await callGPT4ForAnalysis(gptPrompt, "anomaly_analysis");
  
  const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
  
  const insights: FinancialInsight[] = [
    {
      type: 'anomaly',
      title: 'Transaction Anomaly Detection',
      description: `${anomalies.length} anomalies detected, ${highSeverityAnomalies.length} require immediate attention`,
      confidence: 0.89,
      impact: highSeverityAnomalies.length > 0 ? 'high' : 'medium',
      actionRequired: highSeverityAnomalies.length > 0,
      recommendations: [
        ...gptAnalysis.recommendations,
        "Review high-severity anomalies immediately",
        "Implement automated controls for similar patterns",
        "Update approval workflows for large transactions"
      ],
      data: {
        totalAnomalies: anomalies.length,
        highSeverityCount: highSeverityAnomalies.length,
        anomalies: anomalies.slice(0, 10), // Top 10 anomalies
        patterns: gptAnalysis.patterns || [],
      }
    }
  ];
  
  return insights;
}

// Vendor Payment Optimization
async function performVendorOptimization(
  ctx: any,
  params: {
    organizationId: string;
    transactions: any[];
    dateRange: { start: number; end: number };
  }
): Promise<FinancialInsight[]> {
  
  // Analyze vendor payment patterns
  const vendorAnalysis = analyzeVendorPayments(params.transactions);
  
  const gptPrompt = generateVendorOptimizationPrompt(vendorAnalysis);
  const gptRecommendations = await callGPT4ForAnalysis(gptPrompt, "vendor_optimization");
  
  const insights: FinancialInsight[] = [
    {
      type: 'vendor_optimization',
      title: 'Vendor Payment Optimization',
      description: `Analysis of ${vendorAnalysis.totalVendors} vendors reveals ${vendorAnalysis.optimizationOpportunities.length} optimization opportunities`,
      confidence: 0.85,
      impact: 'medium',
      actionRequired: vendorAnalysis.optimizationOpportunities.length > 0,
      recommendations: [
        ...gptRecommendations.recommendations,
        "Negotiate extended payment terms with top vendors",
        "Implement early payment discounts where beneficial",
        "Consolidate purchases with preferred vendors"
      ],
      data: {
        vendorAnalysis,
        potentialSavings: gptRecommendations.potentialSavings || 0,
        cashFlowImprovement: gptRecommendations.cashFlowImprovement || 0,
      }
    }
  ];
  
  return insights;
}

// Revenue Recognition Pattern Analysis
async function performRevenueRecognitionAnalysis(
  ctx: any,
  params: {
    organizationId: string;
    transactions: any[];
    accounts: any[];
    dateRange: { start: number; end: number };
  }
): Promise<FinancialInsight[]> {
  
  // Analyze revenue patterns and recognition timing
  const revenueAnalysis = analyzeRevenuePatterns(params.transactions, params.accounts);
  
  const gptPrompt = generateRevenueRecognitionPrompt(revenueAnalysis);
  const gptInsights = await callGPT4ForAnalysis(gptPrompt, "revenue_recognition");
  
  const insights: FinancialInsight[] = [
    {
      type: 'revenue_recognition',
      title: 'Revenue Recognition Analysis',
      description: `Revenue pattern analysis reveals ${revenueAnalysis.recognitionIssues.length} potential timing issues`,
      confidence: 0.88,
      impact: revenueAnalysis.recognitionIssues.length > 0 ? 'high' : 'low',
      actionRequired: revenueAnalysis.recognitionIssues.length > 0,
      recommendations: [
        ...gptInsights.recommendations,
        "Review revenue recognition policies for compliance",
        "Implement automated revenue recognition controls",
        "Regular audit of contract terms and recognition timing"
      ],
      data: {
        revenueAnalysis,
        complianceScore: gptInsights.complianceScore || 85,
        riskAreas: gptInsights.riskAreas || [],
      }
    }
  ];
  
  return insights;
}

// GPT-4 Prompt Generation Functions
function generateCashFlowPrompt(cashPosition: number, history: any[], accounts: any[]): string {
  return `
You are a CFO analyzing cash flow for a business. Here's the data:

Current Cash Position: $${cashPosition.toLocaleString()}
Cash Flow History: ${JSON.stringify(history.slice(-6))} (last 6 periods)
Account Types: ${accounts.map(a => `${a.name}: ${a.type}`).join(', ')}

Provide insights on:
1. Cash flow health and trends
2. Seasonal adjustment recommendations
3. Risk factors and mitigation strategies
4. Optimization opportunities

Format your response as JSON with: recommendations, seasonalFactors, riskLevel, anomalies
`;
}

function generateAnomalyPrompt(anomalies: any[], transactions: any[]): string {
  return `
As a financial analyst, analyze these transaction anomalies:

Detected Anomalies: ${JSON.stringify(anomalies.slice(0, 5))}
Transaction Volume: ${transactions.length} transactions
Period: Recent analysis

Provide analysis on:
1. Root causes of anomalies
2. Risk assessment
3. Prevention strategies
4. Pattern identification

Format response as JSON with: recommendations, patterns, riskAssessment
`;
}

function generateVendorOptimizationPrompt(vendorAnalysis: any): string {
  return `
Analyze vendor payment optimization opportunities:

Vendor Data: ${JSON.stringify(vendorAnalysis)}

Provide recommendations on:
1. Payment term negotiations
2. Early payment discount opportunities
3. Cash flow optimization
4. Vendor consolidation benefits

Format response as JSON with: recommendations, potentialSavings, cashFlowImprovement
`;
}

function generateRevenueRecognitionPrompt(revenueAnalysis: any): string {
  return `
Review revenue recognition patterns for compliance:

Revenue Analysis: ${JSON.stringify(revenueAnalysis)}

Assess:
1. ASC 606 compliance
2. Recognition timing accuracy
3. Contract term implications
4. Risk areas

Format response as JSON with: recommendations, complianceScore, riskAreas
`;
}

// Mock GPT-4 API call (replace with actual OpenAI integration)
async function callGPT4ForAnalysis(prompt: string, analysisType: string): Promise<any> {
  // This would be replaced with actual OpenAI GPT-4 API call
  console.log(`GPT-4 Analysis: ${analysisType}`);
  
  // Mock responses based on analysis type
  switch (analysisType) {
    case "cash_flow_analysis":
      return {
        recommendations: [
          "Optimize collection processes to improve cash conversion cycle",
          "Implement rolling cash flow forecasting with weekly updates",
          "Consider factoring for accounts receivable if cash runway is short"
        ],
        seasonalFactors: [1.2, 0.8, 0.9, 1.1, 1.3, 0.7],
        riskLevel: "medium",
        anomalies: []
      };
      
    case "anomaly_analysis":
      return {
        recommendations: [
          "Investigate large transactions outside normal patterns",
          "Implement automated approval workflows for transactions above thresholds",
          "Review vendor payment patterns for consistency"
        ],
        patterns: ["Weekend transactions", "Round number amounts", "Duplicate vendor payments"],
        riskAssessment: "medium"
      };
      
    case "vendor_optimization":
      return {
        recommendations: [
          "Negotiate 2% early payment discounts with top 5 vendors",
          "Extend payment terms from 30 to 45 days where possible",
          "Consolidate purchases to achieve volume discounts"
        ],
        potentialSavings: 15000,
        cashFlowImprovement: 45000
      };
      
    case "revenue_recognition":
      return {
        recommendations: [
          "Review contract terms for performance obligations",
          "Implement milestone-based recognition for services",
          "Regular compliance audits for ASC 606"
        ],
        complianceScore: 88,
        riskAreas: ["Multi-element arrangements", "Variable consideration"]
      };
      
    default:
      return { recommendations: [], insights: [] };
  }
}

// Helper Functions for Financial Calculations

function calculateHistoricalCashFlow(transactions: any[], dateRange: { start: number; end: number }) {
  // Group transactions by month and calculate net cash flow
  const monthlyFlows: { [key: string]: number } = {};
  
  transactions.forEach(txn => {
    if (txn.date >= dateRange.start && txn.date <= dateRange.end) {
      const monthKey = new Date(txn.date).toISOString().substring(0, 7);
      if (!monthlyFlows[monthKey]) monthlyFlows[monthKey] = 0;
      monthlyFlows[monthKey] += txn.type === 'income' ? txn.amount : -txn.amount;
    }
  });
  
  return Object.entries(monthlyFlows).map(([month, flow]) => ({ month, flow }));
}

function calculateCashFlowProjections(history: any[]): number[] {
  // Simple linear projection based on historical trends
  const flows = history.map(h => h.flow);
  const avgFlow = flows.reduce((sum, flow) => sum + flow, 0) / flows.length;
  
  // Project next 6 months
  return Array(6).fill(0).map((_, i) => avgFlow * (1 + (i * 0.02))); // 2% growth per month
}

function calculateBurnRate(transactions: any[]): number {
  // Calculate monthly burn rate from expenses
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = transactions
    .filter(txn => {
      const txnDate = new Date(txn.date);
      return txnDate.getMonth() === currentMonth && 
             txnDate.getFullYear() === currentYear && 
             txn.type === 'expense';
    })
    .reduce((sum, txn) => sum + txn.amount, 0);
    
  return monthlyExpenses;
}

function detectTransactionAnomalies(transactions: any[]) {
  const anomalies: any[] = [];
  
  // Calculate statistical thresholds
  const amounts = transactions.map(t => t.amount);
  const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length);
  const threshold = mean + (2 * stdDev); // 2 standard deviations
  
  transactions.forEach(txn => {
    // Large amount anomaly
    if (txn.amount > threshold) {
      anomalies.push({
        transactionId: txn._id,
        type: 'spending',
        severity: txn.amount > threshold * 2 ? 'high' : 'medium',
        description: `Transaction amount ${txn.amount} significantly exceeds normal range`,
        expectedValue: mean,
        actualValue: txn.amount,
        deviation: (txn.amount - mean) / stdDev,
        flaggedAt: Date.now()
      });
    }
    
    // Weekend transaction anomaly
    const txnDate = new Date(txn.date);
    if (txnDate.getDay() === 0 || txnDate.getDay() === 6) {
      anomalies.push({
        transactionId: txn._id,
        type: 'timing',
        severity: 'low',
        description: 'Transaction occurred on weekend',
        expectedValue: 'weekday',
        actualValue: 'weekend',
        deviation: 0,
        flaggedAt: Date.now()
      });
    }
  });
  
  return anomalies;
}

function analyzeVendorPayments(transactions: any[]) {
  const vendorMap: { [vendor: string]: any } = {};
  
  transactions
    .filter(txn => txn.type === 'expense' && txn.vendor)
    .forEach(txn => {
      if (!vendorMap[txn.vendor]) {
        vendorMap[txn.vendor] = {
          name: txn.vendor,
          totalPaid: 0,
          transactionCount: 0,
          avgAmount: 0,
          paymentTerms: txn.paymentTerms || 30,
          lastPayment: 0
        };
      }
      
      vendorMap[txn.vendor].totalPaid += txn.amount;
      vendorMap[txn.vendor].transactionCount += 1;
      vendorMap[txn.vendor].lastPayment = Math.max(vendorMap[txn.vendor].lastPayment, txn.date);
    });
  
  const vendors = Object.values(vendorMap);
  vendors.forEach((vendor: any) => {
    vendor.avgAmount = vendor.totalPaid / vendor.transactionCount;
  });
  
  // Identify optimization opportunities
  const optimizationOpportunities = vendors
    .filter((vendor: any) => vendor.totalPaid > 10000) // Focus on high-value vendors
    .map((vendor: any) => ({
      vendor: vendor.name,
      opportunity: 'negotiate_terms',
      potentialSaving: vendor.totalPaid * 0.02, // 2% potential discount
      currentTerms: vendor.paymentTerms,
      recommendedTerms: vendor.paymentTerms + 15 // Extend by 15 days
    }));
  
  return {
    totalVendors: vendors.length,
    topVendors: vendors.sort((a: any, b: any) => b.totalPaid - a.totalPaid).slice(0, 10),
    optimizationOpportunities,
    totalSpend: vendors.reduce((sum: number, v: any) => sum + v.totalPaid, 0)
  };
}

function analyzeRevenuePatterns(transactions: any[], accounts: any[]) {
  const revenueAccounts = accounts.filter(acc => acc.type === 'income' || acc.type === 'revenue');
  const revenueTransactions = transactions.filter(txn => 
    revenueAccounts.some(acc => acc._id === txn.accountId)
  );
  
  // Analyze recognition patterns
  const recognitionIssues: any[] = [];
  
  // Check for large lump-sum recognitions that might need to be spread
  revenueTransactions.forEach(txn => {
    if (txn.amount > 50000 && !txn.contractTerms) {
      recognitionIssues.push({
        transactionId: txn._id,
        issue: 'large_recognition_without_contract',
        description: 'Large revenue recognition without defined contract terms',
        recommendedAction: 'Review contract and implement milestone recognition'
      });
    }
  });
  
  // Monthly revenue distribution analysis
  const monthlyRevenue: { [month: string]: number } = {};
  revenueTransactions.forEach(txn => {
    const monthKey = new Date(txn.date).toISOString().substring(0, 7);
    if (!monthlyRevenue[monthKey]) monthlyRevenue[monthKey] = 0;
    monthlyRevenue[monthKey] += txn.amount;
  });
  
  return {
    totalRevenue: revenueTransactions.reduce((sum, txn) => sum + txn.amount, 0),
    recognitionIssues,
    monthlyDistribution: monthlyRevenue,
    averageMonthlyRevenue: Object.values(monthlyRevenue).reduce((sum: number, rev: number) => sum + rev, 0) / Object.keys(monthlyRevenue).length
  };
}

// Query for getting historical insights
export const getHistoricalInsights = query({
  args: {
    organizationId: v.id("organizations"),
    analysisType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // This would query a historical insights table
    // For now, return mock data structure
    return {
      insights: [],
      totalCount: 0,
      dateRange: getDateRange("month", 0),
    };
  },
});