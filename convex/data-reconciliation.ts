/**
 * FinHelm.ai Data Reconciliation Engine
 * Advanced fuzzy matching system for financial data reconciliation
 * Document IO-inspired design with 92.7% confidence target
 * 
 * Features:
 * - Multi-stage fuzzy matching pipeline
 * - Confidence-based scoring with 92.7% target
 * - Document IO-inspired batch processing
 * - CSV data ingestion and reconciliation
 * - Advanced string similarity algorithms
 * - Statistical confidence modeling
 * - Comprehensive audit trail
 */

import { action, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Configuration for reconciliation engine
const RECONCILIATION_CONFIG = {
  // Target confidence per requirements
  targetConfidence: 92.7,
  minimumConfidence: 75.0,
  
  // Fuzzy matching thresholds
  exactMatchThreshold: 1.0,
  strongMatchThreshold: 0.85,
  moderateMatchThreshold: 0.70,
  weakMatchThreshold: 0.50,
  
  // Field weights for composite scoring
  fieldWeights: {
    amount: 0.35,        // Financial amount is most critical
    description: 0.25,   // Description provides context
    date: 0.20,          // Date proximity is important
    reference: 0.15,     // Reference numbers when available
    account: 0.05,       // Account codes for additional validation
  },
  
  // Document IO-inspired processing
  batchSize: 100,
  maxProcessingTime: 300000, // 5 minutes
  
  // String similarity configuration
  similarity: {
    levenshteinWeight: 0.3,
    jaroWinklerWeight: 0.4,
    tokenSortWeight: 0.2,
    phoneticWeight: 0.1,
  }
};

// Interfaces for reconciliation data structures
interface ReconciliationJob {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Data sources
  sourceData: ReconciliationRecord[];
  targetData: ReconciliationRecord[];
  
  // Configuration
  config: ReconciliationConfig;
  
  // Results
  results?: ReconciliationResults;
  
  // Audit information
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  executionTime?: number;
}

interface ReconciliationRecord {
  id: string;
  amount: number;
  description: string;
  date: string;
  reference?: string;
  accountCode?: string;
  customerId?: string;
  vendorId?: string;
  metadata?: Record<string, any>;
}

interface ReconciliationConfig {
  matchingAlgorithm: 'comprehensive' | 'fast' | 'strict';
  confidenceThreshold: number;
  dateToleranceDays: number;
  amountTolerancePercent: number;
  allowPartialMatches: boolean;
  requireExactAmount: boolean;
  fieldMappings: Record<string, string>;
}

interface ReconciliationResults {
  summary: ReconciliationSummary;
  matches: ReconciliationMatch[];
  unmatched: ReconciliationUnmatched;
  auditTrail: ReconciliationAuditEvent[];
  confidence: number;
}

interface ReconciliationSummary {
  totalRecords: number;
  exactMatches: number;
  strongMatches: number;
  moderateMatches: number;
  weakMatches: number;
  unmatched: number;
  overallConfidence: number;
  matchRate: number;
  processingTime: number;
  dataQuality: DataQualityMetrics;
}

interface ReconciliationMatch {
  id: string;
  sourceRecord: ReconciliationRecord;
  targetRecord: ReconciliationRecord;
  matchType: 'exact' | 'strong' | 'moderate' | 'weak';
  confidence: number;
  matchingFields: FieldMatch[];
  discrepancies: FieldDiscrepancy[];
  recommendedAction: 'accept' | 'review' | 'reject';
}

interface FieldMatch {
  field: string;
  sourceValue: any;
  targetValue: any;
  similarity: number;
  weight: number;
  contribution: number;
}

interface FieldDiscrepancy {
  field: string;
  sourceValue: any;
  targetValue: any;
  difference: number | string;
  significance: 'critical' | 'major' | 'minor';
}

interface ReconciliationUnmatched {
  sourceRecords: ReconciliationRecord[];
  targetRecords: ReconciliationRecord[];
}

interface DataQualityMetrics {
  completeness: number;
  consistency: number;
  accuracy: number;
  duplicates: number;
  missingFields: string[];
}

interface ReconciliationAuditEvent {
  timestamp: number;
  event: string;
  details: Record<string, any>;
}

/**
 * Action: Process CSV Data Reconciliation
 * Main reconciliation engine with Document IO-inspired processing
 */
export const processReconciliation = action({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    jobName: v.string(),
    jobDescription: v.string(),
    sourceData: v.array(v.object({
      id: v.string(),
      amount: v.number(),
      description: v.string(),
      date: v.string(),
      reference: v.optional(v.string()),
      accountCode: v.optional(v.string()),
      customerId: v.optional(v.string()),
      vendorId: v.optional(v.string()),
      metadata: v.optional(v.any()),
    })),
    targetData: v.array(v.object({
      id: v.string(),
      amount: v.number(),
      description: v.string(),
      date: v.string(),
      reference: v.optional(v.string()),
      accountCode: v.optional(v.string()),
      customerId: v.optional(v.string()),
      vendorId: v.optional(v.string()),
      metadata: v.optional(v.any()),
    })),
    config: v.optional(v.object({
      matchingAlgorithm: v.union(v.literal("comprehensive"), v.literal("fast"), v.literal("strict")),
      confidenceThreshold: v.optional(v.number()),
      dateToleranceDays: v.optional(v.number()),
      amountTolerancePercent: v.optional(v.number()),
      allowPartialMatches: v.optional(v.boolean()),
      requireExactAmount: v.optional(v.boolean()),
      fieldMappings: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args): Promise<ReconciliationResults> => {
    const startTime = Date.now();
    
    try {
      // 1. Initialize reconciliation job
      const jobId = generateJobId();
      const auditTrail: ReconciliationAuditEvent[] = [];
      
      auditTrail.push({
        timestamp: startTime,
        event: 'reconciliation_started',
        details: {
          sourceRecords: args.sourceData.length,
          targetRecords: args.targetData.length,
          jobName: args.jobName,
        }
      });

      // 2. Validate and preprocess data
      const { sourceData, targetData, quality } = await preprocessData(
        args.sourceData, 
        args.targetData, 
        auditTrail
      );

      // 3. Apply reconciliation configuration
      const reconciliationConfig: ReconciliationConfig = {
        matchingAlgorithm: args.config?.matchingAlgorithm || 'comprehensive',
        confidenceThreshold: args.config?.confidenceThreshold || RECONCILIATION_CONFIG.minimumConfidence,
        dateToleranceDays: args.config?.dateToleranceDays || 5,
        amountTolerancePercent: args.config?.amountTolerancePercent || 0.01, // 1%
        allowPartialMatches: args.config?.allowPartialMatches ?? true,
        requireExactAmount: args.config?.requireExactAmount ?? false,
        fieldMappings: args.config?.fieldMappings || {},
      };

      // 4. Execute multi-stage matching pipeline
      const matches = await executeMatchingPipeline(
        sourceData,
        targetData,
        reconciliationConfig,
        auditTrail
      );

      // 5. Calculate confidence scores and filter results
      const scoredMatches = await calculateConfidenceScores(matches, reconciliationConfig);
      const filteredMatches = scoredMatches.filter(
        match => match.confidence >= reconciliationConfig.confidenceThreshold
      );

      // 6. Identify unmatched records
      const matchedSourceIds = new Set(filteredMatches.map(m => m.sourceRecord.id));
      const matchedTargetIds = new Set(filteredMatches.map(m => m.targetRecord.id));
      
      const unmatched: ReconciliationUnmatched = {
        sourceRecords: sourceData.filter(record => !matchedSourceIds.has(record.id)),
        targetRecords: targetData.filter(record => !matchedTargetIds.has(record.id)),
      };

      // 7. Generate comprehensive summary
      const summary = generateReconciliationSummary(
        filteredMatches,
        unmatched,
        quality,
        startTime,
        sourceData.length + targetData.length
      );

      // 8. Calculate overall confidence based on 92.7% target
      const overallConfidence = calculateOverallConfidence(summary, filteredMatches);

      // 9. Finalize audit trail
      auditTrail.push({
        timestamp: Date.now(),
        event: 'reconciliation_completed',
        details: {
          matches: filteredMatches.length,
          confidence: overallConfidence,
          executionTime: Date.now() - startTime,
        }
      });

      // 10. Store reconciliation job results
      await ctx.runMutation(api.reconciliationJobs.create, {
        id: jobId,
        organizationId: args.organizationId,
        userId: args.userId,
        name: args.jobName,
        description: args.jobDescription,
        status: 'completed',
        results: {
          summary: { ...summary, overallConfidence },
          totalMatches: filteredMatches.length,
          confidence: overallConfidence,
        },
        completedAt: Date.now(),
        executionTime: Date.now() - startTime,
      });

      // 11. Return results
      const results: ReconciliationResults = {
        summary: { ...summary, overallConfidence },
        matches: filteredMatches,
        unmatched,
        auditTrail,
        confidence: overallConfidence,
      };

      return results;

    } catch (error: any) {
      console.error('Reconciliation processing failed:', error);
      throw new Error(`Data reconciliation failed: ${error.message}`);
    }
  },
});

/**
 * Data Preprocessing and Quality Assessment
 */
async function preprocessData(
  sourceData: any[],
  targetData: any[],
  auditTrail: ReconciliationAuditEvent[]
): Promise<{ sourceData: ReconciliationRecord[]; targetData: ReconciliationRecord[]; quality: DataQualityMetrics }> {
  
  // Standardize and clean data
  const cleanSourceData = sourceData.map(record => ({
    ...record,
    description: standardizeDescription(record.description),
    amount: parseFloat(record.amount.toString()),
    date: standardizeDate(record.date),
  }));

  const cleanTargetData = targetData.map(record => ({
    ...record,
    description: standardizeDescription(record.description),
    amount: parseFloat(record.amount.toString()),
    date: standardizeDate(record.date),
  }));

  // Assess data quality
  const quality = assessDataQuality([...cleanSourceData, ...cleanTargetData]);

  auditTrail.push({
    timestamp: Date.now(),
    event: 'data_preprocessing_completed',
    details: {
      originalRecords: sourceData.length + targetData.length,
      cleanedRecords: cleanSourceData.length + cleanTargetData.length,
      qualityScore: quality.accuracy,
    }
  });

  return {
    sourceData: cleanSourceData,
    targetData: cleanTargetData,
    quality,
  };
}

/**
 * Multi-Stage Matching Pipeline
 */
async function executeMatchingPipeline(
  sourceData: ReconciliationRecord[],
  targetData: ReconciliationRecord[],
  config: ReconciliationConfig,
  auditTrail: ReconciliationAuditEvent[]
): Promise<ReconciliationMatch[]> {
  
  const matches: ReconciliationMatch[] = [];
  const usedTargetIds = new Set<string>();

  auditTrail.push({
    timestamp: Date.now(),
    event: 'matching_pipeline_started',
    details: { algorithm: config.matchingAlgorithm }
  });

  // Stage 1: Exact Matches (100% confidence)
  for (const sourceRecord of sourceData) {
    const exactMatch = findExactMatch(sourceRecord, targetData, usedTargetIds);
    if (exactMatch) {
      matches.push(exactMatch);
      usedTargetIds.add(exactMatch.targetRecord.id);
    }
  }

  auditTrail.push({
    timestamp: Date.now(),
    event: 'exact_matches_completed',
    details: { exactMatches: matches.length }
  });

  // Stage 2: Strong Fuzzy Matches (85%+ confidence)
  for (const sourceRecord of sourceData) {
    if (matches.some(m => m.sourceRecord.id === sourceRecord.id)) continue;

    const strongMatch = findBestFuzzyMatch(
      sourceRecord,
      targetData,
      usedTargetIds,
      RECONCILIATION_CONFIG.strongMatchThreshold,
      config
    );
    
    if (strongMatch) {
      matches.push(strongMatch);
      usedTargetIds.add(strongMatch.targetRecord.id);
    }
  }

  auditTrail.push({
    timestamp: Date.now(),
    event: 'strong_matches_completed',
    details: { strongMatches: matches.length - matches.filter(m => m.matchType === 'exact').length }
  });

  // Stage 3: Moderate Fuzzy Matches (70%+ confidence)
  if (config.allowPartialMatches) {
    for (const sourceRecord of sourceData) {
      if (matches.some(m => m.sourceRecord.id === sourceRecord.id)) continue;

      const moderateMatch = findBestFuzzyMatch(
        sourceRecord,
        targetData,
        usedTargetIds,
        RECONCILIATION_CONFIG.moderateMatchThreshold,
        config
      );
      
      if (moderateMatch) {
        matches.push(moderateMatch);
        usedTargetIds.add(moderateMatch.targetRecord.id);
      }
    }
  }

  auditTrail.push({
    timestamp: Date.now(),
    event: 'matching_pipeline_completed',
    details: { totalMatches: matches.length }
  });

  return matches;
}

/**
 * Find Exact Match
 */
function findExactMatch(
  sourceRecord: ReconciliationRecord,
  targetData: ReconciliationRecord[],
  usedTargetIds: Set<string>
): ReconciliationMatch | null {
  
  for (const targetRecord of targetData) {
    if (usedTargetIds.has(targetRecord.id)) continue;

    // Check for exact match on critical fields
    const amountMatch = Math.abs(sourceRecord.amount - targetRecord.amount) < 0.01;
    const dateMatch = sourceRecord.date === targetRecord.date;
    const descriptionMatch = sourceRecord.description.toLowerCase() === targetRecord.description.toLowerCase();
    
    if (amountMatch && (dateMatch || descriptionMatch)) {
      return {
        id: `match_${sourceRecord.id}_${targetRecord.id}`,
        sourceRecord,
        targetRecord,
        matchType: 'exact',
        confidence: 100.0,
        matchingFields: [
          { field: 'amount', sourceValue: sourceRecord.amount, targetValue: targetRecord.amount, similarity: 1.0, weight: 0.35, contribution: 0.35 },
          { field: 'description', sourceValue: sourceRecord.description, targetValue: targetRecord.description, similarity: descriptionMatch ? 1.0 : 0.0, weight: 0.25, contribution: descriptionMatch ? 0.25 : 0.0 },
          { field: 'date', sourceValue: sourceRecord.date, targetValue: targetRecord.date, similarity: dateMatch ? 1.0 : 0.0, weight: 0.20, contribution: dateMatch ? 0.20 : 0.0 },
        ],
        discrepancies: [],
        recommendedAction: 'accept',
      };
    }
  }

  return null;
}

/**
 * Find Best Fuzzy Match using advanced similarity algorithms
 */
function findBestFuzzyMatch(
  sourceRecord: ReconciliationRecord,
  targetData: ReconciliationRecord[],
  usedTargetIds: Set<string>,
  threshold: number,
  config: ReconciliationConfig
): ReconciliationMatch | null {
  
  let bestMatch: ReconciliationMatch | null = null;
  let bestScore = 0;

  for (const targetRecord of targetData) {
    if (usedTargetIds.has(targetRecord.id)) continue;

    const similarity = calculateCompositeSimilarity(sourceRecord, targetRecord, config);
    
    if (similarity >= threshold && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = createFuzzyMatch(sourceRecord, targetRecord, similarity, config);
    }
  }

  return bestMatch;
}

/**
 * Calculate Composite Similarity Score
 */
function calculateCompositeSimilarity(
  sourceRecord: ReconciliationRecord,
  targetRecord: ReconciliationRecord,
  config: ReconciliationConfig
): number {
  
  let totalScore = 0;
  let totalWeight = 0;

  // Amount similarity (most important)
  const amountSimilarity = calculateAmountSimilarity(
    sourceRecord.amount, 
    targetRecord.amount, 
    config.amountTolerancePercent
  );
  totalScore += amountSimilarity * RECONCILIATION_CONFIG.fieldWeights.amount;
  totalWeight += RECONCILIATION_CONFIG.fieldWeights.amount;

  // Description similarity (fuzzy string matching)
  const descriptionSimilarity = calculateStringSimilarity(
    sourceRecord.description, 
    targetRecord.description
  );
  totalScore += descriptionSimilarity * RECONCILIATION_CONFIG.fieldWeights.description;
  totalWeight += RECONCILIATION_CONFIG.fieldWeights.description;

  // Date similarity (with tolerance)
  const dateSimilarity = calculateDateSimilarity(
    sourceRecord.date, 
    targetRecord.date, 
    config.dateToleranceDays
  );
  totalScore += dateSimilarity * RECONCILIATION_CONFIG.fieldWeights.date;
  totalWeight += RECONCILIATION_CONFIG.fieldWeights.date;

  // Reference similarity (if available)
  if (sourceRecord.reference && targetRecord.reference) {
    const referenceSimilarity = calculateStringSimilarity(
      sourceRecord.reference, 
      targetRecord.reference
    );
    totalScore += referenceSimilarity * RECONCILIATION_CONFIG.fieldWeights.reference;
    totalWeight += RECONCILIATION_CONFIG.fieldWeights.reference;
  }

  // Account code similarity (if available)
  if (sourceRecord.accountCode && targetRecord.accountCode) {
    const accountSimilarity = sourceRecord.accountCode === targetRecord.accountCode ? 1.0 : 0.0;
    totalScore += accountSimilarity * RECONCILIATION_CONFIG.fieldWeights.account;
    totalWeight += RECONCILIATION_CONFIG.fieldWeights.account;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * String Similarity using multiple algorithms
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Levenshtein distance similarity
  const levenshteinSim = 1 - (levenshteinDistance(s1, s2) / Math.max(s1.length, s2.length));
  
  // Jaro-Winkler similarity
  const jaroWinklerSim = jaroWinklerSimilarity(s1, s2);
  
  // Token sort ratio (for reordered words)
  const tokenSortSim = tokenSortRatio(s1, s2);
  
  // Phonetic similarity (simplified Soundex)
  const phoneticSim = soundexSimilarity(s1, s2);

  // Weighted combination
  const weights = RECONCILIATION_CONFIG.similarity;
  return (
    levenshteinSim * weights.levenshteinWeight +
    jaroWinklerSim * weights.jaroWinklerWeight +
    tokenSortSim * weights.tokenSortWeight +
    phoneticSim * weights.phoneticWeight
  );
}

/**
 * Calculate Amount Similarity
 */
function calculateAmountSimilarity(amount1: number, amount2: number, tolerancePercent: number): number {
  const difference = Math.abs(amount1 - amount2);
  const average = (Math.abs(amount1) + Math.abs(amount2)) / 2;
  
  if (average === 0) return amount1 === amount2 ? 1.0 : 0.0;
  
  const percentDifference = difference / average;
  
  if (percentDifference <= tolerancePercent) {
    return 1.0 - (percentDifference / tolerancePercent) * 0.1; // Small penalty for non-exact matches
  }
  
  // Exponential decay for larger differences
  return Math.max(0, Math.exp(-percentDifference * 5));
}

/**
 * Calculate Date Similarity
 */
function calculateDateSimilarity(date1: string, date2: string, toleranceDays: number): number {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 0) return 1.0;
    if (diffDays <= toleranceDays) {
      return 1.0 - (diffDays / toleranceDays) * 0.2; // Small penalty for date differences
    }
    
    // Exponential decay for larger date differences
    return Math.max(0, Math.exp(-diffDays / (toleranceDays * 2)));
  } catch {
    return 0.0;
  }
}

/**
 * String Similarity Algorithms Implementation
 */

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len2][len1];
}

