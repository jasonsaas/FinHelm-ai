import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { findBestAccountMatches, detectTransactionAnomalies } from "./utils";
import { getERPAdapter, ERPConnection } from "./erpAdapter";

/**
 * ERP Data Synchronization and Reconciliation Actions
 * Inspired by Oracle Document IO intelligent matching
 */

/**
 * Sync ERP data with fuzzy matching and reconciliation using adapter pattern
 */
export const syncERPData = action({
  args: {
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    dataType: v.union(v.literal("accounts"), v.literal("transactions"), v.literal("full")),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
    reconciliationOptions: v.optional(v.object({
      fuzzyMatchThreshold: v.optional(v.number()),
      autoApplyHighConfidenceMatches: v.optional(v.boolean()),
      skipDuplicates: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Get ERP connection details
    const erpConnection = await ctx.db.get(args.erpConnectionId);
    if (!erpConnection) {
      throw new Error("ERP connection not found");
    }

    // Create sync job record
    const syncJobId = await ctx.runMutation(api.syncActions.createSyncJob, {
      organizationId: args.organizationId,
      erpConnectionId: args.erpConnectionId,
      type: args.dataType === "full" ? "full_sync" : 
            args.dataType === "accounts" ? "accounts_sync" : "transactions_sync",
    });

    try {
      // Create ERP adapter
      const adapterConnection: ERPConnection = {
        id: args.erpConnectionId,
        erpType: erpConnection.erpType as any,
        organizationId: args.organizationId,
        credentials: erpConnection.credentials,
        isActive: erpConnection.isActive,
      };

      const adapter = getERPAdapter(erpConnection.erpType as any, adapterConnection);

      // Test connection first
      const isConnected = await adapter.connect();
      if (!isConnected) {
        throw new Error(`Failed to connect to ${erpConnection.erpType}`);
      }

      let results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };
      let sourceData: any = { accounts: [], transactions: [] };

      // Sync accounts using adapter
      if (args.dataType === "accounts" || args.dataType === "full") {
        try {
          const adapterAccounts = await adapter.syncAccounts();
          sourceData.accounts = adapterAccounts;
          
          const accountResults = await syncAccountsWithReconciliation(ctx, {
            organizationId: args.organizationId,
            erpConnectionId: args.erpConnectionId,
            sourceAccounts: adapterAccounts,
            options: args.reconciliationOptions || {},
            syncJobId,
          });
          results.inserted += accountResults.inserted;
          results.updated += accountResults.updated;
          results.skipped += accountResults.skipped;
          results.errors.push(...accountResults.errors);
        } catch (error) {
          results.errors.push(`Account sync failed: ${error}`);
        }
      }

      // Sync transactions using adapter
      if (args.dataType === "transactions" || args.dataType === "full") {
        try {
          const adapterTransactions = await adapter.syncTransactions(args.dateRange);
          sourceData.transactions = adapterTransactions;
          
          const transactionResults = await syncTransactionsWithValidation(ctx, {
            organizationId: args.organizationId,
            erpConnectionId: args.erpConnectionId,
            sourceTransactions: adapterTransactions,
            syncJobId,
          });
          results.inserted += transactionResults.inserted;
          results.updated += transactionResults.updated;
          results.skipped += transactionResults.skipped;
          results.errors.push(...transactionResults.errors);
        } catch (error) {
          results.errors.push(`Transaction sync failed: ${error}`);
        }
      }

      // Get metrics from adapter
      let metrics = null;
      try {
        metrics = await adapter.getMetrics();
      } catch (error) {
        console.warn("Failed to get ERP metrics:", error);
      }

      // Update ERP connection with last sync info
      await ctx.db.patch(args.erpConnectionId, {
        lastSyncAt: Date.now(),
        syncStatus: results.errors.length === 0 ? "active" : "failed",
        updatedAt: Date.now(),
      });

      // Complete sync job
      await ctx.runMutation(api.syncActions.completeSyncJob, {
        syncJobId,
        results,
        executionTime: Date.now() - startTime,
      });

      console.log(`ERP sync completed for ${erpConnection.erpType} org ${args.organizationId}: ${JSON.stringify(results)}`);
      return { 
        syncJobId, 
        results, 
        metrics,
        erpType: erpConnection.erpType,
        sourceDataCounts: {
          accounts: sourceData.accounts?.length || 0,
          transactions: sourceData.transactions?.length || 0,
        }
      };

    } catch (error) {
      // Mark sync job as failed
      await ctx.runMutation(api.syncActions.failSyncJob, {
        syncJobId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Update connection status
      await ctx.db.patch(args.erpConnectionId, {
        syncStatus: "failed",
        updatedAt: Date.now(),
      });

      throw error;
    }
  },
});

/**
 * Legacy sync method for backward compatibility (using provided source data)
 */
export const syncERPDataLegacy = action({
  args: {
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    dataType: v.union(v.literal("accounts"), v.literal("transactions"), v.literal("full")),
    sourceData: v.array(v.any()),
    reconciliationOptions: v.optional(v.object({
      fuzzyMatchThreshold: v.optional(v.number()),
      autoApplyHighConfidenceMatches: v.optional(v.boolean()),
      skipDuplicates: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Create sync job record
    const syncJobId = await ctx.runMutation(api.syncActions.createSyncJob, {
      organizationId: args.organizationId,
      erpConnectionId: args.erpConnectionId,
      type: args.dataType === "full" ? "full_sync" : 
            args.dataType === "accounts" ? "accounts_sync" : "transactions_sync",
    });

    try {
      let results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

      if (args.dataType === "accounts" || args.dataType === "full") {
        const accountResults = await syncAccountsWithReconciliation(ctx, {
          organizationId: args.organizationId,
          erpConnectionId: args.erpConnectionId,
          sourceAccounts: args.sourceData,
          options: args.reconciliationOptions || {},
          syncJobId,
        });
        results.inserted += accountResults.inserted;
        results.updated += accountResults.updated;
        results.skipped += accountResults.skipped;
        results.errors.push(...accountResults.errors);
      }

      if (args.dataType === "transactions" || args.dataType === "full") {
        const transactionResults = await syncTransactionsWithValidation(ctx, {
          organizationId: args.organizationId,
          erpConnectionId: args.erpConnectionId,
          sourceTransactions: args.sourceData,
          syncJobId,
        });
        results.inserted += transactionResults.inserted;
        results.updated += transactionResults.updated;
        results.skipped += transactionResults.skipped;
        results.errors.push(...transactionResults.errors);
      }

      // Complete sync job
      await ctx.runMutation(api.syncActions.completeSyncJob, {
        syncJobId,
        results,
        executionTime: Date.now() - startTime,
      });

      console.log(`Legacy ERP sync completed for org ${args.organizationId}: ${JSON.stringify(results)}`);
      return { syncJobId, results };

    } catch (error) {
      // Mark sync job as failed
      await ctx.runMutation(api.syncActions.failSyncJob, {
        syncJobId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
});

/**
 * Create sync job record
 */
export const createSyncJob = mutation({
  args: {
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    type: v.union(
      v.literal("full_sync"),
      v.literal("incremental_sync"),
      v.literal("accounts_sync"),
      v.literal("transactions_sync"),
      v.literal("reconciliation")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const syncJobId = await ctx.db.insert("syncJobs", {
      organizationId: args.organizationId,
      erpConnectionId: args.erpConnectionId,
      type: args.type,
      status: "pending",
      startedAt: now,
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      progress: 0,
      lastActivityAt: now,
    });

    return syncJobId;
  },
});

/**
 * Complete sync job with results
 */
export const completeSyncJob = mutation({
  args: {
    syncJobId: v.id("syncJobs"),
    results: v.object({
      inserted: v.number(),
      updated: v.number(),
      skipped: v.number(),
      errors: v.array(v.string()),
    }),
    executionTime: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.patch(args.syncJobId, {
      status: "completed",
      completedAt: now,
      recordsProcessed: args.results.inserted + args.results.updated + args.results.skipped,
      recordsInserted: args.results.inserted,
      recordsUpdated: args.results.updated,
      recordsSkipped: args.results.skipped,
      errors: args.results.errors.map(error => ({
        type: "sync_error",
        message: error,
        timestamp: now,
      })),
      progress: 100,
      lastActivityAt: now,
    });
  },
});

/**
 * Mark sync job as failed
 */
export const failSyncJob = mutation({
  args: {
    syncJobId: v.id("syncJobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.patch(args.syncJobId, {
      status: "failed",
      completedAt: now,
      errors: [{
        type: "sync_failure",
        message: args.error,
        timestamp: now,
      }],
      lastActivityAt: now,
    });
  },
});

/**
 * Get sync job status
 */
export const getSyncJobStatus = query({
  args: {
    syncJobId: v.id("syncJobs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.syncJobId);
  },
});

/**
 * Internal function for account synchronization with reconciliation
 */
async function syncAccountsWithReconciliation(
  ctx: any,
  args: {
    organizationId: string;
    erpConnectionId: string;
    sourceAccounts: any[];
    options: {
      fuzzyMatchThreshold?: number;
      autoApplyHighConfidenceMatches?: boolean;
      skipDuplicates?: boolean;
    };
    syncJobId: string;
  }
) {
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };
  const threshold = args.options.fuzzyMatchThreshold || 0.8;

  // Get existing accounts for reconciliation
  let existingAccounts;
  try {
    existingAccounts = await ctx.runQuery(api.accountActions.getAccountHierarchy, {
      organizationId: args.organizationId,
      includeInactive: true,
    });
  } catch (error) {
    // If getAccountHierarchy doesn't exist, get accounts directly
    existingAccounts = await ctx.db
      .query("accounts")
      .filter((q: any) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();
  }

  const flatExistingAccounts = Array.isArray(existingAccounts[0]) ? 
    flattenAccountHierarchy(existingAccounts) : existingAccounts;

  // Find matches using fuzzy matching if the function exists
  let matches: any[] = [];
  if (typeof findBestAccountMatches === 'function') {
    matches = findBestAccountMatches(
      args.sourceAccounts.map(acc => ({ code: acc.code, name: acc.name })),
      flatExistingAccounts.map(acc => ({ code: acc.code, name: acc.name })),
      threshold
    );
  }

  // Process each source account
  for (const sourceAccount of args.sourceAccounts) {
    try {
      const match = matches.find(m => m.source.code === sourceAccount.code);
      
      if (match && args.options.autoApplyHighConfidenceMatches && match.score > 0.9) {
        // High confidence match - update existing account
        const existingAccount = flatExistingAccounts.find(acc => acc.code === match.target.code);
        if (existingAccount) {
          try {
            await ctx.runMutation(api.accountActions.upsertAccount, {
              organizationId: args.organizationId,
              erpConnectionId: args.erpConnectionId,
              externalId: sourceAccount.id || sourceAccount.externalId || sourceAccount.code,
              code: sourceAccount.code,
              name: sourceAccount.name,
              type: sourceAccount.type,
              category: sourceAccount.category,
              subType: sourceAccount.subType,
              parentCode: sourceAccount.parentId,
              description: sourceAccount.description,
              balance: sourceAccount.balance,
              currency: sourceAccount.currency || "USD",
              taxCode: sourceAccount.taxCode,
              isActive: sourceAccount.isActive !== false,
            });
            results.updated++;
          } catch (upsertError) {
            // Try direct database insert if upsertAccount doesn't exist
            await ctx.db.insert("accounts", {
              organizationId: args.organizationId,
              erpConnectionId: args.erpConnectionId,
              externalId: sourceAccount.id || sourceAccount.externalId || sourceAccount.code,
              code: sourceAccount.code,
              name: sourceAccount.name,
              fullName: sourceAccount.fullName || sourceAccount.name,
              type: sourceAccount.type,
              category: sourceAccount.category,
              subType: sourceAccount.subType,
              parentId: sourceAccount.parentId,
              level: sourceAccount.level || 0,
              path: [sourceAccount.code],
              isActive: sourceAccount.isActive !== false,
              description: sourceAccount.description,
              balance: sourceAccount.balance,
              currency: sourceAccount.currency || "USD",
              taxCode: sourceAccount.taxCode,
              lastSyncAt: sourceAccount.lastSyncAt || Date.now(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            results.updated++;
          }
        }
      } else if (!match || match.score < threshold) {
        // No good match found - create new account
        try {
          await ctx.runMutation(api.accountActions.upsertAccount, {
            organizationId: args.organizationId,
            erpConnectionId: args.erpConnectionId,
            externalId: sourceAccount.id || sourceAccount.externalId || sourceAccount.code,
            code: sourceAccount.code,
            name: sourceAccount.name,
            type: sourceAccount.type,
            category: sourceAccount.category,
            subType: sourceAccount.subType,
            parentCode: sourceAccount.parentId,
            description: sourceAccount.description,
            balance: sourceAccount.balance,
            currency: sourceAccount.currency || "USD",
            taxCode: sourceAccount.taxCode,
            isActive: sourceAccount.isActive !== false,
          });
          results.inserted++;
        } catch (upsertError) {
          // Try direct database insert if upsertAccount doesn't exist
          await ctx.db.insert("accounts", {
            organizationId: args.organizationId,
            erpConnectionId: args.erpConnectionId,
            externalId: sourceAccount.id || sourceAccount.externalId || sourceAccount.code,
            code: sourceAccount.code,
            name: sourceAccount.name,
            fullName: sourceAccount.fullName || sourceAccount.name,
            type: sourceAccount.type,
            category: sourceAccount.category,
            subType: sourceAccount.subType,
            parentId: sourceAccount.parentId,
            level: sourceAccount.level || 0,
            path: [sourceAccount.code],
            isActive: sourceAccount.isActive !== false,
            description: sourceAccount.description,
            balance: sourceAccount.balance,
            currency: sourceAccount.currency || "USD",
            taxCode: sourceAccount.taxCode,
            lastSyncAt: sourceAccount.lastSyncAt || Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          results.inserted++;
        }
      } else {
        // Ambiguous match - skip for manual review
        results.skipped++;
        results.errors.push(`Account ${sourceAccount.code} requires manual review (match score: ${match.score.toFixed(2)})`);
      }

    } catch (error) {
      results.errors.push(`Failed to sync account ${sourceAccount.code}: ${error}`);
    }
  }

  return results;
}

/**
 * Internal function for transaction synchronization with validation
 */
async function syncTransactionsWithValidation(
  ctx: any,
  args: {
    organizationId: string;
    erpConnectionId: string;
    sourceTransactions: any[];
    syncJobId: string;
  }
) {
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

  // Detect anomalies in the transaction data if the function exists
  if (typeof detectTransactionAnomalies === 'function') {
    try {
      const anomalies = detectTransactionAnomalies(
        args.sourceTransactions.map(txn => ({
          id: txn.id || txn.externalId,
          accountCode: txn.accountCode,
          amount: txn.amount,
          transactionDate: typeof txn.transactionDate === 'number' ? txn.transactionDate : new Date(txn.transactionDate).getTime(),
          type: txn.type,
        }))
      );

      // Log high-severity anomalies
      anomalies.filter(a => a.severity === "high").forEach(anomaly => {
        results.errors.push(`Anomaly detected: ${anomaly.description}`);
      });
    } catch (anomalyError) {
      console.warn("Anomaly detection failed:", anomalyError);
    }
  }

  // Process transactions
  for (const txn of args.sourceTransactions) {
    try {
      // Validate required fields
      if (!txn.accountId && !txn.accountCode) {
        results.errors.push(`Transaction ${txn.id} missing account information`);
        continue;
      }
      
      if (!txn.amount || !txn.transactionDate) {
        results.errors.push(`Transaction ${txn.id} missing required fields (amount, date)`);
        continue;
      }

      // Find matching account
      let account = null;
      if (txn.accountId) {
        // Try to get account by ID first
        account = await ctx.db.get(txn.accountId);
      }
      
      if (!account && txn.accountCode) {
        // Try to find by code
        try {
          account = await ctx.runQuery(api.accountActions.getAccount, {
            organizationId: args.organizationId,
            accountCode: txn.accountCode,
          });
        } catch (error) {
          // If getAccount doesn't exist, query directly
          account = await ctx.db
            .query("accounts")
            .filter((q: any) => 
              q.and(
                q.eq(q.field("organizationId"), args.organizationId),
                q.eq(q.field("code"), txn.accountCode)
              )
            )
            .first();
        }
      }

      if (!account) {
        results.errors.push(`Account ${txn.accountCode || txn.accountId} not found for transaction ${txn.id}`);
        continue;
      }

      // Check for existing transaction
      const existingTransaction = await ctx.db
        .query("transactions")
        .filter((q: any) => 
          q.and(
            q.eq(q.field("organizationId"), args.organizationId),
            q.eq(q.field("externalId"), txn.id || txn.externalId)
          )
        )
        .first();

      const transactionDate = typeof txn.transactionDate === 'number' ? 
        txn.transactionDate : new Date(txn.transactionDate).getTime();

      const transactionData = {
        organizationId: args.organizationId,
        erpConnectionId: args.erpConnectionId,
        externalId: txn.id || txn.externalId,
        type: txn.type,
        accountId: account._id,
        referenceNumber: txn.referenceNumber,
        description: txn.description || "Imported transaction",
        amount: Math.abs(txn.amount),
        debitAmount: txn.debitAmount,
        creditAmount: txn.creditAmount,
        currency: txn.currency || "USD",
        exchangeRate: txn.exchangeRate,
        transactionDate,
        postingDate: txn.postingDate ? (typeof txn.postingDate === 'number' ? 
          txn.postingDate : new Date(txn.postingDate).getTime()) : undefined,
        dueDate: txn.dueDate ? (typeof txn.dueDate === 'number' ? 
          txn.dueDate : new Date(txn.dueDate).getTime()) : undefined,
        customerId: txn.customerId,
        vendorId: txn.vendorId,
        projectId: txn.projectId,
        departmentId: txn.departmentId,
        locationId: txn.locationId,
        tags: txn.tags || [],
        status: txn.status || "posted",
        reconciliationStatus: txn.reconciliationStatus || "unreconciled",
        lastSyncAt: txn.lastSyncAt || Date.now(),
      };

      if (existingTransaction) {
        await ctx.db.patch(existingTransaction._id, {
          ...transactionData,
          updatedAt: Date.now(),
        });
        results.updated++;
      } else {
        await ctx.db.insert("transactions", {
          ...transactionData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        results.inserted++;
      }

    } catch (error) {
      results.errors.push(`Failed to sync transaction ${txn.id}: ${error}`);
    }
  }

  return results;
}

/**
 * Helper functions
 */
function flattenAccountHierarchy(hierarchy: any[]): any[] {
  const result: any[] = [];
  
  const flatten = (accounts: any[]) => {
    accounts.forEach(account => {
      result.push(account);
      if (account.children && account.children.length > 0) {
        flatten(account.children);
      }
    });
  };
  
  flatten(hierarchy);
  return result;
}

function mapAccountType(sourceType: string) {
  const typeMapping: Record<string, string> = {
    "Bank": "bank",
    "Accounts Receivable": "accounts_receivable",
    "Other Current Asset": "other_current_asset",
    "Fixed Asset": "fixed_asset",
    "Accounts Payable": "accounts_payable",
    "Other Current Liability": "other_current_liability",
    "Long Term Liability": "long_term_liability",
    "Equity": "equity",
    "Income": "revenue",
    "Cost of Goods Sold": "cost_of_goods_sold",
    "Expense": "expense",
    "Other Income": "income",
    "Other Expense": "expense",
  };
  
  return typeMapping[sourceType] || "expense";
}

function mapTransactionType(sourceType: string) {
  const typeMapping: Record<string, string> = {
    "Invoice": "invoice",
    "Bill": "bill",
    "Payment": "payment",
    "Deposit": "deposit",
    "Journal Entry": "journal_entry",
    "Transfer": "transfer",
    "Adjustment": "adjustment",
  };
  
  return typeMapping[sourceType] || "journal_entry";
}