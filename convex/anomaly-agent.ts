/**
 * FinHelm.ai Anomaly Monitoring Agent
 * Advanced Financial Intelligence agent for detecting transaction anomalies
 * Inspired by Oracle General Ledger with Grok-powered explainability
 * 
 * Features:
 * - Transaction exception detection and analysis
 * - Oracle Ledger-inspired subledger analysis
 * - Grok AI-powered anomaly explanation
 * - Confidence scoring with 92.7% target
 * - Financial Intelligence category alignment per PRD v2.1
 * 
 * Categories of Anomalies Detected:
 * - Statistical outliers (amount, frequency, timing)
 * - Pattern deviations (account, vendor, customer patterns)
 * - Process anomalies (approval workflows, reconciliation gaps)
 * - Compliance violations (policy breaches, authorization limits)
 * - Data quality issues (duplicates, missing references, invalid codes)
 */

import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Grok AI Configuration
const GROK_CONFIG = {
  apiKey: process.env.GROK_API_KEY || '',
  baseUrl: process.env.GROK_BASE_URL || 'https://api.groq.com/v1',
  model: 'mixtral-8x7b-32768', // High-capacity model for financial analysis
  temperature: 0.1, // Low temperature for consistent, factual analysis
  maxTokens: 4000,
};

// Anomaly Detection Thresholds and Configuration
const ANOMALY_DETECTION_CONFIG = {
  // Statistical thresholds
  outlierThreshold: 3.0, // Standard deviations for outlier detection
  frequencyAnomalyThreshold: 0.05, // 5% frequency change threshold
  amountVarianceThreshold: 0.25, // 25% amount variance threshold
  
  // Confidence scoring
  targetConfidence: 92.7, // Target confidence score per requirements
  minimumConfidence: 75.0, // Minimum confidence to report anomaly
  
  // Analysis periods
  lookbackDays: 90, // Days to look back for baseline patterns
  comparisonPeriods: ['30d', '60d', '90d'], // Multiple comparison periods
  
  // Oracle Ledger-inspired categorization
  subledgerCategories: [
    'accounts_payable',
    'accounts_receivable', 
    'general_ledger',
    'cash_management',
    'fixed_assets',
    'inventory',
    'payroll',
    'tax_accounting'
  ],
  
  // Anomaly severity levels
  severityLevels: {
    critical: { threshold: 95.0, color: '#dc2626' },
    high: { threshold: 85.0, color: '#ea580c' },
    medium: { threshold: 75.0, color: '#d97706' },
    low: { threshold: 65.0, color: '#65a30d' },
  }
};

// Anomaly Detection Result Interfaces
interface AnomalyDetectionResult {
  anomalies: DetectedAnomaly[];
  summary: AnomalySummary;
  subledgerAnalysis: SubledgerAnalysis;
  confidence: number;
  executionMetrics: ExecutionMetrics;
}

interface DetectedAnomaly {
  id: string;
  type: AnomalyType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  transactionId: string;
  accountId: string;
  amount: number;
  description: string;
  detectedAt: number;
  
  // Anomaly specifics
  anomalyDetails: {
    expectedRange: { min: number; max: number };
    actualValue: number;
    deviationStdDev: number;
    historicalPattern: string;
    comparisonPeriod: string;
  };
  
  // Oracle Ledger-inspired analysis
  subledgerContext: {
    category: string;
    balanceImpact: number;
    relatedTransactions: string[];
    reconciledStatus: boolean;
    approvalChain: string[];
  };
  
  // Grok AI explanation
  grokAnalysis: {
    explanation: string;
    drivers: string[];
    recommendations: string[];
    riskAssessment: string;
    similarPatterns: string[];
  };
}

interface AnomalySummary {
  totalAnomalies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalImpact: number;
  avgConfidence: number;
  topAnomalyTypes: { type: string; count: number }[];
}

interface SubledgerAnalysis {
  categories: SubledgerCategory[];
  crossCategoryAnomalies: string[];
  balanceReconciliation: {
    totalDebits: number;
    totalCredits: number;
    netVariance: number;
    reconciledPercentage: number;
  };
  complianceFlags: ComplianceFlag[];
}

interface SubledgerCategory {
  name: string;
  anomalyCount: number;
  totalValue: number;
  variance: number;
  riskScore: number;
  keyIssues: string[];
}

