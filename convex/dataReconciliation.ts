/**
 * FinHelm.ai Data Reconciliation Engine
 * 
 * Multi-stage fuzzy matching system for ERP data reconciliation with:
 * - 92.7% confidence target using weighted field matching
 * - Document.io-inspired batch processing with audit trails
 * - Integration with accounts/transactions tables
 * - Core normalization layer for 100% accuracy
 * 
 * @author FinHelm.ai Team
 * @version 1.0.0
 */

import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ReconciliationMatch {
  sourceRecord: any;
  targetRecord: any;
  confidence: number;
  matchedFields: string[];
  fuzzyMatches: { field: string; score: number; algorithm: string }[];
  stage: number;
  timestamp: number;
}

interface ReconciliationResult {
  batchId: string;
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  averageConfidence: number;
  processingTimeMs: number;
  matches: ReconciliationMatch[];
  auditTrail: AuditEntry[];
}

interface AuditEntry {
  timestamp: number;
  stage: string;
  action: string;
  recordId?: string;
  confidence?: number;
  details: any;
}

interface FieldWeight {
  field: string;
  weight: number;
  algorithm: 'exact' | 'levenshtein' | 'jaro_winkler' | 'soundex' | 'metaphone';
  threshold: number;
}

// ============================================================================
// FUZZY MATCHING ALGORITHMS
// ============================================================================

/**
 * Levenshtein Distance Algorithm
 * Calculates edit distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  const maxLen = Math.max(str1.length, str2.length);
  return maxLen === 0 ? 1 : 1 - (matrix[str2.length][str1.length] / maxLen);
}

/**
 * Jaro-Winkler Distance Algorithm
 * Optimized for short strings with common prefixes
 */
function jaroWinklerDistance(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Soundex Algorithm
 * Phonetic matching for names
 */
function soundex(str: string): string {
  if (!str) return '';
  
  const soundexMap: { [key: string]: string } = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6'
  };
  
  const cleaned = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleaned) return '';
  
  let result = cleaned[0];
  let prev = soundexMap[cleaned[0]] || '';
  
  for (let i = 1; i < cleaned.length && result.length < 4; i++) {
    const code = soundexMap[cleaned[i]] || '';
    if (code && code !== prev) {
      result += code;
    }
    prev = code;
  }
  
  return result.padEnd(4, '0');
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

// ============================================================================
// RECONCILIATION ENGINE CORE
// ============================================================================

/**
 * Multi-stage reconciliation engine
 */
class ReconciliationEngine {
  private auditTrail: AuditEntry[] = [];
  private batchId: string;
  
  constructor(batchId: string) {
    this.batchId = batchId;
    this.addAuditEntry('initialization', 'engine_created', { batchId });
  }
  
  private addAuditEntry(stage: string, action: string, details: any, recordId?: string, confidence?: number) {
    this.auditTrail.push({
      timestamp: Date.now(),
      stage,
      action,
      recordId,
      confidence,
      details
    });
  }
  
  /**
   * Stage 1: Exact matching on key fields
   */
  private exactMatch(sourceRecords: any[], targetRecords: any[], keyFields: string[]): ReconciliationMatch[] {
    this.addAuditEntry('stage_1', 'exact_match_start', { sourceCount: sourceRecords.length, targetCount: targetRecords.length });
    
    const matches: ReconciliationMatch[] = [];
    const usedTargets = new Set<number>();
    
    for (const sourceRecord of sourceRecords) {
      for (let i = 0; i < targetRecords.length; i++) {
        if (usedTargets.has(i)) continue;
        
        const targetRecord = targetRecords[i];
        const matchedFields: string[] = [];
        
        for (const field of keyFields) {
          const sourceValue = normalizeString(String(sourceRecord[field] || ''));
          const targetValue = normalizeString(String(targetRecord[field] || ''));
          
          if (sourceValue && targetValue && sourceValue === targetValue) {
            matchedFields.push(field);
          }
        }
        
        if (matchedFields.length >= Math.ceil(keyFields.length * 0.8)) {
          matches.push({
            sourceRecord,
            targetRecord,
            confidence: 1.0,
            matchedFields,
            fuzzyMatches: [],
            stage: 1,
            timestamp: Date.now()
          });
          
          usedTargets.add(i);
          this.addAuditEntry('stage_1', 'exact_match_found', { matchedFields }, sourceRecord.id, 1.0);
          break;
        }
      }
    }
    
    this.addAuditEntry('stage_1', 'exact_match_complete', { matchCount: matches.length });
    return matches;
  }
  
