/**
 * Sample data generation for FinHelm.ai Convex database
 * Provides valid document structures for testing and development
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Create sample user
export const createSampleUser = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const userId = await ctx.db.insert("users", {
      name: "John Doe",
      email: "john.doe@example.com",
      passwordHash: "$2b$10$example.hash.here",
      isVerified: true,
      isActive: true,
      timezone: "America/New_York",
      preferences: {
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        notifications: {
          email: true,
          anomalies: true,
          reports: true,
        },
      },
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    return userId;
  },
});

// Create sample company
export const createSampleCompany = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const companyId = await ctx.db.insert("companies", {
      userId: args.userId,
      name: "Sample Company Inc.",
      erpSystem: "quickbooks",
      erpCompanyId: "QB_COMP_001",
      erpCompanyName: "Sample Company Inc.",
      accessToken: "sample_access_token",
      refreshToken: "sample_refresh_token",
      tokenExpiry: now + (3600 * 1000), // 1 hour from now
      realmId: "123456789",
      baseUrl: "https://sandbox-quickbooks.api.intuit.com",
      isActive: true,
      lastSyncAt: now,
      syncStatus: "connected",
      metadata: {
        fiscalYearStart: "01-01",
        baseCurrency: "USD",
        countryCode: "US",
        industry: "Technology",
      },
      createdAt: now,
      updatedAt: now,
    });

    return companyId;
  },
});

// Create sample chart of accounts with proper hierarchy
export const createSampleAccounts = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const accounts = [];

    // Root Asset Account
    const assetsId = await ctx.db.insert("accounts", {
      companyId: args.companyId,
      erpAccountId: "1000",
      name: "Assets",
      fullyQualifiedName: "Assets",
      accountType: "Other Current Asset",
      classification: "Asset",
      level: 0,
      path: "1000",
      isActive: true,
      isSubAccount: false,
      currentBalance: 100000.00,
      currentBalanceWithSubAccounts: 100000.00,
      balanceDate: now,
      currency: "USD",
      description: "Total Assets",
      createdAt: now,
      updatedAt: now,
    });
    accounts.push({ id: assetsId, name: "Assets", erpId: "1000" });

    // Current Assets (child of Assets)
    const currentAssetsId = await ctx.db.insert("accounts", {
      companyId: args.companyId,
      erpAccountId: "1100",
      name: "Current Assets",
      fullyQualifiedName: "Assets:Current Assets",
      accountType: "Other Current Asset",
      classification: "Asset",
      parentAccountId: assetsId,
      parentErpAccountId: "1000",
      level: 1,
      path: "1000/1100",
      isActive: true,
      isSubAccount: true,
      currentBalance: 75000.00,
      currentBalanceWithSubAccounts: 75000.00,
      balanceDate: now,
      currency: "USD",
      description: "Current Assets",
      createdAt: now,
      updatedAt: now,
    });
    accounts.push({ id: currentAssetsId, name: "Current Assets", erpId: "1100" });

    // Cash Account (child of Current Assets)
    const cashId = await ctx.db.insert("accounts", {
      companyId: args.companyId,
      erpAccountId: "1110",
      name: "Cash",
      fullyQualifiedName: "Assets:Current Assets:Cash",
      accountType: "Bank",
      classification: "Asset",
      parentAccountId: currentAssetsId,
      parentErpAccountId: "1100",
      level: 2,
      path: "1000/1100/1110",
      isActive: true,
      isSubAccount: true,
      currentBalance: 25000.00,
      balanceDate: now,
      currency: "USD",
      description: "Primary Cash Account",
      metadata: {
        bankAccountNumber: "****1234",
        routingNumber: "123456789",
        openingBalance: 10000.00,
        openingBalanceDate: now - (30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
      createdAt: now,
      updatedAt: now,
    });
    accounts.push({ id: cashId, name: "Cash", erpId: "1110" });

    // Accounts Receivable (child of Current Assets)
    const arId = await ctx.db.insert("accounts", {
      companyId: args.companyId,
      erpAccountId: "1200",
      name: "Accounts Receivable",
      fullyQualifiedName: "Assets:Current Assets:Accounts Receivable",
      accountType: "Accounts Receivable",
      classification: "Asset",
      parentAccountId: currentAssetsId,
      parentErpAccountId: "1100",
      level: 2,
      path: "1000/1100/1200",
      isActive: true,
      isSubAccount: true,
      currentBalance: 50000.00,
      balanceDate: now,
      currency: "USD",
      description: "Customer Receivables",
      createdAt: now,
      updatedAt: now,
    });
    accounts.push({ id: arId, name: "Accounts Receivable", erpId: "1200" });

    // Liabilities
    const liabilitiesId = await ctx.db.insert("accounts", {
      companyId: args.companyId,
      erpAccountId: "2000",
      name: "Liabilities",
      fullyQualifiedName: "Liabilities",
      accountType: "Other Current Liability",
      classification: "Liability",
      level: 0,
      path: "2000",
      isActive: true,
      isSubAccount: false,
      currentBalance: 30000.00,
      currentBalanceWithSubAccounts: 30000.00,
      balanceDate: now,
      currency: "USD",
      description: "Total Liabilities",
      createdAt: now,
      updatedAt: now,
    });
    accounts.push({ id: liabilitiesId, name: "Liabilities", erpId: "2000" });

    // Accounts Payable (child of Liabilities)
    const apId = await ctx.db.insert("accounts", {
      companyId: args.companyId,
      erpAccountId: "2100",
      name: "Accounts Payable",
      fullyQualifiedName: "Liabilities:Accounts Payable",
      accountType: "Accounts Payable",
      classification: "Liability",
      parentAccountId: liabilitiesId,
      parentErpAccountId: "2000",
      level: 1,
      path: "2000/2100",
      isActive: true,
      isSubAccount: true,
      currentBalance: 30000.00,
      balanceDate: now,
      currency: "USD",
      description: "Vendor Payables",
      createdAt: now,
      updatedAt: now,
    });
    accounts.push({ id: apId, name: "Accounts Payable", erpId: "2100" });

    // Revenue
    const revenueId = await ctx.db.insert("accounts", {
      companyId: args.companyId,
      erpAccountId: "4000",
      name: "Revenue",
      fullyQualifiedName: "Revenue",
      accountType: "Income",
      classification: "Revenue",
      level: 0,
      path: "4000",
      isActive: true,
      isSubAccount: false,
      currentBalance: 150000.00,
      currentBalanceWithSubAccounts: 150000.00,
      balanceDate: now,
      currency: "USD",
      description: "Total Revenue",
      createdAt: now,
      updatedAt: now,
    });
    accounts.push({ id: revenueId, name: "Revenue", erpId: "4000" });

    // Expenses
    const expensesId = await ctx.db.insert("accounts", {
      companyId: args.companyId,
      erpAccountId: "5000",
      name: "Expenses",
      fullyQualifiedName: "Expenses",
      accountType: "Expense",
      classification: "Expense",
      level: 0,
      path: "5000",
      isActive: true,
      isSubAccount: false,
      currentBalance: 80000.00,
      currentBalanceWithSubAccounts: 80000.00,
      balanceDate: now,
      currency: "USD",
      description: "Total Expenses",
      createdAt: now,
      updatedAt: now,
    });
    accounts.push({ id: expensesId, name: "Expenses", erpId: "5000" });

    return {
      message: "Sample accounts created successfully",
      accounts: accounts,
      totalCreated: accounts.length,
    };
  },
});

// Create complete sample dataset
export const createSampleDataset = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Create user
    const userId = await ctx.db.insert("users", {
      name: "Demo User",
      email: "demo@finhelm.ai",
      passwordHash: "$2b$10$demo.hash.here",
      isVerified: true,
      isActive: true,
      timezone: "America/New_York",
      preferences: {
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        notifications: {
          email: true,
          anomalies: true,
          reports: true,
        },
      },
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    // Create company with ALL required fields
    const companyId = await ctx.db.insert("companies", {
      userId: userId,                    // ✅ Required
      name: "Demo Company LLC",          // ✅ Required
      erpSystem: "quickbooks",           // ✅ Required
      erpCompanyId: "QB_DEMO_001",       // ✅ Required
      erpCompanyName: "Demo Company LLC",
      accessToken: "sample_access_token",
      refreshToken: "sample_refresh_token",
      tokenExpiry: now + (3600 * 1000), // 1 hour from now
      realmId: "123456789",
      baseUrl: "https://sandbox-quickbooks.api.intuit.com",
      isActive: true,                    // ✅ Required
      lastSyncAt: now,
      syncStatus: "connected",           // ✅ Required
      metadata: {
        fiscalYearStart: "01-01",
        baseCurrency: "USD",
        countryCode: "US",
        industry: "Professional Services",
      },
      createdAt: now,                    // ✅ Required
      updatedAt: now,                    // ✅ Required
    });

    return {
      userId,
      companyId,
      message: "Sample dataset created successfully. Use these IDs to create accounts.",
    };
  },
});

// Create minimal valid company (for quick testing)
export const createMinimalCompany = mutation({
  args: {
    userId: v.id("users"),
    companyName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const companyId = await ctx.db.insert("companies", {
      userId: args.userId,                                    // ✅ Required
      name: args.companyName || "Test Company",               // ✅ Required
      erpSystem: "quickbooks",                                // ✅ Required
      erpCompanyId: `QB_${Math.random().toString(36).substr(2, 9)}`, // ✅ Required
      isActive: true,                                         // ✅ Required
      syncStatus: "disconnected",                             // ✅ Required
      createdAt: now,                                         // ✅ Required
      updatedAt: now,                                         // ✅ Required
    });

    return {
      companyId,
      message: "Minimal company created successfully",
    };
  },
});