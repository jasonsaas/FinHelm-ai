/**
 * FinHelm.ai Company Management Functions
 * Handles company registration, ERP integration setup, and management
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new company
export const createCompany = mutation({
  args: {
    name: v.string(),
    erpSystem: v.union(v.literal("quickbooks"), v.literal("sage_intacct")),
    erpCompanyId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if company already exists
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_erp_company_id", (q) => q.eq("erpCompanyId", args.erpCompanyId))
      .first();
    
    if (existing) {
      throw new Error("Company with this ERP ID already exists");
    }

    const companyId = await ctx.db.insert("companies", {
      userId: "placeholder_user" as any, // In production, get from auth context
      name: args.name,
      erpSystem: args.erpSystem,
      erpCompanyId: args.erpCompanyId,
      isActive: true,
      syncStatus: "disconnected",
      createdAt: now,
      updatedAt: now,
    });

    return companyId;
  },
});

// Get company by ID
export const getCompany = query({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get company by ERP Company ID
export const getCompanyByErpId = query({
  args: { erpCompanyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_erp_company_id", (q) => q.eq("erpCompanyId", args.erpCompanyId))
      .first();
  },
});

// Get company by QuickBooks Realm ID
export const getCompanyByRealmId = query({
  args: { realmId: v.string() },
  handler: async (ctx, args) => {
    const companies = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("realmId"), args.realmId))
      .collect();
    
    return companies[0] || null;
  },
});

// List all active companies
export const listActiveCompanies = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("companies")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Update company ERP tokens
export const updateCompanyTokens = mutation({
  args: {
    id: v.id("companies"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiry: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    
    await ctx.db.patch(id, {
      ...updateData,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Deactivate company
export const deactivateCompany = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get company statistics
export const getCompanyStats = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const [accountsCount, transactionsCount, insightsCount] = await Promise.all([
      ctx.db
        .query("accounts")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect()
        .then(accounts => accounts.length),
      
      ctx.db
        .query("transactions")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect()
        .then(transactions => transactions.length),
      
      ctx.db
        .query("insights")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect()
        .then(insights => insights.length),
    ]);

    return {
      accountsCount,
      transactionsCount,
      insightsCount,
    };
  },
});