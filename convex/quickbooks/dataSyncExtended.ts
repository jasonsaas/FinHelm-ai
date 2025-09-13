import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Get company by userId
export const getCompanyByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    return company;
  },
});

// Fetch latest bills
export const fetchLatestBills = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    let query = ctx.db
      .query("bills")
      .filter((q) => q.eq(q.field("userId"), args.userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const bills = await query
      .order("desc")
      .take(limit + offset);

    return {
      bills: bills.slice(offset, offset + limit),
      total: bills.length,
      hasMore: bills.length > offset + limit,
    };
  },
});

// Get expense analysis
export const getExpenseAnalysis = query({
  args: {
    userId: v.string(),
    period: v.optional(v.number()), // days
  },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!company) {
      return {
        totalExpenses: 0,
        categories: [],
        averageDaily: 0,
      };
    }

    const periodDays = args.period || 30;
    const startDate = Date.now() - (periodDays * 24 * 60 * 60 * 1000);

    // Get expense transactions
    const expenses = await ctx.db
      .query("transactions")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), company._id),
          q.gte(q.field("date"), startDate),
          q.lt(q.field("amount"), 0) // Expenses are negative
        )
      )
      .collect();

    // Group by category
    const categoryMap = new Map<string, number>();
    let totalExpenses = 0;

    expenses.forEach(expense => {
      const category = expense.accountName || "Uncategorized";
      const amount = Math.abs(expense.amount);
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      totalExpenses += amount;
    });

    const categories = Array.from(categoryMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalExpenses,
      categories,
      averageDaily: totalExpenses / periodDays,
    };
  },
});

// Get revenue analysis
export const getRevenueAnalysis = query({
  args: {
    userId: v.string(),
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const monthCount = args.months || 6;
    const invoices = await ctx.db
      .query("invoices")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();

    // Group invoices by month
    const monthlyData = new Map<string, { totalRevenue: number; invoiceCount: number }>();
    const now = new Date();

    for (let i = 0; i < monthCount; i++) {
      const monthDate = new Date(now);
      monthDate.setMonth(now.getMonth() - i);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(monthKey, { totalRevenue: 0, invoiceCount: 0 });
    }

    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.txnDate);
      const monthKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData.has(monthKey)) {
        const data = monthlyData.get(monthKey)!;
        data.totalRevenue += invoice.totalAmt;
        data.invoiceCount += 1;
        monthlyData.set(monthKey, data);
      }
    });

    const monthlyDataArray = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      monthlyData: monthlyDataArray,
      totalRevenue: monthlyDataArray.reduce((sum, m) => sum + m.totalRevenue, 0),
      averageMonthly: monthlyDataArray.reduce((sum, m) => sum + m.totalRevenue, 0) / monthCount,
    };
  },
});

// Get customers
export const getCustomers = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!company) return [];

    const customers = await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("companyId"), company._id))
      .collect();

    return customers;
  },
});

// Get vendors
export const getVendors = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!company) return [];

    const vendors = await ctx.db
      .query("vendors")
      .filter((q) => q.eq(q.field("companyId"), company._id))
      .collect();

    return vendors;
  },
});

// Get account hierarchy
export const getAccountHierarchy = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!company) return [];

    const accounts = await ctx.db
      .query("accounts")
      .filter((q) => q.eq(q.field("companyId"), company._id))
      .collect();

    // Build hierarchy
    const rootAccounts = accounts.filter(acc => !acc.parentAccountId);
    
    const buildHierarchy = (parentId?: Id<"accounts">): any[] => {
      return accounts
        .filter(acc => acc.parentAccountId === parentId)
        .map(acc => ({
          ...acc,
          children: buildHierarchy(acc._id),
        }));
    };

    return rootAccounts.map(acc => ({
      ...acc,
      children: buildHierarchy(acc._id),
    }));
  },
});

// Get recent transactions
export const getRecentTransactions = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!company) return [];

    const transactions = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("companyId"), company._id))
      .order("desc")
      .take(args.limit || 20);

    return transactions;
  },
});

// Trigger full sync
export const triggerFullSync = mutation({
  args: {
    userId: v.string(),
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    // Update sync status
    await ctx.db.patch(args.companyId, {
      syncStatus: "syncing",
      updatedAt: Date.now(),
    });

    // In a real implementation, this would trigger the actual sync process
    // For now, we'll just simulate it
    setTimeout(async () => {
      await ctx.db.patch(args.companyId, {
        syncStatus: "connected",
        lastSyncAt: Date.now(),
        updatedAt: Date.now(),
      });
    }, 5000);

    return {
      success: true,
      message: "Sync initiated",
    };
  },
});