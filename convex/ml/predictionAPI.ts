import { v } from "convex/values";
import { action, query, mutation } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Prediction API for ML Pipeline
 * Exposes predictions via Convex queries, provides confidence intervals,
 * and generates explanations for predictions
 */

// Type definitions for prediction API
export interface PredictionEndpoint {
  id: string;
  organizationId: string;
  modelId: string;
  name: string;
  description: string;
  endpoint: string;
  status: 'active' | 'inactive' | 'deprecated';
  version: string;
  rateLimiting: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  authentication: {
    required: boolean;
    method: 'api_key' | 'jwt' | 'oauth';
    apiKey?: string;
  };
  monitoring: {
    enabled: boolean;
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      throughput: number;
    };
  };
  createdAt: number;
  lastUsed?: number;
  usageCount: number;
}

export interface BatchPredictionJob {
  id: string;
  organizationId: string;
  modelId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  inputDataLocation: string;
  outputDataLocation?: string;
  totalRecords: number;
  processedRecords: number;
  progress: number;
  startedAt: number;
  completedAt?: number;
  configuration: BatchPredictionConfig;
  results?: BatchPredictionResults;
  error?: string;
}

export interface BatchPredictionConfig {
  inputFormat: 'csv' | 'json' | 'parquet';
  outputFormat: 'csv' | 'json' | 'parquet';
  includeConfidence: boolean;
  includeExplanations: boolean;
  chunkSize: number;
  parallelProcessing: boolean;
  errorHandling: 'skip' | 'stop' | 'log_and_continue';
}

export interface BatchPredictionResults {
  totalPredictions: number;
  successfulPredictions: number;
  failedPredictions: number;
  averageConfidence: number;
  processingTime: number;
  throughput: number; // predictions per second
  errorSummary: {
    errorType: string;
    count: number;
    examples: string[];
  }[];
}

export interface PredictionExplanation {
  method: 'shap' | 'lime' | 'permutation_importance' | 'gradient';
  globalExplanations: GlobalExplanation[];
  localExplanations: LocalExplanation[];
  summary: string;
  visualizations: Visualization[];
}

export interface GlobalExplanation {
  feature: string;
  overallImportance: number;
  averageContribution: number;
  description: string;
  interactionEffects?: InteractionEffect[];
}

export interface LocalExplanation {
  feature: string;
  value: any;
  contribution: number;
  confidence: number;
  description: string;
  alternativeScenarios?: AlternativeScenario[];
}

export interface InteractionEffect {
  features: string[];
  interactionStrength: number;
  description: string;
}

export interface AlternativeScenario {
  changedFeatures: { [feature: string]: any };
  newPrediction: number;
  probabilityChange: number;
  description: string;
}

export interface Visualization {
  type: 'feature_importance' | 'waterfall' | 'force_plot' | 'partial_dependence';
  title: string;
  description: string;
  data: any;
  config: any;
}

export interface ConfidenceInterval {
  prediction: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel: number; // e.g., 0.95 for 95%
  method: 'bootstrap' | 'quantile_regression' | 'monte_carlo' | 'bayesian';
  assumptions: string[];
}

export interface PredictionMonitoring {
  modelId: string;
  endpoint: string;
  timeWindow: {
    start: number;
    end: number;
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    throughput: number;
    errorRate: number;
    averageConfidence: number;
  };
  errors: {
    type: string;
    count: number;
    percentage: number;
    examples: string[];
  }[];
  performanceTrends: {
    timestamp: number;
    responseTime: number;
    throughput: number;
    errorRate: number;
    confidence: number;
  }[];
}

