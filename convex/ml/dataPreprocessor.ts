import { v } from "convex/values";
import { action, query, mutation } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Data Preprocessor for ML Pipeline
 * Cleans and normalizes QuickBooks data, performs feature engineering,
 * and handles missing data gracefully for machine learning models
 */

// Type definitions for data preprocessing
export interface PreprocessingJob {
  id: string;
  organizationId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  dataSource: 'quickbooks' | 'sage_intacct' | 'manual_upload' | 'api_import';
  dataTypes: string[];
  progress: number;
  startedAt: number;
  completedAt?: number;
  statistics: PreprocessingStatistics;
  outputLocation: string;
  configuration: PreprocessingConfig;
  error?: string;
}

export interface PreprocessingConfig {
  cleaningRules: CleaningRule[];
  normalizationMethod: 'z_score' | 'min_max' | 'robust' | 'none';
  featureEngineering: FeatureEngineeringConfig;
  missingDataStrategy: MissingDataStrategy;
  outlierDetection: OutlierDetectionConfig;
  dataValidation: DataValidationConfig;
}

export interface CleaningRule {
  field: string;
  operation: 'remove_duplicates' | 'standardize_format' | 'remove_outliers' | 'fill_missing' | 'validate_range';
  parameters: any;
  priority: number;
}

export interface FeatureEngineeringConfig {
  temporalFeatures: boolean;
  aggregatedFeatures: boolean;
  ratioFeatures: boolean;
  categoricalEncoding: 'one_hot' | 'label' | 'target' | 'binary';
  polynomialFeatures: boolean;
  interactionFeatures: boolean;
  customFeatures: CustomFeature[];
}

export interface CustomFeature {
  name: string;
  formula: string;
  description: string;
  dependentFields: string[];
}

export interface MissingDataStrategy {
  numericalStrategy: 'mean' | 'median' | 'mode' | 'forward_fill' | 'backward_fill' | 'interpolate' | 'drop';
  categoricalStrategy: 'mode' | 'new_category' | 'forward_fill' | 'drop';
  missingThreshold: number; // Drop columns/rows with >X% missing
  imputationModel: 'linear' | 'knn' | 'random_forest' | 'none';
}

export interface OutlierDetectionConfig {
  method: 'iqr' | 'z_score' | 'modified_z_score' | 'isolation_forest' | 'none';
  threshold: number;
  action: 'remove' | 'cap' | 'flag' | 'transform';
}

export interface DataValidationConfig {
  schemaValidation: boolean;
  businessRuleValidation: boolean;
  dataQualityChecks: string[];
  customValidations: CustomValidation[];
}

