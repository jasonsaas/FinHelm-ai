import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Request Batching Service for Bulk Operations and External API Calls
 * Implements efficient batching patterns for high-volume operations
 */

/**
 * Batch update multiple transactions efficiently
 */
export const batchUpdateTransactions = mutation({
  args: {
    organizationId: v.id("organizations"),
    updates: v.array(v.object({
      transactionId: v.id("transactions"),
      updates: v.object({
        status: v.optional(v.string()),
        reconciliationStatus: v.optional(v.string()),
        amount: v.optional(v.number()),
        description: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      }),
    })),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;
    const now = Date.now();
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ transactionId: string; error: string }> = [];
    
    // Process updates in batches to avoid timeout
    for (let i = 0; i < args.updates.length; i += batchSize) {
      const batch = args.updates.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (update) => {
        try {
          // Verify transaction belongs to organization
          const transaction = await ctx.db.get(update.transactionId);
          if (!transaction || transaction.organizationId !== args.organizationId) {
            throw new Error("Transaction not found or access denied");
          }
          
          // Apply updates
          const updateData: any = {
            updatedAt: now,
            ...update.updates,
          };
          
          await ctx.db.patch(update.transactionId, updateData);
          successCount++;
          
        } catch (error) {
          errorCount++;
          errors.push({
            transactionId: update.transactionId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    return {
      totalUpdates: args.updates.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10), // Limit error details
      batchesProcessed: Math.ceil(args.updates.length / batchSize),
    };
  },
});

/**
 * Batch create multiple records with validation
 */
export const batchCreateRecords = mutation({
  args: {
    organizationId: v.id("organizations"),
    tableName: v.union(
      v.literal("transactions"),
      v.literal("accounts"),
      v.literal("chatMessages")
    ),
    records: v.array(v.any()),
    validateFirst: v.optional(v.boolean()),
    skipDuplicates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: {
      created: number;
      skipped: number;
      errors: number;
      errorDetails: Array<{ index: number; error: string }>;
    } = {
      created: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };
    
    for (let i = 0; i < args.records.length; i++) {
      const record = args.records[i];
      
      try {
        // Add common fields
        const recordData = {
          ...record,
          organizationId: args.organizationId,
          createdAt: now,
          updatedAt: now,
        };
        
        // Check for duplicates if requested
        if (args.skipDuplicates && record.externalId) {
          const existing = await ctx.db
            .query(args.tableName as any)
            .filter((q) => 
              q.and(
                q.eq(q.field("organizationId"), args.organizationId),
                q.eq(q.field("externalId"), record.externalId)
              )
            )
            .first();
          
          if (existing) {
            results.skipped++;
            continue;
          }
        }
        
        // Create record
        await ctx.db.insert(args.tableName as any, recordData);
        results.created++;
        
      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          index: i,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    
    return results;
  },
});

/**
 * Batch delete records with safety checks
 */
export const batchDeleteRecords = mutation({
  args: {
    organizationId: v.id("organizations"),
    tableName: v.union(
      v.literal("transactions"),
      v.literal("chatMessages"),
      v.literal("cacheEntries")
    ),
    recordIds: v.array(v.string()),
    safetyCheck: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const safetyCheck = args.safetyCheck !== false; // Default to true
    let deletedCount = 0;
    let errorCount = 0;
    const errors: Array<{ recordId: string; error: string }> = [];
    
    // Safety check: limit batch size
    if (args.recordIds.length > 1000) {
      throw new Error("Batch size too large. Maximum 1000 records per batch.");
    }
    
    for (const recordId of args.recordIds) {
      try {
        // Verify record exists and belongs to organization
        if (safetyCheck) {
          const record = await ctx.db.get(recordId as any);
          if (!record) {
            throw new Error("Record not found");
          }
          
          if ("organizationId" in record && record.organizationId !== args.organizationId) {
            throw new Error("Access denied");
          }
        }
        
        await ctx.db.delete(recordId as any);
        deletedCount++;
        
      } catch (error) {
        errorCount++;
        errors.push({
          recordId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    
    return {
      totalRequested: args.recordIds.length,
      deletedCount,
      errorCount,
      errors: errors.slice(0, 10), // Limit error details
    };
  },
});

/**
 * Batch processing queue for large operations
 */
export const enqueueBatchJob = mutation({
  args: {
    organizationId: v.id("organizations"),
    jobType: v.union(
      v.literal("bulk_transaction_import"),
      v.literal("bulk_reconciliation"),
      v.literal("bulk_account_update"),
      v.literal("bulk_cache_refresh")
    ),
    parameters: v.object({}),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("normal"), 
      v.literal("high"),
      v.literal("critical")
    )),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const jobId = await ctx.db.insert("batchJobs", {
      organizationId: args.organizationId,
      jobType: args.jobType,
      status: "pending",
      priority: args.priority || "normal",
      parameters: args.parameters,
      progress: 0,
      recordsProcessed: 0,
      recordsTotal: 0,
      errorsEncountered: 0,
      scheduledAt: args.scheduledAt || now,
      retryCount: 0,
      maxRetries: 3,
    });
    
    console.log(`Enqueued batch job ${jobId} of type ${args.jobType}`);
    return jobId;
  },
});

/**
 * Process batch jobs from the queue
 */
export const processBatchJobs = action({
  args: {
    limit: v.optional(v.number()),
    jobTypes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const now = Date.now();
    
    // Get pending jobs ordered by priority and schedule time
    const pendingJobs = await ctx.db
      .query("batchJobs")
      .withIndex("by_status_scheduled", (q) => q.eq("status", "pending"))
      .filter((q) => q.lte(q.field("scheduledAt"), now))
      .take(limit)
      .collect();
    
    const results: Array<{ jobId: string; status: string; error?: string }> = [];
    
    for (const job of pendingJobs) {
      try {
        // Mark job as running
        await ctx.db.patch(job._id, {
          status: "running",
          startedAt: now,
        });
        
        // Process job based on type
        let result;
        switch (job.jobType) {
          case "bulk_transaction_import":
            result = await processBulkTransactionImport(ctx, job);
            break;
            
          case "bulk_reconciliation":
            result = await processBulkReconciliation(ctx, job);
            break;
            
          case "bulk_account_update":
            result = await processBulkAccountUpdate(ctx, job);
            break;
            
          case "bulk_cache_refresh":
            result = await processBulkCacheRefresh(ctx, job);
            break;
            
          default:
            throw new Error(`Unknown job type: ${job.jobType}`);
        }
        
        // Mark job as completed
        await ctx.db.patch(job._id, {
          status: "completed",
          progress: 100,
          completedAt: now,
          executionTimeMs: now - (job.startedAt || now),
        });
        
        results.push({ jobId: job._id, status: "completed" });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Check if should retry
        const shouldRetry = job.retryCount < job.maxRetries;
        const newStatus = shouldRetry ? "pending" : "failed";
        const nextRetryAt = shouldRetry 
          ? now + (Math.pow(2, job.retryCount) * 60 * 1000) // Exponential backoff
          : undefined;
        
        await ctx.db.patch(job._id, {
          status: newStatus,
          lastError: errorMessage,
          retryCount: job.retryCount + 1,
          nextRetryAt,
          ...(newStatus === "failed" && { completedAt: now }),
        });
        
        results.push({ 
          jobId: job._id, 
          status: newStatus, 
          error: errorMessage 
        });
      }
    }
    
    return {
      processed: results.length,
      results,
    };
  },
});

/**
 * Bulk operation implementations
 */
async function processBulkTransactionImport(ctx: any, job: any) {
  const { transactions, erpConnectionId } = job.parameters;
  
  return await ctx.runMutation(api.optimizedQueries.bulkUpsertTransactions, {
    organizationId: job.organizationId,
    erpConnectionId,
    transactions,
  });
}

async function processBulkReconciliation(ctx: any, job: any) {
  const { accountIds, reconciliationStatus } = job.parameters;
  
  // Get unreconciled transactions for accounts
  const transactions = await ctx.runQuery(api.transactionActions.getUnreconciledTransactions, {
    organizationId: job.organizationId,
    limit: 1000,
  });
  
  // Bulk update reconciliation status
  const updates = transactions.map((txn: any) => ({
    transactionId: txn._id,
    updates: { reconciliationStatus },
  }));
  
  return await ctx.runMutation(api.batchingService.batchUpdateTransactions, {
    organizationId: job.organizationId,
    updates,
  });
}

async function processBulkAccountUpdate(ctx: any, job: any) {
  const { balanceUpdates } = job.parameters;
  
  return await ctx.runMutation(api.accountActions.updateAccountBalances, {
    organizationId: job.organizationId,
    balanceUpdates,
  });
}

async function processBulkCacheRefresh(ctx: any, job: any) {
  const { cacheKeys } = job.parameters;
  
  // Delete specified cache entries to force refresh
  const deletePromises = cacheKeys.map((key: string) =>
    ctx.db
      .query("cacheEntries")
      .withIndex("by_key", (q) => q.eq("key", key))
      .filter((q) => q.eq(q.field("organizationId"), job.organizationId))
      .first()
      .then((entry: any) => entry && ctx.db.delete(entry._id))
  );
  
  await Promise.all(deletePromises);
  
  return {
    clearedKeys: cacheKeys.length,
  };
}

/**
 * Get batch job status
 */
export const getBatchJobStatus = query({
  args: {
    jobId: v.id("batchJobs"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    
    if (!job || job.organizationId !== args.organizationId) {
      return null;
    }
    
    return {
      ...job,
      estimatedTimeRemaining: calculateEstimatedTimeRemaining(job),
      progressPercentage: job.progress,
    };
  },
});

function calculateEstimatedTimeRemaining(job: any): number | null {
  if (job.status !== "running" || !job.startedAt || job.progress === 0) {
    return null;
  }
  
  const elapsed = Date.now() - job.startedAt;
  const progressRatio = job.progress / 100;
  const estimatedTotal = elapsed / progressRatio;
  
  return Math.max(0, estimatedTotal - elapsed);
}