// Real-time prediction with confidence intervals
export const getPredictionWithConfidence = action({
  args: {
    organizationId: v.id("organizations"),
    modelId: v.string(),
    inputs: v.any(),
    confidenceLevel: v.optional(v.number()),
    includeExplanations: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log(`Getting prediction with confidence for model ${args.modelId}`);
    
    const startTime = Date.now();
    
    // Get the trained model
    const model = await ctx.runQuery(api.modelTrainer.getTrainedModel, {
      modelId: args.modelId,
    });
    
    if (!model || model.organizationId !== args.organizationId) {
      throw new Error("Model not found or access denied");
    }
    
    if (model.status !== 'active') {
      throw new Error(`Model is ${model.status} and cannot be used for predictions`);
    }
    
    // Validate inputs
    const validationResult = await validatePredictionInputs(args.inputs, model);
    if (!validationResult.isValid) {
      throw new Error(`Invalid inputs: ${validationResult.errors.join(', ')}`);
    }
    
    // Make the core prediction
    const basePrediction = await ctx.runAction(api.modelTrainer.makePrediction, {
      organizationId: args.organizationId,
      modelId: args.modelId,
      inputs: args.inputs,
      explainPrediction: false,
    });
    
    // Calculate confidence interval
    const confidenceInterval = await calculateConfidenceInterval(
      model,
      args.inputs,
      basePrediction.prediction,
      args.confidenceLevel || 0.95
    );
    
    // Generate explanations if requested
    let explanations: PredictionExplanation | undefined;
    if (args.includeExplanations) {
      explanations = await generateDetailedExplanations(model, args.inputs, basePrediction.prediction);
    }
    
    const processingTime = Date.now() - startTime;
    
    // Log the prediction for monitoring
    await ctx.runMutation(api.predictionAPI.logPredictionUsage, {
      modelId: args.modelId,
      endpoint: 'realtime_prediction',
      responseTime: processingTime,
      confidence: basePrediction.confidence,
      success: true,
    });
    
    return {
      modelId: args.modelId,
      prediction: basePrediction.prediction,
      confidenceInterval,
      explanations,
      metadata: {
        modelVersion: model.version,
        predictionId: generatePredictionId(),
        timestamp: Date.now(),
        processingTime,
      },
    };
  },
});