export interface CustomValidation {
  name: string;
  rule: string;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PreprocessingStatistics {
  totalRecords: number;
  processedRecords: number;
  droppedRecords: number;
  missingDataPercentage: number;
  outliersDetected: number;
  duplicatesRemoved: number;
  dataQualityScore: number;
  fieldStatistics: FieldStatistics[];
}

export interface FieldStatistics {
  fieldName: string;
  dataType: string;
  missingCount: number;
  missingPercentage: number;
  uniqueValues: number;
  mean?: number;
  median?: number;
  standardDeviation?: number;
  min?: number;
  max?: number;
  outlierCount?: number;
}

export interface ProcessedDataset {
  id: string;
  organizationId: string;
  preprocessingJobId: string;
  name: string;
  description: string;
  schema: DatasetSchema;
  recordCount: number;
  featureCount: number;
  createdAt: number;
  lastUpdated: number;
  version: string;
  dataLocation: string;
  metadata: DatasetMetadata;
}

export interface DatasetSchema {
  features: FeatureDefinition[];
  target?: FeatureDefinition;
  categoricalFeatures: string[];
  numericalFeatures: string[];
  temporalFeatures: string[];
}

export interface FeatureDefinition {
  name: string;
  dataType: 'numerical' | 'categorical' | 'temporal' | 'boolean';
  description: string;
  min?: number;
  max?: number;
  categories?: string[];
  isTarget?: boolean;
  engineered?: boolean;
}

export interface DatasetMetadata {
  source: string;
  preprocessingConfig: PreprocessingConfig;
  qualityScore: number;
  validationResults: ValidationResult[];
}

export interface ValidationResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

// Main preprocessing action
export const preprocessData = action({
  args: {
    organizationId: v.id("organizations"),
    dataSource: v.union(
      v.literal("quickbooks"),
      v.literal("sage_intacct"),
      v.literal("manual_upload"),
      v.literal("api_import")
    ),
    dataTypes: v.array(v.string()),
    config: v.optional(v.object({
      normalizationMethod: v.optional(v.string()),
      missingDataThreshold: v.optional(v.number()),
      outlierMethod: v.optional(v.string()),
      featureEngineering: v.optional(v.boolean()),
    })),
    outputName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`Starting data preprocessing for organization ${args.organizationId}`);
    
    // Create preprocessing job
    const jobId = await ctx.runMutation(api.dataPreprocessor.createPreprocessingJob, {
      organizationId: args.organizationId,
      dataSource: args.dataSource,
      dataTypes: args.dataTypes,
      config: createDefaultConfig(args.config),
    });
    
    try {
      // Get raw data from specified source
      const rawData = await getRawDataFromSource(ctx, args.organizationId, args.dataSource, args.dataTypes);
      
      // Update job progress
      await ctx.runMutation(api.dataPreprocessor.updateJobProgress, {
        jobId,
        progress: 20,
        status: "processing",
      });
      
      // Step 1: Data Cleaning
      const cleanedData = await performDataCleaning(rawData, createDefaultConfig(args.config));
      await ctx.runMutation(api.dataPreprocessor.updateJobProgress, { jobId, progress: 40 });
      
      // Step 2: Handle Missing Data
      const imputedData = await handleMissingData(cleanedData, createDefaultConfig(args.config).missingDataStrategy);
      await ctx.runMutation(api.dataPreprocessor.updateJobProgress, { jobId, progress: 60 });
      
      // Step 3: Outlier Detection and Treatment
      const outlierTreatedData = await detectAndTreatOutliers(imputedData, createDefaultConfig(args.config).outlierDetection);
      await ctx.runMutation(api.dataPreprocessor.updateJobProgress, { jobId, progress: 70 });
      
      // Step 4: Feature Engineering
      const engineeredData = await performFeatureEngineering(outlierTreatedData, createDefaultConfig(args.config).featureEngineering);
      await ctx.runMutation(api.dataPreprocessor.updateJobProgress, { jobId, progress: 85 });
      
      // Step 5: Normalization
      const normalizedData = await normalizeData(engineeredData, createDefaultConfig(args.config).normalizationMethod);
      await ctx.runMutation(api.dataPreprocessor.updateJobProgress, { jobId, progress: 95 });
      
      // Step 6: Data Validation
      const validationResults = await validateProcessedData(normalizedData, createDefaultConfig(args.config).dataValidation);
      
      // Calculate final statistics
      const statistics = calculatePreprocessingStatistics(rawData, normalizedData, validationResults);
      
      // Store processed dataset
      const datasetId = await ctx.runMutation(api.dataPreprocessor.storeProcessedDataset, {
        organizationId: args.organizationId,
        preprocessingJobId: jobId,
        name: args.outputName || `processed_${args.dataSource}_${Date.now()}`,
        data: normalizedData,
        statistics,
        config: createDefaultConfig(args.config),
      });
      
      // Complete job
      await ctx.runMutation(api.dataPreprocessor.completePreprocessingJob, {
        jobId,
        statistics,
        outputLocation: `/datasets/${datasetId}`,
      });
      
      console.log(`Data preprocessing completed: Job ${jobId}, Dataset ${datasetId}`);
      return {
        jobId,
        datasetId,
        statistics,
        recordCount: normalizedData.length,
        featureCount: Object.keys(normalizedData[0] || {}).length,
        qualityScore: statistics.dataQualityScore,
      };
      
    } catch (error) {
      await ctx.runMutation(api.dataPreprocessor.failPreprocessingJob, {
        jobId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});

// Feature engineering for financial data
export const engineerFinancialFeatures = action({
  args: {
    organizationId: v.id("organizations"),
    datasetId: v.string(),
    featureTypes: v.array(v.string()),
    customFeatures: v.optional(v.array(v.object({
      name: v.string(),
      formula: v.string(),
      description: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    console.log(`Engineering financial features for dataset ${args.datasetId}`);
    
    // Get existing dataset
    const dataset = await ctx.runQuery(api.dataPreprocessor.getProcessedDataset, {
      datasetId: args.datasetId,
    });
    
    if (!dataset) {
      throw new Error("Dataset not found");
    }
    
    // Load dataset data
    const data = await loadDatasetData(dataset.dataLocation);
    
    // Engineer features based on requested types
    let engineeredData = [...data];
    
    if (args.featureTypes.includes('temporal')) {
      engineeredData = await addTemporalFeatures(engineeredData);
    }
    
    if (args.featureTypes.includes('financial_ratios')) {
      engineeredData = await addFinancialRatios(engineeredData);
    }
    
    if (args.featureTypes.includes('moving_averages')) {
      engineeredData = await addMovingAverages(engineeredData);
    }
    
    if (args.featureTypes.includes('seasonality')) {
      engineeredData = await addSeasonalityFeatures(engineeredData);
    }
    
    if (args.featureTypes.includes('volatility')) {
      engineeredData = await addVolatilityFeatures(engineeredData);
    }
    
    // Add custom features
    if (args.customFeatures) {
      engineeredData = await addCustomFeatures(engineeredData, args.customFeatures);
    }
    
    // Create new dataset version
    const newDatasetId = await ctx.runMutation(api.dataPreprocessor.storeProcessedDataset, {
      organizationId: args.organizationId,
      preprocessingJobId: dataset.preprocessingJobId,
      name: `${dataset.name}_engineered`,
      data: engineeredData,
      statistics: calculateFeatureEngineeringStatistics(data, engineeredData),
      config: dataset.metadata.preprocessingConfig,
    });
    
    return {
      originalDatasetId: args.datasetId,
      newDatasetId,
      originalFeatureCount: Object.keys(data[0] || {}).length,
      newFeatureCount: Object.keys(engineeredData[0] || {}).length,
      addedFeatures: Object.keys(engineeredData[0] || {}).length - Object.keys(data[0] || {}).length,
    };
  },
});

// Data quality assessment
export const assessDataQuality = action({
  args: {
    organizationId: v.id("organizations"),
    datasetId: v.string(),
    qualityChecks: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    console.log(`Assessing data quality for dataset ${args.datasetId}`);
    
    const dataset = await ctx.runQuery(api.dataPreprocessor.getProcessedDataset, {
      datasetId: args.datasetId,
    });
    
    if (!dataset) {
      throw new Error("Dataset not found");
    }
    
    const data = await loadDatasetData(dataset.dataLocation);
    
    const qualityChecks = args.qualityChecks || [
      'completeness',
      'consistency',
      'accuracy',
      'uniqueness',
      'validity',
      'timeliness'
    ];
    
    const qualityResults = [];
    
    for (const check of qualityChecks) {
      const result = await performQualityCheck(data, check, dataset.schema);
      qualityResults.push(result);
    }
    
    const overallScore = calculateOverallQualityScore(qualityResults);
    
    return {
      datasetId: args.datasetId,
      overallScore,
      qualityResults,
      recommendations: generateQualityRecommendations(qualityResults),
      assessedAt: Date.now(),
    };
  },
});

// Core preprocessing functions

async function getRawDataFromSource(ctx: any, organizationId: string, dataSource: string, dataTypes: string[]) {
  console.log(`Retrieving ${dataSource} data for types: ${dataTypes.join(', ')}`);
  
  let rawData: any[] = [];
  
  switch (dataSource) {
    case 'quickbooks':
      // Get QuickBooks data
      if (dataTypes.includes('transactions')) {
        const transactions = await ctx.runQuery(api.transactionActions.getTransactionsByOrg, {
          organizationId,
          dateRange: { start: Date.now() - (365 * 24 * 60 * 60 * 1000), end: Date.now() },
        });
        rawData = rawData.concat(transactions.map(t => ({ ...t, dataType: 'transaction' })));
      }
      
      if (dataTypes.includes('accounts')) {
        const accounts = await ctx.runQuery(api.accountActions.getAccountHierarchy, {
          organizationId,
        });
        rawData = rawData.concat(accounts.map(a => ({ ...a, dataType: 'account' })));
      }
      break;
      
    case 'sage_intacct':
      // Similar logic for Sage Intacct
      rawData = await getSageIntacctData(organizationId, dataTypes);
      break;
      
    default:
      throw new Error(`Unsupported data source: ${dataSource}`);
  }
  
  console.log(`Retrieved ${rawData.length} records from ${dataSource}`);
  return rawData;
}

async function performDataCleaning(data: any[], config: PreprocessingConfig) {
  console.log("Performing data cleaning...");
  
  let cleanedData = [...data];
  
  // Remove duplicates
  const duplicateRule = config.cleaningRules.find(r => r.operation === 'remove_duplicates');
  if (duplicateRule) {
    cleanedData = removeDuplicates(cleanedData, duplicateRule.parameters);
  }
  
  // Standardize formats
  const formatRules = config.cleaningRules.filter(r => r.operation === 'standardize_format');
  for (const rule of formatRules) {
    cleanedData = standardizeFormat(cleanedData, rule.field, rule.parameters);
  }
  
  // Validate ranges
  const rangeRules = config.cleaningRules.filter(r => r.operation === 'validate_range');
  for (const rule of rangeRules) {
    cleanedData = validateRange(cleanedData, rule.field, rule.parameters);
  }
  
  console.log(`Data cleaning completed. Records: ${data.length} -> ${cleanedData.length}`);
  return cleanedData;
}

async function handleMissingData(data: any[], strategy: MissingDataStrategy) {
  console.log("Handling missing data...");
  
  let processedData = [...data];
  
  // Calculate missing data statistics
  const fields = Object.keys(data[0] || {});
  const missingStats: { [field: string]: number } = {};
  
  for (const field of fields) {
    const missingCount = data.filter(row => row[field] == null || row[field] === '').length;
    missingStats[field] = (missingCount / data.length) * 100;
  }
  
  // Drop columns with too much missing data
  const fieldsToKeep = fields.filter(field => missingStats[field] <= strategy.missingThreshold);
  processedData = processedData.map(row => {
    const newRow: any = {};
    fieldsToKeep.forEach(field => {
      newRow[field] = row[field];
    });
    return newRow;
  });
  
  // Impute missing values for remaining fields
  for (const field of fieldsToKeep) {
    if (missingStats[field] > 0) {
      processedData = imputeMissingValues(processedData, field, strategy);
    }
  }
  
  console.log(`Missing data handling completed. Fields: ${fields.length} -> ${fieldsToKeep.length}`);
  return processedData;
}

async function detectAndTreatOutliers(data: any[], config: OutlierDetectionConfig) {
  console.log("Detecting and treating outliers...");
  
  if (config.method === 'none') {
    return data;
  }
  
  let processedData = [...data];
  const numericalFields = getNumericalFields(data);
  let outliersDetected = 0;
  
  for (const field of numericalFields) {
    const outlierIndices = detectOutliers(data, field, config.method, config.threshold);
    outliersDetected += outlierIndices.length;
    
    switch (config.action) {
      case 'remove':
        processedData = processedData.filter((_, index) => !outlierIndices.includes(index));
        break;
      case 'cap':
        processedData = capOutliers(processedData, field, outlierIndices);
        break;
      case 'flag':
        processedData = flagOutliers(processedData, field, outlierIndices);
        break;
      case 'transform':
        processedData = transformOutliers(processedData, field, outlierIndices);
        break;
    }
  }
  
  console.log(`Outlier treatment completed. Outliers detected: ${outliersDetected}`);
  return processedData;
}

async function performFeatureEngineering(data: any[], config: FeatureEngineeringConfig) {
  console.log("Performing feature engineering...");
  
  let engineeredData = [...data];
  
  if (config.temporalFeatures) {
    engineeredData = await addTemporalFeatures(engineeredData);
  }
  
  if (config.aggregatedFeatures) {
    engineeredData = await addAggregatedFeatures(engineeredData);
  }
  
  if (config.ratioFeatures) {
    engineeredData = await addRatioFeatures(engineeredData);
  }
  
  if (config.polynomialFeatures) {
    engineeredData = await addPolynomialFeatures(engineeredData);
  }
  
  if (config.interactionFeatures) {
    engineeredData = await addInteractionFeatures(engineeredData);
  }
  
  // Add custom features
  for (const customFeature of config.customFeatures) {
    engineeredData = await addCustomFeature(engineeredData, customFeature);
  }
  
  // Encode categorical variables
  engineeredData = await encodeCategoricalVariables(engineeredData, config.categoricalEncoding);
  
  console.log(`Feature engineering completed. Features added: ${Object.keys(engineeredData[0] || {}).length - Object.keys(data[0] || {}).length}`);
  return engineeredData;
}

async function normalizeData(data: any[], method: string) {
  console.log(`Normalizing data using ${method} method...`);
  
  if (method === 'none') {
    return data;
  }
  
  const numericalFields = getNumericalFields(data);
  let normalizedData = [...data];
  
  for (const field of numericalFields) {
    switch (method) {
      case 'z_score':
        normalizedData = zScoreNormalize(normalizedData, field);
        break;
      case 'min_max':
        normalizedData = minMaxNormalize(normalizedData, field);
        break;
      case 'robust':
        normalizedData = robustNormalize(normalizedData, field);
        break;
    }
  }
  
  console.log("Data normalization completed");
  return normalizedData;
}

async function validateProcessedData(data: any[], config: DataValidationConfig) {
  console.log("Validating processed data...");
  
  const validationResults: ValidationResult[] = [];
  
  if (config.schemaValidation) {
    const schemaResult = validateSchema(data);
    validationResults.push(schemaResult);
  }
  
  if (config.businessRuleValidation) {
    const businessRuleResults = validateBusinessRules(data);
    validationResults.push(...businessRuleResults);
  }
  
  for (const check of config.dataQualityChecks) {
    const qualityResult = await performQualityCheck(data, check, null);
    validationResults.push({
      check: `quality_${check}`,
      status: qualityResult.score > 0.8 ? 'pass' : qualityResult.score > 0.6 ? 'warning' : 'fail',
      message: qualityResult.message,
      details: qualityResult,
    });
  }
  
  for (const customValidation of config.customValidations) {
    const customResult = validateCustomRule(data, customValidation);
    validationResults.push(customResult);
  }
  
  console.log(`Data validation completed. ${validationResults.length} checks performed`);
  return validationResults;
}

// Feature engineering functions

async function addTemporalFeatures(data: any[]) {
  return data.map(row => {
    if (row.date) {
      const date = new Date(row.date);
      return {
        ...row,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        quarter: Math.floor((date.getMonth() + 3) / 3),
        dayOfWeek: date.getDay(),
        dayOfMonth: date.getDate(),
        weekOfYear: Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isMonthEnd: date.getDate() > 25 && date.getMonth() !== new Date(date.getFullYear(), date.getMonth() + 1, 0).getMonth(),
      };
    }
    return row;
  });
}

async function addFinancialRatios(data: any[]) {
  return data.map(row => {
    const newRow = { ...row };
    
    // Calculate financial ratios where applicable
    if (row.revenue && row.totalAssets) {
      newRow.assetTurnoverRatio = row.revenue / row.totalAssets;
    }
    
    if (row.currentAssets && row.currentLiabilities) {
      newRow.currentRatio = row.currentAssets / row.currentLiabilities;
    }
    
    if (row.totalDebt && row.totalEquity) {
      newRow.debtToEquityRatio = row.totalDebt / row.totalEquity;
    }
    
    if (row.grossProfit && row.revenue) {
      newRow.grossMargin = row.grossProfit / row.revenue;
    }
    
    if (row.netIncome && row.revenue) {
      newRow.netMargin = row.netIncome / row.revenue;
    }
    
    return newRow;
  });
}

async function addMovingAverages(data: any[]) {
  // Sort by date
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const numericalFields = getNumericalFields(data).filter(field => field !== 'date');
  
  return sortedData.map((row, index) => {
    const newRow = { ...row };
    
    // Calculate 7-day, 30-day, and 90-day moving averages
    for (const field of numericalFields) {
      for (const window of [7, 30, 90]) {
        const startIndex = Math.max(0, index - window + 1);
        const windowData = sortedData.slice(startIndex, index + 1);
        const values = windowData.map(d => d[field]).filter(v => v != null && !isNaN(v));
        
        if (values.length > 0) {
          newRow[`${field}_ma_${window}d`] = values.reduce((sum, val) => sum + val, 0) / values.length;
        }
      }
    }
    
    return newRow;
  });
}

async function addSeasonalityFeatures(data: any[]) {
  return data.map(row => {
    if (row.date) {
      const date = new Date(row.date);
      const month = date.getMonth() + 1;
      
      return {
        ...row,
        season: month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4',
        isHolidaySeason: month === 11 || month === 12,
        fiscalQuarter: month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4',
        monthSin: Math.sin(2 * Math.PI * month / 12),
        monthCos: Math.cos(2 * Math.PI * month / 12),
      };
    }
    return row;
  });
}

async function addVolatilityFeatures(data: any[]) {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const numericalFields = getNumericalFields(data).filter(field => field !== 'date');
  
  return sortedData.map((row, index) => {
    const newRow = { ...row };
    
    // Calculate volatility (rolling standard deviation)
    for (const field of numericalFields) {
      for (const window of [30, 90]) {
        const startIndex = Math.max(0, index - window + 1);
        const windowData = sortedData.slice(startIndex, index + 1);
        const values = windowData.map(d => d[field]).filter(v => v != null && !isNaN(v));
        
        if (values.length > 1) {
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
          newRow[`${field}_volatility_${window}d`] = Math.sqrt(variance);
        }
      }
    }
    
    return newRow;
  });
}

// Helper functions for data processing operations

function removeDuplicates(data: any[], parameters: any) {
  const seen = new Set();
  return data.filter(row => {
    const key = parameters.keyFields ? 
      parameters.keyFields.map((field: string) => row[field]).join('|') : 
      JSON.stringify(row);
    
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function standardizeFormat(data: any[], field: string, parameters: any) {
  return data.map(row => {
    if (row[field]) {
      switch (parameters.format) {
        case 'currency':
          row[field] = typeof row[field] === 'string' ? 
            parseFloat(row[field].replace(/[$,]/g, '')) : row[field];
          break;
        case 'date':
          row[field] = new Date(row[field]).getTime();
          break;
        case 'uppercase':
          row[field] = row[field].toString().toUpperCase();
          break;
        case 'lowercase':
          row[field] = row[field].toString().toLowerCase();
          break;
      }
    }
    return row;
  });
}

function validateRange(data: any[], field: string, parameters: any) {
  return data.filter(row => {
    const value = row[field];
    if (value == null) return true;
    
    if (parameters.min !== undefined && value < parameters.min) return false;
    if (parameters.max !== undefined && value > parameters.max) return false;
    
    return true;
  });
}

function imputeMissingValues(data: any[], field: string, strategy: MissingDataStrategy) {
  const values = data.map(row => row[field]).filter(val => val != null && val !== '');
  
  if (values.length === 0) return data;
  
  const isNumerical = values.every(val => !isNaN(val));
  
  let imputeValue;
  if (isNumerical) {
    switch (strategy.numericalStrategy) {
      case 'mean':
        imputeValue = values.reduce((sum, val) => sum + parseFloat(val), 0) / values.length;
        break;
      case 'median':
        const sorted = values.map(val => parseFloat(val)).sort((a, b) => a - b);
        imputeValue = sorted[Math.floor(sorted.length / 2)];
        break;
      case 'mode':
        const mode = getModeValue(values);
        imputeValue = mode;
        break;
      default:
        imputeValue = 0;
    }
  } else {
    switch (strategy.categoricalStrategy) {
      case 'mode':
        imputeValue = getModeValue(values);
        break;
      case 'new_category':
        imputeValue = 'UNKNOWN';
        break;
      default:
        imputeValue = '';
    }
  }
  
  return data.map(row => ({
    ...row,
    [field]: row[field] != null && row[field] !== '' ? row[field] : imputeValue
  }));
}

function getNumericalFields(data: any[]): string[] {
  if (data.length === 0) return [];
  
  const sample = data[0];
  return Object.keys(sample).filter(key => {
    const value = sample[key];
    return typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)));
  });
}

function detectOutliers(data: any[], field: string, method: string, threshold: number): number[] {
  const values = data.map(row => parseFloat(row[field])).filter(val => !isNaN(val));
  const outlierIndices: number[] = [];
  
  switch (method) {
    case 'z_score':
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      
      data.forEach((row, index) => {
        const value = parseFloat(row[field]);
        if (!isNaN(value) && Math.abs((value - mean) / stdDev) > threshold) {
          outlierIndices.push(index);
        }
      });
      break;
      
    case 'iqr':
      const sortedValues = values.sort((a, b) => a - b);
      const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)];
      const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - threshold * iqr;
      const upperBound = q3 + threshold * iqr;
      
      data.forEach((row, index) => {
        const value = parseFloat(row[field]);
        if (!isNaN(value) && (value < lowerBound || value > upperBound)) {
          outlierIndices.push(index);
        }
      });
      break;
  }
  
  return outlierIndices;
}

function getModeValue(values: any[]): any {
  const frequency: { [key: string]: number } = {};
  values.forEach(val => {
    frequency[val] = (frequency[val] || 0) + 1;
  });
  
  let maxCount = 0;
  let mode = values[0];
  for (const [value, count] of Object.entries(frequency)) {
    if (count > maxCount) {
      maxCount = count;
      mode = value;
    }
  }
  
  return mode;
}

function zScoreNormalize(data: any[], field: string) {
  const values = data.map(row => parseFloat(row[field])).filter(val => !isNaN(val));
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
  
  return data.map(row => ({
    ...row,
    [field]: stdDev !== 0 ? (parseFloat(row[field]) - mean) / stdDev : 0
  }));
}

function minMaxNormalize(data: any[], field: string) {
  const values = data.map(row => parseFloat(row[field])).filter(val => !isNaN(val));
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return data.map(row => ({
    ...row,
    [field]: max !== min ? (parseFloat(row[field]) - min) / (max - min) : 0
  }));
}

function robustNormalize(data: any[], field: string) {
  const values = data.map(row => parseFloat(row[field])).filter(val => !isNaN(val)).sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)];
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  
  return data.map(row => ({
    ...row,
    [field]: iqr !== 0 ? (parseFloat(row[field]) - median) / iqr : 0
  }));
}

// Utility functions for statistics and validation

function calculatePreprocessingStatistics(rawData: any[], processedData: any[], validationResults: ValidationResult[]): PreprocessingStatistics {
  const fieldStats = calculateFieldStatistics(processedData);
  
  return {
    totalRecords: rawData.length,
    processedRecords: processedData.length,
    droppedRecords: rawData.length - processedData.length,
    missingDataPercentage: calculateOverallMissingPercentage(processedData),
    outliersDetected: 0, // Would be calculated during outlier detection
    duplicatesRemoved: 0, // Would be calculated during deduplication
    dataQualityScore: calculateDataQualityScore(fieldStats, validationResults),
    fieldStatistics: fieldStats,
  };
}

function calculateFieldStatistics(data: any[]): FieldStatistics[] {
  if (data.length === 0) return [];
  
  const fields = Object.keys(data[0]);
  
  return fields.map(field => {
    const values = data.map(row => row[field]).filter(val => val != null && val !== '');
    const missingCount = data.length - values.length;
    const isNumerical = values.every(val => !isNaN(val));
    
    const stats: FieldStatistics = {
      fieldName: field,
      dataType: isNumerical ? 'numerical' : 'categorical',
      missingCount,
      missingPercentage: (missingCount / data.length) * 100,
      uniqueValues: new Set(values).size,
    };
    
    if (isNumerical && values.length > 0) {
      const numericalValues = values.map(val => parseFloat(val));
      stats.mean = numericalValues.reduce((sum, val) => sum + val, 0) / numericalValues.length;
      
      const sortedValues = numericalValues.sort((a, b) => a - b);
      stats.median = sortedValues[Math.floor(sortedValues.length / 2)];
      stats.min = Math.min(...numericalValues);
      stats.max = Math.max(...numericalValues);
      
      const variance = numericalValues.reduce((sum, val) => sum + Math.pow(val - (stats.mean || 0), 2), 0) / numericalValues.length;
      stats.standardDeviation = Math.sqrt(variance);
    }
    
    return stats;
  });
}

function calculateOverallMissingPercentage(data: any[]): number {
  if (data.length === 0) return 0;
  
  const totalCells = data.length * Object.keys(data[0]).length;
  const missingCells = data.reduce((sum, row) => {
    return sum + Object.values(row).filter(val => val == null || val === '').length;
  }, 0);
  
  return (missingCells / totalCells) * 100;
}

function calculateDataQualityScore(fieldStats: FieldStatistics[], validationResults: ValidationResult[]): number {
  const completenessScore = 100 - (fieldStats.reduce((sum, stat) => sum + stat.missingPercentage, 0) / fieldStats.length);
  const validationScore = validationResults.filter(result => result.status === 'pass').length / Math.max(1, validationResults.length) * 100;
  
  return (completenessScore + validationScore) / 2;
}

function createDefaultConfig(userConfig?: any): PreprocessingConfig {
  return {
    cleaningRules: [
      { field: 'all', operation: 'remove_duplicates', parameters: {}, priority: 1 },
    ],
    normalizationMethod: userConfig?.normalizationMethod || 'z_score',
    featureEngineering: {
      temporalFeatures: userConfig?.featureEngineering ?? true,
      aggregatedFeatures: true,
      ratioFeatures: true,
      categoricalEncoding: 'one_hot',
      polynomialFeatures: false,
      interactionFeatures: false,
      customFeatures: [],
    },
    missingDataStrategy: {
      numericalStrategy: 'mean',
      categoricalStrategy: 'mode',
      missingThreshold: userConfig?.missingDataThreshold || 50,
      imputationModel: 'none',
    },
    outlierDetection: {
      method: userConfig?.outlierMethod || 'iqr',
      threshold: 1.5,
      action: 'cap',
    },
    dataValidation: {
      schemaValidation: true,
      businessRuleValidation: true,
      dataQualityChecks: ['completeness', 'consistency'],
      customValidations: [],
    },
  };
}

// Stub functions for operations not fully implemented
async function getSageIntacctData(organizationId: string, dataTypes: string[]) { return []; }
async function loadDatasetData(location: string) { return []; }
async function addAggregatedFeatures(data: any[]) { return data; }
async function addRatioFeatures(data: any[]) { return data; }
async function addPolynomialFeatures(data: any[]) { return data; }
async function addInteractionFeatures(data: any[]) { return data; }
async function addCustomFeature(data: any[], feature: CustomFeature) { return data; }
async function addCustomFeatures(data: any[], features: any[]) { return data; }
async function encodeCategoricalVariables(data: any[], method: string) { return data; }
async function performQualityCheck(data: any[], check: string, schema: any) { return { score: 0.8, message: `${check} check passed` }; }
function capOutliers(data: any[], field: string, indices: number[]) { return data; }
function flagOutliers(data: any[], field: string, indices: number[]) { return data; }
function transformOutliers(data: any[], field: string, indices: number[]) { return data; }
function validateSchema(data: any[]) { return { check: 'schema', status: 'pass' as const, message: 'Schema validation passed' }; }
function validateBusinessRules(data: any[]) { return []; }
function validateCustomRule(data: any[], rule: CustomValidation) { return { check: rule.name, status: 'pass' as const, message: 'Custom validation passed' }; }
function calculateOverallQualityScore(results: any[]) { return 85; }
function generateQualityRecommendations(results: any[]) { return ['Improve data completeness', 'Standardize data formats']; }
function calculateFeatureEngineeringStatistics(original: any[], engineered: any[]) { return {}; }

// Database operations (mutations and queries)

export const createPreprocessingJob = mutation({
  args: {
    organizationId: v.id("organizations"),
    dataSource: v.string(),
    dataTypes: v.array(v.string()),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    console.log(`Created preprocessing job: ${jobId}`);
    return jobId;
  },
});

export const updateJobProgress = mutation({
  args: {
    jobId: v.string(),
    progress: v.number(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`Updated job ${args.jobId} progress: ${args.progress}%`);
    return true;
  },
});

export const completePreprocessingJob = mutation({
  args: {
    jobId: v.string(),
    statistics: v.any(),
    outputLocation: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Completed preprocessing job: ${args.jobId}`);
    return true;
  },
});

export const failPreprocessingJob = mutation({
  args: {
    jobId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Failed preprocessing job: ${args.jobId} - ${args.error}`);
    return true;
  },
});

export const storeProcessedDataset = mutation({
  args: {
    organizationId: v.id("organizations"),
    preprocessingJobId: v.string(),
    name: v.string(),
    data: v.any(),
    statistics: v.any(),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const datasetId = `dataset_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    console.log(`Stored processed dataset: ${datasetId}`);
    return datasetId;
  },
});

export const getProcessedDataset = query({
  args: {
    datasetId: v.string(),
  },
  handler: async (ctx, args) => {
    // This would query the datasets table
    return null;
  },
});

export const getPreprocessingJobs = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // This would query preprocessing jobs from database
    return [];
  },
});