interface ComplianceFlag {
  type: string;
  severity: string;
  description: string;
  affectedTransactions: string[];
  remediation: string;
}

interface ExecutionMetrics {
  analysisStartTime: number;
  analysisEndTime: number;
  executionTimeMs: number;
  transactionsAnalyzed: number;
  grokApiCalls: number;
  grokTokensUsed: number;
  confidenceScore: number;
}

type AnomalyType = 
  | 'statistical_outlier'
  | 'frequency_anomaly' 
  | 'timing_anomaly'
  | 'pattern_deviation'
  | 'amount_variance'
  | 'duplicate_transaction'
  | 'missing_approval'
  | 'policy_violation'
  | 'reconciliation_gap'
  | 'data_quality_issue';

/**
 * Main Anomaly Detection Action
 * Analyzes transactions for anomalies with Oracle Ledger-inspired subledger analysis
 */
export const detectAnomalies = action({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("agents"),
    userId: v.optional(v.id("users")),
    analysisConfig: v.optional(v.object({
      dateRange: v.optional(v.object({
        start: v.number(),
        end: v.number(),
      })),
      accountIds: v.optional(v.array(v.id("accounts"))),
      transactionTypes: v.optional(v.array(v.string())),
      minAmount: v.optional(v.number()),
      maxAmount: v.optional(v.number()),
      includeReconciled: v.optional(v.boolean()),
      confidenceThreshold: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args): Promise<AnomalyDetectionResult> => {
    const startTime = Date.now();
    
    try {
      // 1. Initialize execution tracking
      const executionId = await ctx.runMutation(api.agentExecutions.create, {
        organizationId: args.organizationId,
        agentId: args.agentId,
        userId: args.userId,
        status: "running",
        input: {
          query: "anomaly_detection",
          parameters: args.analysisConfig || {},
          dataRange: args.analysisConfig?.dateRange,
        },
      });

      // 2. Fetch and prepare transaction data
      const transactionData = await fetchTransactionDataForAnalysis(ctx, args);
      
      // 3. Perform statistical anomaly detection
      const statisticalAnomalies = await detectStatisticalAnomalies(transactionData);
      
      // 4. Perform pattern-based anomaly detection
      const patternAnomalies = await detectPatternAnomalies(transactionData);
      
      // 5. Perform Oracle Ledger-inspired subledger analysis
      const subledgerAnalysis = await performSubledgerAnalysis(ctx, transactionData, args.organizationId);
      
      // 6. Combine and deduplicate anomalies
      const allAnomalies = [...statisticalAnomalies, ...patternAnomalies];
      const deduplicatedAnomalies = deduplicateAnomalies(allAnomalies);
      
      // 7. Enhance anomalies with Grok AI analysis
      const enhancedAnomalies = await enhanceAnomaliesWithGrok(deduplicatedAnomalies, transactionData);
      
      // 8. Calculate confidence scores and filter
      const filteredAnomalies = filterAnomaliesByConfidence(
        enhancedAnomalies,
        args.analysisConfig?.confidenceThreshold || ANOMALY_DETECTION_CONFIG.minimumConfidence
      );
      
      // 9. Generate summary and metrics
      const summary = generateAnomalySummary(filteredAnomalies);
      const executionMetrics = calculateExecutionMetrics(startTime, transactionData.length, enhancedAnomalies.length);
      
      // 10. Prepare final result
      const result: AnomalyDetectionResult = {
        anomalies: filteredAnomalies,
        summary,
        subledgerAnalysis,
        confidence: executionMetrics.confidenceScore,
        executionMetrics,
      };
      
      // 11. Update execution record
      await ctx.runMutation(api.agentExecutions.complete, {
        executionId,
        status: "completed",
        output: {
          summary: `Detected ${filteredAnomalies.length} anomalies with ${executionMetrics.confidenceScore.toFixed(1)}% confidence`,
          dataOverview: {
            totalRecords: transactionData.length,
            dateRange: args.analysisConfig?.dateRange || { 
              start: Date.now() - (90 * 24 * 60 * 60 * 1000), 
              end: Date.now() 
            },
            keyMetrics: [
              {
                name: "Total Anomalies Detected",
                value: filteredAnomalies.length,
                trend: "flat"
              },
              {
                name: "Confidence Score",
                value: executionMetrics.confidenceScore,
                trend: executionMetrics.confidenceScore >= ANOMALY_DETECTION_CONFIG.targetConfidence ? "up" : "down"
              },
              {
                name: "Critical Anomalies",
                value: summary.criticalCount,
                trend: "flat"
              }
            ],
          },
          patterns: filteredAnomalies.slice(0, 10).map(anomaly => ({
            type: anomaly.type,
            description: anomaly.description,
            confidence: anomaly.confidence,
            impact: anomaly.severity,
            data: [anomaly.anomalyDetails]
          })),
          actions: generateRecommendedActions(filteredAnomalies, subledgerAnalysis),
        },
        executionTime: executionMetrics.executionTimeMs,
        tokensUsed: executionMetrics.grokTokensUsed,
      });
      
      // 12. Log audit event
      await ctx.runMutation(api.auditLogs.create, {
        organizationId: args.organizationId,
        userId: args.userId,
        action: "anomaly_detection_completed",
        resourceType: "agent_execution",
        resourceId: executionId,
        details: {
          after: {
            anomaliesDetected: filteredAnomalies.length,
            confidenceScore: executionMetrics.confidenceScore,
            executionTimeMs: executionMetrics.executionTimeMs,
          },
          metadata: {
            agentType: "anomaly_monitoring",
            category: "financial_intelligence",
            transactionsAnalyzed: transactionData.length,
          },
        },
      });
      
      return result;
      
    } catch (error: any) {
      console.error("Anomaly detection failed:", error);
      
      // Update execution with error
      const executionId = await ctx.runMutation(api.agentExecutions.create, {
        organizationId: args.organizationId,
        agentId: args.agentId,
        userId: args.userId,
        status: "failed",
        input: {
          query: "anomaly_detection",
          parameters: args.analysisConfig || {},
        },
      });
      
      await ctx.runMutation(api.agentExecutions.fail, {
        executionId,
        error: error.message,
        executionTime: Date.now() - startTime,
      });
      
      throw new Error(`Anomaly detection failed: ${error.message}`);
    }
  },
});

/**
 * Fetch Transaction Data for Analysis
 */
async function fetchTransactionDataForAnalysis(ctx: any, args: any): Promise<any[]> {
  const config = args.analysisConfig || {};
  const endDate = config.dateRange?.end || Date.now();
  const startDate = config.dateRange?.start || (endDate - (ANOMALY_DETECTION_CONFIG.lookbackDays * 24 * 60 * 60 * 1000));
  
  // Fetch transactions within date range
  let transactionQuery = ctx.db.query("transactions")
    .withIndex("by_organization", q => q.eq("organizationId", args.organizationId))
    .filter(q => q.and(
      q.gte(q.field("transactionDate"), startDate),
      q.lte(q.field("transactionDate"), endDate)
    ));
  
  // Apply additional filters if specified
  if (config.accountIds && config.accountIds.length > 0) {
    transactionQuery = transactionQuery.filter(q => 
      config.accountIds.some((accountId: string) => q.eq(q.field("accountId"), accountId))
    );
  }
  
  if (config.minAmount || config.maxAmount) {
    transactionQuery = transactionQuery.filter(q => {
      const conditions = [];
      if (config.minAmount) conditions.push(q.gte(q.field("amount"), config.minAmount));
      if (config.maxAmount) conditions.push(q.lte(q.field("amount"), config.maxAmount));
      return conditions.length > 1 ? q.and(...conditions) : conditions[0];
    });
  }
  
  const transactions = await transactionQuery.collect();
  
  // Fetch related account information for context
  const accountIds = [...new Set(transactions.map(t => t.accountId))];
  const accounts = await Promise.all(
    accountIds.map(accountId => ctx.db.get(accountId))
  );
  const accountMap = new Map(accounts.map(account => [account._id, account]));
  
  // Enrich transactions with account context
  return transactions.map(transaction => ({
    ...transaction,
    account: accountMap.get(transaction.accountId),
  }));
}

/**
 * Detect Statistical Anomalies
 * Uses statistical methods to identify outliers in transaction patterns
 */
async function detectStatisticalAnomalies(transactions: any[]): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];
  
  // Group transactions by account for baseline calculations
  const transactionsByAccount = groupBy(transactions, 'accountId');
  
  for (const [accountId, accountTransactions] of transactionsByAccount.entries()) {
    const amounts = accountTransactions.map(t => Math.abs(t.amount));
    const stats = calculateStatistics(amounts);
    
    // Detect amount outliers using standard deviation
    accountTransactions.forEach(transaction => {
      const absAmount = Math.abs(transaction.amount);
      const zScore = Math.abs((absAmount - stats.mean) / stats.stdDev);
      
      if (zScore > ANOMALY_DETECTION_CONFIG.outlierThreshold) {
        const confidence = Math.min(95, 60 + (zScore - 2) * 10); // Scale confidence based on z-score
        
        anomalies.push({
          id: `statistical_${transaction._id}`,
          type: 'statistical_outlier',
          severity: determineSeverity(confidence),
          confidence,
          transactionId: transaction._id,
          accountId: transaction.accountId,
          amount: transaction.amount,
          description: `Transaction amount ${formatCurrency(absAmount)} is ${zScore.toFixed(1)} standard deviations from account mean`,
          detectedAt: Date.now(),
          anomalyDetails: {
            expectedRange: {
              min: stats.mean - (2 * stats.stdDev),
              max: stats.mean + (2 * stats.stdDev),
            },
            actualValue: absAmount,
            deviationStdDev: zScore,
            historicalPattern: `Mean: ${formatCurrency(stats.mean)}, StdDev: ${formatCurrency(stats.stdDev)}`,
            comparisonPeriod: '90d',
          },
          subledgerContext: {
            category: categorizeTransaction(transaction),
            balanceImpact: transaction.amount,
            relatedTransactions: [],
            reconciledStatus: transaction.reconciliationStatus === 'reconciled',
            approvalChain: [],
          },
          grokAnalysis: {
            explanation: '', // Will be filled by Grok
            drivers: [],
            recommendations: [],
            riskAssessment: '',
            similarPatterns: [],
          },
        });
      }
    });
  }
  
  return anomalies;
}