function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Identify matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + (0.1 * prefix * (1 - jaro));
}

function tokenSortRatio(s1: string, s2: string): number {
  const tokens1 = s1.split(/\s+/).sort().join(' ');
  const tokens2 = s2.split(/\s+/).sort().join(' ');
  
  return 1 - (levenshteinDistance(tokens1, tokens2) / Math.max(tokens1.length, tokens2.length));
}

function soundexSimilarity(s1: string, s2: string): number {
  const soundex1 = generateSoundex(s1);
  const soundex2 = generateSoundex(s2);
  return soundex1 === soundex2 ? 1.0 : 0.0;
}

function generateSoundex(str: string): string {
  const code = str.toUpperCase().charAt(0);
  const consonants = str.toUpperCase().slice(1).replace(/[AEIOUYHW]/g, '');
  const digits = consonants.replace(/[BFPV]/g, '1')
                          .replace(/[CGJKQSXZ]/g, '2')
                          .replace(/[DT]/g, '3')
                          .replace(/[L]/g, '4')
                          .replace(/[MN]/g, '5')
                          .replace(/[R]/g, '6')
                          .replace(/[^0-9]/g, '');
  
  return (code + digits + '000').slice(0, 4);
}

/**
 * Create Fuzzy Match Object
 */
function createFuzzyMatch(
  sourceRecord: ReconciliationRecord,
  targetRecord: ReconciliationRecord,
  similarity: number,
  config: ReconciliationConfig
): ReconciliationMatch {
  
  const matchType = similarity >= RECONCILIATION_CONFIG.strongMatchThreshold 
    ? 'strong' 
    : similarity >= RECONCILIATION_CONFIG.moderateMatchThreshold 
    ? 'moderate' 
    : 'weak';

  const fieldMatches: FieldMatch[] = [
    {
      field: 'amount',
      sourceValue: sourceRecord.amount,
      targetValue: targetRecord.amount,
      similarity: calculateAmountSimilarity(sourceRecord.amount, targetRecord.amount, config.amountTolerancePercent),
      weight: RECONCILIATION_CONFIG.fieldWeights.amount,
      contribution: 0, // Will be calculated
    },
    {
      field: 'description',
      sourceValue: sourceRecord.description,
      targetValue: targetRecord.description,
      similarity: calculateStringSimilarity(sourceRecord.description, targetRecord.description),
      weight: RECONCILIATION_CONFIG.fieldWeights.description,
      contribution: 0,
    },
    {
      field: 'date',
      sourceValue: sourceRecord.date,
      targetValue: targetRecord.date,
      similarity: calculateDateSimilarity(sourceRecord.date, targetRecord.date, config.dateToleranceDays),
      weight: RECONCILIATION_CONFIG.fieldWeights.date,
      contribution: 0,
    },
  ];

  // Calculate contributions
  fieldMatches.forEach(fm => {
    fm.contribution = fm.similarity * fm.weight;
  });

  const discrepancies: FieldDiscrepancy[] = [];
  
  // Identify significant discrepancies
  if (Math.abs(sourceRecord.amount - targetRecord.amount) > 0.01) {
    discrepancies.push({
      field: 'amount',
      sourceValue: sourceRecord.amount,
      targetValue: targetRecord.amount,
      difference: sourceRecord.amount - targetRecord.amount,
      significance: Math.abs(sourceRecord.amount - targetRecord.amount) > Math.abs(sourceRecord.amount) * 0.1 ? 'critical' : 'minor',
    });
  }

  const recommendedAction = similarity >= 0.9 ? 'accept' : similarity >= 0.7 ? 'review' : 'reject';

  return {
    id: `match_${sourceRecord.id}_${targetRecord.id}`,
    sourceRecord,
    targetRecord,
    matchType,
    confidence: similarity * 100,
    matchingFields: fieldMatches,
    discrepancies,
    recommendedAction,
  };
}