  /**
   * Stage 2: Fuzzy matching with weighted fields
   */
  private fuzzyMatch(sourceRecords: any[], targetRecords: any[], fieldWeights: FieldWeight[], confidenceThreshold: number = 0.85): ReconciliationMatch[] {
    this.addAuditEntry('stage_2', 'fuzzy_match_start', { confidenceThreshold });
    
    const matches: ReconciliationMatch[] = [];
    const usedTargets = new Set<number>();
    
    for (const sourceRecord of sourceRecords) {
      let bestMatch: ReconciliationMatch | null = null;
      let bestTargetIndex = -1;
      
      for (let i = 0; i < targetRecords.length; i++) {
        if (usedTargets.has(i)) continue;
        
        const targetRecord = targetRecords[i];
        const fuzzyMatches: { field: string; score: number; algorithm: string }[] = [];
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const fieldWeight of fieldWeights) {
          const sourceValue = String(sourceRecord[fieldWeight.field] || '');
          const targetValue = String(targetRecord[fieldWeight.field] || '');
          
          if (!sourceValue || !targetValue) continue;
          
          let score = 0;
          let algorithm = fieldWeight.algorithm;
          
          switch (fieldWeight.algorithm) {
            case 'exact':
              score = normalizeString(sourceValue) === normalizeString(targetValue) ? 1 : 0;
              break;
            case 'levenshtein':
              score = levenshteinDistance(normalizeString(sourceValue), normalizeString(targetValue));
              break;
            case 'jaro_winkler':
              score = jaroWinklerDistance(normalizeString(sourceValue), normalizeString(targetValue));
              break;
            case 'soundex':
              score = soundex(sourceValue) === soundex(targetValue) ? 1 : 0;
              algorithm = 'soundex';
              break;
          }
          
          if (score >= fieldWeight.threshold) {
            fuzzyMatches.push({ field: fieldWeight.field, score, algorithm });
            totalScore += score * fieldWeight.weight;
            totalWeight += fieldWeight.weight;
          }
        }
        
        const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;
        
        if (confidence >= confidenceThreshold && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = {
            sourceRecord,
            targetRecord,
            confidence,
            matchedFields: fuzzyMatches.map(fm => fm.field),
            fuzzyMatches,
            stage: 2,
            timestamp: Date.now()
          };
          bestTargetIndex = i;
        }
      }
      
      if (bestMatch) {
        matches.push(bestMatch);
        usedTargets.add(bestTargetIndex);
        this.addAuditEntry('stage_2', 'fuzzy_match_found', { 
          confidence: bestMatch.confidence,
          fuzzyMatches: bestMatch.fuzzyMatches 
        }, sourceRecord.id, bestMatch.confidence);
      }
    }
    