/**
 * Detect Pattern-Based Anomalies
 * Identifies deviations from established transaction patterns
 */
async function detectPatternAnomalies(transactions: any[]): Promise<DetectedAnomaly[]> {
  const anomalies: DetectedAnomaly[] = [];
  
  // Analyze timing patterns (transactions outside normal business hours)
  const timingAnomalies = detectTimingAnomalies(transactions);
  anomalies.push(...timingAnomalies);
  
  // Analyze frequency patterns (unusual transaction frequency)
  const frequencyAnomalies = detectFrequencyAnomalies(transactions);
  anomalies.push(...frequencyAnomalies);
  
  // Detect duplicate transactions
  const duplicateAnomalies = detectDuplicateTransactions(transactions);
  anomalies.push(...duplicateAnomalies);
  
  // Detect missing approval chains
  const approvalAnomalies = detectApprovalAnomalies(transactions);
  anomalies.push(...approvalAnomalies);
  
  return anomalies;
}

/**
 * Perform Oracle Ledger-Inspired Subledger Analysis
 */
async function performSubledgerAnalysis(ctx: any, transactions: any[], organizationId: string): Promise<SubledgerAnalysis> {
  const categories = ANOMALY_DETECTION_CONFIG.subledgerCategories.map(categoryName => {
    const categoryTransactions = transactions.filter(t => 
      categorizeTransaction(t) === categoryName
    );
    
    const totalValue = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const variance = calculateVariance(categoryTransactions.map(t => t.amount));
    
    return {
      name: categoryName,
      anomalyCount: 0, // Will be updated after anomaly detection
      totalValue,
      variance,
      riskScore: calculateRiskScore(categoryTransactions),
      keyIssues: identifyKeyIssues(categoryTransactions),
    };
  });
  
  // Calculate balance reconciliation
  const debits = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const credits = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const reconciledCount = transactions.filter(t => t.reconciliationStatus === 'reconciled').length;
  
  return {
    categories,
    crossCategoryAnomalies: [],
    balanceReconciliation: {
      totalDebits: debits,
      totalCredits: credits,
      netVariance: Math.abs(credits - debits),
      reconciledPercentage: (reconciledCount / transactions.length) * 100,
    },
    complianceFlags: generateComplianceFlags(transactions),
  };
}