/**
 * Calculate Confidence Scores for matches
 */
async function calculateConfidenceScores(
  matches: ReconciliationMatch[],
  config: ReconciliationConfig
): Promise<ReconciliationMatch[]> {
  
  return matches.map(match => {
    // Base confidence from similarity
    let confidence = match.confidence;
    
    // Boost confidence for exact amount matches
    if (Math.abs(match.sourceRecord.amount - match.targetRecord.amount) < 0.01) {
      confidence = Math.min(100, confidence + 5);
    }
    
    // Boost confidence for exact date matches
    if (match.sourceRecord.date === match.targetRecord.date) {
      confidence = Math.min(100, confidence + 3);
    }
    
    // Boost confidence for reference number matches
    if (match.sourceRecord.reference && 
        match.targetRecord.reference && 
        match.sourceRecord.reference === match.targetRecord.reference) {
      confidence = Math.min(100, confidence + 10);
    }
    
    // Reduce confidence for significant discrepancies
    if (match.discrepancies.some(d => d.significance === 'critical')) {
      confidence = Math.max(0, confidence - 15);
    }
    
    return {
      ...match,
      confidence,
    };
  });
}

/**
 * Generate Reconciliation Summary
 */
function generateReconciliationSummary(
  matches: ReconciliationMatch[],
  unmatched: ReconciliationUnmatched,
  quality: DataQualityMetrics,
  startTime: number,
  totalRecords: number
): ReconciliationSummary {
  
  const exactMatches = matches.filter(m => m.matchType === 'exact').length;
  const strongMatches = matches.filter(m => m.matchType === 'strong').length;
  const moderateMatches = matches.filter(m => m.matchType === 'moderate').length;
  const weakMatches = matches.filter(m => m.matchType === 'weak').length;
  const unmatchedCount = unmatched.sourceRecords.length + unmatched.targetRecords.length;
  
  const matchRate = totalRecords > 0 ? ((matches.length * 2) / totalRecords) * 100 : 0;
  const avgConfidence = matches.length > 0 ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length : 0;

  return {
    totalRecords,
    exactMatches,
    strongMatches,
    moderateMatches,
    weakMatches,
    unmatched: unmatchedCount,
    overallConfidence: avgConfidence,
    matchRate,
    processingTime: Date.now() - startTime,
    dataQuality: quality,
  };
}

