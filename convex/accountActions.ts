import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { buildAccountHierarchy, calculateTotalBalance, findAccountByCode } from "./utils";

/**
 * Account Management Actions for ERP Integration
 */

/**
 * Get account hierarchy for an organization
 */
export const getAccountHierarchy = query({
  args: {
    organizationId: v.id("organizations"),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => 
        args.includeInactive ? q.always() : q.eq(q.field("isActive"), true)
      )
      .collect();

    if (accounts.length === 0) {
      return [];
    }

    const hierarchy = buildAccountHierarchy(accounts);
    
    // Calculate total balances including children
    hierarchy.forEach((rootAccount) => {
      rootAccount.totalBalance = calculateTotalBalance(rootAccount);
    });

    console.log(`Retrieved ${accounts.length} accounts in hierarchy for org: ${args.organizationId}`);
    return hierarchy;
  },
});

/**
 * Get account by code or ID
 */
export const getAccount = query({
  args: {
    organizationId: v.id("organizations"),
    accountId: v.optional(v.id("accounts")),
    accountCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.accountId && !args.accountCode) {
      throw new Error("Either accountId or accountCode must be provided");
    }

    if (args.accountId) {
      const account = await ctx.db.get(args.accountId);
      if (!account || account.organizationId !== args.organizationId) {
        return null;
      }
      return account;
    }

    if (args.accountCode) {
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_code", (q) => q.eq("code", args.accountCode!))
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .first();
      return account;
    }

    return null;
  },
});

/**
 * Create or update account with hierarchy validation
 */
export const upsertAccount = mutation({
  args: {
    organizationId: v.id("organizations"),
    erpConnectionId: v.id("erpConnections"),
    externalId: v.string(),
    code: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("revenue"),
      v.literal("expense"),
      v.literal("other_current_asset"),
      v.literal("other_current_liability"),
      v.literal("accounts_payable"),
      v.literal("accounts_receivable"),
      v.literal("bank"),
      v.literal("cost_of_goods_sold"),
      v.literal("fixed_asset"),
      v.literal("income"),
      v.literal("long_term_liability")
    ),
    category: v.optional(v.string()),
    subType: v.optional(v.string()),
    parentCode: v.optional(v.string()),
    description: v.optional(v.string()),
    balance: v.optional(v.number()),
    currency: v.string(),
    taxCode: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find parent account if specified
    let parentId: any = undefined;
    let level = 0;
    let path: string[] = [args.name];

    if (args.parentCode) {
      const parentAccount = await ctx.db
        .query("accounts")
        .withIndex("by_code", (q) => q.eq("code", args.parentCode))
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .first();

      if (!parentAccount) {
        throw new Error(`Parent account with code ${args.parentCode} not found`);
      }

      parentId = parentAccount._id;
      level = parentAccount.level + 1;
      path = [...parentAccount.path, args.name];
    }

    // Check if account exists
    const existingAccount = await ctx.db
      .query("accounts")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    const fullName = path.join(":");

    const accountData = {
      organizationId: args.organizationId,
      erpConnectionId: args.erpConnectionId,
      externalId: args.externalId,
      code: args.code,
      name: args.name,
      fullName,
      type: args.type,
      category: args.category,
      subType: args.subType,
      parentId,
      level,
      path,
      description: args.description,
      balance: args.balance,
      currency: args.currency,
      taxCode: args.taxCode,
      isActive: args.isActive !== undefined ? args.isActive : true,
      lastSyncAt: now,
      updatedAt: now,
    };

    if (existingAccount) {
      // Update existing account
      await ctx.db.patch(existingAccount._id, accountData);
      console.log(`Account updated: ${args.code} - ${args.name}`);
      return existingAccount._id;
    } else {
      // Create new account
      const accountId = await ctx.db.insert("accounts", {
        ...accountData,
        createdAt: now,
      });
      console.log(`Account created: ${args.code} - ${args.name}`);
      return accountId;
    }
  },
});

/**
 * Get accounts by type for filtering
 */
export const getAccountsByType = query({
  args: {
    organizationId: v.id("organizations"),
    type: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("revenue"),
      v.literal("expense"),
      v.literal("other_current_asset"),
      v.literal("other_current_liability"),
      v.literal("accounts_payable"),
      v.literal("accounts_receivable"),
      v.literal("bank"),
      v.literal("cost_of_goods_sold"),
      v.literal("fixed_asset"),
      v.literal("income"),
      v.literal("long_term_liability")
    ),
    includeChildren: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .filter((q) => 
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    if (!args.includeChildren) {
      return accounts;
    }

    // Include child accounts recursively
    const allAccounts = await ctx.db
      .query("accounts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const hierarchy = buildAccountHierarchy(allAccounts);
    const result: any[] = [];

    const collectAccountsOfType = (account: any) => {
      if (account.type === args.type) {
        result.push(account);
        // Add all descendants
        const addDescendants = (acc: any) => {
          acc.children.forEach((child: any) => {
            result.push(child);
            addDescendants(child);
          });
        };
        addDescendants(account);
      } else {
        account.children.forEach(collectAccountsOfType);
      }
    };

    hierarchy.forEach(collectAccountsOfType);
    return result;
  },
});

/**
 * Bulk update account balances (for sync operations)
 */
export const updateAccountBalances = mutation({
  args: {
    organizationId: v.id("organizations"),
    balanceUpdates: v.array(v.object({
      accountCode: v.string(),
      balance: v.number(),
      currency: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updatePromises: Promise<any>[] = [];

    for (const update of args.balanceUpdates) {
      const account = await ctx.db
        .query("accounts")
        .withIndex("by_code", (q) => q.eq("code", update.accountCode))
        .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
        .first();

      if (account) {
        updatePromises.push(
          ctx.db.patch(account._id, {
            balance: update.balance,
            currency: update.currency || account.currency,
            lastSyncAt: now,
            updatedAt: now,
          })
        );
      }
    }

    await Promise.all(updatePromises);
    console.log(`Updated balances for ${updatePromises.length} accounts`);
    return updatePromises.length;
  },
});

/**
 * Search accounts by name or code (for user lookups)
 */
export const searchAccounts = query({
  args: {
    organizationId: v.id("organizations"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.searchTerm.toLowerCase();
    const limit = args.limit || 50;

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const matchingAccounts = accounts
      .filter((account) => 
        account.name.toLowerCase().includes(searchTerm) ||
        account.code.toLowerCase().includes(searchTerm) ||
        account.fullName.toLowerCase().includes(searchTerm)
      )
      .sort((a, b) => {
        // Prioritize exact matches, then code matches, then name matches
        const aCodeMatch = a.code.toLowerCase().startsWith(searchTerm);
        const bCodeMatch = b.code.toLowerCase().startsWith(searchTerm);
        const aNameMatch = a.name.toLowerCase().startsWith(searchTerm);
        const bNameMatch = b.name.toLowerCase().startsWith(searchTerm);

        if (aCodeMatch && !bCodeMatch) return -1;
        if (!aCodeMatch && bCodeMatch) return 1;
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    return matchingAccounts;
  },
});