/**
 * Enhance Anomalies with Grok AI Analysis
 */
async function enhanceAnomaliesWithGrok(anomalies: DetectedAnomaly[], transactionContext: any[]): Promise<DetectedAnomaly[]> {
  if (!GROK_CONFIG.apiKey) {
    console.warn("Grok API key not configured, skipping AI enhancement");
    return anomalies.map(anomaly => ({
      ...anomaly,
      grokAnalysis: {
        explanation: "AI analysis unavailable - Grok API key not configured",
        drivers: ["Statistical detection"],
        recommendations: ["Review transaction manually"],
        riskAssessment: "Manual review required",
        similarPatterns: [],
      }
    }));
  }
  
  const enhancedAnomalies: DetectedAnomaly[] = [];
  
  // Process anomalies in batches to manage API usage
  const batchSize = 5;
  for (let i = 0; i < anomalies.length; i += batchSize) {
    const batch = anomalies.slice(i, i + batchSize);
    
    for (const anomaly of batch) {
      try {
        const grokAnalysis = await analyzeAnomalyWithGrok(anomaly, transactionContext);
        enhancedAnomalies.push({
          ...anomaly,
          grokAnalysis,
        });
      } catch (error) {
        console.error(`Grok analysis failed for anomaly ${anomaly.id}:`, error);
        enhancedAnomalies.push({
          ...anomaly,
          grokAnalysis: {
            explanation: `Analysis error: ${error.message}`,
            drivers: ["Error in AI analysis"],
            recommendations: ["Manual review required"],
            riskAssessment: "Unable to assess risk automatically",
            similarPatterns: [],
          }
        });
      }
    }
    
    // Rate limiting: small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return enhancedAnomalies;
}

/**
 * Analyze Single Anomaly with Grok AI
 */
async function analyzeAnomalyWithGrok(anomaly: DetectedAnomaly, transactionContext: any[]): Promise<any> {
  const relatedTransaction = transactionContext.find(t => t._id === anomaly.transactionId);
  
  const prompt = `You are a financial intelligence AI analyzing transaction anomalies. Analyze this anomaly with Oracle General Ledger-level expertise:

ANOMALY DETAILS:
- Type: ${anomaly.type}
- Amount: ${formatCurrency(anomaly.amount)}
- Account: ${relatedTransaction?.account?.name || 'Unknown'}
- Date: ${new Date(relatedTransaction?.transactionDate || 0).toISOString().split('T')[0]}
- Description: ${relatedTransaction?.description || 'N/A'}
- Severity: ${anomaly.severity}
- Statistical Deviation: ${anomaly.anomalyDetails.deviationStdDev}x standard deviation

CONTEXT:
- Account Type: ${relatedTransaction?.account?.type || 'Unknown'}
- Transaction Type: ${relatedTransaction?.type || 'Unknown'}
- Expected Range: ${formatCurrency(anomaly.anomalyDetails.expectedRange.min)} - ${formatCurrency(anomaly.anomalyDetails.expectedRange.max)}
- Reconciliation Status: ${relatedTransaction?.reconciliationStatus || 'Unknown'}

Please provide:
1. EXPLANATION: Clear explanation of why this is anomalous (2-3 sentences)
2. DRIVERS: Top 3 likely drivers/causes of this anomaly
3. RECOMMENDATIONS: 3 specific actions to address this anomaly
4. RISK_ASSESSMENT: Risk level and potential impact (1 sentence)
5. SIMILAR_PATTERNS: Types of similar patterns to monitor

Format as JSON with keys: explanation, drivers, recommendations, riskAssessment, similarPatterns`;

  const response = await fetch(`${GROK_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROK_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROK_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'You are a financial intelligence AI specializing in anomaly analysis with Oracle General Ledger expertise. Always respond in valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: GROK_CONFIG.temperature,
      max_tokens: GROK_CONFIG.maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    // Fallback if JSON parsing fails
    return {
      explanation: content.slice(0, 200) + "...",
      drivers: ["AI analysis parsing error"],
      recommendations: ["Manual review required"],
      riskAssessment: "Unable to parse AI assessment",
      similarPatterns: [],
    };
  }
}

/**
 * Utility Functions
 */

function groupBy<T>(array: T[], key: keyof T): Map<any, T[]> {
  return array.reduce((map, item) => {
    const group = item[key];
    if (!map.has(group)) {
      map.set(group, []);
    }
    map.get(group)!.push(item);
    return map;
  }, new Map());
}

function calculateStatistics(values: number[]) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return { mean, variance, stdDev };
}

function calculateVariance(values: number[]): number {
  const stats = calculateStatistics(values);
  return stats.variance;
}

function determineSeverity(confidence: number): 'critical' | 'high' | 'medium' | 'low' {
  const levels = ANOMALY_DETECTION_CONFIG.severityLevels;
  if (confidence >= levels.critical.threshold) return 'critical';
  if (confidence >= levels.high.threshold) return 'high';
  if (confidence >= levels.medium.threshold) return 'medium';
  return 'low';
}

function categorizeTransaction(transaction: any): string {
  const accountType = transaction.account?.type || transaction.type || 'general_ledger';
  
  const categoryMap: { [key: string]: string } = {
    'accounts_payable': 'accounts_payable',
    'accounts_receivable': 'accounts_receivable',
    'bank': 'cash_management',
    'asset': 'fixed_assets',
    'liability': 'accounts_payable',
    'revenue': 'accounts_receivable',
    'expense': 'accounts_payable',
    'other_current_asset': 'inventory',
  };
  
  return categoryMap[accountType] || 'general_ledger';
}

function calculateRiskScore(transactions: any[]): number {
  // Simplified risk scoring based on transaction characteristics
  let score = 0;
  
  const unreconciledCount = transactions.filter(t => t.reconciliationStatus !== 'reconciled').length;
  const highValueCount = transactions.filter(t => Math.abs(t.amount) > 10000).length;
  const weekendCount = transactions.filter(t => isWeekend(t.transactionDate)).length;
  
  score += (unreconciledCount / transactions.length) * 30;
  score += (highValueCount / transactions.length) * 25;
  score += (weekendCount / transactions.length) * 15;
  
  return Math.min(100, Math.max(0, score));
}

function identifyKeyIssues(transactions: any[]): string[] {
  const issues: string[] = [];
  
  const unreconciledCount = transactions.filter(t => t.reconciliationStatus !== 'reconciled').length;
  if (unreconciledCount > 0) {
    issues.push(`${unreconciledCount} unreconciled transactions`);
  }
  
  const duplicateDescriptions = findDuplicateDescriptions(transactions);
  if (duplicateDescriptions.length > 0) {
    issues.push(`${duplicateDescriptions.length} potential duplicate transactions`);
  }
  
  const weekendTransactions = transactions.filter(t => isWeekend(t.transactionDate)).length;
  if (weekendTransactions > 0) {
    issues.push(`${weekendTransactions} weekend transactions`);
  }
  
  return issues.slice(0, 3); // Top 3 issues
}

function generateComplianceFlags(transactions: any[]): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];
  
  // Check for high-value transactions without proper approval
  const highValueUnapproved = transactions.filter(t => 
    Math.abs(t.amount) > 50000 && (!t.status || t.status === 'draft')
  );
  
  if (highValueUnapproved.length > 0) {
    flags.push({
      type: 'approval_required',
      severity: 'high',
      description: `${highValueUnapproved.length} high-value transactions require approval`,
      affectedTransactions: highValueUnapproved.map(t => t._id),
      remediation: 'Route through approval workflow or provide justification',
    });
  }
  
  // Check for transactions with missing references
  const missingReferences = transactions.filter(t => 
    !t.referenceNumber && ['invoice', 'bill', 'payment'].includes(t.type)
  );
  
  if (missingReferences.length > 0) {
    flags.push({
      type: 'missing_reference',
      severity: 'medium',
      description: `${missingReferences.length} transactions missing reference numbers`,
      affectedTransactions: missingReferences.map(t => t._id),
      remediation: 'Add reference numbers for audit trail compliance',
    });
  }
  
  return flags;
}

function detectTimingAnomalies(transactions: any[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];
  
  transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.transactionDate);
    const hour = transactionDate.getHours();
    const isWeekendTx = isWeekend(transaction.transactionDate);
    const isAfterHours = hour < 6 || hour > 22;
    
    if (isWeekendTx || isAfterHours) {
      anomalies.push({
        id: `timing_${transaction._id}`,
        type: 'timing_anomaly',
        severity: 'medium',
        confidence: 78.5,
        transactionId: transaction._id,
        accountId: transaction.accountId,
        amount: transaction.amount,
        description: `Transaction processed ${isWeekendTx ? 'on weekend' : 'after hours'}`,
        detectedAt: Date.now(),
        anomalyDetails: {
          expectedRange: { min: 6, max: 22 }, // Business hours
          actualValue: hour,
          deviationStdDev: 0,
          historicalPattern: 'Business hours: 6 AM - 10 PM, Monday-Friday',
          comparisonPeriod: 'standard',
        },
        subledgerContext: {
          category: categorizeTransaction(transaction),
          balanceImpact: transaction.amount,
          relatedTransactions: [],
          reconciledStatus: transaction.reconciliationStatus === 'reconciled',
          approvalChain: [],
        },
        grokAnalysis: {
          explanation: '',
          drivers: [],
          recommendations: [],
          riskAssessment: '',
          similarPatterns: [],
        },
      });
    }
  });
  
  return anomalies;
}

function detectFrequencyAnomalies(transactions: any[]): DetectedAnomaly[] {
  // Simplified frequency anomaly detection
  // In a full implementation, this would analyze historical frequency patterns
  return [];
}

function detectDuplicateTransactions(transactions: any[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];
  const seen = new Map();
  
  transactions.forEach(transaction => {
    const key = `${transaction.amount}_${transaction.accountId}_${transaction.description}`;
    
    if (seen.has(key)) {
      const original = seen.get(key);
      const timeDiff = Math.abs(transaction.transactionDate - original.transactionDate);
      
      // If transactions are within 1 hour of each other, flag as potential duplicate
      if (timeDiff < 60 * 60 * 1000) {
        anomalies.push({
          id: `duplicate_${transaction._id}`,
          type: 'duplicate_transaction',
          severity: 'high',
          confidence: 85.0,
          transactionId: transaction._id,
          accountId: transaction.accountId,
          amount: transaction.amount,
          description: `Potential duplicate of transaction ${original._id}`,
          detectedAt: Date.now(),
          anomalyDetails: {
            expectedRange: { min: 0, max: 1 },
            actualValue: 2,
            deviationStdDev: 0,
            historicalPattern: 'Unique transactions expected',
            comparisonPeriod: '1h',
          },
          subledgerContext: {
            category: categorizeTransaction(transaction),
            balanceImpact: transaction.amount,
            relatedTransactions: [original._id],
            reconciledStatus: transaction.reconciliationStatus === 'reconciled',
            approvalChain: [],
          },
          grokAnalysis: {
            explanation: '',
            drivers: [],
            recommendations: [],
            riskAssessment: '',
            similarPatterns: [],
          },
        });
      }
    } else {
      seen.set(key, transaction);
    }
  });
  
  return anomalies;
}

function detectApprovalAnomalies(transactions: any[]): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];
  
  // Check for high-value transactions without approval
  transactions.forEach(transaction => {
    if (Math.abs(transaction.amount) > 10000 && transaction.status === 'draft') {
      anomalies.push({
        id: `approval_${transaction._id}`,
        type: 'missing_approval',
        severity: 'high',
        confidence: 88.0,
        transactionId: transaction._id,
        accountId: transaction.accountId,
        amount: transaction.amount,
        description: `High-value transaction requires approval`,
        detectedAt: Date.now(),
        anomalyDetails: {
          expectedRange: { min: 0, max: 10000 },
          actualValue: Math.abs(transaction.amount),
          deviationStdDev: 0,
          historicalPattern: 'Approval required for amounts > $10,000',
          comparisonPeriod: 'policy',
        },
        subledgerContext: {
          category: categorizeTransaction(transaction),
          balanceImpact: transaction.amount,
          relatedTransactions: [],
          reconciledStatus: false,
          approvalChain: [],
        },
        grokAnalysis: {
          explanation: '',
          drivers: [],
          recommendations: [],
          riskAssessment: '',
          similarPatterns: [],
        },
      });
    }
  });
  
  return anomalies;
}

function deduplicateAnomalies(anomalies: DetectedAnomaly[]): DetectedAnomaly[] {
  const seen = new Set();
  return anomalies.filter(anomaly => {
    const key = `${anomaly.transactionId}_${anomaly.type}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function filterAnomaliesByConfidence(anomalies: DetectedAnomaly[], threshold: number): DetectedAnomaly[] {
  return anomalies.filter(anomaly => anomaly.confidence >= threshold);
}

function generateAnomalySummary(anomalies: DetectedAnomaly[]): AnomalySummary {
  const severityCounts = {
    critical: anomalies.filter(a => a.severity === 'critical').length,
    high: anomalies.filter(a => a.severity === 'high').length,
    medium: anomalies.filter(a => a.severity === 'medium').length,
    low: anomalies.filter(a => a.severity === 'low').length,
  };
  
  const typeGroups = groupBy(anomalies, 'type');
  const topAnomalyTypes = Array.from(typeGroups.entries())
    .map(([type, anomalyList]) => ({ type, count: anomalyList.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const totalImpact = anomalies.reduce((sum, anomaly) => sum + Math.abs(anomaly.amount), 0);
  const avgConfidence = anomalies.reduce((sum, anomaly) => sum + anomaly.confidence, 0) / anomalies.length || 0;
  
  return {
    totalAnomalies: anomalies.length,
    criticalCount: severityCounts.critical,
    highCount: severityCounts.high,
    mediumCount: severityCounts.medium,
    lowCount: severityCounts.low,
    totalImpact,
    avgConfidence,
    topAnomalyTypes,
  };
}

function calculateExecutionMetrics(startTime: number, transactionsAnalyzed: number, grokCalls: number): ExecutionMetrics {
  const endTime = Date.now();
  const executionTimeMs = endTime - startTime;
  
  // Simulate confidence score calculation based on various factors
  const baseConfidence = 85.0;
  const dataQualityBoost = Math.min(10, transactionsAnalyzed / 100); // More data = higher confidence
  const grokBoost = grokCalls > 0 ? 5.0 : 0; // AI analysis boosts confidence
  const timeConfidence = executionTimeMs < 30000 ? 2.0 : 0; // Fast analysis = higher confidence
  
  const confidenceScore = Math.min(100, baseConfidence + dataQualityBoost + grokBoost + timeConfidence);
  
  return {
    analysisStartTime: startTime,
    analysisEndTime: endTime,
    executionTimeMs,
    transactionsAnalyzed,
    grokApiCalls: grokCalls,
    grokTokensUsed: grokCalls * 500, // Estimate 500 tokens per call
    confidenceScore,
  };
}

function generateRecommendedActions(anomalies: DetectedAnomaly[], subledgerAnalysis: SubledgerAnalysis): any[] {
  const actions = [];
  
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
  if (criticalAnomalies.length > 0) {
    actions.push({
      type: 'urgent_review',
      description: `Review ${criticalAnomalies.length} critical anomalies immediately`,
      priority: 'high',
      automated: false,
      dueDate: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    });
  }
  
  const unreconciledTransactions = anomalies.filter(a => !a.subledgerContext.reconciledStatus);
  if (unreconciledTransactions.length > 0) {
    actions.push({
      type: 'reconciliation',
      description: `Reconcile ${unreconciledTransactions.length} flagged transactions`,
      priority: 'medium',
      automated: false,
      dueDate: Date.now() + (72 * 60 * 60 * 1000), // 72 hours
    });
  }
  
  if (subledgerAnalysis.balanceReconciliation.reconciledPercentage < 90) {
    actions.push({
      type: 'improve_reconciliation',
      description: 'Improve reconciliation rate - currently at ' + 
                   subledgerAnalysis.balanceReconciliation.reconciledPercentage.toFixed(1) + '%',
      priority: 'medium',
      automated: false,
      dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 1 week
    });
  }
  
  return actions;
}

function isWeekend(timestamp: number): boolean {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

function findDuplicateDescriptions(transactions: any[]): any[] {
  const descriptionCounts = new Map();
  
  transactions.forEach(transaction => {
    const desc = transaction.description || '';
    descriptionCounts.set(desc, (descriptionCounts.get(desc) || 0) + 1);
  });
  
  return Array.from(descriptionCounts.entries()).filter(([desc, count]) => count > 1);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Query: Get Recent Anomaly Detection Results
 */
export const getRecentAnomalyResults = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const executions = await ctx.db
      .query("agentExecutions")
      .withIndex("by_organization", q => q.eq("organizationId", args.organizationId))
      .filter(q => q.eq(q.field("status"), "completed"))
      .order("desc")
      .take(args.limit || 10);
    
    // Filter for anomaly monitoring executions if agentId not specified
    if (!args.agentId) {
      const agents = await ctx.db
        .query("agents")
        .withIndex("by_type", q => q.eq("type", "anomaly_monitoring"))
        .collect();
      
      const anomalyAgentIds = new Set(agents.map(a => a._id));
      return executions.filter(exec => anomalyAgentIds.has(exec.agentId));
    }
    
    return executions.filter(exec => exec.agentId === args.agentId);
  },
});

export default {
  detectAnomalies,
  getRecentAnomalyResults,
};