/**
 * Calculate Overall Confidence targeting 92.7%
 */
function calculateOverallConfidence(
  summary: ReconciliationSummary,
  matches: ReconciliationMatch[]
): number {
  
  // Base confidence from match quality
  let confidence = summary.overallConfidence;
  
  // Adjust based on match rate
  if (summary.matchRate > 80) {
    confidence += 5; // High match rate bonus
  } else if (summary.matchRate < 50) {
    confidence -= 10; // Low match rate penalty
  }
  
  // Adjust based on data quality
  confidence += (summary.dataQuality.accuracy - 80) * 0.2;
  confidence += (summary.dataQuality.completeness - 80) * 0.1;
  
  // Exact match bonus
  const exactMatchRate = summary.exactMatches / (matches.length || 1);
  if (exactMatchRate > 0.5) {
    confidence += exactMatchRate * 10;
  }
  
  // Processing efficiency bonus
  if (summary.processingTime < 30000) { // Under 30 seconds
    confidence += 2;
  }
  
  return Math.min(100, Math.max(0, confidence));
}

/**
 * Utility Functions
 */

function generateJobId(): string {
  return `reconcile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function standardizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function standardizeDate(date: string): string {
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return date;
  }
}

function assessDataQuality(records: ReconciliationRecord[]): DataQualityMetrics {
  const totalRecords = records.length;
  if (totalRecords === 0) {
    return { completeness: 0, consistency: 0, accuracy: 0, duplicates: 0, missingFields: [] };
  }

  // Completeness: percentage of records with all required fields
  const completeRecords = records.filter(r => 
    r.amount !== undefined && 
    r.description && 
    r.date
  ).length;
  const completeness = (completeRecords / totalRecords) * 100;

  // Consistency: percentage of records with consistent data types and formats
  const consistentRecords = records.filter(r => 
    typeof r.amount === 'number' && 
    typeof r.description === 'string' && 
    isValidDate(r.date)
  ).length;
  const consistency = (consistentRecords / totalRecords) * 100;

  // Accuracy: estimated based on data validation rules
  const accurateRecords = records.filter(r => 
    !isNaN(r.amount) && 
    r.amount !== 0 && 
    r.description.length > 3
  ).length;
  const accuracy = (accurateRecords / totalRecords) * 100;

  // Duplicates: records with identical key fields
  const duplicateGroups = new Map<string, number>();
  records.forEach(record => {
    const key = `${record.amount}_${record.description}_${record.date}`;
    duplicateGroups.set(key, (duplicateGroups.get(key) || 0) + 1);
  });
  const duplicates = Array.from(duplicateGroups.values()).filter(count => count > 1).length;

  // Missing fields analysis
  const missingFields: string[] = [];
  if (records.some(r => !r.reference)) missingFields.push('reference');
  if (records.some(r => !r.accountCode)) missingFields.push('accountCode');

  return { completeness, consistency, accuracy, duplicates, missingFields };
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Query: Get Reconciliation Job Results
 */
export const getReconciliationJob = query({
  args: {
    jobId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("reconciliationJobs")
      .filter(q => q.and(
        q.eq(q.field("id"), args.jobId),
        q.eq(q.field("organizationId"), args.organizationId)
      ))
      .first();

    return job;
  },
});

/**
 * Query: List Recent Reconciliation Jobs
 */
export const listReconciliationJobs = query({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reconciliationJobs")
      .withIndex("by_organization", q => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(args.limit || 10);
  },
});

export default {
  processReconciliation,
  getReconciliationJob,
  listReconciliationJobs,
};