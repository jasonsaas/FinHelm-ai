/**
 * FinHelm.ai Chart of Accounts Management
 * Handles account creation, updates, and queries for financial data
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update account
export const upsertAccount = mutation({
  args: {
    companyId: v.id("companies"),
    erpAccountId: v.string(),
    name: v.string(),
    accountType: v.string(),
    accountSubType: v.optional(v.string()),
    classification: v.string(),
    parentAccountId: v.optional(v.string()),
    isActive: v.boolean(),
    balance: v.optional(v.number()),
    balanceDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if account already exists
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_erp_account_id", (q) => q.eq("erpAccountId", args.erpAccountId))
      .first();

    if (existing) {
      // Update existing account
      await ctx.db.patch(existing._id, {
        name: args.name,
        accountType: args.accountType,
        accountSubType: args.accountSubType,
        classification: args.classification as any,
        parentAccountId: args.parentAccountId as any,
        isActive: args.isActive,
        currentBalance: args.balance,
        balanceDate: args.balanceDate,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new account
      return await ctx.db.insert("accounts", {
        ...args,
        classification: args.classification as any,
        parentAccountId: args.parentAccountId as any,
        currentBalance: args.balance,
        level: 0,
        path: args.name,
        isSubAccount: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get accounts by company
export const getAccountsByCompany = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
  },
});

// Get accounts by classification (Asset, Liability, etc.)
export const getAccountsByClassification = query({
  args: { 
    companyId: v.id("companies"),
    classification: v.string(),
  },
  handler: async (ctx, args) => {
    const allAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    
    return allAccounts.filter(account => 
      account.classification === args.classification && account.isActive
    );
  },
});

// Get account hierarchy (parent-child relationships)
export const getAccountHierarchy = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Build hierarchy
    const accountMap = new Map(accounts.map(acc => [acc.erpAccountId, acc]));
    const rootAccounts: any[] = [];
    
    accounts.forEach(account => {
      if (!account.parentAccountId) {
        rootAccounts.push({
          ...account,
          children: []
        });
      }
    });

    // Add children to parents
    const addChildren = (parent: any) => {
      accounts.forEach(account => {
        if (account.parentAccountId === parent.erpAccountId) {
          const child = {
            ...account,
            children: []
          };
          parent.children.push(child);
          addChildren(child);
        }
      });
    };

    rootAccounts.forEach(addChildren);
    
    return rootAccounts;
  },
});

// Get account balance summary by classification
export const getBalanceSummary = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const summary = accounts.reduce((acc, account) => {
      if (!account.isActive || !account.currentBalance) return acc;
      
      if (!acc[account.classification]) {
        acc[account.classification] = 0;
      }
      acc[account.classification] += account.currentBalance;
      
      return acc;
    }, {} as Record<string, number>);

    return summary;
  },
});

// Search accounts by name
export const searchAccounts = query({
  args: { 
    companyId: v.id("companies"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const searchLower = args.searchTerm.toLowerCase();
    
    return accounts.filter(account => 
      account.name.toLowerCase().includes(searchLower) ||
      account.accountType.toLowerCase().includes(searchLower) ||
      (account.accountSubType && account.accountSubType.toLowerCase().includes(searchLower))
    );
  },
});