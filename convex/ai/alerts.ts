import { v } from "convex/values";
import { action, query, mutation } from "../_generated/server";
import { api } from "../_generated/api";
import { calculateFinancialRatios, getDateRange } from "../utils";

/**
 * Intelligent Alert System for Financial Monitoring
 * Provides real-time alerts for cash runway, DSO changes, unusual transactions, and budget variances
 */

// Type definitions for alerts
export interface Alert {
  id: string;
  organizationId: string;
  type: 'cash_runway' | 'dso_increase' | 'unusual_transaction' | 'budget_variance' | 'compliance' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  detailedAnalysis: string;
  threshold: number;
  currentValue: number;
  previousValue?: number;
  changePercent?: number;
  triggerData: any;
  recommendations: string[];
  actionRequired: boolean;
  autoResolvable: boolean;
  createdAt: number;
  resolvedAt?: number;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  tags: string[];
}

export interface AlertRule {
  id: string;
  organizationId: string;
  type: string;
  name: string;
  description: string;
  conditions: AlertCondition[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  isEnabled: boolean;
  frequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  recipients: string[];
  suppressionRules?: SuppressionRule[];
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'change_gt' | 'change_lt' | 'pattern';
  threshold: number;
  timeframe?: string;
  comparison?: 'previous_period' | 'rolling_average' | 'budget' | 'benchmark';
}

export interface SuppressionRule {
  condition: string;
  duration: number; // minutes
  description: string;
}

// Main alert monitoring action that runs periodically
export const monitorAlerts = action({
  args: {
    organizationId: v.id("organizations"),
    alertTypes: v.optional(v.array(v.string())),
    forceCheck: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log(`Monitoring alerts for organization ${args.organizationId}`);
    
    const alerts: Alert[] = [];
    const alertTypes = args.alertTypes || ['cash_runway', 'dso_increase', 'unusual_transaction', 'budget_variance'];
    
    // Get current financial data
    const dateRange = getDateRange("month", 0);
    const transactions = await ctx.runQuery(api.transactionActions.getTransactionsByOrg, {
      organizationId: args.organizationId,
      dateRange,
    });
    
    const accounts = await ctx.runQuery(api.accountActions.getAccountHierarchy, {
      organizationId: args.organizationId,
    });
    
    // Get alert rules for this organization
    const alertRules = await ctx.runQuery(api.alerts.getAlertRules, {
      organizationId: args.organizationId,
    });
    
    // Check each alert type
    for (const alertType of alertTypes) {
      const typeSpecificRules = alertRules.filter(rule => rule.type === alertType && rule.isEnabled);
      
      switch (alertType) {
        case 'cash_runway':
          const cashAlerts = await checkCashRunwayAlerts(ctx, {
            organizationId: args.organizationId,
            transactions,
            accounts,
            rules: typeSpecificRules,
          });
          alerts.push(...cashAlerts);
          break;
          
        case 'dso_increase':
          const dsoAlerts = await checkDSOAlerts(ctx, {
            organizationId: args.organizationId,
            transactions,
            accounts,
            rules: typeSpecificRules,
          });
          alerts.push(...dsoAlerts);
          break;
          
        case 'unusual_transaction':
          const transactionAlerts = await checkUnusualTransactionAlerts(ctx, {
            organizationId: args.organizationId,
            transactions,
            rules: typeSpecificRules,
          });
          alerts.push(...transactionAlerts);
          break;
          
        case 'budget_variance':
          const budgetAlerts = await checkBudgetVarianceAlerts(ctx, {
            organizationId: args.organizationId,
            transactions,
            accounts,
            rules: typeSpecificRules,
          });
          alerts.push(...budgetAlerts);
          break;
      }
    }
    
    // Store and process alerts
    const processedAlerts = await processAlerts(ctx, alerts, args.organizationId);
    
    console.log(`Alert monitoring completed: ${processedAlerts.length} alerts generated`);
    return {
      alertsGenerated: processedAlerts.length,
      alerts: processedAlerts,
      monitoredTypes: alertTypes,
      timestamp: Date.now(),
    };
  },
});

// Cash Runway Alert Monitoring
async function checkCashRunwayAlerts(
  ctx: any,
  params: {
    organizationId: string;
    transactions: any[];
    accounts: any[];
    rules: AlertRule[];
  }
): Promise<Alert[]> {
  
  const alerts: Alert[] = [];
  
  // Calculate current cash position
  const cashAccounts = params.accounts.filter(acc => 
    acc.type === 'bank' || acc.type === 'cash' || acc.name.toLowerCase().includes('cash')
  );
  
  const currentCashPosition = cashAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  
  // Calculate burn rate (monthly expenses)
  const monthlyExpenses = calculateMonthlyBurnRate(params.transactions);
  const cashRunwayMonths = monthlyExpenses > 0 ? currentCashPosition / monthlyExpenses : 999;
  
  // Check against rules or default thresholds
  const thresholds = [
    { months: 3, severity: 'critical' as const, priority: 1 },
    { months: 6, severity: 'high' as const, priority: 2 },
    { months: 12, severity: 'medium' as const, priority: 3 },
    { months: 18, severity: 'low' as const, priority: 4 }
  ];
  
  for (const threshold of thresholds) {
    if (cashRunwayMonths <= threshold.months) {
      alerts.push({
        id: generateAlertId(),
        organizationId: params.organizationId,
        type: 'cash_runway',
        severity: threshold.severity,
        title: `Cash Runway Alert: ${cashRunwayMonths.toFixed(1)} months remaining`,
        description: `Current cash runway is ${cashRunwayMonths.toFixed(1)} months, below the ${threshold.months}-month threshold.`,
        detailedAnalysis: `
          Current Cash Position: $${currentCashPosition.toLocaleString()}
          Monthly Burn Rate: $${monthlyExpenses.toLocaleString()}
          Cash Runway: ${cashRunwayMonths.toFixed(1)} months
          
          Analysis:
          - Cash position has ${cashRunwayMonths < 6 ? 'critically' : 'significantly'} decreased
          - Monthly burn rate: $${monthlyExpenses.toLocaleString()}
          - At current burn rate, cash will be depleted by ${new Date(Date.now() + (cashRunwayMonths * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
        `,
        threshold: threshold.months,
        currentValue: cashRunwayMonths,
        triggerData: {
          cashPosition: currentCashPosition,
          burnRate: monthlyExpenses,
          projectedExhaustionDate: Date.now() + (cashRunwayMonths * 30 * 24 * 60 * 60 * 1000),
          cashAccounts: cashAccounts.map(acc => ({ name: acc.name, balance: acc.currentBalance }))
        },
        recommendations: [
          ...(cashRunwayMonths < 3 ? [
            "URGENT: Implement immediate cash conservation measures",
            "Accelerate collections and delay non-critical payments",
            "Consider emergency funding options or credit facilities",
            "Review all discretionary spending and defer non-essential expenses"
          ] : []),
          ...(cashRunwayMonths < 6 ? [
            "Implement cash flow monitoring and weekly reporting",
            "Negotiate extended payment terms with key vendors",
            "Focus on collecting overdue accounts receivable",
            "Consider factoring or invoice financing options"
          ] : []),
          "Develop 13-week cash flow forecast",
          "Review and optimize working capital management",
          "Analyze cash conversion cycle for improvements"
        ],
        actionRequired: cashRunwayMonths < 6,
        autoResolvable: false,
        createdAt: Date.now(),
        status: 'active',
        tags: ['cash_management', 'liquidity', 'financial_health']
      });
      
      break; // Only generate one cash runway alert (highest severity)
    }
  }
  
  return alerts;
}

// DSO (Days Sales Outstanding) Alert Monitoring
async function checkDSOAlerts(
  ctx: any,
  params: {
    organizationId: string;
    transactions: any[];
    accounts: any[];
    rules: AlertRule[];
  }
): Promise<Alert[]> {
  
  const alerts: Alert[] = [];
  
  // Calculate current DSO
  const currentDSO = calculateDSO(params.transactions, params.accounts);
  
  // Calculate previous period DSO for comparison
  const previousPeriodRange = getDateRange("month", -1);
  const previousTransactions = await ctx.runQuery(api.transactionActions.getTransactionsByOrg, {
    organizationId: params.organizationId,
    dateRange: previousPeriodRange,
  });
  
  const previousDSO = calculateDSO(previousTransactions, params.accounts);
  
  // Calculate percentage change
  const dsoChangePercent = previousDSO > 0 ? ((currentDSO - previousDSO) / previousDSO) * 100 : 0;
  
  // Check if DSO increased by more than 15% (default threshold)
  const thresholds = [
    { changePercent: 25, severity: 'critical' as const },
    { changePercent: 20, severity: 'high' as const },
    { changePercent: 15, severity: 'medium' as const },
    { changePercent: 10, severity: 'low' as const }
  ];
  
  for (const threshold of thresholds) {
    if (dsoChangePercent >= threshold.changePercent) {
      alerts.push({
        id: generateAlertId(),
        organizationId: params.organizationId,
        type: 'dso_increase',
        severity: threshold.severity,
        title: `DSO Increase Alert: ${dsoChangePercent.toFixed(1)}% increase detected`,
        description: `Days Sales Outstanding increased from ${previousDSO.toFixed(1)} to ${currentDSO.toFixed(1)} days (${dsoChangePercent.toFixed(1)}% increase).`,
        detailedAnalysis: `
          Current DSO: ${currentDSO.toFixed(1)} days
          Previous DSO: ${previousDSO.toFixed(1)} days
          Change: +${dsoChangePercent.toFixed(1)}%
          
          Analysis:
          - Collection period has extended significantly
          - This may indicate collection process deterioration
          - Could impact cash flow and working capital
          - Industry benchmark DSO: 30-45 days (varies by industry)
          
          Potential Causes:
          - Slower customer payment processing
          - Changes in customer mix or terms
          - Collection process inefficiencies
          - Economic conditions affecting customer payments
        `,
        threshold: threshold.changePercent,
        currentValue: currentDSO,
        previousValue: previousDSO,
        changePercent: dsoChangePercent,
        triggerData: {
          currentDSO,
          previousDSO,
          changePercent: dsoChangePercent,
          accountsReceivableAge: calculateARAge(params.transactions, params.accounts)
        },
        recommendations: [
          "Review accounts receivable aging report",
          "Analyze customer payment patterns and identify slow payers",
          "Implement proactive collection procedures",
          "Consider offering early payment discounts",
          "Review credit terms and approval processes",
          "Automate payment reminders and follow-ups",
          "Evaluate factoring or invoice financing options"
        ],
        actionRequired: dsoChangePercent >= 15,
        autoResolvable: false,
        createdAt: Date.now(),
        status: 'active',
        tags: ['collections', 'receivables', 'cash_conversion', 'working_capital']
      });
      
      break; // Only generate one DSO alert
    }
  }
  
  return alerts;
}

// Unusual Transaction Alert Monitoring
async function checkUnusualTransactionAlerts(
  ctx: any,
  params: {
    organizationId: string;
    transactions: any[];
    rules: AlertRule[];
  }
): Promise<Alert[]> {
  
  const alerts: Alert[] = [];
  
  // Get historical data for pattern analysis
  const historicalRange = getDateRange("month", -6);
  const historicalTransactions = await ctx.runQuery(api.transactionActions.getTransactionsByOrg, {
    organizationId: params.organizationId,
    dateRange: historicalRange,
  });
  
  // Detect various types of unusual transactions
  const anomalyTypes = [
    'large_amount',
    'weekend_transaction',
    'round_number',
    'duplicate_potential',
    'velocity_spike',
    'new_vendor'
  ];
  
  for (const anomalyType of anomalyTypes) {
    const anomalies = detectTransactionAnomalies(
      params.transactions,
      historicalTransactions,
      anomalyType
    );
    
    for (const anomaly of anomalies) {
      const severity = determineSeverity(anomaly);
      
      alerts.push({
        id: generateAlertId(),
        organizationId: params.organizationId,
        type: 'unusual_transaction',
        severity,
        title: `Unusual Transaction: ${anomaly.type}`,
        description: anomaly.description,
        detailedAnalysis: generateAnomalyAnalysis(anomaly, historicalTransactions),
        threshold: anomaly.threshold,
        currentValue: anomaly.value,
        triggerData: {
          transactionId: anomaly.transactionId,
          anomalyType: anomaly.type,
          confidence: anomaly.confidence,
          relatedTransactions: anomaly.relatedTransactions || []
        },
        recommendations: generateAnomalyRecommendations(anomaly),
        actionRequired: severity === 'high' || severity === 'critical',
        autoResolvable: anomaly.type === 'round_number' || anomaly.type === 'weekend_transaction',
        createdAt: Date.now(),
        status: 'active',
        tags: ['fraud_detection', 'transaction_monitoring', 'compliance', anomaly.type]
      });
    }
  }
  
  return alerts;
}

// Budget Variance Alert Monitoring
async function checkBudgetVarianceAlerts(
  ctx: any,
  params: {
    organizationId: string;
    transactions: any[];
    accounts: any[];
    rules: AlertRule[];
  }
): Promise<Alert[]> {
  
  const alerts: Alert[] = [];
  
  // Get budget data (would come from budget tables in real implementation)
  const budgets = await getBudgetData(ctx, params.organizationId);
  
  // Calculate actual vs budget variances by category
  const variances = calculateBudgetVariances(params.transactions, params.accounts, budgets);
  
  // Check for significant variances (default: 10% threshold)
  const thresholds = [
    { variancePercent: 25, severity: 'critical' as const },
    { variancePercent: 20, severity: 'high' as const },
    { variancePercent: 15, severity: 'medium' as const },
    { variancePercent: 10, severity: 'low' as const }
  ];
  
  for (const variance of variances) {
    for (const threshold of thresholds) {
      if (Math.abs(variance.variancePercent) >= threshold.variancePercent) {
        const isOverBudget = variance.variancePercent > 0;
        
        alerts.push({
          id: generateAlertId(),
          organizationId: params.organizationId,
          type: 'budget_variance',
          severity: threshold.severity,
          title: `Budget Variance Alert: ${variance.category} ${isOverBudget ? 'over' : 'under'} budget by ${Math.abs(variance.variancePercent).toFixed(1)}%`,
          description: `${variance.category} is ${Math.abs(variance.variancePercent).toFixed(1)}% ${isOverBudget ? 'over' : 'under'} budget ($${Math.abs(variance.varianceAmount).toLocaleString()} variance).`,
          detailedAnalysis: `
            Category: ${variance.category}
            Budgeted: $${variance.budgeted.toLocaleString()}
            Actual: $${variance.actual.toLocaleString()}
            Variance: $${variance.varianceAmount.toLocaleString()} (${variance.variancePercent.toFixed(1)}%)
            
            Analysis:
            - ${isOverBudget ? 'Overspending' : 'Underspending'} detected in ${variance.category}
            - Variance represents ${Math.abs(variance.variancePercent).toFixed(1)}% deviation from budget
            - This may indicate ${isOverBudget ? 'budget control issues' : 'delayed spending or process changes'}
            
            Contributing Factors:
            ${variance.contributingFactors?.map(f => `- ${f}`).join('\n') || '- Analysis in progress'}
          `,
          threshold: threshold.variancePercent,
          currentValue: Math.abs(variance.variancePercent),
          triggerData: {
            category: variance.category,
            budgeted: variance.budgeted,
            actual: variance.actual,
            varianceAmount: variance.varianceAmount,
            variancePercent: variance.variancePercent,
            transactions: variance.transactions
          },
          recommendations: [
            ...(isOverBudget ? [
              "Review and analyze overspending in this category",
              "Implement additional approval controls",
              "Revise budget if variance is justified by business needs",
              "Monitor closely for remainder of budget period"
            ] : [
              "Investigate reasons for underspending",
              "Confirm if activities are on track or delayed",
              "Consider reallocating budget to other priorities",
              "Update forecast if trend continues"
            ]),
            "Review budget assumptions and forecasting accuracy",
            "Implement more frequent budget monitoring"
          ],
          actionRequired: Math.abs(variance.variancePercent) >= 15,
          autoResolvable: false,
          createdAt: Date.now(),
          status: 'active',
          tags: ['budget_control', 'financial_planning', 'variance_analysis', variance.category.toLowerCase()]
        });
        
        break; // Only generate one alert per category
      }
    }
  }
  
  return alerts;
}

// Process and store alerts
async function processAlerts(ctx: any, alerts: Alert[], organizationId: string) {
  const processedAlerts = [];
  
  for (const alert of alerts) {
    // Check for duplicate alerts
    const existingAlerts = await ctx.runQuery(api.alerts.getActiveAlerts, {
      organizationId,
      type: alert.type,
    });
    
    const isDuplicate = existingAlerts.some((existing: any) => 
      existing.type === alert.type && 
      existing.status === 'active' &&
      Math.abs(existing.createdAt - alert.createdAt) < 3600000 // 1 hour
    );
    
    if (!isDuplicate) {
      // Store alert
      const alertId = await ctx.runMutation(api.alerts.createAlert, {
        alert: {
          ...alert,
          organizationId
        }
      });
      
      // Send notifications if required
      if (alert.actionRequired) {
        await sendAlertNotifications(ctx, alert, organizationId);
      }
      
      processedAlerts.push({ ...alert, id: alertId });
    }
  }
  
  return processedAlerts;
}

// Helper Functions

function calculateMonthlyBurnRate(transactions: any[]): number {
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

function calculateDSO(transactions: any[], accounts: any[]): number {
  // Calculate Days Sales Outstanding
  const revenueAccounts = accounts.filter(acc => acc.type === 'income' || acc.type === 'revenue');
  const arAccounts = accounts.filter(acc => acc.type === 'accounts_receivable');
  
  // Get revenue for the period
  const revenue = transactions
    .filter(txn => revenueAccounts.some(acc => acc._id === txn.accountId))
    .reduce((sum, txn) => sum + txn.amount, 0);
  
  // Get current AR balance
  const arBalance = arAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  
  // DSO = (AR Balance / Revenue) * Days in Period
  const daysInPeriod = 30; // Assuming monthly calculation
  return revenue > 0 ? (arBalance / revenue) * daysInPeriod : 0;
}

function calculateARAge(transactions: any[], accounts: any[]) {
  // Simplified AR aging calculation
  const arTransactions = transactions.filter(txn => txn.type === 'accounts_receivable');
  const now = Date.now();
  
  const ageBuckets = {
    current: 0,      // 0-30 days
    days_31_60: 0,   // 31-60 days
    days_61_90: 0,   // 61-90 days
    over_90: 0       // Over 90 days
  };
  
  arTransactions.forEach(txn => {
    const ageInDays = (now - txn.date) / (1000 * 60 * 60 * 24);
    
    if (ageInDays <= 30) ageBuckets.current += txn.amount;
    else if (ageInDays <= 60) ageBuckets.days_31_60 += txn.amount;
    else if (ageInDays <= 90) ageBuckets.days_61_90 += txn.amount;
    else ageBuckets.over_90 += txn.amount;
  });
  
  return ageBuckets;
}

function detectTransactionAnomalies(
  currentTransactions: any[],
  historicalTransactions: any[],
  anomalyType: string
) {
  const anomalies: any[] = [];
  
  switch (anomalyType) {
    case 'large_amount':
      const amounts = historicalTransactions.map(t => t.amount);
      const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length);
      const threshold = mean + (2 * stdDev);
      
      currentTransactions.forEach(txn => {
        if (txn.amount > threshold) {
          anomalies.push({
            transactionId: txn._id,
            type: 'large_amount',
            description: `Transaction amount $${txn.amount.toLocaleString()} exceeds normal range`,
            value: txn.amount,
            threshold,
            confidence: Math.min(0.95, (txn.amount - threshold) / threshold)
          });
        }
      });
      break;
      
    case 'weekend_transaction':
      currentTransactions.forEach(txn => {
        const txnDate = new Date(txn.date);
        if (txnDate.getDay() === 0 || txnDate.getDay() === 6) {
          anomalies.push({
            transactionId: txn._id,
            type: 'weekend_transaction',
            description: `Transaction occurred on ${txnDate.getDay() === 0 ? 'Sunday' : 'Saturday'}`,
            value: 1,
            threshold: 0,
            confidence: 0.7
          });
        }
      });
      break;
      
    case 'round_number':
      currentTransactions.forEach(txn => {
        if (txn.amount % 100 === 0 && txn.amount >= 1000) {
          anomalies.push({
            transactionId: txn._id,
            type: 'round_number',
            description: `Round number transaction: $${txn.amount.toLocaleString()}`,
            value: txn.amount,
            threshold: 1000,
            confidence: 0.6
          });
        }
      });
      break;
      
    // Additional anomaly types would be implemented here...
  }
  
  return anomalies;
}

function determineSeverity(anomaly: any): 'low' | 'medium' | 'high' | 'critical' {
  switch (anomaly.type) {
    case 'large_amount':
      if (anomaly.confidence > 0.9) return 'high';
      if (anomaly.confidence > 0.7) return 'medium';
      return 'low';
      
    case 'weekend_transaction':
      return 'low';
      
    case 'round_number':
      return anomaly.value > 10000 ? 'medium' : 'low';
      
    default:
      return 'medium';
  }
}

function generateAnomalyAnalysis(anomaly: any, historicalTransactions: any[]): string {
  return `
    Transaction Analysis:
    - Transaction ID: ${anomaly.transactionId}
    - Anomaly Type: ${anomaly.type}
    - Confidence Level: ${(anomaly.confidence * 100).toFixed(1)}%
    - Detection Method: Statistical analysis against historical patterns
    
    Context:
    - Historical transaction count: ${historicalTransactions.length}
    - Pattern deviation: ${anomaly.value > anomaly.threshold ? 'Above' : 'Below'} normal range
    - Risk Assessment: ${anomaly.confidence > 0.8 ? 'High' : anomaly.confidence > 0.5 ? 'Medium' : 'Low'}
  `;
}

function generateAnomalyRecommendations(anomaly: any): string[] {
  const baseRecommendations = [
    "Review transaction details and supporting documentation",
    "Verify transaction authorization and approval",
    "Check for proper business justification"
  ];
  
  switch (anomaly.type) {
    case 'large_amount':
      return [
        ...baseRecommendations,
        "Implement additional approval controls for large transactions",
        "Verify vendor legitimacy and payment details",
        "Consider splitting large payments where appropriate"
      ];
      
    case 'weekend_transaction':
      return [
        ...baseRecommendations,
        "Review weekend transaction policies",
        "Verify if emergency payment was justified",
        "Consider restricting non-emergency weekend transactions"
      ];
      
    case 'round_number':
      return [
        ...baseRecommendations,
        "Verify if round amounts are estimates that need adjustment",
        "Review invoicing and payment processes",
        "Ensure accurate amount reporting"
      ];
      
    default:
      return baseRecommendations;
  }
}

function calculateBudgetVariances(transactions: any[], accounts: any[], budgets: any[]) {
  // This would implement actual budget variance calculation
  // For now, returning mock variance data
  return [
    {
      category: 'Marketing Expenses',
      budgeted: 50000,
      actual: 62000,
      varianceAmount: 12000,
      variancePercent: 24,
      transactions: transactions.filter(t => t.category === 'marketing'),
      contributingFactors: ['Increased digital advertising spend', 'New campaign launch']
    },
    {
      category: 'Office Supplies',
      budgeted: 5000,
      actual: 3200,
      varianceAmount: -1800,
      variancePercent: -36,
      transactions: transactions.filter(t => t.category === 'office_supplies'),
      contributingFactors: ['Remote work reducing office supply needs']
    }
  ];
}

async function getBudgetData(ctx: any, organizationId: string) {
  // This would query actual budget tables
  // For now, return mock budget data
  return [
    { category: 'Marketing Expenses', budgeted: 50000, period: 'monthly' },
    { category: 'Office Supplies', budgeted: 5000, period: 'monthly' },
    { category: 'Travel & Entertainment', budgeted: 15000, period: 'monthly' },
  ];
}

async function sendAlertNotifications(ctx: any, alert: Alert, organizationId: string) {
  // This would implement actual notification sending (email, SMS, in-app)
  console.log(`Sending notifications for ${alert.type} alert (${alert.severity})`);
  
  // Get notification preferences for organization
  // Send via configured channels (email, Slack, Teams, etc.)
  
  return true;
}

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Query and Mutation Functions for Alert Management

export const getActiveAlerts = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.optional(v.string()),
    severity: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // This would query the alerts table
    // For now, return empty array
    return [];
  },
});

