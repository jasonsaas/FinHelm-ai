import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Transaction Management Actions for Financial Data
 */

/**
 * Record a new transaction with validation
 */
export const recordTransaction = mutation({
  args: {
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    externalId: v.optional(v.string()),
    type: v.union(
      v.literal("journal_entry"),
      v.literal("invoice"),
      v.literal("bill"),
      v.literal("payment"),
      v.literal("deposit"),
      v.literal("transfer"),
      v.literal("adjustment")
    ),
    accountId: v.id("accounts"),
    referenceNumber: v.optional(v.string()),
    description: v.string(),
    amount: v.number(),
    debitAmount: v.optional(v.number()),
    creditAmount: v.optional(v.number()),
    currency: v.optional(v.string()),
    exchangeRate: v.optional(v.number()),
    transactionDate: v.number(),
    postingDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    customerId: v.optional(v.string()),
    vendorId: v.optional(v.string()),
    projectId: v.optional(v.string()),
    departmentId: v.optional(v.string()),
    locationId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("posted"),
      v.literal("void"),
      v.literal("reconciled")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate account exists and belongs to organization
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }
    
    if (account.organizationId !== args.organizationId) {
      throw new Error("Account does not belong to the specified organization");
    }

    // Validate amounts
    if (args.amount === 0) {
      throw new Error("Transaction amount cannot be zero");
    }

    // Generate external ID if not provided
    const externalId = args.externalId || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check for duplicate transactions
    const existingTransaction = await ctx.db
      .query("transactions")
      .filter((q) => 
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("externalId"), externalId)
        )
      )
      .first();

    if (existingTransaction) {
      throw new Error(`Transaction with external ID ${externalId} already exists`);
    }

    // Create transaction
    const transactionId = await ctx.db.insert("transactions", {
      organizationId: args.organizationId,
      erpConnectionId: args.erpConnectionId,
      externalId,
      type: args.type,
      accountId: args.accountId,
      referenceNumber: args.referenceNumber,
      description: args.description,
      amount: Math.abs(args.amount),
      debitAmount: args.debitAmount,
      creditAmount: args.creditAmount,
      currency: args.currency || "USD",
      exchangeRate: args.exchangeRate,
      transactionDate: args.transactionDate,
      postingDate: args.postingDate,
      dueDate: args.dueDate,
      customerId: args.customerId,
      vendorId: args.vendorId,
      projectId: args.projectId,
      departmentId: args.departmentId,
      locationId: args.locationId,
      tags: args.tags || [],
      status: args.status || "posted",
      reconciliationStatus: "unreconciled",
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Transaction recorded: ${externalId} for account ${account.code}`);
    return transactionId;
  },
});

/**
 * Get transactions for an account with filtering
 */
export const getTransactions = query({
  args: {
    organizationId: v.id("organizations"),
    accountId: v.optional(v.id("accounts")),
    accountCode: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    type: v.optional(v.union(
      v.literal("journal_entry"),
      v.literal("invoice"),
      v.literal("bill"),
      v.literal("payment"),
      v.literal("deposit"),
      v.literal("transfer"),
      v.literal("adjustment")
    )),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("posted"),
      v.literal("void"),
      v.literal("reconciled")
    )),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("transactions");

    // Filter by organization
    query = query.filter((q) => q.eq(q.field("organizationId"), args.organizationId));

    // Account filtering
    if (args.accountId) {
      query = query.withIndex("by_account", (q) => q.eq("accountId", args.accountId));
    } else if (args.accountCode) {
      // Find account by code first
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_code", (q) => q.eq("code", args.accountCode))
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .first();
      
      if (!account) {
        return [];
      }
      
      query = query.withIndex("by_account", (q) => q.eq("accountId", account._id));
    }

    // Additional filters
    if (args.type) {
      query = query.filter((q) => q.eq(q.field("type"), args.type));
    }
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    if (args.startDate || args.endDate) {
      query = query.filter((q) => {
        let condition = q.always();
        if (args.startDate) {
          condition = q.and(condition, q.gte(q.field("transactionDate"), args.startDate));
        }
        if (args.endDate) {
          condition = q.and(condition, q.lte(q.field("transactionDate"), args.endDate));
        }
        return condition;
      });
    }

    if (args.minAmount || args.maxAmount) {
      query = query.filter((q) => {
        let condition = q.always();
        if (args.minAmount) {
          condition = q.and(condition, q.gte(q.field("amount"), args.minAmount));
        }
        if (args.maxAmount) {
          condition = q.and(condition, q.lte(q.field("amount"), args.maxAmount));
        }
        return condition;
      });
    }

    // Apply pagination
    let transactions = await query.collect();
    
    // Sort by transaction date (newest first)
    transactions.sort((a, b) => b.transactionDate - a.transactionDate);
    
    const offset = args.offset || 0;
    const limit = args.limit || 100;
    
    return transactions.slice(offset, offset + limit);
  },
});

/**
 * Update transaction status (e.g., for reconciliation)
 */
export const updateTransactionStatus = mutation({
  args: {
    transactionId: v.id("transactions"),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("posted"),
      v.literal("void"),
      v.literal("reconciled")
    )),
    reconciliationStatus: v.optional(v.union(
      v.literal("unreconciled"),
      v.literal("reconciled"),
      v.literal("pending")
    )),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    if (args.reconciliationStatus !== undefined) {
      updates.reconciliationStatus = args.reconciliationStatus;
    }

    await ctx.db.patch(args.transactionId, updates);
    console.log(`Transaction status updated: ${transaction.externalId}`);
    return true;
  },
});

/**
 * Get transaction summary statistics
 */
export const getTransactionSummary = query({
  args: {
    organizationId: v.id("organizations"),
    accountId: v.optional(v.id("accounts")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    groupBy: v.optional(v.union(
      v.literal("account"),
      v.literal("type"),
      v.literal("status"),
      v.literal("month"),
      v.literal("day")
    )),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("transactions");

    // Base filters
    query = query.filter((q) => q.eq(q.field("organizationId"), args.organizationId));

    if (args.accountId) {
      query = query.filter((q) => q.eq(q.field("accountId"), args.accountId));
    }

    if (args.startDate || args.endDate) {
      query = query.filter((q) => {
        let condition = q.always();
        if (args.startDate) {
          condition = q.and(condition, q.gte(q.field("transactionDate"), args.startDate));
        }
        if (args.endDate) {
          condition = q.and(condition, q.lte(q.field("transactionDate"), args.endDate));
        }
        return condition;
      });
    }

    const transactions = await query.collect();

    // Calculate summary statistics
    const summary = {
      totalTransactions: transactions.length,
      totalAmount: 0,
      averageAmount: 0,
      byStatus: {} as Record<string, { count: number; amount: number }>,
      byType: {} as Record<string, { count: number; amount: number }>,
      byAccount: {} as Record<string, { count: number; amount: number }>,
      dateRange: {
        start: args.startDate || Math.min(...transactions.map(t => t.transactionDate)),
        end: args.endDate || Math.max(...transactions.map(t => t.transactionDate)),
      },
    };

    // Calculate totals and group by specified dimension
    transactions.forEach(txn => {
      summary.totalAmount += txn.amount;

      // By status
      if (!summary.byStatus[txn.status]) {
        summary.byStatus[txn.status] = { count: 0, amount: 0 };
      }
      summary.byStatus[txn.status].count++;
      summary.byStatus[txn.status].amount += txn.amount;

      // By type
      if (!summary.byType[txn.type]) {
        summary.byType[txn.type] = { count: 0, amount: 0 };
      }
      summary.byType[txn.type].count++;
      summary.byType[txn.type].amount += txn.amount;

      // By account (using account ID as key for now)
      const accountKey = txn.accountId;
      if (!summary.byAccount[accountKey]) {
        summary.byAccount[accountKey] = { count: 0, amount: 0 };
      }
      summary.byAccount[accountKey].count++;
      summary.byAccount[accountKey].amount += txn.amount;
    });

    summary.averageAmount = summary.totalTransactions > 0 ? 
      summary.totalAmount / summary.totalTransactions : 0;

    return summary;
  },
});

/**
 * Bulk reconcile transactions
 */
export const bulkReconcileTransactions = mutation({
  args: {
    organizationId: v.id("organizations"),
    transactionIds: v.array(v.id("transactions")),
    reconciliationStatus: v.union(
      v.literal("reconciled"),
      v.literal("pending"),
      v.literal("unreconciled")
    ),
  },
  handler: async (ctx, args) => {
    const updates: Promise<any>[] = [];

    for (const transactionId of args.transactionIds) {
      const transaction = await ctx.db.get(transactionId);
      
      if (transaction && transaction.organizationId === args.organizationId) {
        updates.push(
          ctx.db.patch(transactionId, {
            reconciliationStatus: args.reconciliationStatus,
            updatedAt: Date.now(),
          })
        );
      }
    }

    await Promise.all(updates);
    console.log(`Bulk reconciled ${updates.length} transactions`);
    return updates.length;
  },
});

/**
 * Get unreconciled transactions (for reconciliation workflows)
 */
export const getUnreconciledTransactions = query({
  args: {
    organizationId: v.id("organizations"),
    accountId: v.optional(v.id("accounts")),
    olderThan: v.optional(v.number()), // Days
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("transactions")
      .withIndex("by_reconciliation", (q) => q.eq("reconciliationStatus", "unreconciled"))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId));

    if (args.accountId) {
      query = query.filter((q) => q.eq(q.field("accountId"), args.accountId));
    }

    if (args.olderThan) {
      const cutoffDate = Date.now() - (args.olderThan * 24 * 60 * 60 * 1000);
      query = query.filter((q) => q.lte(q.field("transactionDate"), cutoffDate));
    }

    let transactions = await query.collect();

    // Sort by transaction date (oldest first for reconciliation priority)
    transactions.sort((a, b) => a.transactionDate - b.transactionDate);

    if (args.limit) {
      transactions = transactions.slice(0, args.limit);
    }

    return transactions;
  },
});