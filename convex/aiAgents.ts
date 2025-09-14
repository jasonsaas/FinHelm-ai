import { query } from "./_generated/server";
import { v } from "convex/values";

export const cashFlowForecast = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db
      .query("qboAccounts")
      .filter((q) => q.eq(q.field("accountType"), "Bank"))
      .collect();
    const currentCash = accounts.reduce(
      (sum, acc) => sum + (acc.currentBalance || 0),
      0
    );
    const invoices = await ctx.db
      .query("qboInvoices")
      .filter((q) => q.eq(q.field("status"), "outstanding"))
      .collect();
    const bills = await ctx.db
      .query("qboBills")
      .filter((q) => q.eq(q.field("status"), "unpaid"))
      .collect();
    const projection: Array<{
      week: number;
      startDate: string;
      receivables: number;
      payables: number;
      netChange: number;
      endingBalance: number;
    }> = [];
    let balance = currentCash;
    for (let week = 1; week <= 13; week++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weeklyReceivables = invoices
        .filter((inv) => {
          const dueDate = new Date(inv.dueDate || inv.txnDate);
          return dueDate >= weekStart && dueDate < weekEnd;
        })
        .reduce((sum, inv) => sum + (inv.balance || 0), 0);
      const weeklyPayables = bills
        .filter((bill) => {
          const dueDate = new Date(bill.dueDate || bill.txnDate);
          return dueDate >= weekStart && dueDate < weekEnd;
        })
        .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
      balance = balance + weeklyReceivables - weeklyPayables;
      projection.push({
        week,
        startDate: weekStart.toISOString(),
        receivables: weeklyReceivables,
        payables: weeklyPayables,
        netChange: weeklyReceivables - weeklyPayables,
        endingBalance: balance,
      });
    }
    return {
      currentCash,
      projectedEndCash: projection[12]?.endingBalance || 0,
      lowestPoint: projection.reduce(
        (min, week) => (week.endingBalance < min.endingBalance ? week : min),
        projection[0] || {
          week: 0,
          startDate: new Date().toISOString(),
          receivables: 0,
          payables: 0,
          netChange: 0,
          endingBalance: currentCash,
        }
      ),
      projection,
      generatedAt: new Date().toISOString(),
    };
  },
});

export const collectionsAnalysis = query({
  args: {},
  handler: async () => ({ message: "Not implemented" }),
});

export const anomalyDetection = query({
  args: {},
  handler: async () => ({ message: "Not implemented" }),
});

export const monthEndClose = query({
  args: {},
  handler: async () => ({ message: "Not implemented" }),
});

export const budgetVariance = query({
  args: {},
  handler: async () => ({ message: "Not implemented" }),
});