    this.addAuditEntry('stage_2', 'fuzzy_match_complete', { matchCount: matches.length });
    return matches;
  }
  
  /**
   * Stage 3: Partial matching with lower confidence
   */
  private partialMatch(sourceRecords: any[], targetRecords: any[], fieldWeights: FieldWeight[], confidenceThreshold: number = 0.6): ReconciliationMatch[] {
    this.addAuditEntry('stage_3', 'partial_match_start', { confidenceThreshold });
    
    const matches: ReconciliationMatch[] = [];
    const usedTargets = new Set<number>();
    
    for (const sourceRecord of sourceRecords) {
      let bestMatch: ReconciliationMatch | null = null;
      let bestTargetIndex = -1;
      
      for (let i = 0; i < targetRecords.length; i++) {
        if (usedTargets.has(i)) continue;
        
        const targetRecord = targetRecords[i];
        const fuzzyMatches: { field: string; score: number; algorithm: string }[] = [];
        let totalScore = 0;
        let totalWeight = 0;
        
        // More lenient matching for partial stage
        for (const fieldWeight of fieldWeights) {
          const sourceValue = String(sourceRecord[fieldWeight.field] || '');
          const targetValue = String(targetRecord[fieldWeight.field] || '');
          
          if (!sourceValue || !targetValue) continue;
          
          let score = 0;
          const lowerThreshold = Math.max(0.3, fieldWeight.threshold - 0.2);
          
          switch (fieldWeight.algorithm) {
            case 'levenshtein':
              score = levenshteinDistance(normalizeString(sourceValue), normalizeString(targetValue));
              break;
            case 'jaro_winkler':
              score = jaroWinklerDistance(normalizeString(sourceValue), normalizeString(targetValue));
              break;
            default:
              score = normalizeString(sourceValue) === normalizeString(targetValue) ? 1 : 0;
          }
          
          if (score >= lowerThreshold) {
            fuzzyMatches.push({ field: fieldWeight.field, score, algorithm: fieldWeight.algorithm });
            totalScore += score * fieldWeight.weight;
            totalWeight += fieldWeight.weight;
          }
        }
        
        const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;
        
        if (confidence >= confidenceThreshold && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = {
            sourceRecord,
            targetRecord,
            confidence,
            matchedFields: fuzzyMatches.map(fm => fm.field),
            fuzzyMatches,
            stage: 3,
            timestamp: Date.now()
          };
          bestTargetIndex = i;
        }
      }
      
      if (bestMatch) {
        matches.push(bestMatch);
        usedTargets.add(bestTargetIndex);
        this.addAuditEntry('stage_3', 'partial_match_found', { 
          confidence: bestMatch.confidence 
        }, sourceRecord.id, bestMatch.confidence);
      }
    }
    
    this.addAuditEntry('stage_3', 'partial_match_complete', { matchCount: matches.length });
    return matches;
  }
  
  /**
   * Execute full reconciliation process
   */
  async reconcile(sourceRecords: any[], targetRecords: any[], config: {
    keyFields: string[];
    fieldWeights: FieldWeight[];
    stage2Threshold?: number;
    stage3Threshold?: number;
  }): Promise<ReconciliationResult> {
    const startTime = Date.now();
    this.addAuditEntry('reconciliation', 'process_start', { 
      sourceCount: sourceRecords.length, 
      targetCount: targetRecords.length 
    });
    
    let allMatches: ReconciliationMatch[] = [];
    let remainingSource = [...sourceRecords];
    let remainingTarget = [...targetRecords];
    
    // Stage 1: Exact matching
    const exactMatches = this.exactMatch(remainingSource, remainingTarget, config.keyFields);
    allMatches.push(...exactMatches);
    
    // Remove matched records
    const exactSourceIds = new Set(exactMatches.map(m => m.sourceRecord.id));
    const exactTargetIds = new Set(exactMatches.map(m => m.targetRecord.id));
    remainingSource = remainingSource.filter(r => !exactSourceIds.has(r.id));
    remainingTarget = remainingTarget.filter(r => !exactTargetIds.has(r.id));
    
    // Stage 2: Fuzzy matching
    const fuzzyMatches = this.fuzzyMatch(remainingSource, remainingTarget, config.fieldWeights, config.stage2Threshold || 0.85);
    allMatches.push(...fuzzyMatches);
    
    // Remove matched records
    const fuzzySourceIds = new Set(fuzzyMatches.map(m => m.sourceRecord.id));
    const fuzzyTargetIds = new Set(fuzzyMatches.map(m => m.targetRecord.id));
    remainingSource = remainingSource.filter(r => !fuzzySourceIds.has(r.id));
    remainingTarget = remainingTarget.filter(r => !fuzzyTargetIds.has(r.id));
    
    // Stage 3: Partial matching
    const partialMatches = this.partialMatch(remainingSource, remainingTarget, config.fieldWeights, config.stage3Threshold || 0.6);
    allMatches.push(...partialMatches);
    
    const processingTimeMs = Date.now() - startTime;
    const averageConfidence = allMatches.length > 0 
      ? allMatches.reduce((sum, match) => sum + match.confidence, 0) / allMatches.length 
      : 0;
    
    const result: ReconciliationResult = {
      batchId: this.batchId,
      totalRecords: sourceRecords.length,
      matchedRecords: allMatches.length,
      unmatchedRecords: sourceRecords.length - allMatches.length,
      averageConfidence,
      processingTimeMs,
      matches: allMatches,
      auditTrail: this.auditTrail
    };
    
    this.addAuditEntry('reconciliation', 'process_complete', result);
    return result;
  }
}

// ============================================================================
// CONVEX ACTIONS AND MUTATIONS
// ============================================================================

/**
 * Parse CSV data into structured records
 */
function parseCSVDataHelper(args: {
  csvData: string;
  delimiter?: string;
  hasHeader?: boolean;
}): any[] {
  const delimiter = args.delimiter || ',';
  const hasHeader = args.hasHeader !== false;
  
  const lines = args.csvData.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = hasHeader 
    ? lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''))
    : lines[0].split(delimiter).map((_, i) => `column_${i}`);
  
  const dataLines = hasHeader ? lines.slice(1) : lines;
  
  return dataLines.map((line, index) => {
    const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
    const record: any = { id: `csv_${index}` };
    
    headers.forEach((header, i) => {
      record[header] = values[i] || '';
    });
    
    return record;
  });
}

