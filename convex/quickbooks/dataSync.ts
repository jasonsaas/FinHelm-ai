import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// Sync company data from QuickBooks
export const syncCompanyData = mutation({
  args: {
    userId: v.string(),
    companyData: v.object({
      name: v.string(),
      erpSystem: v.union(v.literal("quickbooks"), v.literal("sage_intacct")),
      erpCompanyId: v.string(),
      erpCompanyName: v.optional(v.string()),
      realmId: v.optional(v.string()),
      metadata: v.optional(v.object({
        fiscalYearStart: v.optional(v.string()),
        baseCurrency: v.optional(v.string()),
        countryCode: v.optional(v.string()),
        industry: v.optional(v.string()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    // Check if company exists
    const existingCompany = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const companyRecord = {
      ...args.companyData,
      userId: args.userId,
      isActive: true,
      syncStatus: "connected" as const,
      updatedAt: Date.now(),
    };

    if (existingCompany) {
      // Update existing company
      await ctx.db.patch(existingCompany._id, {
        ...companyRecord,
        lastSyncAt: Date.now(),
      });
      return existingCompany._id;
    } else {
      // Create new company
      const companyId = await ctx.db.insert("companies", {
        ...companyRecord,
        createdAt: Date.now(),
        lastSyncAt: Date.now(),
      });
      return companyId;
    }
  },
});

// Fetch latest invoices with pagination
export const fetchLatestInvoices = query({
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
      .query("invoices")
      .filter((q) => q.eq(q.field("userId"), args.userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const invoices = await query
      .order("desc")
      .take(limit + offset);

    return {
      invoices: invoices.slice(offset, offset + limit),
      total: invoices.length,
      hasMore: invoices.length > offset + limit,
    };
  },
});

// Fetch current cash position
export const fetchCashPosition = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // First get the company for this user
    const company = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!company) {
      return {
        totalCash: 0,
        accounts: [],
        dailyCashFlow: {},
        lastUpdated: Date.now(),
      };
    }

    // Get all accounts marked as cash/bank accounts
    const cashAccounts = await ctx.db
      .query("accounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("companyId"), company._id),
          q.or(
            q.eq(q.field("accountType"), "Bank"),
            q.eq(q.field("accountType"), "Cash")
          )
        )
      )
      .collect();

    const totalCash = cashAccounts.reduce((sum, account) => {
      return sum + (account.currentBalance || 0);
    }, 0);

    // Get recent transactions for cash flow trend
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentTransactions = await ctx.db
      .query("transactions")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), company._id),
          q.gte(q.field("date"), thirtyDaysAgo)
        )
      )
      .collect();

    const dailyCashFlow = recentTransactions.reduce((acc, txn) => {
      const date = new Date(txn.date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { inflow: 0, outflow: 0 };
      }
      if (txn.amount > 0) {
        acc[date].inflow += txn.amount;
      } else {
        acc[date].outflow += Math.abs(txn.amount);
      }
      return acc;
    }, {} as Record<string, { inflow: number; outflow: number }>);

    return {
      totalCash,
      accounts: cashAccounts,
      dailyCashFlow,
      lastUpdated: Date.now(),
    };
  },
});