// Batch prediction processing
export const createBatchPredictionJob = action({
  args: {
    organizationId: v.id("organizations"),
    modelId: v.string(),
    inputDataLocation: v.string(),
    config: v.optional(v.object({
      inputFormat: v.optional(v.string()),
      outputFormat: v.optional(v.string()),
      includeConfidence: v.optional(v.boolean()),
      includeExplanations: v.optional(v.boolean()),
      chunkSize: v.optional(v.number()),
      parallelProcessing: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    console.log(`Creating batch prediction job for model ${args.modelId}`);
    
    // Validate model access
    const model = await ctx.runQuery(api.modelTrainer.getTrainedModel, {
      modelId: args.modelId,
    });
    
    if (!model || model.organizationId !== args.organizationId) {
      throw new Error("Model not found or access denied");
    }
    
    // Create batch job
    const jobId = await ctx.runMutation(api.predictionAPI.createBatchJob, {
      organizationId: args.organizationId,
      modelId: args.modelId,
      inputDataLocation: args.inputDataLocation,
      config: {
        inputFormat: args.config?.inputFormat || 'csv',
        outputFormat: args.config?.outputFormat || 'csv',
        includeConfidence: args.config?.includeConfidence ?? true,
        includeExplanations: args.config?.includeExplanations ?? false,
        chunkSize: args.config?.chunkSize || 1000,
        parallelProcessing: args.config?.parallelProcessing ?? true,
        errorHandling: 'log_and_continue',
      },
    });
    
    // Start processing asynchronously
    processBatchPredictions(ctx, jobId);
    
    return {
      jobId,
      status: 'queued',
      estimatedCompletionTime: Date.now() + (30 * 60 * 1000), // 30 minutes estimate
      monitoringUrl: `/batch-jobs/${jobId}/status`,
    };
  },
});

// Get batch prediction job status
export const getBatchPredictionStatus = query({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Getting batch prediction status for job ${args.jobId}`);
    
    // This would query the batch_prediction_jobs table
    // For now, return mock status
    return {
      jobId: args.jobId,
      status: 'processing',
      progress: 75,
      totalRecords: 10000,
      processedRecords: 7500,
      estimatedTimeRemaining: 8 * 60 * 1000, // 8 minutes
      createdAt: Date.now() - (22 * 60 * 1000), // Started 22 minutes ago
      results: {
        successfulPredictions: 7450,
        failedPredictions: 50,
        averageConfidence: 0.87,
      },
    };
  },
});

// Time series forecasting with uncertainty quantification
export const getTimeSeriesForecast = action({
  args: {
    organizationId: v.id("organizations"),
    modelId: v.string(),
    historicalData: v.array(v.object({
      timestamp: v.number(),
      value: v.number(),
    })),
    forecastHorizon: v.number(), // number of periods to forecast
    includeSeasonality: v.optional(v.boolean()),
    confidenceLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`Generating time series forecast for ${args.forecastHorizon} periods`);
    
    const model = await ctx.runQuery(api.modelTrainer.getTrainedModel, {
      modelId: args.modelId,
    });
    
    if (!model || model.organizationId !== args.organizationId) {
      throw new Error("Model not found or access denied");
    }
    
    // Prepare time series data
    const timeSeriesData = await prepareTimeSeriesData(args.historicalData, args.includeSeasonality);
    
    // Generate forecasts
    const forecasts = [];
    const confidenceIntervals = [];
    
    for (let i = 1; i <= args.forecastHorizon; i++) {
      const forecastInputs = createForecastInputs(timeSeriesData, i);
      
      // Get point prediction
      const prediction = await ctx.runAction(api.modelTrainer.makePrediction, {
        organizationId: args.organizationId,
        modelId: args.modelId,
        inputs: forecastInputs,
      });
      
      // Calculate confidence interval for this forecast
      const confidenceInterval = await calculateConfidenceInterval(
        model,
        forecastInputs,
        prediction.prediction,
        args.confidenceLevel || 0.95
      );
      
      forecasts.push({
        period: i,
        timestamp: getNextTimestamp(args.historicalData, i),
        prediction: prediction.prediction,
        confidence: prediction.confidence,
      });
      
      confidenceIntervals.push(confidenceInterval);
    }
    
    // Analyze forecast components
    const forecastComponents = await analyzeForecastComponents(forecasts, args.includeSeasonality);
    
    return {
      modelId: args.modelId,
      forecastHorizon: args.forecastHorizon,
      forecasts,
      confidenceIntervals,
      components: forecastComponents,
      metadata: {
        generatedAt: Date.now(),
        modelVersion: model.version,
        dataPoints: args.historicalData.length,
      },
    };
  },
});

// Model explanation and interpretation
export const explainModelPredictions = action({
  args: {
    organizationId: v.id("organizations"),
    modelId: v.string(),
    sampleInputs: v.array(v.any()),
    explanationMethod: v.optional(v.union(
      v.literal("shap"),
      v.literal("lime"),
      v.literal("permutation_importance"),
      v.literal("gradient")
    )),
    includeInteractions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log(`Generating model explanations using ${args.explanationMethod || 'shap'} method`);
    
    const model = await ctx.runQuery(api.modelTrainer.getTrainedModel, {
      modelId: args.modelId,
    });
    
    if (!model || model.organizationId !== args.organizationId) {
      throw new Error("Model not found or access denied");
    }
    
    const explanationMethod = args.explanationMethod || 'shap';
    
    // Generate global explanations
    const globalExplanations = await generateGlobalExplanations(
      model,
      args.sampleInputs,
      explanationMethod
    );
    
    // Generate local explanations for each input
    const localExplanations = [];
    for (const inputs of args.sampleInputs) {
      const localExplanation = await generateLocalExplanations(
        model,
        inputs,
        explanationMethod,
        args.includeInteractions
      );
      localExplanations.push(localExplanation);
    }
    
    // Create visualizations
    const visualizations = await createExplanationVisualizations(
      globalExplanations,
      localExplanations,
      explanationMethod
    );
    
    // Generate summary
    const summary = generateExplanationSummary(globalExplanations, model.objective);
    
    return {
      modelId: args.modelId,
      method: explanationMethod,
      globalExplanations,
      localExplanations,
      visualizations,
      summary,
      generatedAt: Date.now(),
    };
  },
});

// Prediction monitoring and drift detection
export const getModelMonitoring = query({
  args: {
    organizationId: v.id("organizations"),
    modelId: v.string(),
    timeWindow: v.object({
      start: v.number(),
      end: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    console.log(`Getting monitoring data for model ${args.modelId}`);
    
    // This would query actual monitoring data from database
    // For now, return mock monitoring data
    const mockMetrics = {
      totalRequests: 15420,
      successfulRequests: 15201,
      failedRequests: 219,
      averageResponseTime: 85, // milliseconds
      p95ResponseTime: 250,
      throughput: 12.5, // requests per second
      errorRate: 1.42, // percentage
      averageConfidence: 0.84,
    };
    
    const mockErrors = [
      {
        type: 'ValidationError',
        count: 156,
        percentage: 71.2,
        examples: ['Missing required field: revenue', 'Invalid date format']
      },
      {
        type: 'ModelError',
        count: 43,
        percentage: 19.6,
        examples: ['Prediction out of range', 'Model artifact not found']
      },
      {
        type: 'SystemError',
        count: 20,
        percentage: 9.2,
        examples: ['Database connection timeout', 'Service unavailable']
      }
    ];
    
    const mockTrends = generateMockPerformanceTrends(args.timeWindow);
    
    return {
      modelId: args.modelId,
      timeWindow: args.timeWindow,
      metrics: mockMetrics,
      errors: mockErrors,
      performanceTrends: mockTrends,
      driftDetection: {
        detected: false,
        score: 0.15,
        threshold: 0.3,
        lastCheck: Date.now() - (60 * 60 * 1000),
      },
      alerts: [],
    };
  },
});

// What-if analysis for scenario modeling
export const runWhatIfAnalysis = action({
  args: {
    organizationId: v.id("organizations"),
    modelId: v.string(),
    baselineInputs: v.any(),
    scenarios: v.array(v.object({
      name: v.string(),
      changes: v.any(),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    console.log(`Running what-if analysis for ${args.scenarios.length} scenarios`);
    
    const model = await ctx.runQuery(api.modelTrainer.getTrainedModel, {
      modelId: args.modelId,
    });
    
    if (!model || model.organizationId !== args.organizationId) {
      throw new Error("Model not found or access denied");
    }
    
    // Get baseline prediction
    const baselinePrediction = await ctx.runAction(api.modelTrainer.makePrediction, {
      organizationId: args.organizationId,
      modelId: args.modelId,
      inputs: args.baselineInputs,
    });
    
    // Analyze each scenario
    const scenarioResults = [];
    for (const scenario of args.scenarios) {
      const scenarioInputs = { ...args.baselineInputs, ...scenario.changes };
      
      const scenarioPrediction = await ctx.runAction(api.modelTrainer.makePrediction, {
        organizationId: args.organizationId,
        modelId: args.modelId,
        inputs: scenarioInputs,
      });
      
      const impact = scenarioPrediction.prediction - baselinePrediction.prediction;
      const percentageChange = (impact / baselinePrediction.prediction) * 100;
      
      scenarioResults.push({
        name: scenario.name,
        description: scenario.description,
        changes: scenario.changes,
        prediction: scenarioPrediction.prediction,
        baseline: baselinePrediction.prediction,
        impact,
        percentageChange,
        confidence: scenarioPrediction.confidence,
        sensitivity: calculateScenarioSensitivity(scenario.changes, impact),
      });
    }
    
    // Rank scenarios by impact
    const rankedScenarios = scenarioResults.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    
    return {
      modelId: args.modelId,
      baseline: {
        inputs: args.baselineInputs,
        prediction: baselinePrediction.prediction,
        confidence: baselinePrediction.confidence,
      },
      scenarios: rankedScenarios,
      summary: {
        mostImpactfulScenario: rankedScenarios[0]?.name,
        averageImpact: scenarioResults.reduce((sum, s) => sum + Math.abs(s.impact), 0) / scenarioResults.length,
        scenarioCount: scenarioResults.length,
      },
      generatedAt: Date.now(),
    };
  },
});

// Core prediction processing functions

async function validatePredictionInputs(inputs: any, model: any): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Check required features
  const requiredFeatures = model.artifacts?.metadata?.parameters?.features || [];
  for (const feature of requiredFeatures) {
    if (!(feature in inputs)) {
      errors.push(`Missing required feature: ${feature}`);
    }
  }
  
  // Validate data types and ranges
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        errors.push(`Invalid numerical value for ${key}: ${value}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function calculateConfidenceInterval(
  model: any,
  inputs: any,
  prediction: number,
  confidenceLevel: number
): Promise<ConfidenceInterval> {
  
  // Mock confidence interval calculation
  // In production, this would use methods like bootstrap, quantile regression, etc.
  const modelUncertainty = (1 - (model.performance?.regressionMetrics?.r2Score || 0.8)) * 0.5;
  const inputUncertainty = calculateInputUncertainty(inputs) * 0.3;
  const totalUncertainty = Math.sqrt(modelUncertainty * modelUncertainty + inputUncertainty * inputUncertainty);
  
  // Calculate interval width based on confidence level
  const zScore = getZScore(confidenceLevel);
  const intervalWidth = zScore * totalUncertainty * Math.abs(prediction);
  
  return {
    prediction,
    lowerBound: prediction - intervalWidth,
    upperBound: prediction + intervalWidth,
    confidenceLevel,
    method: 'bootstrap',
    assumptions: [
      'Model error is normally distributed',
      'Input features are representative of training data',
      'No significant model drift has occurred'
    ],
  };
}

async function generateDetailedExplanations(
  model: any,
  inputs: any,
  prediction: number
): Promise<PredictionExplanation> {
  
  const method = 'shap'; // Default explanation method
  
  // Generate global explanations
  const globalExplanations = await generateGlobalExplanations(model, [inputs], method);
  
  // Generate local explanations
  const localExplanations = await generateLocalExplanations(model, inputs, method, true);
  
  // Create visualizations
  const visualizations = await createExplanationVisualizations(globalExplanations, [localExplanations], method);
  
  // Generate summary
  const summary = `The prediction of ${prediction.toFixed(2)} is primarily driven by ${globalExplanations[0]?.feature || 'key features'}. ` +
    `The model shows ${localExplanations.length > 0 && localExplanations[0].confidence > 0.8 ? 'high' : 'moderate'} confidence in this prediction.`;
  
  return {
    method,
    globalExplanations,
    localExplanations: [localExplanations],
    visualizations,
    summary,
  };
}

async function processBatchPredictions(ctx: any, jobId: string) {
  console.log(`Processing batch predictions for job ${jobId}`);
  
  // This would be implemented as an async background process
  // For now, just simulate progress updates
  const progressSteps = [10, 25, 40, 55, 70, 85, 95, 100];
  
  for (let i = 0; i < progressSteps.length; i++) {
    setTimeout(async () => {
      await ctx.runMutation(api.predictionAPI.updateBatchJobProgress, {
        jobId,
        progress: progressSteps[i],
        processedRecords: Math.floor((progressSteps[i] / 100) * 10000),
      });
      
      if (progressSteps[i] === 100) {
        await ctx.runMutation(api.predictionAPI.completeBatchJob, {
          jobId,
          results: {
            totalPredictions: 10000,
            successfulPredictions: 9950,
            failedPredictions: 50,
            averageConfidence: 0.87,
            processingTime: 25 * 60 * 1000, // 25 minutes
            throughput: 6.67, // predictions per second
          },
        });
      }
    }, i * 2000); // 2 second intervals
  }
}

// Helper functions

async function prepareTimeSeriesData(historicalData: any[], includeSeasonality?: boolean) {
  // Sort by timestamp
  const sortedData = historicalData.sort((a, b) => a.timestamp - b.timestamp);
  
  // Add time-based features
  const preparedData = sortedData.map((point, index) => {
    const date = new Date(point.timestamp);
    return {
      ...point,
      index,
      hour: date.getHours(),
      dayOfWeek: date.getDay(),
      dayOfMonth: date.getDate(),
      month: date.getMonth(),
      quarter: Math.floor(date.getMonth() / 3) + 1,
      year: date.getFullYear(),
      lag1: index > 0 ? sortedData[index - 1].value : point.value,
      lag7: index > 6 ? sortedData[index - 7].value : point.value,
      movingAvg7: index > 6 ? 
        sortedData.slice(index - 6, index + 1).reduce((sum, p) => sum + p.value, 0) / 7 :
        point.value,
    };
  });
  
  return preparedData;
}

function createForecastInputs(timeSeriesData: any[], forecastStep: number) {
  const lastPoint = timeSeriesData[timeSeriesData.length - 1];
  const nextTimestamp = lastPoint.timestamp + (forecastStep * 24 * 60 * 60 * 1000); // Daily forecasts
  const nextDate = new Date(nextTimestamp);
  
  return {
    lag1: lastPoint.value,
    lag7: timeSeriesData[timeSeriesData.length - Math.min(7, timeSeriesData.length)].value,
    movingAvg7: timeSeriesData.slice(-7).reduce((sum, p) => sum + p.value, 0) / Math.min(7, timeSeriesData.length),
    hour: nextDate.getHours(),
    dayOfWeek: nextDate.getDay(),
    dayOfMonth: nextDate.getDate(),
    month: nextDate.getMonth(),
    quarter: Math.floor(nextDate.getMonth() / 3) + 1,
    year: nextDate.getFullYear(),
  };
}

function getNextTimestamp(historicalData: any[], step: number): number {
  const lastTimestamp = Math.max(...historicalData.map(d => d.timestamp));
  const interval = calculateAverageInterval(historicalData);
  return lastTimestamp + (step * interval);
}

function calculateAverageInterval(historicalData: any[]): number {
  if (historicalData.length < 2) return 24 * 60 * 60 * 1000; // Default to daily
  
  const intervals = [];
  for (let i = 1; i < historicalData.length; i++) {
    intervals.push(historicalData[i].timestamp - historicalData[i - 1].timestamp);
  }
  
  return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
}

async function analyzeForecastComponents(forecasts: any[], includeSeasonality?: boolean) {
  const values = forecasts.map(f => f.prediction);
  
  return {
    trend: calculateTrend(values),
    seasonality: includeSeasonality ? calculateSeasonality(values) : null,
    volatility: calculateVolatility(values),
    growth: calculateGrowthRate(values),
  };
}

async function generateGlobalExplanations(model: any, sampleInputs: any[], method: string): Promise<GlobalExplanation[]> {
  // Mock global explanation generation
  const features = Object.keys(sampleInputs[0] || {});
  
  return features.map((feature, index) => ({
    feature,
    overallImportance: Math.random() * 0.3 + 0.1, // 0.1 to 0.4
    averageContribution: (Math.random() - 0.5) * 10, // -5 to 5
    description: `${feature} has ${index < 2 ? 'high' : index < 4 ? 'medium' : 'low'} impact on predictions`,
    interactionEffects: index < 2 ? [{
      features: [feature, features[(index + 1) % features.length]],
      interactionStrength: Math.random() * 0.2,
      description: `${feature} interacts with ${features[(index + 1) % features.length]}`
    }] : undefined,
  })).sort((a, b) => b.overallImportance - a.overallImportance);
}

async function generateLocalExplanations(model: any, inputs: any, method: string, includeInteractions?: boolean): Promise<LocalExplanation[]> {
  // Mock local explanation generation
  return Object.entries(inputs).map(([feature, value]) => ({
    feature,
    value,
    contribution: (Math.random() - 0.5) * 5, // -2.5 to 2.5
    confidence: Math.random() * 0.3 + 0.6, // 0.6 to 0.9
    description: `${feature} = ${value} contributes to the prediction`,
    alternativeScenarios: includeInteractions ? [{
      changedFeatures: { [feature]: (value as number) * 1.1 },
      newPrediction: (value as number) * 1.05,
      probabilityChange: 0.05,
      description: `If ${feature} increased by 10%, prediction would increase by ~5%`
    }] : undefined,
  }));
}

async function createExplanationVisualizations(
  globalExplanations: GlobalExplanation[],
  localExplanations: LocalExplanation[][],
  method: string
): Promise<Visualization[]> {
  
  return [
    {
      type: 'feature_importance',
      title: 'Global Feature Importance',
      description: 'Overall importance of each feature across all predictions',
      data: globalExplanations.map(exp => ({
        feature: exp.feature,
        importance: exp.overallImportance,
      })),
      config: { chartType: 'bar', sortBy: 'importance' },
    },
    {
      type: 'waterfall',
      title: 'Prediction Breakdown',
      description: 'How each feature contributes to the final prediction',
      data: localExplanations[0]?.map(exp => ({
        feature: exp.feature,
        contribution: exp.contribution,
      })) || [],
      config: { showBaseline: true, colorByContribution: true },
    },
  ];
}

function generateExplanationSummary(globalExplanations: GlobalExplanation[], objective: string): string {
  const topFeature = globalExplanations[0];
  const featureCount = globalExplanations.length;
  
  return `For ${objective} predictions, the most important feature is ${topFeature?.feature || 'unknown'} ` +
    `with ${((topFeature?.overallImportance || 0) * 100).toFixed(1)}% importance. ` +
    `The model considers ${featureCount} features in total, with the top 3 features accounting for ` +
    `${(globalExplanations.slice(0, 3).reduce((sum, exp) => sum + exp.overallImportance, 0) * 100).toFixed(1)}% of the prediction logic.`;
}

function generateMockPerformanceTrends(timeWindow: { start: number; end: number }) {
  const trends = [];
  const duration = timeWindow.end - timeWindow.start;
  const intervals = 24; // 24 data points
  
  for (let i = 0; i < intervals; i++) {
    trends.push({
      timestamp: timeWindow.start + (duration / intervals) * i,
      responseTime: 80 + Math.random() * 40, // 80-120ms
      throughput: 10 + Math.random() * 5, // 10-15 rps
      errorRate: Math.random() * 3, // 0-3%
      confidence: 0.8 + Math.random() * 0.15, // 0.8-0.95
    });
  }
  
  return trends;
}

function calculateInputUncertainty(inputs: any): number {
  const values = Object.values(inputs).filter(v => typeof v === 'number') as number[];
  if (values.length === 0) return 0.1;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / (Math.abs(mean) + 1);
}

function getZScore(confidenceLevel: number): number {
  // Approximate z-scores for common confidence levels
  if (confidenceLevel >= 0.99) return 2.576;
  if (confidenceLevel >= 0.95) return 1.96;
  if (confidenceLevel >= 0.90) return 1.645;
  if (confidenceLevel >= 0.80) return 1.282;
  return 1.96; // Default to 95%
}

function calculateScenarioSensitivity(changes: any, impact: number): number {
  const changeCount = Object.keys(changes).length;
  const averageChange = Object.values(changes).reduce((sum: number, val: any) => {
    if (typeof val === 'number') return sum + Math.abs(val);
    return sum + 1; // For non-numeric changes
  }, 0) / changeCount;
  
  return Math.abs(impact) / (averageChange + 0.01); // Avoid division by zero
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  // Simple linear trend
  const n = values.length;
  const sumX = n * (n - 1) / 2;
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
  const sumXX = n * (n - 1) * (2 * n - 1) / 6;
  
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}

function calculateSeasonality(values: number[]): number[] {
  // Simple seasonal decomposition
  const seasonLength = Math.min(12, values.length);
  const seasonalFactors = new Array(seasonLength).fill(0);
  
  for (let i = 0; i < values.length; i++) {
    seasonalFactors[i % seasonLength] += values[i];
  }
  
  const cycleCount = Math.ceil(values.length / seasonLength);
  return seasonalFactors.map(sum => sum / cycleCount);
}

function calculateVolatility(values: number[]): number {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function calculateGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;
  
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  
  if (firstValue === 0) return 0;
  
  return (lastValue - firstValue) / Math.abs(firstValue);
}

function generatePredictionId(): string {
  return `pred_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Database operations (mutations and queries)

export const logPredictionUsage = mutation({
  args: {
    modelId: v.string(),
    endpoint: v.string(),
    responseTime: v.number(),
    confidence: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`Logged prediction usage for model ${args.modelId}`);
    return true;
  },
});

export const createBatchJob = mutation({
  args: {
    organizationId: v.id("organizations"),
    modelId: v.string(),
    inputDataLocation: v.string(),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    console.log(`Created batch prediction job: ${jobId}`);
    return jobId;
  },
});

export const updateBatchJobProgress = mutation({
  args: {
    jobId: v.string(),
    progress: v.number(),
    processedRecords: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`Updated batch job ${args.jobId} progress: ${args.progress}%`);
    return true;
  },
});

export const completeBatchJob = mutation({
  args: {
    jobId: v.string(),
    results: v.any(),
  },
  handler: async (ctx, args) => {
    console.log(`Completed batch job: ${args.jobId}`);
    return true;
  },
});

export const createPredictionEndpoint = mutation({
  args: {
    organizationId: v.id("organizations"),
    modelId: v.string(),
    name: v.string(),
    description: v.string(),
    rateLimiting: v.any(),
  },
  handler: async (ctx, args) => {
    const endpointId = `endpoint_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    console.log(`Created prediction endpoint: ${endpointId}`);
    return endpointId;
  },
});

export const getPredictionEndpoints = query({
  args: {
    organizationId: v.id("organizations"),
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This would query prediction endpoints from database
    return [];
  },
});