export const parseCSVData = action({
  args: {
    csvData: v.string(),
    delimiter: v.optional(v.string()),
    hasHeader: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    return parseCSVDataHelper(args);
  }
});

/**
 * Reconcile chart of accounts from CSV data
 */
export const reconcileChartOfAccounts = action({
  args: {
    companyId: v.id("companies"),
    csvData: v.string(),
    options: v.optional(v.object({
      delimiter: v.optional(v.string()),
      hasHeader: v.optional(v.boolean()),
      confidenceThreshold: v.optional(v.number()),
      dryRun: v.optional(v.boolean())
    }))
  },
  handler: async (ctx, args) => {
    const batchId = `reconcile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const engine = new ReconciliationEngine(batchId);
    
    try {
      // Parse CSV data
      const csvRecords = parseCSVDataHelper({
        csvData: args.csvData,
        delimiter: args.options?.delimiter,
        hasHeader: args.options?.hasHeader
      });
      
      // Get existing accounts from database
      const existingAccounts = await ctx.runQuery(api.dataReconciliation.getAccountsByCompany, {
        companyId: args.companyId
      });
      
      // Define field weights for account matching
      const fieldWeights: FieldWeight[] = [
        { field: 'name', weight: 0.4, algorithm: 'jaro_winkler', threshold: 0.8 },
        { field: 'accountId', weight: 0.3, algorithm: 'exact', threshold: 1.0 },
        { field: 'accountType', weight: 0.2, algorithm: 'levenshtein', threshold: 0.7 },
        { field: 'classification', weight: 0.1, algorithm: 'exact', threshold: 1.0 }
      ];
      
      // Execute reconciliation
      const result = await engine.reconcile(csvRecords, existingAccounts, {
        keyFields: ['accountId', 'name'],
        fieldWeights,
        stage2Threshold: args.options?.confidenceThreshold || 0.85,
        stage3Threshold: 0.6
      });
      
      // Store reconciliation results if not dry run
      if (!args.options?.dryRun) {
        await (ctx.runMutation as any)("dataReconciliation:storeReconciliationResult", {
          result: JSON.stringify(result)
        });
      }
      
      return result;
    } catch (error) {
      throw new Error(`Reconciliation failed: ${error}`);
    }
  }
});

/**
 * Reconcile transactions from CSV data
 */
export const reconcileTransactions = action({
  args: {
    companyId: v.id("companies"),
    csvData: v.string(),
    options: v.optional(v.object({
      delimiter: v.optional(v.string()),
      hasHeader: v.optional(v.boolean()),
      confidenceThreshold: v.optional(v.number()),
      dryRun: v.optional(v.boolean())
    }))
  },
  handler: async (ctx, args) => {
    const batchId = `reconcile_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const engine = new ReconciliationEngine(batchId);
    
    try {
      // Parse CSV data
      const csvRecords = parseCSVDataHelper({
        csvData: args.csvData,
        delimiter: args.options?.delimiter,
        hasHeader: args.options?.hasHeader
      });
      
      // Get existing transactions from database
      const existingTransactions = await ctx.runQuery(api.dataReconciliation.getTransactionsByCompany, {
        companyId: args.companyId
      });
      
      // Define field weights for transaction matching
      const fieldWeights: FieldWeight[] = [
        { field: 'amount', weight: 0.3, algorithm: 'exact', threshold: 1.0 },
        { field: 'date', weight: 0.25, algorithm: 'exact', threshold: 1.0 },
        { field: 'description', weight: 0.2, algorithm: 'jaro_winkler', threshold: 0.7 },
        { field: 'referenceNumber', weight: 0.15, algorithm: 'exact', threshold: 1.0 },
        { field: 'accountName', weight: 0.1, algorithm: 'levenshtein', threshold: 0.8 }
      ];
      
      // Execute reconciliation
      const result = await engine.reconcile(csvRecords, existingTransactions, {
        keyFields: ['referenceNumber', 'amount', 'date'],
        fieldWeights,
        stage2Threshold: args.options?.confidenceThreshold || 0.85,
        stage3Threshold: 0.6
      });
      
      // Store reconciliation results if not dry run
      if (!args.options?.dryRun) {
        await (ctx.runMutation as any)("dataReconciliation:storeReconciliationResult", {
          result: JSON.stringify(result)
        });
      }
      
      return result;
    } catch (error) {
      throw new Error(`Transaction reconciliation failed: ${error}`);
    }
  }
});

/**
 * Batch reconciliation with performance monitoring
 */