export const getAlertRules = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This would query alert rules table
    // For now, return default rules
    return [
      {
        id: 'default_cash_runway',
        organizationId: args.organizationId,
        type: 'cash_runway',
        name: 'Cash Runway Monitor',
        description: 'Monitor cash runway and alert when below thresholds',
        conditions: [
          { metric: 'cash_runway_months', operator: 'lt' as const, threshold: 6 }
        ],
        severity: 'high' as const,
        isEnabled: true,
        frequency: 'daily' as const,
        recipients: ['finance@company.com']
      }
    ];
  },
});

export const createAlert = mutation({
  args: {
    alert: v.object({
      organizationId: v.string(),
      type: v.string(),
      severity: v.string(),
      title: v.string(),
      description: v.string(),
      detailedAnalysis: v.string(),
      threshold: v.number(),
      currentValue: v.number(),
      previousValue: v.optional(v.number()),
      changePercent: v.optional(v.number()),
      triggerData: v.any(),
      recommendations: v.array(v.string()),
      actionRequired: v.boolean(),
      autoResolvable: v.boolean(),
      createdAt: v.number(),
      status: v.string(),
      tags: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // This would insert into alerts table
    // For now, return mock ID
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  },
});

export const acknowledgeAlert = mutation({
  args: {
    alertId: v.string(),
    userId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This would update alert status to 'acknowledged'
    console.log(`Alert ${args.alertId} acknowledged by ${args.userId}`);
    return true;
  },
});

export const resolveAlert = mutation({
  args: {
    alertId: v.string(),
    userId: v.optional(v.id("users")),
    resolution: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This would update alert status to 'resolved'
    console.log(`Alert ${args.alertId} resolved: ${args.resolution}`);
    return true;
  },
});

export const suppressAlert = mutation({
  args: {
    alertId: v.string(),
    suppressionDuration: v.number(), // minutes
    reason: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // This would update alert status to 'suppressed' with expiration
    console.log(`Alert ${args.alertId} suppressed for ${args.suppressionDuration} minutes`);
    return true;
  },
});

export const createAlertRule = mutation({
  args: {
    rule: v.object({
      organizationId: v.string(),
      type: v.string(),
      name: v.string(),
      description: v.string(),
      conditions: v.array(v.object({
        metric: v.string(),
        operator: v.string(),
        threshold: v.number(),
        timeframe: v.optional(v.string()),
        comparison: v.optional(v.string()),
      })),
      severity: v.string(),
      isEnabled: v.boolean(),
      frequency: v.string(),
      recipients: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // This would insert into alert_rules table
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  },
});