import { v } from "convex/values";
import { action, query, mutation } from "../_generated/server";
import { api } from "../_generated/api";
import { getDateRange } from "../utils";

/**
 * Predictive Models for Financial Forecasting
 * Includes linear regression, seasonal adjustments, Monte Carlo simulation, and risk scoring
 */

// Type definitions for predictive models
export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  correlation: number;
  r_squared: number;
  predictions: number[];
  confidence_intervals: Array<{ lower: number; upper: number }>;
}

export interface SeasonalAdjustment {
  seasonalFactors: number[];
  deseasonalizedData: number[];
  trend: number[];
  adjustedPredictions: number[];
}

export interface MonteCarloResult {
  scenarios: number;
  mean: number;
  median: number;
  standardDeviation: number;
  percentiles: {
    p10: number;
    p25: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  riskMetrics: {
    valueAtRisk: number;
    expectedShortfall: number;
    probabilityOfLoss: number;
  };
}

export interface RiskScore {
  overallScore: number;
  components: {
    creditRisk: number;
    liquidityRisk: number;
    operationalRisk: number;
    marketRisk: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
}

// Cash Flow Prediction using Linear Regression
export const predictCashFlow = action({
  args: {
    organizationId: v.id("organizations"),
    periodsToForecast: v.number(),
    includeSeasonality: v.optional(v.boolean()),
    confidenceLevel: v.optional(v.number()), // 0.8, 0.9, 0.95
  },
  handler: async (ctx, args) => {
    console.log(`Predicting cash flow for org ${args.organizationId}, ${args.periodsToForecast} periods`);
    
    // Get historical cash flow data
    const dateRange = getDateRange("month", -24); // Last 24 months
    const transactions = await ctx.runQuery(api.transactionActions.getTransactionsByOrg, {
      organizationId: args.organizationId,
      dateRange,
    });
    
    const accounts = await ctx.runQuery(api.accountActions.getAccountHierarchy, {
      organizationId: args.organizationId,
    });
    
    // Calculate historical cash flows
    const historicalCashFlows = calculateMonthlyCashFlows(transactions, dateRange);
    
    // Apply linear regression
    const regressionResult = performLinearRegression(
      historicalCashFlows, 
      args.periodsToForecast,
      args.confidenceLevel || 0.95
    );
    
    let finalPredictions = regressionResult.predictions;
    let seasonalAdjustment: SeasonalAdjustment | null = null;
    
    // Apply seasonal adjustments if requested
    if (args.includeSeasonality) {
      seasonalAdjustment = applySeasonalAdjustment(historicalCashFlows, regressionResult.predictions);
      finalPredictions = seasonalAdjustment.adjustedPredictions;
    }
    
    // Store prediction results
    const predictionId = await ctx.runMutation(api.predictiveModels.storePrediction, {
      organizationId: args.organizationId,
      modelType: "cash_flow_linear_regression",
      predictions: finalPredictions,
      metadata: {
        periodsForecasted: args.periodsToForecast,
        includeSeasonality: args.includeSeasonality,
        rSquared: regressionResult.r_squared,
        correlation: regressionResult.correlation,
      },
    });
    
    return {
      predictionId,
      regressionResult,
      seasonalAdjustment,
      finalPredictions,
      metadata: {
        historicalDataPoints: historicalCashFlows.length,
        modelAccuracy: regressionResult.r_squared,
        generatedAt: Date.now(),
      },
    };
  },
});

// Monte Carlo Simulation for Scenario Planning
export const runMonteCarloSimulation = action({
  args: {
    organizationId: v.id("organizations"),
    scenarios: v.number(), // Number of simulations to run
    timeHorizon: v.number(), // Months to simulate
    parameters: v.object({
      revenueVolatility: v.number(),
      expenseVolatility: v.number(),
      seasonalityFactor: v.optional(v.number()),
      marketConditions: v.optional(v.union(
        v.literal("optimistic"),
        v.literal("neutral"), 
        v.literal("pessimistic")
      )),
    }),
  },
  handler: async (ctx, args) => {
    console.log(`Running Monte Carlo simulation: ${args.scenarios} scenarios over ${args.timeHorizon} months`);
    
    // Get base financial data
    const dateRange = getDateRange("month", -12);
    const transactions = await ctx.runQuery(api.transactionActions.getTransactionsByOrg, {
      organizationId: args.organizationId,
      dateRange,
    });
    
    // Calculate baseline metrics
    const baselineMetrics = calculateBaselineMetrics(transactions);
    
    // Run Monte Carlo simulation
    const simulationResults = performMonteCarloSimulation(
      baselineMetrics,
      args.scenarios,
      args.timeHorizon,
      args.parameters
    );
    
    // Store simulation results
    const simulationId = await ctx.runMutation(api.predictiveModels.storeSimulation, {
      organizationId: args.organizationId,
      modelType: "monte_carlo_cash_flow",
      results: simulationResults,
      parameters: args.parameters,
    });
    
    return {
      simulationId,
      results: simulationResults,
      interpretation: interpretMonteCarloResults(simulationResults),
      recommendations: generateScenarioRecommendations(simulationResults, baselineMetrics),
    };
  },
});

// Customer Payment Risk Scoring
export const scoreCustomerPaymentRisk = action({
  args: {
    organizationId: v.id("organizations"),
    customerId: v.optional(v.string()),
    includeAllCustomers: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log(`Scoring payment risk for org ${args.organizationId}`);
    
    // Get customer transaction history
    const dateRange = getDateRange("month", -18); // 18 months of data
    const transactions = await ctx.runQuery(api.transactionActions.getTransactionsByOrg, {
      organizationId: args.organizationId,
      dateRange,
    });
    
    let customerRiskScores: { [customerId: string]: RiskScore } = {};
    
    if (args.includeAllCustomers) {
      // Score all customers
      const customers = getUniqueCustomers(transactions);
      for (const customer of customers) {
        customerRiskScores[customer.id] = calculateCustomerRiskScore(
          customer,
          transactions.filter(t => t.customerId === customer.id)
        );
      }
    } else if (args.customerId) {
      // Score specific customer
      const customerTransactions = transactions.filter(t => t.customerId === args.customerId);
      const customer = getCustomerById(args.customerId, transactions);
      if (customer) {
        customerRiskScores[args.customerId] = calculateCustomerRiskScore(customer, customerTransactions);
      }
    }
    
    // Store risk scores
    const riskAnalysisId = await ctx.runMutation(api.predictiveModels.storeRiskAnalysis, {
      organizationId: args.organizationId,
      analysisType: "customer_payment_risk",
      riskScores: customerRiskScores,
    });
    
    return {
      riskAnalysisId,
      customerRiskScores,
      summary: generateRiskSummary(customerRiskScores),
      recommendations: generateRiskMitigationRecommendations(customerRiskScores),
    };
  },
});

// Seasonal Adjustment Algorithm
export const applySeasonalAdjustments = action({
  args: {
    organizationId: v.id("organizations"),
    dataType: v.union(
      v.literal("revenue"),
      v.literal("expenses"),
      v.literal("cash_flow")
    ),
    periods: v.number(), // Number of periods to forecast with seasonal adjustment
  },
  handler: async (ctx, args) => {
    console.log(`Applying seasonal adjustments for ${args.dataType}`);
    
    // Get historical data
    const dateRange = getDateRange("month", -36); // 3 years for seasonal patterns
    const transactions = await ctx.runQuery(api.transactionActions.getTransactionsByOrg, {
      organizationId: args.organizationId,
      dateRange,
    });
    
    // Extract time series based on data type
    let timeSeries: number[] = [];
    switch (args.dataType) {
      case "revenue":
        timeSeries = extractRevenueSeries(transactions, dateRange);
        break;
      case "expenses":
        timeSeries = extractExpenseSeries(transactions, dateRange);
        break;
      case "cash_flow":
        timeSeries = extractCashFlowSeries(transactions, dateRange);
        break;
    }
    
    // Apply seasonal decomposition
    const seasonalDecomposition = performSeasonalDecomposition(timeSeries);
    
    // Generate forecasts with seasonal adjustments
    const seasonalForecasts = generateSeasonalForecasts(
      seasonalDecomposition,
      args.periods
    );
    
    return {
      historicalData: timeSeries,
      seasonalDecomposition,
      forecasts: seasonalForecasts,
      seasonalPatterns: analyzeSeasonalPatterns(seasonalDecomposition.seasonalFactors),
    };
  },
});

// Store prediction results
export const storePrediction = mutation({
  args: {
    organizationId: v.id("organizations"),
    modelType: v.string(),
    predictions: v.array(v.number()),
    metadata: v.object({}),
  },
  handler: async (ctx, args) => {
    // This would store in a predictions table
    // For now, return a mock ID
    return `pred_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  },
});

// Store simulation results
export const storeSimulation = mutation({
  args: {
    organizationId: v.id("organizations"),
    modelType: v.string(),
    results: v.object({}),
    parameters: v.object({}),
  },
  handler: async (ctx, args) => {
    // This would store in a simulations table
    return `sim_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  },
});

// Store risk analysis
export const storeRiskAnalysis = mutation({
  args: {
    organizationId: v.id("organizations"),
    analysisType: v.string(),
    riskScores: v.object({}),
  },
  handler: async (ctx, args) => {
    // This would store in a risk_analyses table
    return `risk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  },
});

// Helper Functions for Predictive Models

function calculateMonthlyCashFlows(transactions: any[], dateRange: { start: number; end: number }): number[] {
  const monthlyFlows: { [month: string]: number } = {};
  
  // Generate all months in range
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    const monthKey = d.toISOString().substring(0, 7);
    monthlyFlows[monthKey] = 0;
  }
  
  // Aggregate transactions by month
  transactions.forEach(txn => {
    if (txn.date >= dateRange.start && txn.date <= dateRange.end) {
      const monthKey = new Date(txn.date).toISOString().substring(0, 7);
      const amount = txn.type === 'income' ? txn.amount : -txn.amount;
      monthlyFlows[monthKey] += amount;
    }
  });
  
  return Object.values(monthlyFlows);
}

function performLinearRegression(
  data: number[], 
  periodsToForecast: number, 
  confidenceLevel: number
): LinearRegressionResult {
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = data;
  
  // Calculate linear regression parameters
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate correlation and R-squared
  const correlation = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  const r_squared = correlation * correlation;
  
  // Generate predictions
  const predictions: number[] = [];
  const confidence_intervals: Array<{ lower: number; upper: number }> = [];
  
  // Calculate standard error for confidence intervals
  const yPred = x.map(val => slope * val + intercept);
  const residuals = y.map((val, i) => val - yPred[i]);
  const mse = residuals.reduce((sum, res) => sum + res * res, 0) / (n - 2);
  const standardError = Math.sqrt(mse);
  
  // Z-score for confidence level
  const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.90 ? 1.645 : 2.576;
  
  for (let i = 0; i < periodsToForecast; i++) {
    const xNext = n + i;
    const prediction = slope * xNext + intercept;
    predictions.push(prediction);
    
    const margin = zScore * standardError * Math.sqrt(1 + 1/n + Math.pow(xNext - sumX/n, 2) / sumXX);
    confidence_intervals.push({
      lower: prediction - margin,
      upper: prediction + margin
    });
  }
  
  return {
    slope,
    intercept,
    correlation,
    r_squared,
    predictions,
    confidence_intervals
  };
}

function applySeasonalAdjustment(
  historicalData: number[], 
  basePredictions: number[]
): SeasonalAdjustment {
  // Calculate seasonal factors (assumes monthly data)
  const monthlyAverages: number[] = new Array(12).fill(0);
  const monthlyCounts: number[] = new Array(12).fill(0);
  
  historicalData.forEach((value, index) => {
    const monthIndex = index % 12;
    monthlyAverages[monthIndex] += value;
    monthlyCounts[monthIndex]++;
  });
  
  // Calculate average for each month
  for (let i = 0; i < 12; i++) {
    if (monthlyCounts[i] > 0) {
      monthlyAverages[i] /= monthlyCounts[i];
    }
  }
  
  // Calculate overall average
  const overallAverage = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / 12;
  
  // Calculate seasonal factors (ratio to overall average)
  const seasonalFactors = monthlyAverages.map(avg => avg / overallAverage);
  
  // Deseasonalize historical data
  const deseasonalizedData = historicalData.map((value, index) => {
    const monthIndex = index % 12;
    return value / seasonalFactors[monthIndex];
  });
  
  // Calculate trend (simplified linear trend)
  const trend = calculateTrend(deseasonalizedData);
  
  // Apply seasonal adjustment to predictions
  const currentMonth = new Date().getMonth();
  const adjustedPredictions = basePredictions.map((prediction, index) => {
    const monthIndex = (currentMonth + index + 1) % 12;
    return prediction * seasonalFactors[monthIndex];
  });
  
  return {
    seasonalFactors,
    deseasonalizedData,
    trend,
    adjustedPredictions
  };
}

function calculateTrend(data: number[]): number[] {
  // Simple moving average trend
  const windowSize = Math.min(6, Math.floor(data.length / 4));
  const trend: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, start + windowSize);
    const windowData = data.slice(start, end);
    const average = windowData.reduce((sum, val) => sum + val, 0) / windowData.length;
    trend.push(average);
  }
  
  return trend;
}

function performMonteCarloSimulation(
  baseline: any, 
  scenarios: number, 
  timeHorizon: number, 
  parameters: any
): MonteCarloResult {
  const results: number[] = [];
  
  for (let scenario = 0; scenario < scenarios; scenario++) {
    let cashFlow = baseline.currentCash;
    
    for (let month = 0; month < timeHorizon; month++) {
      // Generate random variations based on volatility
      const revenueVariation = generateNormalRandom(0, parameters.revenueVolatility);
      const expenseVariation = generateNormalRandom(0, parameters.expenseVolatility);
      
      let monthlyRevenue = baseline.avgMonthlyRevenue * (1 + revenueVariation);
      let monthlyExpenses = baseline.avgMonthlyExpenses * (1 + expenseVariation);
      
      // Apply market conditions adjustment
      if (parameters.marketConditions === 'optimistic') {
        monthlyRevenue *= 1.1;
        monthlyExpenses *= 0.95;
      } else if (parameters.marketConditions === 'pessimistic') {
        monthlyRevenue *= 0.9;
        monthlyExpenses *= 1.05;
      }
      
      // Apply seasonality if provided
      if (parameters.seasonalityFactor) {
        const seasonalAdjustment = Math.sin((month / 12) * 2 * Math.PI) * parameters.seasonalityFactor;
        monthlyRevenue *= (1 + seasonalAdjustment);
      }
      
      cashFlow += monthlyRevenue - monthlyExpenses;
    }
    
    results.push(cashFlow);
  }
  
  // Sort results for percentile calculations
  results.sort((a, b) => a - b);
  
  const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
  const median = results[Math.floor(results.length / 2)];
  
  // Calculate standard deviation
  const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Calculate percentiles
  const percentiles = {
    p10: results[Math.floor(results.length * 0.10)],
    p25: results[Math.floor(results.length * 0.25)],
    p75: results[Math.floor(results.length * 0.75)],
    p90: results[Math.floor(results.length * 0.90)],
    p95: results[Math.floor(results.length * 0.95)],
    p99: results[Math.floor(results.length * 0.99)]
  };
  
  // Calculate risk metrics
  const negativeResults = results.filter(val => val < baseline.currentCash);
  const valueAtRisk = percentiles.p10; // 10% VaR
  const expectedShortfall = negativeResults.length > 0 
    ? negativeResults.reduce((sum, val) => sum + val, 0) / negativeResults.length 
    : 0;
  const probabilityOfLoss = negativeResults.length / results.length;
  
  return {
    scenarios: scenarios,
    mean,
    median,
    standardDeviation,
    percentiles,
    riskMetrics: {
      valueAtRisk,
      expectedShortfall,
      probabilityOfLoss
    }
  };
}

function generateNormalRandom(mean: number, stdDev: number): number {
  // Box-Muller transformation for normal distribution
  let u1 = Math.random();
  let u2 = Math.random();
  
  while (u1 === 0) u1 = Math.random(); // Converting [0,1) to (0,1)
  while (u2 === 0) u2 = Math.random();
  
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}

function calculateBaselineMetrics(transactions: any[]) {
  const revenue = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthCount = Math.max(1, Math.ceil(transactions.length / 30)); // Rough estimate
  
  return {
    currentCash: 100000, // This would come from actual cash accounts
    avgMonthlyRevenue: revenue / monthCount,
    avgMonthlyExpenses: expenses / monthCount,
    totalRevenue: revenue,
    totalExpenses: expenses,
    netCashFlow: revenue - expenses
  };
}

function calculateCustomerRiskScore(customer: any, transactions: any[]): RiskScore {
  // Calculate various risk components
  const paymentHistory = analyzePaymentHistory(transactions);
  const creditRisk = calculateCreditRisk(customer, paymentHistory);
  const liquidityRisk = calculateLiquidityRisk(transactions);
  const operationalRisk = calculateOperationalRisk(customer, transactions);
  const marketRisk = calculateMarketRisk(customer);
  
  // Weight the components
  const weights = { credit: 0.4, liquidity: 0.3, operational: 0.2, market: 0.1 };
  const overallScore = (
    creditRisk * weights.credit +
    liquidityRisk * weights.liquidity +
    operationalRisk * weights.operational +
    marketRisk * weights.market
  );
  
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (overallScore >= 80) riskLevel = 'critical';
  else if (overallScore >= 60) riskLevel = 'high';
  else if (overallScore >= 40) riskLevel = 'medium';
  else riskLevel = 'low';
  
  const factors = [
    {
      name: 'Payment History',
      impact: creditRisk,
      description: paymentHistory.onTimeRate < 0.8 ? 'Frequent late payments' : 'Good payment history'
    },
    {
      name: 'Transaction Volume',
      impact: liquidityRisk,
      description: 'Based on transaction frequency and amounts'
    },
    {
      name: 'Account Age',
      impact: operationalRisk,
      description: 'Customer relationship duration'
    }
  ];
  
  return {
    overallScore,
    components: {
      creditRisk,
      liquidityRisk,
      operationalRisk,
      marketRisk
    },
    riskLevel,
    factors
  };
}

// Additional helper functions would be implemented here...
function analyzePaymentHistory(transactions: any[]) {
  const totalPayments = transactions.length;
  const latePayments = transactions.filter(t => t.daysLate && t.daysLate > 0).length;
  const onTimeRate = totalPayments > 0 ? (totalPayments - latePayments) / totalPayments : 1;
  const avgDaysLate = transactions
    .filter(t => t.daysLate && t.daysLate > 0)
    .reduce((sum, t) => sum + t.daysLate, 0) / Math.max(1, latePayments);
  
  return { onTimeRate, avgDaysLate, totalPayments, latePayments };
}

function calculateCreditRisk(customer: any, paymentHistory: any): number {
  let score = 0;
  
  // Payment history (40% of credit risk)
  score += (1 - paymentHistory.onTimeRate) * 40;
  
  // Average days late (30% of credit risk)
  if (paymentHistory.avgDaysLate > 30) score += 30;
  else if (paymentHistory.avgDaysLate > 15) score += 20;
  else if (paymentHistory.avgDaysLate > 0) score += 10;
  
  // Account age (30% of credit risk) - newer accounts are riskier
  const accountAgeMonths = customer.accountAge || 12;
  if (accountAgeMonths < 6) score += 30;
  else if (accountAgeMonths < 12) score += 15;
  
  return Math.min(100, score);
}

function calculateLiquidityRisk(transactions: any[]): number {
  // Simplified liquidity risk based on transaction patterns
  const transactionAmounts = transactions.map(t => t.amount);
  const avgAmount = transactionAmounts.reduce((sum, amt) => sum + amt, 0) / transactionAmounts.length;
  const totalAmount = transactionAmounts.reduce((sum, amt) => sum + amt, 0);
  
  let score = 0;
  
  // Large concentrated amounts increase risk
  if (totalAmount > 100000) score += 20;
  if (avgAmount > 10000) score += 15;
  
  // Infrequent large transactions increase risk
  if (transactions.length < 5 && avgAmount > 5000) score += 25;
  
  return Math.min(100, score);
}

function calculateOperationalRisk(customer: any, transactions: any[]): number {
  // Simplified operational risk scoring
  let score = 0;
  
  // Transaction complexity
  const complexTransactions = transactions.filter(t => t.isComplex || t.multipleEntries);
  if (complexTransactions.length / transactions.length > 0.3) score += 20;
  
  // Customer industry risk (would be based on actual industry data)
  const highRiskIndustries = ['construction', 'retail', 'restaurant'];
  if (highRiskIndustries.includes(customer.industry)) score += 15;
  
  return Math.min(100, score);
}

function calculateMarketRisk(customer: any): number {
  // Simplified market risk - would be enhanced with actual market data
  let score = 0;
  
  // Geographic concentration
  if (customer.region === 'single_location') score += 10;
  
  // Industry volatility (simplified)
  const volatileIndustries = ['technology', 'energy', 'retail'];
  if (volatileIndustries.includes(customer.industry)) score += 15;
  
  return Math.min(100, score);
}

function getUniqueCustomers(transactions: any[]) {
  const customerMap = new Map();
  transactions.forEach(t => {
    if (t.customerId && !customerMap.has(t.customerId)) {
      customerMap.set(t.customerId, {
        id: t.customerId,
        name: t.customerName || `Customer ${t.customerId}`,
        industry: t.customerIndustry || 'unknown',
        region: t.customerRegion || 'unknown',
        accountAge: t.customerAccountAge || 12
      });
    }
  });
  return Array.from(customerMap.values());
}

function getCustomerById(customerId: string, transactions: any[]) {
  const customerTransaction = transactions.find(t => t.customerId === customerId);
  if (customerTransaction) {
    return {
      id: customerId,
      name: customerTransaction.customerName || `Customer ${customerId}`,
      industry: customerTransaction.customerIndustry || 'unknown',
      region: customerTransaction.customerRegion || 'unknown',
      accountAge: customerTransaction.customerAccountAge || 12
    };
  }
  return null;
}

function extractRevenueSeries(transactions: any[], dateRange: { start: number; end: number }): number[] {
  return extractTimeSeries(transactions.filter(t => t.type === 'income'), dateRange);
}

function extractExpenseSeries(transactions: any[], dateRange: { start: number; end: number }): number[] {
  return extractTimeSeries(transactions.filter(t => t.type === 'expense'), dateRange);
}

function extractCashFlowSeries(transactions: any[], dateRange: { start: number; end: number }): number[] {
  return calculateMonthlyCashFlows(transactions, dateRange);
}

function extractTimeSeries(transactions: any[], dateRange: { start: number; end: number }): number[] {
  const monthlyAmounts: { [month: string]: number } = {};
  
  // Initialize all months with zero
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    const monthKey = d.toISOString().substring(0, 7);
    monthlyAmounts[monthKey] = 0;
  }
  
  // Aggregate by month
  transactions.forEach(txn => {
    if (txn.date >= dateRange.start && txn.date <= dateRange.end) {
      const monthKey = new Date(txn.date).toISOString().substring(0, 7);
      monthlyAmounts[monthKey] += txn.amount;
    }
  });
  
  return Object.values(monthlyAmounts);
}

function performSeasonalDecomposition(timeSeries: number[]) {
  // Simplified seasonal decomposition using moving averages
  const seasonalFactors = calculateSeasonalFactors(timeSeries);
  const deseasonalized = timeSeries.map((value, index) => 
    value / seasonalFactors[index % 12]
  );
  const trend = calculateTrend(deseasonalized);
  
  return { seasonalFactors, deseasonalized, trend };
}

function calculateSeasonalFactors(timeSeries: number[]): number[] {
  const monthlyTotals = new Array(12).fill(0);
  const monthlyCounts = new Array(12).fill(0);
  
  timeSeries.forEach((value, index) => {
    const monthIndex = index % 12;
    monthlyTotals[monthIndex] += value;
    monthlyCounts[monthIndex]++;
  });
  
  const monthlyAverages = monthlyTotals.map((total, index) => 
    monthlyCounts[index] > 0 ? total / monthlyCounts[index] : 0
  );
  
  const overallAverage = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / 12;
  
  return monthlyAverages.map(avg => overallAverage > 0 ? avg / overallAverage : 1);
}

function generateSeasonalForecasts(decomposition: any, periods: number) {
  // Generate forecasts using trend and seasonal components
  const { trend, seasonalFactors } = decomposition;
  const lastTrendValue = trend[trend.length - 1];
  const trendSlope = trend.length > 1 ? 
    (trend[trend.length - 1] - trend[trend.length - 2]) : 0;
  
  const forecasts = [];
  for (let i = 0; i < periods; i++) {
    const trendForecast = lastTrendValue + (trendSlope * (i + 1));
    const monthIndex = (new Date().getMonth() + i) % 12;
    const seasonalForecast = trendForecast * seasonalFactors[monthIndex];
    forecasts.push(seasonalForecast);
  }
  
  return forecasts;
}

function analyzeSeasonalPatterns(seasonalFactors: number[]) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const patterns = seasonalFactors.map((factor, index) => ({
    month: monthNames[index],
    factor,
    trend: factor > 1.1 ? 'high' : factor < 0.9 ? 'low' : 'normal'
  }));
  
  const peakMonth = patterns.reduce((max, curr) => 
    curr.factor > max.factor ? curr : max
  );
  
  const troughMonth = patterns.reduce((min, curr) => 
    curr.factor < min.factor ? curr : min
  );
  
  return {
    monthlyPatterns: patterns,
    peakMonth: peakMonth.month,
    troughMonth: troughMonth.month,
    seasonalityStrength: peakMonth.factor - troughMonth.factor
  };
}

function interpretMonteCarloResults(results: MonteCarloResult) {
  const interpretation = {
    outlook: results.riskMetrics.probabilityOfLoss < 0.1 ? 'positive' : 
             results.riskMetrics.probabilityOfLoss < 0.3 ? 'neutral' : 'concerning',
    keyFindings: [],
    riskAssessment: 'medium'
  };
  
  if (results.riskMetrics.probabilityOfLoss > 0.5) {
    interpretation.keyFindings.push('High probability of cash flow challenges');
    interpretation.riskAssessment = 'high';
  }
  
  if (results.standardDeviation / Math.abs(results.mean) > 0.5) {
    interpretation.keyFindings.push('High volatility in projected outcomes');
  }
  
  if (results.percentiles.p90 > results.mean * 1.5) {
    interpretation.keyFindings.push('Strong upside potential in best-case scenarios');
  }
  
  return interpretation;
}

function generateScenarioRecommendations(results: MonteCarloResult, baseline: any) {
  const recommendations = [];
  
  if (results.riskMetrics.probabilityOfLoss > 0.3) {
    recommendations.push({
      priority: 'high',
      action: 'Implement cash conservation measures',
      rationale: 'High probability of negative cash flow scenarios'
    });
  }
  
  if (results.standardDeviation > baseline.avgMonthlyRevenue) {
    recommendations.push({
      priority: 'medium',
      action: 'Diversify revenue streams',
      rationale: 'High variability in cash flow projections'
    });
  }
  
  if (results.percentiles.p10 < 0) {
    recommendations.push({
      priority: 'high',
      action: 'Secure emergency credit line',
      rationale: 'Worst-case scenarios show potential cash shortfall'
    });
  }
  
  return recommendations;
}

function generateRiskSummary(riskScores: { [customerId: string]: RiskScore }) {
  const scores = Object.values(riskScores);
  const totalCustomers = scores.length;
  
  const riskDistribution = {
    low: scores.filter(s => s.riskLevel === 'low').length,
    medium: scores.filter(s => s.riskLevel === 'medium').length,
    high: scores.filter(s => s.riskLevel === 'high').length,
    critical: scores.filter(s => s.riskLevel === 'critical').length
  };
  
  const avgScore = scores.reduce((sum, s) => sum + s.overallScore, 0) / totalCustomers;
  
  return {
    totalCustomers,
    riskDistribution,
    averageRiskScore: avgScore,
    highRiskCustomers: scores.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length
  };
}

function generateRiskMitigationRecommendations(riskScores: { [customerId: string]: RiskScore }) {
  const highRiskCustomers = Object.entries(riskScores)
    .filter(([_, score]) => score.riskLevel === 'high' || score.riskLevel === 'critical');
  
  const recommendations = [];
  
  if (highRiskCustomers.length > 0) {
    recommendations.push({
      priority: 'high',
      action: `Review credit terms for ${highRiskCustomers.length} high-risk customers`,
      details: highRiskCustomers.map(([id, score]) => ({ customerId: id, riskLevel: score.riskLevel }))
    });
  }
  
  // Add more specific recommendations based on common risk factors
  const commonRiskFactors = Object.values(riskScores)
    .flatMap(score => score.factors.filter(f => f.impact > 50))
    .reduce((acc, factor) => {
      acc[factor.name] = (acc[factor.name] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  
  Object.entries(commonRiskFactors)
    .filter(([_, count]) => count > 2)
    .forEach(([factor, count]) => {
      recommendations.push({
        priority: 'medium',
        action: `Address systemic ${factor.toLowerCase()} issues`,
        details: `${count} customers affected by ${factor} risk factors`
      });
    });
  
  return recommendations;
}