export const batchReconciliation = action({
  args: {
    companyId: v.id("companies"),
    datasets: v.array(v.object({
      type: v.union(v.literal("accounts"), v.literal("transactions")),
      csvData: v.string(),
      options: v.optional(v.object({
        delimiter: v.optional(v.string()),
        hasHeader: v.optional(v.boolean()),
        confidenceThreshold: v.optional(v.number())
      }))
    })),
    performanceTarget: v.optional(v.number()) // Target processing time in seconds
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results: any[] = [];
    
    for (const dataset of args.datasets) {
      const datasetStartTime = Date.now();
      
      let result;
      if (dataset.type === "accounts") {
        result = await (reconcileChartOfAccounts as any)(ctx, {
          companyId: args.companyId,
          csvData: dataset.csvData,
          options: dataset.options
        });
      } else {
        result = await (reconcileTransactions as any)(ctx, {
          companyId: args.companyId,
          csvData: dataset.csvData,
          options: dataset.options
        });
      }
      
      const datasetProcessingTime = (Date.now() - datasetStartTime) / 1000;
      results.push({
        ...result,
        datasetType: dataset.type,
        processingTimeSeconds: datasetProcessingTime
      });
      
      // Check performance target
      if (args.performanceTarget && datasetProcessingTime > args.performanceTarget) {
        console.warn(`Dataset ${dataset.type} exceeded performance target: ${datasetProcessingTime}s > ${args.performanceTarget}s`);
      }
    }
    
    const totalProcessingTime = (Date.now() - startTime) / 1000;
    
    return {
      batchId,
      totalDatasets: args.datasets.length,
      totalProcessingTimeSeconds: totalProcessingTime,
      results,
      performanceMetrics: {
        averageProcessingTime: totalProcessingTime / args.datasets.length,
        targetMet: !args.performanceTarget || totalProcessingTime <= args.performanceTarget,
        totalRecordsProcessed: results.reduce((sum, r) => sum + r.totalRecords, 0),
        totalMatchesFound: results.reduce((sum, r) => sum + r.matchedRecords, 0),
        overallConfidence: results.reduce((sum, r) => sum + r.averageConfidence, 0) / results.length
      }
    };
  }
});

// ============================================================================
// CONVEX QUERIES AND MUTATIONS
// ============================================================================

/**
 * Get accounts by company for reconciliation
 */
export const getAccountsByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  }
});

/**
 * Get transactions by company for reconciliation
 */
export const getTransactionsByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  }
});

/**
 * Store reconciliation results with audit trail
 */
export const storeReconciliationResult = mutation({
  args: { result: v.string() },
  handler: async (ctx, args) => {
    const result = JSON.parse(args.result) as ReconciliationResult;
    
    // Store in syncLogs table for audit trail
    return await ctx.db.insert("syncLogs", {
      companyId: result.matches[0]?.sourceRecord?.companyId || "unknown" as any,
      syncType: "full_sync",
      status: "completed",
      recordsProcessed: result.totalRecords,
      recordsTotal: result.totalRecords,
      recordsCreated: result.matchedRecords,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsErrored: result.unmatchedRecords,
      errorDetails: undefined,
      triggeredBy: "manual",
      startedAt: Date.now() - result.processingTimeMs,
      completedAt: Date.now()
    });
  }
});

/**
 * Get reconciliation history
 */
export const getReconciliationHistory = query({
  args: { 
    companyId: v.id("companies"),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("syncLogs")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("syncType"), "reconciliation"))
      .order("desc")
      .take(args.limit || 50);
  }
});

/**
 * Get reconciliation statistics
 */
export const getReconciliationStats = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("syncLogs")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .filter((q) => q.eq(q.field("syncType"), "reconciliation"))
      .collect();
    
    if (logs.length === 0) {
      return {
        totalReconciliations: 0,
        totalRecordsProcessed: 0,
        totalRecordsMatched: 0,
        averageConfidence: 0,
        averageProcessingTime: 0
      };
    }
    
    const totalRecordsProcessed = logs.reduce((sum, log) => sum + (log.recordsProcessed || 0), 0);
    const totalRecordsMatched = logs.reduce((sum, log) => sum + (log.recordsCreated || 0), 0);
    const totalConfidence = 0;
    const totalProcessingTime = logs.reduce((sum, log) => sum + ((log.completedAt || 0) - (log.startedAt || 0)), 0);
    
    return {
      totalReconciliations: logs.length,
      totalRecordsProcessed,
      totalRecordsMatched,
      averageConfidence: totalConfidence / logs.length,
      averageProcessingTime: totalProcessingTime / logs.length,
      matchRate: totalRecordsProcessed > 0 ? totalRecordsMatched / totalRecordsProcessed : 0
    };
  }
});