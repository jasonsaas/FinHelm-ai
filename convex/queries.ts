import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getLiveQuickBooksData = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const [accounts, invoices, customers, bills, vendors, transactions] = await Promise.all([
      ctx.db
        .query("accounts")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect(),
      ctx.db
        .query("invoices")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .take(100),
      ctx.db
        .query("customers")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect(),
      ctx.db
        .query("bills")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .take(100),
      ctx.db
        .query("vendors")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect(),
      ctx.db
        .query("transactions")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .take(100),
    ]);

    return {
      company,
      accounts,
      invoices,
      customers,
      bills,
      vendors,
      transactions,
      lastSyncAt: company.lastSyncAt,
      syncStatus: company.syncStatus,
    };
  },
});

export const getDashboardMetrics = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const [invoices, bills, accounts, anomalies] = await Promise.all([
      ctx.db
        .query("invoices")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect(),
      ctx.db
        .query("bills")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect(),
      ctx.db
        .query("accounts")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .collect(),
      ctx.db
        .query("anomalies")
        .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
        .order("desc")
        .take(10),
    ]);

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const totalRevenue = invoices
      .filter(inv => inv.txnDate && inv.txnDate > thirtyDaysAgo)
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const totalExpenses = bills
      .filter(bill => bill.txnDate && bill.txnDate > thirtyDaysAgo)
      .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);

    const totalCash = accounts
      .filter(acc => acc.accountType === "Bank")
      .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    const accountsReceivable = accounts
      .filter(acc => acc.accountType === "Accounts Receivable")
      .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    const accountsPayable = accounts
      .filter(acc => acc.accountType === "Accounts Payable")
      .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    return {
      metrics: {
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        totalCash,
        accountsReceivable,
        accountsPayable,
        invoiceCount: invoices.length,
        billCount: bills.length,
        accountCount: accounts.length,
      },
      recentAnomalies: anomalies,
      lastSyncAt: company.lastSyncAt,
      syncStatus: company.syncStatus,
    };
  },
});

export const getRecentTransactions = query({
  args: { 
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(limit);

    return transactions;
  },
});

export const getAccountDetails = query({
  args: { 
    accountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .order("desc")
      .take(100);

    const childAccounts = account.parentAccountId
      ? []
      : await ctx.db
          .query("accounts")
          .withIndex("by_parent", (q) => q.eq("parentAccountId", args.accountId))
          .collect();

    return {
      account,
      transactions,
      childAccounts,
    };
  },
});

export const getCompanyList = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return companies;
  },
});

export const getSyncStatus = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const syncLogs = await ctx.db
      .query("syncLogs")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .order("desc")
      .take(10);

    return {
      syncStatus: company.syncStatus,
      lastSyncAt: company.lastSyncAt,
      recentLogs: syncLogs,
    };
  },
});