// Calculate 13-week cash flow forecast
export const calculate13WeekForecast = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current cash position directly
    const company = await ctx.db
      .query("companies")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    
    if (!company) {
      return {
        startingCash: 0,
        forecast: [],
        summary: {
          totalExpectedReceivables: 0,
          totalExpectedPayables: 0,
          endingCash: 0,
          lowestProjectedBalance: 0,
          weeksWithNegativeBalance: 0,
        },
      };
    }

    // Get cash accounts
    const cashAccounts = await ctx.db
      .query("accounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("companyId"), company._id),
          q.or(
            q.eq(q.field("accountType"), "Bank"),
            q.eq(q.field("accountType"), "Cash")
          )
        )
      )
      .collect();

    const totalCash = cashAccounts.reduce((sum, account) => {
      return sum + (account.currentBalance || 0);
    }, 0);

    // Get unpaid invoices (receivables)
    const unpaidInvoices = await ctx.db
      .query("invoices")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.neq(q.field("balance"), 0)
        )
      )
      .collect();

    // Get unpaid bills (payables)
    const unpaidBills = await ctx.db
      .query("bills")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.neq(q.field("balance"), 0)
        )
      )
      .collect();

    // Calculate weekly forecast
    const forecast = [];
    let runningBalance = totalCash;
    const today = new Date();

    for (let week = 0; week < 13; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (week * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Calculate expected receivables for this week
      const weekReceivables = unpaidInvoices
        .filter(inv => {
          const dueDate = new Date(inv.dueDate);
          return dueDate >= weekStart && dueDate <= weekEnd;
        })
        .reduce((sum, inv) => sum + (inv.balance || 0), 0);

      // Calculate expected payables for this week
      const weekPayables = unpaidBills
        .filter(bill => {
          const dueDate = new Date(bill.dueDate);
          return dueDate >= weekStart && dueDate <= weekEnd;
        })
        .reduce((sum, bill) => sum + (bill.balance || 0), 0);

      // Calculate net cash flow
      const netCashFlow = weekReceivables - weekPayables;
      runningBalance += netCashFlow;

      forecast.push({
        weekNumber: week + 1,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        expectedReceivables: weekReceivables,
        expectedPayables: weekPayables,
        netCashFlow,
        projectedBalance: runningBalance,
      });
    }

    return {
      startingCash: totalCash,
      forecast,
      summary: {
        totalExpectedReceivables: forecast.reduce((sum, week) => sum + week.expectedReceivables, 0),
        totalExpectedPayables: forecast.reduce((sum, week) => sum + week.expectedPayables, 0),
        endingCash: runningBalance,
        lowestProjectedBalance: Math.min(...forecast.map(w => w.projectedBalance)),
        weeksWithNegativeBalance: forecast.filter(w => w.projectedBalance < 0).length,
      },
    };
  },
});

// Sync invoices from QuickBooks
export const syncInvoices = mutation({
  args: {
    userId: v.string(),
    invoices: v.array(v.object({
      invoiceId: v.string(),
      invoiceNumber: v.optional(v.string()),
      customerId: v.string(),
      customerName: v.string(),
      txnDate: v.string(),
      dueDate: v.string(),
      totalAmt: v.number(),
      balance: v.number(),
      status: v.string(),
      lineItems: v.optional(v.array(v.object({
        description: v.optional(v.string()),
        amount: v.number(),
        quantity: v.optional(v.number()),
        unitPrice: v.optional(v.number()),
      }))),
    })),
  },
  handler: async (ctx, args) => {
    const syncResults = {
      created: 0,
      updated: 0,
      errors: 0,
    };

    for (const invoice of args.invoices) {
      try {
        const existing = await ctx.db
          .query("invoices")
          .filter((q) =>
            q.and(
              q.eq(q.field("userId"), args.userId),
              q.eq(q.field("invoiceId"), invoice.invoiceId)
            )
          )
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            ...invoice,
            lastSyncedAt: Date.now(),
          });
          syncResults.updated++;
        } else {
          await ctx.db.insert("invoices", {
            userId: args.userId,
            ...invoice,
            createdAt: Date.now(),
            lastSyncedAt: Date.now(),
          });
          syncResults.created++;
        }
      } catch (error) {
        console.error("Error syncing invoice:", error);
        syncResults.errors++;
      }
    }

    return syncResults;
  },
});

// Sync bills from QuickBooks
export const syncBills = mutation({
  args: {
    userId: v.string(),
    bills: v.array(v.object({
      billId: v.string(),
      vendorId: v.string(),
      vendorName: v.string(),
      txnDate: v.string(),
      dueDate: v.string(),
      totalAmt: v.number(),
      balance: v.number(),
      status: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const syncResults = {
      created: 0,
      updated: 0,
      errors: 0,
    };

    for (const bill of args.bills) {
      try {
        const existing = await ctx.db
          .query("bills")
          .filter((q) =>
            q.and(
              q.eq(q.field("userId"), args.userId),
              q.eq(q.field("billId"), bill.billId)
            )
          )
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, {
            ...bill,
            lastSyncedAt: Date.now(),
          });
          syncResults.updated++;
        } else {
          await ctx.db.insert("bills", {
            userId: args.userId,
            ...bill,
            createdAt: Date.now(),
            lastSyncedAt: Date.now(),
          });
          syncResults.created++;
        }
      } catch (error) {
        console.error("Error syncing bill:", error);
        syncResults.errors++;
      }
    }

    return syncResults;
  },
});